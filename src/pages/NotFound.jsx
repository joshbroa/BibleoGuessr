import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gilt-500">404</p>
      <h1 className="font-display text-4xl font-bold text-parchment-50">No such page</h1>
      <p className="max-w-md text-parchment-300">
        This one is not in the book. Check the address, or head back and start a game.
      </p>
      <Link to={isAuthenticated ? '/home' : '/'} className="btn-primary px-6 py-2.5">
        {isAuthenticated ? 'Return Home' : 'Back to Start'}
      </Link>
    </main>
  );
}
