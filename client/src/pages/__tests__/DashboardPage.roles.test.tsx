import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { resetStores } from '../../test/test-utils';
import { authStateForRole } from '../../test/roleFixtures';
import { mockUser, mockUsers } from '../../test/fixtures';
import { Task } from '../../types';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock('../../services/socket', () => ({
  connectSocket: vi.fn(),
  getSocket: vi.fn(() => null),
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: vi.fn() }),
}));

function buildTask(overrides: Partial<Task> & Pick<Task, 'title' | 'createdBy' | 'assignee'>): Task {
  return {
    _id: 'task-role-1',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

const ownedTask = buildTask({
  _id: 'owned-task',
  title: 'My owned task',
  createdBy: mockUser,
  assignee: mockUsers[1],
});

const assignedTask = buildTask({
  _id: 'assigned-task',
  title: 'Assigned to me',
  createdBy: mockUsers[1],
  assignee: mockUser,
});

const otherTask = buildTask({
  _id: 'other-task',
  title: 'Someone else task',
  createdBy: mockUsers[1],
  assignee: mockUsers[1],
});

function renderDashboard(role: Parameters<typeof authStateForRole>[0], tasks: Task[]) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/users')) {
      return Promise.resolve({ data: { data: mockUsers } });
    }
    return Promise.resolve({
      data: {
        data: tasks,
        meta: { page: 1, limit: 20, total: tasks.length, totalPages: 1 },
      },
    });
  });

  useAuthStore.setState(authStateForRole(role));
  useTaskStore.setState({
    tasks: [],
    meta: null,
    filters: {},
    isLoading: false,
    remoteUpdatedTaskIds: [],
  });

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

async function expectTaskRow(title: string) {
  await waitFor(() => {
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  });
  const matches = screen.getAllByText(title);
  return matches[0].closest('article, tr') as HTMLElement;
}

describe('DashboardPage role-specific actions', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('workspace admin', () => {
    it('shows Edit and Delete on tasks owned by others', async () => {
      renderDashboard('accountMemberWorkspaceAdmin', [otherTask]);

      const row = await expectTaskRow('Someone else task');
      expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  describe('workspace member (non-admin)', () => {
    it('shows Edit and Delete on owned tasks', async () => {
      renderDashboard('accountMemberWorkspaceMember', [ownedTask]);

      const row = await expectTaskRow('My owned task');
      expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('shows View but not Delete on assigned tasks', async () => {
      renderDashboard('accountMemberWorkspaceMember', [assignedTask]);

      const row = await expectTaskRow('Assigned to me');
      expect(within(row).getByRole('button', { name: 'View' })).toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('shows no actions on tasks the member neither owns nor is assigned to', async () => {
      renderDashboard('accountMemberWorkspaceMember', [otherTask]);

      const row = await expectTaskRow('Someone else task');
      expect(within(row).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  describe('account admin with workspace member role', () => {
    it('still receives admin task actions via account admin privilege', async () => {
      renderDashboard('accountAdminWorkspaceMember', [otherTask]);

      const row = await expectTaskRow('Someone else task');
      expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });
});
