import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../authenticate';
import { AppError } from '../../utils/errors';

vi.mock('../../utils/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../models', () => ({
  User: {
    findById: vi.fn(),
  },
}));

import { verifyAccessToken } from '../../utils/jwt';
import { User } from '../../models';

describe('authenticate middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('requires a Bearer token', async () => {
    const req = { headers: {} } as Request;

    await authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it('rejects invalid tokens', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new Error('invalid');
    });

    const req = { headers: { authorization: 'Bearer bad-token' } } as Request;

    await authenticate(req, {} as Response, next);

    expect((next.mock.calls[0][0] as AppError).message).toBe('Invalid token');
  });

  it('rejects unverified users', async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: '507f1f77bcf86cd799439011',
      accountId: '507f1f77bcf86cd799439012',
      workspaceId: '507f1f77bcf86cd799439013',
      accountRole: 'admin',
      workspaceRole: 'admin',
    });
    vi.mocked(User.findById).mockResolvedValue({
      email: 'jane@example.com',
      name: 'Jane',
      verificationStatus: 'unverified',
    } as never);

    const req = { headers: { authorization: 'Bearer valid-token' } } as Request;

    await authenticate(req, {} as Response, next);

    expect((next.mock.calls[0][0] as AppError).message).toBe('Invalid or unverified user');
  });

  it('attaches user context and continues for verified users', async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: '507f1f77bcf86cd799439011',
      accountId: '507f1f77bcf86cd799439012',
      workspaceId: '507f1f77bcf86cd799439013',
      accountRole: 'admin',
      workspaceRole: 'admin',
    });
    vi.mocked(User.findById).mockResolvedValue({
      email: 'jane@example.com',
      name: 'Jane Doe',
      verificationStatus: 'verified',
    } as never);

    const req = { headers: { authorization: 'Bearer valid-token' } } as Request;

    await authenticate(req, {} as Response, next);

    expect(req.user).toMatchObject({
      userId: '507f1f77bcf86cd799439011',
      email: 'jane@example.com',
      name: 'Jane Doe',
    });
    expect(next).toHaveBeenCalledWith();
  });
});
