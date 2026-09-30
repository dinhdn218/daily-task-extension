import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  completeFromNotification,
  createQueue,
  rebuildAlarms,
  registerReminderHandlers,
  remindIfDue,
  syncAlarm,
} from './reminder-service';
import type { Task } from './task';
import { loadTask, removeTask, saveTask } from './task-storage';

const at = (h: number, m: number) => new Date(2026, 9, 1, h, m).getTime();

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Việc ${id}`,
  status: 'todo',
  dueDate: '2026-10-01',
  dueTime: '10:00',
  createdAt: 1,
  ...over,
});

const alarmNames = async () => (await browser.alarms.getAll()).map((a) => a.name).sort();
const notifications = () => fakeBrowser.notifications.getAllCreateOptions();

beforeEach(() => {
  fakeBrowser.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('syncAlarm', () => {
  it('đặt alarm đúng giờ cho task chưa xong có giờ ở tương lai', async () => {
    await syncAlarm('a', task('a'), at(9, 0));
    expect(await browser.alarms.get('task:a')).toMatchObject({ scheduledTime: at(10, 0) });
  });

  it('dời alarm khi đổi giờ', async () => {
    await syncAlarm('a', task('a'), at(9, 0));
    await syncAlarm('a', task('a', { dueTime: '11:00' }), at(9, 0));
    expect(await browser.alarms.getAll()).toHaveLength(1);
    expect(await browser.alarms.get('task:a')).toMatchObject({ scheduledTime: at(11, 0) });
  });

  it('huỷ alarm và cất thông báo khi task xong hoặc bị xoá', async () => {
    await syncAlarm('a', task('a'), at(9, 0));
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });
    await syncAlarm('a', task('a', { status: 'done' }), at(9, 0));
    expect(await alarmNames()).toEqual([]);
    expect(notifications()).toEqual({});

    await syncAlarm('b', task('b'), at(9, 0));
    await syncAlarm('b', undefined, at(9, 0));
    expect(await alarmNames()).toEqual([]);
  });

  it('dời giờ sang tương lai thì cất thông báo cũ', async () => {
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });

    await syncAlarm('a', task('a', { dueTime: '11:00' }), at(10, 5));

    expect(notifications()).toEqual({});
    expect(await browser.alarms.get('task:a')).toMatchObject({ scheduledTime: at(11, 0) });
  });

  it('task đã nhắc rồi dời sang giờ mới ở tương lai thì cất thông báo cũ', async () => {
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });

    // Đã nhắc cho mốc 10:00, người dùng dời sang 11:00: mốc mới chưa nhắc nên thông báo cũ phải đi.
    await syncAlarm('a', task('a', { dueTime: '11:00', remindedFor: '2026-10-01T10:00' }), at(10, 5));

    expect(notifications()).toEqual({});
    expect(await browser.alarms.get('task:a')).toMatchObject({ scheduledTime: at(11, 0) });
  });

  it('giờ đã qua (vừa nhắc xong) thì giữ thông báo đang hiện', async () => {
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });

    await syncAlarm('a', task('a', { remindedFor: '2026-10-01T10:00' }), at(10, 0));

    expect(Object.keys(notifications())).toEqual(['task:a']);
    expect(await alarmNames()).toEqual([]);
  });
});

describe('remindIfDue', () => {
  it('bắn thông báo, ghi remindedFor và nhắn cho trang đang mở', async () => {
    const onMessage = vi.fn();
    browser.runtime.onMessage.addListener(onMessage);
    await saveTask(task('a', { description: 'Phòng 3' }));

    await remindIfDue('a', at(10, 0));

    expect(notifications()['task:a']).toMatchObject({
      type: 'basic',
      title: 'Việc a',
      message: 'Đến giờ · 10:00\nPhòng 3',
      buttons: [{ title: 'Đánh dấu xong' }],
      requireInteraction: true,
      iconUrl: 'chrome-extension://test-extension-id/icons/128.png',
    });
    expect((await loadTask('a'))?.remindedFor).toBe('2026-10-01T10:00');
    expect(onMessage).toHaveBeenCalledWith({ type: 'reminder', taskId: 'a' }, {}, expect.any(Function));
  });

  it('không ghi đè thay đổi mà trang vừa ghi trong lúc đang tạo thông báo', async () => {
    const onMessage = vi.fn();
    browser.runtime.onMessage.addListener(onMessage);
    await saveTask(task('a'));
    vi.spyOn(browser.notifications, 'create').mockImplementationOnce(async () => {
      // Người dùng tick xong đúng lúc thông báo đang được tạo.
      await saveTask(task('a', { status: 'done', completedAt: at(10, 0) }));
      return 'task:a';
    });

    await remindIfDue('a', at(10, 0));

    const saved = await loadTask('a');
    expect(saved).toMatchObject({ status: 'done', completedAt: at(10, 0) });
    expect(saved?.remindedFor).toBeUndefined();
    // Task đã xong rồi thì trang không được hiện Toast nhắc.
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('không lỗi khi không có trang nào mở', async () => {
    await saveTask(task('a'));
    await expect(remindIfDue('a', at(10, 0))).resolves.toBeUndefined();
    expect(notifications()['task:a']).toBeDefined();
  });

  it('không nhắc task đã xong, đã nhắc, hoặc đã xoá', async () => {
    await saveTask(task('a', { status: 'done' }));
    await saveTask(task('b', { remindedFor: '2026-10-01T10:00' }));
    await remindIfDue('a', at(10, 0));
    await remindIfDue('b', at(10, 0));
    await remindIfDue('missing', at(10, 0));
    expect(notifications()).toEqual({});
  });
});

describe('rebuildAlarms', () => {
  it('xoá alarm cũ, đặt lại cho task tương lai và nhắc bù trong 60 phút', async () => {
    await browser.alarms.create('task:ghost', { when: at(12, 0) });
    await browser.alarms.create('other', { when: at(12, 0) });
    await saveTask(task('future', { dueTime: '11:00' }));
    await saveTask(task('missed', { dueTime: '09:30' }));
    await saveTask(task('tooOld', { dueTime: '08:00' }));

    await rebuildAlarms(at(10, 0));

    expect(await alarmNames()).toEqual(['other', 'task:future']);
    expect(Object.keys(notifications())).toEqual(['task:missed']);
    expect(notifications()['task:missed']?.message).toBe('Đã quá giờ · 09:30');
  });

  it('lỗi ở một task không chặn các task khác', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await saveTask(task('bad', { dueTime: '11:00' }));
    await saveTask(task('good', { dueTime: '11:30' }));
    const create = browser.alarms.create.bind(browser.alarms);
    vi.spyOn(browser.alarms, 'create').mockImplementation(async (name: string, info) => {
      if (name === 'task:bad') throw new Error('boom');
      return create(name, info);
    });

    await rebuildAlarms(at(10, 0));

    expect(await alarmNames()).toContain('task:good');
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('completeFromNotification', () => {
  it('đánh dấu xong và đóng thông báo', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 1) });
    await saveTask(task('a'));
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });

    await completeFromNotification('a', at(10, 1));

    expect(await loadTask('a')).toMatchObject({ status: 'done', completedAt: at(10, 1) });
    expect(notifications()).toEqual({});
  });
});

describe('createQueue', () => {
  it('chạy tuần tự và không dừng khi một việc lỗi', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const queue = createQueue();
    const order: string[] = [];
    queue.push(async () => {
      await new Promise((r) => setTimeout(r, 5));
      order.push('1');
    });
    queue.push(async () => {
      throw new Error('boom');
    });
    queue.push(async () => {
      order.push('3');
    });
    await queue.idle();
    expect(order).toEqual(['1', '3']);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('registerReminderHandlers', () => {
  it('task đổi → alarm được đặt/huỷ theo', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(9, 0) });
    const queue = registerReminderHandlers();

    await saveTask(task('a'));
    await queue.idle();
    expect(await alarmNames()).toEqual(['task:a']);

    await removeTask('a');
    await queue.idle();
    expect(await alarmNames()).toEqual([]);
  });

  it('alarm kêu → nhắc đúng một lần kể cả khi kêu hai lần', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 0) });
    const queue = registerReminderHandlers();
    await saveTask(task('a'));
    await queue.idle();
    const create = vi.spyOn(browser.notifications, 'create');

    const alarm = { name: 'task:a', scheduledTime: at(10, 0), persistAcrossSessions: true };
    await fakeBrowser.alarms.onAlarm.trigger(alarm);
    await fakeBrowser.alarms.onAlarm.trigger(alarm);
    await queue.idle();

    expect(create).toHaveBeenCalledOnce();
  });

  it('alarm kêu sớm trong dung sai thì không cất thông báo vừa nhắc', async () => {
    // Alarm kêu sớm 5 giây so với giờ hẹn 10:00: vẫn nằm trong dung sai 60 giây nên được nhắc.
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 0) - 5_000 });
    const queue = registerReminderHandlers();
    await saveTask(task('a'));
    await queue.idle();
    const createAlarm = vi.spyOn(browser.alarms, 'create');

    await fakeBrowser.alarms.onAlarm.trigger({
      name: 'task:a',
      scheduledTime: at(10, 0),
      persistAcrossSessions: true,
    });
    await queue.idle();
    // Ghi remindedFor làm watcher đẩy thêm một việc syncAlarm vào hàng đợi; chờ nốt việc đó.
    await queue.idle();

    // Giờ hẹn vẫn ở tương lai nên syncAlarm đặt lại alarm, nhưng mốc này đã nhắc rồi:
    // thông báo vừa hiện phải còn nguyên (nếu bị cất thì người dùng không bao giờ thấy nó).
    expect((await loadTask('a'))?.remindedFor).toBe('2026-10-01T10:00');
    expect(createAlarm).toHaveBeenCalledWith('task:a', { when: at(10, 0) });
    expect(Object.keys(notifications())).toEqual(['task:a']);
  });

  it('khởi động → dựng lại alarm', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(9, 0) });
    await saveTask(task('a'));
    const queue = registerReminderHandlers();

    await fakeBrowser.runtime.onStartup.trigger();
    await queue.idle();

    expect(await alarmNames()).toEqual(['task:a']);
  });

  it('bấm "Đánh dấu xong" trên thông báo → task xong', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 0) });
    const queue = registerReminderHandlers();
    await saveTask(task('a'));

    await fakeBrowser.notifications.onButtonClicked.trigger('task:a', 0);
    await queue.idle();

    expect((await loadTask('a'))?.status).toBe('done');
  });

  it('bấm vào thông báo → mở tab mới', async () => {
    const queue = registerReminderHandlers();
    const create = vi.spyOn(browser.tabs, 'create');

    await fakeBrowser.notifications.onClicked.trigger('task:a');
    await queue.idle();

    expect(create).toHaveBeenCalledWith({});
  });
});
