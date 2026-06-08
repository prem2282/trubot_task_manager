import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { connectSocket } from '../services/socket';
import { formatApiError, parseApiError, type FieldErrors } from '../utils/apiErrors';
import { confirmPasswordError } from '../utils/password';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<{ email: string; accountName: string; inviteeName?: string } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .get(`/invites/${token}/validate`)
      .then(({ data }) => {
        setMeta(data.data);
        if (data.data.inviteeName) setName(data.data.inviteeName);
      })
      .catch(() => setError('Invalid or expired invitation'));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setFieldErrors({});
    const matchError = confirmPasswordError(password, confirmPassword);
    if (matchError) {
      setFieldErrors({ confirmPassword: matchError });
      setError(matchError);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/invites/${token}/accept`, { name, password });
      setSession(data.data);
      await useAuthStore.getState().fetchMemberships();
      connectSocket();
      navigate('/dashboard');
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Failed to accept invite');
      setFieldErrors(parsed.fieldErrors);
      setError(formatApiError(parsed));
    } finally {
      setLoading(false);
    }
  };

  if (!meta && !error) {
    return <div className="flex min-h-screen items-center justify-center">Loading invite...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-2 text-2xl font-bold">Accept invitation</h1>
        {meta && (
          <p className="mb-6 text-sm text-slate-600">
            Join <strong>{meta.accountName}</strong> as {meta.email}
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <label className="mb-4 block">
          <span className="text-sm text-slate-600">Your name</span>
          <input
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.name;
                  return next;
                });
              }
            }}
            aria-invalid={fieldErrors.name ? true : undefined}
            className={`mt-1 w-full rounded border px-3 py-2 ${
              fieldErrors.name ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {fieldErrors.name && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.name}</span>
          )}
        </label>
        <label className="mb-4 block">
          <span className="text-sm text-slate-600">Create password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.password;
                  return next;
                });
              }
            }}
            aria-invalid={fieldErrors.password ? true : undefined}
            className={`mt-1 w-full rounded border px-3 py-2 ${
              fieldErrors.password ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {!fieldErrors.password && (
            <span className="mt-1 block text-xs text-slate-500">At least 8 characters</span>
          )}
          {fieldErrors.password && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.password}</span>
          )}
        </label>
        <label className="mb-6 block">
          <span className="text-sm text-slate-600">Confirm password</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.confirmPassword;
                  return next;
                });
              }
            }}
            aria-invalid={fieldErrors.confirmPassword ? true : undefined}
            className={`mt-1 w-full rounded border px-3 py-2 ${
              fieldErrors.confirmPassword ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {fieldErrors.confirmPassword && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.confirmPassword}</span>
          )}
        </label>
        <button
          type="submit"
          disabled={loading || !!error}
          className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join account'}
        </button>
      </form>
    </div>
  );
}
