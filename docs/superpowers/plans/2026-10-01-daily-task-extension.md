# Việc hôm nay (Chrome extension): kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extension Chrome MV3 thay trang Tab mới bằng danh sách việc trong ngày (thêm/sửa/xoá/tick, xem ngày khác, mục Quá hạn), kèm nhắc đúng giờ bằng thông báo hệ thống và Toast trong trang.

**Architecture:** Hai ngữ cảnh dùng chung `chrome.storage.local`, mỗi task một key `task:<id>`.
- **Trang New Tab** (React + Zustand): xem và sửa task.
- **Service worker**: đặt `chrome.alarms` theo giờ hẹn, khi đến giờ thì bắn `chrome.notifications` và nhắn cho trang đang mở để hiện Toast.

Logic nằm trong `lib/`, gồm hàm thuần và service được test với `fakeBrowser` của WXT. Giao diện nằm trong `components/`, ghép lại ở `entrypoints/newtab/App.tsx`.

**Tech Stack:** WXT 0.21 · React 19 · TypeScript ~5.9 · Tailwind CSS 4 · shadcn/ui 4 (style `radix-nova`) · Sonner · Zustand 5 · Motion 13 · Lucide · Vitest 5 + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-01-daily-task-extension-design.md`

## Global Constraints

**Repo và cách chạy lệnh**
- Repo nằm ở `d:\projects\daily-task-extension`. Commit thẳng vào `master`, mỗi task một commit.
- Commit message kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Chạy mọi lệnh trong **Git Bash** ở thư mục gốc repo, với Node ≥ 22 và npm.

**Phụ thuộc**
- Giữ TypeScript ở `~5.9.3`, không nâng lên 7.
- Không thêm thư viện ngoài danh sách trong `package.json` của Task 1 (không dùng react-hook-form, zod, next-themes, date-fns…).
- Quyền manifest đúng 3 quyền `storage`, `alarms`, `notifications`, không có host permission.

**Quy ước code**
- Code gọi API extension qua `browser` import từ `'wxt/browser'`.
- Test dùng `fakeBrowser` từ `'wxt/testing/fake-browser'` và gọi `fakeBrowser.reset()` trong `beforeEach`.
- Alias `@/` trỏ tới thư mục gốc repo.
- Hàm `cn` import từ package npm `'cn'` (chính chủ shadcn). Không tạo `lib/utils.ts`.
- Chữ trên giao diện bằng tiếng Việt và phải **đúng từng chữ** như trong kế hoạch, vì test so khớp theo chữ.

**Định dạng dữ liệu**
- Ngày là `DateKey` dạng `'YYYY-MM-DD'` theo giờ máy; giờ dạng `'HH:mm'`.
- Không dùng `toISOString()` để lấy ngày, vì hàm này trả giờ UTC.
- Key storage của task là `task:<id>`. Tên alarm và id thông báo đều là `task:<id>`.
- Theme lưu ở `localStorage['theme']`, giá trị `light` | `dark` | `system`.

**Hằng số**
- Tiêu đề tối đa 120 ký tự, mô tả tối đa 1000 ký tự.
- Nhắc bù những mốc bị lỡ trong vòng 60 phút; dung sai alarm 60 giây.
- Toast hoàn tác hiện 5 giây, Toast nhắc việc hiện 10 giây.

**Code đã được kiểm chứng**
- Toàn bộ code trong kế hoạch đã chạy thật ngày 2026-10-01: 94 test, `tsc`, build, và chạy trong Chrome với alarm → thông báo → Toast.
- Hãy chép **nguyên văn**. Nếu buộc phải lệch, ghi lý do trong commit message.

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `package.json`, `tsconfig.json`, `wxt.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `components.json`, `.gitignore` | Cấu hình dự án, build, test |
| `assets/icon.svg` | Icon gốc; `@wxt-dev/auto-icons` sinh `icons/16…128.png` khi build |
| `public/theme-init.js` | Áp theme trước khi trang vẽ (chống nháy trắng) |
| `entrypoints/newtab/index.html`, `main.tsx`, `style.css` | Khung trang Tab mới, token màu, dark mode, utility `glass` |
| `entrypoints/newtab/App.tsx` | Ghép bố cục bento, trạng thái ngày đang xem và hộp thoại |
| `entrypoints/background.ts` | Service worker, chỉ gọi `registerReminderHandlers()` |
| `lib/date.ts` | Ngày giờ theo giờ máy, định dạng tiếng Việt |
| `lib/task.ts` | Kiểu `Task`, kiểm tra form, nhóm và sắp xếp, tiến độ, việc tiếp theo |
| `lib/task-storage.ts` | Đọc/ghi/xoá/lắng nghe các key `task:*` |
| `lib/reminders.ts` | Hàm thuần: khi nào đặt alarm, khi nào nhắc, nội dung nhắc |
| `lib/reminder-service.ts` | Logic service worker: alarm ↔ task, thông báo, hàng đợi tuần tự |
| `lib/theme.ts` | Đọc/ghi/áp theme |
| `store/useTaskStore.ts` | Zustand store: cập nhật ngay rồi ghi storage (lỗi thì trả lại như cũ), đồng bộ từ storage |
| `hooks/useNow.ts` | Đồng hồ nhảy theo phút |
| `hooks/useTheme.ts` | Chọn và áp theme |
| `hooks/useReminders.ts` | Hiện Toast khi background báo vừa nhắc |
| `components/Header.tsx`, `DayNav.tsx`, `ProgressCard.tsx`, `NextUpCard.tsx` | Các phần hiển thị |
| `components/QuickAdd.tsx`, `TaskList.tsx`, `TaskItem.tsx`, `TaskDialog.tsx` | Các phần thao tác với task |
| `components/undoDeleteToast.ts` | Toast "Đã xoá · Hoàn tác" dùng chung |
| `components/ui/*` | shadcn sinh bằng CLI, cộng `sonner.tsx` tự viết |

---

### Task 1: Dựng project WXT và bộ công cụ

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `wxt.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `components.json`
- Create: `components/ui/sonner.tsx`. Các file `components/ui/{button,checkbox,dialog,input,label,textarea}.tsx` sinh bằng shadcn CLI.
- Create: `assets/icon.svg`, `public/theme-init.js`, `entrypoints/newtab/{index.html,style.css,main.tsx,App.tsx}`, `entrypoints/background.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - Các lệnh `npm test`, `npm run compile`, `npm run build`, `npm run dev`.
  - Alias `@/` và utility CSS `glass`.
  - `Toaster` từ `@/components/ui/sonner`, nhận prop `theme` và `position`.
  - Các component shadcn:
    - `Button`: variant `default | outline | ghost | secondary | destructive | link`, size `default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg`.
    - `Checkbox`: `checked`, `onCheckedChange`.
    - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogClose`.
    - `Input`, `Label`, `Textarea`.

- [ ] **Step 1: Tạo `package.json`**

Liệt kê sẵn toàn bộ dependency để chỉ cần chạy `npm install` một lần. Không dùng `wxt init`, vì lệnh này từ chối chạy trong thư mục đã có file (repo đang có `docs/` và `.git`).

```json
{
  "name": "daily-task-extension",
  "description": "Danh sách việc hôm nay ngay trên tab mới, kèm nhắc đúng giờ.",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "compile": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "postinstall": "wxt prepare"
  },
  "dependencies": {
    "@fontsource/be-vietnam-pro": "^5.3.0",
    "class-variance-authority": "^0.7.1",
    "cn": "^0.4.0",
    "lucide-react": "^1.49.0",
    "motion": "^13.4.6",
    "radix-ui": "^1.6.7",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "sonner": "^2.0.8",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@wxt-dev/auto-icons": "^1.1.2",
    "@wxt-dev/module-react": "^1.2.2",
    "happy-dom": "^20.14.5",
    "shadcn": "^4.21.0",
    "tailwindcss": "^4.3.3",
    "tw-animate-css": "^1.4.0",
    "typescript": "~5.9.3",
    "vitest": "^5.0.3",
    "web-ext": "^10.7.0",
    "wxt": "^0.21.4"
  }
}
```

- [ ] **Step 2: Tạo các file cấu hình**

`tsconfig.json`: khai báo lại `paths` cho `@/*`. Lý do: tsconfig do WXT sinh nằm trong `.wxt/`, và shadcn CLI đọc sai alias từ đó (nó sẽ ghi file ra ngoài repo).

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] }
  }
}
```

`.gitignore`:

```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
.output
stats.html
stats-*.json
.wxt
web-ext.config.ts

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

`wxt.config.ts`:

```ts
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: { baseIconPath: 'assets/icon.svg' },
  manifest: {
    name: 'Việc hôm nay',
    description: 'Danh sách việc hôm nay ngay trên tab mới, kèm nhắc đúng giờ.',
    permissions: ['storage', 'alarms', 'notifications'],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest: alias '@/', auto-import, và thay `browser` bằng fakeBrowser
  plugins: [WxtVitest()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
  },
});
```

`vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

// happy-dom không chạy Web Animations đầy đủ → tắt animation của Motion khi test.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
});
```

`components.json`: shadcn không tự nhận ra WXT (`shadcn init` báo "could not detect a supported framework"), nên phải cấu hình tay:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "entrypoints/newtab/style.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: Cài dependency**

Run: `npm install`
Expected: kết thúc bằng `found 0 vulnerabilities`. `postinstall` tự chạy `wxt prepare` và tạo thư mục `.wxt/`.

- [ ] **Step 4: Sinh component shadcn**

Run: `npx shadcn add button checkbox dialog input label textarea -y`
Expected: `Created 6 files:`, gồm `components\ui\button.tsx`, `checkbox.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `dialog.tsx`.

Các file này import `cn` từ `"cn"` và primitive từ `"radix-ui"`. Như vậy là đúng, **không sửa**.

Không chạy `add sonner`: bản của shadcn kéo theo `next-themes`, nên ta tự viết `sonner.tsx` ở bước sau.

- [ ] **Step 5: Tạo `components/ui/sonner.tsx`**

```tsx
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
```

- [ ] **Step 6: Tạo khung trang và service worker tạm**

`assets/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#4f46e5"/><path d="M150 262l72 72 142-156" fill="none" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

`public/theme-init.js`:

```js
// Chạy đồng bộ trong <head> trước khi trang vẽ, để chế độ tối không bị nháy trắng.
// Giữ logic khớp với lib/theme.ts (key 'theme', giá trị light | dark | system).
(function () {
  var preference = 'system';
  try {
    preference = localStorage.getItem('theme') || 'system';
  } catch (e) {}
  var dark =
    preference === 'dark' ||
    (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
```

`entrypoints/newtab/index.html`. WXT thấy thư mục `newtab` nên tự thêm `chrome_url_overrides.newtab` vào manifest.

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tab mới</title>
    <script src="/theme-init.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`entrypoints/newtab/style.css`: token màu shadcn (tông indigo), dark mode theo class `.dark`, và utility `glass` cho hiệu ứng kính mờ.

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';
@import '@fontsource/be-vietnam-pro/400.css';
@import '@fontsource/be-vietnam-pro/500.css';
@import '@fontsource/be-vietnam-pro/600.css';

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.75rem;
  --background: oklch(0.975 0.008 270);
  --foreground: oklch(0.22 0.03 270);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.03 270);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.03 270);
  --primary: oklch(0.511 0.262 276.966);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.955 0.012 270);
  --secondary-foreground: oklch(0.22 0.03 270);
  --muted: oklch(0.955 0.012 270);
  --muted-foreground: oklch(0.5 0.03 270);
  --accent: oklch(0.94 0.03 277);
  --accent-foreground: oklch(0.22 0.03 270);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.9 0.015 270);
  --input: oklch(0.9 0.015 270);
  --ring: oklch(0.585 0.233 277.117);
}

.dark {
  --background: oklch(0.17 0.025 272);
  --foreground: oklch(0.96 0.006 270);
  --card: oklch(0.23 0.03 272);
  --card-foreground: oklch(0.96 0.006 270);
  --popover: oklch(0.23 0.03 272);
  --popover-foreground: oklch(0.96 0.006 270);
  --primary: oklch(0.673 0.182 276.935);
  --primary-foreground: oklch(0.17 0.025 272);
  --secondary: oklch(0.28 0.03 272);
  --secondary-foreground: oklch(0.96 0.006 270);
  --muted: oklch(0.28 0.03 272);
  --muted-foreground: oklch(0.72 0.03 270);
  --accent: oklch(0.3 0.06 277);
  --accent-foreground: oklch(0.96 0.006 270);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.673 0.182 276.935);
}

@theme inline {
  --font-sans: 'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

/* Thẻ kính mờ: nền bán trong suốt + blur + viền nhạt. */
@utility glass {
  @apply border border-white/60 bg-card/60 shadow-xl shadow-indigo-950/5 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-card/45 dark:shadow-black/20;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background font-sans text-foreground antialiased;
  }
}
```

`entrypoints/newtab/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`entrypoints/newtab/App.tsx` (bản tạm, Task 13 sẽ thay):

```tsx
export default function App() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <p className="glass rounded-3xl p-8 text-2xl font-semibold">Việc hôm nay</p>
    </main>
  );
}
```

`entrypoints/background.ts` (bản tạm, Task 6 sẽ thay):

```ts
export default defineBackground(() => {});
```

- [ ] **Step 7: Kiểm tra**

1. Run: `npm run compile`
   Expected: không in lỗi nào.
2. Run: `npm test -- --passWithNoTests`
   Expected: thoát với mã 0 (chưa có file test nào).
