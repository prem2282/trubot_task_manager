import { Types } from 'mongoose';
import { AccountMembership, Workspace, WorkspaceMembership, User } from '../models';
import { AppError } from '../utils/errors';
import { addToWorkspace, updateWorkspaceMemberRole as changeWorkspaceMemberRole } from './membershipService';

export async function listWorkspaces(userId: string, accountId: string) {
  const workspaceMemberships = await WorkspaceMembership.find({
    userId,
    status: 'verified',
  }).populate({
    path: 'workspaceId',
    match: { accountId: new Types.ObjectId(accountId) },
  });

  return workspaceMemberships
    .filter((wm) => wm.workspaceId)
    .map((wm) => {
      const ws = wm.workspaceId as unknown as {
        _id: Types.ObjectId;
        name: string;
        isDefault: boolean;
        accountId: Types.ObjectId;
      };
      return {
        id: ws._id.toString(),
        name: ws.name,
        isDefault: ws.isDefault,
        workspaceRole: wm.workspaceRole,
      };
    });
}

export async function createWorkspace(
  userId: string,
  accountId: string,
  name: string
) {
  const accountMembership = await AccountMembership.findOne({
    userId,
    accountId,
    accountRole: 'admin',
    status: 'verified',
  });
  if (!accountMembership) {
    throw new AppError(403, 'Only account admins can create workspaces');
  }

  const existing = await Workspace.findOne({ accountId, name });
  if (existing) throw new AppError(409, 'Workspace name already exists in this account');

  const workspace = await Workspace.create({
    accountId,
    name,
    isDefault: false,
  });

  await addToWorkspace({
    userId,
    workspaceId: workspace._id,
    workspaceRole: 'admin',
    accountRole: 'admin',
    status: 'verified',
  });

  return {
    id: workspace._id.toString(),
    name: workspace.name,
    isDefault: workspace.isDefault,
    workspaceRole: 'admin' as const,
  };
}

export async function listWorkspaceMembers(workspaceId: string, accountId: string) {
  const workspace = await Workspace.findOne({ _id: workspaceId, accountId });
  if (!workspace) throw new AppError(404, 'Workspace not found');

  const memberships = await WorkspaceMembership.find({
    workspaceId,
    status: 'verified',
  }).populate('userId', 'name email');

  return memberships.map((m) => {
    const user = m.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
    return {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      workspaceRole: m.workspaceRole,
    };
  });
}

export async function addWorkspaceMember(
  workspaceId: string,
  accountId: string,
  targetUserId: string,
  requesterAccountRole: string,
  requesterWorkspaceRole: string
) {
  const workspace = await Workspace.findOne({ _id: workspaceId, accountId });
  if (!workspace) throw new AppError(404, 'Workspace not found');

  const isAccountAdmin = requesterAccountRole === 'admin';
  const isWorkspaceAdmin = requesterWorkspaceRole === 'admin';
  if (!isAccountAdmin && !isWorkspaceAdmin) {
    throw new AppError(403, 'Not authorized to add workspace members');
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser || targetUser.verificationStatus !== 'verified') {
    throw new AppError(400, 'User must be verified to add to workspace');
  }

  const accountMember = await AccountMembership.findOne({
    userId: targetUserId,
    accountId,
    status: 'verified',
  });
  if (!accountMember) {
    throw new AppError(400, 'User must be a verified account member first');
  }

  await addToWorkspace({
    userId: targetUserId,
    workspaceId,
    workspaceRole: 'member',
    status: 'verified',
  });

  return {
    userId: targetUser._id.toString(),
    name: targetUser.name,
    email: targetUser.email,
    workspaceRole: 'member' as const,
  };
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  accountId: string,
  targetUserId: string,
  workspaceRole: 'admin' | 'member',
  requesterAccountRole: string,
  requesterWorkspaceRole: string
) {
  const workspace = await Workspace.findOne({ _id: workspaceId, accountId });
  if (!workspace) throw new AppError(404, 'Workspace not found');

  const membership = await changeWorkspaceMemberRole(
    workspaceId,
    targetUserId,
    workspaceRole,
    requesterAccountRole as 'admin' | 'member',
    requesterWorkspaceRole as 'admin' | 'member'
  );

  const user = await User.findById(targetUserId);
  if (!user) throw new AppError(404, 'User not found');

  return {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    workspaceRole: membership.workspaceRole,
  };
}

export async function listAccountMembers(accountId: string) {
  const memberships = await AccountMembership.find({ accountId }).populate(
    'userId',
    'name email verificationStatus'
  );

  return memberships.map((m) => {
    const user = m.userId as unknown as {
      _id: Types.ObjectId;
      name: string;
      email: string;
      verificationStatus: string;
    };
    return {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      accountRole: m.accountRole,
      status: m.status,
      verificationStatus: user.verificationStatus,
    };
  });
}
