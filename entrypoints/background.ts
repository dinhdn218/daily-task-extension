import { registerReminderHandlers } from '@/lib/reminder-service';

export default defineBackground(() => {
  registerReminderHandlers();
});
