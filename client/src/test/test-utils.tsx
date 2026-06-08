import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { useToastStore } from '../store/toastStore';
import {
  mockAccount,
  mockMemberships,
  mockUser,
  mockWorkspace,
} from './fixtures';

interface RouterOptions {
  route?: string;
  outlet?: ReactNode;
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', outlet = <div data-testid="outlet">Page content</div> }: RouterOptions = {},
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={ui} />
        {outlet ? <Route path="/child" element={outlet} /> : null}
      </Routes>
    </MemoryRouter>,
    options
  );
}

export function renderWithOutlet(
  layout: ReactElement,
  { route = '/dashboard', outlet = <div data-testid="outlet">Page content</div> } = {}
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={layout}>
          <Route index element={outlet} />
          <Route path="dashboard" element={outlet} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

export function seedAuthStore(
  overrides: Partial<ReturnType<typeof useAuthStore.getState>> = {}
) {
  useAuthStore.setState({
    user: mockUser,
    account: mockAccount,
    workspace: mockWorkspace,
    memberships: mockMemberships,
    isAuthenticated: true,
    isLoading: false,
    authReady: true,
    ...overrides,
  });
}

export function seedUnauthenticated() {
  useAuthStore.setState({
    user: null,
    account: null,
    workspace: null,
    memberships: [],
    isAuthenticated: false,
    isLoading: false,
    authReady: true,
  });
}

export function resetStores() {
  useAuthStore.setState({
    user: null,
    account: null,
    workspace: null,
    memberships: [],
    isAuthenticated: false,
    isLoading: false,
    authReady: false,
  });
  useTaskStore.setState({
    tasks: [],
    meta: null,
    filters: {},
    isLoading: false,
  });
  useToastStore.setState?.({ message: null });
}
