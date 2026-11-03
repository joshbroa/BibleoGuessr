import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { validatePassword, PASSWORD_RULE_TEXT } from '@shared/validation';
import Spinner from '@/components/Spinner';
import { safeContinue } from '@/lib/continueUrl';

/**
 * The page Firebase's email links land on.
 *
 * Firebase will serve this itself at `/__/auth/action`, but only from a domain
 * it hosts — and this site's apex points at Vercel, so that page is not
 * reachable here. Pointing the templates' action URL at this route instead
 * keeps the links on our own domain, and lets the screens look like the rest of
 * the site rather than an unstyled default.
 *
 * Firebase passes `mode` and `oobCode` on the query string, plus whatever
 * `continueUrl` we attached when sending the mail (see `continueTo` in
 * AuthContext).
 */

export default function AuthAction() {
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();

  const mode = params.get('mode') ?? '';
  const oobCode = params.get('oobCode') ?? '';

  // A finished reset leaves you signed out, so there is nowhere to go but the
  // login screen; everything else can drop you back into the game.
  const fallback = mode === 'resetPassword' ? '/login' : '/home';
  const continueTo = safeContinue(params.get('continueUrl'), fallback);

  // checking → (form) → done | error
  const [status, setStatus] = useState('checking');
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  // These codes are single use. StrictMode runs effects twice in development,
  // and without this guard the second run would find the code already spent,
  // fail with invalid-action-code, and report a successful verification as a
  // broken link.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (!mode || !oobCode) {
      setStatus('error');
      setError('This link is incomplete. Please open it directly from the email.');
      return;
    }

    (async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
          case 'verifyAndChangeEmail': {
            await applyActionCode(auth, oobCode);
            // Clears the "confirm your email" banner for a session that is
            // already signed in here; a no-op in a browser that is not.
            await refreshUser();
            setHeading('Email confirmed');
            setMessage('Your address is verified. That is everything — enjoy the game.');
            setStatus('done');
            break;
          }

          case 'resetPassword': {
            // Checks the code without spending it, and tells us whose account
            // it belongs to so the form can say.
            setEmail(await verifyPasswordResetCode(auth, oobCode));
            setStatus('form');
            break;
          }

          case 'recoverEmail': {
            const info = await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            setEmail(info?.data?.email ?? '');
            setHeading('Email address restored');
            setMessage(
              'The change has been undone. If you did not make it, set a new password now — ' +
                'someone else may know your current one.'
            );
            setStatus('done');
            break;
          }

          default:
            setStatus('error');
            setError('This link is not one we recognise.');
        }
      } catch (err) {
        setStatus('error');
        setError(friendlyError(err));
      }
    })();
  }, [mode, oobCode, refreshUser]);

  async function handleReset(event) {
    event.preventDefault();
    setError('');

    const checked = validatePassword(password);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, checked.value);
      setHeading('Password changed');
      setMessage(
        email
          ? `You can now log in as ${email} with your new password.`
          : 'You can now log in with your new password.'
      );
      setStatus('done');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <Link
          to="/"
          className="mb-8 block text-center font-display text-2xl font-bold text-gilt-400"
        >
          Bibleo<span className="text-parchment-100">Guessr</span>
        </Link>

        {status === 'checking' && (
          <div className="panel flex flex-col items-center gap-4 py-10">
            <Spinner label="Checking your link" />
            <p className="text-sm text-parchment-400">Checking your link…</p>
          </div>
        )}

        {status === 'form' && (
          <form onSubmit={handleReset} className="panel space-y-4" noValidate>
            <h1 className="font-display text-2xl font-bold text-parchment-50">
              Choose a new password
            </h1>
            {email && (
              <p className="text-sm text-parchment-300">
                For <span className="text-parchment-100">{email}</span>.
              </p>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="password" className="field-label">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="form-note">{PASSWORD_RULE_TEXT}</p>
            </div>

            <div>
              <label htmlFor="confirm" className="field-label">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <div className="panel space-y-4">
            <h1 className="font-display text-2xl font-bold text-parchment-50">{heading}</h1>
            <p className="text-sm text-parchment-300">{message}</p>
            <Link to={continueTo} className="btn-primary block w-full py-2.5 text-center">
              Continue
            </Link>
            {mode === 'recoverEmail' && (
              <Link to="/forgot-password" className="btn-secondary block w-full py-2 text-center">
                Set a New Password
              </Link>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="panel space-y-4">
            <h1 className="font-display text-2xl font-bold text-parchment-50">
              This link did not work
            </h1>
            <p className="form-error" role="alert">
              {error}
            </p>
            <p className="text-sm text-parchment-400">
              These links expire, and each one can only be used once. Asking for a fresh one
              almost always sorts it.
            </p>
            <Link to="/forgot-password" className="btn-primary block w-full py-2.5 text-center">
              Send a New Link
            </Link>
            <Link to="/login" className="btn-secondary block w-full py-2 text-center">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
