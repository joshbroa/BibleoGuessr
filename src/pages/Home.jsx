import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PageShell, { PageHeading } from '@/components/wf/PageShell';
import ModeCard from '@/components/wf/ModeCard';
import {
  NoteIcon,
  ModeBrowsing,
  ModeDuels,
  ModeMultiplayer,
  ModePractice,
  ModeSingle,
} from '@/components/wf/Icons';

/**
 * Every mode, in the order they always appear. Those with a `to` can be played:
 * clicking one makes it the big cobalt card with the Play button; it does not
 * navigate on its own. The rest are shown as coming soon.
 */
const MODES = [
  {
    id: 'singleplayer',
    title: 'Singleplayer',
    blurb: 'A verse, a Bible, and however long you dare take. Choose your rounds and play.',
    Icon: ModeSingle,
    to: '/play/setup',
  },
  {
    id: 'practice',
    title: 'Endless Practice',
    blurb: 'Round after round, for as long as you like. Nothing counted, nothing recorded.',
    Icon: ModePractice,
    to: '/practice/setup',
  },
  {
    id: 'browsing',
    title: 'Browsing',
    blurb: 'Wander the Bible freely, with no clock and nothing to score.',
    Icon: ModeBrowsing,
    to: '/browse',
  },
  {
    id: 'duels',
    title: 'Duels',
    blurb: 'Head to head against one opponent.',
    Icon: ModeDuels,
  },
  {
    id: 'multiplayer',
    title: 'Multiplayer',
    blurb: 'A full lobby racing through the same set of verses.',
    Icon: ModeMultiplayer,
  },
];

const SELECTED_KEY = 'bibleoguessr:homeMode';

/** The mode last picked here, so coming back to Home keeps it highlighted. */
function readSelected() {
  try {
    const saved = localStorage.getItem(SELECTED_KEY);
    if (MODES.some((mode) => mode.id === saved && mode.to)) return saved;
  } catch {
    // Storage being unavailable just means starting on Singleplayer.
  }
  return 'singleplayer';
}

export default function Home() {
  const { displayName, isGuest, profile } = useAuth();
  const [selected, setSelected] = useState(readSelected);

  function select(id) {
    setSelected(id);
    try {
      localStorage.setItem(SELECTED_KEY, id);
    } catch {
      // Not remembered; nothing else lost.
    }
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-12 sm:gap-y-6">
        <PageHeading
          crumbs={[{ label: 'Home' }]}
          title={isGuest ? 'Welcome' : `Welcome, ${displayName}`}
          size="xl"
          // The desktop bar already says so; on a phone the bar has no room.
          crumbTrailing={isGuest ? <span className="sm:hidden">Playing as guest</span> : null}
        />

        {isGuest ? (
          <p className="m-0 flex max-w-[440px] items-start gap-2.5 rounded-md bg-wf-ink px-3.5 pb-2.5 pt-3 text-[15px] leading-[1.45] text-white sm:gap-3 sm:px-[18px] sm:pb-3 sm:pt-3.5">
            <NoteIcon size={20} />
            <span>
              Your games aren&rsquo;t saved while you play as a guest.{' '}
              <Link to="/signup" className="font-bold text-wf-amber underline underline-offset-[3px]">
                Sign up
              </Link>{' '}
              to keep them — the ones you&rsquo;ve played come with you.
            </span>
          </p>
        ) : (
          <dl className="m-0 grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">
            <Stat label="Games played" value={(profile?.stats?.gamesPlayed ?? 0).toLocaleString()} />
            <Stat
              label="Best score"
              value={(profile?.stats?.bestScore ?? 0).toLocaleString()}
              accent
              wide
            />
          </dl>
        )}
      </div>

      <section aria-label="Game modes" className="wf-tray wf-dark">
        {MODES.map((mode) =>
          !mode.to ? (
            <ComingSoon key={mode.id} mode={mode} />
          ) : (
            <ModeCard
              key={mode.id}
              mode={mode}
              selected={mode.id === selected}
              onSelect={() => select(mode.id)}
            />
          )
        )}
      </section>
    </PageShell>
  );
}

function ComingSoon({ mode }) {
  const { Icon } = mode;
  return (
    <div
      aria-disabled="true"
      title={`${mode.title} is not available yet`}
      className="flex select-none items-stretch overflow-hidden rounded bg-wf-mist text-wf-muted2"
    >
      <div aria-hidden="true" className="grid min-h-[72px] flex-[0_0_60px] place-items-center bg-wf-mist2 sm:min-h-[88px] sm:flex-[0_0_96px]">
        <span className="sm:hidden">
          <Icon size={30} />
        </span>
        <span className="hidden sm:block">
          <Icon />
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-0.5 px-3.5 py-3 sm:px-6 sm:py-4">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[19px] font-extrabold sm:text-2xl">{mode.title}</span>
          <span className="text-[13px] font-bold text-wf-muted sm:hidden">Coming soon</span>
        </span>
        <span className="text-sm leading-snug sm:text-[15px]">{mode.blurb}</span>
      </div>
      <div className="hidden items-center px-6 py-4 text-[15px] font-bold text-wf-muted sm:flex">Coming soon</div>
    </div>
  );
}

function Stat({ label, value, accent = false, wide = false }) {
  return (
    <div
      className={`rounded-md bg-wf-ink px-3.5 pb-2 pt-2.5 text-white sm:px-[18px] sm:pb-2.5 sm:pt-3 ${
        wide ? 'sm:min-w-[160px]' : 'sm:min-w-[120px]'
      }`}
    >
      <dt className="text-[13px] text-wf-ondark">{label}</dt>
      <dd
        className={`m-0 text-[30px] font-extrabold leading-tight tabular-nums sm:text-4xl ${
          accent ? 'text-wf-amber' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
