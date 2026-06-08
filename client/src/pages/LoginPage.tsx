import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { connectSocket } from '../services/socket';
import { formatApiError, parseApiError } from '../utils/apiErrors';

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await login(email, password);
      connectSocket();
      navigate('/dashboard');
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Login failed');
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setResendLoading(true);
    setInfo('');
    setError('');
    try {
      const { data } = await api.post('/auth/resend-verification', { email: email.trim() });
      setInfo(data.message);
    } catch (err: unknown) {
      setError(formatApiError(parseApiError(err, 'Could not resend verification email')));
    } finally {
      setResendLoading(false);
    }
  };

  const showResend = error.toLowerCase().includes('verify your email');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
        {error && (
          <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {info}
          </div>
        )}
        <label className="mb-4 block">
          <span className="text-sm text-slate-600">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mb-2 block">
          <span className="text-sm text-slate-600">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="mb-6 text-right">
          <Link to="/forgot-password" state={{ email }} className="text-sm text-indigo-600">
            Forgot password?
          </Link>
        </div>
        {showResend && (
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="mb-4 w-full rounded border border-indigo-600 py-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {resendLoading ? 'Sending...' : 'Resend verification email'}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          No account?{' '}
          <Link to="/register" className="text-indigo-600">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
