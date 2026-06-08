import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from '../AppLayout';
import { resetStores, seedAuthStore, seedUnauthenticated } from '../../../test/test-utils';

vi.mock('../TopNav', () => ({
  default: () => <header data-testid="top-nav">TopNav</header>,
}));

describe('AppLayout', () => {
  beforeEach(() => {
    resetStores();
  });

  it('redirects unauthenticated users to login', () => {
    seedUnauthenticated();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<AppLayout />}>
            <Route index element={<div>Protected</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByTestId('top-nav')).not.toBeInTheDocument();
  });

  it('renders TopNav and child route when authenticated', () => {
    seedAuthStore();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="dashboard" element={<div data-testid="outlet">Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toHaveTextContent('Dashboard content');
  });
});
