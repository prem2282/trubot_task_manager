import { describe, it, expect } from 'vitest';
import { param } from '../params';

describe('param', () => {
  it('returns a string route parameter', () => {
    expect(param('abc123', 'id')).toBe('abc123');
  });

  it('returns the first value when parameter is an array', () => {
    expect(param(['first', 'second'], 'id')).toBe('first');
  });

  it('throws when parameter is missing', () => {
    expect(() => param(undefined, 'taskId')).toThrow('Missing taskId');
  });
});
