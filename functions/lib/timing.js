/**
 * How far before the server received a guess the player's reported click time
 * may fall and still be believed. Covers ordinary network delay. A claim
 * further back than this is ignored outright, not stretched to the limit.
 */
export const LATENCY_CREDIT_MS = 3000;

/**
 * Time taken on a round, crediting the player for network delay.
 *
 * The browser reports how far into the round the player clicked. If that lies
 * within `LATENCY_CREDIT_MS` before the server received the request, it is
 * used. Otherwise — missing, nonsensical, too early, or later than the server
 * saw it — the server's own time is used.
 *
 * @param {number} serverElapsedMs  round start to the server receiving the guess
 * @param {unknown} claimedElapsedMs round start to the click, as the browser saw it
 * @returns {number} milliseconds to time the guess by
 */
export function creditedElapsed(serverElapsedMs, claimedElapsedMs) {
  const server = Math.max(0, serverElapsedMs);
  if (typeof claimedElapsedMs !== 'number' || !Number.isFinite(claimedElapsedMs)) return server;
  const inWindow = claimedElapsedMs >= server - LATENCY_CREDIT_MS && claimedElapsedMs <= server;
  return inWindow ? Math.max(0, claimedElapsedMs) : server;
}
