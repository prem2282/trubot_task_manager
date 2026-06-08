import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { formatApiError, parseApiError } from '../utils/apiErrors';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const prefilledEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(prefilledEmail);
  const [message, setMessage] = useState('');
  const [devInboxUrl, setDevInboxUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevInboxUrl('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
      if (data.devInboxUrl) {
        setDevInboxUrl(data.devInboxUrl);
      } else if (import.meta.env.DEV) {
        setDevInboxUrl('http://localhost:8025');
      }
    } catch (err: unknown) {
      setError(formatApiError(parseApiError(err, 'Request failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-2 text-2xl font-bold">Forgot password</h1>
        <p className="mb-6 text-sm text-slate-600">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
        {import.meta.env.DEV && !message && (
          <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Local dev: emails are captured by{' '}
            <a href="http://localhost:8025" className="text-indigo-600">
              Mailpit
            </a>
            , not sent to Gmail/Outlook.
          </p>
        )}
        {message && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        )}
        {devInboxUrl && (
          <p className="mb-4 rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
            Open{' '}
            <a href={devInboxUrl} className="font-medium underline">
              Mailpit ({devInboxUrl})
            </a>{' '}
            to read the reset email and click the link.
          </p>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <label className="mb-6 block">
          <span className="text-sm text-slate-600">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-indigo-600">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
