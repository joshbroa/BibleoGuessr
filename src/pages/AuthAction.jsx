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
import { safeContinue } from '@/lib/continueUrl';
import { play } from '@/lib/sound';
import { BarShell, Field, FormError, FormTray, TrayPanel } from '@/components/wf/AuthShell';
import { ArrowRight, CheckIcon, LogoMark, WarningIcon } from '@/components/wf/Icons';

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
            setMessage('Your email address is confirmed. You can carry on playing.');
            play('success');
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
            play('success');
            setStatus('done');
            break;
          }

          default:
            setStatus('error');
            setError('This link is not one we recognise.');
        }
      } catch (err) {
        play('error');
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
      play('error');
      setError(checked.error);
      return;
    }
    if (password !== confirm) {
      play('error');
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
      play('success');
      setStatus('done');
    } catch (err) {
      play('error');
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const button = { paddingTop: 3, paddingBottom: 0 };

  return (
    <BarShell className="max-w-[528px] gap-[22px] pb-7 pt-9 sm:gap-[22px] sm:px-6 sm:pb-12 sm:pt-12">
      <Link to="/" className="inline-flex min-h-[44px] items-center gap-2.5 text-wf-ink no-underline">
        <LogoMark size={34} />
        <span className="text-[26px] font-extrabold sm:text-[28px]">BibleoGuessr</span>
      </Link>

      {status === 'checking' && (
        <section aria-label="Checking your link" className="wf-tray wf-dark w-full">
          <div role="status" className="flex flex-col items-center gap-4 rounded bg-wf-mist px-4 pb-9 pt-10 sm:px-6">
            <span
              aria-hidden="true"
              className="box-border h-11 w-11 animate-spin rounded-full border-[5px] border-wf-off border-r-wf-cobalt border-t-wf-cobalt motion-reduce:[animation-duration:2.4s]"
            />
            <span className="text-[17px] font-bold">Checking your link…</span>
          </div>
        </section>
      )}

      {status === 'form' && (
        <FormTray title="Choose a new password" titleId="link-form-h" size="md">
          <TrayPanel as="form" onSubmit={handleReset} noValidate>
            {email && (
              <p className="m-0 text-[15px] leading-normal">
                For <b>{email}</b>.
              </p>
            )}
            <FormError>{error}</FormError>
            <Field
              id="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              help={PASSWORD_RULE_TEXT}
            />
            <Field
              id="confirm"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button type="submit" disabled={busy} className="wf-btn-amber h-14 text-lg" style={button}>
              {busy ? 'Saving…' : 'Save Password'}
            </button>
          </TrayPanel>
        </FormTray>
      )}

      {status === 'done' && (
        <FormTray
          title={heading}
          titleId="link-done-h"
          size="md"
          icon={
            <span aria-hidden="true" className="grid h-8 flex-[0_0_32px] place-items-center rounded bg-wf-cobalt sm:h-[34px] sm:flex-[0_0_34px]">
              <CheckIcon size={18} color="#ffffff" />
            </span>
          }
        >
          <TrayPanel className="!gap-3 sm:!gap-3.5">
            <p className="m-0 text-[15px] leading-normal sm:text-base">{message}</p>
            <Link to={continueTo} className="wf-btn-amber h-14 text-lg" style={button}>
              Continue <ArrowRight size={18} color="#23262b" />
            </Link>
            {mode === 'recoverEmail' && (
              <Link to="/forgot-password" className="wf-btn-outline h-[52px] text-[17px]" style={button}>
                Set a New Password
              </Link>
            )}
          </TrayPanel>
        </FormTray>
      )}

      {status === 'error' && (
        <FormTray title="This link did not work" titleId="link-error-h" size="md" tone="danger" icon={<WarningIcon size={28} />}>
          <TrayPanel tone="danger" className="!gap-3 sm:!gap-3.5">
            <p role="alert" className="m-0 text-[15px] font-semibold leading-normal sm:text-base">
              {error}
            </p>
            <p className="m-0 text-[15px] leading-normal sm:text-base">
              Links stay valid for a limited time, and each one can only be used once. Asking for a fresh
              one almost always sorts it.
            </p>
            <Link to="/forgot-password" className="wf-btn-amber h-14 text-lg" style={button}>
              Send a New Link
            </Link>
            <Link to="/login" className="wf-btn-outline h-[52px] text-[17px]" style={button}>
              Back to Login
            </Link>
          </TrayPanel>
        </FormTray>
      )}
    </BarShell>
  );
}
