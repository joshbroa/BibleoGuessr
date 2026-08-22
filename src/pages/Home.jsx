import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

const MODES = [
  {
    id: 'singleplayer',
    title: 'Singleplayer',
    blurb: 'A verse, a Bible, and however long you dare take. Choose your rounds and play.',
    to: '/play/setup',
    available: true,
  },
  {
    id: 'duels',
    title: 'Duels',
    blurb: 'Head to head against one opponent, round for round.',
    available: false,
  },
  {
    id: 'multiplayer',
    title: 'Multiplayer',
    blurb: 'A full lobby racing through the same set of verses.',
    available: false,
  },
  {
    id: 'browsing',
    title: 'Browsing',
    blurb: 'Wander the Bible freely, with no clock and nothing to score.',
    available: false,
  },
];

export default function Home() {
  const { displayName, isGuest, profile } = useAuth();

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-bold text-parchment-50">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-parchment-300">
            {isGuest
              ? 'Guest games are not saved. Sign up to keep a history.'
              : `${profile?.stats?.gamesPlayed ?? 0} games played · best score ${(
                  profile?.stats?.bestScore ?? 0
                ).toLocaleString()}`}
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {MODES.map((mode) => (
            <li key={mode.id}>
              {mode.available ? (
                <Link
                  to={mode.to}
                  className="panel group block h-full transition hover:border-gilt-500/60 hover:bg-leather-800/70"
                >
                  <h2 className="font-display text-xl font-bold text-gilt-400 group-hover:text-gilt-300">
                    {mode.title}
                  </h2>
                  <p className="mt-2 text-sm text-parchment-300">{mode.blurb}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-parchment-100">
                    Play →
                  </span>
                </Link>
              ) : (
                <div
                  className="panel relative h-full select-none"
                  aria-disabled="true"
                  title={`${mode.title} is not available yet`}
                >
                  <div className="opacity-40">
                    <h2 className="font-display text-xl font-bold text-parchment-200">
                      {mode.title}
                    </h2>
                    <p className="mt-2 text-sm text-parchment-300">{mode.blurb}</p>
                  </div>
                  {/* Translucent overlay makes "not yet" unmistakable and also
                      swallows clicks, so the card cannot be activated at all. */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-leather-950/55 backdrop-blur-[1px]">
                    <span className="rounded-full border border-gilt-600/40 bg-leather-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gilt-400">
                      Coming Soon
                    </span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
