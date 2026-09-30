import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Task } from '@/lib/task';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskList } from './TaskList';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const TODAY = '2026-10-01';
const NOW = new Date(2026, 9, 1, 9, 41);

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Việc ${id}`,
  status: 'todo',
  dueDate: TODAY,
  createdAt: 1,
  ...over,
});

function setTasks(...list: Task[]) {
  useTaskStore.setState({ tasks: Object.fromEntries(list.map((t) => [t.id, t])), hydrated: true });
}

const renderList = (day = TODAY) =>
  render(<TaskList day={day} today={TODAY} now={NOW} onEdit={vi.fn()} />);

beforeEach(() => {
  fakeBrowser.reset();
  vi.mocked(toast).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TaskList', () => {
  it('chưa đọc xong dữ liệu → không hiện trạng thái rỗng', () => {
    useTaskStore.setState({ tasks: {}, hydrated: false });
    renderList();
    expect(screen.queryByText('Chưa có việc nào cho ngày này')).not.toBeInTheDocument();
  });

  it('ngày không có task → trạng thái rỗng', () => {
    setTasks();
    renderList();
    expect(screen.getByText('Chưa có việc nào cho ngày này')).toBeInTheDocument();
  });

  it('chia nhóm Quá hạn / Cần làm / Đã xong', () => {
    setTasks(
      task('old', { dueDate: '2026-09-30', title: 'Gửi báo cáo' }),
      task('meet', { title: 'Họp team', dueTime: '10:00' }),
      task('done', { title: 'Tập thể dục', status: 'done', completedAt: 5 }),
    );
    renderList();

    const overdue = screen.getByRole('heading', { name: /Quá hạn \(1\)/ }).closest('section')!;
    expect(within(overdue).getByText('Gửi báo cáo')).toBeInTheDocument();
    expect(within(overdue).getByText('30/9')).toBeInTheDocument();

    const todo = screen.getByRole('heading', { name: 'Cần làm' }).closest('section')!;
    expect(within(todo).getByText('Họp team')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Đã xong \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText('Tập thể dục')).toBeInTheDocument();
  });

  it('xem ngày khác thì không hiện Quá hạn', () => {
    setTasks(task('old', { dueDate: '2026-09-30' }), task('next', { dueDate: '2026-10-02' }));
    renderList('2026-10-02');
    expect(screen.queryByRole('heading', { name: /Quá hạn/ })).not.toBeInTheDocument();
    expect(screen.getByText('Việc next')).toBeInTheDocument();
  });

  it('Tab đi thẳng vào checkbox, không có điểm dừng thừa', async () => {
    const user = userEvent.setup();
    setTasks(task('a', { title: 'Họp team' }));
    renderList();

    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Đánh dấu xong: Họp team' })).toHaveFocus();
  });

  it('tick checkbox → task xong; thu gọn nhóm Đã xong', async () => {
    const user = userEvent.setup();
    setTasks(task('a', { title: 'Họp team' }));
    renderList();

    await user.click(screen.getByRole('checkbox', { name: 'Đánh dấu xong: Họp team' }));
    expect(useTaskStore.getState().tasks.a?.status).toBe('done');

    const toggle = await screen.findByRole('button', { name: /Đã xong \(1\)/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('dời task quá hạn sang hôm nay', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    const user = userEvent.setup();
    setTasks(task('old', { dueDate: '2026-09-30', title: 'Gửi báo cáo' }));
    renderList();

    await user.click(screen.getByRole('button', { name: 'Dời sang hôm nay: Gửi báo cáo' }));
    expect(useTaskStore.getState().tasks.old?.dueDate).toBe(TODAY);
  });

  it('xoá task → Toast có nút Hoàn tác khôi phục lại', async () => {
    const user = userEvent.setup();
    const original = task('a', { title: 'Họp team' });
    setTasks(original);
    renderList();

    await user.click(screen.getByRole('button', { name: 'Xoá: Họp team' }));
    expect(useTaskStore.getState().tasks.a).toBeUndefined();

    const options = vi.mocked(toast).mock.calls[0]![1] as {
      action: { label: string; onClick: () => void };
    };
    expect(options.action.label).toBe('Hoàn tác');
    options.action.onClick();
    await vi.waitFor(() => expect(useTaskStore.getState().tasks.a).toEqual(original));
  });
});
