import { useEffect } from 'react';
import { toast } from 'sonner';
import { browser } from 'wxt/browser';
import { isReminderMessage, reminderHeadline } from '@/lib/reminders';
import { useTaskStore } from '@/store/useTaskStore';

/** Khi background vừa nhắc một task và tab này đang hiển thị → hiện Toast có nút "Xong". */
export function useReminders(): void {
  useEffect(() => {
    const listener = (message: unknown) => {
      if (!isReminderMessage(message) || document.visibilityState !== 'visible') return;
      const task = useTaskStore.getState().tasks[message.taskId];
      if (!task || task.status !== 'todo' || !task.dueTime) return;
      toast(task.title, {
        id: `reminder:${task.id}`,
        description: reminderHeadline(task, Date.now()),
        duration: 10_000,
        action: {
          label: 'Xong',
          onClick: () => void useTaskStore.getState().setStatus(task.id, 'done'),
        },
      });
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);
}
