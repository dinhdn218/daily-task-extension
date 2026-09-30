import { useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { DayNav } from '@/components/DayNav';
import { Header } from '@/components/Header';
import { NextUpCard } from '@/components/NextUpCard';
import { ProgressCard } from '@/components/ProgressCard';
import { QuickAdd } from '@/components/QuickAdd';
import { TaskDialog, type TaskDialogState } from '@/components/TaskDialog';
import { TaskList } from '@/components/TaskList';
import { Toaster } from '@/components/ui/sonner';
import { useNow } from '@/hooks/useNow';
import { useReminders } from '@/hooks/useReminders';
import { useTheme } from '@/hooks/useTheme';
import { toDateKey, type DateKey } from '@/lib/date';
import { nextUpTask, progressForDay } from '@/lib/task';
import { initTaskStore, useTaskStore } from '@/store/useTaskStore';

export default function App() {
  const now = useNow();
  const today = toDateKey(now);
  // null = luôn theo "hôm nay" (kể cả khi qua nửa đêm)
  const [selectedDay, setSelectedDay] = useState<DateKey | null>(null);
  const day = selectedDay ?? today;
  const [dialog, setDialog] = useState<TaskDialogState>(null);
  const { preference, resolved, setPreference } = useTheme();

  const tasksById = useTaskStore((state) => state.tasks);
  const tasks = useMemo(() => Object.values(tasksById), [tasksById]);
  const progress = useMemo(() => progressForDay(tasks, day), [tasks, day]);
  const nextUp = useMemo(() => nextUpTask(tasks, now), [tasks, now]);

  useEffect(() => initTaskStore(), []);
  useReminders();

  const changeDay = (next: DateKey) => setSelectedDay(next === today ? null : next);
  const openCreate = (title: string) =>
    setDialog({ mode: 'create', defaults: { title, description: '', dueDate: day, dueTime: '' } });

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate min-h-dvh overflow-x-hidden">
        <BackgroundDecor />
        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
          <Header now={now} theme={preference} onThemeChange={setPreference} />
          <DayNav day={day} today={today} onChange={changeDay} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
            <section
              aria-label="Danh sách việc"
              className="glass order-2 flex min-w-0 flex-col gap-4 rounded-3xl p-4 sm:p-6 lg:order-1 lg:col-span-2 lg:row-span-2"
            >
              <QuickAdd day={day} today={today} onOpenDetails={openCreate} />
              <TaskList day={day} today={today} now={now} onEdit={(task) => setDialog({ mode: 'edit', task })} />
            </section>
            <ProgressCard progress={progress} className="order-1 lg:order-2" />
            <NextUpCard task={nextUp} now={now} className="order-3 lg:self-start" />
          </div>
        </main>
        <TaskDialog state={dialog} onClose={() => setDialog(null)} />
        <Toaster theme={resolved} position="bottom-right" />
      </div>
    </MotionConfig>
  );
}

/** Các đốm màu mờ phía sau để hiệu ứng kính hiện rõ. */
function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-600/25" />
      <div className="absolute top-1/3 -right-40 size-[32rem] rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-700/20" />
      <div className="absolute -bottom-40 left-1/4 size-[26rem] rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-700/15" />
    </div>
  );
}
