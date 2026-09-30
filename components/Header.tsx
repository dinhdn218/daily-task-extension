import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from 'cn';
import { formatClock, formatLongDate, greeting } from '@/lib/date';
import type { ThemePreference } from '@/lib/theme';

const THEME_OPTIONS = [
  { value: 'light', label: 'Sáng', Icon: Sun },
  { value: 'dark', label: 'Tối', Icon: Moon },
  { value: 'system', label: 'Theo hệ thống', Icon: Monitor },
] as const;

type HeaderProps = {
  now: Date;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
};

export function Header({ now, theme, onThemeChange }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{greeting(now.getHours())} 👋</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {formatLongDate(now)}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <time
          dateTime={now.toISOString()}
          className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
        >
          {formatClock(now)}
        </time>
        <div role="group" aria-label="Giao diện" className="glass flex rounded-full p-1">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={theme === value}
              onClick={() => onThemeChange(value)}
              className={cn(
                'grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground',
                theme === value && 'bg-primary text-primary-foreground hover:text-primary-foreground',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
