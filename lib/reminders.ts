import { dueAt, dueKey, type Task } from './task';

/** Nhắc bù những mốc bị lỡ trong vòng 60 phút (Chrome tắt, máy ngủ). */
export const MISSED_WINDOW_MS = 60 * 60_000;
/** Alarm có thể kêu lệch vài giây; trong khoảng này vẫn tính là "đúng giờ". */
export const ON_TIME_TOLERANCE_MS = 60_000;

const PREFIX = 'task:';

/** Tên alarm và id thông báo của một task (dùng chung). */
export const reminderId = (taskId: string) => `${PREFIX}${taskId}`;

export function taskIdFromReminderId(id: string): string | undefined {
  return id.startsWith(PREFIX) ? id.slice(PREFIX.length) : undefined;
}

/** Tin background gửi cho trang New Tab khi vừa nhắc một task. */
export type ReminderMessage = { type: 'reminder'; taskId: string };

export function isReminderMessage(value: unknown): value is ReminderMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ReminderMessage).type === 'reminder' &&
    typeof (value as ReminderMessage).taskId === 'string'
  );
}

/** Thời điểm cần đặt alarm, hoặc undefined nếu task không cần alarm. */
export function alarmTimeFor(task: Task, now: number): number | undefined {
  if (task.status !== 'todo') return undefined;
  const at = dueAt(task);
  return at !== undefined && at > now ? at : undefined;
}

/** Task có cần nhắc ngay lúc `now` không (alarm vừa kêu, hoặc nhắc bù khi khởi động). */
export function shouldRemind(task: Task | undefined, now: number): task is Task {
  if (!task || task.status !== 'todo') return false;
  const at = dueAt(task);
  if (at === undefined || task.remindedFor === dueKey(task)) return false;
  return at <= now + ON_TIME_TOLERANCE_MS && at > now - MISSED_WINDOW_MS;
}

/** 'Đến giờ · 10:00' hoặc 'Đã quá giờ · 09:00'. */
export function reminderHeadline(task: Task, now: number): string {
  const late = now - (dueAt(task) ?? now) > ON_TIME_TOLERANCE_MS;
  return `${late ? 'Đã quá giờ' : 'Đến giờ'} · ${task.dueTime}`;
}

/** Nội dung thông báo hệ thống: dòng giờ, kèm mô tả nếu có. */
export function reminderMessage(task: Task, now: number): string {
  const headline = reminderHeadline(task, now);
  return task.description ? `${headline}\n${task.description}` : headline;
}
