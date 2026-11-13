import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import { BarShell, FormError } from '@/components/wf/AuthShell';
import { ArrowRight, LogoMark } from '@/components/wf/Icons';
import { SITE_NAME } from '@/lib/siteConfig';

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
      play('error');
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  const doorway =
    'box-border flex h-[54px] items-center justify-between rounded bg-wf-mist pl-4 pr-3.5 pt-[3px] text-[17px] font-extrabold text-wf-ink no-underline hover:bg-white sm:h-[60px] sm:pl-[22px] sm:pr-5 sm:text-lg';

  return (
    <BarShell
      className="max-w-[640px] gap-4 pb-7 pt-11 text-center sm:gap-[22px] sm:px-8 sm:pb-12 sm:pt-[72px]"
      footer={<LandingFooter />}
    >
      <span className="sm:hidden">
        <LogoMark size={60} ground="#23262b" />
      </span>
      <span className="hidden sm:block">
        <LogoMark size={76} ground="#23262b" />
      </span>
      <span className="rounded bg-wf-ink px-2.5 pb-0.5 pt-[5px] text-[13px] font-bold text-white sm:px-3 sm:pb-[3px] sm:pt-1.5 sm:text-sm">
        King James Version
      </span>
      <h1 className="m-0 text-[50px] font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-[clamp(52px,8vw,88px)] sm:leading-[0.92]">
        BibleoGuessr
      </h1>
      <p className="m-0 max-w-[520px] text-[17px] leading-normal text-wf-muted2 [text-wrap:pretty] sm:text-xl">
        You get a verse. No book, no chapter, no number — just the words. Open the Bible wherever you
        think it came from, and find out how far off you were.
      </p>

      <section aria-label="Get started" className="wf-tray wf-dark mt-2 w-full text-left sm:mt-3">
        <button
          type="button"
          onClick={handleGuest}
          disabled={busy}
          data-sound="submit"
          className="flex h-16 items-center justify-between gap-3 rounded bg-wf-amber pl-5 pr-[18px] pt-[3px] text-xl font-extrabold text-wf-ink hover:bg-wf-amberhi disabled:cursor-wait disabled:opacity-80 sm:h-[76px] sm:gap-4 sm:pl-[26px] sm:pr-6 sm:pt-1 sm:text-[23px]"
        >
          {busy ? 'Opening…' : 'Continue as Guest'}
          <ArrowRight size={26} color="#23262b" />
        </button>
        <div className="grid grid-cols-2 gap-[5px] sm:gap-1.5">
          <Link to="/signup" className={doorway}>
            Sign Up <ArrowRight size={18} color="#23262b" />
          </Link>
          <Link to="/login" className={doorway}>
            Login <ArrowRight size={18} color="#23262b" />
          </Link>
        </div>
      </section>

      <div className="w-full text-left">
        <FormError>{error}</FormError>
      </div>

      <p className="m-0 text-sm leading-normal text-wf-muted sm:text-[15px]">
        Guests can play right away. Sign up whenever you like — your games so far come with you.
      </p>
    </BarShell>
  );
}

/** The landing page's footer is centred under its centred column. */
function LandingFooter() {
  return (
    <footer className="border-t-[6px] border-wf-ink">
      <div className="mx-auto box-border flex max-w-[1160px] flex-wrap justify-center gap-x-[18px] gap-y-1 px-4 pb-5 pt-3 text-center text-[13px] text-wf-muted sm:gap-x-[22px] sm:gap-y-1.5 sm:px-8 sm:py-3.5 sm:text-sm">
        <span>
          © {new Date().getFullYear()} {SITE_NAME}
        </span>
        <Link to="/legal/privacy" className="text-wf-ink underline underline-offset-2 hover:text-wf-cobalt">
          Privacy
        </Link>
        <Link to="/legal/terms" className="text-wf-ink underline underline-offset-2 hover:text-wf-cobalt">
          Terms
        </Link>
        <span className="basis-full sm:basis-auto">Scripture: King James Version (public domain)</span>
      </div>
    </footer>
  );
}
