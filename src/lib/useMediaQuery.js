import { useSyncExternalStore } from 'react';

function query(media) {
  return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(media) : null;
}

/** Live result of a CSS media query. */
export function useMediaQuery(media) {
  return useSyncExternalStore(
    (onChange) => {
      const list = query(media);
      if (!list) return () => {};
      list.addEventListener?.('change', onChange);
      return () => list.removeEventListener?.('change', onChange);
    },
    () => Boolean(query(media)?.matches),
    () => false
  );
}

/**
 * Phone layout: below Tailwind's `md` breakpoint. The game changes how it is
 * played here, not just how it looks — the closed Bible is driven by a slider
 * and the open Bible shows one page at a time — so this is a behaviour switch,
 * not only a styling one.
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}
