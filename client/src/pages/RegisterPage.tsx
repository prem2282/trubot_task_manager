import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { fieldLabel, formatApiError, parseApiError, type FieldErrors } from '../utils/apiErrors';
import { confirmPasswordError } from '../utils/password';
import { isLocalDev, MAILPIT_URL } from '../utils/isLocalDev';
import { FieldLabel } from '../components/InfoTip';

type RegisterField = 'name' | 'email' | 'password' | 'confirmPassword' | 'accountName';

const FIELD_TIPS: Partial<Record<RegisterField, string>> = {
  name: 'Your display name shown to teammates on tasks and comments.',
  email: 'Used to sign in and receive verification or password reset emails.',
  password: 'At least 8 characters. Keep it secure — you will use it to sign in.',
  confirmPassword: 'Re-enter your password to confirm there are no typos.',
  accountName: 'Optional name for your organization. Leave blank to use your personal name.',
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountName: '',
  });
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const updateField = (field: RegisterField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const matchError = confirmPasswordError(form.password, form.confirmPassword);
    if (matchError) {
      setFieldErrors({ confirmPassword: matchError });
      setError(matchError);
      return;
    }
    setLoading(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.accountName.trim() ? { accountName: form.accountName.trim() } : {}),
    };

    try {
      const result = await register(payload);
      setRegisteredEmail(result.email);
      setSuccessMessage(result.message);
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Registration failed');
      setFieldErrors(parsed.fieldErrors);
      setError(formatApiError(parsed));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResendLoading(true);
    setResendMessage('');
    setError('');
    try {
      const { data } = await api.post('/auth/resend-verification', { email: registeredEmail });
      setResendMessage(data.message);
    } catch (err: unknown) {
      setError(formatApiError(parseApiError(err, 'Could not resend verification email')));
    } finally {
      setResendLoading(false);
    }
  };

  const renderField = (
    field: RegisterField,
    options: {
      label: string;
      type?: string;
      required?: boolean;
      minLength?: number;
    }
  ) => (
    <label key={field} className="mb-4 block">
      <FieldLabel label={options.label} tip={FIELD_TIPS[field]} />
      <input
        type={options.type ?? 'text'}
        required={options.required ?? true}
        minLength={options.minLength}
        value={form[field]}
        onChange={(e) => updateField(field, e.target.value)}
        aria-invalid={fieldErrors[field] ? true : undefined}
        aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
        className={`mt-1 w-full rounded border px-3 py-2 ${
          fieldErrors[field] ? 'border-red-500' : 'border-slate-300'
        }`}
      />
      {fieldErrors[field] && (
        <span id={`${field}-error`} className="mt-1 block text-xs text-red-600">
          {fieldErrors[field]}
        </span>
      )}
    </label>
  );

  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="mb-4 text-sm text-slate-600">{successMessage}</p>
          <p className="mb-6 text-sm text-slate-600">
            We sent a verification link to <strong>{registeredEmail}</strong>.
          </p>
          {isLocalDev() && (
            <p className="mb-6 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Local dev: open{' '}
              <a href={MAILPIT_URL} className="text-indigo-600">
                Mailpit
              </a>{' '}
              to view the email and click the verification link.
            </p>
          )}
          {resendMessage && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {resendMessage}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="mb-4 w-full rounded border border-indigo-600 py-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {resendLoading ? 'Sending...' : 'Resend verification email'}
          </button>
          <p className="text-center text-sm text-slate-600">
            <Link to="/login" className="text-indigo-600">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">Create account</h1>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {renderField('name', { label: fieldLabel('name'), minLength: 2 })}
        {renderField('email', { label: fieldLabel('email'), type: 'email' })}
        {renderField('password', { label: fieldLabel('password'), type: 'password', minLength: 8 })}
        {renderField('confirmPassword', { label: 'Confirm password', type: 'password', minLength: 8 })}
        {renderField('accountName', {
          label: 'Account name (optional)',
          required: false,
        })}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Register'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Have an account?{' '}
          <Link to="/login" className="text-indigo-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
