import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkspaceMembersPage from '../WorkspaceMembersPage';
import { useAuthStore } from '../../store/authStore';
import { resetStores } from '../../test/test-utils';
import { authStateForRole } from '../../test/roleFixtures';
import { mockUser } from '../../test/fixtures';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: vi.fn() }),
}));

const members = [
  {
    userId: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
    workspaceRole: 'admin' as const,
  },
  {
    userId: 'user2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    workspaceRole: 'member' as const,
  },
];

function renderMembersPage(role: Parameters<typeof authStateForRole>[0]) {
  useAuthStore.setState(authStateForRole(role));

  return render(
    <MemoryRouter initialEntries={['/settings/workspaces/ws1/members']}>
      <Routes>
        <Route path="/settings/workspaces/:id/members" element={<WorkspaceMembersPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WorkspaceMembersPage role-specific UI', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/members') && !url.includes('/workspaces/')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: members } });
    });
  });

  describe('workspace member (non-admin)', () => {
    it('shows read-only member list without management controls', async () => {
      renderMembersPage('accountMemberWorkspaceMember');

      expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    });
  });

  describe('workspace admin', () => {
    it('shows role dropdown and remove for manageable members', async () => {
      renderMembersPage('accountMemberWorkspaceAdmin');

      expect(await screen.findByText('Bob Smith')).toBeInTheDocument();
      const roleSelects = screen.getAllByRole('combobox');
      expect(roleSelects.length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBeGreaterThan(0);
    });

    it('disables remove and role change for the sole workspace admin', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          data: [members[0]],
        },
      });

      renderMembersPage('accountMemberWorkspaceAdmin');

      const adminRow = (await screen.findByText(mockUser.name)).closest('div.rounded-lg') as HTMLElement;
      const roleSelect = within(adminRow).getByRole('combobox');
      const removeButton = within(adminRow).getByRole('button', { name: 'Remove' });

      expect(roleSelect).toBeDisabled();
      expect(removeButton).toBeDisabled();
    });

    it('allows demoting an admin when multiple admins exist', async () => {
      const multiAdminMembers = [
        members[0],
        { ...members[1], workspaceRole: 'admin' as const },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { data: multiAdminMembers } });
      vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });

      const user = userEvent.setup();
      renderMembersPage('accountMemberWorkspaceAdmin');

      const adminRow = (await screen.findByText(mockUser.name)).closest('div.rounded-lg') as HTMLElement;
      const roleSelect = within(adminRow).getByRole('combobox');

      expect(roleSelect).not.toBeDisabled();
      await user.selectOptions(roleSelect, 'member');

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/workspaces/ws1/members/user1', {
          workspaceRole: 'member',
        });
      });
    });
  });

  describe('account admin without workspace admin role', () => {
    it('can still manage members via account admin privilege', async () => {
      renderMembersPage('accountAdminWorkspaceMember');

      expect(await screen.findByRole('button', { name: 'Add' })).toBeInTheDocument();
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
    });
  });
});
