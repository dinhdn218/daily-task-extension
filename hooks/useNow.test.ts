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
