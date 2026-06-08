import { describe, it, expect } from 'vitest';
import { isWorkspaceAdmin } from '../authStore';
import { mockAccount, mockMemberships, mockWorkspace } from '../../test/fixtures';
import { authStateForRole } from '../../test/roleFixtures';

describe('isWorkspaceAdmin', () => {
  it('returns true for account admins regardless of workspace role', () => {
    const { memberships } = authStateForRole('accountAdminWorkspaceMember');
    expect(isWorkspaceAdmin(memberships, mockAccount.id, mockWorkspace.id)).toBe(true);
  });

  it('returns true for workspace admins who are account members', () => {
    const { memberships } = authStateForRole('accountMemberWorkspaceAdmin');
    expect(isWorkspaceAdmin(memberships, mockAccount.id, mockWorkspace.id)).toBe(true);
  });

  it('returns false for plain workspace members', () => {
    const { memberships } = authStateForRole('accountMemberWorkspaceMember');
    expect(isWorkspaceAdmin(memberships, mockAccount.id, mockWorkspace.id)).toBe(false);
  });

  it('returns false when account or workspace id is missing', () => {
    expect(isWorkspaceAdmin(mockMemberships, undefined, mockWorkspace.id)).toBe(false);
    expect(isWorkspaceAdmin(mockMemberships, mockAccount.id, undefined)).toBe(false);
  });
});
