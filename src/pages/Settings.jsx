import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
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
      setUsernameState({ error: checked.error, notice: '', busy: false });
      return;
    }

    setUsernameState({ error: '', notice: '', busy: true });
    try {
      await changeUsername(checked.value);
      setUsername('');
      setUsernameState({ error: '', notice: `Username changed to ${checked.value}.`, busy: false });
    } catch (err) {
      setUsernameState({ error: friendlyError(err), notice: '', busy: false });
    }
  }

  // --- Password -----------------------------------------------------------

  async function handlePassword(event) {
    event.preventDefault();
    setPasswordState({ error: '', notice: '', busy: false });

    if (!passwords.current) {
      setPasswordState({ error: 'Enter your current password.', notice: '', busy: false });
      return;
    }

    const checked = validatePassword(passwords.next);
    if (!checked.ok) {
      setPasswordState({ error: checked.error, notice: '', busy: false });
      return;
    }
    // Dual confirmation: the new password has to be typed identically twice
    // before it is accepted.
    if (passwords.next !== passwords.confirm) {
      setPasswordState({ error: 'The two new passwords do not match.', notice: '', busy: false });
      return;
    }
    if (passwords.next === passwords.current) {
      setPasswordState({
        error: 'Your new password must be different from your current one.',
        notice: '',
        busy: false,
      });
      return;
    }

    setPasswordState({ error: '', notice: '', busy: true });
    try {
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordState({ error: '', notice: 'Password updated.', busy: false });
    } catch (err) {
      setPasswordState({ error: friendlyError(err), notice: '', busy: false });
    }
  }

  // --- Delete account -----------------------------------------------------

  async function handleDelete(event) {
    event.preventDefault();

    if (deleteForm.phrase !== CONFIRM_PHRASE) {
      setDeleteState({ error: `Type ${CONFIRM_PHRASE} to confirm.`, busy: false });
      return;
    }

    setDeleteState({ error: '', busy: true });
    try {
      await deleteAccount({ password: deleteForm.password });
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteState({ error: friendlyError(err), busy: false });
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <header>
          <h1 className="font-display text-3xl font-bold text-parchment-50">Account Settings</h1>
          <p className="mt-1 text-parchment-300">{user?.email}</p>
        </header>

        {/* --- Username -------------------------------------------------- */}
        <form onSubmit={handleUsername} className="panel space-y-4" noValidate>
          <div>
            <h2 className="font-display text-xl font-bold text-parchment-50">Username</h2>
            <p className="mt-1 text-sm text-parchment-400">
              Currently{' '}
              <span className="font-semibold text-parchment-100">
                {profile?.username ?? 'not set'}
              </span>
              . You can change it once every two weeks.
            </p>
          </div>

          {!cooldown.allowed && (
            <p className="form-error">
              You can change your username again in {formatDuration(cooldown.remainingMs)}.
            </p>
          )}
          {usernameState.error && (
            <p className="form-error" role="alert">
              {usernameState.error}
            </p>
          )}
          {usernameState.notice && <p className="form-note">{usernameState.notice}</p>}

          <div>
            <label htmlFor="new-username" className="field-label">
              New username
            </label>
            <input
              id="new-username"
              type="text"
              className="field-input"
              value={username}
              maxLength={20}
              disabled={!cooldown.allowed}
              onChange={(e) => setUsername(e.target.value)}
              aria-describedby="username-rules"
            />
            <p id="username-rules" className="mt-1 text-xs text-parchment-400/70">
              3–20 characters. Letters, numbers and underscores only.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={usernameState.busy || !cooldown.allowed || !username}
          >
            {usernameState.busy ? 'Saving…' : 'Change Username'}
          </button>
        </form>

        {/* --- Password -------------------------------------------------- */}
        <form onSubmit={handlePassword} className="panel space-y-4" noValidate>
          <h2 className="font-display text-xl font-bold text-parchment-50">Password</h2>

          {passwordState.error && (
            <p className="form-error" role="alert">
              {passwordState.error}
            </p>
          )}
          {passwordState.notice && <p className="form-note">{passwordState.notice}</p>}

          <div>
            <label htmlFor="current-password" className="field-label">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="next-password" className="field-label">
              New password
            </label>
            <input
              id="next-password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              aria-describedby="password-rules"
            />
            <p id="password-rules" className="mt-1 text-xs text-parchment-400/70">
              {PASSWORD_RULE_TEXT}
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="field-label">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={passwordState.busy}>
            {passwordState.busy ? 'Updating…' : 'Change Password'}
          </button>
        </form>

        {/* --- Danger zone ----------------------------------------------- */}
        <section className="panel border-red-800/40">
          <h2 className="font-display text-xl font-bold text-red-300">Delete Account</h2>
          <p className="mt-1 text-sm text-parchment-300">
            This permanently removes your account, your username and every game in your history.
            It cannot be undone.
          </p>
          <button type="button" className="btn-danger mt-4" onClick={() => setDeleteOpen(true)}>
            Delete Account
          </button>
        </section>
      </main>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
      >
        <form onSubmit={handleDelete} className="space-y-4" noValidate>
          <p className="text-sm text-parchment-300">
            Your profile, your username and all{' '}
            {(profile?.stats?.gamesPlayed ?? 0).toLocaleString()} saved games will be erased
            permanently.
          </p>

          {deleteState.error && (
            <p className="form-error" role="alert">
              {deleteState.error}
            </p>
          )}

          <div>
            <label htmlFor="delete-password" className="field-label">
              Your password
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={deleteForm.password}
              onChange={(e) => setDeleteForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="delete-phrase" className="field-label">
              Type {CONFIRM_PHRASE} to confirm
            </label>
            <input
              id="delete-phrase"
              type="text"
              className="field-input"
              value={deleteForm.phrase}
              onChange={(e) => setDeleteForm((f) => ({ ...f, phrase: e.target.value }))}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger flex-1"
              disabled={deleteState.busy || deleteForm.phrase !== CONFIRM_PHRASE}
            >
              {deleteState.busy ? 'Deleting…' : 'Delete Forever'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
