import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';

export default function Landing() {
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleGuest() {
    setBusy(true);
    setError('');
    try {
      await continueAsGuest();
      navigate('/home', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center animate-fade-up">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-gilt-500">
          King James Version
        </p>
        <h1 className="font-display text-5xl font-bold tracking-tight text-parchment-50 sm:text-6xl">
          Bibleo<span className="text-gilt-400">Guessr</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-parchment-300">
          You get a verse. No book, no chapter, no number — just the words. Open the Bible
          wherever you think it came from, and find out how far off you were.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGuest}
            disabled={busy}
            className="btn-primary w-full py-3 text-base"
          >
            {busy ? 'Opening…' : 'Continue as Guest'}
          </button>
          <div className="flex gap-3">
            <Link to="/signup" className="btn-secondary flex-1 py-3">
              Sign Up
            </Link>
            <Link to="/login" className="btn-secondary flex-1 py-3">
              Login
            </Link>
          </div>
        </div>

        {error && (
          <p className="form-error mt-6 text-left" role="alert">
            {error}
          </p>
        )}

        <p className="mt-10 text-xs leading-relaxed text-parchment-400/70">
          Guests can play right away. Sign up whenever you like — your games so far come with you.
        </p>
      </div>
    </main>
  );
}
