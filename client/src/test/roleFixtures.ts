import { MembershipAccount } from '../types';
import { mockAccount, mockMemberships, mockUser, mockWorkspace } from './fixtures';

export type RolePreset =
  | 'accountAdminWorkspaceAdmin'
  | 'accountAdminWorkspaceMember'
  | 'accountMemberWorkspaceAdmin'
  | 'accountMemberWorkspaceMember';

const workspaceAdminMembership: MembershipAccount = {
  accountId: mockAccount.id,
  name: mockAccount.name,
  accountRole: 'member',
  workspaces: [
    {
      workspaceId: mockWorkspace.id,
      name: mockWorkspace.name,
      workspaceRole: 'admin',
      isDefault: true,
    },
  ],
};

const workspaceMemberMembership: MembershipAccount = {
  accountId: mockAccount.id,
  name: mockAccount.name,
  accountRole: 'member',
  workspaces: [
    {
      workspaceId: mockWorkspace.id,
      name: mockWorkspace.name,
      workspaceRole: 'member',
      isDefault: true,
    },
  ],
};

const accountAdminWorkspaceMemberMembership: MembershipAccount = {
  ...mockMemberships[0],
  accountRole: 'admin',
  workspaces: mockMemberships[0].workspaces.map((w) =>
    w.workspaceId === mockWorkspace.id ? { ...w, workspaceRole: 'member' as const } : w
  ),
};

export const rolePresets: Record<
  RolePreset,
  { memberships: MembershipAccount[]; account: typeof mockAccount; workspace: typeof mockWorkspace }
> = {
  accountAdminWorkspaceAdmin: {
    memberships: [mockMemberships[0]],
    account: mockAccount,
    workspace: mockWorkspace,
  },
  accountAdminWorkspaceMember: {
    memberships: [accountAdminWorkspaceMemberMembership],
    account: mockAccount,
    workspace: mockWorkspace,
  },
  accountMemberWorkspaceAdmin: {
    memberships: [workspaceAdminMembership],
    account: mockAccount,
    workspace: mockWorkspace,
  },
  accountMemberWorkspaceMember: {
    memberships: [workspaceMemberMembership],
    account: mockAccount,
    workspace: mockWorkspace,
  },
};

export function authStateForRole(preset: RolePreset) {
  const role = rolePresets[preset];
  return {
    user: mockUser,
    account: role.account,
    workspace: role.workspace,
    memberships: role.memberships,
    isAuthenticated: true,
    isLoading: false,
    authReady: true,
  };
}
