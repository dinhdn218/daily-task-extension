import { useState, type FormEvent } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { relativeDayLabel, type DateKey } from '@/lib/date';
import { validateTaskInput } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';

type QuickAddProps = {
  day: DateKey;
  today: DateKey;
  /** Mở hộp thoại đầy đủ, điền sẵn tiêu đề đang gõ. */
  onOpenDetails: (title: string) => void;
};

export function QuickAdd({ day, today, onOpenDetails }: QuickAddProps) {
  const addTask = useTaskStore((state) => state.addTask);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const input = { title, description: '', dueDate: day, dueTime: '' };
    const errors = validateTaskInput(input);
    if (errors.title) {
      setError(errors.title);
      return;
    }
    if (await addTask(input)) setTitle('');
  }

  function openDetails() {
    onOpenDetails(title.trim());
    setTitle('');
    setError(undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Plus className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(undefined);
            }}
            placeholder={`Thêm việc cho ${relativeDayLabel(day, today).toLowerCase()}…`}
            aria-label="Tên việc mới"
            aria-invalid={error ? true : undefined}
            className="h-11 rounded-xl bg-background/60 pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label="Thêm chi tiết"
          title="Thêm chi tiết (giờ nhắc, mô tả)"
          onClick={openDetails}
          className="size-11 rounded-xl bg-background/60"
        >
          <SlidersHorizontal />
        </Button>
      </div>
      {error && (
        <p role="alert" className="px-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
