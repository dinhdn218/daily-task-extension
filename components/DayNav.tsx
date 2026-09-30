import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, relativeDayLabel, type DateKey } from '@/lib/date';

type DayNavProps = {
  day: DateKey;
  today: DateKey;
  onChange: (day: DateKey) => void;
};

export function DayNav({ day, today, onChange }: DayNavProps) {
  const isToday = day === today;
  return (
    <nav aria-label="Chọn ngày" className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Ngày trước" onClick={() => onChange(addDays(day, -1))}>
        <ChevronLeft />
      </Button>
      <button
        type="button"
        disabled={isToday}
        title={isToday ? undefined : 'Về hôm nay'}
        onClick={() => onChange(today)}
        className="glass min-w-40 rounded-full px-4 py-1.5 text-sm font-medium transition-colors enabled:hover:text-primary disabled:cursor-default"
      >
        {relativeDayLabel(day, today)}
      </button>
      <Button variant="ghost" size="icon" aria-label="Ngày sau" onClick={() => onChange(addDays(day, 1))}>
        <ChevronRight />
      </Button>
    </nav>
  );
}