3. Run: `npm run build && cat .output/chrome-mv3/manifest.json`
   Expected: build xong, và manifest có đủ:
   - `"name":"Việc hôm nay"`
   - `"permissions":["storage","alarms","notifications"]`
   - `"background":{"service_worker":"background.js"}`
   - `"chrome_url_overrides":{"newtab":"newtab.html"}`
   - `"icons"` với các cỡ 16, 32, 48, 128.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: dựng project WXT + React + Tailwind + shadcn + Vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tiện ích ngày giờ (`lib/date.ts`)

**Files:**
- Create: `lib/date.ts`
- Test: `lib/date.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `type DateKey = string` (dạng `'YYYY-MM-DD'`)
  - Chuyển đổi và kiểm tra:
    - `toDateKey(date: Date): DateKey`
    - `parseDateKey(key: DateKey): Date`
    - `addDays(key: DateKey, days: number): DateKey`
    - `isValidDateKey(value: string): boolean`
    - `isValidTime(value: string): boolean`
    - `toTimestamp(date: DateKey, time: string): number`
    - `msUntilNextMinute(now: Date): number`
  - Định dạng tiếng Việt:
    - `formatLongDate(date: Date): string`, ví dụ `'Thứ Năm, 1 tháng 10'`
    - `formatShortDate(key: DateKey): string`, ví dụ `'30/9'`
    - `formatClock(date: Date): string`, ví dụ `'09:05'`
    - `relativeDayLabel(key: DateKey, today: DateKey): string`
    - `greeting(hour: number): string`
    - `formatCountdown(ms: number): string`

Mọi hàm đều tính theo **giờ máy**. Phần định dạng tự viết, không dùng `Intl`, để kết quả test luôn ổn định.

- [ ] **Step 1: Viết test (chưa có code)**

`lib/date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatClock,
  formatCountdown,
  formatLongDate,
  formatShortDate,
  greeting,
  isValidDateKey,
  isValidTime,
  msUntilNextMinute,
  parseDateKey,
  relativeDayLabel,
  toDateKey,
  toTimestamp,
} from './date';

