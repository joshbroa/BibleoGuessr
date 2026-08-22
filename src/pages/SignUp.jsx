import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkUsername, friendlyError } from '@/lib/api';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  PASSWORD_RULE_TEXT,
} from '@shared/validation';

export default function SignUp() {
  const { register, isGuest, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // A visitor who already chose "Continue as Guest" has a session to go back
  // to; anyone else came straight from the landing page.
  const backTo = isAuthenticated ? '/home' : '/';

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const debounce = useRef(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Live username availability. Shape and profanity are checked locally for
   * instant feedback; uniqueness needs the server, so that call is debounced.
   * Both are re-run server-side at submit — this is convenience, not security.
   */
  useEffect(() => {
    const candidate = form.username;
    setUsernameStatus(null);
    if (!candidate) return undefined;

    const local = validateUsername(candidate);
    if (!local.ok) {
      setUsernameStatus({ ok: false, message: local.error });
      return undefined;
    }

    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const result = await checkUsername({ username: local.value });
        setUsernameStatus(
          result.available
            ? { ok: true, message: `${local.value} is available.` }
            : { ok: false, message: result.error }
        );
      } catch {
        // A failed availability probe should not block the form; the server
        // will reject a duplicate at submit time anyway.
        setUsernameStatus(null);
      }
    }, 400);

    return () => clearTimeout(debounce.current);
  }, [form.username]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const checkedEmail = validateEmail(form.email);
    if (!checkedEmail.ok) return setError(checkedEmail.error);

    const checkedUsername = validateUsername(form.username);
    if (!checkedUsername.ok) return setError(checkedUsername.error);

    const checkedPassword = validatePassword(form.password);
    if (!checkedPassword.ok) return setError(checkedPassword.error);

    if (form.password !== form.confirmPassword) {
      return setError('The two passwords do not match.');
    }

    setBusy(true);
    try {
      await register({
        email: checkedEmail.value,
        password: form.password,
        username: checkedUsername.value,
      });
      navigate('/home', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
    return undefined;
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
          <h1 className="font-display text-2xl font-bold text-parchment-50">Create an account</h1>

          {isGuest && (
            <p className="form-note">
              You are playing as a guest. Signing up keeps every game you have already played.
            </p>
          )}

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
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="field-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="field-input"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              aria-describedby="username-help"
              maxLength={20}
              required
            />
            <p
              id="username-help"
              className={`mt-1 text-xs ${
                usernameStatus == null
                  ? 'text-parchment-400/70'
                  : usernameStatus.ok
                    ? 'text-emerald-400'
                    : 'text-red-300'
              }`}
              role={usernameStatus?.ok === false ? 'alert' : undefined}
            >
              {usernameStatus?.message ?? '3–20 characters. Letters, numbers and underscores only.'}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              aria-describedby="password-help"
              required
            />
            <p id="password-help" className="mt-1 text-xs text-parchment-400/70">
              {PASSWORD_RULE_TEXT}
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="field-label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? 'Creating account…' : 'Sign Up'}
          </button>

          <p className="text-center text-sm text-parchment-400">
            Already have an account?{' '}
            <Link to="/login" className="text-gilt-400 underline-offset-2 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
