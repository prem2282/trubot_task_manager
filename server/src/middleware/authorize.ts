import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function requireAccountAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (req.user.accountRole !== 'admin') {
    return next(new AppError(403, 'Account admin access required'));
  }
  next();
}

export function requireWorkspaceAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (req.user.accountRole !== 'admin' && req.user.workspaceRole !== 'admin') {
    return next(new AppError(403, 'Workspace admin access required'));
  }
  next();
}

/** Workspace admin only — account admin without workspace admin role is not enough. */
export function requireWorkspaceAdminOnly(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (req.user.workspaceRole !== 'admin') {
    return next(new AppError(403, 'Workspace admin access required'));
  }
  next();
}
