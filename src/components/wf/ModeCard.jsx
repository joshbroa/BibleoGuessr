import { Link } from 'react-router-dom';
import { play } from '@/lib/sound';
import { ArrowRight } from './Icons';

/** One easing for every part of the card, so they move as one. */
const EASE = 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/**
 * A playable mode on the home page.
 *
 * Selected, it is the big cobalt card with the Play button; otherwise a stone
 * row you click to select it. It is one card in both states — colour, size,
 * icon and type all transition between them — so switching modes glides
 * rather than snaps.
 */
export default function ModeCard({ mode, selected, onSelect }) {
  const { Icon } = mode;

  const playButton = (className) => (
    <Link
      to={mode.to}
      tabIndex={selected ? 0 : -1}
      aria-hidden={!selected}
      className={`wf-btn-amber wf-btn-lg ${className}`}
    >
      Play <ArrowRight size={20} color="#23262b" />
    </Link>
  );

  return (
    <div
      className={`relative overflow-hidden rounded transition-colors ${EASE} ${
        selected ? 'bg-wf-cobalt text-white' : 'bg-wf-mist text-wf-ink hover:bg-white'
      }`}
    >
      {/* The whole row selects it while unselected. */}
      {!selected && (
        <button
          type="button"
          onClick={onSelect}
          onPointerEnter={() => play('hover')}
          aria-label={`Choose ${mode.title}`}
          className="absolute inset-0 z-10 cursor-pointer rounded"
        />
      )}

      <div className="flex items-stretch">
        <div
          aria-hidden="true"
          className={`grid shrink-0 place-items-center transition-all ${EASE} ${
            selected
              ? 'min-h-[104px] basis-[76px] bg-wf-cobaltdeep sm:min-h-[150px] sm:basis-[150px]'
              : 'min-h-[72px] basis-[60px] bg-wf-mist2 sm:min-h-[88px] sm:basis-[96px]'
          }`}
        >
          <span className={`block transition-transform ${EASE} ${selected ? 'scale-100' : 'scale-[0.6]'}`}>
            <span className="sm:hidden">
              <Icon size={48} color={selected ? '#e3a52b' : undefined} hole={selected ? '#1f4699' : '#d2d9d9'} />
            </span>
            <span className="hidden sm:block">
              <Icon size={76} color={selected ? '#e3a52b' : undefined} hole={selected ? '#1f4699' : '#d2d9d9'} />
            </span>
          </span>
        </div>

        <div className={`flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3 transition-all sm:px-[30px] ${EASE} ${selected ? 'gap-2 sm:py-[26px]' : 'gap-0.5 sm:py-4'}`}>
          <h2
            className={`m-0 font-extrabold leading-none transition-all ${EASE} ${
              selected ? 'text-[30px] sm:text-[40px]' : 'text-[19px] sm:text-2xl'
            }`}
          >
            {mode.title}
          </h2>
          <p
            className={`m-0 max-w-[520px] leading-[1.45] transition-all ${EASE} ${
              selected ? 'text-base text-wf-cobalttint sm:text-lg' : 'text-sm text-wf-muted2 sm:text-[15px]'
            }`}
          >
            {mode.blurb}
          </p>
        </div>

        {/* Desktop: "Select" fades out as the Play button fades in, in place. */}
        <div className="hidden shrink-0 items-center pr-[30px] [grid-template-areas:'slot'] sm:grid">
          <span
            className={`justify-self-end text-[15px] font-bold text-wf-muted transition-opacity [grid-area:slot] ${EASE} ${
              selected ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Select
          </span>
          {playButton(
            `[grid-area:slot] transition-all ${EASE} ${
              selected ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-3 opacity-0'
            }`
          )}
        </div>
      </div>

      {/* Phones: the Play button slides open beneath the text. */}
      <div className={`grid transition-[grid-template-rows] sm:hidden ${EASE} ${selected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-[18px] pb-[18px] pt-1">{playButton('h-14 w-full')}</div>
        </div>
      </div>
    </div>
  );
}
