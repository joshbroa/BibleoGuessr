import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { play } from '@/lib/sound';
import { LogoHeader, useWfBody } from '@/components/wf/PageShell';
import WfFooter from '@/components/wf/WfFooter';
import { ArrowRight, PinIcon } from '@/components/wf/Icons';

/** A signpost: one arm pointing home, the other a question mark. */
function Signpost({ className }) {
  return (
    <svg
      role="img"
      aria-label="A signpost with one sign pointing home and one marked with a question mark"
      viewBox="0 0 360 400"
      className={className}
    >
      <rect x="168" y="30" width="24" height="350" rx="3" fill="#23262b" />
      <rect x="120" y="374" width="120" height="14" rx="3" fill="#23262b" />
      <path d="M60 70h220l40 36-40 36H60z" fill="#e3a52b" />
      <text x="170" y="118" textAnchor="middle" fontFamily="Overpass, Arial, sans-serif" fontWeight="800" fontSize="40" fill="#23262b">
        Home
      </text>
      <path d="M300 172H80l-40 36 40 36h220z" fill="#d2d9d9" />
      <text x="186" y="223" textAnchor="middle" fontFamily="Overpass, Arial, sans-serif" fontWeight="800" fontSize="44" fill="#4b5158">
        ?
      </text>
      <circle cx="180" cy="300" r="34" fill="#a8283a" />
      <text x="180" y="313" textAnchor="middle" fontFamily="Overpass, Arial, sans-serif" fontWeight="800" fontSize="30" fill="#ffffff">
        404
      </text>
    </svg>
  );
}

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const home = isAuthenticated ? '/home' : '/';
  useWfBody();

  // A small "nothing here" from the error voice.
  useEffect(() => {
    play('error');
  }, []);

  return (
    <div className="wf-root flex min-h-screen flex-col">
      <LogoHeader to={home} />
      <main className="mx-auto box-border flex w-full max-w-[1040px] flex-1 flex-col gap-4 px-4 pb-8 pt-7 md:flex-row md:flex-wrap md:items-center md:gap-x-[72px] md:gap-y-12 md:px-8 md:pb-14 md:pt-[72px]">
        <Signpost className="h-[244px] w-[220px] self-center md:hidden" />
        <div className="flex min-w-0 flex-col items-start gap-4 md:flex-[1_1_420px] md:gap-[18px]">
          <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-wf-crimson md:text-base">
            <PinIcon size={15} />
            404
          </span>
          <h1 className="m-0 text-[44px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[clamp(48px,7vw,76px)]">
            No such page
          </h1>
          <p className="m-0 max-w-[460px] text-[17px] leading-normal text-wf-muted2 md:text-[19px]">
            There is nothing at this address. The link may be mistyped, or the page may have moved.
          </p>
          <Link
            to={home}
            className="wf-btn-amber wf-btn-lg mt-1.5 h-[58px] w-full md:mt-2 md:h-auto md:w-auto"
          >
            Go Home <ArrowRight size={20} color="#23262b" />
          </Link>
        </div>
        <Signpost className="hidden h-[400px] w-[360px] flex-none md:block" />
      </main>
      {/* The phone design ends on the button; the footer is desktop only. */}
      <div className="hidden md:block">
        <WfFooter />
      </div>
    </div>
  );
}
