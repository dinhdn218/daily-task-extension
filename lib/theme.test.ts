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
