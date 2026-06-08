import mongoose from 'mongoose';
import {
  Account,
  AccountMembership,
  RefreshToken,
  User,
  Workspace,
  WorkspaceMembership,
} from '../models';
import { JwtPayload, MembershipAccount } from '../types';
import { hashPassword, comparePassword, hashToken, generateRefreshToken } from '../utils/crypto';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/errors';
import { getUserMemberships, validateContextAccess } from './membershipService';

const DEFAULT_WORKSPACE_NAME = 'Default Workspace';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  accountName?: string;
}

export interface RegisterResult {
  requiresVerification: true;
  email: string;
  message: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
  account: { id: string; name: string };
  workspace: { id: string; name: string };
  payload: JwtPayload;
}

async function buildAuthResult(
  user: InstanceType<typeof User>,
  accountId: string,
  workspaceId: string,
  accountRole: 'admin' | 'member',
  workspaceRole: 'admin' | 'member'
): Promise<AuthResult> {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    accountId,
    workspaceId,
    accountRole,
    workspaceRole,
  };

  const accessToken = signAccessToken(payload);
  const refreshTokenRaw = generateRefreshToken();
  const refreshTokenSigned = signRefreshToken(user._id.toString());

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshTokenSigned),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const account = await Account.findById(accountId);
  const workspace = await Workspace.findById(workspaceId);

  return {
    accessToken,
    refreshToken: refreshTokenSigned,
    user: { id: user._id.toString(), name: user.name, email: user.email },
    account: { id: accountId, name: account?.name ?? '' },
    workspace: { id: workspaceId, name: workspace?.name ?? '' },
    payload,
  };
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing?.verificationStatus === 'verified') {
    throw new AppError(409, 'Email already registered');
  }

  if (existing) {
    throw new AppError(
      409,
      'Email already in use. Check your inbox for a verification or invitation link.'
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const passwordHash = await hashPassword(input.password);
    const accountName = input.accountName ?? `${input.name}'s Account`;

    const [account] = await Account.create([{ name: accountName }], { session });
    const [workspace] = await Workspace.create(
      [{ accountId: account._id, name: DEFAULT_WORKSPACE_NAME, isDefault: true }],
      { session }
    );

    const [user] = await User.create(
      [
        {
          name: input.name,
          email: normalizedEmail,
          passwordHash,
          verificationStatus: 'unverified',
        },
      ],
      { session }
    );

    await AccountMembership.create(
      [{ userId: user._id, accountId: account._id, accountRole: 'admin', status: 'unverified' }],
      { session }
    );
    await WorkspaceMembership.create(
      [
        {
          userId: user._id,
          workspaceId: workspace._id,
          workspaceRole: 'admin',
          status: 'unverified',
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const { sendEmailVerification } = await import('./verificationService');
    await sendEmailVerification(user);

    return {
      requiresVerification: true,
      email: user.email,
      message: 'Registration successful. Check your email to verify your account.',
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (user.verificationStatus !== 'verified') {
    if (user.passwordHash) {
      throw new AppError(
        403,
        'Please verify your email before logging in. Check your inbox for the verification link.'
      );
    }
    throw new AppError(403, 'Please complete your invitation before logging in');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const memberships = await getUserMemberships(user._id.toString());
  if (memberships.length === 0) {
    throw new AppError(403, 'No account access found');
  }

  const defaultAccount =
    memberships.find((m) => m.accountRole === 'admin') ?? memberships[0];
  const defaultWorkspace =
    defaultAccount.workspaces.find((w) => w.isDefault) ?? defaultAccount.workspaces[0];

  return buildAuthResult(
    user,
    defaultAccount.accountId,
    defaultWorkspace.workspaceId,
    defaultAccount.accountRole,
    defaultWorkspace.workspaceRole
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { verifyRefreshToken } = await import('../utils/jwt');
  const { userId } = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await RefreshToken.findOne({ userId, tokenHash });
  if (!stored) throw new AppError(401, 'Invalid refresh token');

  const user = await User.findById(userId);
  if (!user || user.verificationStatus !== 'verified') {
    throw new AppError(401, 'User not found or not verified');
  }

  const memberships = await getUserMemberships(userId);
  if (memberships.length === 0) throw new AppError(403, 'No account access');

  const account = memberships[0];
  const workspace = account.workspaces[0];

  const payload: JwtPayload = {
    userId,
    accountId: account.accountId,
    workspaceId: workspace.workspaceId,
    accountRole: account.accountRole,
    workspaceRole: workspace.workspaceRole,
  };

  await RefreshToken.deleteOne({ _id: stored._id });
  const newRefreshRaw = signRefreshToken(userId);
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(newRefreshRaw),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken: signAccessToken(payload),
    refreshToken: newRefreshRaw,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const { verifyRefreshToken } = await import('../utils/jwt');
    const { userId } = verifyRefreshToken(refreshToken);
    await RefreshToken.deleteOne({ userId, tokenHash: hashToken(refreshToken) });
  } catch {
    // ignore invalid tokens on logout
  }
}

export async function switchContext(
  userId: string,
  accountId: string,
  workspaceId: string
): Promise<AuthResult> {
  const user = await User.findById(userId);
  if (!user || user.verificationStatus !== 'verified') {
    throw new AppError(403, 'User not verified');
  }

  const { accountMembership, workspaceMembership } = await validateContextAccess(
    userId,
    accountId,
    workspaceId
  );

  return buildAuthResult(
    user,
    accountId,
    workspaceId,
    accountMembership.accountRole,
    workspaceMembership.workspaceRole
  );
}

export async function getMe(userId: string, payload: JwtPayload) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const account = await Account.findById(payload.accountId);
  const workspace = await Workspace.findById(payload.workspaceId);

  return {
    user: { id: user._id.toString(), name: user.name, email: user.email },
    account: account ? { id: account._id.toString(), name: account.name } : null,
    workspace: workspace ? { id: workspace._id.toString(), name: workspace.name } : null,
    roles: {
      accountRole: payload.accountRole,
      workspaceRole: payload.workspaceRole,
    },
  };
}

export async function listMemberships(userId: string): Promise<MembershipAccount[]> {
  return getUserMemberships(userId);
}

export async function verifyEmail(rawToken: string): Promise<AuthResult> {
  const { verifyEmailAndLogin } = await import('./verificationService');
  return verifyEmailAndLogin(rawToken, buildAuthResult);
}
