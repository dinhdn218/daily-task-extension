# Thiết kế: Extension Chrome "Việc hôm nay" (Daily Task Tracker)

- Ngày: 2026-10-01
- Trạng thái: đã duyệt; kế hoạch triển khai: `docs/superpowers/plans/2026-10-01-daily-task-extension.md`
- Repo: `d:\projects\daily-task-extension` (repo riêng, commit thẳng `master`)

## 1. Mục tiêu

Một extension Chrome thay trang **New Tab**: mỗi lần mở tab mới, người dùng thấy ngay danh sách việc của hôm nay, thêm/sửa/xoá/tick xong nhanh, và được **nhắc đúng giờ** bằng thông báo hệ thống kể cả khi không mở tab.

Dùng cá nhân: cài bằng "Load unpacked", chưa đăng Chrome Web Store.

## 2. Các quyết định đã chốt

| Chủ đề | Quyết định | Lý do |
|---|---|---|
| Framework build | **WXT** (trên Vite) + React + TypeScript | Next.js không hợp extension (static export sinh inline script, bị CSP của MV3 chặn). WXT tự sinh manifest, dev mode tự nạp lại extension — cần cho việc test alarms/notifications. |
| Nhắc việc | `chrome.alarms` + `chrome.notifications` ở service worker, **kèm** Toast nếu trang New Tab đang mở | Toast trong trang chỉ chạy khi tab mở → dễ lỡ nhắc. |
| Task chưa xong ngày trước | Mục **"Quá hạn"** trên danh sách hôm nay, giữ ngày gốc, có nút "Dời sang hôm nay" | Không mất việc, không tự ý đổi dữ liệu. |
| Ô tìm kiếm / lối tắt | **Không có** | Thanh địa chỉ vẫn tìm kiếm và vẫn giữ focus khi mở tab mới; trang tập trung vào task. |
| Lưu trữ | `chrome.storage.local` (chỉ máy này) | Đơn giản, 10MB, không lo lệch dữ liệu giữa máy. |
| Cài đặt | Load unpacked từ thư mục build | Dùng cá nhân trước. |
| Ngôn ngữ giao diện | Tiếng Việt, định dạng ngày giờ `vi-VN` | Người dùng là người Việt. |
| Tên hiển thị | "Việc hôm nay" | Có thể đổi trong `wxt.config.ts`. |

## 3. Kiến trúc

Hai ngữ cảnh chạy tách biệt, dùng chung dữ liệu qua `chrome.storage.local`:

- **Trang New Tab** (React, `entrypoints/newtab/`): hiển thị và chỉnh sửa task. Có thể có nhiều bản cùng mở (mỗi tab mới một bản).
- **Service worker** (`entrypoints/background.ts`): không có UI. Lắng nghe thay đổi storage để đặt/huỷ `chrome.alarms`; khi alarm kêu thì bắn `chrome.notifications` và nhắn cho các trang New Tab đang mở.

**Nguyên tắc:** `chrome.storage.local` là nguồn dữ liệu gốc duy nhất. Mọi thay đổi đều ghi vào storage; nơi nào cần biết thì nghe `storage.onChanged`. Nhờ vậy sửa ở một tab thì tab khác và background tự cập nhật.

