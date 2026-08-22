import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

/**
 * Firebase config comes exclusively from `.env.local` using Vite's `VITE_`
 * prefix. These values are public by design (they identify the project, they do
 * not authorise anything) — all actual authorisation is enforced by Firestore
 * rules and by the Cloud Functions in `functions/`.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error(
    `[firebase] Missing config: ${missing.join(', ')}. ` +
      'Check that .env.local exists in the project root and uses VITE_ prefixes.'
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

/**
 * Point the SDK at the local emulator suite when `VITE_USE_EMULATORS=true`.
 * Firestore runs on 8088 rather than the default 8080 to avoid colliding with
 * other local services — this must stay in sync with `firebase.json`.
 */
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8088);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  console.info('[firebase] Connected to local emulators (Firestore :8088)');
}
