import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/lib/useMediaQuery';
import { play } from '@/lib/sound';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';
import Logo from './Logo';
import SoundToggle from './SoundToggle';
import { ArrowRight, CloseIcon, MenuIcon } from './Icons';

/**
 * The charcoal bar across the top of every non-game page.
 *
 * Desktop: the wordmark, then a row of plain links — the current one underlined
 * in amber. Phones: the wordmark and a Menu button that drops a panel down over
 * the page. A guest is offered Sign Up and Login where a player sees their
 * account links.
 *
 * @param {'history'|'settings'|null} current which account page this is
 */
export default function SiteHeader({ current = null }) {
  const { isRegistered, displayName, logout } = useAuth();
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    await logout();
    navigate('/', { replace: true });
  }

  // Leaving phone width with the menu open would strand an invisible dialog.
  useEffect(() => {
    if (!mobile) setMenuOpen(false);
  }, [mobile]);

  return (
    <header className="wf-dark relative z-40">
      <VerifyEmailBanner />
      <nav aria-label="Main" className="bg-wf-ink text-wf-paper">
        <div className="mx-auto flex max-w-[1160px] items-center gap-x-6 gap-y-2.5 py-2 pl-4 pr-3 sm:px-8 sm:py-3">
          <Logo />

          {!isRegistered && mobile ? (
            // A guest has only two places to go, so on a phone they sit in the
            // bar itself rather than behind a Menu button.
            <div className="ml-auto flex items-center gap-2">
              <GuestLinks compact />
            </div>
          ) : mobile ? (
            <button
              type="button"
              onClick={() => {
                play('menuOpen');
                setMenuOpen(true);
              }}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              data-sound="none"
              className="ml-auto flex h-11 items-center gap-2 rounded border-2 border-wf-line px-3 text-[15px] font-bold text-white"
            >
              <MenuIcon />
              <span className="pt-0.5">Menu</span>
            </button>
          ) : (
            <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[15px]">
              {isRegistered ? (
                <>
                  <span className="text-wf-ondark2">
                    Signed in as <b className="font-bold text-white">{displayName}</b>
                  </span>
                  <NavLink to="/history" active={current === 'history'}>
                    Game History
                  </NavLink>
                  <NavLink to="/settings" active={current === 'settings'}>
                    Account Settings
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-[44px] text-wf-ondark2 underline underline-offset-[5px] hover:text-white"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <span className="mr-1.5 text-wf-ondark2">Playing as guest</span>
                  <GuestLinks />
                </>
              )}
              <SoundToggle className="-mr-2" />
            </div>
          )}
        </div>
      </nav>

      {mobile && menuOpen && (
        <MobileMenu
          displayName={displayName}
          onClose={() => {
            play('menuClose');
            setMenuOpen(false);
          }}
          onSignOut={handleSignOut}
        />
      )}
    </header>
  );
}

/** Login (outlined) and Sign Up (amber): the two doors out of being a guest. */
function GuestLinks({ compact = false }) {
  const size = compact ? 'px-[11px] text-[15px]' : 'px-4 text-[15px]';
  return (
    <>
      <Link
        to="/login"
        className={`box-border inline-flex h-11 items-center rounded border-2 border-wf-line pt-0.5 font-bold text-white no-underline hover:border-white ${size}`}
      >
        Login
      </Link>
      <Link
        to="/signup"
        className={`box-border inline-flex h-11 items-center rounded bg-wf-amber pt-0.5 font-extrabold text-wf-ink no-underline hover:bg-wf-amberhi ${
          compact ? 'px-3 text-[15px]' : 'px-[18px] text-[15px]'
        }`}
      >
        Sign Up
      </Link>
    </>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'border-b-[3px] border-wf-amber pb-0.5 pt-1 font-bold text-white no-underline'
          : 'font-semibold text-white underline-offset-[5px] hover:underline'
      }
    >
      {children}
    </Link>
  );
}

/** The phone menu: a charcoal panel dropped over a dimmed page. */
function MobileMenu({ displayName, onClose, onSignOut }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.querySelector('button')?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') closeRef.current();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, []);

  const row =
    'flex h-[60px] items-center justify-between rounded bg-wf-ink2 px-3.5 text-[19px] font-extrabold text-white no-underline';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-wf-ink/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="wf-dark absolute inset-x-0 top-0 animate-wf-drop bg-wf-ink text-white shadow-[0_24px_40px_-16px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between gap-3 py-2 pl-4 pr-3">
          <Logo onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            aria-expanded="true"
            data-sound="none"
            className="flex h-11 items-center gap-2 rounded border-2 border-wf-amber bg-wf-amber px-3 text-[15px] font-extrabold text-wf-ink"
          >
            <CloseIcon />
            <span className="pt-0.5">Close</span>
          </button>
        </div>

        {/* Only signed-in players get a menu; a guest's two links sit in the bar. */}
        <div className="flex flex-col gap-1.5 px-1.5 pb-1.5 pt-1">
          <p className="m-0 px-3 pb-2 pt-3 text-[15px] text-wf-ondark">
            Signed in as <b className="text-white">{displayName}</b>
          </p>
          <Link to="/history" className={row} onClick={onClose}>
            Game History <ArrowRight size={18} color="#e3a52b" />
          </Link>
          <Link to="/settings" className={row} onClick={onClose}>
            Account Settings <ArrowRight size={18} color="#e3a52b" />
          </Link>
          <SoundToggle labelled className="mt-1.5" />
          <button
            type="button"
            onClick={onSignOut}
            className="h-[52px] rounded border-2 border-wf-line text-[17px] font-bold text-wf-ondark"
          >
            <span className="pt-0.5">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
