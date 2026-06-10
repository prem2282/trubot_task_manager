import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { connectSocket } from '../services/socket';
import { formatApiError, parseApiError } from '../utils/apiErrors';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<{ email: string; name: string; alreadyVerified?: boolean } | null>(
    null
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const fetchMemberships = useAuthStore((s) => s.fetchMemberships);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .get(`/auth/verify-email/${token}/validate`)
      .then(({ data }) => setMeta(data.data))
      .catch(() => setError('Invalid or expired verification link'));
  }, [token]);

  const handleVerify = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/auth/verify-email/${token}`);
      setSession(data.data);
      await fetchMemberships();
      connectSocket();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(formatApiError(parseApiError(err, 'Verification failed')));
    } finally {
      setLoading(false);
    }
  };

  if (!meta && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-slate-600">Checking your verification link...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-2 text-2xl font-bold">Verify your email</h1>
        {meta && (
          <p className="mb-6 text-sm text-slate-600">
            Confirm <strong>{meta.email}</strong> to activate your Task Manager account.
          </p>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!error && meta && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>
        )}
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-indigo-600">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
