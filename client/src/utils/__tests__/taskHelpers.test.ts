import { describe, it, expect } from 'vitest';
import { canViewTask, getUserId, normalizeTask } from '../taskHelpers';
import { Task } from '../../types';

describe('getUserId', () => {
  it('reads id from auth-style user objects', () => {
    expect(getUserId({ id: 'user1', name: 'A', email: 'a@example.com' })).toBe('user1');
  });

  it('reads _id from mongoose-style user objects', () => {
    expect(getUserId({ _id: '507f1f77bcf86cd799439011', name: 'A' })).toBe(
      '507f1f77bcf86cd799439011'
    );
  });

  it('reads string user ids', () => {
    expect(getUserId('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
  });
});

describe('canViewTask', () => {
  const baseTask: Task = {
    _id: 'task1',
    title: 'Task',
    status: 'todo',
    priority: 'medium',
    createdBy: { id: 'user1', name: 'Creator', email: 'a@example.com' },
    assignee: { id: 'user2', name: 'Assignee', email: 'b@example.com' },
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  it('allows assignees to view assigned tasks', () => {
    expect(canViewTask(baseTask, 'user2', false)).toBe(true);
  });

  it('denies unrelated workspace members', () => {
    expect(canViewTask(baseTask, 'user3', false)).toBe(false);
  });

  it('allows admins to view any task', () => {
    expect(canViewTask(baseTask, 'user3', true)).toBe(true);
  });
});

describe('normalizeTask', () => {
  it('adds id on mongoose-shaped assignee refs from socket payloads', () => {
    const task = normalizeTask({
      _id: 'task1',
      title: 'Assigned',
      status: 'todo',
      priority: 'medium',
      createdBy: { _id: 'user1', name: 'Creator', email: 'a@example.com' } as Task['createdBy'],
      assignee: { _id: 'user2', name: 'Assignee', email: 'b@example.com' } as Task['assignee'],
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });

    expect(task.assignee).toMatchObject({ id: 'user2' });
    expect(canViewTask(task, 'user2', false)).toBe(true);
  });
});
