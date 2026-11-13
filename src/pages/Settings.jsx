import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import PageShell, { PageHeading } from '@/components/wf/PageShell';
import { AlertIcon, CheckIcon, ClockIcon, WarningIcon } from '@/components/wf/Icons';
import {
  validateUsername,
  validatePassword,
  usernameCooldown,
  formatDuration,
  PASSWORD_RULE_TEXT,
} from '@shared/validation';

const CONFIRM_PHRASE = 'DELETE';

export default function Settings() {
  const { profile, user, changeUsername, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState({ error: '', notice: '', busy: false });

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordState, setPasswordState] = useState({ error: '', notice: '', busy: false });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', phrase: '' });
  const [deleteState, setDeleteState] = useState({ error: '', busy: false });

  const lastChanged = profile?.usernameChangedAt?.toMillis?.() ?? null;
  const cooldown = usernameCooldown(lastChanged);

  // --- Username -----------------------------------------------------------

  async function handleUsername(event) {
    event.preventDefault();
    setUsernameState({ error: '', notice: '', busy: false });

    const checked = validateUsername(username);
    if (!checked.ok) {
      play('error');
      setUsernameState({ error: checked.error, notice: '', busy: false });
      return;
    }

    setUsernameState({ error: '', notice: '', busy: true });
    try {
      await changeUsername(checked.value);
      setUsername('');
      play('success');
      setUsernameState({ error: '', notice: `Username changed to ${checked.value}.`, busy: false });
    } catch (err) {
      play('error');
      setUsernameState({ error: friendlyError(err), notice: '', busy: false });
    }
  }

  // --- Password -----------------------------------------------------------

  function passwordError(message) {
    play('error');
    setPasswordState({ error: message, notice: '', busy: false });
  }

  async function handlePassword(event) {
    event.preventDefault();
    setPasswordState({ error: '', notice: '', busy: false });

    if (!passwords.current) {
      passwordError('Enter your current password.');
      return;
    }

    const checked = validatePassword(passwords.next);
    if (!checked.ok) {
      passwordError(checked.error);
      return;
    }
    // Dual confirmation: the new password has to be typed identically twice
    // before it is accepted.
    if (passwords.next !== passwords.confirm) {
      passwordError('The two new passwords do not match.');
      return;
    }
    if (passwords.next === passwords.current) {
      passwordError('Your new password must be different from your current one.');
      return;
    }

    setPasswordState({ error: '', notice: '', busy: true });
    try {
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      play('success');
      setPasswordState({ error: '', notice: 'Password updated.', busy: false });
    } catch (err) {
      passwordError(friendlyError(err));
    }
  }

  // --- Delete account -----------------------------------------------------

  async function handleDelete(event) {
    event.preventDefault();

    if (deleteForm.phrase !== CONFIRM_PHRASE) {
      play('error');
      setDeleteState({ error: `Type ${CONFIRM_PHRASE} to confirm.`, busy: false });
      return;
    }

    setDeleteState({ error: '', busy: true });
    try {
      await deleteAccount({ password: deleteForm.password });
      navigate('/', { replace: true });
    } catch (err) {
      play('error');
      setDeleteState({ error: friendlyError(err), busy: false });
    }
  }

  return (
    <PageShell current="settings" width="max-w-[760px]">
      <PageHeading
        crumbs={[{ label: 'Home', to: '/home' }, { label: 'Account Settings' }]}
        title="Account Settings"
      >
        {user?.email}
      </PageHeading>

      {/* --- Username ---------------------------------------------------- */}
      <section aria-labelledby="sec-username" className="wf-tray wf-dark">
        <h2 id="sec-username" className="wf-tray-heading m-0">
          <span aria-hidden="true" className="wf-num">
            1
          </span>
          Username
        </h2>
        <form
          onSubmit={handleUsername}
          noValidate
          className="wf-row flex flex-col gap-3.5 px-3.5 pb-[18px] pt-4 sm:gap-4 sm:px-6 sm:pb-[26px] sm:pt-[22px]"
        >
          <p className="m-0 text-[15px] leading-[1.45] sm:text-base">
            Currently <b>{profile?.username ?? 'not set'}</b>. You can change it once every two weeks.
          </p>

          {!cooldown.allowed && (
            <p role="status" className="wf-alert-error m-0">
              <ClockIcon />
              You can change your username again in {formatDuration(cooldown.remainingMs)}.
            </p>
          )}
          <Notices state={usernameState} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-username" className="wf-label">
              New username
            </label>
            <input
              id="new-username"
              type="text"
              className="wf-input sm:h-12 max-sm:h-[52px]"
              value={username}
              maxLength={20}
              disabled={!cooldown.allowed}
              onChange={(e) => setUsername(e.target.value)}
              aria-describedby="username-rules"
            />
            <span id="username-rules" className="wf-help">
              3–20 characters. Letters, numbers and underscores only.
            </span>
          </div>

          <button
            type="submit"
            className="wf-btn-amber max-sm:h-[52px] sm:self-start"
            disabled={usernameState.busy || !cooldown.allowed || !username}
          >
            {usernameState.busy ? 'Saving…' : 'Change Username'}
          </button>
        </form>
      </section>

      {/* --- Password ---------------------------------------------------- */}
      <section aria-labelledby="sec-password" className="wf-tray wf-dark">
        <h2 id="sec-password" className="wf-tray-heading m-0">
          <span aria-hidden="true" className="wf-num">
            2
          </span>
          Password
        </h2>
        <form
          onSubmit={handlePassword}
          noValidate
          className="wf-row flex flex-col gap-4 px-3.5 pb-[18px] pt-4 sm:gap-[18px] sm:px-6 sm:pb-[26px] sm:pt-[22px]"
        >
          <Notices state={passwordState} />

          <Field label="Current password" id="current-password">
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="wf-input max-sm:h-[52px]"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
            />
          </Field>

          <Field label="New password" id="next-password" help={PASSWORD_RULE_TEXT} helpId="password-rules">
            <input
              id="next-password"
              type="password"
              autoComplete="new-password"
              className="wf-input max-sm:h-[52px]"
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              aria-describedby="password-rules"
            />
          </Field>

          <Field label="Confirm new password" id="confirm-password">
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="wf-input max-sm:h-[52px]"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
            />
          </Field>

          <button
            type="submit"
            className="wf-btn-amber max-sm:h-[52px] sm:self-start"
            disabled={passwordState.busy}
          >
            {passwordState.busy ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* --- Danger zone ------------------------------------------------- */}
      <section
        aria-labelledby="sec-delete"
        className="flex flex-col gap-[5px] rounded-lg bg-wf-crimson p-[5px] sm:gap-1.5 sm:p-1.5"
      >
        <h2 id="sec-delete" className="wf-tray-heading m-0">
          <WarningIcon size={24} />
          Delete Account
        </h2>
        <div className="flex flex-col gap-3.5 rounded bg-wf-crimsonwash px-3.5 pb-[18px] pt-4 sm:gap-4 sm:px-6 sm:pb-[26px] sm:pt-[22px]">
          <p className="m-0 text-[15px] leading-normal sm:text-base">
            This permanently removes your account, your username and every game in your history. It
            cannot be undone.
          </p>
          <button
            type="button"
            className="wf-btn-danger max-sm:h-[52px] sm:self-start"
            onClick={() => setDeleteOpen(true)}
            data-sound="menuOpen"
          >
            Delete Account
          </button>
        </div>
      </section>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <form onSubmit={handleDelete} className="flex flex-col gap-4" noValidate>
          <p className="m-0 text-[15px] leading-normal">
            Your profile, your username and all{' '}
            {(profile?.stats?.gamesPlayed ?? 0).toLocaleString()} saved games will be erased
            permanently.
          </p>

          {deleteState.error && (
            <p className="wf-alert-error m-0" role="alert">
              <AlertIcon />
              {deleteState.error}
            </p>
          )}

          <Field label="Your password" id="delete-password">
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              className="wf-input"
              value={deleteForm.password}
              onChange={(e) => setDeleteForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>

          <Field label={`Type ${CONFIRM_PHRASE} to confirm`} id="delete-phrase">
            <input
              id="delete-phrase"
              type="text"
              className="wf-input"
              value={deleteForm.phrase}
              onChange={(e) => setDeleteForm((f) => ({ ...f, phrase: e.target.value }))}
              autoComplete="off"
            />
          </Field>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="wf-btn-mist flex-1"
              onClick={() => setDeleteOpen(false)}
              data-sound="menuClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="wf-btn-danger flex-1"
              disabled={deleteState.busy || deleteForm.phrase !== CONFIRM_PHRASE}
            >
              {deleteState.busy ? 'Deleting…' : 'Delete Forever'}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}

function Field({ label, id, help, helpId, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="wf-label">
        {label}
      </label>
      {children}
      {help && (
        <span id={helpId} className="wf-help">
          {help}
        </span>
      )}
    </div>
  );
}

function Notices({ state }) {
  return (
    <>
      {state.error && (
        <p className="wf-alert-error m-0" role="alert">
          <AlertIcon />
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="wf-alert-success m-0" role="status">
          <CheckIcon />
          {state.notice}
        </p>
      )}
    </>
  );
}
