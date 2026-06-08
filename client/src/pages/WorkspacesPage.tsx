import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { FieldLabel } from '../components/InfoTip';

interface WorkspaceItem {
  id: string;
  name: string;
  isDefault: boolean;
  workspaceRole: string;
}

export default function WorkspacesPage() {
  const { memberships, account, workspace } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
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
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create workspace';
      setError(msg);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">Workspaces</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Organize teams into focused spaces for tasks, members, and ownership.
      </p>

      {isAccountAdmin && (
        <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-end">
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
          <button type="submit" className="w-full rounded bg-indigo-600 px-4 py-2 text-white sm:w-auto">
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

          return (
          <div
            key={ws.id}
            className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {ws.name}{' '}
                {ws.isDefault && <span className="text-xs text-slate-500">(default)</span>}
                {ws.id === workspace?.id && (
                  <span className="text-xs font-medium text-indigo-600"> · current</span>
                )}
              </p>
              <p className="text-sm text-slate-500">Role: {ws.workspaceRole}</p>
            </div>
            <Link
              to={`/settings/workspaces/${ws.id}/members`}
              className="shrink-0 text-indigo-600 hover:underline"
            >
              {canManageMembers ? 'Manage members' : 'View members'}
            </Link>
          </div>
          );
        })}
      </div>
    </div>
  );
}
