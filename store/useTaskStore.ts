import { toast } from 'sonner';
import { create } from 'zustand';
import { toDateKey } from '@/lib/date';
import {
  applyTaskInput,
  createTask,
  withStatus,
  type Task,
  type TaskInput,
  type TaskStatus,
} from '@/lib/task';
import {
  loadAllTasks,
  removeTask,
  saveTask,
  watchTasks,
  type TaskChange,
} from '@/lib/task-storage';

type TaskState = {
  tasks: Record<string, Task>;
  /** false cho tới khi đọc xong storage lần đầu */
  hydrated: boolean;
  applyChanges: (changes: TaskChange[]) => void;
  addTask: (input: TaskInput) => Promise<Task | undefined>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  setStatus: (id: string, status: TaskStatus) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  moveToToday: (id: string) => Promise<void>;
  /** Trả về task vừa xoá để có thể hoàn tác. */
  deleteTask: (id: string) => Promise<Task | undefined>;
  restoreTask: (task: Task) => Promise<void>;
};

export const SAVE_ERROR_MESSAGE = 'Không lưu được, thử lại';

export const useTaskStore = create<TaskState>()((set, get) => {
  /** Cập nhật store ngay, ghi storage sau; ghi lỗi thì trả lại như cũ. */
  async function commit(id: string, next: Task | undefined): Promise<boolean> {
    const previous = get().tasks[id];
    set((state) => ({ tasks: patch(state.tasks, id, next) }));
    try {
      if (next) await saveTask(next);
      else await removeTask(id);
      return true;
    } catch (error) {
      console.error('[task-store]', error);
      set((state) => ({ tasks: patch(state.tasks, id, previous) }));
      toast.error(SAVE_ERROR_MESSAGE);
      return false;
    }
  }

  return {
    tasks: {},
    hydrated: false,

    applyChanges(changes) {
      set((state) => {
        let tasks = state.tasks;
        for (const { id, task } of changes) tasks = patch(tasks, id, task);
        return { tasks };
      });
    },

    async addTask(input) {
      const task = createTask(input, crypto.randomUUID(), Date.now());
      return (await commit(task.id, task)) ? task : undefined;
    },

    async updateTask(id, input) {
      const task = get().tasks[id];
      if (task) await commit(id, applyTaskInput(task, input));
    },

    async setStatus(id, status) {
      const task = get().tasks[id];
      if (task && task.status !== status) await commit(id, withStatus(task, status, Date.now()));
    },

    async toggleTask(id) {
      const task = get().tasks[id];
      if (task) await get().setStatus(id, task.status === 'done' ? 'todo' : 'done');
    },

    async moveToToday(id) {
      const task = get().tasks[id];
      if (task) await commit(id, { ...task, dueDate: toDateKey(new Date()) });
    },

    async deleteTask(id) {
      const task = get().tasks[id];
      if (!task) return undefined;
      return (await commit(id, undefined)) ? task : undefined;
    },

    async restoreTask(task) {
      await commit(task.id, task);
    },
  };
});

function patch(tasks: Record<string, Task>, id: string, task: Task | undefined) {
  const next = { ...tasks };
  if (task) next[id] = task;
  else delete next[id];
  return next;
}

/**
 * Đọc dữ liệu lần đầu và nghe thay đổi từ tab khác/background.
 * Trả về hàm huỷ lắng nghe (gọi trong cleanup của useEffect).
 */
export function initTaskStore(): () => void {
  const stop = watchTasks((changes) => useTaskStore.getState().applyChanges(changes));
  loadAllTasks()
    .then((tasks) => useTaskStore.setState({ tasks, hydrated: true }))
    .catch((error) => {
      console.error('[task-store]', error);
      useTaskStore.setState({ hydrated: true });
      toast.error('Không đọc được dữ liệu');
    });
  return stop;
}
