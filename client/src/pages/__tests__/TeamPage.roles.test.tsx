import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeamPage from '../TeamPage';
import { useAuthStore } from '../../store/authStore';
import { resetStores } from '../../test/test-utils';
import { authStateForRole } from '../../test/roleFixtures';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: vi.fn() }),
}));

describe('TeamPage role-specific UI', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('shows invite form and workspace selector for account admins', () => {
    useAuthStore.setState(authStateForRole('accountAdminWorkspaceAdmin'));

    render(
      <MemoryRouter>
        <TeamPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Invite to account' })).toBeInTheDocument();
    expect(screen.getByText('Invite to workspace')).toBeInTheDocument();
    expect(screen.queryByText(/Contact your account admin/i)).not.toBeInTheDocument();
  });

  it('shows guidance message instead of invite controls for account members', () => {
    useAuthStore.setState(authStateForRole('accountMemberWorkspaceMember'));

    render(
      <MemoryRouter>
        <TeamPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Contact your account admin/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite to account' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });
});
