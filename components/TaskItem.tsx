import { CalendarArrowUp, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatShortDate } from '@/lib/date';
import { isPastDue, type Task } from '@/lib/task';
import { showUndoDeleteToast } from '@/components/undoDeleteToast';
import { useTaskStore } from '@/store/useTaskStore';

type TaskItemProps = {
  task: Task;
  /** epoch ms, để tô đỏ giờ đã qua */
  now: number;
  /** Nằm trong nhóm Quá hạn: hiện ngày gốc và nút dời sang hôm nay. */
  overdue?: boolean;
  onEdit: (task: Task) => void;
};

export function TaskItem({ task, now, overdue = false, onEdit }: TaskItemProps) {
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const moveToToday = useTaskStore((state) => state.moveToToday);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const done = task.status === 'done';

  async function handleDelete() {
    const removed = await deleteTask(task.id);
    if (removed) showUndoDeleteToast(removed);
  }

  return (
    <motion.li
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-foreground/5 sm:px-3"
    >
      <motion.span
        className="flex"
        tabIndex={-1}
        whileTap={{ scale: 0.85 }}
        animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Checkbox
          checked={done}
          onCheckedChange={() => void toggleTask(task.id)}
          aria-label={done ? `Bỏ đánh dấu xong: ${task.title}` : `Đánh dấu xong: ${task.title}`}
          className="size-5 rounded-full"
        />
      </motion.span>

      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 text-left outline-none focus-visible:underline"
      >
        <span className="relative block w-fit max-w-full">
          <span className={cn('block truncate transition-colors', done && 'text-muted-foreground')}>
            {task.title}
          </span>
          <motion.span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px origin-left bg-muted-foreground"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: done ? 1 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </span>
        {task.description && (
          <span className="block truncate text-xs text-muted-foreground">{task.description}</span>
        )}
      </button>

      {overdue && (
        <span className="shrink-0 text-xs text-destructive">{formatShortDate(task.dueDate)}</span>
      )}
      {task.dueTime && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums',
            done
              ? 'text-muted-foreground'
              : isPastDue(task, now)
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary',
          )}
        >
          {task.dueTime}
        </span>
      )}
      {overdue && (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Dời sang hôm nay: ${task.title}`}
          onClick={() => void moveToToday(task.id)}
          className="shrink-0"
        >
          <CalendarArrowUp />
          <span className="hidden sm:inline">Dời sang hôm nay</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Xoá: ${task.title}`}
        onClick={() => void handleDelete()}
        className="shrink-0 text-muted-foreground hover:text-destructive pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
      >
        <Trash2 />
      </Button>
    </motion.li>
  );
}
