import mongoose from 'mongoose';
import {
  AccountMembership,
  User,
  VerificationToken,
  WorkspaceMembership,
} from '../models';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { generateInviteToken, hashToken } from '../utils/crypto';
import { sendEmail } from './emailService';
import {
  passwordResetEmailHtml,
  passwordResetEmailText,
  verificationEmailHtml,
  verificationEmailText,
} from './emailTemplates';
import type { AuthResult } from './authService';

async function createToken(userId: string, type: 'email_verification' | 'password_reset') {
  const expiryHours =
    type === 'email_verification'
      ? env.EMAIL_VERIFICATION_EXPIRY_HOURS
      : env.PASSWORD_RESET_EXPIRY_HOURS;

  await VerificationToken.deleteMany({ userId, type, usedAt: { $exists: false } });

  const rawToken = generateInviteToken();
  await VerificationToken.create({
    userId,
    type,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
  });

  return { rawToken, expiryHours };
}

async function activateUser(userId: string, session?: mongoose.ClientSession) {
  await User.updateOne(
    { _id: userId },
    { verificationStatus: 'verified' },
    session ? { session } : undefined
  );
  await AccountMembership.updateMany(
    { userId, status: 'unverified' },
    { status: 'verified' },
    session ? { session } : undefined
  );
  await WorkspaceMembership.updateMany(
    { userId, status: 'unverified' },
    { status: 'verified' },
    session ? { session } : undefined
  );
}

export async function sendEmailVerification(user: InstanceType<typeof User>) {
  const { rawToken, expiryHours } = await createToken(user._id.toString(), 'email_verification');
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your Task Manager account',
    html: verificationEmailHtml(user.name, verifyUrl, expiryHours),
    text: verificationEmailText(user.name, verifyUrl, expiryHours),
  });
}

export async function resendEmailVerification(email: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || user.verificationStatus === 'verified') {
    return;
  }

  await sendEmailVerification(user);
}

export async function validateEmailVerificationToken(rawToken: string) {
  const record = await VerificationToken.findOne({
    tokenHash: hashToken(rawToken),
    type: 'email_verification',
    usedAt: { $exists: false },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError(404, 'Invalid or expired verification link');
  }

  const user = await User.findById(record.userId);
  if (!user) throw new AppError(404, 'User not found');

  return {
    email: user.email,
    name: user.name,
    alreadyVerified: user.verificationStatus === 'verified',
  };
}

export async function verifyEmailAndLogin(
  rawToken: string,
  buildAuthResult: (
    user: InstanceType<typeof User>,
    accountId: string,
    workspaceId: string,
    accountRole: 'admin' | 'member',
    workspaceRole: 'admin' | 'member'
  ) => Promise<AuthResult>
): Promise<AuthResult> {
  const record = await VerificationToken.findOne({
    tokenHash: hashToken(rawToken),
    type: 'email_verification',
    usedAt: { $exists: false },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError(404, 'Invalid or expired verification link');
  }

  const user = await User.findById(record.userId);
  if (!user) throw new AppError(404, 'User not found');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await activateUser(user._id.toString(), session);
    record.usedAt = new Date();
    await record.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const refreshedUser = await User.findById(user._id);
  if (!refreshedUser) throw new AppError(404, 'User not found');

  const accountMembership = await AccountMembership.findOne({
    userId: user._id,
    status: 'verified',
  }).sort({ createdAt: 1 });

  if (!accountMembership) {
    throw new AppError(403, 'No account access found after verification');
  }

  const accountWorkspaces = await (await import('../models')).Workspace.find({
    accountId: accountMembership.accountId,
  }).select('_id isDefault');

  const workspaceIds = accountWorkspaces.map((workspace) => workspace._id);
  const workspaceMembership = await WorkspaceMembership.findOne({
    userId: user._id,
    workspaceId: { $in: workspaceIds },
    status: 'verified',
  }).sort({ createdAt: 1 });

  if (!workspaceMembership) {
    throw new AppError(403, 'No workspace access found after verification');
  }

  const defaultWorkspace =
    accountWorkspaces.find((workspace) => workspace.isDefault) ?? accountWorkspaces[0];

  const workspaceId =
    defaultWorkspace?._id.toString() ?? workspaceMembership.workspaceId.toString();

  return buildAuthResult(
    refreshedUser,
    accountMembership.accountId.toString(),
    workspaceId,
    accountMembership.accountRole,
    workspaceMembership.workspaceRole
  );
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    return false;
  }

  if (user.verificationStatus !== 'verified') {
    await sendEmailVerification(user);
    return true;
  }

  const { rawToken, expiryHours } = await createToken(user._id.toString(), 'password_reset');
  const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your Task Manager password',
    html: passwordResetEmailHtml(user.name, resetUrl, expiryHours),
    text: passwordResetEmailText(user.name, resetUrl, expiryHours),
  });

  return true;
}

export async function validatePasswordResetToken(rawToken: string) {
  const record = await VerificationToken.findOne({
    tokenHash: hashToken(rawToken),
    type: 'password_reset',
    usedAt: { $exists: false },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError(404, 'Invalid or expired reset link');
  }

  const user = await User.findById(record.userId);
  if (!user) throw new AppError(404, 'User not found');

  return { email: user.email, name: user.name };
}

export async function resetPassword(rawToken: string, password: string) {
  const record = await VerificationToken.findOne({
    tokenHash: hashToken(rawToken),
    type: 'password_reset',
    usedAt: { $exists: false },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError(404, 'Invalid or expired reset link');
  }

  const user = await User.findById(record.userId).select('+passwordHash');
  if (!user) throw new AppError(404, 'User not found');

  const { hashPassword } = await import('../utils/crypto');
  user.passwordHash = await hashPassword(password);
  await user.save();

  record.usedAt = new Date();
  await record.save();

  const { RefreshToken } = await import('../models');
  await RefreshToken.deleteMany({ userId: user._id });
}
