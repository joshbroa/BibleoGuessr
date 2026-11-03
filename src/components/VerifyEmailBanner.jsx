import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';

/**
 * Prompt to confirm an unverified email address.
 *
 * Deliberately does not block play. Nothing in the game depends on the address
 * being reachable, and locking a new player out of the thing they just signed
 * up for — over an email that may be sitting in a spam folder — would cost more
 * than it protects. It stays visible until the address is confirmed.
 */
export default function VerifyEmailBanner() {
  const { needsEmailVerification, resendVerification, refreshUser, user } = useAuth();
  const [state, setState] = useState({ notice: '', error: '', busy: false });

  if (!needsEmailVerification) return null;

  async function handleResend() {
    setState({ notice: '', error: '', busy: true });
    try {
      await resendVerification();
      setState({ notice: `Sent again to ${user.email}. Check your spam folder too.`, error: '', busy: false });
    } catch (err) {
      setState({ notice: '', error: friendlyError(err), busy: false });
    }
  }

  async function handleCheck() {
    setState({ notice: '', error: '', busy: true });
    try {
      await refreshUser();
      // A successful refresh unmounts this banner, so a notice would never be
      // read; only a still-unverified address needs saying anything about.
      setState({ notice: 'Still not confirmed yet.', error: '', busy: false });
    } catch (err) {
      setState({ notice: '', error: friendlyError(err), busy: false });
    }
  }

  return (
    <div className="border-b border-gilt-600/30 bg-gilt-600/10" role="status">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
        <p className="flex-1 text-parchment-100">
          <span className="font-semibold text-gilt-400">Confirm your email.</span>{' '}
          We sent a link to {user?.email}. Verifying keeps your account recoverable.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={state.busy}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          Resend
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={state.busy}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          I have verified
        </button>
      </div>
      {(state.notice || state.error) && (
        <div className="mx-auto max-w-6xl px-4 pb-2.5 text-xs">
          {state.notice && <span className="text-emerald-300">{state.notice}</span>}
          {state.error && (
            <span className="text-red-300" role="alert">
              {state.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
