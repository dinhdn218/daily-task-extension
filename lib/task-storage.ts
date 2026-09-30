import { browser } from 'wxt/browser';
import { isTask, type Task } from './task';

const TASK_KEY_PREFIX = 'task:';

export const taskKey = (id: string) => `${TASK_KEY_PREFIX}${id}`;

/** Thay đổi của một task; `task` = undefined nghĩa là đã bị xoá. */
export type TaskChange = { id: string; task: Task | undefined };

export async function loadAllTasks(): Promise<Record<string, Task>> {
  const items = await browser.storage.local.get(null);
  const tasks: Record<string, Task> = {};
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(TASK_KEY_PREFIX)) continue;
    if (isTask(value)) tasks[value.id] = value;
    else console.warn('[task-storage] Bỏ qua dữ liệu hỏng', key, value);
  }
  return tasks;
}

export async function loadTask(id: string): Promise<Task | undefined> {
  const key = taskKey(id);
  const value = (await browser.storage.local.get(key))[key];
  return isTask(value) ? value : undefined;
}

export async function saveTask(task: Task): Promise<void> {
  await browser.storage.local.set({ [taskKey(task.id)]: task });
}

export async function removeTask(id: string): Promise<void> {
  await browser.storage.local.remove(taskKey(id));
}

/** Nghe thay đổi task từ mọi nơi (tab khác, background). Trả về hàm huỷ. */
export function watchTasks(onChange: (changes: TaskChange[]) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    const result: TaskChange[] = [];
    for (const [key, change] of Object.entries(changes)) {
      if (!key.startsWith(TASK_KEY_PREFIX)) continue;
      const id = key.slice(TASK_KEY_PREFIX.length);
      // Chrome bỏ trống newValue khi xoá; bản giả lập dùng null.
      if (change.newValue == null) result.push({ id, task: undefined });
      else if (isTask(change.newValue)) result.push({ id, task: change.newValue });
    }
    if (result.length > 0) onChange(result);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
