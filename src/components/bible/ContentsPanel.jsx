import { useEffect, useRef } from 'react';
import { splitTestaments } from '@/lib/contents';
import { CloseIcon } from '@/components/wf/Icons';

/**
 * The table of contents: every book with the page it starts on, as a list of
 * buttons that open the Bible there. A drawer from the right on desktop, a
 * sheet from the bottom on phones. Escape or the backdrop closes it.
 *
 * @param {{book: string, page: number}[]} contents
 * @param {string|null} currentBook  highlighted, and scrolled into view
 * @param {(page: number) => void} onPick
 */
export default function ContentsPanel({ contents, currentBook, onPick, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    // Start where the reader is, not at Genesis.
    const current = panel?.querySelector('[aria-current="true"]');
    (current ?? panel?.querySelector('button'))?.focus();
    current?.scrollIntoView?.({ block: 'center' });

    function onKeyDown(event) {
      if (event.key === 'Escape') closeRef.current();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 font-wf">
      <div className="absolute inset-0 bg-wf-ink/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contents-title"
        className="wf-dark absolute inset-x-0 bottom-0 top-14 flex animate-wf-rise flex-col gap-[5px] rounded-t-[14px] bg-wf-ink p-[5px] shadow-[0_-24px_40px_-16px_rgba(0,0,0,0.6)] md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[400px] md:rounded-none md:p-1.5"
      >
        <div className="flex items-center justify-between gap-3 px-2.5 pb-1 pt-2 md:px-3 md:pt-2.5">
          <h2 id="contents-title" className="m-0 text-[22px] font-extrabold text-white">
            Contents
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-sound="menuClose"
            className="flex h-11 items-center gap-2 rounded border-2 border-wf-amber bg-wf-amber px-3 text-[15px] font-extrabold text-wf-ink"
          >
            <CloseIcon />
            <span className="pt-0.5">Close</span>
          </button>
        </div>

        <div className="wf-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain rounded">
          <ContentsList contents={contents} currentBook={currentBook} onPick={onPick} />
        </div>
      </div>
    </div>
  );
}

/**
 * The books themselves, split by testament: shared by the phone drawer above
 * and the desktop sidebar in Browsing.
 */
export function ContentsList({ contents, currentBook, onPick }) {
  if (!contents) return <p className="m-0 p-4 text-[15px] text-wf-ondark">Loading the contents…</p>;
  const { oldTestament, newTestament } = splitTestaments(contents);
  return (
    <>
      <Testament title="Old Testament" books={oldTestament} currentBook={currentBook} onPick={onPick} />
      <Testament title="New Testament" books={newTestament} currentBook={currentBook} onPick={onPick} />
    </>
  );
}

/** One testament's books, in the same row style as the policy pages' contents. */
function Testament({ title, books, currentBook, onPick }) {
  if (!books.length) return null;
  return (
    <section aria-label={title} className="mb-1">
      <h3 className="sticky top-0 z-10 m-0 bg-wf-ink px-2.5 pb-1 pt-2 text-[13px] font-bold text-wf-ondark">
        {title}
      </h3>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {books.map((entry) => {
          const current = entry.book === currentBook;
          return (
            <li key={entry.book}>
              <button
                type="button"
                onClick={() => onPick(entry.page)}
                aria-current={current ? 'true' : undefined}
                data-sound="none"
                className={`box-border flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded px-2.5 py-1.5 text-left text-[15px] font-bold leading-tight transition-colors lg:min-h-10 lg:text-sm ${
                  current ? 'bg-wf-cobalt text-white' : 'bg-wf-mist text-wf-ink hover:bg-white'
                }`}
              >
                <span>{entry.book}</span>
                <span className="box-border grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-[3px] bg-wf-ink px-1.5 pt-0.5 text-xs tabular-nums text-wf-amber">
                  <span className="sr-only">page </span>
                  {entry.page.toLocaleString()}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
