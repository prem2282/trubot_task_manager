import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  acceptInvite,
  createInvite,
  listInvites,
  revokeInvite,
  validateInviteToken,
} from '../inviteService';

const accountId = '507f1f77bcf86cd799439012';
const workspaceId = '507f1f77bcf86cd799439013';
const userId = '507f1f77bcf86cd799439011';
const inviteId = '507f1f77bcf86cd799439014';

vi.mock('../membershipService', () => ({
  addToWorkspace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/crypto')>();
  return {
    ...actual,
    generateInviteToken: vi.fn(() => 'raw-invite-token'),
    hashToken: vi.fn((value: string) => `hash:${value}`),
    hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  };
});

vi.mock('../../utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(() => 'refresh-token'),
}));

vi.mock('../../models', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
  Account: { findById: vi.fn() },
  Workspace: { findOne: vi.fn(), findById: vi.fn() },
  Invitation: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
  AccountMembership: { findOne: vi.fn(), updateOne: vi.fn() },
  WorkspaceMembership: { findOne: vi.fn(), updateOne: vi.fn() },
  RefreshToken: { create: vi.fn() },
}));

import { User, Workspace, Invitation, Account, AccountMembership } from '../../models';
import { addToWorkspace } from '../membershipService';
import { sendEmail } from '../emailService';