```
daily-task-extension/
├─ wxt.config.ts            # manifest: tên, quyền, icon
├─ public/theme-init.js     # script đồng bộ áp theme trước khi vẽ (chống nháy trắng)
├─ entrypoints/
│  ├─ newtab/               # WXT tự gán chrome_url_overrides.newtab
│  │  ├─ index.html
│  │  ├─ main.tsx
│  │  └─ App.tsx
│  └─ background.ts         # service worker: alarms → notifications
├─ components/
│  ├─ Header.tsx            # lời chào, ngày, đồng hồ, nút theme
│  ├─ DayNav.tsx            # ‹ Hôm nay ›
│  ├─ QuickAdd.tsx          # ô thêm nhanh + nút mở dialog
│  ├─ TaskList.tsx          # các nhóm Quá hạn / Cần làm / Đã xong
│  ├─ TaskItem.tsx
│  ├─ TaskDialog.tsx        # thêm/sửa, kính mờ
│  ├─ ProgressCard.tsx
│  ├─ NextUpCard.tsx
│  ├─ undoDeleteToast.ts    # Toast "Đã xoá · Hoàn tác" dùng chung
│  └─ ui/                   # shadcn: button, dialog, checkbox, input, label, textarea, sonner
├─ lib/
│  ├─ date.ts               # tiện ích ngày giờ theo giờ máy + định dạng tiếng Việt
│  ├─ task.ts               # kiểu Task, validate, lọc theo ngày, quá hạn, sắp xếp, tiến độ
│  ├─ task-storage.ts       # đọc/ghi/lắng nghe key task:* trong chrome.storage.local
│  ├─ reminders.ts          # hàm thuần: lịch alarm, điều kiện nhắc, cửa sổ lỡ nhắc
│  ├─ reminder-service.ts   # logic của service worker (alarm, thông báo, hàng đợi)
│  └─ theme.ts              # đọc/ghi/áp theme
├─ store/useTaskStore.ts    # Zustand
└─ hooks/
   ├─ useReminders.ts       # nhận tin từ background → Toast
   ├─ useNow.ts             # thời điểm hiện tại, nhảy theo phút; ngày tự đổi khi qua nửa đêm
   └─ useTheme.ts
```

**Quyền manifest:** `storage`, `alarms`, `notifications`. Không có host permission.

**Stack (đã kiểm chứng 2026-10-01):** WXT 0.21, React 19, TypeScript 5.9, Tailwind CSS v4, shadcn/ui 4 (style `radix-nova`, hàm `cn` từ package `cn`; Toast dùng **Sonner**), Zustand 5, Lucide React, Motion 13 (`motion/react`, tên mới của Framer Motion), Vitest 5 + happy-dom + Testing Library. Font **Be Vietnam Pro** đóng gói trong extension (qua Fontsource), không tải từ mạng.

## 4. Dữ liệu và lưu trữ

### 4.1 Kiểu Task

```ts
type Task = {
  id: string              // crypto.randomUUID()
  title: string           // bắt buộc, 1–120 ký tự sau khi trim
  description?: string    // tuỳ chọn, ≤ 1000 ký tự
  status: 'todo' | 'done'
  dueDate: string         // 'YYYY-MM-DD' theo giờ máy
  dueTime?: string        // 'HH:mm'; không có = việc trong ngày, không nhắc
  createdAt: number       // epoch ms
  completedAt?: number    // có khi status = 'done'
  remindedFor?: string    // mốc đã nhắc, dạng `${dueDate}T${dueTime}`
}
```

- Khác prompt gốc: `dueDate` tách thành **ngày + giờ tuỳ chọn** để có việc "trong ngày" không nhắc, và để việc xác định "thuộc ngày nào" không dính lỗi múi giờ.
- **Mốc nhắc** của task = `${dueDate}T${dueTime}`; thời điểm tương ứng (`dueAt`) tính theo giờ máy. Đổi ngày/giờ ⇒ mốc mới ≠ `remindedFor` cũ ⇒ sẽ được nhắc lại.

### 4.2 Lưu trong `chrome.storage.local`

- Mỗi task một key: `task:<id>` → `Task`. Không gom mảng, vì trang New Tab và background đều ghi; tách key thì mỗi lần ghi chỉ chạm đúng một task, không đè mất thay đổi của nhau.
- Khi đọc, key có dữ liệu sai cấu trúc bị bỏ qua (log `console.warn`), không làm hỏng cả danh sách.
- Không dọn task cũ (≈300 byte/task, 10MB là đủ hàng chục nghìn task).

### 4.3 Zustand store `useTaskStore`

- Không dùng middleware `persist` (vốn thiết kế cho một key duy nhất).
- State: `tasks: Record<string, Task>`, `hydrated: boolean`.
- **Hydrate:** khi trang mở, đọc tất cả key `task:*` → nạp store → `hydrated = true`. Trước đó UI hiện skeleton, không hiện trạng thái rỗng.
- **Actions:** `addTask`, `updateTask`, `toggleTask`, `moveToToday`, `deleteTask`, `restoreTask`. Mỗi action cập nhật store ngay (optimistic) rồi ghi key tương ứng. Ghi lỗi ⇒ trả store về trạng thái trước và báo Toast "Không lưu được, thử lại".
  - `toggleTask`: `todo → done` đặt `completedAt`; `done → todo` xoá `completedAt`.
  - `updateTask` khi đổi `dueDate`/`dueTime`: không cần xoá `remindedFor` (mốc mới tự khác).
  - `moveToToday`: đặt `dueDate` = hôm nay, giữ nguyên `dueTime`.
