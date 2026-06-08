import type { Express } from 'express';
import request from 'supertest';
import {
  Account,
  AccountMembership,
  User,
  Workspace,
  WorkspaceMembership,
} from '../models';
import { hashPassword } from '../utils/crypto';

export interface SeededUserContext {
  userId: string;
  email: string;
  password: string;
  name: string;
  accountId: string;
  accountName: string;
  workspaceId: string;
  workspaceName: string;
  accountRole: 'admin' | 'member';
  workspaceRole: 'admin' | 'member';
  accessToken: string;
}

export interface SeedUserOptions {
  email: string;
  password?: string;
  name?: string;
  accountName?: string;
  workspaceName?: string;
  accountRole?: 'admin' | 'member';
  workspaceRole?: 'admin' | 'member';
}

export async function seedVerifiedUser(
  app: Express,
  options: SeedUserOptions
): Promise<SeededUserContext> {
  const password = options.password ?? 'password123';
  const name = options.name ?? 'Test User';
  const accountName = options.accountName ?? 'Test Account';
  const workspaceName = options.workspaceName ?? 'Default Workspace';
  const accountRole = options.accountRole ?? 'admin';
  const workspaceRole = options.workspaceRole ?? 'admin';

  const passwordHash = await hashPassword(password);
  const account = await Account.create({ name: accountName });
  const workspace = await Workspace.create({
    accountId: account._id,
    name: workspaceName,
    isDefault: true,
  });
  const user = await User.create({
    name,
    email: options.email.toLowerCase(),
    passwordHash,
    verificationStatus: 'verified',
  });

  await AccountMembership.create({
    userId: user._id,
    accountId: account._id,
    accountRole,
    status: 'verified',
  });
  await WorkspaceMembership.create({
    userId: user._id,
    workspaceId: workspace._id,
    workspaceRole,
    status: 'verified',
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: options.email, password });

  if (loginRes.status !== 200) {
    throw new Error(`Failed to seed login for ${options.email}: ${JSON.stringify(loginRes.body)}`);
  }

  return {
    userId: user._id.toString(),
    email: user.email,
    password,
    name: user.name,
    accountId: account._id.toString(),
    accountName: account.name,
    workspaceId: workspace._id.toString(),
    workspaceName: workspace.name,
    accountRole,
    workspaceRole,
    accessToken: loginRes.body.data.accessToken,
  };
}

export function withAuth(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function seedMemberInAccount(
  app: Express,
  accountId: string,
  workspaceId: string,
  options: SeedUserOptions
): Promise<SeededUserContext> {
  const password = options.password ?? 'password123';
  const name = options.name ?? 'Member User';
  const accountRole = options.accountRole ?? 'member';
  const workspaceRole = options.workspaceRole ?? 'member';
  const passwordHash = await hashPassword(password);

  const account = await Account.findById(accountId);
  const workspace = await Workspace.findById(workspaceId);
  if (!account || !workspace) {
    throw new Error('Account or workspace not found for seedMemberInAccount');
  }

  const user = await User.create({
    name,
    email: options.email.toLowerCase(),
    passwordHash,
    verificationStatus: 'verified',
  });

  await AccountMembership.create({
    userId: user._id,
    accountId,
    accountRole,
    status: 'verified',
  });
  await WorkspaceMembership.create({
    userId: user._id,
    workspaceId,
    workspaceRole,
    status: 'verified',
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: options.email, password });

  return {
    userId: user._id.toString(),
    email: user.email,
    password,
    name: user.name,
    accountId,
    accountName: account.name,
    workspaceId,
    workspaceName: workspace.name,
    accountRole,
    workspaceRole,
    accessToken: loginRes.body.data.accessToken,
  };
}
