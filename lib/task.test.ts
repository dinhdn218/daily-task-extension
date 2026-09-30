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

  it('todoForDay: trùng giờ thì task tạo trước đứng trước', () => {
    const second = task({ dueTime: '09:00', createdAt: 2 });
    const first = task({ dueTime: '09:00', createdAt: 1 });
    expect(todoForDay([second, first], today)).toEqual([first, second]);
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
