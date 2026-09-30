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
