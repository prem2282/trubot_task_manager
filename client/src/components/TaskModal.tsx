import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { Task, TaskComment, TaskPriority, TaskStatus, User } from '../types';
import { getUserId, statusLabel } from '../utils/taskHelpers';
import { todayDateInputValue } from '../utils/password';
import { FieldLabel } from './InfoTip';
import { useAuthStore, isWorkspaceAdmin } from '../store/authStore';

interface Props {
  task: Task | null;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}

function getCommentAuthorName(author: TaskComment['author']): string {
  if (typeof author === 'string') return 'User';
  return author.name ?? 'User';
}

function formatCommentDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function TaskModal({ task, users, currentUserId, onClose, onSaved }: Props) {
  const account = useAuthStore((s) => s.account);
  const workspace = useAuthStore((s) => s.workspace);
  const memberships = useAuthStore((s) => s.memberships);
  const isAdmin = isWorkspaceAdmin(memberships, account?.id, workspace?.id);

  const isNew = !task;
  const ownerId = task ? getUserId(task.createdBy) : currentUserId;
  const isOwner = ownerId === currentUserId;
  const isAssignee = task ? getUserId(task.assignee) === currentUserId : false;
  const isAssigneeOnly = !!task && isAssignee && !isOwner && !isAdmin;
  const comments = task?.comments ?? [];
  const hasComments = comments.length > 0;
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    assignee: '',
    dueDate: '',
  });
  const [commentBody, setCommentBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        assignee: getUserId(task.assignee),
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      });
      setCommentBody('');
    } else {
      setForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: currentUserId,
        dueDate: '',
      });
    }
  }, [task, currentUserId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const container = commentsContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [comments.length, task?._id]);

  const canManageAsOwner = isOwner || isAdmin;

  const statusOptions = useMemo(() => {
    const currentStatus = task?.status ?? form.status;

    if (isAssigneeOnly) {
      if (currentStatus === 'closed') {
        return [currentStatus] as TaskStatus[];
      }
      return ['todo', 'in_progress', 'done'] as TaskStatus[];
    }

    if (canManageAsOwner && currentStatus === 'done') {
      return ['todo', 'in_progress', 'done', 'reopened', 'closed'] as TaskStatus[];
    }
    if (canManageAsOwner && currentStatus === 'closed') {
      return ['closed', 'reopened'] as TaskStatus[];
    }
    if (canManageAsOwner) {
      return ['todo', 'in_progress', 'done', 'reopened', 'closed'] as TaskStatus[];
    }

    return ['todo', 'in_progress', 'done'] as TaskStatus[];
  }, [isAssigneeOnly, isOwner, isAdmin, task?.status, form.status]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isNew) {
        await api.post('/tasks', {
          ...form,
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
          assignee: form.assignee || undefined,
        });
      } else if (task) {
        if (isAssigneeOnly) {
          await api.put(`/tasks/${task._id}`, {
            status: form.status,
            ...(commentBody.trim() ? { comment: commentBody.trim() } : {}),
          });
        } else {
          await api.put(`/tasks/${task._id}`, {
            ...form,
            description: form.description || undefined,
            dueDate: form.dueDate || undefined,
            assignee: form.assignee || undefined,
            ...(commentBody.trim() ? { comment: commentBody.trim() } : {}),
          });
        }
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Save failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const commentsPanel = hasComments ? (
    <aside className="flex min-h-0 w-full flex-shrink-0 flex-col border-t border-slate-200 bg-slate-50 md:max-h-none md:w-80 md:border-l md:border-t-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Comments ({comments.length})</h3>
      </div>
      <div ref={commentsContainerRef} className="max-h-48 min-h-0 flex-1 overflow-y-auto px-4 py-3 md:max-h-none">
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment._id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-indigo-900">
                  {getCommentAuthorName(comment.author)}
                </span>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatCommentDateTime(comment.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {comment.body}
              </p>
              {comment.statusChange && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Status → {statusLabel(comment.statusChange)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className={`flex max-h-[95vh] w-full overflow-hidden rounded-t-lg bg-white shadow-xl sm:rounded-lg ${
          hasComments
            ? 'h-[95vh] max-w-4xl flex-col md:h-[85vh] md:flex-row'
            : 'max-h-[95vh] max-w-lg flex-col'
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold sm:text-xl">
              {isNew ? 'New task' : isAssigneeOnly ? 'Task (assignee)' : isAdmin && !isOwner ? 'Edit task (admin)' : 'Edit task'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ×
            </button>
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <form onSubmit={handleSave} className="space-y-3">
            {isAssigneeOnly ? (
              <>
                <div>
                  <p className="text-sm text-slate-600">Title</p>
                  <p className="font-medium">{form.title}</p>
                </div>
                {form.description && (
                  <div>
                    <p className="text-sm text-slate-600">Description</p>
                    <p className="whitespace-pre-wrap">{form.description}</p>
                  </div>
                )}
                <div className="text-sm">
                  <p className="text-slate-600">Priority</p>
                  <p className="capitalize">{form.priority}</p>
                </div>
              </>
            ) : (
              <>
                <label className="block">
                  <FieldLabel
                    label="Title"
                    tip="Short summary of the work. Required for every task."
                  />
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block">
                  <FieldLabel
                    label="Description"
                    tip="Optional details, acceptance criteria, or links for the assignee."
                  />
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    rows={3}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel
                      label="Priority"
                      tip="How urgent the task is: Low, Medium, or High."
                    />
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="block">
                    <FieldLabel
                      label="Assignee"
                      tip="Team member responsible for completing this task."
                    />
                    <select
                      value={form.assignee}
                      onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={`grid gap-3 ${!isNew ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  <label className="block">
                    <FieldLabel
                      label="Due date"
                      tip="Target completion date. Past dates cannot be selected."
                    />
                    <input
                      type="date"
                      min={todayDateInputValue()}
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    />
                  </label>
                  {!isNew && (
                    <label className="block">
                      <FieldLabel
                        label="Status"
                        tip={
                          canManageAsOwner
                            ? 'Track progress. Owners and admins can close or re-open tasks from Done.'
                            : 'Update progress as you work. Assignees can set To do, In progress, or Done.'
                        }
                      />
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                      {canManageAsOwner && task?.status === 'closed' && (
                        <span className="mt-1 block text-xs text-slate-500">
                          Select Re-opened and save to reopen this task.
                        </span>
                      )}
                    </label>
                  )}
                </div>
              </>
            )}

            {isAssigneeOnly && !isNew && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="text-sm">
                  <p className="text-slate-600">Due date</p>
                  <p>{form.dueDate ? new Date(form.dueDate).toLocaleDateString() : '—'}</p>
                </div>
                <label className="block">
                  <FieldLabel
                    label="Status"
                    tip="Update your progress. Closed tasks are read-only unless the owner reopens them."
                  />
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                    disabled={task?.status === 'closed'}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {task && (isOwner || isAssigneeOnly || isAdmin) && (
              <label className="block border-t border-slate-200 pt-4">
                <FieldLabel
                  label="Add comment"
                  tip="Notes for the team. Saved when you click Save. Status changes can be recorded here too."
                  className="font-semibold text-slate-700"
                />
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a comment (saved with Save)..."
                  className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </label>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded border border-slate-300 px-4 py-2 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (isAssigneeOnly && task?.status === 'closed' && !commentBody.trim())}
                className="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50 sm:w-auto"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>

        {commentsPanel}
      </div>
    </div>
  );
}
