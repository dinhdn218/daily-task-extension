import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@/lib/task';
import { DayNav } from './DayNav';
import { Header } from './Header';
import { NextUpCard } from './NextUpCard';
import { ProgressCard } from './ProgressCard';

describe('Header', () => {
  it('hiện lời chào, ngày, giờ và đổi theme', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<Header now={new Date(2026, 9, 1, 9, 5)} theme="system" onThemeChange={onThemeChange} />);

    expect(screen.getByText('Chào buổi sáng 👋')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thứ Năm, 1 tháng 10' })).toBeInTheDocument();
    expect(screen.getByText('09:05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theo hệ thống' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Tối' }));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });
});

describe('DayNav', () => {
  it('chuyển ngày trước/sau và về hôm nay', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<DayNav day="2026-10-01" today="2026-10-01" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Hôm nay' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ngày sau' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-02');
    await user.click(screen.getByRole('button', { name: 'Ngày trước' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-09-30');

    rerender(<DayNav day="2026-10-02" today="2026-10-01" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Ngày mai' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-01');
  });
});

describe('ProgressCard', () => {
  it.each([
    [{ done: 0, total: 0, percent: 0 }, 'Chưa có việc'],
    [{ done: 2, total: 5, percent: 40 }, 'Còn 3 việc'],
    [{ done: 3, total: 3, percent: 100 }, 'Xong hết rồi! 🎉'],
  ])('%o → %s', (progress, message) => {
    render(<ProgressCard progress={progress} />);
    expect(screen.getByText(`${progress.percent}%`)).toBeInTheDocument();
    expect(screen.getByText(`${progress.done}/${progress.total}`)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

describe('NextUpCard', () => {
  const now = new Date(2026, 9, 1, 9, 41);
  const task: Task = {
    id: 'a',
    title: 'Họp team',
    status: 'todo',
    dueDate: '2026-10-01',
    dueTime: '10:00',
    createdAt: 1,
  };

  it('hiện việc kế tiếp kèm đếm ngược', () => {
    render(<NextUpCard task={task} now={now} />);
    expect(screen.getByText('Họp team')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText(/còn 19 phút/)).toBeInTheDocument();
  });

  it('không có việc có giờ', () => {
    render(<NextUpCard task={undefined} now={now} />);
    expect(screen.getByText('Không còn việc có hẹn giờ hôm nay')).toBeInTheDocument();
  });
});
