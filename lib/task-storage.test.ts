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
