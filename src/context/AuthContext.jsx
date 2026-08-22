import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import {
  ensureProfile,
  setUsername as setUsernameFn,
  deleteAccountFn,
  claimGuestHistory,
} from '@/lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initialising, setInitialising] = useState(true);

  // Guards the profile subscription against a stale auth state overwriting a
  // newer one when sign-ins happen back to back.
  const profileUnsubscribe = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      profileUnsubscribe.current?.();
      profileUnsubscribe.current = null;

      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setInitialising(false);
        return;
      }

      try {
        // Creates the /users document on first sign-in, and flips the
        // `isAnonymous` flag the moment a guest upgrades to a real account.
        await ensureProfile();
      } catch (error) {
        console.error('[auth] ensureProfile failed', error);
      }

      // Live subscription so a username change is reflected everywhere at once.
      profileUnsubscribe.current = onSnapshot(
        doc(db, 'users', nextUser.uid),
        (snapshot) => {
          setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
          setInitialising(false);
        },
        (error) => {
          console.error('[auth] profile subscription failed', error);
          setInitialising(false);
        }
      );
    });

    return () => {
      unsubscribe();
      profileUnsubscribe.current?.();
    };
  }, []);

  /** Start an anonymous session so a guest can play immediately. */
  const continueAsGuest = useCallback(async () => {
    if (auth.currentUser) return auth.currentUser;
    const credential = await signInAnonymously(auth);
    return credential.user;
  }, []);

  /**
   * Register a permanent account.
   *
   * If the visitor is already playing as a guest we *link* the email credential
   * onto their existing anonymous user rather than creating a new one. Linking
   * preserves the uid, and because every history document is keyed by uid, the
   * guest's entire game history transfers to the new account for free — no
   * copying, no migration window where records could be lost.
   */
  const register = useCallback(async ({ email, password, username }) => {
    const current = auth.currentUser;
    let account;

    if (current?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      const linked = await linkWithCredential(current, credential);
      account = linked.user;
    } else {
      const created = await createUserWithEmailAndPassword(auth, email, password);
      account = created.user;
    }

    // Refresh the ID token so the backend sees `sign_in_provider: password`
    // instead of the stale `anonymous` claim from before the link.
    await account.getIdToken(true);
    await ensureProfile();

    if (username) {
      await setUsernameFn({ username });
    }

    // Anything they finished as a guest is already filed under this uid; now
    // that there is an account to attach it to, promote it into their history.
    // A failure here must not fail the signup — the games stay claimable.
    try {
      await claimGuestHistory();
    } catch (error) {
      console.error('[auth] could not claim guest history', error);
    }

    return account;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  /**
   * Change the password. Firebase requires a recent login for this, so the old
   * password is used to reauthenticate first — which doubles as proof the person
   * at the keyboard is the account owner.
   */
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error('You must be signed in with an email account.');
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    await updatePassword(current, newPassword);
  }, []);

  const changeUsername = useCallback(async (username) => {
    return setUsernameFn({ username });
  }, []);

  /** Irreversibly delete the account and everything attached to it. */
  const deleteAccount = useCallback(async ({ password } = {}) => {
    const current = auth.currentUser;
    if (!current) throw new Error('You must be signed in.');

    if (password && current.email) {
      const credential = EmailAuthProvider.credential(current.email, password);
      await reauthenticateWithCredential(current, credential);
    }

    await deleteAccountFn();
    await signOut(auth).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      initialising,
      isAuthenticated: Boolean(user),
      isGuest: Boolean(user?.isAnonymous),
      isRegistered: Boolean(user) && !user.isAnonymous,
      displayName: profile?.username || (user?.isAnonymous ? 'Guest' : user?.email) || 'Guest',
      continueAsGuest,
      register,
      login,
      logout,
      changePassword,
      changeUsername,
      deleteAccount,
    }),
    [
      user,
      profile,
      initialising,
      continueAsGuest,
      register,
      login,
      logout,
      changePassword,
      changeUsername,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