- **Đồng bộ:** nghe `storage.onChanged` (area `local`, key `task:*`) để áp thay đổi từ tab khác/background vào store.

## 5. Giao diện

### 5.1 Bố cục (bento grid)

```
┌──────────────────────────────────────────────────────┐
│ Chào buổi sáng 👋   Thứ Năm, 1/10 · 09:41  [☀/☾]     │
│                  ‹  Hôm nay  ›                        │
├───────────────────────────────────┬──────────────────┤
│ [+ Thêm việc cho hôm nay…    ⏎][⋯]│  ◔ Tiến độ       │
│                                   │  3/5 · 60%       │
│ ⚠ Quá hạn (2)                     ├──────────────────┤
│   ☐ Gửi báo cáo  · 30/9   [Dời →] │  ⏰ Tiếp theo     │
│ Cần làm                           │  Họp team 10:00  │
│   ☐ Họp team            10:00     │  còn 19 phút     │
│   ☐ Mua quà sinh nhật             │                  │
│ ▸ Đã xong (3)                     │                  │
└───────────────────────────────────┴──────────────────┘
```

- **Desktop (≥ `lg`):** lưới 3 cột; thẻ danh sách chiếm 2 cột, cột phải xếp Tiến độ + Tiếp theo.
- **Hẹp (mobile-first):** một cột theo thứ tự Tiến độ (gọn) → Danh sách → Tiếp theo.

### 5.2 Thành phần

- **Header:** lời chào theo buổi (sáng/chiều/tối), thứ + ngày, đồng hồ cập nhật mỗi phút (canh đúng đầu phút), nút theme Sáng/Tối/Hệ thống.
- **DayNav:** ‹ › chuyển ngày; nhãn "Hôm nay"/"Ngày mai"/"Hôm qua" hoặc ngày cụ thể; bấm nhãn để về hôm nay.
- **QuickAdd:** gõ tiêu đề + Enter ⇒ tạo task không giờ cho **ngày đang xem**. Rỗng thì bỏ qua; quá 120 ký tự thì báo lỗi tại chỗ. Nút ⋯ mở TaskDialog với tiêu đề đã gõ.
- **TaskList — các nhóm:**
  - **Quá hạn** (chỉ khi đang xem hôm nay): `status = 'todo'` và `dueDate < hôm nay`. Sắp theo `dueDate`, rồi `dueTime`. Mỗi task có nút "Dời sang hôm nay".
  - **Cần làm:** task `todo` của ngày đang xem. Task có giờ trước (theo giờ tăng dần), task không giờ sau (theo `createdAt`). Task hôm nay đã qua giờ thì nhãn giờ tô đỏ, vẫn ở nhóm này.
  - **Đã xong:** task `done` của ngày đang xem, theo `completedAt` giảm dần; làm mờ + gạch ngang; thu gọn/mở được.
  - Ngày không có task: trạng thái rỗng có gợi ý dùng ô thêm nhanh.
- **TaskItem:** checkbox, tiêu đề, nhãn giờ, mô tả 1 dòng (nếu có). Bấm vào task ⇒ mở dialog sửa. Hover/focus ⇒ hiện icon xoá. Xoá không hỏi xác nhận; hiện Toast "Đã xoá · **Hoàn tác**" 5 giây (hoàn tác = `restoreTask`).
- **TaskDialog (thêm/sửa):**
  - Trường: Tiêu đề, Mô tả, Ngày (mặc định ngày đang xem), Giờ nhắc (tuỳ chọn).
  - Validate: tiêu đề 1–120 ký tự sau trim; mô tả ≤ 1000; ngày hợp lệ; giờ đúng `HH:mm` nếu có. Lỗi hiện dưới từng trường, chặn lưu.
  - Nếu ngày+giờ đã qua: cảnh báo "Giờ này đã qua, sẽ không nhắc" nhưng vẫn cho lưu.
  - Enter lưu (trừ trong ô mô tả), Esc đóng. Chế độ sửa có nút Xoá.
  - Validate viết tay trong `lib/task.ts` (không thêm react-hook-form/zod).
