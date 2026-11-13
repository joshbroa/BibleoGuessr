import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import { validateEmail } from '@shared/validation';
import AuthShell, { Field, FormError, FormTray, TrayFootnote, TrayLink, TrayPanel } from '@/components/wf/AuthShell';
import { ArrowRight } from '@/components/wf/Icons';

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

  function fail(message) {
    play('error');
    setError(message);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const checkedEmail = validateEmail(email);
    if (!checkedEmail.ok) {
      fail(checkedEmail.error);
      return;
    }
    if (!password) {
      fail('Enter your password.');
      return;
    }

    setBusy(true);
    try {
      // The password goes straight from this field to Firebase Auth over HTTPS.
      // It is never sanitised, stored, logged or sent to our own functions.
      await login({ email: checkedEmail.value, password });
      play('success');
      navigate(location.state?.from ?? '/home', { replace: true });
    } catch (err) {
      fail(friendlyError(err));
      setBusy(false);
    }
  }

  const forgot = (
    <Link to="/forgot-password" className="text-sm font-bold text-wf-cobalt underline underline-offset-[3px] hover:text-wf-cobaltdeep">
      Forgot your password?
    </Link>
  );

  return (
    <AuthShell backTo={backTo} homeTo={backTo}>
      <FormTray title="Welcome back" titleId="login-h">
        <TrayPanel as="form" onSubmit={handleSubmit} noValidate>
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

          <div className="flex flex-col gap-1.5">
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              // Beside the label on desktop; on a phone it moves under the field.
              labelExtra={<span className="hidden sm:inline">{forgot}</span>}
            />
            <span className="flex min-h-10 items-center sm:hidden">{forgot}</span>
          </div>

          <button type="submit" disabled={busy} className="wf-btn-amber h-14 text-lg" style={{ paddingTop: 3, paddingBottom: 0 }}>
            {busy ? 'Logging in…' : 'Login'}
            {!busy && (
              <span className="hidden sm:inline">
                <ArrowRight size={18} color="#23262b" />
              </span>
            )}
          </button>
        </TrayPanel>
        <TrayFootnote>
          No account? <TrayLink to="/signup">Sign up</TrayLink>
        </TrayFootnote>
      </FormTray>
    </AuthShell>
  );
}
