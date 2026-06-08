import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { formatApiError, parseApiError, type FieldErrors } from '../utils/apiErrors';
import { confirmPasswordError } from '../utils/password';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<{ email: string; name: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .get(`/auth/reset-password/${token}/validate`)
      .then(({ data }) => setMeta(data.data))
      .catch(() => setError('Invalid or expired reset link'));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setFieldErrors({});
    setMessage('');
    const matchError = confirmPasswordError(password, confirmPassword);
    if (matchError) {
      setFieldErrors({ confirmPassword: matchError });
      setError(matchError);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Password reset failed');
      setFieldErrors(parsed.fieldErrors);
      setError(formatApiError(parsed));
    } finally {
      setLoading(false);
    }
  };

  if (!meta && !error) {
    return <div className="flex min-h-screen items-center justify-center">Loading reset link...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-2 text-2xl font-bold">Reset password</h1>
        {meta && (
          <p className="mb-6 text-sm text-slate-600">
            Choose a new password for <strong>{meta.email}</strong>.
          </p>
        )}
        {message && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!message && !error && (
          <>
            <label className="mb-4 block">
              <span className="text-sm text-slate-600">New password</span>
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
          </>
        )}
        {!message && !error && (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        )}
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-indigo-600">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