describe('date keys', () => {
  it('chuyển Date ↔ key theo giờ máy', () => {
    expect(toDateKey(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01');
    expect(parseDateKey('2026-10-01').getTime()).toBe(new Date(2026, 9, 1).getTime());
  });

  it('cộng ngày qua ranh giới tháng và năm', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('kiểm tra ngày hợp lệ', () => {
    expect(isValidDateKey('2026-10-01')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('1/10/2026')).toBe(false);
    expect(isValidDateKey('')).toBe(false);
  });

  it('kiểm tra giờ hợp lệ', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:00')).toBe(false);
  });

  it('ghép ngày + giờ thành timestamp theo giờ máy', () => {
    expect(toTimestamp('2026-10-01', '09:30')).toBe(new Date(2026, 9, 1, 9, 30).getTime());
  });

  it('tính ms tới đầu phút kế tiếp', () => {
    expect(msUntilNextMinute(new Date(2026, 9, 1, 9, 41, 15))).toBe(45_000);
    expect(msUntilNextMinute(new Date(2026, 9, 1, 9, 41, 0))).toBe(60_000);
  });
});

describe('định dạng tiếng Việt', () => {
  it('ngày dài, ngày ngắn, đồng hồ', () => {
    expect(formatLongDate(new Date(2026, 9, 1))).toBe('Thứ Năm, 1 tháng 10');
    expect(formatShortDate('2026-09-30')).toBe('30/9');
    expect(formatClock(new Date(2026, 9, 1, 9, 5))).toBe('09:05');
  });

  it('nhãn ngày tương đối', () => {
    const today = '2026-10-01';
    expect(relativeDayLabel('2026-10-01', today)).toBe('Hôm nay');
    expect(relativeDayLabel('2026-10-02', today)).toBe('Ngày mai');
    expect(relativeDayLabel('2026-09-30', today)).toBe('Hôm qua');
    expect(relativeDayLabel('2026-10-03', today)).toBe('Thứ Bảy, 3/10');
  });

  it('lời chào theo giờ', () => {
    expect(greeting(6)).toBe('Chào buổi sáng');
    expect(greeting(12)).toBe('Chào buổi chiều');
    expect(greeting(18)).toBe('Chào buổi tối');
  });

  it('đếm ngược', () => {
    expect(formatCountdown(30_000)).toBe('sắp đến giờ');
    expect(formatCountdown(19 * 60_000)).toBe('còn 19 phút');
    expect(formatCountdown(18 * 60_000 + 1)).toBe('còn 19 phút');
    expect(formatCountdown(120 * 60_000)).toBe('còn 2 giờ');
    expect(formatCountdown(125 * 60_000)).toBe('còn 2 giờ 5 phút');
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run lib/date.test.ts`
Expected: FAIL với `Failed to resolve import "./date" from "lib/date.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`lib/date.ts`:

```ts
/** Ngày theo giờ máy, dạng 'YYYY-MM-DD'. */
export type DateKey = string;

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const MINUTE_MS = 60_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Nửa đêm (giờ máy) của ngày `key`. */
export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toDateKey(parseDateKey(value)) === value;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Epoch ms của ngày + giờ 'HH:mm' theo giờ máy. */
export function toTimestamp(date: DateKey, time: string): number {
  const result = parseDateKey(date);
  const [hours, minutes] = time.split(':').map(Number);
  result.setHours(hours!, minutes!, 0, 0);
  return result.getTime();
}

/** Số ms tới đầu phút kế tiếp — để đồng hồ nhảy đúng lúc đổi phút. */
export function msUntilNextMinute(now: Date): number {
  return MINUTE_MS - (now.getTime() % MINUTE_MS);
}

/** 'Thứ Năm, 1 tháng 10' */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} tháng ${date.getMonth() + 1}`;
}

/** '1/10' */
export function formatShortDate(key: DateKey): string {
  const date = parseDateKey(key);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** '09:41' */
export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 'Hôm nay' | 'Ngày mai' | 'Hôm qua' | 'Thứ Sáu, 3/10' */
export function relativeDayLabel(key: DateKey, today: DateKey): string {
  if (key === today) return 'Hôm nay';
  if (key === addDays(today, 1)) return 'Ngày mai';
  if (key === addDays(today, -1)) return 'Hôm qua';
  return `${WEEKDAYS[parseDateKey(key).getDay()]}, ${formatShortDate(key)}`;
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/** 'còn 19 phút' | 'còn 2 giờ' | 'còn 2 giờ 5 phút' | 'sắp đến giờ' */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / MINUTE_MS);
  if (totalMinutes <= 1) return 'sắp đến giờ';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `còn ${minutes} phút`;
  if (minutes === 0) return `còn ${hours} giờ`;
  return `còn ${hours} giờ ${minutes} phút`;
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run lib/date.test.ts`
Expected: `Tests  10 passed (10)`

- [ ] **Step 5: Commit**

```bash
git add lib/date.ts lib/date.test.ts
git commit -m "feat(date): tiện ích ngày giờ theo giờ máy và định dạng tiếng Việt" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Mô hình Task (`lib/task.ts`)

**Files:**
- Create: `lib/task.ts`
- Test: `lib/task.test.ts`

**Interfaces:**
- Consumes (từ Task 2): `isValidDateKey`, `isValidTime`, `toDateKey`, `toTimestamp`, `type DateKey`.
- Produces:
  - Kiểu dữ liệu:
    - `type TaskStatus = 'todo' | 'done'`
    - `type Task = { id; title; description?; status; dueDate; dueTime?; createdAt; completedAt?; remindedFor? }`
    - `type TaskInput = { title: string; description: string; dueDate: string; dueTime: string }` (chuỗi rỗng nghĩa là bỏ trống)
    - `type TaskErrors = Partial<Record<keyof TaskInput, string>>`
    - `type Progress = { done: number; total: number; percent: number }`
  - Hằng số: `TITLE_MAX = 120`, `DESCRIPTION_MAX = 1000`
  - Kiểm tra form: `validateTaskInput(input): TaskErrors`, `hasErrors(errors): boolean`
  - Tạo và sửa task:
    - `createTask(input, id, now: number): Task`
    - `applyTaskInput(task, input): Task`
    - `taskToInput(task): TaskInput`
    - `withStatus(task, status, now: number): Task`
  - Mốc giờ:
    - `dueKey(task): string | undefined`, dạng `` `${dueDate}T${dueTime}` ``
    - `dueAt(task): number | undefined`
    - `isPastDue(task, now: number): boolean`
  - `isTask(value: unknown): value is Task`
  - Nhóm và thống kê:
    - `overdueTasks(tasks, today)`
    - `todoForDay(tasks, day)`
    - `doneForDay(tasks, day)`
    - `progressForDay(tasks, day): Progress`
    - `nextUpTask(tasks, now: Date): Task | undefined`

- [ ] **Step 1: Viết test (chưa có code)**

`lib/task.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyTaskInput,
  createTask,
  doneForDay,
  dueAt,
  dueKey,
  isPastDue,
  isTask,
  nextUpTask,
  overdueTasks,
  progressForDay,
  taskToInput,
  todoForDay,
  validateTaskInput,
  withStatus,
  type Task,
  type TaskInput,
} from './task';

const input = (over: Partial<TaskInput> = {}): TaskInput => ({
  title: 'Họp team',
  description: '',
  dueDate: '2026-10-01',
  dueTime: '',
  ...over,
});

let seq = 0;
const task = (over: Partial<Task> = {}): Task => ({
  id: `t${++seq}`,
  title: 'Việc',
  status: 'todo',
  dueDate: '2026-10-01',
  createdAt: seq,
  ...over,
});

describe('validateTaskInput', () => {
  it('hợp lệ thì không có lỗi', () => {
    expect(validateTaskInput(input({ dueTime: '09:00' }))).toEqual({});
  });

  it('bắt lỗi tiêu đề rỗng hoặc quá dài', () => {
    expect(validateTaskInput(input({ title: '   ' })).title).toBe('Nhập tên công việc');
    expect(validateTaskInput(input({ title: 'a'.repeat(121) })).title).toBe('Tối đa 120 ký tự');
    expect(validateTaskInput(input({ title: `  ${'a'.repeat(120)}  ` })).title).toBeUndefined();
  });

  it('bắt lỗi mô tả, ngày, giờ', () => {
    const errors = validateTaskInput(
      input({ description: 'a'.repeat(1001), dueDate: '2026-02-30', dueTime: '25:00' }),
    );
    expect(errors).toEqual({
      description: 'Tối đa 1000 ký tự',
      dueDate: 'Chọn ngày hợp lệ',
      dueTime: 'Giờ không hợp lệ',
    });
  });
});

describe('tạo và sửa task', () => {
  it('createTask cắt khoảng trắng và bỏ trường rỗng', () => {
    expect(createTask(input({ title: '  Họp  ', description: '  ' }), 'id1', 100)).toEqual({
      id: 'id1',
      title: 'Họp',
      status: 'todo',
      dueDate: '2026-10-01',
      createdAt: 100,
    });
  });

  it('applyTaskInput xoá mô tả/giờ khi bỏ trống, giữ trạng thái', () => {
    const before = task({ description: 'cũ', dueTime: '09:00', status: 'done', completedAt: 5 });
    const after = applyTaskInput(before, input({ title: 'Mới', dueDate: '2026-10-02' }));
    expect(after).toEqual({
      id: before.id,
      title: 'Mới',
      status: 'done',
      dueDate: '2026-10-02',
      createdAt: before.createdAt,
      completedAt: 5,
    });
    expect('description' in after).toBe(false);
    expect('dueTime' in after).toBe(false);
  });

  it('taskToInput là chiều ngược của form', () => {
    const t = task({ title: 'A', dueTime: '10:00' });
    expect(taskToInput(t)).toEqual({
      title: 'A',
      description: '',
      dueDate: '2026-10-01',
      dueTime: '10:00',
    });
  });

  it('withStatus đặt/xoá completedAt', () => {
    const done = withStatus(task(), 'done', 999);
    expect(done).toMatchObject({ status: 'done', completedAt: 999 });
    const todo = withStatus(done, 'todo', 1000);
    expect(todo.status).toBe('todo');
    expect('completedAt' in todo).toBe(false);
  });
});

describe('mốc giờ', () => {
  it('dueKey/dueAt chỉ có khi task có giờ', () => {
    const timed = task({ dueTime: '09:30' });
    expect(dueKey(timed)).toBe('2026-10-01T09:30');
    expect(dueAt(timed)).toBe(new Date(2026, 9, 1, 9, 30).getTime());
    expect(dueKey(task())).toBeUndefined();
    expect(dueAt(task())).toBeUndefined();
  });

  it('isPastDue: chưa xong, có giờ, giờ đã qua', () => {
    const now = new Date(2026, 9, 1, 10, 0).getTime();
    expect(isPastDue(task({ dueTime: '09:00' }), now)).toBe(true);
    expect(isPastDue(task({ dueTime: '11:00' }), now)).toBe(false);
    expect(isPastDue(task({ dueTime: '09:00', status: 'done' }), now)).toBe(false);
    expect(isPastDue(task(), now)).toBe(false);
  });
});

describe('isTask', () => {
  it('nhận task hợp lệ, loại dữ liệu hỏng', () => {
    expect(isTask(task({ dueTime: '09:00', description: 'x' }))).toBe(true);
    expect(isTask(null)).toBe(false);
    expect(isTask({ id: 'x' })).toBe(false);
    expect(isTask(task({ status: 'doing' as never }))).toBe(false);
    expect(isTask(task({ dueDate: '01/10/2026' }))).toBe(false);
    expect(isTask(task({ dueTime: '9h' }))).toBe(false);
  });
});

describe('nhóm và sắp xếp', () => {
  const today = '2026-10-01';

  it('overdueTasks: chưa xong của ngày trước, cũ nhất trước', () => {
    const a = task({ dueDate: '2026-09-30', dueTime: '08:00' });
    const b = task({ dueDate: '2026-09-29' });
    const doneOld = task({ dueDate: '2026-09-29', status: 'done' });
    const todayTask = task({ dueDate: today });
    expect(overdueTasks([a, b, doneOld, todayTask], today)).toEqual([b, a]);
  });

  it('todoForDay: có giờ trước theo giờ, không giờ sau theo thời điểm tạo', () => {
    const late = task({ dueTime: '15:00' });
    const early = task({ dueTime: '08:00' });
    const noTime1 = task({ createdAt: 1 });
    const noTime2 = task({ createdAt: 2 });
    const other = task({ dueDate: '2026-10-02' });
    expect(todoForDay([noTime2, late, other, noTime1, early], today)).toEqual([
      early,
      late,
      noTime1,
      noTime2,
    ]);
  });

  it('doneForDay: xong gần nhất trước', () => {
    const first = task({ status: 'done', completedAt: 1 });
    const second = task({ status: 'done', completedAt: 2 });
    expect(doneForDay([first, second, task()], today)).toEqual([second, first]);
  });

  it('progressForDay chỉ tính task của ngày đó', () => {
    const tasks = [
      task({ status: 'done' }),
      task({ status: 'done' }),
      task(),
      task({ dueDate: '2026-09-30' }),
    ];
    expect(progressForDay(tasks, today)).toEqual({ done: 2, total: 3, percent: 67 });
    expect(progressForDay([], today)).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it('nextUpTask: task có giờ sớm nhất chưa tới giờ của hôm nay', () => {
    const now = new Date(2026, 9, 1, 9, 41);
    const passed = task({ dueTime: '09:00' });
    const soon = task({ dueTime: '10:00' });
    const later = task({ dueTime: '11:00' });
    const doneSoon = task({ dueTime: '09:50', status: 'done' });
    const tomorrow = task({ dueDate: '2026-10-02', dueTime: '08:00' });
    expect(nextUpTask([later, passed, doneSoon, tomorrow, soon], now)).toBe(soon);
    expect(nextUpTask([passed], now)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run lib/task.test.ts`
Expected: FAIL với `Failed to resolve import "./task" from "lib/task.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`lib/task.ts`:

```ts
import { isValidDateKey, isValidTime, toDateKey, toTimestamp, type DateKey } from './date';

export type TaskStatus = 'todo' | 'done';

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  /** 'YYYY-MM-DD' theo giờ máy */
  dueDate: DateKey;
  /** 'HH:mm'; không có = việc trong ngày, không nhắc */
  dueTime?: string;
  createdAt: number;
  completedAt?: number;
  /** Mốc đã nhắc, dạng `${dueDate}T${dueTime}` */
  remindedFor?: string;
};

/** Giá trị form thêm/sửa; chuỗi rỗng = bỏ trống. */
export type TaskInput = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
};

export type TaskErrors = Partial<Record<keyof TaskInput, string>>;

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;

export function validateTaskInput(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Nhập tên công việc';
  else if (title.length > TITLE_MAX) errors.title = `Tối đa ${TITLE_MAX} ký tự`;
  if (input.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Tối đa ${DESCRIPTION_MAX} ký tự`;
  }
  if (!isValidDateKey(input.dueDate)) errors.dueDate = 'Chọn ngày hợp lệ';
  if (input.dueTime && !isValidTime(input.dueTime)) errors.dueTime = 'Giờ không hợp lệ';
  return errors;
}

export function hasErrors(errors: TaskErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Gán các trường từ form vào task (dùng cho cả tạo mới và sửa). */
export function applyTaskInput(task: Task, input: TaskInput): Task {
  const next: Task = { ...task, title: input.title.trim(), dueDate: input.dueDate };
  const description = input.description.trim();
  if (description) next.description = description;
  else delete next.description;
  if (input.dueTime) next.dueTime = input.dueTime;
  else delete next.dueTime;
  return next;
}

export function createTask(input: TaskInput, id: string, now: number): Task {
  return applyTaskInput(
    { id, title: '', status: 'todo', dueDate: input.dueDate, createdAt: now },
    input,
  );
}

export function taskToInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate,
    dueTime: task.dueTime ?? '',
  };
}

export function withStatus(task: Task, status: TaskStatus, now: number): Task {
  const next: Task = { ...task, status };
  if (status === 'done') next.completedAt = now;
  else delete next.completedAt;
  return next;
}

/** Mốc nhắc `${dueDate}T${dueTime}`, hoặc undefined nếu task không có giờ. */
export function dueKey(task: Task): string | undefined {
  return task.dueTime ? `${task.dueDate}T${task.dueTime}` : undefined;
}

/** Thời điểm đến hạn (epoch ms), hoặc undefined nếu task không có giờ. */
export function dueAt(task: Task): number | undefined {
  return task.dueTime ? toTimestamp(task.dueDate, task.dueTime) : undefined;
}

/** Task chưa xong, có giờ và giờ đã qua — nhãn giờ tô đỏ. */
export function isPastDue(task: Task, now: number): boolean {
  const at = dueAt(task);
  return task.status === 'todo' && at !== undefined && at < now;
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    (v.status === 'todo' || v.status === 'done') &&
    typeof v.dueDate === 'string' &&
    isValidDateKey(v.dueDate) &&
    (v.dueTime === undefined || (typeof v.dueTime === 'string' && isValidTime(v.dueTime))) &&
    (v.description === undefined || typeof v.description === 'string') &&
    typeof v.createdAt === 'number' &&
    (v.completedAt === undefined || typeof v.completedAt === 'number') &&
    (v.remindedFor === undefined || typeof v.remindedFor === 'string')
  );
}

/** Task có giờ đứng trước (giờ tăng dần), task không giờ sau (tạo trước đứng trước). */
function compareTodo(a: Task, b: Task): number {
  if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
  if (a.dueTime) return -1;
  if (b.dueTime) return 1;
  return a.createdAt - b.createdAt;
}

export function overdueTasks(tasks: Task[], today: DateKey): Task[] {
  return tasks
    .filter((t) => t.status === 'todo' && t.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || compareTodo(a, b));
}

export function todoForDay(tasks: Task[], day: DateKey): Task[] {
  return tasks.filter((t) => t.status === 'todo' && t.dueDate === day).sort(compareTodo);
}

export function doneForDay(tasks: Task[], day: DateKey): Task[] {
  return tasks
    .filter((t) => t.status === 'done' && t.dueDate === day)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export type Progress = { done: number; total: number; percent: number };

export function progressForDay(tasks: Task[], day: DateKey): Progress {
  const ofDay = tasks.filter((t) => t.dueDate === day);
  const done = ofDay.filter((t) => t.status === 'done').length;
  const total = ofDay.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Task chưa xong của hôm nay có giờ sớm nhất mà chưa tới giờ. */
export function nextUpTask(tasks: Task[], now: Date): Task | undefined {
  const today = toDateKey(now);
  const nowMs = now.getTime();
  let best: { task: Task; at: number } | undefined;
  for (const task of tasks) {
    if (task.status !== 'todo' || task.dueDate !== today) continue;
    const at = dueAt(task);
    if (at === undefined || at < nowMs) continue;
    if (!best || at < best.at) best = { task, at };
  }
  return best?.task;
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run lib/task.test.ts`
Expected: `Tests  15 passed (15)`

- [ ] **Step 5: Commit**

```bash
git add lib/task.ts lib/task.test.ts
git commit -m "feat(task): mô hình Task, kiểm tra form, nhóm và tiến độ" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Lưu task trong `chrome.storage.local` (`lib/task-storage.ts`)

**Files:**
- Create: `lib/task-storage.ts`
- Test: `lib/task-storage.test.ts`

**Interfaces:**
- Consumes (từ Task 3): `isTask`, `type Task`.
- Produces:
  - `taskKey(id: string): string` (trả `'task:<id>'`)
  - `type TaskChange = { id: string; task: Task | undefined }` (`undefined` nghĩa là task đã bị xoá)
  - `loadAllTasks(): Promise<Record<string, Task>>`
  - `loadTask(id): Promise<Task | undefined>`
  - `saveTask(task): Promise<void>`
  - `removeTask(id): Promise<void>`
  - `watchTasks(onChange: (changes: TaskChange[]) => void): () => void` (trả về hàm huỷ lắng nghe)

Ghi chú:
- Mỗi task nằm ở một key riêng, vì cả trang lẫn background đều ghi. Tách key thì hai lần ghi không đè mất thay đổi của nhau.
- Khi xoá key, Chrome bỏ trống `newValue`, còn `fakeBrowser` lại dùng `null`. Vì vậy phải kiểm tra bằng `== null` để bắt được cả hai.

- [ ] **Step 1: Viết test (chưa có code)**

`lib/task-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task } from './task';
import { loadAllTasks, loadTask, removeTask, saveTask, taskKey, watchTasks } from './task-storage';

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Việc ${id}`,
  status: 'todo',
  dueDate: '2026-10-01',
  createdAt: 1,
  ...over,
});

describe('task-storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('mỗi task lưu ở một key riêng', async () => {
    await saveTask(task('a'));
    expect(await browser.storage.local.get(null)).toEqual({ 'task:a': task('a') });
    expect(taskKey('a')).toBe('task:a');
  });

  it('loadAllTasks bỏ qua key lạ và dữ liệu hỏng', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await browser.storage.local.set({
      'task:a': task('a'),
      'task:b': { id: 'b', title: 42 },
      theme: 'dark',
    });
    expect(await loadAllTasks()).toEqual({ a: task('a') });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('loadTask / removeTask', async () => {
    await saveTask(task('a'));
    expect(await loadTask('a')).toEqual(task('a'));
    await removeTask('a');
    expect(await loadTask('a')).toBeUndefined();
  });

  it('watchTasks báo cả ghi và xoá, bỏ qua key khác', async () => {
    const onChange = vi.fn();
    const stop = watchTasks(onChange);

    await saveTask(task('a'));
    await browser.storage.local.set({ theme: 'dark' });
    await removeTask('a');

    expect(onChange.mock.calls).toEqual([
      [[{ id: 'a', task: task('a') }]],
      [[{ id: 'a', task: undefined }]],
    ]);

    stop();
    await saveTask(task('b'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run lib/task-storage.test.ts`
Expected: FAIL với `Failed to resolve import "./task-storage" from "lib/task-storage.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`lib/task-storage.ts`:

```ts
import { browser } from 'wxt/browser';
import { isTask, type Task } from './task';

const TASK_KEY_PREFIX = 'task:';

export const taskKey = (id: string) => `${TASK_KEY_PREFIX}${id}`;

/** Thay đổi của một task; `task` = undefined nghĩa là đã bị xoá. */
export type TaskChange = { id: string; task: Task | undefined };

export async function loadAllTasks(): Promise<Record<string, Task>> {
  const items = await browser.storage.local.get(null);
  const tasks: Record<string, Task> = {};
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(TASK_KEY_PREFIX)) continue;
    if (isTask(value)) tasks[value.id] = value;
    else console.warn('[task-storage] Bỏ qua dữ liệu hỏng', key, value);
  }
  return tasks;
}

export async function loadTask(id: string): Promise<Task | undefined> {
  const key = taskKey(id);
  const value = (await browser.storage.local.get(key))[key];
  return isTask(value) ? value : undefined;
}

export async function saveTask(task: Task): Promise<void> {
  await browser.storage.local.set({ [taskKey(task.id)]: task });
}

export async function removeTask(id: string): Promise<void> {
  await browser.storage.local.remove(taskKey(id));
}

/** Nghe thay đổi task từ mọi nơi (tab khác, background). Trả về hàm huỷ. */
export function watchTasks(onChange: (changes: TaskChange[]) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    const result: TaskChange[] = [];
    for (const [key, change] of Object.entries(changes)) {
      if (!key.startsWith(TASK_KEY_PREFIX)) continue;
      const id = key.slice(TASK_KEY_PREFIX.length);
      // Chrome bỏ trống newValue khi xoá; bản giả lập dùng null.
      if (change.newValue == null) result.push({ id, task: undefined });
      else if (isTask(change.newValue)) result.push({ id, task: change.newValue });
    }
    if (result.length > 0) onChange(result);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run lib/task-storage.test.ts`
Expected: `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add lib/task-storage.ts lib/task-storage.test.ts
git commit -m "feat(storage): lưu mỗi task một key trong chrome.storage.local" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Quy tắc nhắc việc (`lib/reminders.ts`)

**Files:**
- Create: `lib/reminders.ts`
- Test: `lib/reminders.test.ts`

**Interfaces:**
- Consumes (từ Task 3): `dueAt`, `dueKey`, `type Task`.
- Produces:
  - Hằng số: `MISSED_WINDOW_MS = 3_600_000` (60 phút), `ON_TIME_TOLERANCE_MS = 60_000` (60 giây)
  - Tên alarm và id thông báo:
    - `reminderId(taskId): string` (trả `'task:<id>'`)
    - `taskIdFromReminderId(id): string | undefined`
  - Tin nhắn cho trang New Tab:
    - `type ReminderMessage = { type: 'reminder'; taskId: string }`
    - `isReminderMessage(value): value is ReminderMessage`
  - Điều kiện:
    - `alarmTimeFor(task, now: number): number | undefined`
    - `shouldRemind(task: Task | undefined, now: number): task is Task`
  - Nội dung:
    - `reminderHeadline(task, now): string` (trả `'Đến giờ · 10:00'` hoặc `'Đã quá giờ · 10:00'`)
    - `reminderMessage(task, now): string` (dòng giờ, kèm mô tả ở dòng sau nếu có)

`shouldRemind` trả `true` khi đủ cả 4 điều kiện:
1. Task chưa xong.
2. Task có giờ nhắc.
3. `remindedFor` khác mốc hiện tại.
4. `dueAt` nằm trong khoảng `(now − 60 phút, now + 60 giây]`.

Cùng một quy tắc này được dùng cho cả lúc alarm kêu lẫn lúc nhắc bù khi Chrome khởi động.

- [ ] **Step 1: Viết test (chưa có code)**

`lib/reminders.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  alarmTimeFor,
  isReminderMessage,
  reminderHeadline,
  reminderId,
  reminderMessage,
  shouldRemind,
  taskIdFromReminderId,
} from './reminders';
import type { Task } from './task';

const at = (h: number, m: number) => new Date(2026, 9, 1, h, m).getTime();
const MIN = 60_000;

const task = (over: Partial<Task> = {}): Task => ({
  id: 'a',
  title: 'Họp team',
  status: 'todo',
  dueDate: '2026-10-01',
  dueTime: '10:00',
  createdAt: 1,
  ...over,
});

describe('id alarm/thông báo', () => {
  it('ghép và tách id', () => {
    expect(reminderId('abc')).toBe('task:abc');
    expect(taskIdFromReminderId('task:abc')).toBe('abc');
    expect(taskIdFromReminderId('other')).toBeUndefined();
  });

  it('nhận diện tin nhắn nhắc việc', () => {
    expect(isReminderMessage({ type: 'reminder', taskId: 'a' })).toBe(true);
    expect(isReminderMessage({ type: 'other' })).toBe(false);
    expect(isReminderMessage(null)).toBe(false);
  });
});

describe('alarmTimeFor', () => {
  it('task chưa xong, có giờ ở tương lai → giờ đến hạn', () => {
    expect(alarmTimeFor(task(), at(9, 0))).toBe(at(10, 0));
  });

  it('không cần alarm khi đã xong, không có giờ, hoặc giờ đã qua', () => {
    expect(alarmTimeFor(task({ status: 'done' }), at(9, 0))).toBeUndefined();
    expect(alarmTimeFor(task({ dueTime: undefined }), at(9, 0))).toBeUndefined();
    expect(alarmTimeFor(task(), at(10, 0))).toBeUndefined();
  });
});

describe('shouldRemind', () => {
  it('nhắc khi tới giờ (cho phép alarm kêu sớm/trễ tới 1 phút)', () => {
    expect(shouldRemind(task(), at(10, 0))).toBe(true);
    expect(shouldRemind(task(), at(10, 0) - 30_000)).toBe(true);
    expect(shouldRemind(task(), at(9, 58))).toBe(false);
  });

  it('nhắc bù trong vòng 60 phút, quá thì thôi', () => {
    expect(shouldRemind(task(), at(10, 59))).toBe(true);
    expect(shouldRemind(task(), at(11, 0))).toBe(false);
  });

  it('không nhắc task đã xong, không có giờ, đã xoá', () => {
    expect(shouldRemind(task({ status: 'done' }), at(10, 0))).toBe(false);
    expect(shouldRemind(task({ dueTime: undefined }), at(10, 0))).toBe(false);
    expect(shouldRemind(undefined, at(10, 0))).toBe(false);
  });

  it('không nhắc lại cùng mốc, nhưng nhắc khi mốc đổi', () => {
    expect(shouldRemind(task({ remindedFor: '2026-10-01T10:00' }), at(10, 0))).toBe(false);
    expect(
      shouldRemind(task({ dueTime: '10:30', remindedFor: '2026-10-01T10:00' }), at(10, 30)),
    ).toBe(true);
  });
});

describe('reminderHeadline / reminderMessage', () => {
  it('dòng giờ không kèm mô tả', () => {
    expect(reminderHeadline(task({ description: 'Phòng 3' }), at(10, 0))).toBe('Đến giờ · 10:00');
  });

  it('đúng giờ / quá giờ, kèm mô tả', () => {
    expect(reminderMessage(task(), at(10, 0))).toBe('Đến giờ · 10:00');
    expect(reminderMessage(task(), at(10, 0) + MIN)).toBe('Đến giờ · 10:00');
    expect(reminderMessage(task({ description: 'Phòng 3' }), at(10, 20))).toBe(
      'Đã quá giờ · 10:00\nPhòng 3',
    );
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run lib/reminders.test.ts`
Expected: FAIL với `Failed to resolve import "./reminders" from "lib/reminders.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`lib/reminders.ts`:

```ts
import { dueAt, dueKey, type Task } from './task';

/** Nhắc bù những mốc bị lỡ trong vòng 60 phút (Chrome tắt, máy ngủ). */
export const MISSED_WINDOW_MS = 60 * 60_000;
/** Alarm có thể kêu lệch vài giây; trong khoảng này vẫn tính là "đúng giờ". */
export const ON_TIME_TOLERANCE_MS = 60_000;

const PREFIX = 'task:';

/** Tên alarm và id thông báo của một task (dùng chung). */
export const reminderId = (taskId: string) => `${PREFIX}${taskId}`;

export function taskIdFromReminderId(id: string): string | undefined {
  return id.startsWith(PREFIX) ? id.slice(PREFIX.length) : undefined;
}

/** Tin background gửi cho trang New Tab khi vừa nhắc một task. */
export type ReminderMessage = { type: 'reminder'; taskId: string };

export function isReminderMessage(value: unknown): value is ReminderMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ReminderMessage).type === 'reminder' &&
    typeof (value as ReminderMessage).taskId === 'string'
  );
}

/** Thời điểm cần đặt alarm, hoặc undefined nếu task không cần alarm. */
export function alarmTimeFor(task: Task, now: number): number | undefined {
  if (task.status !== 'todo') return undefined;
  const at = dueAt(task);
  return at !== undefined && at > now ? at : undefined;
}

/** Task có cần nhắc ngay lúc `now` không (alarm vừa kêu, hoặc nhắc bù khi khởi động). */
export function shouldRemind(task: Task | undefined, now: number): task is Task {
  if (!task || task.status !== 'todo') return false;
  const at = dueAt(task);
  if (at === undefined || task.remindedFor === dueKey(task)) return false;
  return at <= now + ON_TIME_TOLERANCE_MS && at > now - MISSED_WINDOW_MS;
}

/** 'Đến giờ · 10:00' hoặc 'Đã quá giờ · 09:00'. */
export function reminderHeadline(task: Task, now: number): string {
  const late = now - (dueAt(task) ?? now) > ON_TIME_TOLERANCE_MS;
  return `${late ? 'Đã quá giờ' : 'Đến giờ'} · ${task.dueTime}`;
}

/** Nội dung thông báo hệ thống: dòng giờ, kèm mô tả nếu có. */
export function reminderMessage(task: Task, now: number): string {
  const headline = reminderHeadline(task, now);
  return task.description ? `${headline}\n${task.description}` : headline;
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run lib/reminders.test.ts`
Expected: `Tests  10 passed (10)`

- [ ] **Step 5: Commit**

```bash
git add lib/reminders.ts lib/reminders.test.ts
git commit -m "feat(reminders): quy tắc đặt alarm, điều kiện nhắc và nội dung thông báo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Service worker nhắc việc (`lib/reminder-service.ts`, `entrypoints/background.ts`)

**Files:**
- Create: `lib/reminder-service.ts`
- Modify: `entrypoints/background.ts` (thay toàn bộ bản tạm của Task 1)
- Test: `lib/reminder-service.test.ts`

**Interfaces:**
- Consumes:
  - Từ Task 5: `alarmTimeFor`, `reminderId`, `reminderMessage`, `shouldRemind`, `taskIdFromReminderId`, `type ReminderMessage`.
  - Từ Task 3: `dueKey`, `withStatus`, `type Task`.
  - Từ Task 4: `loadAllTasks`, `loadTask`, `saveTask`, `watchTasks`.
- Produces:
  - `syncAlarm(id, task: Task | undefined, now?)`: đặt, dời hoặc huỷ alarm của một task. Task xong hoặc bị xoá thì cất luôn thông báo đang hiện.
  - `remindIfDue(id, now?)`: nếu đủ điều kiện thì bắn thông báo (có nút "Đánh dấu xong", `requireInteraction`), ghi `remindedFor`, rồi `runtime.sendMessage({ type: 'reminder', taskId })`. Nếu không có trang nào nhận tin thì bỏ qua lỗi.
  - `rebuildAlarms(now?)`: xoá mọi alarm `task:*`, tạo lại từ storage, rồi nhắc bù.
  - `completeFromNotification(id, now?)`
  - `createQueue(): { push(job: () => Promise<void>): void; idle(): Promise<void> }`
  - `registerReminderHandlers(): ReturnType<typeof createQueue>`

Ghi chú:
- Mọi việc trong service worker chạy tuần tự qua `createQueue`, để alarm cũ kêu lúc khởi động và bước nhắc bù không cùng nhắc một task hai lần.
- Listener phải được gắn **đồng bộ** ngay khi service worker khởi động.
- Test gọi `queue.idle()` để chờ các việc trong hàng đợi chạy xong.

- [ ] **Step 1: Viết test (chưa có code)**

`lib/reminder-service.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  completeFromNotification,
  createQueue,
  rebuildAlarms,
  registerReminderHandlers,
  remindIfDue,
  syncAlarm,
} from './reminder-service';
import type { Task } from './task';
import { loadTask, removeTask, saveTask } from './task-storage';

const at = (h: number, m: number) => new Date(2026, 9, 1, h, m).getTime();

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Việc ${id}`,
  status: 'todo',
  dueDate: '2026-10-01',
  dueTime: '10:00',
  createdAt: 1,
  ...over,
});

