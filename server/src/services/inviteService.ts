import { env } from '../config/env';
import {
  Account,
  AccountMembership,
  Invitation,
  User,
  Workspace,
  WorkspaceMembership,
} from '../models';
import { AppError } from '../utils/errors';
import {
  generateInviteToken,
  hashPassword,
  hashToken,
} from '../utils/crypto';
import { sendEmail } from './emailService';
import { inviteEmailHtml, inviteEmailText } from './emailTemplates';
import { addToWorkspace } from './membershipService';

export async function sendWorkspaceInviteEmail(options: {
  to: string;
  inviteeName: string;
  inviteUrl: string;
  accountName: string;
  workspaceName: string;
  inviterName: string;
  expiresDays: number;
}) {
  const { to, inviteeName, inviteUrl, accountName, workspaceName, inviterName, expiresDays } =
    options;

  await sendEmail({
    to,
    subject: `You're invited to ${accountName} on Task Manager`,
    html: inviteEmailHtml(
      inviteeName,
      inviteUrl,
      accountName,
      workspaceName,
      inviterName,
      expiresDays
    ),
    text: inviteEmailText(
      inviteeName,
      inviteUrl,
      accountName,
      workspaceName,
      inviterName,
      expiresDays
    ),
  });
}

async function createAuthResultForUser(
  userId: string,
  accountId: string,
  workspaceId: string
) {
  const { User: UserModel, AccountMembership, WorkspaceMembership, RefreshToken } =
    await import('../models');
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const am = await AccountMembership.findOne({ userId, accountId, status: 'verified' });
  const wm = await WorkspaceMembership.findOne({ userId, workspaceId, status: 'verified' });
  if (!am || !wm) throw new AppError(403, 'Membership not found');

  const { signAccessToken, signRefreshToken } = await import('../utils/jwt');
  const { hashToken: ht } = await import('../utils/crypto');

  const payload = {
    userId: user._id.toString(),
    accountId,
    workspaceId,
    accountRole: am.accountRole,
    workspaceRole: wm.workspaceRole,
  };

  const accessToken = signAccessToken(payload);
  const refreshTokenSigned = signRefreshToken(user._id.toString());

  await RefreshToken.create({
    userId: user._id,
    tokenHash: ht(refreshTokenSigned),
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

export async function assertCanInviteToWorkspace(
  userId: string,
  accountId: string,
  workspaceId: string
) {
  const accountMembership = await AccountMembership.findOne({
    userId,
    accountId,
    status: 'verified',
  });
  if (!accountMembership) {
    throw new AppError(403, 'No access to this account');
  }

  if (accountMembership.accountRole === 'admin') return;

  const workspaceMembership = await WorkspaceMembership.findOne({
    userId,
    workspaceId,
    status: 'verified',
    workspaceRole: 'admin',
  });
  if (!workspaceMembership) {
    throw new AppError(403, 'Not authorized to invite to this workspace');
  }
}

export async function createInvite(
  invitedBy: string,
  accountId: string,
  workspaceId: string,
  email: string,
  name?: string
) {
  await assertCanInviteToWorkspace(invitedBy, accountId, workspaceId);

  const normalizedEmail = email.toLowerCase().trim();
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    accountId,
    status: { $ne: 'archived' },
  });
  if (!workspace) throw new AppError(404, 'Workspace not found');

  let user = await User.findOne({ email: normalizedEmail });

  if (user?.verificationStatus === 'verified') {
    await addToWorkspace({
      userId: user._id,
      workspaceId,
      workspaceRole: 'member',
      accountRole: 'member',
      status: 'verified',
    });

    return {
      type: 'added' as const,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accountId,
      workspaceId: workspace._id.toString(),
    };
  }

  if (!user) {
    user = await User.create({
      name: name ?? normalizedEmail.split('@')[0],
      email: normalizedEmail,
      verificationStatus: 'unverified',
    });
  } else if (name) {
    user.name = name;
    await user.save();
  }

  await addToWorkspace({
    userId: user._id,
    workspaceId,
    workspaceRole: 'member',
    accountRole: 'member',
    status: 'unverified',
  });

  const rawToken = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + env.INVITE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await Invitation.create({
    accountId,
    workspaceId,
    invitedBy,
    email: normalizedEmail,
    tokenHash: hashToken(rawToken),
    status: 'pending',
    expiresAt,
  });

  const inviteUrl = `${env.CLIENT_URL}/accept-invite/${rawToken}`;

  const account = await Account.findById(accountId);
  const inviter = await User.findById(invitedBy);
  const inviteeName = name ?? user.name;

  let emailSent = false;
  try {
    await sendWorkspaceInviteEmail({
      to: normalizedEmail,
      inviteeName,
      inviteUrl,
      accountName: account?.name ?? 'your team',
      workspaceName: workspace.name,
      inviterName: inviter?.name ?? 'A team admin',
      expiresDays: env.INVITE_TOKEN_EXPIRY_DAYS,
    });
    emailSent = true;
  } catch (error) {
    console.error('[invite] Failed to send invite email:', error);
  }

  return {
    type: 'pending' as const,
    inviteUrl,
    expiresAt,
    email: normalizedEmail,
    emailSent,
  };
}

export async function listInvites(
  accountId: string,
  requesterUserId: string,
  workspaceId?: string
) {
  const accountMembership = await AccountMembership.findOne({
    userId: requesterUserId,
    accountId,
    status: 'verified',
  });
  if (!accountMembership) {
    throw new AppError(403, 'No access to this account');
  }

  const filter: { accountId: string; status: 'pending'; workspaceId?: string } = {
    accountId,
    status: 'pending',
  };

  if (workspaceId) {
    await assertCanInviteToWorkspace(requesterUserId, accountId, workspaceId);
    filter.workspaceId = workspaceId;
  } else if (accountMembership.accountRole !== 'admin') {
    throw new AppError(403, 'Account admin access required');
  }

  return Invitation.find(filter).sort({ createdAt: -1 }).select('-tokenHash');
}

export async function revokeInvite(
  inviteId: string,
  accountId: string,
  requesterUserId: string
) {
  const invite = await Invitation.findOne({ _id: inviteId, accountId, status: 'pending' });
  if (!invite) throw new AppError(404, 'Invitation not found');
  await assertCanInviteToWorkspace(
    requesterUserId,
    accountId,
    invite.workspaceId.toString()
  );
  invite.status = 'revoked';
  await invite.save();
}

export async function validateInviteToken(rawToken: string) {
  const invite = await Invitation.findOne({
    tokenHash: hashToken(rawToken),
    status: 'pending',
  });

  if (!invite) throw new AppError(404, 'Invalid or expired invitation');
  if (invite.expiresAt < new Date()) {
    invite.status = 'expired';
    await invite.save();
    throw new AppError(410, 'Invitation has expired');
  }

  const account = await Account.findById(invite.accountId);
  const workspace = await Workspace.findById(invite.workspaceId);
  const user = await User.findOne({ email: invite.email });

  return {
    email: invite.email,
    accountName: account?.name ?? '',
    workspaceName: workspace?.name ?? '',
    inviteeName: user?.name,
  };
}

export async function acceptInvite(rawToken: string, name: string, password: string) {
  const invite = await Invitation.findOne({
    tokenHash: hashToken(rawToken),
    status: 'pending',
  });

  if (!invite) throw new AppError(404, 'Invalid or expired invitation');
  if (invite.expiresAt < new Date()) {
    invite.status = 'expired';
    await invite.save();
    throw new AppError(410, 'Invitation has expired');
  }

  const user = await User.findOne({ email: invite.email }).select('+passwordHash');
  if (!user) throw new AppError(404, 'User not found');

  user.name = name;
  user.passwordHash = await hashPassword(password);
  user.verificationStatus = 'verified';
  await user.save();

  const { AccountMembership, WorkspaceMembership } = await import('../models');
  await AccountMembership.updateOne(
    { userId: user._id, accountId: invite.accountId },
    { status: 'verified' }
  );
  await WorkspaceMembership.updateOne(
    { userId: user._id, workspaceId: invite.workspaceId },
    { status: 'verified' }
  );

  invite.status = 'accepted';
  await invite.save();

  return createAuthResultForUser(
    user._id.toString(),
    invite.accountId.toString(),
    invite.workspaceId.toString()
  );
}
