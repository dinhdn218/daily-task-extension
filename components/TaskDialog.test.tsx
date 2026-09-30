import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task, TaskInput } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskDialog } from './TaskDialog';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const defaults: TaskInput = { title: '', description: '', dueDate: '2099-10-01', dueTime: '' };

const existing: Task = {
  id: 'a',
  title: 'Họp team',
  description: 'Phòng 3',
  status: 'todo',
  dueDate: '2099-10-01',
  dueTime: '10:00',
  createdAt: 1,
};

const tasks = () => Object.values(useTaskStore.getState().tasks);

beforeEach(() => {
  fakeBrowser.reset();
  vi.mocked(toast).mockClear();
  useTaskStore.setState({ tasks: {}, hydrated: true });
});

describe('TaskDialog', () => {
  it('không mở khi state = null', () => {
    render(<TaskDialog state={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('nút đóng (X) có nhãn tiếng Việt', () => {
    render(<TaskDialog state={{ mode: 'create', defaults }} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
  });

  it('báo lỗi khi thiếu tiêu đề và không lưu', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: 'create', defaults }} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nhập tên công việc');
    expect(tasks()).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('tạo task với đủ trường rồi đóng', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: 'create', defaults: { ...defaults, title: 'Gửi báo cáo' } }} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Thêm công việc' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Gửi báo cáo');
    await user.type(screen.getByLabelText('Mô tả'), 'Gửi cho sếp');
    await user.type(screen.getByLabelText('Giờ nhắc'), '09:30');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(tasks()).toEqual([
      expect.objectContaining({
        title: 'Gửi báo cáo',
        description: 'Gửi cho sếp',
        dueDate: '2099-10-01',
        dueTime: '09:30',
      }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('cảnh báo khi giờ đã qua nhưng vẫn cho lưu', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TaskDialog
        state={{ mode: 'create', defaults: { ...defaults, title: 'Cũ', dueDate: '2020-01-01', dueTime: '08:00' } }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Giờ này đã qua, sẽ không nhắc.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(tasks()).toHaveLength(1);
  });

  it('sửa task: điền sẵn giá trị, lưu thay đổi', async () => {
    useTaskStore.setState({ tasks: { a: existing } });
    const user = userEvent.setup();
    render(<TaskDialog state={{ mode: 'edit', task: existing }} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Sửa công việc' })).toBeInTheDocument();
    const title = screen.getByLabelText('Tiêu đề');
    expect(title).toHaveValue('Họp team');
    await user.clear(title);
    await user.type(title, 'Họp khách hàng');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(useTaskStore.getState().tasks.a).toMatchObject({ title: 'Họp khách hàng', dueTime: '10:00' });
  });

  it('xoá task trong chế độ sửa → hiện Toast hoàn tác', async () => {
    useTaskStore.setState({ tasks: { a: existing } });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: 'edit', task: existing }} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Xoá' }));

    expect(useTaskStore.getState().tasks.a).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      'Đã xoá công việc',
      expect.objectContaining({ description: 'Họp team' }),
    );
  });
});