- **ProgressCard:** vòng tròn % = task `done` / tổng task **của ngày đang xem** (không tính nhóm Quá hạn). 0 task ⇒ "Chưa có việc". 100% ⇒ câu chúc mừng.
- **NextUpCard:** luôn theo **hôm nay** (không theo ngày đang xem): task `todo` có giờ sớm nhất mà `dueAt ≥ bây giờ`, kèm đếm ngược ("còn 19 phút", "còn 2 giờ"). Không có ⇒ "Không còn việc có hẹn giờ".

### 5.3 Phong cách

- **Glassmorphism** cho dialog, Toast, và các thẻ: nền bán trong suốt + `backdrop-blur` + viền nhạt; nền trang có gradient mềm để hiệu ứng kính hiện rõ.
- **Theme:** Sáng / Tối / Hệ thống (mặc định Hệ thống), lưu `localStorage['theme']`. `public/theme-init.js` được nạp đồng bộ trong `<head>` để đặt class `dark` trước khi vẽ ⇒ không nháy trắng khi mở tab ở chế độ tối.
- **Chuyển động (Motion):** thêm/xoá task có fade + trượt; tick xong: checkbox nảy nhẹ, gạch ngang chạy qua chữ, task trượt xuống nhóm Đã xong (layout animation); bỏ tick trượt ngược lên. Vòng tiến độ chạy mượt. Tắt hiệu ứng khi `prefers-reduced-motion`.
- **Truy cập:** component shadcn/Radix (bàn phím, aria); checkbox có nhãn là tiêu đề task.

### 5.4 Trường hợp biên

- Tab để mở qua nửa đêm: `useNow` cập nhật đúng lúc đổi phút và khi tab hiện lại (`visibilitychange`); "hôm nay" suy ra từ giá trị này ⇒ "Hôm nay", nhóm Quá hạn và Tiếp theo tự cập nhật.

## 6. Nhắc việc

### 6.1 Đặt báo thức

- Mỗi task **`todo`, có `dueTime`, `dueAt` ở tương lai** có một alarm tên `task:<id>` với `when = dueAt`. Tạo lại alarm cùng tên sẽ thay alarm cũ.
- **Khi task đổi** (`storage.onChanged`): chỉ tính lại cho các task vừa đổi — hết đủ điều kiện (xong, xoá, bỏ giờ, giờ đã qua) thì `alarms.clear`, còn lại thì đặt theo `dueAt` mới.
- **Khi `runtime.onStartup` / `runtime.onInstalled`:** xoá mọi alarm `task:*` rồi tạo lại từ storage (Chrome không đảm bảo giữ alarm qua khởi động lại và luôn xoá khi extension cập nhật), rồi xử lý lỡ nhắc (6.3).

### 6.2 Khi alarm kêu

Background đọc lại task và **chỉ nhắc khi đủ tất cả điều kiện**:

1. task còn tồn tại và `status = 'todo'`;
2. có `dueTime` và `dueAt` nằm trong **(bây giờ − 60 phút, bây giờ + 60 giây]** — alarm lỗi thời không nhắc sớm; alarm kêu trễ hơn 60 phút (máy ngủ lâu rồi thức dậy) cũng không nhắc, cùng lý do với 6.3;
3. `remindedFor ≠ mốc hiện tại`.

Khi nhắc:

1. `notifications.create('task:<id>', …)`: tiêu đề = tiêu đề task; nội dung "Đến giờ · HH:mm" + mô tả (nếu có); nút **"Đánh dấu xong"**; `requireInteraction: true` (giữ trên màn hình nếu hệ điều hành hỗ trợ); icon của extension. Dùng id cố định nên cùng task không bị chồng nhiều thông báo.
2. Ghi `remindedFor = mốc` vào `task:<id>`.
3. `runtime.sendMessage({ type: 'reminder', taskId })`; không có trang nào nhận thì bắt lỗi và bỏ qua. Trang New Tab (`useReminders`) chỉ hiện Toast nếu tab đang hiển thị; Toast có nút "Xong".

