import { useState } from 'react';
import ClosedBible3D from './ClosedBible3D';
import { OpenBookIcon } from '@/components/wf/Icons';
import { uFromPage } from '@/lib/pageMath';
import { play } from '@/lib/sound';

/**
 * Book closed, on every screen size: the book can be turned to look at, but
 * the page is chosen on a slider shaped like the page edges — far easier to
 * aim than a sliver of a 3D model — and opened with a button.
 */
export default function ClosedPicker({ totalPages, activePage, initialPage = null, onOpen }) {
  // Where the slider starts: the page the reader was last on, if there is one
  // (page 1 included), otherwise the middle of the book. The spread position
  // alone cannot say this, because a fresh round also sits on page 1.
  const [page, setPage] = useState(() =>
    initialPage ?? (activePage > 1 ? activePage : Math.ceil(totalPages / 2))
  );
  const [openRequest, setOpenRequest] = useState(null);
  const percent = uFromPage(page, totalPages) * 100;
  // Keep the page label on screen at the very ends of the slider.
  const labelAt = Math.min(Math.max(percent, 13), 87);

  function change(next) {
    setPage(next);
    play('edgeScrub');
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2.5 md:max-w-[900px] md:flex-none md:gap-3">
      <div className="min-h-[150px] w-full flex-1 md:h-[46vh] md:min-h-[320px] md:flex-none">
        <ClosedBible3D
          totalPages={totalPages}
          onOpen={onOpen}
          sliderPage={page}
          openRequest={openRequest}
        />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-1.5">
        <div className="relative h-[34px]">
          <span
            aria-hidden="true"
            className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap rounded bg-wf-ink px-3 pb-[3px] pt-1.5 text-base font-extrabold tabular-nums text-white"
            style={{ left: `${labelAt}%` }}
          >
            Page {page.toLocaleString()}
          </span>
        </div>
        <div className="relative box-border h-14 rounded-md bg-wf-navy px-2.5 py-1.5">
          <div
            aria-hidden="true"
            className="h-full rounded-sm"
            style={{
              backgroundColor: '#efe6cf',
              backgroundImage: 'repeating-linear-gradient(90deg, #d6c9a8 0 1px, transparent 1px 3px)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1 -top-2 w-1 rounded-sm bg-wf-crimson"
            style={{ left: `calc(10px + (100% - 20px) * ${percent / 100} - 2px)` }}
          />
          <input
            type="range"
            min={1}
            max={totalPages}
            step={1}
            value={page}
            onChange={(e) => change(Number(e.target.value))}
            aria-label="Page to open"
            aria-valuetext={`Page ${page.toLocaleString()}`}
            className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wf-cobalt" />
        </div>
        <p className="m-0 text-center text-sm text-wf-muted2">
          Slide along the page edges, then open the Bible there.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpenRequest({ page })}
        disabled={Boolean(openRequest)}
        data-sound="none"
        className="wf-btn-cobalt h-[54px] w-full shrink-0 text-lg"
      >
        <OpenBookIcon />
        Open at page {page.toLocaleString()}
      </button>
    </div>
  );
}

