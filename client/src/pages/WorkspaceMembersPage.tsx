import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { reconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { FieldLabel } from '../components/InfoTip';

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

interface PendingInvite {
  _id: string;
  email: string;
  expiresAt: string;
}

export default function WorkspaceMembersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, memberships, account, workspace, switchContext, fetchMemberships } =
    useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const [members, setMembers] = useState<Member[]>([]);
  const [accountMembers, setAccountMembers] = useState<AccountMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteResult, setInviteResult] = useState<{
    type: string;
    inviteUrl?: string;
    message?: string;
    emailSent?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null);

  const accountMembership = memberships.find((m) => m.accountId === account?.id);
  const isAccountAdmin = accountMembership?.accountRole === 'admin';

  const targetWorkspace = useMemo(
    () => accountMembership?.workspaces.find((w) => w.workspaceId === id),
    [accountMembership, id]
  );
  const workspaceName =
    targetWorkspace?.name ??
    (workspace?.id === id ? workspace.name : undefined) ??
    'Workspace';
  const canManage =
    targetWorkspace?.workspaceRole === 'admin' || isAccountAdmin;

  const adminCount = useMemo(
    () => members.filter((m) => m.workspaceRole === 'admin').length,
    [members]
  );

  const isLastAdmin = (member: Member) =>
    member.workspaceRole === 'admin' && adminCount <= 1;

  const load = async () => {
    if (!id) return;
    const requests: Promise<unknown>[] = [api.get(`/workspaces/${id}/members`)];
    if (isAccountAdmin) {
      requests.push(api.get('/members'));
    }
    if (canManage) {
      requests.push(api.get('/invites', { params: { workspaceId: id } }));
    }

    const results = await Promise.all(requests);
    let index = 0;
    const membersRes = results[index++] as { data: { data: Member[] } };
    setMembers(membersRes.data.data);

    if (isAccountAdmin) {
      const accountRes = results[index++] as {
        data: { data: AccountMember[] };
      };
      setAccountMembers(
        accountRes.data.data.filter((m: AccountMember) => m.status === 'verified')
      );
    } else {
      setAccountMembers([]);
    }

    if (canManage) {
      const invitesRes = results[index++] as { data: { data: PendingInvite[] } };
      setPendingInvites(invitesRes.data.data);
    } else {
      setPendingInvites([]);
    }
  };

  useEffect(() => {
    if (!id || !account?.id) return;

    const hasAccess = accountMembership?.workspaces.some((w) => w.workspaceId === id);

    if (!hasAccess) {
      navigate('/settings/workspaces', { replace: true });
      return;
    }

    if (workspace?.id === id) return;

    let cancelled = false;

    (async () => {
      try {
        await switchContext(account.id, id);
        if (!cancelled) {
          reconnectSocket();
        }
      } catch {
        if (!cancelled) {
          navigate('/settings/workspaces', { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, account?.id, workspace?.id, accountMembership, switchContext, navigate]);

  useEffect(() => {
    setMembers([]);
    setSelectedUserId('');
    setInviteResult(null);
    load();
  }, [id, canManage, isAccountAdmin]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setInviteResult(null);
    try {
      const { data } = await api.post('/invites', {
        email: inviteEmail,
        name: inviteName || undefined,
        workspaceId: id,
      });
      if (data.data.type === 'pending') {
        setInviteResult({
          type: 'pending',
          inviteUrl: data.data.inviteUrl,
          emailSent: data.data.emailSent,
        });
        showToast(data.data.emailSent ? 'Invite email sent' : 'Invite link created');
      } else {
        setInviteResult({
          type: 'added',
          message: `${inviteEmail} added to ${workspaceName}.`,
        });
        showToast('Member added to workspace');
      }
      setInviteEmail('');
      setInviteName('');
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invite failed';
      setError(msg);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invitation?')) return;
    setError('');
    try {
      await api.delete(`/invites/${inviteId}`);
      showToast('Invitation revoked');
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not revoke invite';
      setError(msg);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copied');
  };

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
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Invite new member</h2>
          <form
            onSubmit={handleInvite}
            className="mb-4 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-end"
          >
            <label className="min-w-0 flex-1">
              <FieldLabel
                label="Email"
                tip="New users receive an invite link by email. Existing verified users are added immediately."
              />
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="min-w-0 flex-1 sm:max-w-[11rem]">
              <FieldLabel label="Name" tip="Optional display name for the invitation email." />
              <input
                placeholder="Optional"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="w-full shrink-0 rounded bg-indigo-600 px-4 py-2 text-white sm:w-auto"
            >
              Send invite
            </button>
          </form>

          {inviteResult?.type === 'pending' && inviteResult.inviteUrl && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm">
                {inviteResult.emailSent
                  ? 'An invitation email was sent. You can also copy and share this link:'
                  : 'The invite email could not be sent. Share this link manually:'}
              </p>
              <code className="block break-all text-xs">{inviteResult.inviteUrl}</code>
              <button
                type="button"
                onClick={() => copyLink(inviteResult.inviteUrl!)}
                className="mt-2 text-sm text-indigo-600 hover:underline"
              >
                Copy link
              </button>
            </div>
          )}

          {inviteResult?.type === 'added' && (
            <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {inviteResult.message}
            </p>
          )}

          <h3 className="mb-2 text-sm font-medium text-slate-700">Pending invitations</h3>
          <div className="space-y-2">
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-slate-500">No pending invites for this workspace.</p>
            ) : (
              pendingInvites.map((inv) => (
                <div
                  key={inv._id}
                  className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-slate-500">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeInvite(inv._id)}
                    className="text-red-600 hover:underline sm:shrink-0"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {canManage && isAccountAdmin && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Add existing account member</h2>
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row"
          >
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
            <button
              type="submit"
              className="w-full rounded bg-indigo-600 px-4 py-2 text-white sm:w-auto"
            >
              Add
            </button>
          </form>
        </section>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <h2 className="mb-3 font-semibold">Members</h2>
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
                      roleLocked ? 'At least one workspace admin is required' : undefined
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
                      lastAdmin ? 'At least one workspace admin is required' : undefined
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
