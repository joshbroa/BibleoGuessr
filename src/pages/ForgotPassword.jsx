import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import { validateEmail } from '@shared/validation';
import AuthShell, { Field, FormError, FormTray, TrayLink, TrayPanel } from '@/components/wf/AuthShell';
import { MailIcon } from '@/components/wf/Icons';

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
      play('error');
      setError(checked.error);
      return;
    }

    setBusy(true);
    try {
      await requestPasswordReset(checked.value);
      play('success');
      setSent(true);
    } catch (err) {
      play('error');
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell backTo={backTo} homeTo={isAuthenticated ? '/home' : '/'}>
      {sent ? (
        <FormTray title="Check your email" titleId="sent-h">
          <TrayPanel>
            <div className="flex items-start gap-3 sm:gap-3.5">
              <span
                aria-hidden="true"
                className="grid h-11 flex-[0_0_44px] place-items-center rounded bg-wf-cobalt sm:h-12 sm:flex-[0_0_48px]"
              >
                <MailIcon />
              </span>
              {/* Deliberately the same message whether or not the address has an
                  account: saying otherwise would tell a stranger who is
                  registered here. */}
              <p role="status" className="m-0 text-[15px] leading-normal sm:text-base">
                If an account exists for that address, a reset link is on its way. It can take a minute
                or two to arrive.
              </p>
            </div>
            <Link to="/login" className="wf-btn-amber h-14 text-lg" style={{ paddingTop: 3, paddingBottom: 0 }}>
              Back to Login
            </Link>
          </TrayPanel>
        </FormTray>
      ) : (
        <FormTray title="Reset password" titleId="reset-h">
          <TrayPanel as="form" onSubmit={handleSubmit} noValidate>
            <p className="m-0 text-[15px] leading-normal sm:text-base">
              Enter the email you signed up with and we will send you a link to choose a new password.
            </p>

            <FormError>{error}</FormError>

            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" disabled={busy} className="wf-btn-amber h-14 text-lg" style={{ paddingTop: 3, paddingBottom: 0 }}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
          </TrayPanel>
          <p className="m-0 px-3 pb-1.5 pt-1 text-center text-[15px] sm:px-4 sm:pb-3 sm:pt-2.5">
            <TrayLink to="/login">Back to Login</TrayLink>
          </p>
        </FormTray>
      )}
    </AuthShell>
  );
}
