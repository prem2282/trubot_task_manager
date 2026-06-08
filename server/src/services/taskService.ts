import { Types } from 'mongoose';
import { Task, WorkspaceMembership } from '../models';
import { TaskPriority, TaskStatus } from '../types';
import { AppError, isValidObjectId } from '../utils/errors';

export interface TaskFilters {
  status?: TaskStatus;
  assignee?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const ASSIGNEE_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
const OWNER_ONLY_FROM_DONE: TaskStatus[] = ['reopened', 'closed'];

function taskPopulatePaths() {
  return [
    { path: 'assignee', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
    { path: 'comments.author', select: 'name email' },
  ];
}

function getTaskRoles(
  task: { createdBy: { _id?: Types.ObjectId }; assignee: { _id?: Types.ObjectId } },
  userId: string,
  accountRole: string,
  workspaceRole: string
) {
  const isAdmin = accountRole === 'admin' || workspaceRole === 'admin';
  const isOwner = task.createdBy._id?.toString() === userId;
  const isAssignee = task.assignee._id?.toString() === userId;
  return { isAdmin, isOwner, isAssignee };
}

function assertNotPastDueDate(dueDate?: string) {
  if (!dueDate) return;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) {
    throw new AppError(400, 'Due date cannot be in the past');
  }
}

function validateStatusChange(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
  isOwner: boolean,
  isAssignee: boolean
) {
  if (nextStatus === currentStatus) return;

  if (OWNER_ONLY_FROM_DONE.includes(nextStatus)) {
    if (!isOwner) {
      throw new AppError(403, 'Only the task owner can mark a task as re-opened or closed');
    }
    if (currentStatus !== 'done' && !(currentStatus === 'closed' && nextStatus === 'reopened')) {
      throw new AppError(
        400,
        'Re-opened and closed are only available when the task is done, or when reopening a closed task'
      );
    }
    return;
  }

  if (currentStatus === 'closed' && nextStatus !== 'reopened') {
    throw new AppError(400, 'Closed tasks can only be reopened by the owner');
  }

  if (!isOwner && isAssignee) {
    if (!ASSIGNEE_STATUSES.includes(nextStatus)) {
      throw new AppError(403, 'Assignees can only set status to to do, in progress, or done');
    }
    return;
  }

  if (!isOwner) {
    throw new AppError(403, 'Not authorized to change task status');
  }
}

function buildVisibilityFilter(
  userId: string,
  accountRole: string,
  workspaceRole: string
) {
  if (accountRole === 'admin' || workspaceRole === 'admin') {
    return {};
  }
  return {
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { assignee: new Types.ObjectId(userId) },
    ],
  };
}

