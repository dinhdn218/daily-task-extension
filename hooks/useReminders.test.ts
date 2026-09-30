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
