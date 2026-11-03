import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { validateEmail } from '@shared/validation';

export default function ForgotPassword() {
  const { requestPasswordReset, isAuthenticated } = useAuth();
  const backTo = isAuthenticated ? '/home' : '/login';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const checked = validateEmail(email);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setBusy(true);
    try {
      await requestPasswordReset(checked.value);
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <Link to={backTo} className="btn-secondary mb-4 px-3 py-1.5 text-xs">
          ← Back
        </Link>

        <Link
          to="/"
          className="mb-8 block text-center font-display text-2xl font-bold text-gilt-400"
        >
          Bibleo<span className="text-parchment-100">Guessr</span>
        </Link>

        {sent ? (
          <div className="panel space-y-4">
            <h1 className="font-display text-2xl font-bold text-parchment-50">Check your email</h1>
            <p className="form-note">
              If an account exists for that address, a password reset link is on its way. The
              link expires after an hour.
            </p>
            <p className="text-sm text-parchment-400">
              Nothing arrived? Check your spam folder, then try again — the message comes from a
              no-reply address.
            </p>
            <Link to="/login" className="btn-primary w-full py-2.5">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="panel space-y-4" noValidate>
            <h1 className="font-display text-2xl font-bold text-parchment-50">Reset password</h1>
            <p className="text-sm text-parchment-300">
              Enter the email address on your account and we will send you a link to set a new
              password.
            </p>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-parchment-400">
              Remembered it?{' '}
              <Link to="/login" className="text-gilt-400 underline-offset-2 hover:underline">
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
