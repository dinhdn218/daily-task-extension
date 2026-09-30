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
    expect(created?.remindedFor).toBeUndefined();
    expect(state().tasks[created!.id]).toEqual(created);
    expect(await loadTask(created!.id)).toEqual(created);
  });

  it('addTask với giờ đã qua thì đánh dấu đã nhắc, để nhắc bù không báo lại', async () => {
    const created = await state().addTask(input({ dueTime: '08:00' }));
    expect(created).toMatchObject({ remindedFor: '2026-10-01T08:00' });
    expect(await loadTask(created!.id)).toMatchObject({ remindedFor: '2026-10-01T08:00' });
  });

  it('updateTask ghi đè các trường từ form', async () => {
    const created = (await state().addTask(input()))!;
    await state().updateTask(created.id, input({ title: 'Mới', dueTime: '' }));
    const saved = await loadTask(created.id);
    expect(saved).toMatchObject({ title: 'Mới' });
    expect(saved?.dueTime).toBeUndefined();
  });

  it('updateTask sang giờ đã qua thì đánh dấu đã nhắc', async () => {
    const created = (await state().addTask(input()))!;
    expect(created.remindedFor).toBeUndefined();
    await state().updateTask(created.id, input({ dueTime: '08:00' }));
    expect(await loadTask(created.id)).toMatchObject({
      dueTime: '08:00',
      remindedFor: '2026-10-01T08:00',
    });
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

  it('moveToToday sang hôm nay với giờ đã qua thì đánh dấu đã nhắc cho mốc mới', async () => {
    const created = (await state().addTask(input({ dueDate: '2026-09-29', dueTime: '08:00' })))!;
    await state().moveToToday(created.id);
    expect(await loadTask(created.id)).toMatchObject({
      dueDate: '2026-10-01',
      dueTime: '08:00',
      remindedFor: '2026-10-01T08:00',
    });
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
