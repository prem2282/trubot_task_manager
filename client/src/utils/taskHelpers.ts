import { Task, User } from '../types';

export function getUserId(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const record = value as { id?: string; _id?: unknown };
  if (typeof record.id === 'string' && record.id) return record.id;
  if (typeof record._id === 'string') return record._id;
  if (record._id && typeof record._id === 'object') {
    const oid = record._id as { $oid?: string; toString?: () => string };
    if (typeof oid.$oid === 'string') return oid.$oid;
    if (typeof oid.toString === 'function') {
      const id = oid.toString();
      if (id && id !== '[object Object]') return id;
    }
  }
  return '';
}

export function normalizeTaskUser(value: User | string): User | string {
  const id = getUserId(value);
  if (!id) return value;
  if (typeof value === 'string') return id;
  return { ...value, id };
}

export function normalizeTask(task: Task): Task {
  return {
    ...task,
    assignee: normalizeTaskUser(task.assignee),
    createdBy: normalizeTaskUser(task.createdBy),
  };
}

/** Mirrors server task visibility for workspace members vs admins. */
export function canViewTask(task: Task, userId: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!userId) return false;
  return (
    getUserId(task.createdBy) === userId || getUserId(task.assignee) === userId
  );
}

export const ASSIGNEE_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const ALL_TASK_STATUSES = [
  'todo',
  'in_progress',
  'done',
  'reopened',
  'closed',
] as const;

export function statusLabel(status: string): string {
  switch (status) {
    case 'todo':
      return 'To do';
    case 'in_progress':
      return 'In progress';
    case 'done':
      return 'Done';
    case 'reopened':
      return 'Re-opened';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

export function statusChipClass(status: string): string {
  switch (status) {
    case 'todo':
      return 'bg-slate-100 text-slate-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'done':
      return 'bg-green-100 text-green-800';
    case 'reopened':
      return 'bg-amber-100 text-amber-800';
    case 'closed':
      return 'bg-zinc-200 text-zinc-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export type DueDateUrgency = 'past_due' | 'due_today' | 'approaching';

const INACTIVE_DUE_STATUSES = new Set(['done', 'closed']);

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntilDue(dueDateIso: string): number {
  const due = startOfLocalDay(new Date(dueDateIso));
  const today = startOfLocalDay(new Date());
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Returns urgency chip type for active tasks, or null when no chip should show. */
export function getDueDateUrgency(
  dueDate: string | undefined,
  taskStatus: string
): DueDateUrgency | null {
  if (!dueDate || INACTIVE_DUE_STATUSES.has(taskStatus)) {
    return null;
  }

  const days = daysUntilDue(dueDate);
  if (days < 0) return 'past_due';
  if (days === 0) return 'due_today';
  if (days <= 3) return 'approaching';
  return null;
}

export function dueDateUrgencyLabel(urgency: DueDateUrgency): string {
  switch (urgency) {
    case 'past_due':
      return 'Past due';
    case 'due_today':
      return 'Due today';
    case 'approaching':
      return 'Approaching';
  }
}

export function dueDateUrgencyChipClass(urgency: DueDateUrgency): string {
  switch (urgency) {
    case 'past_due':
      return 'bg-red-100 text-red-800';
    case 'due_today':
      return 'bg-orange-100 text-orange-800';
    case 'approaching':
      return 'bg-amber-100 text-amber-800';
  }
}
