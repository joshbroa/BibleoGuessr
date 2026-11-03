/**
 * Only follow a continue URL that points back at this site.
 *
 * Firebase puts a `continueUrl` on the query string of its email links, taken
 * from the `ActionCodeSettings` we passed when sending, and the action handler
 * turns it into a "Continue" button. Firebase already refuses to send a link
 * whose continue URL is not an authorised domain, so this is belt and braces —
 * but a handler that forwards wherever a query string tells it to is the
 * textbook open redirect, and it costs one comparison not to be one.
 *
 * Returns a same-origin path, or `fallback` if the value is absent, malformed,
 * or points anywhere else. The return value is always relative, so it can be
 * handed straight to react-router's <Link>.
 */
export function safeContinue(raw, fallback = '/home') {
  if (!raw) return fallback;
  try {
    // A relative value resolves against our own origin and is therefore safe;
    // an absolute one keeps its own origin and gets compared below.
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
