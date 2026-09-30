import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ListTodo, TriangleAlert } from 'lucide-react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { cn } from 'cn';
import { TaskItem } from '@/components/TaskItem';
import type { DateKey } from '@/lib/date';
import { doneForDay, overdueTasks, todoForDay, type Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';

type TaskListProps = {
  day: DateKey;
  today: DateKey;
  now: Date;
  onEdit: (task: Task) => void;
};

export function TaskList({ day, today, now, onEdit }: TaskListProps) {
  const tasksById = useTaskStore((state) => state.tasks);
  const hydrated = useTaskStore((state) => state.hydrated);
  const [showDone, setShowDone] = useState(true);

  const tasks = useMemo(() => Object.values(tasksById), [tasksById]);
  const overdue = useMemo(
    () => (day === today ? overdueTasks(tasks, today) : []),
    [tasks, day, today],
  );
  const todo = useMemo(() => todoForDay(tasks, day), [tasks, day]);
  const done = useMemo(() => doneForDay(tasks, day), [tasks, day]);
  const nowMs = now.getTime();

  if (!hydrated) return <TaskListSkeleton />;
  if (overdue.length + todo.length + done.length === 0) return <EmptyState />;

  return (
    <LayoutGroup>
      <div className="space-y-5">
        {overdue.length > 0 && (
          <TaskGroup
            title={
              <span className="flex items-center gap-1.5 text-destructive">
                <TriangleAlert className="size-3.5" /> Quá hạn ({overdue.length})
              </span>
            }
          >
            {overdue.map((task) => (
              <TaskItem key={task.id} task={task} now={nowMs} overdue onEdit={onEdit} />
            ))}
          </TaskGroup>
        )}

        {todo.length > 0 && (
          <TaskGroup title="Cần làm">
            {todo.map((task) => (
              <TaskItem key={task.id} task={task} now={nowMs} onEdit={onEdit} />
            ))}
          </TaskGroup>
        )}

        {done.length > 0 && (
          <TaskGroup
            title={
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((value) => !value)}
                className="flex items-center gap-1 tracking-wide uppercase hover:text-foreground"
              >
                <ChevronDown className={cn('size-3.5 transition-transform', !showDone && '-rotate-90')} />
                Đã xong ({done.length})
              </button>
            }
          >
            {showDone &&
              done.map((task) => <TaskItem key={task.id} task={task} now={nowMs} onEdit={onEdit} />)}
          </TaskGroup>
        )}
      </div>
    </LayoutGroup>
  );
}

function TaskGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-3">
        {title}
      </h2>
      <ul className="space-y-0.5">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </ul>
    </section>
  );
}

function TaskListSkeleton() {
  return (
    <div aria-hidden className="space-y-3 px-2 py-1">
      {[70, 55, 62].map((width) => (
        <div key={width} className="flex items-center gap-3">
          <div className="size-5 animate-pulse rounded-full bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
      <ListTodo className="size-10 text-primary/60" />
      <p className="font-medium text-foreground">Chưa có việc nào cho ngày này</p>
      <p className="text-sm">Gõ vào ô phía trên rồi nhấn Enter để thêm.</p>
    </div>
  );
}
