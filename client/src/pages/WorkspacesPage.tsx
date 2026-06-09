import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { reconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { FieldLabel } from '../components/InfoTip';

interface WorkspaceItem {
  id: string;
  name: string;
  isDefault: boolean;
  workspaceRole: string;
  taskCount: number;
}

export default function WorkspacesPage() {
  const { memberships, account, workspace, fetchMemberships, switchContext } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const isAccountAdmin =
    memberships.find((m) => m.accountId === account?.id)?.accountRole === 'admin';

  const load = () => {
    api.get('/workspaces').then(({ data }) => setWorkspaces(data.data));
  };

  useEffect(() => {
    load();
  }, [account?.id]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/workspaces', { name });
      setName('');
      await fetchMemberships();
      load();
      showToast('Workspace created');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create workspace';
      setError(msg);
    }
  };

  const switchAwayIfCurrent = async (workspaceId: string) => {
    if (!account?.id || workspace?.id !== workspaceId) return;
    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    if (remaining.length === 0) return;
    await switchContext(account.id, remaining[0].id);
    reconnectSocket();
  };

  const handleRename = async (workspaceId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed.length < 2) return;
    setError('');
    setBusyId(workspaceId);
    try {
      await api.patch(`/workspaces/${workspaceId}`, { name: trimmed });
      setRenamingId(null);
      setRenameValue('');
      await fetchMemberships();
      load();
      showToast('Workspace renamed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to rename workspace';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (ws: WorkspaceItem) => {
    if (
      !confirm(
        `Delete "${ws.name}"? This cannot be undone. Only empty workspaces can be deleted.`
      )
    ) {
      return;
    }
    setError('');
    setBusyId(ws.id);
    try {
      await api.delete(`/workspaces/${ws.id}`);
      await switchAwayIfCurrent(ws.id);
      await fetchMemberships();
      load();
      showToast('Workspace deleted');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete workspace';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (ws: WorkspaceItem) => {
    if (
      !confirm(
        `Archive "${ws.name}"? It will be hidden from everyone. Tasks and history are kept.`
      )
    ) {
      return;
    }
    setError('');
    setBusyId(ws.id);
    try {
      await api.post(`/workspaces/${ws.id}/archive`);
      await switchAwayIfCurrent(ws.id);
      await fetchMemberships();
      load();
      showToast('Workspace archived');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to archive workspace';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">Workspaces</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Organize teams into focused spaces for tasks, members, and ownership.
      </p>

      {isAccountAdmin && (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-end"
        >
          <label className="min-w-0 flex-1">
            <FieldLabel
              label="New workspace name"
              tip="Create a separate space for tasks and members within your account."
            />
            <input
              required
              placeholder="New workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded bg-indigo-600 px-4 py-2 text-white sm:w-auto"
          >
            Create
          </button>
        </form>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {workspaces.map((ws) => {
          const canManageMembers =
            ws.workspaceRole === 'admin' ||
            memberships.find((m) => m.accountId === account?.id)?.accountRole === 'admin';
          const isWorkspaceAdmin = ws.workspaceRole === 'admin';
          const isRenaming = renamingId === ws.id;
          const isBusy = busyId === ws.id;

          return (
            <div
              key={ws.id}
              className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(ws.id);
                    }}
                  >
                    <input
                      autoFocus
                      required
                      minLength={2}
                      maxLength={200}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setRenamingId(null);
                          setRenameValue('');
                        }}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="font-medium">
                      {ws.name}{' '}
                      {ws.isDefault && (
                        <span className="text-xs text-slate-500">(default)</span>
                      )}
                      {ws.id === workspace?.id && (
                        <span className="text-xs font-medium text-indigo-600"> · current</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">
                      Role: {ws.workspaceRole}
                      {ws.taskCount > 0 && ` · ${ws.taskCount} task${ws.taskCount === 1 ? '' : 's'}`}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {isWorkspaceAdmin && !isRenaming && (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setRenamingId(ws.id);
                        setRenameValue(ws.name);
                        setError('');
                      }}
                      className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      Rename
                    </button>
                    {!ws.isDefault && ws.taskCount === 0 && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(ws)}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                    {!ws.isDefault && ws.taskCount > 0 && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleArchive(ws)}
                        className="text-sm text-amber-700 hover:underline disabled:opacity-50"
                      >
                        Archive
                      </button>
                    )}
                  </>
                )}
                <Link
                  to={`/settings/workspaces/${ws.id}/members`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {canManageMembers ? 'Manage members' : 'View members'}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