export async function listTasks(
  userId: string,
  workspaceId: string,
  accountRole: string,
  workspaceRole: string,
  filters: TaskFilters
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    workspaceId: new Types.ObjectId(workspaceId),
    ...buildVisibilityFilter(userId, accountRole, workspaceRole),
  };

  if (filters.status) query.status = filters.status;
  if (filters.assignee && isValidObjectId(filters.assignee)) {
    query.assignee = new Types.ObjectId(filters.assignee);
  }
  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) {
      (query.dueDate as Record<string, Date>).$gte = new Date(filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      (query.dueDate as Record<string, Date>).$lte = new Date(filters.dueDateTo);
    }
  }

  const sortField = filters.sortBy === 'dueDate' ? 'dueDate' : 'createdAt';
  const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate(taskPopulatePaths()),
    Task.countDocuments(query),
  ]);

  return {
    data: tasks,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTaskById(
  taskId: string,
  workspaceId: string,
  userId: string,
  accountRole: string,
  workspaceRole: string
) {
  if (!isValidObjectId(taskId)) throw new AppError(400, 'Invalid task ID');

  const task = await Task.findOne({ _id: taskId, workspaceId }).populate(taskPopulatePaths());

  if (!task) throw new AppError(404, 'Task not found');

  const { isAdmin, isOwner, isAssignee } = getTaskRoles(task, userId, accountRole, workspaceRole);
  if (!isAdmin && !isOwner && !isAssignee) {
    throw new AppError(403, 'Access denied');
  }

  return task;
}

async function ensureAssigneeInWorkspace(assigneeId: string, workspaceId: string) {
  if (!isValidObjectId(assigneeId)) throw new AppError(400, 'Invalid assignee ID');

  const membership = await WorkspaceMembership.findOne({
    userId: assigneeId,
    workspaceId,
    status: 'verified',
  });
  if (!membership) throw new AppError(400, 'Assignee must be a verified workspace member');
}

export async function createTask(
  userId: string,
  accountId: string,
  workspaceId: string,
  data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    dueDate?: string;
  }
) {
  assertNotPastDueDate(data.dueDate);

  const assigneeId = data.assignee ?? userId;
  await ensureAssigneeInWorkspace(assigneeId, workspaceId);

  const task = await Task.create({
    accountId,
    workspaceId,
    title: data.title,
    description: data.description,
    status: data.status ?? 'todo',
    priority: data.priority ?? 'medium',
    assignee: assigneeId,
    createdBy: userId,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    comments: [],
  });

  return task.populate(taskPopulatePaths());
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  userId: string,
  accountRole: string,
  workspaceRole: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee: string;
    dueDate: string;
    comment: string;
  }>
) {
  const task = await getTaskById(taskId, workspaceId, userId, accountRole, workspaceRole);
  const { isAdmin, isOwner, isAssignee } = getTaskRoles(task, userId, accountRole, workspaceRole);
  const commentText = data.comment?.trim();
  const previousStatus = task.status;
  const updateFields = { ...data };
  delete updateFields.comment;

  if (!isAdmin && !isOwner && !isAssignee) {
    throw new AppError(403, 'Not authorized to update this task');
  }

  if (!isOwner && !isAdmin) {
    const keys = Object.keys(updateFields).filter(
      (key) => updateFields[key as keyof typeof updateFields] !== undefined
    );
    const hasCommentOnly = commentText && keys.length === 0;
    const hasStatusOnly =
      keys.length === 1 && keys[0] === 'status' && updateFields.status !== undefined;

    if (!hasCommentOnly && !hasStatusOnly) {
      throw new AppError(
        403,
        'Assignees can only change task status or add a comment. Save to apply changes.'
      );
    }

    if (updateFields.status !== undefined) {
      validateStatusChange(task.status, updateFields.status, false, true);
      task.status = updateFields.status;
    }
  } else {
    if (updateFields.status !== undefined) {
      validateStatusChange(task.status, updateFields.status, true, isAssignee);
      task.status = updateFields.status;
    }
    if (updateFields.assignee) {
      await ensureAssigneeInWorkspace(updateFields.assignee, workspaceId);
      task.assignee = new Types.ObjectId(updateFields.assignee);
    }
    if (updateFields.title !== undefined) task.title = updateFields.title;
    if (updateFields.description !== undefined) task.description = updateFields.description;
    if (updateFields.priority !== undefined) task.priority = updateFields.priority;
    if (updateFields.dueDate !== undefined) {
      assertNotPastDueDate(updateFields.dueDate || undefined);
      task.dueDate = updateFields.dueDate ? new Date(updateFields.dueDate) : undefined;
    }
  }

  if (commentText) {
    const statusChanged = task.status !== previousStatus;
    task.comments.push({
      author: new Types.ObjectId(userId),
      body: commentText,
      ...(statusChanged ? { statusChange: task.status } : {}),
      createdAt: new Date(),
    } as (typeof task.comments)[number]);
  }

  await task.save();
  return task.populate(taskPopulatePaths());
}

export async function addTaskComment(
  taskId: string,
  workspaceId: string,
  userId: string,
  accountRole: string,
  workspaceRole: string,
  data: { body: string }
) {
  const task = await getTaskById(taskId, workspaceId, userId, accountRole, workspaceRole);
  const { isAdmin, isOwner, isAssignee } = getTaskRoles(task, userId, accountRole, workspaceRole);

  if (!isAdmin && !isOwner && !isAssignee) {
    throw new AppError(403, 'Not authorized to comment on this task');
  }

  task.comments.push({
    author: new Types.ObjectId(userId),
    body: data.body,
    createdAt: new Date(),
  } as (typeof task.comments)[number]);

  await task.save();
  return task.populate(taskPopulatePaths());
}

export async function deleteTask(
  taskId: string,
  workspaceId: string,
  userId: string,
  accountRole: string,
  workspaceRole: string
) {
  const task = await getTaskById(taskId, workspaceId, userId, accountRole, workspaceRole);

  const isAdmin = accountRole === 'admin' || workspaceRole === 'admin';
  const isOwner = task.createdBy._id?.toString() === userId;

  if (!isAdmin && !isOwner) {
    throw new AppError(403, 'Only the task owner can delete this task');
  }

  await Task.deleteOne({ _id: task._id });
  return { taskId: task._id.toString(), workspaceId, title: task.title };
}

export async function listWorkspaceUsers(workspaceId: string) {
  const memberships = await WorkspaceMembership.find({
    workspaceId,
    status: 'verified',
  }).populate('userId', 'name email');

  return memberships.map((m) => {
    const user = m.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      workspaceRole: m.workspaceRole,
    };
  });
}
