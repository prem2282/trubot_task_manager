import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  removeFromWorkspace,
  updateWorkspaceMemberRole,
} from '../membershipService';
import { AppError } from '../../utils/errors';

const workspaceId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const requesterId = '507f1f77bcf86cd799439013';

const mockMembership = {
  _id: new Types.ObjectId(),
  workspaceRole: 'admin' as const,
  save: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../models', () => ({
  Workspace: {
    findById: vi.fn(),
  },
  WorkspaceMembership: {
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

import { Workspace, WorkspaceMembership } from '../../models';

describe('membershipService role permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Workspace.findById).mockResolvedValue({ _id: workspaceId } as never);
  });

  describe('removeFromWorkspace', () => {
    it('rejects workspace members who are not admins', async () => {
      await expect(
        removeFromWorkspace(workspaceId, userId, requesterId, 'member', 'member')
      ).rejects.toMatchObject({ statusCode: 403, message: 'Not authorized to remove workspace members' });
    });

    it('allows workspace admins to remove non-admin members', async () => {
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({
        _id: new Types.ObjectId(),
        workspaceRole: 'member',
      } as never);
      vi.mocked(WorkspaceMembership.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

      await removeFromWorkspace(workspaceId, userId, requesterId, 'member', 'admin');

      expect(WorkspaceMembership.deleteOne).toHaveBeenCalled();
    });

    it('allows account admins to remove members even without workspace admin role', async () => {
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({
        _id: new Types.ObjectId(),
        workspaceRole: 'member',
      } as never);
      vi.mocked(WorkspaceMembership.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

      await removeFromWorkspace(workspaceId, userId, requesterId, 'admin', 'member');

      expect(WorkspaceMembership.deleteOne).toHaveBeenCalled();
    });

    it('prevents removing the last workspace admin', async () => {
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({
        _id: new Types.ObjectId(),
        workspaceRole: 'admin',
      } as never);
      vi.mocked(WorkspaceMembership.countDocuments).mockResolvedValue(1);

      await expect(
        removeFromWorkspace(workspaceId, userId, requesterId, 'member', 'admin')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'At least one workspace admin is required',
      });
    });
  });

  describe('updateWorkspaceMemberRole', () => {
    beforeEach(() => {
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({
        ...mockMembership,
        workspaceRole: 'admin',
      } as never);
    });

    it('rejects members without admin privileges', async () => {
      await expect(
        updateWorkspaceMemberRole(workspaceId, userId, 'member', 'member', 'member')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Not authorized to change workspace member roles',
      });
    });

    it('allows workspace admins to promote a member to admin', async () => {
      const membershipDoc = {
        workspaceRole: 'member' as const,
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue(membershipDoc as never);

      const membership = await updateWorkspaceMemberRole(
        workspaceId,
        userId,
        'admin',
        'member',
        'admin'
      );

      expect(membership.workspaceRole).toBe('admin');
      expect(membershipDoc.save).toHaveBeenCalled();
    });

    it('allows account admins to demote when multiple admins exist', async () => {
      const membershipDoc = {
        workspaceRole: 'admin' as const,
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue(membershipDoc as never);
      vi.mocked(WorkspaceMembership.countDocuments).mockResolvedValue(2);

      const membership = await updateWorkspaceMemberRole(
        workspaceId,
        userId,
        'member',
        'admin',
        'member'
      );

      expect(membership.workspaceRole).toBe('member');
    });

    it('prevents demoting the last workspace admin', async () => {
      vi.mocked(WorkspaceMembership.countDocuments).mockResolvedValue(1);

      await expect(
        updateWorkspaceMemberRole(workspaceId, userId, 'member', 'member', 'admin')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'At least one workspace admin is required',
      });
    });

    it('returns unchanged membership when role is already set', async () => {
      const existing = { ...mockMembership, workspaceRole: 'admin' as const };
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue(existing as never);

      const result = await updateWorkspaceMemberRole(
        workspaceId,
        userId,
        'admin',
        'member',
        'admin'
      );

      expect(result).toBe(existing);
      expect(mockMembership.save).not.toHaveBeenCalled();
    });
  });
});
