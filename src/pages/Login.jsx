import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { validateEmail } from '@shared/validation';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // A visitor who already chose "Continue as Guest" has a session to go back
  // to; anyone else came straight from the landing page.
  const backTo = isAuthenticated ? '/home' : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const checkedEmail = validateEmail(email);
    if (!checkedEmail.ok) {
      setError(checkedEmail.error);
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setBusy(true);
    try {
      // The password goes straight from this field to Firebase Auth over HTTPS.
      // It is never sanitised, stored, logged or sent to our own functions.
      await login({ email: checkedEmail.value, password });
      navigate(location.state?.from ?? '/home', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <Link to={backTo} className="btn-secondary mb-4 px-3 py-1.5 text-xs">
          ← {isAuthenticated ? 'Back to Home' : 'Back'}
        </Link>

        <Link
          to={backTo}
          className="mb-8 block text-center font-display text-2xl font-bold text-gilt-400"
        >
          Bibleo<span className="text-parchment-100">Guessr</span>
        </Link>

        <form onSubmit={handleSubmit} className="panel space-y-4" noValidate>
          <h1 className="font-display text-2xl font-bold text-parchment-50">Welcome back</h1>

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

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? 'Signing in…' : 'Login'}
          </button>

          <p className="text-center text-sm text-parchment-400">
            No account?{' '}
            <Link to="/signup" className="text-gilt-400 underline-offset-2 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
