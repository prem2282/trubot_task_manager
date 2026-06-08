import { create } from 'zustand';
import { api, loadStoredAccessToken, setAccessToken } from '../services/api';
import { Account, MembershipAccount, User, Workspace } from '../types';

interface AuthState {
  user: User | null;
  account: Account | null;
  workspace: Workspace | null;
  memberships: MembershipAccount[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    accountName?: string;
  }) => Promise<{ requiresVerification: true; email: string; message: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  fetchMemberships: () => Promise<void>;
  restoreLastContext: () => Promise<void>;
  switchContext: (accountId: string, workspaceId: string) => Promise<void>;
  setSession: (data: {
    accessToken: string;
    user: User;
    account: Account;
    workspace: Workspace;
  }) => void;
}

const LAST_ACCOUNT_KEY = 'lastActiveAccountId';
const LAST_WORKSPACE_KEY = 'lastActiveWorkspaceId';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  account: null,
  workspace: null,
  memberships: [],
  isAuthenticated: false,
  isLoading: false,
  authReady: false,

  setSession: ({ accessToken, user, account, workspace }) => {
    setAccessToken(accessToken);
    localStorage.setItem(LAST_ACCOUNT_KEY, account.id);
    localStorage.setItem(LAST_WORKSPACE_KEY, workspace.id);
    set({
      user,
      account,
      workspace,
      isAuthenticated: true,
    });
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    get().setSession(data.data);
    await get().fetchMemberships();
    await get().restoreLastContext();
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      set({
        user: null,
        account: null,
        workspace: null,
        memberships: [],
        isAuthenticated: false,
      });
    }
  },

  fetchMe: async () => {
    set({ isLoading: true });
    loadStoredAccessToken();

    try {
      const { data } = await api.get('/auth/me');
      set({
        user: data.data.user,
        account: data.data.account,
        workspace: data.data.workspace,
        isAuthenticated: true,
      });
      try {
        await get().fetchMemberships();
        await get().restoreLastContext();
      } catch {
        // Memberships are non-blocking for initial app load.
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        setAccessToken(null);
      }
      set({
        user: null,
        account: null,
        workspace: null,
        memberships: [],
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false, authReady: true });
    }
  },

  fetchMemberships: async () => {
    const { data } = await api.get('/auth/memberships');
    set({ memberships: data.data });
  },

  restoreLastContext: async () => {
    const lastAccount = localStorage.getItem(LAST_ACCOUNT_KEY);
    const lastWorkspace = localStorage.getItem(LAST_WORKSPACE_KEY);
    const { memberships, account, workspace } = get();

    if (!lastAccount || !lastWorkspace) return;
    if (account?.id === lastAccount && workspace?.id === lastWorkspace) return;

    const membership = memberships.find((m) => m.accountId === lastAccount);
    const targetWorkspace = membership?.workspaces.find((w) => w.workspaceId === lastWorkspace);
    if (!membership || !targetWorkspace) return;

    await get().switchContext(lastAccount, lastWorkspace);
  },

  switchContext: async (accountId, workspaceId) => {
    const { data } = await api.post('/auth/switch-context', { accountId, workspaceId });
    setAccessToken(data.data.accessToken);
    localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
    localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
    set({
      account: data.data.account,
      workspace: data.data.workspace,
    });
  },
}));

export function isWorkspaceAdmin(
  memberships: MembershipAccount[],
  accountId: string | undefined,
  workspaceId: string | undefined
): boolean {
  if (!accountId || !workspaceId) return false;
  const membership = memberships.find((m) => m.accountId === accountId);
  if (membership?.accountRole === 'admin') return true;
  return (
    membership?.workspaces.find((w) => w.workspaceId === workspaceId)?.workspaceRole === 'admin'
  );
}
