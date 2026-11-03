import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';

/**
 * The navbar is state-dependent by design: a registered player gets their
 * account tools, a guest gets the two doors that turn them into one.
 */
export default function Navbar() {
  const { isRegistered, isGuest, displayName, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="bg-leather-950/70 backdrop-blur">
      <VerifyEmailBanner />
      <div className="border-b border-gilt-600/20">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3"
          aria-label="Main"
        >
        <Link
          to="/home"
          className="font-display text-lg font-bold tracking-tight text-gilt-400 hover:text-gilt-300"
        >
          Bibleo<span className="text-parchment-100">Guessr</span>
        </Link>

        <span className="ml-auto hidden text-sm text-parchment-400 sm:inline">
          {isGuest ? 'Playing as guest' : `Signed in as ${displayName}`}
        </span>

        {isRegistered ? (
          <div className="flex items-center gap-2">
            <Link to="/history" className="btn-secondary">
              Game History
            </Link>
            <Link to="/settings" className="btn-secondary">
              Account Settings
            </Link>
            <button type="button" onClick={handleSignOut} className="btn-secondary">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/signup" className="btn-primary">
              Sign Up
            </Link>
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          </div>
        )}
        </nav>
      </div>
    </header>
  );
}
