/**
 * The redesign's icon set: simple filled shapes and thick strokes, drawn to sit
 * on signage. All decorative (aria-hidden) — every icon is paired with text.
 */

const PIN_PATH = 'M32 3C18 3 9 13 9 26c0 15 23 35 23 35s23-20 23-35C55 13 46 3 32 3z';

/** The brand mark: an amber map pin with an open book cut out of it. */
export function LogoMark({ size = 30, ground = '#23262b' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <path d={PIN_PATH} fill="#e3a52b" />
      <path
        d="M19 21c5-2.5 9-2.5 13 0v15c-4-2.5-8-2.5-13 0zM32 21c4-2.5 8-2.5 13 0v15c-5-2.5-9-2.5-13 0z"
        fill={ground}
      />
    </svg>
  );
}

/** "You are here": a hollow pin, for breadcrumbs and kickers. */
export function PinIcon({ size = 15, color = '#a8283a', hole = '#f2f0ea' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <path d={PIN_PATH} fill={color} />
      <circle cx="32" cy="26" r="9" fill={hole} />
    </svg>
  );
}

function Stroke({ size, color, width, view = '0 0 24 24', children, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={view}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="square"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function ArrowRight({ size = 22, color = 'currentColor', width = 3 }) {
  return (
    <Stroke size={size} color={color} width={width}>
      <path d="M4 12h15M13 5l7 7-7 7" />
    </Stroke>
  );
}

export function ArrowLeft({ size = 16, color = 'currentColor', width = 3 }) {
  return (
    <Stroke size={size} color={color} width={width}>
      <path d="M20 12H5M11 5l-7 7 7 7" />
    </Stroke>
  );
}

export function ChevronRight({ size = 14, color = 'currentColor', width = 3 }) {
  return (
    <Stroke size={size} color={color} width={width}>
      <path d="M9 5l7 7-7 7" />
    </Stroke>
  );
}

export function ChevronLeft({ size = 16, color = 'currentColor', width = 3.5 }) {
  return (
    <Stroke size={size} color={color} width={width}>
      <path d="M15 5l-7 7 7 7" />
    </Stroke>
  );
}

export function ChevronDown({ size = 16, color = 'currentColor', width = 3.5, className }) {
  return (
    <Stroke size={size} color={color} width={width} className={className}>
      <path d="M5 9l7 7 7-7" />
    </Stroke>
  );
}

export function MenuIcon({ color = '#e3a52b' }) {
  return (
    <svg aria-hidden="true" width="18" height="14" viewBox="0 0 18 14" className="shrink-0">
      <path d="M0 1h18M0 7h18M0 13h18" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

export function CloseIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" className="shrink-0">
      <path d="M1 1l12 12M13 1L1 13" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

export function InfoIcon({ size = 16, color = '#e3a52b' }) {
  return (
    <Stroke size={size} color={color} width={2.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </Stroke>
  );
}

/** An "i" in a ring: a note for the reader rather than a warning. */
export function NoteIcon({ size = 18, color = '#e3a52b' }) {
  return (
    <Stroke size={size} color={color} width={2.5} className="mt-px">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </Stroke>
  );
}

export function MailIcon({ size = 26, color = '#e3a52b' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" className="shrink-0">
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
      <path d="M3 6l9 7 9-7" />
    </svg>
  );
}

export function DragIcon({ color = '#e3a52b' }) {
  return (
    <svg aria-hidden="true" width="18" height="16" viewBox="0 0 28 24" fill="none" stroke={color} strokeWidth="2.5" className="shrink-0">
      <path d="M2 12h24M8 6l-6 6 6 6M20 6l6 6-6 6" />
    </svg>
  );
}

export function ClockIcon({ size = 18, color = '#a8283a' }) {
  return (
    <Stroke size={size} color={color} width={2.5} className="mt-px">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </Stroke>
  );
}

export function CheckIcon({ size = 18, color = '#2f6f6b' }) {
  return (
    <Stroke size={size} color={color} width={3} className="mt-px">
      <path d="M4 12.5l5 5L20 6.5" />
    </Stroke>
  );
}

export function AlertIcon({ size = 18, color = '#a8283a' }) {
  return (
    <Stroke size={size} color={color} width={2.5} className="mt-px">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </Stroke>
  );
}

export function WarningIcon({ size = 26, ground = '#a8283a' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path d="M12 2L1 21h22z" fill="#ffffff" />
      <path d="M12 9v5" stroke={ground} strokeWidth="2.5" />
      <circle cx="12" cy="17.2" r="1.4" fill={ground} />
    </svg>
  );
}

export function OpenBookIcon({ size = 20, color = '#e3a52b' }) {
  return (
    <svg aria-hidden="true" width={size} height={size * 0.875} viewBox="0 0 64 56" className="shrink-0">
      <path d="M4 8c10-5 20-5 28 0v42c-8-5-18-5-28 0zM32 8c8-5 18-5 28 0v42c-10-5-20-5-28 0z" fill={color} />
    </svg>
  );
}

export function SpeakerIcon({ on, size = 20, color = '#e3a52b' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path d="M3 9h4l5-4v14l-5-4H3z" fill={color} />
      {on ? (
        <path
          d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ) : (
        <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

/* --- Game-mode glyphs ---------------------------------------------------- */

export function ModeSingle({ size = 76, hole = '#1f4699', color = '#e3a52b' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r="26" fill={color} />
      <circle cx="32" cy="32" r="10" fill={hole} />
    </svg>
  );
}

export function ModeDuels({ size = 44 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="20" cy="32" r="14" fill="#a8283a" />
      <circle cx="44" cy="32" r="14" fill="none" stroke="#a8283a" strokeWidth="5" />
    </svg>
  );
}

export function ModeMultiplayer({ size = 44 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="18" cy="22" r="10" fill="#2f6f6b" />
      <circle cx="46" cy="22" r="10" fill="#2f6f6b" />
      <circle cx="18" cy="46" r="10" fill="#2f6f6b" />
      <circle cx="46" cy="46" r="10" fill="#2f6f6b" />
    </svg>
  );
}

export function ModeBrowsing({ size = 46, color = '#b07d14' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <path d="M8 18c8-4 16-4 24 0v32c-8-4-16-4-24 0zM32 18c8-4 16-4 24 0v32c-8-4-16-4-24 0z" fill={color} />
    </svg>
  );
}

/** Endless Practice: an unbroken loop. */
export function ModePractice({ size = 46, color = '#2753b8' }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <path
        d="M32 32c-5-7-9-11-15-11a11 11 0 000 22c6 0 10-4 15-11s9-11 15-11a11 11 0 010 22c-6 0-10-4-15-11z"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
