import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../validate';
import { registerSchema, taskQuerySchema } from '../../utils/validators';
import { AppError } from '../../utils/errors';

describe('validate middleware', () => {
  it('passes parsed data through on success', () => {
    const next = vi.fn();
    const req = {
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      },
    } as Request;

    validate(registerSchema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.email).toBe('jane@example.com');
  });

  it('returns field-level validation errors on failure', () => {
    const next = vi.fn();
    const req = {
      body: {
        name: 'J',
        email: 'bad-email',
        password: 'short',
      },
    } as Request;

    validate(registerSchema)(req, {} as Response, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.errors?.length).toBeGreaterThan(0);
  });

  it('validates query strings when configured', () => {
    const next = vi.fn();
    const req = {
      query: { page: '1', limit: '20' },
    } as unknown as Request;

    validate(taskQuerySchema, 'query')(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.query.page).toBe(1);
  });
});