- **Bấm vào thông báo:** `tabs.create({})` mở tab mới (chính là trang task), đóng thông báo.
- **Bấm "Đánh dấu xong":** background đặt task `done` + `completedAt`, đóng thông báo.
- Mọi xử lý nhắc trong service worker chạy **tuần tự qua một hàng đợi promise**, để alarm cũ kêu lúc khởi động và bước xử lý lỡ nhắc không cùng nhắc một task hai lần.

### 6.3 Lỡ nhắc (Chrome tắt / máy ngủ)

Lúc `onStartup`/`onInstalled`: task `todo` có `dueAt` trong khoảng **(bây giờ − 60 phút, bây giờ]** và `remindedFor ≠ mốc` ⇒ nhắc ngay với nội dung "Đã quá giờ · HH:mm". Trễ hơn 60 phút thì không nhắc (tránh dội thông báo), task vẫn hiện ở Cần làm (nhãn đỏ) hoặc Quá hạn.

### 6.4 Hạn chế (ghi vào README)

- Chrome tắt hẳn thì không có thông báo. Mặc định Chrome trên Windows vẫn chạy nền sau khi đóng cửa sổ.
- Windows Focus Assist / Do Not Disturb, hoặc tắt thông báo của Chrome trong Settings ⇒ không hiện. README có hướng dẫn kiểm tra.

## 7. Xử lý lỗi

- Ghi storage lỗi (trang): trả lại state cũ + Toast "Không lưu được, thử lại".
- Dữ liệu hỏng: bỏ qua key đó khi đọc + `console.warn`.
- Background: mỗi lần xử lý alarm/notification bọc `try/catch` + `console.error`; lỗi một task không ảnh hưởng task khác.

## 8. Kiểm thử

**Tự động (Vitest, TDD — viết test trước):**

- `lib/date.ts`, `lib/task.ts`: lọc theo ngày; xác định quá hạn; sắp xếp các nhóm; tiến độ; validate; mốc biên 23:59 → 00:00.
- `lib/reminders.ts`: task nào cần alarm và `when`; điều kiện nhắc (đã xong, đã đổi giờ, đã nhắc, alarm lỗi thời); cửa sổ lỡ nhắc 60 phút.
- `store/useTaskStore.ts`, `background.ts`: chạy với `fakeBrowser` của WXT (`wxt/testing/fake-browser`) — CRUD ghi đúng key, rollback khi ghi lỗi, nhận thay đổi từ ngoài, đặt/huỷ alarm khi task đổi, nhắc đúng một lần.

**Thủ công trên Chrome thật (checklist trong README):**

- Thêm nhanh / thêm đầy đủ / sửa / xoá + hoàn tác / tick & bỏ tick.
- Mở 2 tab New Tab: sửa ở tab này, tab kia cập nhật.
- Tạo task hẹn 1–2 phút sau: có thông báo hệ thống + Toast; nút "Đánh dấu xong" hoạt động; bấm thông báo mở tab.
- Đổi giờ task trước khi đến giờ: nhắc theo giờ mới, không nhắc giờ cũ.
- Tắt Chrome qua giờ hẹn rồi mở lại trong 60 phút: có "Đã quá giờ".
- Sáng/Tối/Hệ thống, không nháy trắng; cửa sổ hẹp.

## 9. Quy trình dev và cài đặt

- `npm run dev` — WXT mở Chrome riêng đã cài extension, tự nạp lại khi sửa.
- `npm run build` — ra `.output/chrome-mv3/`.
- `npm test` — chạy Vitest.
- Cài: `chrome://extensions` → bật Developer mode → Load unpacked → chọn `.output/chrome-mv3/`. Lần đầu mở tab mới, Chrome hỏi giữ thay đổi trang New Tab → chọn **Keep it**.
- Cập nhật: `npm run build` rồi bấm reload extension (alarm được tạo lại nhờ `onInstalled`).
- Icon: một icon tick đơn giản, sinh đủ cỡ 16/32/48/128 cho manifest và dùng làm icon thông báo.

## 10. Ngoài phạm vi

Đồng bộ nhiều máy (`storage.sync`), task lặp lại, hoãn nhắc (snooze), tag/độ ưu tiên, ô tìm kiếm/lối tắt, đăng Chrome Web Store.
