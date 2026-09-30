import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showUndoDeleteToast } from '@/components/undoDeleteToast';
import { isValidDateKey, isValidTime, toTimestamp } from '@/lib/date';
import {
  hasErrors,
  taskToInput,
  validateTaskInput,
  type Task,
  type TaskErrors,
  type TaskInput,
} from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';

export type TaskDialogState =
  | { mode: 'create'; defaults: TaskInput }
  | { mode: 'edit'; task: Task }
  | null;

type TaskDialogProps = {
  state: TaskDialogState;
  onClose: () => void;
};

export function TaskDialog({ state, onClose }: TaskDialogProps) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      {state && (
        <TaskForm key={state.mode === 'edit' ? state.task.id : 'create'} state={state} onClose={onClose} />
      )}
    </Dialog>
  );
}

function TaskForm({ state, onClose }: { state: NonNullable<TaskDialogState>; onClose: () => void }) {
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const [values, setValues] = useState<TaskInput>(() =>
    state.mode === 'edit' ? taskToInput(state.task) : state.defaults,
  );
  const [errors, setErrors] = useState<TaskErrors>({});

  const isEdit = state.mode === 'edit';
  const inPast =
    isValidDateKey(values.dueDate) &&
    isValidTime(values.dueTime) &&
    toTimestamp(values.dueDate, values.dueTime) < Date.now();

  const bind = (field: keyof TaskInput) => ({
    id: `task-${field}`,
    value: values[field],
    'aria-invalid': errors[field] ? true : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setErrors(({ [field]: _removed, ...rest }) => rest);
    },
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateTaskInput(values);
    if (hasErrors(found)) {
      setErrors(found);
      return;
    }
    if (state.mode === 'edit') await updateTask(state.task.id, values);
    else await addTask(values);
    onClose();
  }

  async function handleDelete() {
    if (state.mode !== 'edit') return;
    const removed = await deleteTask(state.task.id);
    onClose();
    if (removed) showUndoDeleteToast(removed);
  }

  return (
    <DialogContent className="rounded-3xl border border-white/50 bg-popover/75 p-6 shadow-2xl ring-0 backdrop-blur-2xl sm:max-w-md dark:border-white/10">
      <form onSubmit={handleSubmit} noValidate className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa công việc' : 'Thêm công việc'}</DialogTitle>
          <DialogDescription>Đặt giờ nhắc để nhận thông báo khi đến giờ.</DialogDescription>
        </DialogHeader>

        <Field label="Tiêu đề" htmlFor="task-title" error={errors.title}>
          <Input {...bind('title')} autoFocus placeholder="Ví dụ: Gửi báo cáo tuần" />
        </Field>
        <Field label="Mô tả" htmlFor="task-description" error={errors.description} hint="Không bắt buộc">
          <Textarea {...bind('description')} rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày" htmlFor="task-dueDate" error={errors.dueDate}>
            <Input {...bind('dueDate')} type="date" />
          </Field>
          <Field label="Giờ nhắc" htmlFor="task-dueTime" error={errors.dueTime} hint="Bỏ trống = không nhắc">
            <Input {...bind('dueTime')} type="time" />
          </Field>
        </div>
        {inPast && (
          <p className="text-sm text-amber-700 dark:text-amber-400">Giờ này đã qua, sẽ không nhắc.</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleDelete()}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 /> Xoá
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit">Lưu</Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
