import { toast } from 'sonner';
import type { Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';

/** Toast "Đã xoá · Hoàn tác" hiện 5 giây sau khi xoá một task. */
export function showUndoDeleteToast(task: Task): void {
  toast('Đã xoá công việc', {
    description: task.title,
    duration: 5_000,
    action: {
      label: 'Hoàn tác',
      onClick: () => void useTaskStore.getState().restoreTask(task),
    },
  });
}
