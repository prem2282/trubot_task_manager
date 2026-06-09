import { Types } from 'mongoose';
import {
  AccountMembership,
  ACTIVE_WORKSPACE_FILTER,
  Task,
  Workspace,
  WorkspaceMembership,
  User,
} from '../models';
import { AppError } from '../utils/errors';
import { addToWorkspace, updateWorkspaceMemberRole as changeWorkspaceMemberRole } from './membershipService';

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  );
}

async function assertWorkspaceAdminForTarget(workspaceId: string, userId: string) {
  const membership = await WorkspaceMembership.findOne({
    workspaceId,
    userId,
    status: 'verified',
    workspaceRole: 'admin',
  });
  if (!membership) {
    throw new AppError(403, 'Workspace admin access required');
  }
}

async function getActiveWorkspace(workspaceId: string, accountId: string) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    accountId,
    ...ACTIVE_WORKSPACE_FILTER,
  });
  if (!workspace) throw new AppError(404, 'Workspace not found');
  return workspace;
}

async function countActiveWorkspacesInAccount(accountId: string) {
  return Workspace.countDocuments({ accountId, ...ACTIVE_WORKSPACE_FILTER });
}

export async function listWorkspaces(userId: string, accountId: string) {
  const workspaceMemberships = await WorkspaceMembership.find({
    userId,
    status: 'verified',
  }).populate({
    path: 'workspaceId',
    match: { accountId: new Types.ObjectId(accountId), ...ACTIVE_WORKSPACE_FILTER },
  });

  const items = workspaceMemberships
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
        workspaceObjectId: ws._id,
      };
    });

  const workspaceIds = items.map((i) => i.workspaceObjectId);
  const taskCounts =
    workspaceIds.length > 0
      ? await Task.aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { workspaceId: { $in: workspaceIds } } },
          { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
        ])
      : [];
  const countByWorkspace = new Map(
    taskCounts.map((row) => [row._id.toString(), row.count])
  );

  return items.map(({ workspaceObjectId: _oid, ...ws }) => ({
    ...ws,
    taskCount: countByWorkspace.get(ws.id) ?? 0,
  }));
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

  const existing = await Workspace.findOne({ accountId, name, ...ACTIVE_WORKSPACE_FILTER });
  if (existing) throw new AppError(409, 'Workspace name already exists in this account');

  let workspace;
  try {
    workspace = await Workspace.create({
      accountId,
      name,
      isDefault: false,
    });
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'Workspace name already exists in this account');
    }
    throw err;
  }

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
    taskCount: 0,
  };
}

export async function renameWorkspace(
  workspaceId: string,
  accountId: string,
  userId: string,
  name: string
) {
  await assertWorkspaceAdminForTarget(workspaceId, userId);
  const workspace = await getActiveWorkspace(workspaceId, accountId);

  const duplicate = await Workspace.findOne({
    accountId,
    name,
    ...ACTIVE_WORKSPACE_FILTER,
    _id: { $ne: workspace._id },
  });
  if (duplicate) throw new AppError(409, 'Workspace name already exists in this account');

  workspace.name = name;
  await workspace.save();

  return {
    id: workspace._id.toString(),
    name: workspace.name,
    isDefault: workspace.isDefault,
    taskCount: await Task.countDocuments({ workspaceId: workspace._id }),
  };
}

export async function deleteWorkspace(
  workspaceId: string,
  accountId: string,
  userId: string
) {
  await assertWorkspaceAdminForTarget(workspaceId, userId);
  const workspace = await getActiveWorkspace(workspaceId, accountId);

  if (workspace.isDefault) {
    throw new AppError(400, 'Cannot delete the default workspace');
  }

  const activeCount = await countActiveWorkspacesInAccount(accountId);
  if (activeCount <= 1) {
    throw new AppError(400, 'Cannot delete the last workspace in the account');
  }

  const taskCount = await Task.countDocuments({ workspaceId: workspace._id });
  if (taskCount > 0) {
    throw new AppError(400, 'Workspace has tasks. Archive it instead.');
  }

  await WorkspaceMembership.deleteMany({ workspaceId: workspace._id });
  await Workspace.deleteOne({ _id: workspace._id });

  return { id: workspaceId, deleted: true };
}

export async function archiveWorkspace(
  workspaceId: string,
  accountId: string,
  userId: string
) {
  await assertWorkspaceAdminForTarget(workspaceId, userId);
  const workspace = await getActiveWorkspace(workspaceId, accountId);

  if (workspace.isDefault) {
    throw new AppError(400, 'Cannot archive the default workspace');
  }

  const activeCount = await countActiveWorkspacesInAccount(accountId);
  if (activeCount <= 1) {
    throw new AppError(400, 'Cannot archive the last workspace in the account');
  }

  const taskCount = await Task.countDocuments({ workspaceId: workspace._id });
  if (taskCount === 0) {
    throw new AppError(400, 'Workspace is empty. Delete it instead.');
  }

  workspace.status = 'archived';
  workspace.archivedAt = new Date();
  await workspace.save();

  return {
    id: workspace._id.toString(),
    name: workspace.name,
    archived: true,
  };
}

export async function listWorkspaceMembers(workspaceId: string, accountId: string) {
  const workspace = await getActiveWorkspace(workspaceId, accountId);

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
  const workspace = await getActiveWorkspace(workspaceId, accountId);

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
  await getActiveWorkspace(workspaceId, accountId);

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
