import { describe, it, expect } from 'vitest';
import { AppError, isValidObjectId } from '../errors';

describe('AppError', () => {
  it('stores status code, message, and optional field errors', () => {
    const error = new AppError(400, 'Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.errors).toEqual([{ field: 'email', message: 'Invalid email' }]);
    expect(error.name).toBe('AppError');
  });
});

describe('isValidObjectId', () => {
  it('accepts 24-character hex strings', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('rejects invalid ids', () => {
    expect(isValidObjectId('not-an-id')).toBe(false);
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false);
    expect(isValidObjectId('')).toBe(false);
  });
});
