import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { login, logout, register, switchContext } from '../authService';

const userId = '507f1f77bcf86cd799439011';
const accountId = '507f1f77bcf86cd799439012';
const workspaceId = '507f1f77bcf86cd799439013';

vi.mock('../../models', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
  Account: { findById: vi.fn(), create: vi.fn() },
  Workspace: { findById: vi.fn(), create: vi.fn(), findOne: vi.fn() },
  RefreshToken: {
    create: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
  AccountMembership: { create: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() },
  WorkspaceMembership: { create: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() },
  Invitation: { create: vi.fn(), findOne: vi.fn(), find: vi.fn() },
}));

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: vi.fn(),
    },
  };
});

vi.mock('../../utils/crypto', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  comparePassword: vi.fn(),
  hashToken: vi.fn((value: string) => `hash:${value}`),
  generateRefreshToken: vi.fn(() => 'raw-refresh-token'),
}));

vi.mock('../../utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(() => 'refresh-token'),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('../membershipService', () => ({
  getUserMemberships: vi.fn(),
  validateContextAccess: vi.fn(),
}));

vi.mock('../verificationService', () => ({
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

import mongoose from 'mongoose';
import { User } from '../../models';
import { comparePassword } from '../../utils/crypto';
import { getUserMemberships, validateContextAccess } from '../membershipService';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('rejects already verified emails', async () => {
      vi.mocked(User.findOne).mockResolvedValue({
        verificationStatus: 'verified',
      } as never);

      await expect(
        register({
          name: 'Jane',
          email: 'Jane@Example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({ statusCode: 409, message: 'Email already registered' });
    });

    it('rejects pending unverified emails with guidance', async () => {
      vi.mocked(User.findOne).mockResolvedValue({
        verificationStatus: 'unverified',
      } as never);

      await expect(
        register({
          name: 'Jane',
          email: 'jane@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('creates account scaffolding and sends verification for new users', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);

      const session = {
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };
      vi.mocked(mongoose.startSession).mockResolvedValue(session as never);

      const { Account, Workspace, User: UserModel, AccountMembership, WorkspaceMembership } =
        await import('../../models');

      vi.mocked(Account.create).mockResolvedValue([{ _id: new Types.ObjectId(accountId) }] as never);
      vi.mocked(Workspace.create).mockResolvedValue([
        { _id: new Types.ObjectId(workspaceId), name: 'Default Workspace', isDefault: true },
      ] as never);
      vi.mocked(UserModel.create).mockResolvedValue([
        { _id: new Types.ObjectId(userId), email: 'jane@example.com' },
      ] as never);
      vi.mocked(AccountMembership.create).mockResolvedValue([] as never);
      vi.mocked(WorkspaceMembership.create).mockResolvedValue([] as never);

      const { sendEmailVerification } = await import('../verificationService');

      const result = await register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      expect(result.requiresVerification).toBe(true);
      expect(result.email).toBe('jane@example.com');
      expect(sendEmailVerification).toHaveBeenCalled();
      expect(session.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects unknown credentials', async () => {
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      } as never);

      await expect(login('jane@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('blocks unverified users', async () => {
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(userId),
          verificationStatus: 'unverified',
          passwordHash: 'hash',
        }),
      } as never);

      await expect(login('jane@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('rejects invalid passwords for verified users', async () => {
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(userId),
          verificationStatus: 'verified',
          passwordHash: 'hash',
          name: 'Jane',
          email: 'jane@example.com',
        }),
      } as never);
      vi.mocked(comparePassword).mockResolvedValue(false);

      await expect(login('jane@example.com', 'wrong-password')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('returns tokens for verified users with memberships', async () => {
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(userId),
          verificationStatus: 'verified',
          passwordHash: 'hash',
          name: 'Jane Doe',
          email: 'jane@example.com',
        }),
      } as never);
      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(getUserMemberships).mockResolvedValue([
        {
          accountId,
          name: 'Acme',
          accountRole: 'admin',
          workspaces: [
            {
              workspaceId,
              name: 'Default Workspace',
              workspaceRole: 'admin',
              isDefault: true,
            },
          ],
        },
      ]);

      const { Account, Workspace, RefreshToken } = await import('../../models');
      vi.mocked(Account.findById).mockResolvedValue({ name: 'Acme' } as never);
      vi.mocked(Workspace.findById).mockResolvedValue({ name: 'Default Workspace' } as never);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as never);

      const result = await login('jane@example.com', 'password123');

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('jane@example.com');
      expect(result.account.id).toBe(accountId);
    });
  });

  describe('switchContext', () => {
    it('requires a verified user', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        verificationStatus: 'unverified',
      } as never);

      await expect(switchContext(userId, accountId, workspaceId)).rejects.toMatchObject({
        statusCode: 403,
        message: 'User not verified',
      });
    });

    it('issues a new token for valid account/workspace membership', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: new Types.ObjectId(userId),
        verificationStatus: 'verified',
        name: 'Jane Doe',
        email: 'jane@example.com',
      } as never);
      vi.mocked(validateContextAccess).mockResolvedValue({
        accountMembership: { accountRole: 'member' },
        workspaceMembership: { workspaceRole: 'admin' },
      } as never);

      const { Account, Workspace, RefreshToken } = await import('../../models');
      vi.mocked(Account.findById).mockResolvedValue({ name: 'Acme' } as never);
      vi.mocked(Workspace.findById).mockResolvedValue({ name: 'Default Workspace' } as never);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as never);

      const result = await switchContext(userId, accountId, workspaceId);

      expect(result.payload.workspaceRole).toBe('admin');
      expect(result.workspace.id).toBe(workspaceId);
    });
  });

  describe('logout', () => {
    it('swallows invalid refresh tokens', async () => {
      const { verifyRefreshToken } = await import('../../utils/jwt');
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new Error('bad token');
      });

      await expect(logout('invalid')).resolves.toBeUndefined();
    });
  });
});
