import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { deleteTask, getTaskById, updateTask } from '../taskService';

const workspaceId = '507f1f77bcf86cd799439011';
const taskId = '507f1f77bcf86cd799439014';
const ownerId = '507f1f77bcf86cd799439015';
const assigneeId = '507f1f77bcf86cd799439016';
const strangerId = '507f1f77bcf86cd799439017';

vi.mock('../../models', () => ({
  Task: {
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
  WorkspaceMembership: {
    findOne: vi.fn(),
  },
}));

import { Task, WorkspaceMembership } from '../../models';

function buildTask(overrides: Partial<{ status: string }> = {}) {
  return {
    _id: new Types.ObjectId(taskId),
    workspaceId: new Types.ObjectId(workspaceId),
    title: 'Role test task',
    description: 'Details',
    status: overrides.status ?? 'todo',
    priority: 'medium',
    createdBy: { _id: new Types.ObjectId(ownerId), name: 'Owner', email: 'owner@test.com' },
    assignee: { _id: new Types.ObjectId(assigneeId), name: 'Assignee', email: 'assignee@test.com' },
    comments: [],
    save: vi.fn().mockImplementation(function save(this: { populate: ReturnType<typeof vi.fn> }) {
      return Promise.resolve(this);
    }),
    populate: vi.fn().mockImplementation(function populate(this: unknown) {
      return Promise.resolve(this);
    }),
  };
}

function mockFindOneTask(task: ReturnType<typeof buildTask>) {
  vi.mocked(Task.findOne).mockReturnValue({
    populate: vi.fn().mockResolvedValue(task),
  } as never);
}

describe('taskService role permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({ _id: new Types.ObjectId() } as never);
  });

  describe('getTaskById visibility', () => {
    it('allows workspace admins to view tasks they do not own or assign', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      const result = await getTaskById(taskId, workspaceId, strangerId, 'member', 'admin');

      expect(result.title).toBe('Role test task');
    });

    it('allows assignees to view assigned tasks', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await expect(
        getTaskById(taskId, workspaceId, assigneeId, 'member', 'member')
      ).resolves.toBeDefined();
    });

    it('denies unrelated workspace members', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await expect(
        getTaskById(taskId, workspaceId, strangerId, 'member', 'member')
      ).rejects.toMatchObject({ statusCode: 403, message: 'Access denied' });
    });
  });

  describe('updateTask field restrictions', () => {
    it('allows assignees to update status only', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await updateTask(taskId, workspaceId, assigneeId, 'member', 'member', {
        status: 'in_progress',
      });

      expect(task.status).toBe('in_progress');
      expect(task.save).toHaveBeenCalled();
    });

    it('blocks assignees from editing title or priority', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await expect(
        updateTask(taskId, workspaceId, assigneeId, 'member', 'member', {
          title: 'Hijacked title',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Assignees can only change task status or add a comment. Save to apply changes.',
      });
    });

    it('blocks assignees from setting owner-only statuses', async () => {
      const task = buildTask({ status: 'done' });
      mockFindOneTask(task);

      await expect(
        updateTask(taskId, workspaceId, assigneeId, 'member', 'member', {
          status: 'closed',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only the task owner can mark a task as re-opened or closed',
      });
    });

    it('allows owners to close tasks from done', async () => {
      const task = buildTask({ status: 'done' });
      mockFindOneTask(task);

      await updateTask(taskId, workspaceId, ownerId, 'member', 'member', {
        status: 'closed',
      });

      expect(task.status).toBe('closed');
    });

    it('allows admins to edit tasks they neither own nor are assigned to', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await updateTask(taskId, workspaceId, strangerId, 'member', 'admin', {
        title: 'Admin updated title',
      });

      expect(task.title).toBe('Admin updated title');
    });
  });

  describe('deleteTask', () => {
    it('allows owners to delete their tasks', async () => {
      const task = buildTask();
      mockFindOneTask(task);
      vi.mocked(Task.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

      const result = await deleteTask(taskId, workspaceId, ownerId, 'member', 'member');

      expect(result.taskId).toBe(taskId);
    });

    it('allows admins to delete tasks they do not own', async () => {
      const task = buildTask();
      mockFindOneTask(task);
      vi.mocked(Task.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

      await deleteTask(taskId, workspaceId, strangerId, 'member', 'admin');

      expect(Task.deleteOne).toHaveBeenCalled();
    });

    it('blocks assignees from deleting tasks', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await expect(
        deleteTask(taskId, workspaceId, assigneeId, 'member', 'member')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only the task owner can delete this task',
      });
    });

    it('blocks unrelated members from deleting tasks', async () => {
      const task = buildTask();
      mockFindOneTask(task);

      await expect(
        deleteTask(taskId, workspaceId, strangerId, 'member', 'member')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Access denied',
      });
    });
  });
});