describe('inviteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AccountMembership.findOne).mockResolvedValue({ accountRole: 'admin' } as never);
  });

  describe('createInvite', () => {
    it('returns immediate add result for verified users', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({
        _id: new Types.ObjectId(workspaceId),
      } as never);
      vi.mocked(User.findOne).mockResolvedValue({
        _id: new Types.ObjectId(userId),
        name: 'Existing User',
        email: 'existing@example.com',
        verificationStatus: 'verified',
      } as never);

      const result = await createInvite(
        userId,
        accountId,
        workspaceId,
        'existing@example.com'
      );

      expect(result.type).toBe('added');
      expect(addToWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceRole: 'member',
          status: 'verified',
        })
      );
      expect(Invitation.create).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('creates a pending invitation for new users and sends invite email', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({
        _id: new Types.ObjectId(workspaceId),
        name: 'Engineering',
      } as never);
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(User.create).mockResolvedValue({
        _id: new Types.ObjectId(userId),
        name: 'New User',
        email: 'new@example.com',
      } as never);
      vi.mocked(User.findById).mockResolvedValue({ name: 'Admin User' } as never);
      vi.mocked(Account.findById).mockResolvedValue({ name: 'Acme Corp' } as never);
      vi.mocked(Invitation.create).mockResolvedValue({} as never);

      const result = await createInvite(userId, accountId, workspaceId, 'new@example.com', 'New User');

      expect(result.type).toBe('pending');
      expect(result.emailSent).toBe(true);
      expect(result.inviteUrl).toContain('/accept-invite/raw-invite-token');
      expect(Invitation.create).toHaveBeenCalled();
      expect(addToWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'unverified' })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          subject: expect.stringContaining('Acme Corp'),
        })
      );
    });

    it('still returns invite link when invite email fails to send', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue({
        _id: new Types.ObjectId(workspaceId),
        name: 'Engineering',
      } as never);
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(User.create).mockResolvedValue({
        _id: new Types.ObjectId(userId),
        name: 'New User',
        email: 'new@example.com',
      } as never);
      vi.mocked(User.findById).mockResolvedValue({ name: 'Admin User' } as never);
      vi.mocked(Account.findById).mockResolvedValue({ name: 'Acme Corp' } as never);
      vi.mocked(Invitation.create).mockResolvedValue({} as never);
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error('SMTP unavailable'));

      const result = await createInvite(userId, accountId, workspaceId, 'new@example.com', 'New User');

      expect(result.type).toBe('pending');
      expect(result.emailSent).toBe(false);
      expect(result.inviteUrl).toContain('/accept-invite/raw-invite-token');
    });

    it('rejects invites to workspaces outside the account', async () => {
      vi.mocked(Workspace.findOne).mockResolvedValue(null);

      await expect(
        createInvite(userId, accountId, workspaceId, 'new@example.com')
      ).rejects.toMatchObject({ statusCode: 404, message: 'Workspace not found' });
    });
  });

  describe('validateInviteToken', () => {
    it('returns invite preview details for valid tokens', async () => {
      vi.mocked(Invitation.findOne).mockResolvedValue({
        email: 'invitee@example.com',
        expiresAt: new Date(Date.now() + 60_000),
        accountId: new Types.ObjectId(accountId),
        workspaceId: new Types.ObjectId(workspaceId),
        save: vi.fn(),
      } as never);
      vi.mocked(Account.findById).mockResolvedValue({ name: 'Acme' } as never);
      vi.mocked(Workspace.findById).mockResolvedValue({ name: 'Default Workspace' } as never);
      vi.mocked(User.findOne).mockResolvedValue({ name: 'Invitee' } as never);

      const result = await validateInviteToken('raw-invite-token');

      expect(result).toEqual({
        email: 'invitee@example.com',
        accountName: 'Acme',
        workspaceName: 'Default Workspace',
        inviteeName: 'Invitee',
      });
    });

    it('marks expired invitations and returns 410', async () => {
      const invite = {
        email: 'invitee@example.com',
        expiresAt: new Date(Date.now() - 60_000),
        save: vi.fn(),
      };
      vi.mocked(Invitation.findOne).mockResolvedValue(invite as never);

      await expect(validateInviteToken('expired-token')).rejects.toMatchObject({
        statusCode: 410,
      });
      expect(invite.save).toHaveBeenCalled();
    });
  });

  describe('revokeInvite', () => {
    it('revokes pending invitations for the account', async () => {
      const invite = {
        status: 'pending',
        workspaceId: new Types.ObjectId(workspaceId),
        save: vi.fn(),
      };
      vi.mocked(Invitation.findOne).mockResolvedValue(invite as never);

      await revokeInvite(inviteId, accountId, userId);

      expect(invite.status).toBe('revoked');
      expect(invite.save).toHaveBeenCalled();
    });

    it('returns 404 when invite is missing', async () => {
      vi.mocked(Invitation.findOne).mockResolvedValue(null);

      await expect(revokeInvite(inviteId, accountId, userId)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('listInvites', () => {
    it('lists pending invites without token hashes', async () => {
      const chain = {
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([{ email: 'a@example.com' }]),
      };
      vi.mocked(Invitation.find).mockReturnValue(chain as never);

      const invites = await listInvites(accountId, userId);

      expect(invites).toHaveLength(1);
      expect(chain.select).toHaveBeenCalledWith('-tokenHash');
    });
  });

  describe('acceptInvite', () => {
    it('verifies the user and returns auth tokens', async () => {
      const invite = {
        email: 'invitee@example.com',
        expiresAt: new Date(Date.now() + 60_000),
        accountId: new Types.ObjectId(accountId),
        workspaceId: new Types.ObjectId(workspaceId),
        status: 'pending',
        save: vi.fn(),
      };
      const user = {
        _id: new Types.ObjectId(userId),
        email: 'invitee@example.com',
        name: 'Old Name',
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Invitation.findOne).mockResolvedValue(invite as never);
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      } as never);

      const { AccountMembership, WorkspaceMembership, RefreshToken } = await import('../../models');
      vi.mocked(AccountMembership.updateOne).mockResolvedValue({} as never);
      vi.mocked(WorkspaceMembership.updateOne).mockResolvedValue({} as never);
      vi.mocked(User.findById).mockResolvedValue({
        _id: new Types.ObjectId(userId),
        name: 'Invitee Name',
        email: 'invitee@example.com',
      } as never);
      vi.mocked(AccountMembership.findOne).mockResolvedValue({
        accountRole: 'member',
      } as never);
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({
        workspaceRole: 'member',
      } as never);
      vi.mocked(Account.findById).mockResolvedValue({ name: 'Acme' } as never);
      vi.mocked(Workspace.findById).mockResolvedValue({ name: 'Default Workspace' } as never);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as never);

      const result = await acceptInvite('raw-invite-token', 'Invitee Name', 'password123');

      expect(user.verificationStatus).toBe('verified');
      expect(invite.status).toBe('accepted');
      expect(result.accessToken).toBe('access-token');
    });
  });
});
