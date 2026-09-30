import type { CSSProperties } from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Bản shadcn gốc lấy theme từ next-themes; ở đây App truyền `theme` vào qua props.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'color-mix(in oklab, var(--popover) 80%, transparent)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'calc(var(--radius) + 4px)',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast backdrop-blur-xl',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
