import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkspacesPage from '../WorkspacesPage';
import { useAuthStore } from '../../store/authStore';
import { resetStores } from '../../test/test-utils';
import { authStateForRole } from '../../test/roleFixtures';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'ws1',
            name: 'Default Workspace',
            isDefault: true,
            workspaceRole: 'member',
            taskCount: 0,
          },
        ],
      },
    }),
    patch: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../services/socket', () => ({
  reconnectSocket: vi.fn(),
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: vi.fn() }),
}));

const defaultWorkspaceList = {
  data: {
    data: [
      {
        id: 'ws1',
        name: 'Default Workspace',
        isDefault: true,
        workspaceRole: 'member',
        taskCount: 0,
      },
    ],
  },
};

describe('WorkspacesPage role-specific UI', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(defaultWorkspaceList);
  });

  it('shows create workspace form for account admins', async () => {
    useAuthStore.setState(authStateForRole('accountAdminWorkspaceAdmin'));
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByText('Manage members')).toBeInTheDocument();
  });

  it('hides create workspace form for account members', async () => {
    useAuthStore.setState(authStateForRole('accountMemberWorkspaceMember'));
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Default Workspace')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.getByText('View members')).toBeInTheDocument();
    expect(screen.queryByText('Manage members')).not.toBeInTheDocument();
  });

  it('shows Manage members for workspace admins who are account members', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            id: 'ws2',
            name: 'Engineering',
            isDefault: false,
            workspaceRole: 'admin',
            taskCount: 3,
          },
        ],
      },
    });
    useAuthStore.setState(authStateForRole('accountMemberWorkspaceAdmin'));
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Manage members')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows delete but not archive for empty non-default workspace admin', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            id: 'ws2',
            name: 'Engineering',
            isDefault: false,
            workspaceRole: 'admin',
            taskCount: 0,
          },
        ],
      },
    });
    useAuthStore.setState(authStateForRole('accountMemberWorkspaceAdmin'));
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('hides rename delete archive for workspace members', async () => {
    useAuthStore.setState(authStateForRole('accountMemberWorkspaceMember'));
    render(
      <MemoryRouter>
        <WorkspacesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Default Workspace')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });
});
