import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { createTask, listTasks } from '../taskService';

const userId = '507f1f77bcf86cd799439011';
const accountId = '507f1f77bcf86cd799439012';
const workspaceId = '507f1f77bcf86cd799439013';

vi.mock('../../models', () => ({
  Task: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
  WorkspaceMembership: {
    findOne: vi.fn(),
  },
}));

import { Task, WorkspaceMembership } from '../../models';

function mockTaskFindChain(tasks: unknown[] = []) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockResolvedValue(tasks),
  };
  vi.mocked(Task.find).mockReturnValue(chain as never);
  return chain;
}

describe('taskService core behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(WorkspaceMembership.findOne).mockResolvedValue({ _id: new Types.ObjectId() } as never);
  });

  describe('createTask', () => {
    it('rejects past due dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        createTask(userId, accountId, workspaceId, {
          title: 'Late task',
          dueDate: yesterday.toISOString().slice(0, 10),
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Due date cannot be in the past',
      });
    });

    it('defaults assignee to the creator when omitted', async () => {
      const populate = vi.fn().mockResolvedValue({ title: 'New task' });
      vi.mocked(Task.create).mockResolvedValue({ populate } as never);

      await createTask(userId, accountId, workspaceId, { title: 'New task' });

      expect(Task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: userId,
          createdBy: userId,
          status: 'todo',
          priority: 'medium',
        })
      );
    });

    it('requires assignees to belong to the workspace', async () => {
      vi.mocked(WorkspaceMembership.findOne).mockResolvedValue(null);

      await expect(
        createTask(userId, accountId, workspaceId, {
          title: 'Assigned task',
          assignee: '507f1f77bcf86cd799439099',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Assignee must be a verified workspace member',
      });
    });
  });

  describe('listTasks visibility and pagination', () => {
    it('scopes member queries to owned or assigned tasks', async () => {
      mockTaskFindChain([]);
      vi.mocked(Task.countDocuments).mockResolvedValue(0);

      await listTasks(userId, workspaceId, 'member', 'member', {});

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: new Types.ObjectId(workspaceId),
          $or: [
            { createdBy: new Types.ObjectId(userId) },
            { assignee: new Types.ObjectId(userId) },
          ],
        })
      );
    });

    it('allows admins to query all workspace tasks', async () => {
      mockTaskFindChain([]);
      vi.mocked(Task.countDocuments).mockResolvedValue(0);

      await listTasks(userId, workspaceId, 'admin', 'member', {});

      const query = vi.mocked(Task.find).mock.calls[0][0] as Record<string, unknown>;
      expect(query.$or).toBeUndefined();
    });

    it('returns pagination metadata', async () => {
      mockTaskFindChain([{ title: 'Task A' }]);
      vi.mocked(Task.countDocuments).mockResolvedValue(21);

      const result = await listTasks(userId, workspaceId, 'admin', 'admin', {
        page: 2,
        limit: 10,
        sortBy: 'dueDate',
        sortOrder: 'asc',
      });

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      });
      expect(result.data).toHaveLength(1);
    });
  });
});
