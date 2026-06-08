import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkspaceSwitcher from '../WorkspaceSwitcher';
import { resetStores, seedAuthStore } from '../../test/test-utils';
import { mockMemberships } from '../../test/fixtures';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';

vi.mock('../../services/socket', () => ({
  reconnectSocket: vi.fn(),
}));

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('shows workspace name only when account has a single workspace', () => {
    seedAuthStore({
      memberships: [mockMemberships[1]],
      account: { id: 'acc2', name: 'Beta Inc' },
      workspace: { id: 'ws3', name: 'Beta Main' },
    });

    render(<WorkspaceSwitcher />);

    expect(screen.getByText('Beta Main')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders a select when account has multiple workspaces', () => {
    seedAuthStore();

    render(<WorkspaceSwitcher />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Default Workspace (admin)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Secondary (member)' })).toBeInTheDocument();
  });

  it('switches workspace and refreshes tasks when selection changes', async () => {
    const user = userEvent.setup();
    seedAuthStore();

    const switchContext = vi.fn().mockResolvedValue(undefined);
    const clearTasks = vi.fn();
    const fetchTasks = vi.fn().mockResolvedValue(undefined);

    useAuthStore.setState({ switchContext });
    useTaskStore.setState({ clearTasks, fetchTasks });

    const { reconnectSocket } = await import('../../services/socket');

    render(<WorkspaceSwitcher />);

    await user.selectOptions(screen.getByRole('combobox'), 'ws2');

    expect(switchContext).toHaveBeenCalledWith('acc1', 'ws2');
    expect(clearTasks).toHaveBeenCalled();
    expect(reconnectSocket).toHaveBeenCalled();
    expect(fetchTasks).toHaveBeenCalled();
  });
});
