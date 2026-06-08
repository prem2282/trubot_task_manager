import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { reconnectSocket } from '../services/socket';
import { FieldLabel } from './InfoTip';

export default function WorkspaceSwitcher() {
  const { memberships, account, workspace, switchContext } = useAuthStore();
  const { clearTasks, fetchTasks } = useTaskStore();
  const [loading, setLoading] = useState(false);

  const currentAccount = memberships.find((m) => m.accountId === account?.id);
  const workspaces = currentAccount?.workspaces ?? [];
  const currentWorkspace = workspaces.find((w) => w.workspaceId === workspace?.id);

  const handleChange = async (workspaceId: string) => {
    if (!account || workspaceId === workspace?.id) return;
    setLoading(true);
    try {
      await switchContext(account.id, workspaceId);
      clearTasks();
      reconnectSocket();
      await fetchTasks();
    } finally {
      setLoading(false);
    }
  };

  if (workspaces.length <= 1) {
    return (
      <span className="block truncate text-sm font-medium text-slate-700">
        {workspace?.name ?? currentWorkspace?.name ?? workspaces[0]?.name ?? 'Workspace'}
      </span>
    );
  }

  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <FieldLabel
        label="Switch your workspace here"
        tip="Workspaces group tasks and members within an account. Switching updates the task board and member lists for that workspace."
        className="text-xs text-slate-500"
      />
      <select
        disabled={loading}
        value={workspace?.id ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm sm:w-auto"
      >
        {workspaces.map((w) => (
          <option key={w.workspaceId} value={w.workspaceId}>
            {w.name} ({w.workspaceRole})
          </option>
        ))}
      </select>
    </label>
  );
}
