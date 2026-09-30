import { AlarmClock } from 'lucide-react';
import { cn } from 'cn';
import { formatCountdown } from '@/lib/date';
import { dueAt, type Task } from '@/lib/task';

type NextUpCardProps = { task: Task | undefined; now: Date; className?: string };

export function NextUpCard({ task, now, className }: NextUpCardProps) {
  const at = task ? dueAt(task) : undefined;
  return (
    <section aria-label="Việc tiếp theo" className={cn('glass rounded-3xl p-5', className)}>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <AlarmClock className="size-4" /> Tiếp theo
      </p>
      {task && at !== undefined ? (
        <>
          <p className="mt-2 truncate text-lg font-semibold">{task.title}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary tabular-nums">{task.dueTime}</span> ·{' '}
            {formatCountdown(at - now.getTime())}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Không còn việc có hẹn giờ hôm nay</p>
      )}
    </section>
  );
}
