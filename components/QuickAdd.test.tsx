import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useTaskStore } from '@/store/useTaskStore';
import { QuickAdd } from './QuickAdd';

const tasks = () => Object.values(useTaskStore.getState().tasks);

beforeEach(() => {
  fakeBrowser.reset();
  useTaskStore.setState({ tasks: {}, hydrated: true });
});

describe('QuickAdd', () => {
  it('Enter → thêm task không giờ cho ngày đang xem rồi xoá ô nhập', async () => {
    const user = userEvent.setup();
    render(<QuickAdd day="2026-10-02" today="2026-10-01" onOpenDetails={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Tên việc mới' });
    expect(field).toHaveAttribute('placeholder', 'Thêm việc cho ngày mai…');

    await user.type(field, 'Mua quà sinh nhật{Enter}');

    expect(tasks()).toEqual([
      expect.objectContaining({ title: 'Mua quà sinh nhật', dueDate: '2026-10-02', status: 'todo' }),
    ]);
    expect(tasks()[0]?.dueTime).toBeUndefined();
    expect(field).toHaveValue('');
  });

  it('bỏ qua khi rỗng, báo lỗi khi quá dài', async () => {
    const user = userEvent.setup();
    render(<QuickAdd day="2026-10-01" today="2026-10-01" onOpenDetails={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Tên việc mới' });

    await user.type(field, '   {Enter}');
    expect(tasks()).toEqual([]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.clear(field);
    await user.click(field);
    await user.paste('a'.repeat(121));
    await user.keyboard('{Enter}');
    expect(tasks()).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent('Tối đa 120 ký tự');
  });

  it('nút chi tiết mở hộp thoại với tiêu đề đang gõ', async () => {
    const user = userEvent.setup();
    const onOpenDetails = vi.fn();
    render(<QuickAdd day="2026-10-01" today="2026-10-01" onOpenDetails={onOpenDetails} />);

    await user.type(screen.getByRole('textbox', { name: 'Tên việc mới' }), ' Họp team ');
    await user.click(screen.getByRole('button', { name: 'Thêm chi tiết' }));

    expect(onOpenDetails).toHaveBeenCalledWith('Họp team');
    expect(screen.getByRole('textbox', { name: 'Tên việc mới' })).toHaveValue('');
  });
});