const alarmNames = async () => (await browser.alarms.getAll()).map((a) => a.name).sort();
const notifications = () => fakeBrowser.notifications.getAllCreateOptions();

beforeEach(() => {
  fakeBrowser.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('syncAlarm', () => {
  it('đặt alarm đúng giờ cho task chưa xong có giờ ở tương lai', async () => {
    await syncAlarm('a', task('a'), at(9, 0));
    expect(await browser.alarms.get('task:a')).toMatchObject({ scheduledTime: at(10, 0) });
  });

  it('dời alarm khi đổi giờ', async () => {
    await syncAlarm('a', task('a'), at(9, 0));
    await syncAlarm('a', task('a', { dueTime: '11:00' }), at(9, 0));
    expect(await browser.alarms.getAll()).toHaveLength(1);
    expect(await browser.alarms.get('task:a')).toMatchObject({ scheduledTime: at(11, 0) });
  });

  it('huỷ alarm và cất thông báo khi task xong hoặc bị xoá', async () => {
    await syncAlarm('a', task('a'), at(9, 0));
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });
    await syncAlarm('a', task('a', { status: 'done' }), at(9, 0));
    expect(await alarmNames()).toEqual([]);
    expect(notifications()).toEqual({});

    await syncAlarm('b', task('b'), at(9, 0));
    await syncAlarm('b', undefined, at(9, 0));
    expect(await alarmNames()).toEqual([]);
  });
});

describe('remindIfDue', () => {
  it('bắn thông báo, ghi remindedFor và nhắn cho trang đang mở', async () => {
    const onMessage = vi.fn();
    browser.runtime.onMessage.addListener(onMessage);
    await saveTask(task('a', { description: 'Phòng 3' }));

    await remindIfDue('a', at(10, 0));

    expect(notifications()['task:a']).toMatchObject({
      type: 'basic',
      title: 'Việc a',
      message: 'Đến giờ · 10:00\nPhòng 3',
      buttons: [{ title: 'Đánh dấu xong' }],
      requireInteraction: true,
      iconUrl: 'chrome-extension://test-extension-id/icons/128.png',
    });
    expect((await loadTask('a'))?.remindedFor).toBe('2026-10-01T10:00');
    expect(onMessage).toHaveBeenCalledWith({ type: 'reminder', taskId: 'a' }, {}, expect.any(Function));
  });

  it('không lỗi khi không có trang nào mở', async () => {
    await saveTask(task('a'));
    await expect(remindIfDue('a', at(10, 0))).resolves.toBeUndefined();
    expect(notifications()['task:a']).toBeDefined();
  });

  it('không nhắc task đã xong, đã nhắc, hoặc đã xoá', async () => {
    await saveTask(task('a', { status: 'done' }));
    await saveTask(task('b', { remindedFor: '2026-10-01T10:00' }));
    await remindIfDue('a', at(10, 0));
    await remindIfDue('b', at(10, 0));
    await remindIfDue('missing', at(10, 0));
    expect(notifications()).toEqual({});
  });
});

describe('rebuildAlarms', () => {
  it('xoá alarm cũ, đặt lại cho task tương lai và nhắc bù trong 60 phút', async () => {
    await browser.alarms.create('task:ghost', { when: at(12, 0) });
    await browser.alarms.create('other', { when: at(12, 0) });
    await saveTask(task('future', { dueTime: '11:00' }));
    await saveTask(task('missed', { dueTime: '09:30' }));
    await saveTask(task('tooOld', { dueTime: '08:00' }));

    await rebuildAlarms(at(10, 0));

    expect(await alarmNames()).toEqual(['other', 'task:future']);
    expect(Object.keys(notifications())).toEqual(['task:missed']);
    expect(notifications()['task:missed']?.message).toBe('Đã quá giờ · 09:30');
  });
});

