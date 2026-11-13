import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PageShell, { PageHeading } from '@/components/wf/PageShell';
import {
  ArrowRight,
  NoteIcon,
  ModeBrowsing,
  ModeDuels,
  ModeMultiplayer,
  ModeSingle,
} from '@/components/wf/Icons';

const COMING_SOON = [
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
  {
    id: 'browsing',
    title: 'Browsing',
    blurb: 'Wander the Bible freely, with no clock and nothing to score.',
    Icon: ModeBrowsing,
  },
];

export default function Home() {
  const { displayName, isGuest, profile } = useAuth();

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
        {/* The one mode that works: big, cobalt, and the obvious next step. */}
        <div className="flex flex-col gap-3 overflow-hidden rounded bg-wf-cobalt p-[18px] pt-5 text-white sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-0 sm:p-0">
          <div
            aria-hidden="true"
            className="hidden min-h-[150px] flex-[0_0_150px] place-items-center bg-wf-cobaltdeep sm:grid"
          >
            <ModeSingle />
          </div>
          <div className="flex items-center gap-3 sm:hidden">
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded bg-wf-cobaltdeep">
              <ModeSingle size={30} />
            </span>
            <h2 className="m-0 text-[30px] font-extrabold leading-none">Singleplayer</h2>
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-[1_1_360px] sm:px-[30px] sm:py-[26px]">
            <h2 className="m-0 hidden text-[40px] font-extrabold leading-none sm:block">Singleplayer</h2>
            <p className="m-0 max-w-[520px] text-base leading-[1.45] text-wf-cobalttint sm:text-lg">
              A verse, a Bible, and however long you dare take. Choose your rounds and play.
            </p>
          </div>
          <div className="flex items-center sm:flex-[0_0_auto] sm:px-[30px] sm:py-[26px]">
            <Link to="/play/setup" className="wf-btn-amber wf-btn-lg h-14 w-full sm:h-auto sm:w-auto">
              Play <ArrowRight size={20} color="#23262b" />
            </Link>
          </div>
        </div>

        {COMING_SOON.map(({ id, title, blurb, Icon }) => (
          <div
            key={id}
            aria-disabled="true"
            title={`${title} is not available yet`}
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
                <span className="text-[19px] font-extrabold sm:text-2xl">{title}</span>
                <span className="text-[13px] font-bold text-wf-muted sm:hidden">Coming soon</span>
              </span>
              <span className="text-sm leading-snug sm:text-[15px]">{blurb}</span>
            </div>
            <div className="hidden items-center px-6 py-4 text-[15px] font-bold text-wf-muted sm:flex">
              Coming soon
            </div>
          </div>
        ))}
      </section>
    </PageShell>
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
