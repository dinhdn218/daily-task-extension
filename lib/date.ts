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

/** 'Hôm nay' | 'Ngày mai' | 'Hôm qua' | 'Thứ Bảy, 3/10' */
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
