import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClosedPicker from '@/components/bible/ClosedPicker';
import BibleSpread from '@/components/bible/BibleSpread';
import BibleSinglePage from '@/components/bible/BibleSinglePage';
import ContentsPanel, { ContentsList } from '@/components/bible/ContentsPanel';
import SoundToggle from '@/components/wf/SoundToggle';
import HomeButton from '@/components/wf/HomeButton';
import { useWfBody, WfFullPageSpinner } from '@/components/wf/PageShell';
import { AlertIcon, ChevronDown, DragIcon, InfoIcon, LogoMark, MenuIcon } from '@/components/wf/Icons';
import { loadContents, loadManifest, spreadStart } from '@/lib/pageCache';
import { bookForPage } from '@/lib/contents';
import { useIsMobile } from '@/lib/useMediaQuery';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';

/** Where the reader is in the book, kept for the tab's lifetime across reloads. */
const PLACE_KEY = 'bibleoguessr:browse';

function readPlace() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PLACE_KEY) ?? 'null');
    if (saved && typeof saved.page === 'number') {
      return { view: saved.view === 'open' ? 'open' : 'closed', page: saved.page };
    }
  } catch {
    // Unreadable storage just means starting with the book shut.
  }
  // No page yet: the slider starts mid-book, as in a game.
  return { view: 'closed', page: null };
}

const SIDEBAR_KEY = 'bibleoguessr:browseSidebar';

function readSidebar() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'hidden';
  } catch {
    return true;
  }
}

function writePlace(place) {
  try {
    sessionStorage.setItem(PLACE_KEY, JSON.stringify(place));
  } catch {
    // Not worth interrupting reading over.
  }
}

/**
 * Browsing: the singleplayer Bible with nothing at stake. No clock, no score,
 * no verse to find — open it anywhere, turn pages for as long as you like, jump
 * to any book from the contents, and click a verse to see its reference.
 *
 * Everything here is local to the browser: no game is created and nothing is
 * sent to the server.
 */
