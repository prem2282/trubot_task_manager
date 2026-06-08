import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

interface Member {
  userId: string;
  name: string;
  email: string;
  workspaceRole: 'admin' | 'member';
}

interface AccountMember {
  userId: string;
  name: string;
  email: string;
  status: string;
}

export default function WorkspaceMembersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, memberships, account, workspace, switchContext, fetchMemberships } =
    useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const [members, setMembers] = useState<Member[]>([]);
  const [accountMembers, setAccountMembers] = useState<AccountMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState('');
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null);

  const currentWs = memberships
    .find((m) => m.accountId === account?.id)
    ?.workspaces.find((w) => w.workspaceId === id);
  const workspaceName = currentWs?.name ?? 'Workspace';
  const canManage =
    currentWs?.workspaceRole === 'admin' ||
    memberships.find((m) => m.accountId === account?.id)?.accountRole === 'admin';

  const adminCount = useMemo(
    () => members.filter((m) => m.workspaceRole === 'admin').length,
    [members]
  );

  const isLastAdmin = (member: Member) =>
    member.workspaceRole === 'admin' && adminCount <= 1;

  const load = async () => {
    if (!id) return;
    const [membersRes, accountRes] = await Promise.all([
      api.get(`/workspaces/${id}/members`),
      canManage ? api.get('/members') : Promise.resolve({ data: { data: [] } }),
    ]);
    setMembers(membersRes.data.data);
    setAccountMembers(accountRes.data.data.filter((m: AccountMember) => m.status === 'verified'));
  };

  useEffect(() => {
    if (workspace?.id && id && workspace.id !== id) {
      navigate(`/settings/workspaces/${workspace.id}/members`, { replace: true });
    }
  }, [workspace?.id, id, navigate]);

  useEffect(() => {
    setMembers([]);
    setSelectedUserId('');
    load();
  }, [id, canManage]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !selectedUserId) return;
    setError('');
    try {
      await api.post(`/workspaces/${id}/members`, { userId: selectedUserId });
      setSelectedUserId('');
      showToast('Member added to workspace');
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to add member';
      setError(msg);
    }
  };

  const handleRemove = async (member: Member) => {
    if (!id || isLastAdmin(member)) return;
    if (!confirm('Remove member from workspace?')) return;
    setError('');
    try {
      await api.delete(`/workspaces/${id}/members/${member.userId}`);
      showToast('Member removed from workspace');
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to remove member';
      setError(msg);
    }
  };

  const handleRoleChange = async (member: Member, workspaceRole: 'admin' | 'member') => {
    if (!id || member.workspaceRole === workspaceRole) return;
    if (member.workspaceRole === 'admin' && workspaceRole === 'member' && isLastAdmin(member)) {
      return;
    }

    setError('');
    setRoleUpdatingUserId(member.userId);
    try {
      await api.patch(`/workspaces/${id}/members/${member.userId}`, { workspaceRole });
      showToast(`Role updated to ${workspaceRole}`);

      if (member.userId === user?.id && account?.id && workspace?.id) {
        await switchContext(account.id, workspace.id);
        await fetchMemberships();
      }

      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update role';
      setError(msg);
    } finally {
      setRoleUpdatingUserId(null);
    }
  };

  const availableToAdd = accountMembers.filter(
    (am) => !members.some((m) => m.userId === am.userId)
  );

  return (
    <div>
      <Link to="/settings/workspaces" className="text-sm text-indigo-600 hover:underline">
        ← Back to workspaces
      </Link>
      <h1 className="mb-6 mt-2 text-xl font-bold sm:text-2xl">{workspaceName} — members</h1>

      {canManage && (
        <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row">
          <select
            required
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Select account member</option>
            {availableToAdd.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
          <button type="submit" className="w-full rounded bg-indigo-600 px-4 py-2 text-white sm:w-auto">
            Add
          </button>
        </form>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {members.map((m) => {
          const lastAdmin = isLastAdmin(m);
          const roleLocked = lastAdmin;

          return (
            <div
              key={m.userId}
              className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-slate-500">{m.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canManage ? (
                  <select
                    value={m.workspaceRole}
                    disabled={roleLocked || roleUpdatingUserId === m.userId}
                    title={
                      roleLocked
                        ? 'At least one workspace admin is required'
                        : undefined
                    }
                    onChange={(e) =>
                      handleRoleChange(m, e.target.value as 'admin' | 'member')
                    }
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                ) : (
                  <span className="text-sm capitalize text-slate-600">{m.workspaceRole}</span>
                )}
                {canManage && (
                  <button
                    onClick={() => handleRemove(m)}
                    disabled={lastAdmin}
                    title={
                      lastAdmin
                        ? 'At least one workspace admin is required'
                        : undefined
                    }
                    className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
