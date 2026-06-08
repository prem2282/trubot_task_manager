import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/taskService';
import { getIO } from '../sockets';
import { param } from '../utils/params';
import { serializeTask } from '../utils/taskSerializer';

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await taskService.listTasks(
      req.user!.userId,
      req.user!.workspaceId,
      req.user!.accountRole,
      req.user!.workspaceRole,
      req.query as taskService.TaskFilters
    );
    res.json({
      success: true,
      data: result.data.map((task) => serializeTask(task)),
      meta: result.meta,
    });
  } catch (e) {
    next(e);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await taskService.getTaskById(
      param(req.params.id, 'id'),
      req.user!.workspaceId,
      req.user!.userId,
      req.user!.accountRole,
      req.user!.workspaceRole
    );
    res.json({ success: true, data: serializeTask(data) });
  } catch (e) {
    next(e);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await taskService.createTask(
      req.user!.userId,
      req.user!.accountId,
      req.user!.workspaceId,
      req.body
    );
    const serialized = serializeTask(task);
    getIO()?.to(`workspace:${req.user!.workspaceId}`).emit('task:created', { task: serialized });
    res.status(201).json({ success: true, data: serialized });
  } catch (e) {
    next(e);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await taskService.updateTask(
      param(req.params.id, 'id'),
      req.user!.workspaceId,
      req.user!.userId,
      req.user!.accountRole,
      req.user!.workspaceRole,
      req.body
    );
    const serialized = serializeTask(task);
    getIO()?.to(`workspace:${req.user!.workspaceId}`).emit('task:updated', { task: serialized });
    res.json({ success: true, data: serialized });
  } catch (e) {
    next(e);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await taskService.deleteTask(
      param(req.params.id, 'id'),
      req.user!.workspaceId,
      req.user!.userId,
      req.user!.accountRole,
      req.user!.workspaceRole
    );
    getIO()?.to(`workspace:${req.user!.workspaceId}`).emit('task:deleted', result);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await taskService.addTaskComment(
      param(req.params.id, 'id'),
      req.user!.workspaceId,
      req.user!.userId,
      req.user!.accountRole,
      req.user!.workspaceRole,
      req.body
    );
    const serialized = serializeTask(task);
    getIO()?.to(`workspace:${req.user!.workspaceId}`).emit('task:updated', { task: serialized });
    res.status(201).json({ success: true, data: serialized });
  } catch (e) {
    next(e);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await taskService.listWorkspaceUsers(req.user!.workspaceId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
