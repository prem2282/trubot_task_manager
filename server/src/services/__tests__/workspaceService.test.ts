import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  addWorkspaceMember,
  createWorkspace,
  listAccountMembers,
  listWorkspaceMembers,
  listWorkspaces,
} from '../workspaceService';

const userId = '507f1f77bcf86cd799439011';
const accountId = '507f1f77bcf86cd799439012';
const workspaceId = '507f1f77bcf86cd799439013';
const targetUserId = '507f1f77bcf86cd799439014';

vi.mock('../membershipService', () => ({
  addToWorkspace: vi.fn().mockResolvedValue(undefined),
  updateWorkspaceMemberRole: vi.fn(),
}));

vi.mock('../../models', () => ({
  AccountMembership: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
  WorkspaceMembership: {
    find: vi.fn(),
  },
  Workspace: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  User: {
    findById: vi.fn(),
  },
}));

import { AccountMembership, WorkspaceMembership, Workspace, User } from '../../models';
import { addToWorkspace } from '../membershipService';

describe('workspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWorkspaces', () => {
    it('returns only verified workspaces in the active account', async () => {
      vi.mocked(WorkspaceMembership.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            workspaceRole: 'admin',
            workspaceId: {
              _id: new Types.ObjectId(workspaceId),
              name: 'Default Workspace',
              isDefault: true,
              accountId: new Types.ObjectId(accountId),
            },
          },
          {
            workspaceRole: 'member',
            workspaceId: null,
          },
        ]),
      } as never);

      const workspaces = await listWorkspaces(userId, accountId);

      expect(workspaces).toEqual([
        {
          id: workspaceId,
          name: 'Default Workspace',
          isDefault: true,
          workspaceRole: 'admin',
        },
      ]);
    });
  });

  describe('createWorkspace', () => {
    it('requires account admin membership', async () => {
      vi.mocked(AccountMembership.findOne).mockResolvedValue(null);

      await expect(createWorkspace(userId, accountId, 'New Space')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only account admins can create workspaces',
      });
    });

    it('rejects duplicate workspace names within an account', async () => {
      vi.mocked(AccountMembership.findOne).mockResolvedValue({ accountRole: 'admin' } as never);
      vi.mocked(Workspace.findOne).mockResolvedValue({ name: 'Duplicate' } as never);

      await expect(createWorkspace(userId, accountId, 'Duplicate')).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('creates a workspace and adds the creator as admin', async () => {
      vi.mocked(AccountMembership.findOne).mockResolvedValue({ accountRole: 'admin' } as never);
      vi.mocked(Workspace.findOne).mockResolvedValue(null);
      vi.mocked(Workspace.create).mockResolvedValue({
        _id: new Types.ObjectId(workspaceId),
        name: 'Engineering',
        isDefault: false,
      } as never);

      const workspace = await createWorkspace(userId, accountId, 'Engineering');

      expect(workspace).toMatchObject({
        id: workspaceId,
        name: 'Engineering',
        workspaceRole: 'admin',
      });
      expect(addToWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceRole: 'admin',
          status: 'verified',
        })
      );
    });
  });

  describe('listWorkspaceMembers', () => {
    it('returns 404 when workspace is outside the account', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue(null);

      await expect(listWorkspaceMembers(workspaceId, accountId)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('maps verified members with roles', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({ _id: workspaceId } as never);
      vi.mocked(WorkspaceMembership.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            workspaceRole: 'admin',
            userId: {
              _id: new Types.ObjectId(userId),
              name: 'Jane Doe',
              email: 'jane@example.com',
            },
          },
        ]),
      } as never);

      const members = await listWorkspaceMembers(workspaceId, accountId);

      expect(members).toEqual([
        {
          userId,
          name: 'Jane Doe',
          email: 'jane@example.com',
          workspaceRole: 'admin',
        },
      ]);
    });
  });

  describe('addWorkspaceMember', () => {
    it('requires admin privileges on the workspace or account', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({ _id: workspaceId } as never);

      await expect(
        addWorkspaceMember(workspaceId, accountId, targetUserId, 'member', 'member')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Not authorized to add workspace members',
      });
    });

    it('requires the target to be a verified account member', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({ _id: workspaceId } as never);
      vi.mocked(User.findById).mockResolvedValue({
        verificationStatus: 'verified',
      } as never);
      vi.mocked(AccountMembership.findOne).mockResolvedValue(null);

      await expect(
        addWorkspaceMember(workspaceId, accountId, targetUserId, 'admin', 'member')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'User must be a verified account member first',
      });
    });

    it('adds verified account members as workspace members', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({ _id: workspaceId } as never);
      vi.mocked(User.findById).mockResolvedValue({
        _id: new Types.ObjectId(targetUserId),
        name: 'Bob Smith',
        email: 'bob@example.com',
        verificationStatus: 'verified',
      } as never);
      vi.mocked(AccountMembership.findOne).mockResolvedValue({ status: 'verified' } as never);

      const member = await addWorkspaceMember(
        workspaceId,
        accountId,
        targetUserId,
        'member',
        'admin'
      );

      expect(member.workspaceRole).toBe('member');
      expect(addToWorkspace).toHaveBeenCalled();
    });
  });

  describe('listAccountMembers', () => {
    it('returns account roles and verification status', async () => {
      vi.mocked(AccountMembership.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            accountRole: 'admin',
            status: 'verified',
            userId: {
              _id: new Types.ObjectId(userId),
              name: 'Jane Doe',
              email: 'jane@example.com',
              verificationStatus: 'verified',
            },
          },
        ]),
      } as never);

      const members = await listAccountMembers(accountId);

      expect(members[0]).toMatchObject({
        userId,
        accountRole: 'admin',
        status: 'verified',
        verificationStatus: 'verified',
      });
    });
  });
});
