import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskModal from '../TaskModal';
import { useAuthStore } from '../../store/authStore';
import { resetStores, seedAuthStore } from '../../test/test-utils';
import { authStateForRole } from '../../test/roleFixtures';
import { mockTask, mockUser, mockUsers } from '../../test/fixtures';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('TaskModal role-specific permissions', () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    resetStores();
    onClose.mockClear();
    onSaved.mockClear();
    vi.mocked(api.put).mockReset();
  });

  describe('task owner', () => {
    beforeEach(() => {
      useAuthStore.setState(authStateForRole('accountMemberWorkspaceMember'));
    });

    it('can edit title, status including closed, and add comments', () => {
      const ownerTask = {
        ...mockTask,
        status: 'done' as const,
        createdBy: mockUser,
        assignee: mockUsers[1],
      };

      render(
        <TaskModal
          task={ownerTask}
          users={mockUsers}
          currentUserId={mockUser.id}
          onClose={onClose}
          onSaved={onSaved}
        />
      );

      expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')[0]).not.toBeDisabled();
      expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Write a comment/i)).toBeInTheDocument();
    });
  });

  describe('assignee (not owner, not admin)', () => {
    beforeEach(() => {
      useAuthStore.setState(authStateForRole('accountMemberWorkspaceMember'));
    });

    it('shows read-only task fields and limited status options', () => {
      const assigneeTask = {
        ...mockTask,
        createdBy: mockUsers[1],
        assignee: mockUser,
        status: 'todo' as const,
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
      expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'In progress' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Closed' })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Re-opened' })).not.toBeInTheDocument();
    });

    it('submits status-only updates without title changes', async () => {
      const user = userEvent.setup();
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

      const assigneeTask = {
        ...mockTask,
        createdBy: mockUsers[1],
        assignee: mockUser,
        status: 'todo' as const,
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

      await user.selectOptions(screen.getByRole('combobox'), 'in_progress');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(api.put).toHaveBeenCalledWith(`/tasks/${mockTask._id}`, {
        status: 'in_progress',
      });
    });

    it('locks closed tasks unless adding a comment', () => {
      const assigneeTask = {
        ...mockTask,
        createdBy: mockUsers[1],
        assignee: mockUser,
        status: 'closed' as const,
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

      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  describe('workspace admin viewing another user task', () => {
    beforeEach(() => {
      seedAuthStore(authStateForRole('accountMemberWorkspaceAdmin'));
    });

    it('can edit all fields on tasks they do not own', () => {
      const someoneElsesTask = {
        ...mockTask,
        createdBy: mockUsers[1],
        assignee: mockUsers[1],
      };

      render(
        <TaskModal
          task={someoneElsesTask}
          users={mockUsers}
          currentUserId={mockUser.id}
          onClose={onClose}
          onSaved={onSaved}
        />
      );

      expect(screen.getByRole('heading', { name: 'Edit task (admin)' })).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')[0]).not.toBeDisabled();
      expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
    });
  });
});
