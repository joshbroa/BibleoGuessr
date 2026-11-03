import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';

/**
 * Typed wrappers around the Cloud Functions.
 *
 * Every gameplay decision — which verses, what a click resolved to, what it
 * scored — happens on the other side of these calls. The client's job is to
 * render what comes back, never to compute it.
 */

/**
 * What to say when the backend cannot be reached at all.
 *
 * This is worth special-casing because the browser disguises it. A callable
 * pointed at a function that is not deployed gets a 404 from the Cloud
 * Functions host, that 404 carries no CORS headers, and so the failure surfaces
 * as an opaque "CORS policy" error rather than "no such function" — which is a
 * genuinely confusing thing to debug from a red box that says "try again".
 */
function unreachableMessage() {
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    return 'Could not reach the local Functions emulator on port 5001. Is `npm run dev` still running?';
  }
  if (import.meta.env.DEV) {
    return (
      'Could not reach the Cloud Functions backend — they are probably not deployed yet. ' +
      'Run `npm run dev` to play against the local emulators, or `npm run deploy:functions` to deploy them.'
    );
  }
  return 'The game server could not be reached. Please try again in a moment.';
}

function callable(name) {
  const fn = httpsCallable(functions, name);
  return async (payload = {}) => {
    try {
      const response = await fn(payload);
      return response.data;
    } catch (error) {
      // Every failure this app expects is thrown as a specific HttpsError, so
      // a bare `internal` means the call never reached a working function.
      if (error?.code === 'functions/internal') {
        const explained = new Error(unreachableMessage());
        explained.code = error.code;
        explained.cause = error;
        console.error(`[api] ${name} could not reach the backend.`, error);
        throw explained;
      }
      throw error;
    }
  };
}

export const startGame = callable('startGame');
export const getGameState = callable('getGameState');
export const submitGuess = callable('submitGuess');
export const getGameSummary = callable('getGameSummary');
export const saveGameHistory = callable('saveGameHistory');
export const claimGuestHistory = callable('claimGuestHistory');

export const ensureProfile = callable('ensureProfile');
export const checkUsername = callable('checkUsername');
export const setUsername = callable('setUsername');
export const deleteAccountFn = callable('deleteAccount');

/**
 * Turn a Firebase error into something worth showing a player.
 *
 * Auth error codes are deliberately vague about whether an account exists, and
 * we keep them that way rather than confirming which half of a login was wrong.
 */
export function friendlyError(error) {
  const code = error?.code ?? '';

  const map = {
    'auth/invalid-email': 'That email address is not valid.',
    'auth/user-disabled': 'That account has been disabled.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account already exists for that email address.',
    'auth/weak-password': 'Password must be at least 8 characters with letters and numbers.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/missing-email': 'Enter your email address.',
    'auth/unauthorized-continue-uri':
      'This site is not authorised for email links yet. Add its domain to Firebase Authentication → Settings → Authorized domains.',
    'auth/requires-recent-login': 'Please re-enter your password to confirm this change.',
    'auth/expired-action-code': 'That link has expired. Please request a new one.',
    'auth/invalid-action-code':
      'That link is no longer valid. It may have been used already, or a newer one may have replaced it.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/credential-already-in-use':
      'That email is already registered. Log in to that account instead.',
    'functions/unauthenticated': 'Your session expired. Please sign in again.',
    'functions/permission-denied': 'You do not have permission to do that.',
    'functions/not-found': 'We could not find that.',
  };

  if (map[code]) return map[code];
  if (error?.message && !/internal/i.test(error.message)) return error.message;
  return 'Something went wrong. Please try again.';
}
