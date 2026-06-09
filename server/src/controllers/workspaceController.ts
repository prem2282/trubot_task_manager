import { Request, Response, NextFunction } from 'express';
import * as workspaceService from '../services/workspaceService';
import { removeFromWorkspace } from '../services/membershipService';
import { param } from '../utils/params';

export async function listWorkspaces(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.listWorkspaces(req.user!.userId, req.user!.accountId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function renameWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.renameWorkspace(
      param(req.params.id, 'id'),
      req.user!.accountId,
      req.user!.userId,
      req.body.name
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.deleteWorkspace(
      param(req.params.id, 'id'),
      req.user!.accountId,
      req.user!.userId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function archiveWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.archiveWorkspace(
      param(req.params.id, 'id'),
      req.user!.accountId,
      req.user!.userId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.createWorkspace(
      req.user!.userId,
      req.user!.accountId,
      req.body.name
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.listWorkspaceMembers(
      param(req.params.id, 'id'),
      req.user!.accountId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.addWorkspaceMember(
      param(req.params.id, 'id'),
      req.user!.accountId,
      req.body.userId,
      req.user!.accountRole,
      req.user!.workspaceRole
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await removeFromWorkspace(
      param(req.params.id, 'id'),
      param(req.params.userId, 'userId'),
      req.user!.userId,
      req.user!.accountRole,
      req.user!.workspaceRole
    );
    res.json({ success: true, message: 'Member removed from workspace' });
  } catch (e) {
    next(e);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.updateWorkspaceMemberRole(
      param(req.params.id, 'id'),
      req.user!.accountId,
      param(req.params.userId, 'userId'),
      req.body.workspaceRole,
      req.user!.accountRole,
      req.user!.workspaceRole
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listAccountMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.listAccountMembers(req.user!.accountId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
