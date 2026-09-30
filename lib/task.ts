import { isValidDateKey, isValidTime, toDateKey, toTimestamp, type DateKey } from './date';

export type TaskStatus = 'todo' | 'done';

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  /** 'YYYY-MM-DD' theo giờ máy */
  dueDate: DateKey;
  /** 'HH:mm'; không có = việc trong ngày, không nhắc */
  dueTime?: string;
  createdAt: number;
  completedAt?: number;
  /** Mốc đã nhắc, dạng `${dueDate}T${dueTime}` */
  remindedFor?: string;
};

/** Giá trị form thêm/sửa; chuỗi rỗng = bỏ trống. */
export type TaskInput = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
};

export type TaskErrors = Partial<Record<keyof TaskInput, string>>;

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;

export function validateTaskInput(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Nhập tên công việc';
  else if (title.length > TITLE_MAX) errors.title = `Tối đa ${TITLE_MAX} ký tự`;
  if (input.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Tối đa ${DESCRIPTION_MAX} ký tự`;
  }
  if (!isValidDateKey(input.dueDate)) errors.dueDate = 'Chọn ngày hợp lệ';
  if (input.dueTime && !isValidTime(input.dueTime)) errors.dueTime = 'Giờ không hợp lệ';
  return errors;
}

export function hasErrors(errors: TaskErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Gán các trường từ form vào task (dùng cho cả tạo mới và sửa). */
export function applyTaskInput(task: Task, input: TaskInput): Task {
  const next: Task = { ...task, title: input.title.trim(), dueDate: input.dueDate };
  const description = input.description.trim();
  if (description) next.description = description;
  else delete next.description;
  if (input.dueTime) next.dueTime = input.dueTime;
  else delete next.dueTime;
  return next;
}

export function createTask(input: TaskInput, id: string, now: number): Task {
  return applyTaskInput(
    { id, title: '', status: 'todo', dueDate: input.dueDate, createdAt: now },
    input,
  );
}

export function taskToInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate,
    dueTime: task.dueTime ?? '',
  };
}

export function withStatus(task: Task, status: TaskStatus, now: number): Task {
  const next: Task = { ...task, status };
  if (status === 'done') next.completedAt = now;
  else delete next.completedAt;
  return next;
}

/** Mốc nhắc `${dueDate}T${dueTime}`, hoặc undefined nếu task không có giờ. */
export function dueKey(task: Task): string | undefined {
  return task.dueTime ? `${task.dueDate}T${task.dueTime}` : undefined;
}

/** Thời điểm đến hạn (epoch ms), hoặc undefined nếu task không có giờ. */
export function dueAt(task: Task): number | undefined {
  return task.dueTime ? toTimestamp(task.dueDate, task.dueTime) : undefined;
}

/** Task chưa xong, có giờ và giờ đã qua — nhãn giờ tô đỏ. */
export function isPastDue(task: Task, now: number): boolean {
  const at = dueAt(task);
  return task.status === 'todo' && at !== undefined && at < now;
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    (v.status === 'todo' || v.status === 'done') &&
    typeof v.dueDate === 'string' &&
    isValidDateKey(v.dueDate) &&
    (v.dueTime === undefined || (typeof v.dueTime === 'string' && isValidTime(v.dueTime))) &&
    (v.description === undefined || typeof v.description === 'string') &&
    typeof v.createdAt === 'number' &&
    (v.completedAt === undefined || typeof v.completedAt === 'number') &&
    (v.remindedFor === undefined || typeof v.remindedFor === 'string')
  );
}

/** Task có giờ đứng trước (giờ tăng dần), task không giờ sau (tạo trước đứng trước). */
function compareTodo(a: Task, b: Task): number {
  if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime) || a.createdAt - b.createdAt;
  if (a.dueTime) return -1;
  if (b.dueTime) return 1;
  return a.createdAt - b.createdAt;
}

export function overdueTasks(tasks: Task[], today: DateKey): Task[] {
  return tasks
    .filter((t) => t.status === 'todo' && t.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || compareTodo(a, b));
}

export function todoForDay(tasks: Task[], day: DateKey): Task[] {
  return tasks.filter((t) => t.status === 'todo' && t.dueDate === day).sort(compareTodo);
}

export function doneForDay(tasks: Task[], day: DateKey): Task[] {
  return tasks
    .filter((t) => t.status === 'done' && t.dueDate === day)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export type Progress = { done: number; total: number; percent: number };

export function progressForDay(tasks: Task[], day: DateKey): Progress {
  const ofDay = tasks.filter((t) => t.dueDate === day);
  const done = ofDay.filter((t) => t.status === 'done').length;
  const total = ofDay.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Task chưa xong của hôm nay có giờ sớm nhất mà chưa tới giờ. */
export function nextUpTask(tasks: Task[], now: Date): Task | undefined {
  const today = toDateKey(now);
  const nowMs = now.getTime();
  let best: { task: Task; at: number } | undefined;
  for (const task of tasks) {
    if (task.status !== 'todo' || task.dueDate !== today) continue;
    const at = dueAt(task);
    if (at === undefined || at < nowMs) continue;
    if (!best || at < best.at) best = { task, at };
  }
  return best?.task;
}
