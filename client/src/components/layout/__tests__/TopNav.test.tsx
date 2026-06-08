import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TopNav from '../TopNav';
import { resetStores, seedAuthStore } from '../../../test/test-utils';
import { useAuthStore } from '../../../store/authStore';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../../services/socket', () => ({
  disconnectSocket: vi.fn(),
}));

vi.mock('../../AccountSwitcher', () => ({
  default: () => <div data-testid="account-switcher">AccountSwitcher</div>,
}));

vi.mock('../../WorkspaceSwitcher', () => ({
  default: () => <div data-testid="workspace-switcher">WorkspaceSwitcher</div>,
}));

describe('TopNav', () => {
  beforeEach(() => {
    resetStores();
    seedAuthStore();
    navigate.mockClear();
    vi.clearAllMocks();
  });

  it('renders navigation links, user name, and switchers', () => {
    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'TaskBoard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByTestId('account-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-switcher')).toBeInTheDocument();
  });

  it('logs out, disconnects socket, and navigates to login', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });

    const { disconnectSocket } = await import('../../../services/socket');

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(disconnectSocket).toHaveBeenCalled();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
