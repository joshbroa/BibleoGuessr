import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';

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
      play('success');
      setState({ notice: `Sent again to ${user.email}. Check your spam folder too.`, error: '', busy: false });
    } catch (err) {
      play('error');
      setState({ notice: '', error: friendlyError(err), busy: false });
    }
  }

  async function handleCheck() {
    setState({ notice: '', error: '', busy: true });
    try {
      await refreshUser();
      setState({ notice: 'Still not confirmed yet.', error: '', busy: false });
    } catch (err) {
      play('error');
      setState({ notice: '', error: friendlyError(err), busy: false });
    }
  }

  return (
    <div className="border-b-2 border-wf-amber bg-[#fbf0d9] font-wf text-wf-ink" role="status">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-[15px] sm:px-8">
        <p className="m-0 flex-1 basis-64 leading-snug">
          <b className="font-extrabold">Confirm your email.</b> We sent a link to {user?.email}.
          Verifying keeps your account recoverable.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={state.busy}
            className="wf-btn-ink text-sm"
            style={{ padding: '11px 14px 8px' }}
          >
            Resend
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={state.busy}
            className="wf-btn-outline text-sm"
            style={{ padding: '9px 12px 6px' }}
          >
            I have verified
          </button>
        </div>
      </div>
      {(state.notice || state.error) && (
        <div className="mx-auto max-w-[1160px] px-4 pb-2.5 text-sm font-semibold sm:px-8">
          {state.notice && <span className="text-wf-teal">{state.notice}</span>}
          {state.error && (
            <span className="text-wf-crimsondeep" role="alert">
              {state.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
