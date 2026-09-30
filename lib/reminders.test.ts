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
