import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { useAuthStore, isWorkspaceAdmin } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { useToastStore } from '../store/toastStore';
import { Task, TaskStatus, User } from '../types';
import TaskModal from '../components/TaskModal';
import { FieldLabel } from '../components/InfoTip';
import { getUserId, dueDateUrgencyChipClass, dueDateUrgencyLabel, getDueDateUrgency, statusChipClass, statusLabel } from '../utils/taskHelpers';

function getUserName(value: User | string | Record<string, unknown>): string {
  if (typeof value === 'string') return value;
  if ('name' in value && typeof value.name === 'string') return value.name;
  return 'Unknown';
}

function getTaskActions(
  task: Task,
  currentUserId: string,
  isAdmin: boolean
) {
  const isOwner = getUserId(task.createdBy) === currentUserId;
  const isAssignee = getUserId(task.assignee) === currentUserId;
  const canOpen = isOwner || isAssignee || isAdmin;
  const canDelete = isOwner || isAdmin;
  const openLabel = isOwner || isAdmin ? 'Edit' : 'View';
  return { canOpen, canDelete, openLabel };
}

export default function DashboardPage() {
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const account = useAuthStore((s) => s.account);
  const workspace = useAuthStore((s) => s.workspace);
  const memberships = useAuthStore((s) => s.memberships);
  const isAdmin = isWorkspaceAdmin(memberships, account?.id, workspace?.id);
  const showToast = useToastStore((s) => s.showToast);
  const { tasks, filters, meta, isLoading, fetchTasks, loadMoreTasks, setFilters, clearFilters, upsertTask, removeTask } =
    useTaskStore();
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
    api.get('/users').then(({ data }) => setUsers(data.data));
    connectSocket();
    const socket = getSocket();
    if (!socket) return;

    socket.on('task:created', ({ task }: { task: Task }) => upsertTask(task));
    socket.on('task:updated', ({ task }: { task: Task }) => upsertTask(task));
    socket.on('task:deleted', ({ taskId }: { taskId: string }) => removeTask(taskId));

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, [fetchTasks, upsertTask, removeTask]);

  const applyFilters = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    fetchTasks();
    showToast('Task deleted');
  };

  const openTask = async (task: Task) => {
    const { data } = await api.get(`/tasks/${task._id}`);
    setEditingTask(data.data);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">TaskBoard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan, assign, and track task progress across your current workspace.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
          className="w-full shrink-0 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 sm:w-auto"
        >
          New task
        </button>
      </div>

      <form onSubmit={applyFilters} className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <label className="flex min-w-0 flex-col gap-1 lg:w-auto">
          <FieldLabel
            label="Status"
            tip="Filter tasks by workflow status. Leave as “All statuses” to show every task in this workspace."
          />
          <select
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, status: (e.target.value as TaskStatus) || undefined })
            }
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="reopened">Re-opened</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 lg:w-auto">
          <FieldLabel
            label="Assignee"
            tip="Show tasks assigned to a specific team member, or all assignees."
          />
          <select
            value={filters.assignee ?? ''}
            onChange={(e) => setFilters({ ...filters, assignee: e.target.value || undefined })}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 lg:w-auto">
          <FieldLabel
            label="Due from"
            tip="Only show tasks with a due date on or after this day."
          />
          <input
            type="date"
            value={filters.dueDateFrom ?? ''}
            onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value || undefined })}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 lg:w-auto">
          <FieldLabel
            label="Due to"
            tip="Only show tasks with a due date on or before this day."
          />
          <input
            type="date"
            value={filters.dueDateTo ?? ''}
            onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value || undefined })}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 sm:w-auto lg:self-end"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => clearFilters()}
          className="w-full rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 sm:w-auto lg:self-end"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters({ ...filters, assignee: currentUserId });
            void fetchTasks();
          }}
          className="w-full rounded border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-100 sm:w-auto lg:self-end"
        >
          My tasks
        </button>
      </form>

      {meta && meta.total > 0 && (
        <p className="mb-3 text-sm text-slate-500">
          Showing {tasks.length} of {meta.total} tasks
        </p>
      )}

      {isLoading ? (
        <p className="text-slate-600">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-slate-500 shadow-sm">No tasks yet.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {tasks.map((task) => {
              const dueUrgency = getDueDateUrgency(task.dueDate, task.status);
              const { canOpen, canDelete, openLabel } = getTaskActions(task, currentUserId, isAdmin);
              return (
                <article
                  key={task._id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="font-medium leading-snug">{task.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass(task.status)}`}
                    >
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  <dl className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between gap-2">
                      <dt>Assignee</dt>
                      <dd className="text-right font-medium text-slate-800">
                        {getUserName(task.assignee)}
                      </dd>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <dt>Due</dt>
                      <dd className="flex flex-wrap items-center justify-end gap-2">
                        <span>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </span>
                        {dueUrgency && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dueDateUrgencyChipClass(dueUrgency)}`}
                          >
                            {dueDateUrgencyLabel(dueUrgency)}
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                    {canOpen && (
                      <button
                        className="text-indigo-600 hover:underline"
                        onClick={() => openTask(task)}
                      >
                        {openLabel}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDelete(task._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm md:block">
            <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const dueUrgency = getDueDateUrgency(task.dueDate, task.status);
                const { canOpen, canDelete, openLabel } = getTaskActions(task, currentUserId, isAdmin);
                return (
                  <tr key={task._id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass(task.status)}`}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getUserName(task.assignee)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </span>
                        {dueUrgency && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dueDateUrgencyChipClass(dueUrgency)}`}
                          >
                            {dueDateUrgencyLabel(dueUrgency)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canOpen && (
                        <button
                          className="mr-2 text-indigo-600 hover:underline"
                          onClick={() => openTask(task)}
                        >
                          {openLabel}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(task._id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {meta && meta.page < meta.totalPages && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => loadMoreTasks()}
                disabled={isLoading}
                className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          users={users}
          currentUserId={currentUserId}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSaved={() => {
            fetchTasks();
            showToast('Task saved');
          }}
        />
      )}
    </div>
  );
}
