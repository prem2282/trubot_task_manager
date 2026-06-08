import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { FieldLabel } from '../components/InfoTip';

interface InviteItem {
  _id: string;
  email: string;
  expiresAt: string;
  workspaceId?: string;
}

export default function TeamPage() {
  const { workspace, memberships, account } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState(workspace?.id ?? '');
  const [result, setResult] = useState<{
    type: string;
    inviteUrl?: string;
    message?: string;
    emailSent?: boolean;
  } | null>(null);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [error, setError] = useState('');

  const currentMembership = memberships.find((m) => m.accountId === account?.id);
  const accountWorkspaces = currentMembership?.workspaces ?? [];
  const isAdmin = currentMembership?.accountRole === 'admin';

  useEffect(() => {
    if (workspace?.id) {
      setInviteWorkspaceId(workspace.id);
    }
  }, [workspace?.id]);

  const loadInvites = () => {
    if (!isAdmin) return;
    api.get('/invites').then(({ data }) => setInvites(data.data));
  };

  useEffect(() => {
    loadInvites();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Team & invites</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Invite account members and manage pending invitations for collaboration.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          You are a member of this account. Contact your account admin if you need to invite
          teammates or manage pending invitations.
        </div>
      </div>
    );
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/invites', {
        email,
        name: name || undefined,
        workspaceId: inviteWorkspaceId || workspace?.id,
      });
      if (data.data.type === 'pending') {
        setResult({
          type: 'pending',
          inviteUrl: data.data.inviteUrl,
          emailSent: data.data.emailSent,
        });
        showToast(data.data.emailSent ? 'Invite email sent' : 'Invite link created');
      } else {
        setResult({ type: 'added', message: `${email} added to the team.` });
        showToast('Member added to account');
      }
      setEmail('');
      setName('');
      loadInvites();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invite failed';
      setError(msg);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Revoke this invitation?')) return;
    try {
      await api.delete(`/invites/${inviteId}`);
      loadInvites();
      showToast('Invitation revoked');
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

  const workspaceName = (workspaceId?: string) =>
    accountWorkspaces.find((w) => w.workspaceId === workspaceId)?.name ?? 'Workspace';

  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">Team & invites</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Invite account members and manage pending invitations for collaboration.
      </p>

      <form onSubmit={handleInvite} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow-sm">
        <label className="block">
          <FieldLabel
            label="Invite to workspace"
            tip="New members are added to this workspace and the parent account."
          />
          <select
            required
            value={inviteWorkspaceId}
            onChange={(e) => setInviteWorkspaceId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {accountWorkspaces.map((ws) => (
              <option key={ws.workspaceId} value={ws.workspaceId}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <FieldLabel
            label="Invitee email"
            tip="If they already have an account they are added immediately; otherwise an invite email is sent with a sign-up link."
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <FieldLabel
            label="Invitee name"
            tip="Optional display name included in the invitation email."
          />
          <input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button type="submit" className="w-full rounded bg-indigo-600 px-4 py-2 text-white sm:w-auto">
          Invite to account
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {result?.type === 'pending' && result.inviteUrl && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm">
            {result.emailSent
              ? 'An invitation email was sent. You can also copy and share this link directly:'
              : 'The invite email could not be sent. Share this link manually with the invitee:'}
          </p>
          <code className="block break-all text-xs">{result.inviteUrl}</code>
          <button
            onClick={() => copyLink(result.inviteUrl!)}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            Copy link
          </button>
        </div>
      )}

      {result?.type === 'added' && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {result.message}
        </p>
      )}

      <h2 className="mb-3 font-semibold">Pending invitations</h2>
      <div className="space-y-2">
        {invites.length === 0 ? (
          <p className="text-sm text-slate-500">No pending invites.</p>
        ) : (
          invites.map((inv) => (
            <div
              key={inv._id}
              className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{inv.email}</p>
                <p className="text-slate-500">
                  {workspaceName(inv.workspaceId)} · expires{' '}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(inv._id)}
                className="text-red-600 hover:underline sm:shrink-0"
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
