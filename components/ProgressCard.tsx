import { motion, useReducedMotion } from 'motion/react';
import { cn } from 'cn';
import type { Progress } from '@/lib/task';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressCardProps = { progress: Progress; className?: string };

export function ProgressCard({ progress, className }: ProgressCardProps) {
  const { done, total, percent } = progress;
  const reduceMotion = useReducedMotion();
  const message =
    total === 0 ? 'Chưa có việc' : done === total ? 'Xong hết rồi! 🎉' : `Còn ${total - done} việc`;

  return (
    <section aria-label="Tiến độ" className={cn('glass flex items-center gap-5 rounded-3xl p-5', className)}>
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 88 88" className="size-full -rotate-90">
          <circle cx="44" cy="44" r={RADIUS} strokeWidth="8" className="fill-none stroke-primary/15" />
          <motion.circle
            cx="44"
            cy="44"
            r={RADIUS}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            className="fill-none stroke-primary"
            initial={false}
            animate={{
              strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100),
              opacity: percent === 0 ? 0 : 1,
            }}
            // MotionConfig reducedMotion="user" chỉ tắt transform/layout; vòng tiến độ phải tự tắt.
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums">
          {percent}%
        </span>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Tiến độ</p>
        <p className="text-2xl font-semibold tabular-nums">
          {done}/{total}
        </p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </section>
  );
}
