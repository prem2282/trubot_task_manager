import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  createInviteSchema,
  updateMemberRoleSchema,
  taskQuerySchema,
} from '../validators';

describe('registerSchema', () => {
  it('accepts valid registration input', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short passwords with a field message', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes('password'))).toBe(true);
    }
  });

  it('rejects invalid email addresses', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires email and password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('createTaskSchema', () => {
  it('rejects past due dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = createTaskSchema.safeParse({
      title: 'Task',
      dueDate: yesterday.toISOString().slice(0, 10),
    });

    expect(result.success).toBe(false);
  });

  it('allows create status values limited to assignee statuses', () => {
    expect(
      createTaskSchema.safeParse({ title: 'Task', status: 'closed' }).success
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({ title: 'Task', status: 'todo' }).success
    ).toBe(true);
  });
});

describe('updateTaskSchema', () => {
  it('allows owner-only statuses on update', () => {
    expect(
      updateTaskSchema.safeParse({ status: 'reopened' }).success
    ).toBe(true);
  });

  it('accepts optional comments', () => {
    expect(
      updateTaskSchema.safeParse({ comment: 'Looks good' }).success
    ).toBe(true);
  });
});

describe('createInviteSchema', () => {
  it('requires a valid invite email', () => {
    expect(createInviteSchema.safeParse({ email: 'invitee@example.com' }).success).toBe(true);
    expect(createInviteSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

describe('updateMemberRoleSchema', () => {
  it('only allows admin or member', () => {
    expect(updateMemberRoleSchema.safeParse({ workspaceRole: 'admin' }).success).toBe(true);
    expect(updateMemberRoleSchema.safeParse({ workspaceRole: 'owner' }).success).toBe(false);
  });
});

describe('taskQuerySchema', () => {
  it('coerces pagination params and validates sort options', () => {
    const result = taskQuerySchema.safeParse({
      page: '2',
      limit: '10',
      sortBy: 'dueDate',
      sortOrder: 'asc',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });
});
