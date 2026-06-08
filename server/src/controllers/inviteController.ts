import { Request, Response, NextFunction } from 'express';
import * as inviteService from '../services/inviteService';
import { param } from '../utils/params';
import { getRefreshCookieOptions } from '../utils/jwt';

export async function createInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.body.workspaceId ?? req.user!.workspaceId;
    const data = await inviteService.createInvite(
      req.user!.userId,
      req.user!.accountId,
      workspaceId,
      req.body.email,
      req.body.name
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listInvites(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await inviteService.listInvites(req.user!.accountId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function revokeInvite(req: Request, res: Response, next: NextFunction) {
  try {
    await inviteService.revokeInvite(param(req.params.id, 'id'), req.user!.accountId);
    res.json({ success: true, message: 'Invitation revoked' });
  } catch (e) {
    next(e);
  }
}

export async function validateInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await inviteService.validateInviteToken(param(req.params.token, 'token'));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inviteService.acceptInvite(
      param(req.params.token, 'token'),
      req.body.name,
      req.body.password
    );
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
        account: result.account,
        workspace: result.workspace,
      },
    });
  } catch (e) {
    next(e);
  }
}