describe('completeFromNotification', () => {
  it('đánh dấu xong và đóng thông báo', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 1) });
    await saveTask(task('a'));
    await browser.notifications.create('task:a', {
      type: 'basic',
      title: 'x',
      message: 'y',
      iconUrl: 'z',
    });

    await completeFromNotification('a', at(10, 1));

    expect(await loadTask('a')).toMatchObject({ status: 'done', completedAt: at(10, 1) });
    expect(notifications()).toEqual({});
  });
});

describe('createQueue', () => {
  it('chạy tuần tự và không dừng khi một việc lỗi', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const queue = createQueue();
    const order: string[] = [];
    queue.push(async () => {
      await new Promise((r) => setTimeout(r, 5));
      order.push('1');
    });
    queue.push(async () => {
      throw new Error('boom');
    });
    queue.push(async () => {
      order.push('3');
    });
    await queue.idle();
    expect(order).toEqual(['1', '3']);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('registerReminderHandlers', () => {
  it('task đổi → alarm được đặt/huỷ theo', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(9, 0) });
    const queue = registerReminderHandlers();

    await saveTask(task('a'));
    await queue.idle();
    expect(await alarmNames()).toEqual(['task:a']);

    await removeTask('a');
    await queue.idle();
    expect(await alarmNames()).toEqual([]);
  });

  it('alarm kêu → nhắc đúng một lần kể cả khi kêu hai lần', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 0) });
    const queue = registerReminderHandlers();
    await saveTask(task('a'));
    await queue.idle();
    const create = vi.spyOn(browser.notifications, 'create');

    const alarm = { name: 'task:a', scheduledTime: at(10, 0), persistAcrossSessions: true };
    await fakeBrowser.alarms.onAlarm.trigger(alarm);
    await fakeBrowser.alarms.onAlarm.trigger(alarm);
    await queue.idle();

    expect(create).toHaveBeenCalledOnce();
  });

  it('khởi động → dựng lại alarm', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(9, 0) });
    await saveTask(task('a'));
    const queue = registerReminderHandlers();

    await fakeBrowser.runtime.onStartup.trigger();
    await queue.idle();

    expect(await alarmNames()).toEqual(['task:a']);
  });

  it('bấm "Đánh dấu xong" trên thông báo → task xong', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: at(10, 0) });
    const queue = registerReminderHandlers();
    await saveTask(task('a'));

    await fakeBrowser.notifications.onButtonClicked.trigger('task:a', 0);
    await queue.idle();

    expect((await loadTask('a'))?.status).toBe('done');
  });

  it('bấm vào thông báo → mở tab mới', async () => {
    const queue = registerReminderHandlers();
    const create = vi.spyOn(browser.tabs, 'create');

    await fakeBrowser.notifications.onClicked.trigger('task:a');
    await queue.idle();

    expect(create).toHaveBeenCalledWith({});
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run lib/reminder-service.test.ts`
Expected: FAIL với `Failed to resolve import "./reminder-service" from "lib/reminder-service.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`lib/reminder-service.ts`:

```ts
import { browser } from 'wxt/browser';
import {
  alarmTimeFor,
  reminderId,
  reminderMessage,
  shouldRemind,
  taskIdFromReminderId,
  type ReminderMessage,
} from './reminders';
import { dueKey, withStatus, type Task } from './task';
import { loadAllTasks, loadTask, saveTask, watchTasks } from './task-storage';

/** Đặt, dời hoặc huỷ alarm của một task theo trạng thái mới nhất của nó. */
export async function syncAlarm(id: string, task: Task | undefined, now = Date.now()) {
  const name = reminderId(id);
  const when = task ? alarmTimeFor(task, now) : undefined;
  if (when === undefined) await browser.alarms.clear(name);
  else await browser.alarms.create(name, { when });
  // Task đã xong hoặc bị xoá thì cất luôn thông báo đang hiện (nếu có).
  if (!task || task.status === 'done') await browser.notifications.clear(name);
}

/** Nhắc task nếu đủ điều kiện: thông báo hệ thống, ghi remindedFor, báo cho trang đang mở. */
export async function remindIfDue(id: string, now = Date.now()) {
  const task = await loadTask(id);
  if (!shouldRemind(task, now)) return;
  await browser.notifications.create(reminderId(id), {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icons/128.png'),
    title: task.title,
    message: reminderMessage(task, now),
    buttons: [{ title: 'Đánh dấu xong' }],
    requireInteraction: true,
    priority: 2,
  });
  await saveTask({ ...task, remindedFor: dueKey(task) });
  const message: ReminderMessage = { type: 'reminder', taskId: id };
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // Không có trang New Tab nào đang mở — bỏ qua.
  }
}

/** Khi Chrome khởi động / extension cài hoặc cập nhật: dựng lại toàn bộ alarm, rồi nhắc bù. */
export async function rebuildAlarms(now = Date.now()) {
  const alarms = await browser.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => taskIdFromReminderId(alarm.name) !== undefined)
      .map((alarm) => browser.alarms.clear(alarm.name)),
  );
  const tasks = Object.values(await loadAllTasks());
  for (const task of tasks) {
    const when = alarmTimeFor(task, now);
    if (when !== undefined) await browser.alarms.create(reminderId(task.id), { when });
  }
  for (const task of tasks) await remindIfDue(task.id, now);
}

export async function completeFromNotification(id: string, now = Date.now()) {
  const task = await loadTask(id);
  if (task?.status === 'todo') await saveTask(withStatus(task, 'done', now));
  await browser.notifications.clear(reminderId(id));
}

/** Hàng đợi tuần tự: mỗi việc chạy xong mới tới việc sau; lỗi của một việc không chặn việc khác. */
export function createQueue() {
  let tail: Promise<void> = Promise.resolve();
  return {
    push(job: () => Promise<void>) {
      tail = tail.then(job).catch((error) => console.error('[reminders]', error));
    },
    idle: () => tail,
  };
}

/** Gắn mọi listener của service worker. Phải gọi đồng bộ khi service worker khởi động. */
export function registerReminderHandlers() {
  const queue = createQueue();

  browser.runtime.onInstalled.addListener(() => queue.push(() => rebuildAlarms()));
  browser.runtime.onStartup.addListener(() => queue.push(() => rebuildAlarms()));

  browser.alarms.onAlarm.addListener((alarm) => {
    const id = taskIdFromReminderId(alarm.name);
    if (id) queue.push(() => remindIfDue(id));
  });

  watchTasks((changes) => {
    for (const { id, task } of changes) queue.push(() => syncAlarm(id, task));
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    if (!taskIdFromReminderId(notificationId)) return;
    queue.push(async () => {
      await browser.tabs.create({});
      await browser.notifications.clear(notificationId);
    });
  });

  browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    const id = taskIdFromReminderId(notificationId);
    if (id && buttonIndex === 0) queue.push(() => completeFromNotification(id));
  });

  return queue;
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run lib/reminder-service.test.ts`
Expected: `Tests  14 passed (14)`

- [ ] **Step 5: Nối vào service worker**

`entrypoints/background.ts` (thay toàn bộ file):

```ts
import { registerReminderHandlers } from '@/lib/reminder-service';

export default defineBackground(() => {
  registerReminderHandlers();
});
```

Run: `npm run compile && npm run build`
Expected: không có lỗi kiểu, build xong.

- [ ] **Step 6: Commit**

```bash
git add lib/reminder-service.ts lib/reminder-service.test.ts entrypoints/background.ts
git commit -m "feat(background): đặt alarm theo task, bắn thông báo, nhắc bù khi khởi động" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Zustand store (`store/useTaskStore.ts`)

**Files:**
- Create: `store/useTaskStore.ts`
- Test: `store/useTaskStore.test.ts`

**Interfaces:**
- Consumes:
  - Từ Task 2: `toDateKey`.
  - Từ Task 3: `applyTaskInput`, `createTask`, `withStatus`, các kiểu `Task`, `TaskInput`, `TaskStatus`.
  - Từ Task 4: `loadAllTasks`, `removeTask`, `saveTask`, `watchTasks`, `type TaskChange`.
- Produces:
  - `useTaskStore`, một hook Zustand với state:
    - `tasks: Record<string, Task>`
    - `hydrated: boolean`
    - `applyChanges(changes: TaskChange[]): void`
    - `addTask(input): Promise<Task | undefined>`
    - `updateTask(id, input): Promise<void>`
    - `setStatus(id, status): Promise<void>`
    - `toggleTask(id): Promise<void>`
    - `moveToToday(id): Promise<void>`
    - `deleteTask(id): Promise<Task | undefined>` (trả về task vừa xoá để hoàn tác)
    - `restoreTask(task): Promise<void>`
  - `SAVE_ERROR_MESSAGE = 'Không lưu được, thử lại'`
  - `initTaskStore(): () => void`: đọc storage lần đầu và nghe thay đổi. Trả về hàm huỷ, dùng làm cleanup của `useEffect`.

Ghi chú:
- **Không** dùng middleware `persist` của Zustand, vì nó thiết kế cho kiểu lưu một key duy nhất.
- Mỗi action cập nhật store ngay rồi mới ghi storage. Nếu ghi lỗi thì trả store về như cũ và gọi `toast.error(SAVE_ERROR_MESSAGE)`.

- [ ] **Step 1: Viết test (chưa có code)**

`store/useTaskStore.test.ts`:

```ts
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task, TaskInput } from '@/lib/task';
import { loadTask, saveTask } from '@/lib/task-storage';
import { initTaskStore, SAVE_ERROR_MESSAGE, useTaskStore } from './useTaskStore';

const NOW = new Date(2026, 9, 1, 9, 0).getTime();

const input = (over: Partial<TaskInput> = {}): TaskInput => ({
  title: 'Họp team',
  description: '',
  dueDate: '2026-10-01',
  dueTime: '10:00',
  ...over,
});

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Việc ${id}`,
  status: 'todo',
  dueDate: '2026-10-01',
  createdAt: 1,
  ...over,
});

const state = () => useTaskStore.getState();

/** Chờ các promise đang treo (vd. loadAllTasks trong initTaskStore) chạy xong. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  fakeBrowser.reset();
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  useTaskStore.setState({ tasks: {}, hydrated: false });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('initTaskStore', () => {
  it('nạp task từ storage rồi đánh dấu hydrated', async () => {
    await saveTask(task('a'));
    const stop = initTaskStore();
    expect(state().hydrated).toBe(false);
    await flush();
    expect(state()).toMatchObject({ hydrated: true, tasks: { a: task('a') } });
    stop();
  });

  it('nhận thay đổi từ nơi khác cho tới khi huỷ', async () => {
    const stop = initTaskStore();
    await flush();

    await saveTask(task('b'));
    expect(state().tasks.b).toEqual(task('b'));
    await browser.storage.local.remove('task:b');
    expect(state().tasks.b).toBeUndefined();

    stop();
    await saveTask(task('c'));
    expect(state().tasks.c).toBeUndefined();
  });
});

describe('actions', () => {
  it('addTask tạo task mới trong store và storage', async () => {
    const created = await state().addTask(input({ title: '  Họp  ' }));
    expect(created).toMatchObject({ title: 'Họp', status: 'todo', createdAt: NOW, dueTime: '10:00' });
    expect(state().tasks[created!.id]).toEqual(created);
    expect(await loadTask(created!.id)).toEqual(created);
  });

  it('updateTask ghi đè các trường từ form', async () => {
    const created = (await state().addTask(input()))!;
    await state().updateTask(created.id, input({ title: 'Mới', dueTime: '' }));
    const saved = await loadTask(created.id);
    expect(saved).toMatchObject({ title: 'Mới' });
    expect(saved?.dueTime).toBeUndefined();
  });

  it('toggleTask chuyển todo ↔ done', async () => {
    const created = (await state().addTask(input()))!;
    await state().toggleTask(created.id);
    expect(await loadTask(created.id)).toMatchObject({ status: 'done', completedAt: NOW });
    await state().toggleTask(created.id);
    expect((await loadTask(created.id))?.status).toBe('todo');
  });

  it('setStatus không làm gì nếu trạng thái đã đúng', async () => {
    const created = (await state().addTask(input()))!;
    const set = vi.spyOn(browser.storage.local, 'set');
    await state().setStatus(created.id, 'todo');
    expect(set).not.toHaveBeenCalled();
  });

  it('moveToToday đổi ngày sang hôm nay, giữ giờ', async () => {
    const created = (await state().addTask(input({ dueDate: '2026-09-29' })))!;
    await state().moveToToday(created.id);
    expect(await loadTask(created.id)).toMatchObject({ dueDate: '2026-10-01', dueTime: '10:00' });
  });

  it('deleteTask xoá và trả về task để hoàn tác bằng restoreTask', async () => {
    const created = (await state().addTask(input()))!;
    const removed = await state().deleteTask(created.id);
    expect(removed).toEqual(created);
    expect(state().tasks[created.id]).toBeUndefined();
    expect(await loadTask(created.id)).toBeUndefined();

    await state().restoreTask(removed!);
    expect(await loadTask(created.id)).toEqual(created);
  });

  it('ghi storage lỗi → trả store về như cũ và báo lỗi', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toastError = vi.spyOn(toast, 'error');
    const created = (await state().addTask(input()))!;
    vi.spyOn(browser.storage.local, 'set').mockRejectedValueOnce(new Error('quota'));

    await state().toggleTask(created.id);

    expect(state().tasks[created.id]?.status).toBe('todo');
    expect(toastError).toHaveBeenCalledWith(SAVE_ERROR_MESSAGE);
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run store/useTaskStore.test.ts`
Expected: FAIL với `Failed to resolve import "./useTaskStore" from "store/useTaskStore.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`store/useTaskStore.ts`:

```ts
import { toast } from 'sonner';
import { create } from 'zustand';
import { toDateKey } from '@/lib/date';
import {
  applyTaskInput,
  createTask,
  withStatus,
  type Task,
  type TaskInput,
  type TaskStatus,
} from '@/lib/task';
import {
  loadAllTasks,
  removeTask,
  saveTask,
  watchTasks,
  type TaskChange,
} from '@/lib/task-storage';

type TaskState = {
  tasks: Record<string, Task>;
  /** false cho tới khi đọc xong storage lần đầu */
  hydrated: boolean;
  applyChanges: (changes: TaskChange[]) => void;
  addTask: (input: TaskInput) => Promise<Task | undefined>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  setStatus: (id: string, status: TaskStatus) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  moveToToday: (id: string) => Promise<void>;
  /** Trả về task vừa xoá để có thể hoàn tác. */
  deleteTask: (id: string) => Promise<Task | undefined>;
  restoreTask: (task: Task) => Promise<void>;
};

export const SAVE_ERROR_MESSAGE = 'Không lưu được, thử lại';

export const useTaskStore = create<TaskState>()((set, get) => {
  /** Cập nhật store ngay, ghi storage sau; ghi lỗi thì trả lại như cũ. */
  async function commit(id: string, next: Task | undefined): Promise<boolean> {
    const previous = get().tasks[id];
    set((state) => ({ tasks: patch(state.tasks, id, next) }));
    try {
      if (next) await saveTask(next);
      else await removeTask(id);
      return true;
    } catch (error) {
      console.error('[task-store]', error);
      set((state) => ({ tasks: patch(state.tasks, id, previous) }));
      toast.error(SAVE_ERROR_MESSAGE);
      return false;
    }
  }

  return {
    tasks: {},
    hydrated: false,

    applyChanges(changes) {
      set((state) => {
        let tasks = state.tasks;
        for (const { id, task } of changes) tasks = patch(tasks, id, task);
        return { tasks };
      });
    },

    async addTask(input) {
      const task = createTask(input, crypto.randomUUID(), Date.now());
      return (await commit(task.id, task)) ? task : undefined;
    },

    async updateTask(id, input) {
      const task = get().tasks[id];
      if (task) await commit(id, applyTaskInput(task, input));
    },

    async setStatus(id, status) {
      const task = get().tasks[id];
      if (task && task.status !== status) await commit(id, withStatus(task, status, Date.now()));
    },

    async toggleTask(id) {
      const task = get().tasks[id];
      if (task) await get().setStatus(id, task.status === 'done' ? 'todo' : 'done');
    },

    async moveToToday(id) {
      const task = get().tasks[id];
      if (task) await commit(id, { ...task, dueDate: toDateKey(new Date()) });
    },

    async deleteTask(id) {
      const task = get().tasks[id];
      if (!task) return undefined;
      return (await commit(id, undefined)) ? task : undefined;
    },

    async restoreTask(task) {
      await commit(task.id, task);
    },
  };
});

function patch(tasks: Record<string, Task>, id: string, task: Task | undefined) {
  const next = { ...tasks };
  if (task) next[id] = task;
  else delete next[id];
  return next;
}

/**
 * Đọc dữ liệu lần đầu và nghe thay đổi từ tab khác/background.
 * Trả về hàm huỷ lắng nghe (gọi trong cleanup của useEffect).
 */
export function initTaskStore(): () => void {
  const stop = watchTasks((changes) => useTaskStore.getState().applyChanges(changes));
  loadAllTasks()
    .then((tasks) => useTaskStore.setState({ tasks, hydrated: true }))
    .catch((error) => {
      console.error('[task-store]', error);
      useTaskStore.setState({ hydrated: true });
      toast.error('Không đọc được dữ liệu');
    });
  return stop;
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run store/useTaskStore.test.ts`
Expected: `Tests  9 passed (9)`

- [ ] **Step 5: Commit**

```bash
git add store/useTaskStore.ts store/useTaskStore.test.ts
git commit -m "feat(store): useTaskStore cập nhật ngay, rollback khi lỗi, đồng bộ từ storage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Theme và đồng hồ (`lib/theme.ts`, `hooks/useTheme.ts`, `hooks/useNow.ts`)

**Files:**
- Create: `lib/theme.ts`, `hooks/useTheme.ts`, `hooks/useNow.ts`
- Test: `lib/theme.test.ts`, `hooks/useNow.test.ts`

**Interfaces:**
- Consumes (từ Task 2): `msUntilNextMinute`.
- Produces:
  - Kiểu: `type ThemePreference = 'light' | 'dark' | 'system'`, `type ResolvedTheme = 'light' | 'dark'`
  - Hằng số: `THEME_STORAGE_KEY = 'theme'`, `DARK_QUERY`
  - Hàm:
    - `isThemePreference(value)`
    - `readThemePreference(): ThemePreference`
    - `writeThemePreference(p)`
    - `resolveTheme(p, systemDark): ResolvedTheme`
    - `applyTheme(theme)`
  - `useTheme(): { preference: ThemePreference; resolved: ResolvedTheme; setPreference(p): void }`
  - `useNow(): Date`: cập nhật đúng lúc đổi phút và khi tab hiện lại. "Hôm nay" được suy ra từ giá trị này, nên tự đổi khi qua nửa đêm.

`lib/theme.ts` phải khớp logic với `public/theme-init.js` đã tạo ở Task 1: cùng key `'theme'`, cùng quy tắc giải theme.

- [ ] **Step 1: Viết test (chưa có code)**

`lib/theme.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

describe('theme', () => {
  it('mặc định theo hệ thống, đọc lại giá trị đã lưu', () => {
    expect(readThemePreference()).toBe('system');
    writeThemePreference('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readThemePreference()).toBe('dark');
  });

  it('bỏ qua giá trị lạ', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue');
    expect(readThemePreference()).toBe('system');
  });

  it('resolveTheme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('applyTheme bật/tắt class dark trên <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
```

`hooks/useNow.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

afterEach(() => {
  vi.useRealTimers();
});

describe('useNow', () => {
  it('cập nhật đúng lúc đổi phút', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 1, 9, 41, 50) });
    const { result } = renderHook(() => useNow());
    expect(result.current.getMinutes()).toBe(41);

    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(result.current.getMinutes()).toBe(41);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.getMinutes()).toBe(42);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.getMinutes()).toBe(43);
  });

  it('qua nửa đêm thì sang ngày mới', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 1, 23, 59, 30) });
    const { result } = renderHook(() => useNow());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getDate()).toBe(2);
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run lib/theme.test.ts hooks/useNow.test.ts`
Expected: FAIL với `Failed to resolve import "./theme"` và `Failed to resolve import "./useNow"`.

- [ ] **Step 3: Viết code**

`lib/theme.ts`:

```ts
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Trùng với key mà public/theme-init.js đọc trước khi trang vẽ. */
export const THEME_STORAGE_KEY = 'theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Không ghi được (chế độ riêng tư…) — theme vẫn đổi trong phiên này.
  }
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}
```

`hooks/useTheme.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  DARK_QUERY,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
  type ThemePreference,
} from '@/lib/theme';

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(next);
    setPreferenceState(next);
  }, []);

  return { preference, resolved, setPreference };
}
```

`hooks/useNow.ts`:

```ts
import { useEffect, useState } from 'react';
import { msUntilNextMinute } from '@/lib/date';

/**
 * Thời điểm hiện tại, cập nhật đúng lúc đổi phút và khi tab hiện lại.
 * Qua nửa đêm thì ngày suy ra từ giá trị này cũng tự đổi.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, msUntilNextMinute(current));
    };
    timer = setTimeout(tick, msUntilNextMinute(new Date()));

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return now;
}
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run lib/theme.test.ts hooks/useNow.test.ts && npm run compile`
Expected: `Tests  6 passed (6)`, không có lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add lib/theme.ts lib/theme.test.ts hooks/useTheme.ts hooks/useNow.ts hooks/useNow.test.ts
git commit -m "feat(theme): theme sáng/tối/hệ thống và đồng hồ theo phút" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Toast khi được nhắc (`hooks/useReminders.ts`)

**Files:**
- Create: `hooks/useReminders.ts`
- Test: `hooks/useReminders.test.ts`

**Interfaces:**
- Consumes:
  - Từ Task 5: `isReminderMessage`, `reminderHeadline`.
  - Từ Task 7: `useTaskStore` (gồm `tasks` và `setStatus`).
- Produces: `useReminders(): void`. Khi nhận tin `{ type: 'reminder', taskId }` và tab đang hiển thị, hook gọi `toast(title, { id: 'reminder:<id>', description: reminderHeadline(...), duration: 10_000, action: { label: 'Xong', … } })`.

Test mock cả module `sonner`, vì `toast` là một hàm nên `vi.spyOn` không bắt được lời gọi trực tiếp.

- [ ] **Step 1: Viết test (chưa có code)**

`hooks/useReminders.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';
import { useReminders } from './useReminders';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const task: Task = {
  id: 'a',
  title: 'Họp team',
  status: 'todo',
  dueDate: '2026-10-01',
  dueTime: '10:00',
  createdAt: 1,
};

const sendReminder = (taskId = 'a') =>
  fakeBrowser.runtime.onMessage.trigger({ type: 'reminder', taskId }, {}, () => {});

beforeEach(() => {
  fakeBrowser.reset();
  vi.mocked(toast).mockClear();
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 1, 10, 0) });
  useTaskStore.setState({ tasks: { a: task }, hydrated: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useReminders', () => {
  it('hiện Toast khi nhận tin nhắc việc; nút "Xong" đánh dấu xong', async () => {
    renderHook(() => useReminders());
    await sendReminder();

    expect(toast).toHaveBeenCalledWith(
      'Họp team',
      expect.objectContaining({ description: 'Đến giờ · 10:00' }),
    );

    const options = vi.mocked(toast).mock.calls[0]![1] as {
      action: { label: string; onClick: () => void };
    };
    expect(options.action.label).toBe('Xong');
    options.action.onClick();
    await vi.waitFor(() => expect(useTaskStore.getState().tasks.a?.status).toBe('done'));
  });

  it('bỏ qua tin lạ, task không có, hoặc tab đang ẩn', async () => {
    renderHook(() => useReminders());
    await fakeBrowser.runtime.onMessage.trigger({ type: 'other' }, {}, () => {});
    await sendReminder('missing');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await sendReminder();
    expect(toast).not.toHaveBeenCalled();
  });

  it('gỡ listener khi unmount', async () => {
    const { unmount } = renderHook(() => useReminders());
    unmount();
    await expect(sendReminder()).resolves.toEqual([]);
    expect(toast).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run hooks/useReminders.test.ts`
Expected: FAIL với `Failed to resolve import "./useReminders" from "hooks/useReminders.test.ts". Does the file exist?`

- [ ] **Step 3: Viết code**

`hooks/useReminders.ts`:

```ts
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
      if (!task) return;
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
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run hooks/useReminders.test.ts`
Expected: `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git add hooks/useReminders.ts hooks/useReminders.test.ts
git commit -m "feat(reminders): Toast trong tab khi background vừa nhắc việc" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Các thẻ hiển thị (Header, DayNav, ProgressCard, NextUpCard)

**Files:**
- Create: `components/Header.tsx`, `components/DayNav.tsx`, `components/ProgressCard.tsx`, `components/NextUpCard.tsx`
- Test: `components/widgets.test.tsx`

**Interfaces:**
- Consumes:
  - Từ Task 2: `formatClock`, `formatLongDate`, `greeting`, `addDays`, `relativeDayLabel`, `formatCountdown`, `type DateKey`.
  - Từ Task 3: `dueAt`, các kiểu `Task`, `Progress`.
  - Từ Task 8: `type ThemePreference`.
  - Từ Task 1: shadcn `Button`.
- Produces:
  - `Header({ now: Date; theme: ThemePreference; onThemeChange(theme): void })`: 3 nút theme có `aria-label` là `Sáng`, `Tối`, `Theo hệ thống`, kèm `aria-pressed`.
  - `DayNav({ day: DateKey; today: DateKey; onChange(day): void })`: nút `Ngày trước` và `Ngày sau`, nút giữa là nhãn ngày và bị disabled khi đang xem hôm nay.
  - `ProgressCard({ progress: Progress; className?: string })`
  - `NextUpCard({ task: Task | undefined; now: Date; className?: string })`

- [ ] **Step 1: Viết test (chưa có code)**

`components/widgets.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@/lib/task';
import { DayNav } from './DayNav';
import { Header } from './Header';
import { NextUpCard } from './NextUpCard';
import { ProgressCard } from './ProgressCard';

describe('Header', () => {
  it('hiện lời chào, ngày, giờ và đổi theme', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<Header now={new Date(2026, 9, 1, 9, 5)} theme="system" onThemeChange={onThemeChange} />);

    expect(screen.getByText('Chào buổi sáng 👋')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thứ Năm, 1 tháng 10' })).toBeInTheDocument();
    expect(screen.getByText('09:05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theo hệ thống' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Tối' }));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });
});

describe('DayNav', () => {
  it('chuyển ngày trước/sau và về hôm nay', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<DayNav day="2026-10-01" today="2026-10-01" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Hôm nay' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ngày sau' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-02');
    await user.click(screen.getByRole('button', { name: 'Ngày trước' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-09-30');

    rerender(<DayNav day="2026-10-02" today="2026-10-01" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Ngày mai' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-01');
  });
});

describe('ProgressCard', () => {
  it.each([
    [{ done: 0, total: 0, percent: 0 }, 'Chưa có việc'],
    [{ done: 2, total: 5, percent: 40 }, 'Còn 3 việc'],
    [{ done: 3, total: 3, percent: 100 }, 'Xong hết rồi! 🎉'],
  ])('%o → %s', (progress, message) => {
    render(<ProgressCard progress={progress} />);
    expect(screen.getByText(`${progress.percent}%`)).toBeInTheDocument();
    expect(screen.getByText(`${progress.done}/${progress.total}`)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

describe('NextUpCard', () => {
  const now = new Date(2026, 9, 1, 9, 41);
  const task: Task = {
    id: 'a',
    title: 'Họp team',
    status: 'todo',
    dueDate: '2026-10-01',
    dueTime: '10:00',
    createdAt: 1,
  };

  it('hiện việc kế tiếp kèm đếm ngược', () => {
    render(<NextUpCard task={task} now={now} />);
    expect(screen.getByText('Họp team')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText(/còn 19 phút/)).toBeInTheDocument();
  });

  it('không có việc có giờ', () => {
    render(<NextUpCard task={undefined} now={now} />);
    expect(screen.getByText('Không còn việc có hẹn giờ hôm nay')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run components/widgets.test.tsx`
Expected: FAIL với `Failed to resolve import "./DayNav" from "components/widgets.test.tsx". Does the file exist?`

- [ ] **Step 3: Viết code**

`components/Header.tsx`:

```tsx
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
```

`components/DayNav.tsx`:

```tsx
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
```

`components/ProgressCard.tsx`:

```tsx
import { motion } from 'motion/react';
import { cn } from 'cn';
import type { Progress } from '@/lib/task';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressCardProps = { progress: Progress; className?: string };

export function ProgressCard({ progress, className }: ProgressCardProps) {
  const { done, total, percent } = progress;
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
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
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
```

`components/NextUpCard.tsx`:

```tsx
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
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run components/widgets.test.tsx && npm run compile`
Expected: `Tests  7 passed (7)`, không có lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/DayNav.tsx components/ProgressCard.tsx components/NextUpCard.tsx components/widgets.test.tsx
git commit -m "feat(ui): header, chuyển ngày, thẻ tiến độ và việc tiếp theo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Danh sách việc (QuickAdd, TaskList, TaskItem)

**Files:**
- Create: `components/undoDeleteToast.ts`, `components/TaskItem.tsx`, `components/TaskList.tsx`, `components/QuickAdd.tsx`
- Test: `components/QuickAdd.test.tsx`, `components/TaskList.test.tsx`

**Interfaces:**
- Consumes:
  - Từ Task 2: `formatShortDate`, `relativeDayLabel`, `type DateKey`.
  - Từ Task 3: `isPastDue`, `validateTaskInput`, `overdueTasks`, `todoForDay`, `doneForDay`, `type Task`.
  - Từ Task 7: `useTaskStore` (gồm `addTask`, `toggleTask`, `moveToToday`, `deleteTask`, `restoreTask`, `tasks`, `hydrated`).
  - Từ Task 1: shadcn `Button`, `Checkbox`, `Input`.
- Produces:
  - `showUndoDeleteToast(task: Task): void`
  - `TaskItem({ task; now: number; overdue?: boolean; onEdit(task) })`
  - `TaskList({ day; today; now: Date; onEdit(task) })`
  - `QuickAdd({ day; today; onOpenDetails(title: string) })`

Các `aria-label` mà test dựa vào:
- `Tên việc mới`, `Thêm chi tiết`
- `Đánh dấu xong: <tiêu đề>` / `Bỏ đánh dấu xong: <tiêu đề>`
- `Dời sang hôm nay: <tiêu đề>`
- `Xoá: <tiêu đề>`

Nút xoá dùng variant `pointer-fine:` (có từ Tailwind 4.1) để ẩn đi và chỉ hiện khi rê chuột, nhưng vẫn luôn hiện trên màn cảm ứng. Các item dùng `layoutId` trong `LayoutGroup`, nên khi tick xong, task trượt từ "Cần làm" xuống "Đã xong".

- [ ] **Step 1: Viết test (chưa có code)**

`components/QuickAdd.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useTaskStore } from '@/store/useTaskStore';
import { QuickAdd } from './QuickAdd';

const tasks = () => Object.values(useTaskStore.getState().tasks);

beforeEach(() => {
  fakeBrowser.reset();
  useTaskStore.setState({ tasks: {}, hydrated: true });
});

describe('QuickAdd', () => {
  it('Enter → thêm task không giờ cho ngày đang xem rồi xoá ô nhập', async () => {
    const user = userEvent.setup();
    render(<QuickAdd day="2026-10-02" today="2026-10-01" onOpenDetails={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Tên việc mới' });
    expect(field).toHaveAttribute('placeholder', 'Thêm việc cho ngày mai…');

    await user.type(field, 'Mua quà sinh nhật{Enter}');

    expect(tasks()).toEqual([
      expect.objectContaining({ title: 'Mua quà sinh nhật', dueDate: '2026-10-02', status: 'todo' }),
    ]);
    expect(tasks()[0]?.dueTime).toBeUndefined();
    expect(field).toHaveValue('');
  });

  it('bỏ qua khi rỗng, báo lỗi khi quá dài', async () => {
    const user = userEvent.setup();
    render(<QuickAdd day="2026-10-01" today="2026-10-01" onOpenDetails={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Tên việc mới' });

    await user.type(field, '   {Enter}');
    expect(tasks()).toEqual([]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.clear(field);
    await user.click(field);
    await user.paste('a'.repeat(121));
    await user.keyboard('{Enter}');
    expect(tasks()).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent('Tối đa 120 ký tự');
  });

  it('nút chi tiết mở hộp thoại với tiêu đề đang gõ', async () => {
    const user = userEvent.setup();
    const onOpenDetails = vi.fn();
    render(<QuickAdd day="2026-10-01" today="2026-10-01" onOpenDetails={onOpenDetails} />);

    await user.type(screen.getByRole('textbox', { name: 'Tên việc mới' }), ' Họp team ');
    await user.click(screen.getByRole('button', { name: 'Thêm chi tiết' }));

    expect(onOpenDetails).toHaveBeenCalledWith('Họp team');
    expect(screen.getByRole('textbox', { name: 'Tên việc mới' })).toHaveValue('');
  });
});
```

`components/TaskList.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskList } from './TaskList';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const TODAY = '2026-10-01';
const NOW = new Date(2026, 9, 1, 9, 41);

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Việc ${id}`,
  status: 'todo',
  dueDate: TODAY,
  createdAt: 1,
  ...over,
});

function setTasks(...list: Task[]) {
  useTaskStore.setState({ tasks: Object.fromEntries(list.map((t) => [t.id, t])), hydrated: true });
}

const renderList = (day = TODAY) =>
  render(<TaskList day={day} today={TODAY} now={NOW} onEdit={vi.fn()} />);

beforeEach(() => {
  fakeBrowser.reset();
  vi.mocked(toast).mockClear();
});

describe('TaskList', () => {
  it('chưa đọc xong dữ liệu → không hiện trạng thái rỗng', () => {
    useTaskStore.setState({ tasks: {}, hydrated: false });
    renderList();
    expect(screen.queryByText('Chưa có việc nào cho ngày này')).not.toBeInTheDocument();
  });

  it('ngày không có task → trạng thái rỗng', () => {
    setTasks();
    renderList();
    expect(screen.getByText('Chưa có việc nào cho ngày này')).toBeInTheDocument();
  });

  it('chia nhóm Quá hạn / Cần làm / Đã xong', () => {
    setTasks(
      task('old', { dueDate: '2026-09-30', title: 'Gửi báo cáo' }),
      task('meet', { title: 'Họp team', dueTime: '10:00' }),
      task('done', { title: 'Tập thể dục', status: 'done', completedAt: 5 }),
    );
    renderList();

    const overdue = screen.getByRole('heading', { name: /Quá hạn \(1\)/ }).closest('section')!;
    expect(within(overdue).getByText('Gửi báo cáo')).toBeInTheDocument();
    expect(within(overdue).getByText('30/9')).toBeInTheDocument();

    const todo = screen.getByRole('heading', { name: 'Cần làm' }).closest('section')!;
    expect(within(todo).getByText('Họp team')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Đã xong \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText('Tập thể dục')).toBeInTheDocument();
  });

  it('xem ngày khác thì không hiện Quá hạn', () => {
    setTasks(task('old', { dueDate: '2026-09-30' }), task('next', { dueDate: '2026-10-02' }));
    renderList('2026-10-02');
    expect(screen.queryByRole('heading', { name: /Quá hạn/ })).not.toBeInTheDocument();
    expect(screen.getByText('Việc next')).toBeInTheDocument();
  });

  it('tick checkbox → task xong; thu gọn nhóm Đã xong', async () => {
    const user = userEvent.setup();
    setTasks(task('a', { title: 'Họp team' }));
    renderList();

    await user.click(screen.getByRole('checkbox', { name: 'Đánh dấu xong: Họp team' }));
    expect(useTaskStore.getState().tasks.a?.status).toBe('done');

    const toggle = await screen.findByRole('button', { name: /Đã xong \(1\)/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('dời task quá hạn sang hôm nay', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    const user = userEvent.setup();
    setTasks(task('old', { dueDate: '2026-09-30', title: 'Gửi báo cáo' }));
    renderList();

    await user.click(screen.getByRole('button', { name: 'Dời sang hôm nay: Gửi báo cáo' }));
    expect(useTaskStore.getState().tasks.old?.dueDate).toBe(TODAY);
    vi.useRealTimers();
  });

  it('xoá task → Toast có nút Hoàn tác khôi phục lại', async () => {
    const user = userEvent.setup();
    const original = task('a', { title: 'Họp team' });
    setTasks(original);
    renderList();

    await user.click(screen.getByRole('button', { name: 'Xoá: Họp team' }));
    expect(useTaskStore.getState().tasks.a).toBeUndefined();

    const options = vi.mocked(toast).mock.calls[0]![1] as {
      action: { label: string; onClick: () => void };
    };
    expect(options.action.label).toBe('Hoàn tác');
    options.action.onClick();
    await vi.waitFor(() => expect(useTaskStore.getState().tasks.a).toEqual(original));
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run components/QuickAdd.test.tsx components/TaskList.test.tsx`
Expected: FAIL với `Failed to resolve import "./QuickAdd"` và `Failed to resolve import "./TaskList"`.

- [ ] **Step 3: Viết code**

`components/undoDeleteToast.ts`:

```ts
import { toast } from 'sonner';
import type { Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';

/** Toast "Đã xoá · Hoàn tác" hiện 5 giây sau khi xoá một task. */
export function showUndoDeleteToast(task: Task): void {
  toast('Đã xoá công việc', {
    description: task.title,
    duration: 5_000,
    action: {
      label: 'Hoàn tác',
      onClick: () => void useTaskStore.getState().restoreTask(task),
    },
  });
}
```

`components/TaskItem.tsx`:

```tsx
import { CalendarArrowUp, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatShortDate } from '@/lib/date';
import { isPastDue, type Task } from '@/lib/task';
import { showUndoDeleteToast } from '@/components/undoDeleteToast';
import { useTaskStore } from '@/store/useTaskStore';

type TaskItemProps = {
  task: Task;
  /** epoch ms, để tô đỏ giờ đã qua */
  now: number;
  /** Nằm trong nhóm Quá hạn: hiện ngày gốc và nút dời sang hôm nay. */
  overdue?: boolean;
  onEdit: (task: Task) => void;
};

export function TaskItem({ task, now, overdue = false, onEdit }: TaskItemProps) {
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const moveToToday = useTaskStore((state) => state.moveToToday);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const done = task.status === 'done';

  async function handleDelete() {
    const removed = await deleteTask(task.id);
    if (removed) showUndoDeleteToast(removed);
  }

  return (
    <motion.li
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-foreground/5 sm:px-3"
    >
      <motion.span
        className="flex"
        whileTap={{ scale: 0.85 }}
        animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Checkbox
          checked={done}
          onCheckedChange={() => void toggleTask(task.id)}
          aria-label={done ? `Bỏ đánh dấu xong: ${task.title}` : `Đánh dấu xong: ${task.title}`}
          className="size-5 rounded-full"
        />
      </motion.span>

      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 text-left outline-none focus-visible:underline"
      >
        <span className="relative block w-fit max-w-full">
          <span className={cn('block truncate transition-colors', done && 'text-muted-foreground')}>
            {task.title}
          </span>
          <motion.span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px origin-left bg-muted-foreground"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: done ? 1 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </span>
        {task.description && (
          <span className="block truncate text-xs text-muted-foreground">{task.description}</span>
        )}
      </button>

      {overdue && (
        <span className="shrink-0 text-xs text-destructive">{formatShortDate(task.dueDate)}</span>
      )}
      {task.dueTime && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums',
            done
              ? 'text-muted-foreground'
              : isPastDue(task, now)
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary',
          )}
        >
          {task.dueTime}
        </span>
      )}
      {overdue && (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Dời sang hôm nay: ${task.title}`}
          onClick={() => void moveToToday(task.id)}
          className="shrink-0"
        >
          <CalendarArrowUp />
          <span className="hidden sm:inline">Dời sang hôm nay</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Xoá: ${task.title}`}
        onClick={() => void handleDelete()}
        className="shrink-0 text-muted-foreground hover:text-destructive pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
      >
        <Trash2 />
      </Button>
    </motion.li>
  );
}
```

`components/TaskList.tsx`:

```tsx
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ListTodo, TriangleAlert } from 'lucide-react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { cn } from 'cn';
import { TaskItem } from '@/components/TaskItem';
import type { DateKey } from '@/lib/date';
import { doneForDay, overdueTasks, todoForDay, type Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';

type TaskListProps = {
  day: DateKey;
  today: DateKey;
  now: Date;
  onEdit: (task: Task) => void;
};

export function TaskList({ day, today, now, onEdit }: TaskListProps) {
  const tasksById = useTaskStore((state) => state.tasks);
  const hydrated = useTaskStore((state) => state.hydrated);
  const [showDone, setShowDone] = useState(true);

  const tasks = useMemo(() => Object.values(tasksById), [tasksById]);
  const overdue = useMemo(
    () => (day === today ? overdueTasks(tasks, today) : []),
    [tasks, day, today],
  );
  const todo = useMemo(() => todoForDay(tasks, day), [tasks, day]);
  const done = useMemo(() => doneForDay(tasks, day), [tasks, day]);
  const nowMs = now.getTime();

  if (!hydrated) return <TaskListSkeleton />;
  if (overdue.length + todo.length + done.length === 0) return <EmptyState />;

  return (
    <LayoutGroup>
      <div className="space-y-5">
        {overdue.length > 0 && (
          <TaskGroup
            title={
              <span className="flex items-center gap-1.5 text-destructive">
                <TriangleAlert className="size-3.5" /> Quá hạn ({overdue.length})
              </span>
            }
          >
            {overdue.map((task) => (
              <TaskItem key={task.id} task={task} now={nowMs} overdue onEdit={onEdit} />
            ))}
          </TaskGroup>
        )}

        {todo.length > 0 && (
          <TaskGroup title="Cần làm">
            {todo.map((task) => (
              <TaskItem key={task.id} task={task} now={nowMs} onEdit={onEdit} />
            ))}
          </TaskGroup>
        )}

        {done.length > 0 && (
          <TaskGroup
            title={
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((value) => !value)}
                className="flex items-center gap-1 tracking-wide uppercase hover:text-foreground"
              >
                <ChevronDown className={cn('size-3.5 transition-transform', !showDone && '-rotate-90')} />
                Đã xong ({done.length})
              </button>
            }
          >
            {showDone &&
              done.map((task) => <TaskItem key={task.id} task={task} now={nowMs} onEdit={onEdit} />)}
          </TaskGroup>
        )}
      </div>
    </LayoutGroup>
  );
}

function TaskGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-3">
        {title}
      </h2>
      <ul className="space-y-0.5">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </ul>
    </section>
  );
}

function TaskListSkeleton() {
  return (
    <div aria-hidden className="space-y-3 px-2 py-1">
      {[70, 55, 62].map((width) => (
        <div key={width} className="flex items-center gap-3">
          <div className="size-5 animate-pulse rounded-full bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
      <ListTodo className="size-10 text-primary/60" />
      <p className="font-medium text-foreground">Chưa có việc nào cho ngày này</p>
      <p className="text-sm">Gõ vào ô phía trên rồi nhấn Enter để thêm.</p>
    </div>
  );
}
```

`components/QuickAdd.tsx`:

```tsx
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
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run components/QuickAdd.test.tsx components/TaskList.test.tsx && npm run compile`
Expected: `Tests  10 passed (10)`, không có lỗi kiểu, và **không** có dòng `Unhandled Errors`. Nếu có lỗi `AbortError: The animation was canceled`, hãy kiểm tra lại `vitest.setup.ts` đã đặt `MotionGlobalConfig.skipAnimations = true` chưa.

- [ ] **Step 5: Commit**

```bash
git add components/undoDeleteToast.ts components/TaskItem.tsx components/TaskList.tsx components/QuickAdd.tsx components/QuickAdd.test.tsx components/TaskList.test.tsx
git commit -m "feat(ui): danh sách việc theo nhóm, thêm nhanh, tick, dời ngày, xoá có hoàn tác" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Hộp thoại thêm/sửa (`components/TaskDialog.tsx`)

**Files:**
- Create: `components/TaskDialog.tsx`
- Test: `components/TaskDialog.test.tsx`

**Interfaces:**
- Consumes:
  - Từ Task 2: `isValidDateKey`, `isValidTime`, `toTimestamp`.
  - Từ Task 3: `hasErrors`, `taskToInput`, `validateTaskInput`, các kiểu `Task`, `TaskErrors`, `TaskInput`.
  - Từ Task 7: `useTaskStore` (gồm `addTask`, `updateTask`, `deleteTask`).
  - Từ Task 11: `showUndoDeleteToast`.
  - Từ Task 1: shadcn `Dialog*`, `Button`, `Input`, `Label`, `Textarea`.
- Produces:
  - `type TaskDialogState = { mode: 'create'; defaults: TaskInput } | { mode: 'edit'; task: Task } | null`
  - `TaskDialog({ state: TaskDialogState; onClose(): void })`

Các nhãn trường: `Tiêu đề`, `Mô tả`, `Ngày`, `Giờ nhắc`.
- Nếu giờ đã qua thì hiện `Giờ này đã qua, sẽ không nhắc.`, nhưng vẫn cho lưu.
- Các nút: `Huỷ`, `Lưu`; chế độ sửa có thêm nút `Xoá`.
- Hiệu ứng kính mờ viết thẳng bằng class Tailwind trên `DialogContent` (`bg-popover/75 backdrop-blur-2xl`), để `cn` (tailwind-merge) gộp đúng với class nền mặc định.

- [ ] **Step 1: Viết test (chưa có code)**

`components/TaskDialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task, TaskInput } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskDialog } from './TaskDialog';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const defaults: TaskInput = { title: '', description: '', dueDate: '2099-10-01', dueTime: '' };

const existing: Task = {
  id: 'a',
  title: 'Họp team',
  description: 'Phòng 3',
  status: 'todo',
  dueDate: '2099-10-01',
  dueTime: '10:00',
  createdAt: 1,
};

const tasks = () => Object.values(useTaskStore.getState().tasks);

beforeEach(() => {
  fakeBrowser.reset();
  vi.mocked(toast).mockClear();
  useTaskStore.setState({ tasks: {}, hydrated: true });
});

describe('TaskDialog', () => {
  it('không mở khi state = null', () => {
    render(<TaskDialog state={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('báo lỗi khi thiếu tiêu đề và không lưu', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: 'create', defaults }} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nhập tên công việc');
    expect(tasks()).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('tạo task với đủ trường rồi đóng', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: 'create', defaults: { ...defaults, title: 'Gửi báo cáo' } }} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Thêm công việc' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Gửi báo cáo');
    await user.type(screen.getByLabelText('Mô tả'), 'Gửi cho sếp');
    await user.type(screen.getByLabelText('Giờ nhắc'), '09:30');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(tasks()).toEqual([
      expect.objectContaining({
        title: 'Gửi báo cáo',
        description: 'Gửi cho sếp',
        dueDate: '2099-10-01',
        dueTime: '09:30',
      }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('cảnh báo khi giờ đã qua nhưng vẫn cho lưu', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TaskDialog
        state={{ mode: 'create', defaults: { ...defaults, title: 'Cũ', dueDate: '2020-01-01', dueTime: '08:00' } }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Giờ này đã qua, sẽ không nhắc.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(tasks()).toHaveLength(1);
  });

  it('sửa task: điền sẵn giá trị, lưu thay đổi', async () => {
    useTaskStore.setState({ tasks: { a: existing } });
    const user = userEvent.setup();
    render(<TaskDialog state={{ mode: 'edit', task: existing }} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Sửa công việc' })).toBeInTheDocument();
    const title = screen.getByLabelText('Tiêu đề');
    expect(title).toHaveValue('Họp team');
    await user.clear(title);
    await user.type(title, 'Họp khách hàng');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(useTaskStore.getState().tasks.a).toMatchObject({ title: 'Họp khách hàng', dueTime: '10:00' });
  });

  it('xoá task trong chế độ sửa → hiện Toast hoàn tác', async () => {
    useTaskStore.setState({ tasks: { a: existing } });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: 'edit', task: existing }} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Xoá' }));

    expect(useTaskStore.getState().tasks.a).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      'Đã xoá công việc',
      expect.objectContaining({ description: 'Họp team' }),
    );
  });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npx vitest run components/TaskDialog.test.tsx`
Expected: FAIL với `Failed to resolve import "./TaskDialog" from "components/TaskDialog.test.tsx". Does the file exist?`

- [ ] **Step 3: Viết code**

`components/TaskDialog.tsx`:

```tsx
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
          <p className="text-sm text-amber-600 dark:text-amber-400">Giờ này đã qua, sẽ không nhắc.</p>
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
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npx vitest run components/TaskDialog.test.tsx && npm run compile`
Expected: `Tests  6 passed (6)`, không có lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add components/TaskDialog.tsx components/TaskDialog.test.tsx
git commit -m "feat(ui): hộp thoại thêm/sửa task kính mờ, kiểm tra dữ liệu, cảnh báo giờ đã qua" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Ghép trang, README, kiểm tra toàn bộ

**Files:**
- Modify: `entrypoints/newtab/App.tsx` (thay toàn bộ bản tạm của Task 1)
- Create: `README.md`

**Interfaces:**
- Consumes: mọi thứ ở trên, gồm `useNow`, `useTheme`, `useReminders`, `initTaskStore`, `useTaskStore`, `nextUpTask`, `progressForDay`, `toDateKey`, và các component.
- Produces: trang Tab mới hoàn chỉnh.

Bố cục trang:
- Lưới dùng `grid-cols-1` ở màn hẹp để không tràn ngang.
- Từ `lg` trở lên là `lg:grid-cols-3 lg:grid-rows-[auto_1fr]`: danh sách chiếm 2 cột × 2 hàng, cột phải xếp thẻ Tiến độ rồi thẻ Tiếp theo.
- `selectedDay = null` nghĩa là luôn theo "hôm nay", kể cả khi qua nửa đêm.

- [ ] **Step 1: Ghép `App.tsx`**

`entrypoints/newtab/App.tsx` (thay toàn bộ file):

```tsx
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
```

- [ ] **Step 2: Viết README**

`README.md`:

````markdown
# Việc hôm nay

Extension Chrome thay trang **Tab mới** bằng danh sách việc của hôm nay, kèm nhắc đúng giờ bằng thông báo hệ thống.

## Cài đặt (dùng cá nhân)

```bash
npm install
npm run build
```

1. Mở `chrome://extensions`, bật **Developer mode** (góc phải trên).
2. Bấm **Load unpacked** → chọn thư mục `.output/chrome-mv3`.
3. Mở một tab mới. Chrome hỏi có giữ thay đổi trang Tab mới không → chọn **Keep it**.

Cập nhật bản mới: `npm run build` rồi bấm nút reload (↻) của extension trong `chrome://extensions`.

## Phát triển

| Lệnh | Việc |
|---|---|
| `npm run dev` | Mở một Chrome riêng đã cài extension, sửa code là tự nạp lại |
| `npm test` | Chạy toàn bộ test (Vitest) |
| `npm run compile` | Kiểm tra kiểu TypeScript |
| `npm run build` | Build ra `.output/chrome-mv3` |

## Nhắc việc không hiện?

- Chrome phải đang chạy. Mặc định Chrome trên Windows vẫn chạy nền sau khi đóng cửa sổ
  (Settings → System → "Continue running background apps when Google Chrome is closed").
- Windows: Settings → System → Notifications → bật cho **Google Chrome**, và tắt
  **Do not disturb / Focus** nếu đang bật.
- Chỉ task **có giờ nhắc** mới được nhắc. Chrome tắt hoặc máy ngủ lúc đến giờ thì khi mở lại
  trong vòng 60 phút vẫn được nhắc bù ("Đã quá giờ").

## Checklist kiểm thử thủ công

- [ ] Thêm nhanh (gõ + Enter), thêm đầy đủ qua nút ⚙, sửa, xoá + Hoàn tác, tick và bỏ tick.
- [ ] Chuyển ngày ‹ ›, thêm việc cho ngày mai, bấm nhãn ngày để về hôm nay.
- [ ] Task chưa xong của hôm qua hiện ở **Quá hạn**; nút "Dời sang hôm nay" hoạt động.
- [ ] Mở 2 tab mới: sửa ở tab này, tab kia cập nhật theo.
- [ ] Tạo task hẹn 1–2 phút sau: có thông báo hệ thống + Toast trong tab; nút
      "Đánh dấu xong" trên thông báo hoạt động; bấm thông báo mở tab mới.
- [ ] Đổi giờ task trước khi đến giờ: chỉ nhắc theo giờ mới.
- [ ] Tắt Chrome qua giờ hẹn rồi mở lại trong 60 phút: có thông báo "Đã quá giờ".
- [ ] Sáng / Tối / Theo hệ thống; mở tab mới ở chế độ tối không bị nháy trắng.
- [ ] Thu hẹp cửa sổ: bố cục chuyển một cột, không tràn ngang.
````

- [ ] **Step 3: Kiểm tra tự động toàn bộ**

1. Run: `npm test`
   Expected: `Test Files  13 passed (13)` và `Tests  94 passed (94)`, không có `Unhandled Errors`.
2. Run: `npm run compile`
   Expected: không in lỗi nào.
3. Run: `npm run build`
   Expected: build xong ra `.output/chrome-mv3/`.

- [ ] **Step 4: Commit**

```bash
git add entrypoints/newtab/App.tsx README.md
git commit -m "feat(newtab): ghép bố cục bento, theme, nhắc việc; thêm README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Kiểm tra thủ công cùng người dùng**

Bước này cần người dùng làm.
1. Cài extension theo mục "Cài đặt" trong README.
2. Chạy hết "Checklist kiểm thử thủ công" trong README.
3. Ghi lại mục nào không đạt để sửa ở vòng sau.
