import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { reconnectSocket } from '../services/socket';
import { FieldLabel } from './InfoTip';

export default function AccountSwitcher() {
  const { memberships, account, switchContext } = useAuthStore();
  const { clearTasks, fetchTasks } = useTaskStore();
  const [loading, setLoading] = useState(false);

  const currentMembership = memberships.find((m) => m.accountId === account?.id);

  const handleChange = async (accountId: string) => {
    const target = memberships.find((m) => m.accountId === accountId);
    if (!target || target.accountId === account?.id) return;

    const workspace =
      target.workspaces.find((w) => w.isDefault) ?? target.workspaces[0];
    if (!workspace) return;

    setLoading(true);
    try {
      await switchContext(accountId, workspace.workspaceId);
      clearTasks();
      reconnectSocket();
      await fetchTasks();
    } finally {
      setLoading(false);
    }
  };

  if (memberships.length <= 1) {
    return (
      <span className="block truncate text-sm font-medium text-slate-700">
        {account?.name ?? currentMembership?.name ?? 'Account'}
      </span>
    );
  }

  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <FieldLabel
        label="Switch your account here"
        tip="Choose which organization account you are working in. Tasks, workspaces, and team settings are scoped to the selected account."
        className="text-xs text-slate-500"
      />
      <select
        disabled={loading}
        value={account?.id ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm sm:w-auto"
      >
        {memberships.map((m) => (
          <option key={m.accountId} value={m.accountId}>
            {m.name} ({m.accountRole})
          </option>
        ))}
      </select>
    </label>
  );
}
