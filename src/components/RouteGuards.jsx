import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { WfFullPageSpinner } from '@/components/wf/PageShell';

/**
 * Requires *some* session — an anonymous guest counts. Used for everything
 * gameplay-related, since guests are first-class players.
 */
export function RequireSession({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <WfFullPageSpinner label="Opening the book" />;
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return children;
}

/**
 * Requires a registered account. Guests are sent to sign up rather than bounced
 * to the landing page, because the thing they were reaching for — history,
 * settings — is exactly what an account gets them.
 */
export function RequireAccount({ children }) {
  const { isRegistered, isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <WfFullPageSpinner label="Checking your account" />;
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (!isRegistered) return <Navigate to="/signup" replace state={{ from: location.pathname }} />;
  return children;
}

/**
 * The landing page is only for visitors with no session at all. Anyone already
 * signed in — guest or registered — goes straight to the hub.
 */
export function RedirectIfSignedIn({ children }) {
  const { isAuthenticated, initialising } = useAuth();

  if (initialising) return <WfFullPageSpinner label="Loading" />;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return children;
}
