import { browser } from 'wxt/browser';
import {
  alarmTimeFor,
  reminderId,
  reminderMessage,
  shouldRemind,
  taskIdFromReminderId,
  type ReminderMessage,
} from './reminders';
import { dueKey, withStatus, type Task } from './task';
import { loadAllTasks, loadTask, saveTask, watchTasks } from './task-storage';

/** Đặt, dời hoặc huỷ alarm của một task theo trạng thái mới nhất của nó. */
export async function syncAlarm(id: string, task: Task | undefined, now = Date.now()) {
  const name = reminderId(id);
  const when = task ? alarmTimeFor(task, now) : undefined;
  if (when === undefined) await browser.alarms.clear(name);
  else await browser.alarms.create(name, { when });
  // Task xong, bị xoá hoặc dời sang giờ mới thì cất thông báo cũ (nếu có).
  if (!task || task.status === 'done' || when !== undefined) await browser.notifications.clear(name);
}

/** Nhắc task nếu đủ điều kiện: thông báo hệ thống, ghi remindedFor, báo cho trang đang mở. */
export async function remindIfDue(id: string, now = Date.now()) {
  const task = await loadTask(id);
  if (!shouldRemind(task, now)) return;
  await browser.notifications.create(reminderId(id), {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icons/128.png'),
    title: task.title,
    message: reminderMessage(task, now),
    buttons: [{ title: 'Đánh dấu xong' }],
    requireInteraction: true,
    priority: 2,
  });
  // Đọc lại trước khi ghi: trong lúc chờ tạo thông báo, trang có thể vừa tick/sửa/xoá task.
  const latest = await loadTask(id);
  if (!shouldRemind(latest, now)) return;
  await saveTask({ ...latest, remindedFor: dueKey(latest) });
  const message: ReminderMessage = { type: 'reminder', taskId: id };
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // Không có trang New Tab nào đang mở — bỏ qua.
  }
}

/** Khi Chrome khởi động / extension cài hoặc cập nhật: dựng lại toàn bộ alarm, rồi nhắc bù. */
export async function rebuildAlarms(now = Date.now()) {
  const tasks = Object.values(await loadAllTasks());
  const alarms = await browser.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => taskIdFromReminderId(alarm.name) !== undefined)
      .map((alarm) => browser.alarms.clear(alarm.name)),
  );
  for (const task of tasks) {
    try {
      const when = alarmTimeFor(task, now);
      if (when !== undefined) await browser.alarms.create(reminderId(task.id), { when });
      else if (shouldRemind(task, now)) await remindIfDue(task.id, now);
    } catch (error) {
      console.error('[reminders]', task.id, error);
    }
  }
}

export async function completeFromNotification(id: string, now = Date.now()) {
  const task = await loadTask(id);
  if (task?.status === 'todo') await saveTask(withStatus(task, 'done', now));
  await browser.notifications.clear(reminderId(id));
}

/** Hàng đợi tuần tự: mỗi việc chạy xong mới tới việc sau; lỗi của một việc không chặn việc khác. */
export function createQueue() {
  let tail: Promise<void> = Promise.resolve();
  return {
    push(job: () => Promise<void>) {
      tail = tail.then(job).catch((error) => console.error('[reminders]', error));
    },
    idle: () => tail,
  };
}

/** Gắn mọi listener của service worker. Phải gọi đồng bộ khi service worker khởi động. */
export function registerReminderHandlers() {
  const queue = createQueue();

  browser.runtime.onInstalled.addListener(() => queue.push(() => rebuildAlarms()));
  browser.runtime.onStartup.addListener(() => queue.push(() => rebuildAlarms()));

  browser.alarms.onAlarm.addListener((alarm) => {
    const id = taskIdFromReminderId(alarm.name);
    if (id) queue.push(() => remindIfDue(id));
  });

  watchTasks((changes) => {
    for (const { id, task } of changes) queue.push(() => syncAlarm(id, task));
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    if (!taskIdFromReminderId(notificationId)) return;
    queue.push(async () => {
      await browser.tabs.create({});
      await browser.notifications.clear(notificationId);
    });
  });

  browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    const id = taskIdFromReminderId(notificationId);
    if (id && buttonIndex === 0) queue.push(() => completeFromNotification(id));
  });

  return queue;
}