export default function Browse() {
  useWfBody(true);
  const mobile = useIsMobile();

  const [manifest, setManifest] = useState(null);
  const [contents, setContents] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [place, setPlace] = useState(readPlace);
  const [selection, setSelection] = useState(null);
  // Phones: the contents drawer. Desktop: whether the sidebar is shown.
  const [contentsOpen, setContentsOpen] = useState(false);
  const [sidebarShown, setSidebarShown] = useState(readSidebar);
  // Bumped on a contents jump, so the single-page view remounts at the new
  // page (it only reads its starting page once).
  const [jump, setJump] = useState(0);

  const open = place.view === 'open';

  useEffect(() => {
    loadManifest().then(setManifest).catch((err) => setLoadError(friendlyError(err)));
    // The contents are a convenience: browsing works without them.
    loadContents().then(setContents).catch(() => setContents([]));
  }, []);

  useEffect(() => writePlace(place), [place]);

  const openAt = useCallback((page) => setPlace({ view: 'open', page }), []);
  const turnTo = useCallback((page) => setPlace((current) => ({ ...current, page })), []);

  function closeBible() {
    setSelection(null);
    setPlace((current) => ({ ...current, view: 'closed' }));
  }

  function pickFromContents(page) {
    play('riffle', { force: true });
    setContentsOpen(false);
    setJump((n) => n + 1);
    openAt(page);
  }

  if (loadError) {
    return (
      <div className="wf-root flex min-h-screen flex-col items-center justify-center gap-4 bg-wf-stage px-4">
        <p className="wf-alert-error m-0 max-w-md" role="alert">
          <AlertIcon />
          {loadError}
        </p>
        <Link to="/home" className="wf-btn-ink">
          Return Home
        </Link>
      </div>
    );
  }

  if (!manifest) return <WfFullPageSpinner label="Opening the book" stage />;

  const here = open ? bookForPage(contents, place.page) : null;

  return (
    <div className="wf-root flex h-[100dvh] flex-col overflow-hidden bg-wf-stage md:h-auto md:min-h-screen md:overflow-visible">
      {/* --- Header --------------------------------------------------------- */}
      <header className="wf-dark shrink-0 bg-wf-ink text-white">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-2 py-1.5 md:gap-x-4 md:px-7 md:py-2.5">
          {/* Phones: a plain Home button, styled as the policy pages' header Back
              button. Desktop has the wordmark here and a Home button beside the
              book. */}
          <HomeButton className="md:hidden" />
          <Link
            to="/home"
            aria-label="BibleoGuessr, home"
            className="mr-2 hidden min-h-[44px] items-center gap-2.5 text-white no-underline md:flex"
          >
            <LogoMark size={28} />
            <span className="text-[21px] font-extrabold">BibleoGuessr</span>
          </Link>

          <div className="wf-stat min-w-0 flex-1 md:flex-none">
            <span className="block text-xs font-semibold text-wf-ondark2">Browsing</span>
            <span className="block truncate text-[17px] font-extrabold leading-tight md:text-[19px]">
              {here ? (
                <>
                  {here.book} <span className="font-semibold text-wf-ondark2">· p. {place.page.toLocaleString()}</span>
                </>
              ) : (
                'Closed Bible'
              )}
            </span>
          </div>

          <span className="ml-auto hidden items-center gap-2 text-[15px] text-wf-ondark lg:flex">
            {open ? <DragIcon /> : <InfoIcon />}
            {open ? 'Drag a page sideways to turn it' : 'Slide along the page edges, then open the Bible'}
          </span>

          <button
            type="button"
            onClick={() => {
              play('menuOpen');
              setContentsOpen(true);
            }}
            aria-haspopup="dialog"
            // Phones only: on desktop the contents live in the sidebar.
            data-sound="none"
            className="flex h-11 shrink-0 items-center gap-2 rounded border-2 border-wf-line px-3 text-[15px] font-bold text-white hover:border-white md:hidden"
          >
            <MenuIcon />
            <span className="pt-0.5">Contents</span>
          </button>
          <SoundToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
      {/* --- Contents sidebar (desktop) -------------------------------------- */}
      {!mobile && (
        <ContentsSidebar
          shown={sidebarShown}
          onToggle={() => {
            const next = !sidebarShown;
            play(next ? 'menuOpen' : 'menuClose');
            setSidebarShown(next);
            try {
              localStorage.setItem(SIDEBAR_KEY, next ? 'shown' : 'hidden');
            } catch {
              // Not remembered; nothing else lost.
            }
          }}
          contents={contents}
          currentBook={here?.book ?? null}
          onPick={pickFromContents}
        />
      )}

      {/* --- The book ------------------------------------------------------- */}
      {/* Keyed on the sidebar so the spread re-measures its width when the
          sidebar opens or closes. */}
      <main
        key={mobile ? 'm' : String(sidebarShown)}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 pb-4 pt-3.5 md:justify-center md:px-6 md:pb-6 md:pt-7"
      >
        {!open && <ClosedPicker totalPages={manifest.totalPages} activePage={place.page ?? 1} initialPage={place.page} onOpen={openAt} />}

        {open && !mobile && (
          <BibleSpread
            manifest={manifest}
            activePage={spreadStart(place.page)}
            onChangePage={turnTo}
            selection={selection}
            onSelectWord={setSelection}
            reserveBottom={150}
          />
        )}

        {open && mobile && (
          <BibleSinglePage
            key={jump}
            manifest={manifest}
            initialPage={place.page}
            onChangePage={turnTo}
            selection={selection}
            onSelectWord={setSelection}
          />
        )}
      </main>
      </div>

      {/* --- Footer bar ----------------------------------------------------- */}
      <footer className="wf-dark shrink-0 bg-wf-ink text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2.5 px-3 pb-3 pt-2.5 md:px-7 md:py-3">
          <p className="m-0 flex flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm leading-snug text-wf-ondark md:text-base" aria-live="polite">
            {selection ? (
              <>
                <b className="rounded bg-wf-cobalt px-2.5 pb-px pt-1 text-base font-extrabold text-white md:px-3 md:text-lg">
                  {selection.reference}
                </b>
                <span className="tabular-nums">page {selection.page.toLocaleString()}</span>
              </>
            ) : open ? (
              `${mobile ? 'Tap' : 'Click'} a verse to see its reference.`
            ) : (
              'No clock, no score — read wherever you like.'
            )}
          </p>
          {open && (
            <button type="button" onClick={closeBible} data-sound="bookClose" className="wf-btn-ghost text-base max-md:h-[52px]">
              Close Bible
            </button>
          )}
        </div>
      </footer>

      {contentsOpen && (
        <ContentsPanel
          contents={contents}
          currentBook={here?.book ?? null}
          onPick={pickFromContents}
          onClose={() => {
            play('menuClose');
            setContentsOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Desktop: a column floating down the left of the book with a Home button and
 * the contents card — the same two pieces, in the same styles, as the policy
 * pages' side column. The card collapses to its header to give the book room.
 */
function ContentsSidebar({ shown, onToggle, contents, currentBook, onPick }) {
  return (
    <aside
      className={`sticky top-0 flex shrink-0 flex-col gap-3.5 self-start py-5 pl-5 lg:py-6 lg:pl-6 ${
        shown ? 'w-[274px] lg:w-[280px]' : ''
      }`}
    >
      <HomeButton variant="solid" />

      <div className="wf-dark flex flex-col gap-1 rounded-lg bg-wf-ink p-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={shown}
          aria-controls="browse-contents"
          data-sound="none"
          className="flex min-h-9 items-center justify-between gap-3 rounded px-2.5 pb-1 pt-2 text-left text-[13px] font-bold text-wf-ondark hover:text-white"
        >
          Contents
          <ChevronDown
            size={14}
            color="#e3a52b"
            className={`transition-transform duration-300 ${shown ? 'rotate-180' : ''}`}
          />
        </button>
        {shown && (
          <div
            id="browse-contents"
            className="wf-scroll max-h-[calc(100vh-210px)] overflow-y-auto overscroll-contain rounded pr-0.5"
          >
            <ContentsList contents={contents} currentBook={currentBook} onPick={onPick} />
          </div>
        )}
      </div>
    </aside>
  );
}
