import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAccountAdmin, requireWorkspaceAdmin } from '../authorize';
import { AppError } from '../../utils/errors';

function mockReq(roles: { accountRole?: string; workspaceRole?: string } = {}) {
  return {
    user: {
      userId: '507f1f77bcf86cd799439011',
      accountId: '507f1f77bcf86cd799439012',
      workspaceId: '507f1f77bcf86cd799439013',
      accountRole: roles.accountRole ?? 'member',
      workspaceRole: roles.workspaceRole ?? 'member',
    },
  } as Request;
}

function mockRes() {
  return {} as Response;
}

describe('requireAccountAdmin', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('allows account admins', () => {
    requireAccountAdmin(mockReq({ accountRole: 'admin' }), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks account members with 403', () => {
    requireAccountAdmin(mockReq({ accountRole: 'member' }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
    expect((next.mock.calls[0][0] as AppError).message).toBe('Account admin access required');
  });

  it('blocks unauthenticated requests with 401', () => {
    requireAccountAdmin({} as Request, mockRes(), next);
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });
});

describe('requireWorkspaceAdmin', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('allows workspace admins', () => {
    requireWorkspaceAdmin(
      mockReq({ accountRole: 'member', workspaceRole: 'admin' }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('allows account admins even when workspace role is member', () => {
    requireWorkspaceAdmin(
      mockReq({ accountRole: 'admin', workspaceRole: 'member' }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks workspace members who are not account admins', () => {
    requireWorkspaceAdmin(
      mockReq({ accountRole: 'member', workspaceRole: 'member' }),
      mockRes(),
      next
    );
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
    expect((next.mock.calls[0][0] as AppError).message).toBe('Workspace admin access required');
  });
});
