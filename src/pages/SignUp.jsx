import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkUsername, friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  PASSWORD_RULE_TEXT,
} from '@shared/validation';
import AuthShell, { Field, FormError, FormTray, TrayFootnote, TrayLink, TrayPanel } from '@/components/wf/AuthShell';
import { ArrowRight, NoteIcon } from '@/components/wf/Icons';

const USERNAME_RULE = '3–20 characters. Letters, numbers and underscores only.';

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

  function fail(message) {
    play('error');
    setError(message);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const checkedEmail = validateEmail(form.email);
    if (!checkedEmail.ok) return fail(checkedEmail.error);

    const checkedUsername = validateUsername(form.username);
    if (!checkedUsername.ok) return fail(checkedUsername.error);

    const checkedPassword = validatePassword(form.password);
    if (!checkedPassword.ok) return fail(checkedPassword.error);

    if (form.password !== form.confirmPassword) {
      return fail('The two passwords do not match.');
    }

    setBusy(true);
    try {
      await register({
        email: checkedEmail.value,
        password: form.password,
        username: checkedUsername.value,
      });
      play('success');
      navigate('/home', { replace: true });
    } catch (err) {
      fail(friendlyError(err));
      setBusy(false);
    }
    return undefined;
  }

  return (
    <AuthShell backTo={backTo} homeTo={backTo} top="sm:pt-12">
      <FormTray title="Create an account" titleId="signup-h">
        {isGuest && (
          <p className="m-0 flex items-start gap-2.5 rounded bg-wf-cobalt px-3 pb-[9px] pt-[11px] text-sm leading-[1.45] text-white sm:px-3.5 sm:pb-2.5 sm:pt-3 sm:text-[15px]">
            <NoteIcon />
            You&rsquo;re playing as a guest. Your games so far will carry over to your new account.
          </p>
        )}

        <TrayPanel as="form" onSubmit={handleSubmit} noValidate>
          <FormError>{error}</FormError>

          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />

          <Field
            id="username"
            label="Username"
            type="text"
            autoComplete="username"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            maxLength={20}
            required
            help={usernameStatus?.message ?? USERNAME_RULE}
            helpTone={usernameStatus == null ? 'muted' : usernameStatus.ok ? 'ok' : 'bad'}
            helpRole={usernameStatus?.ok === false ? 'alert' : undefined}
          />

          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            help={PASSWORD_RULE_TEXT}
          />

          <Field
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            required
          />

          <button type="submit" disabled={busy} className="wf-btn-amber h-14 text-lg" style={{ paddingTop: 3, paddingBottom: 0 }}>
            {busy ? 'Creating account…' : 'Sign Up'}
            {!busy && (
              <span className="hidden sm:inline">
                <ArrowRight size={18} color="#23262b" />
              </span>
            )}
          </button>
        </TrayPanel>

        <TrayFootnote>
          Already have an account? <TrayLink to="/login">Log in</TrayLink>
        </TrayFootnote>
      </FormTray>
    </AuthShell>
  );
}
