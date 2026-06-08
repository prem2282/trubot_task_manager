import mongoose, { Types } from 'mongoose';
import {
  AccountMembership,
  Workspace,
  WorkspaceMembership,
} from '../models';
import {
  AccountRole,
  MembershipStatus,
  MembershipAccount,
  WorkspaceRole,
} from '../types';
import { AppError } from '../utils/errors';

export interface AddToWorkspaceParams {
  userId: Types.ObjectId | string;
  workspaceId: Types.ObjectId | string;
  workspaceRole?: WorkspaceRole;
  accountRole?: AccountRole;
  status: MembershipStatus;
}

export async function addToWorkspace(params: AddToWorkspaceParams) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workspace = await Workspace.findById(params.workspaceId).session(session);
    if (!workspace) {
      throw new AppError(404, 'Workspace not found');
    }

    const userId = new Types.ObjectId(params.userId);
    const accountId = workspace.accountId;

    let accountMembership = await AccountMembership.findOne({
      userId,
      accountId,
    }).session(session);

    if (!accountMembership) {
      [accountMembership] = await AccountMembership.create(
        [
          {
            userId,
            accountId,
            accountRole: params.accountRole ?? 'member',
            status: params.status,
          },
        ],
        { session }
      );
    } else if (params.status === 'verified' && accountMembership.status === 'unverified') {
      accountMembership.status = 'verified';
      await accountMembership.save({ session });
    }

    let workspaceMembership = await WorkspaceMembership.findOne({
      userId,
      workspaceId: workspace._id,
    }).session(session);

    if (!workspaceMembership) {
      [workspaceMembership] = await WorkspaceMembership.create(
        [
          {
            userId,
            workspaceId: workspace._id,
            workspaceRole: params.workspaceRole ?? 'member',
            status: params.status,
          },
        ],
        { session }
      );
    } else if (params.status === 'verified' && workspaceMembership.status === 'unverified') {
      workspaceMembership.status = 'verified';
      await workspaceMembership.save({ session });
    }

    await session.commitTransaction();
    return { accountMembership, workspaceMembership, workspace };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function countVerifiedWorkspaceAdmins(
  workspaceId: string | Types.ObjectId
): Promise<number> {
  return WorkspaceMembership.countDocuments({
    workspaceId,
    workspaceRole: 'admin',
    status: 'verified',
  });
}

function assertCanDemoteOrRemoveAdmin(adminCount: number) {
  if (adminCount <= 1) {
    throw new AppError(400, 'At least one workspace admin is required');
  }
}

export async function removeFromWorkspace(
  workspaceId: string,
  userId: string,
  requesterId: string,
  requesterAccountRole: AccountRole,
  requesterWorkspaceRole: WorkspaceRole
) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new AppError(404, 'Workspace not found');

  const isAccountAdmin = requesterAccountRole === 'admin';
  const isWorkspaceAdmin = requesterWorkspaceRole === 'admin';

  if (!isAccountAdmin && !isWorkspaceAdmin) {
    throw new AppError(403, 'Not authorized to remove workspace members');
  }

  const membership = await WorkspaceMembership.findOne({
    workspaceId,
    userId,
    status: 'verified',
  });

  if (!membership) throw new AppError(404, 'Workspace member not found');

  if (membership.workspaceRole === 'admin') {
    const adminCount = await countVerifiedWorkspaceAdmins(workspaceId);
    assertCanDemoteOrRemoveAdmin(adminCount);
  }

  await WorkspaceMembership.deleteOne({ _id: membership._id });
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  workspaceRole: WorkspaceRole,
  requesterAccountRole: AccountRole,
  requesterWorkspaceRole: WorkspaceRole
) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new AppError(404, 'Workspace not found');

  const isAccountAdmin = requesterAccountRole === 'admin';
  const isWorkspaceAdmin = requesterWorkspaceRole === 'admin';

  if (!isAccountAdmin && !isWorkspaceAdmin) {
    throw new AppError(403, 'Not authorized to change workspace member roles');
  }

  const membership = await WorkspaceMembership.findOne({
    workspaceId,
    userId,
    status: 'verified',
  });

  if (!membership) throw new AppError(404, 'Workspace member not found');

  if (membership.workspaceRole === workspaceRole) {
    return membership;
  }

  if (membership.workspaceRole === 'admin' && workspaceRole === 'member') {
    const adminCount = await countVerifiedWorkspaceAdmins(workspaceId);
    assertCanDemoteOrRemoveAdmin(adminCount);
  }

  membership.workspaceRole = workspaceRole;
  await membership.save();
  return membership;
}

export async function getUserMemberships(userId: string): Promise<MembershipAccount[]> {
  const accountMemberships = await AccountMembership.find({
    userId,
    status: 'verified',
  }).populate('accountId');

  const result: MembershipAccount[] = [];

  for (const am of accountMemberships) {
    const account = am.accountId as unknown as { _id: Types.ObjectId; name: string };
    const workspaceMemberships = await WorkspaceMembership.find({
      userId,
      status: 'verified',
    }).populate({
      path: 'workspaceId',
      match: { accountId: account._id },
    });

    const workspaces = workspaceMemberships
      .filter((wm) => wm.workspaceId)
      .map((wm) => {
        const ws = wm.workspaceId as unknown as {
          _id: Types.ObjectId;
          name: string;
          isDefault: boolean;
        };
        return {
          workspaceId: ws._id.toString(),
          name: ws.name,
          workspaceRole: wm.workspaceRole,
          isDefault: ws.isDefault,
        };
      });

    if (workspaces.length === 0) continue;

    result.push({
      accountId: account._id.toString(),
      name: account.name,
      accountRole: am.accountRole,
      workspaces,
    });
  }

  return result;
}

export async function validateContextAccess(
  userId: string,
  accountId: string,
  workspaceId: string
) {
  const accountMembership = await AccountMembership.findOne({
    userId,
    accountId,
    status: 'verified',
  });
  if (!accountMembership) throw new AppError(403, 'No access to this account');

  const workspace = await Workspace.findOne({ _id: workspaceId, accountId });
  if (!workspace) throw new AppError(404, 'Workspace not found in account');

  const workspaceMembership = await WorkspaceMembership.findOne({
    userId,
    workspaceId,
    status: 'verified',
  });
  if (!workspaceMembership) throw new AppError(403, 'No access to this workspace');

  return { accountMembership, workspaceMembership, workspace };
}
