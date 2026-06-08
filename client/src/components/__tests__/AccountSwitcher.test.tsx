import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountSwitcher from '../AccountSwitcher';
import { resetStores, seedAuthStore } from '../../test/test-utils';
import { mockMemberships } from '../../test/fixtures';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';

vi.mock('../../services/socket', () => ({
  reconnectSocket: vi.fn(),
}));

describe('AccountSwitcher', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('shows account name only when user has a single account', () => {
    seedAuthStore({
      memberships: [mockMemberships[0]],
    });

    render(<AccountSwitcher />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders a select when user has multiple accounts', () => {
    seedAuthStore();

    render(<AccountSwitcher />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Acme Corp (admin)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta Inc (member)' })).toBeInTheDocument();
  });

  it('switches account and refreshes tasks when selection changes', async () => {
    const user = userEvent.setup();
    seedAuthStore();

    const switchContext = vi.fn().mockResolvedValue(undefined);
    const clearTasks = vi.fn();
    const fetchTasks = vi.fn().mockResolvedValue(undefined);

    useAuthStore.setState({ switchContext });
    useTaskStore.setState({ clearTasks, fetchTasks });

    const { reconnectSocket } = await import('../../services/socket');

    render(<AccountSwitcher />);

    await user.selectOptions(screen.getByRole('combobox'), 'acc2');

    expect(switchContext).toHaveBeenCalledWith('acc2', 'ws3');
    expect(clearTasks).toHaveBeenCalled();
    expect(reconnectSocket).toHaveBeenCalled();
    expect(fetchTasks).toHaveBeenCalled();
  });
});
