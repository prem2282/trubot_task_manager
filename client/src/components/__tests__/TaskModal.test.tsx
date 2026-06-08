import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskModal from '../TaskModal';
import { resetStores, seedAuthStore } from '../../test/test-utils';
import { mockTask, mockUser, mockUsers, mockMemberships } from '../../test/fixtures';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('TaskModal', () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  function getTitleInput() {
    return screen.getAllByRole('textbox')[0];
  }

  beforeEach(() => {
    resetStores();
    seedAuthStore();
    onClose.mockClear();
    onSaved.mockClear();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('renders create mode with a new task heading', () => {
    render(
      <TaskModal
        task={null}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    expect(screen.getByRole('heading', { name: 'New task' })).toBeInTheDocument();
    expect(getTitleInput()).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TaskModal
        task={null}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();

    render(
      <TaskModal
        task={null}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates a task and closes on successful save', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    render(
      <TaskModal
        task={null}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.type(getTitleInput(), 'Write unit tests');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({ title: 'Write unit tests' })
      );
    });

    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders existing comments in edit mode', () => {
    render(
      <TaskModal
        task={mockTask}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    expect(screen.getByText('Comments (1)')).toBeInTheDocument();
    expect(screen.getByText('Started investigation')).toBeInTheDocument();
  });

  it('shows assignee-only read-only fields when user is assignee but not owner', () => {
    seedAuthStore({
      memberships: [
        {
          ...mockMemberships[0],
          accountRole: 'member',
          workspaces: mockMemberships[0].workspaces.map((w) => ({
            ...w,
            workspaceRole: 'member' as const,
          })),
        },
      ],
    });

    const assigneeTask = {
      ...mockTask,
      createdBy: mockUsers[1],
      assignee: mockUser,
    };

    render(
      <TaskModal
        task={assigneeTask}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    expect(screen.getByRole('heading', { name: 'Task (assignee)' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Title/i)).not.toBeInTheDocument();
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('shows API error message when save fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'Title is required' } },
    });

    render(
      <TaskModal
        task={null}
        users={mockUsers}
        currentUserId={mockUser.id}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.type(getTitleInput(), 'Duplicate task');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
