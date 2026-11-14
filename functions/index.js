/**
 * BibleoGuessr Cloud Functions
 * ============================
 *
 * The backend owns three things the client is not allowed to know or decide:
 *
 *   1. Which verses a game is made of. Targets live only on `/games/{gameId}`,
 *      which Firestore rules make unreadable to every client. The browser only
 *      ever receives the bare prompt text — no book, chapter or verse.
 *   2. What a guess actually points at. The client submits a page number and a
 *      word index; the server resolves those against its own copy of the page
 *      files and decides what was clicked.
 *   3. The score. Distance and score are computed here, from data the client
 *      never had.
 *
 * Cost control: every function declares `maxInstances: 10`, so a traffic spike
 * or a deliberate flood can never fan out into a runaway cloud bill.
 */

import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { buildTargets, evaluateGuess, nextPracticeTargets, PRACTICE_BATCH } from './lib/game.js';
import { creditedElapsed } from './lib/timing.js';
import { getManifest } from './lib/bibleData.js';
import {
  validateGameSettings,
  validateUsername,
  usernameKey,
  usernameCooldown,
  formatDuration,
  sanitizeText,
  sanitizeInt,
} from './shared/validation.js';
import { maxGameScore } from './shared/scoring.js';

initializeApp();
const db = getFirestore();

/**
 * Hard ceiling on concurrent instances for every function in this codebase.
 * Declared globally AND per-function so the limit survives someone adding a new
 * function and forgetting the option.
 */
const MAX_INSTANCES = 10;

/**
 * Where the functions run. Firestore is in the eur3 multi-region (Belgium and
 * the Netherlands); Cloud Functions cannot run in a multi-region, so they run
 * in europe-west1 (Belgium), inside it. Every database call is then a short
 * hop rather than a round trip across the Atlantic. The client must name the
 * same region — see src/firebase.js.
 */
const FUNCTIONS_REGION = 'europe-west1';

setGlobalOptions({ maxInstances: MAX_INSTANCES, region: FUNCTIONS_REGION });

/**
 * Browser origins permitted to call these functions.
 *
 * Set as a comma-separated list in `functions/.env` (see `.env.example`).
 * Callables already require a valid Firebase ID token for this project, so this
 * is defence in depth rather than the primary control — but it costs nothing to
 * narrow, and the frontend lives on a different origin from the backend once
 * hosting moves to Vercel, which makes the list worth being explicit about.
 *
 * Left unset it accepts any origin, which is firebase-functions' own default.
 * Breaking every call on a fresh deploy would be a worse failure than a
 * permissive default, so it warns loudly instead of locking the door.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!ALLOWED_ORIGINS.length) {
  console.warn(
    '[cors] ALLOWED_ORIGINS is not set — accepting calls from any origin. ' +
      'Set it in functions/.env before launch.'
  );
}

/**
 * How long an entry in /games survives.
 *
 * These documents are bulky — they hold the full text of every target verse —
 * and they are working state, not a record: a finished game is copied into
 * /games_history for anyone signed in. Without expiry the collection grows
 * without limit and quietly eats the Firestore free tier. Enforced by a TTL
 * policy on the `expiresAt` field (see DEPLOYMENT.md).
 */
const GAME_RETENTION_DAYS = 30;

/** Shared options applied to every callable below. */
const callableOptions = {
  cors: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
  maxInstances: MAX_INSTANCES,
  memory: '512MiB',
  timeoutSeconds: 60,
  // The verse pool and page files take a moment to load on a cold start, so
  // keep concurrency high enough that one warm instance serves many players.
  concurrency: 40,
};

/** Grace period for clock skew and network latency on timed rounds. */
const TIMER_GRACE_MS = 4000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Every callable requires a signed-in caller — anonymous guests included. */
function requireAuth(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to do that.');
  }
  return uid;
}

/** Reject anonymous callers from actions that only make sense for real accounts. */
function requireRegistered(request) {
  const uid = requireAuth(request);
  const provider = request.auth?.token?.firebase?.sign_in_provider;
  if (provider === 'anonymous') {
    throw new HttpsError('permission-denied', 'Create an account to do that.');
  }
  return uid;
}

function requireGameId(raw) {
  const gameId = sanitizeText(raw, 64);
  if (!gameId || !/^[A-Za-z0-9_-]{6,64}$/.test(gameId)) {
    throw new HttpsError('invalid-argument', 'Invalid game id.');
  }
  return gameId;
}

/**
 * Load a game and assert the caller owns it.
 * @returns {{ref: FirebaseFirestore.DocumentReference, game: object}}
 */
async function loadOwnedGame(gameId, uid) {
  const ref = db.collection('games').doc(gameId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'That game does not exist.');
  }
  const game = snapshot.data();
  if (game.uid !== uid) {
    throw new HttpsError('permission-denied', 'That game belongs to someone else.');
  }
  return { ref, game };
}

/**
 * Strip a game document down to what the browser is allowed to see.
 *
 * Rounds already played are safe to reveal in full — the player has seen those
 * answers. The round in progress is reduced to its prompt text, and every future
 * round is omitted entirely.
 */
function toClientState(gameId, game) {
  const { settings, results = [], currentRound, status } = game;
  const roundStartedAtMs = game.roundStartedAt?.toMillis?.() ?? null;
  // Endless Practice keeps only the verses still to come, the current one
  // first, and a running total instead of every round's result (see
  // submitGuess). `currentRound` still counts every round played.
  const practice = game.mode === 'practice';
  const currentTarget = practice ? game.targets[0] : game.targets[currentRound];

  const active =
    status === 'active' && currentTarget && (practice || currentRound < settings.rounds)
      ? {
          index: currentRound,
          text: currentTarget.text,
          startedAtMs: roundStartedAtMs,
        }
      : null;

  return {
    gameId,
    mode: practice ? 'practice' : 'singleplayer',
    settings,
    status,
    currentRound,
    roundCount: practice ? null : settings.rounds,
    totalScore: practice ? game.practiceScore ?? 0 : results.reduce((sum, r) => sum + r.score, 0),
    maxScore: practice ? null : maxGameScore(settings.rounds),
    results,
    round: active,
  };
}

/** Milliseconds the player has spent on the current round, per the server clock. */
function elapsedOnRound(game, now = Date.now()) {
  const startedAt = game.roundStartedAt?.toMillis?.();
  if (!startedAt) return 0;
  return Math.max(0, now - startedAt);
}

// ---------------------------------------------------------------------------
// Gameplay
// ---------------------------------------------------------------------------

/**
 * Create a game: draw the secret verse targets, persist them server-side, and
 * hand back a game id plus the first prompt.
 */
export const startGame = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);

  // Endless Practice: the same game, with no round count and nothing recorded.
  // It has no length to validate, so the batch size stands in for one.
  const practice = request.data?.mode === 'practice';
  const validated = validateGameSettings(
    practice ? { ...request.data, rounds: PRACTICE_BATCH } : request.data
  );
  if (!validated.ok) {
    throw new HttpsError('invalid-argument', validated.error);
  }
  const settings = validated.value;

  const targets = buildTargets(settings.popularity, settings.rounds);

  const ref = db.collection('games').doc();
  const now = Timestamp.now();

  await ref.set({
    uid,
    isAnonymous: request.auth?.token?.firebase?.sign_in_provider === 'anonymous',
    mode: practice ? 'practice' : 'singleplayer',
    settings,
    targets,
    results: [],
    currentRound: 0,
    status: 'active',
    createdAt: now,
    roundStartedAt: now,
    // A practice game starts out marked as "saved", which keeps it out of the
    // guest-history claim (that only picks up unsaved games). saveGameHistory
    // also refuses practice games outright.
    historySaved: practice,
    // Read by the Firestore TTL policy; see GAME_RETENTION_DAYS.
    expiresAt: Timestamp.fromMillis(now.toMillis() + GAME_RETENTION_DAYS * 86400000),
  });

  return toClientState(ref.id, {
    mode: practice ? 'practice' : 'singleplayer',
    settings,
    targets,
    results: [],
    currentRound: 0,
    status: 'active',
    roundStartedAt: now,
  });
});

/**
 * Serve the round in progress — on first load, after a reload, and when the
 * player advances from a round result.
 *
 * This is also where a round's clock starts. `submitGuess` deliberately leaves
 * `roundStartedAt` null, so the countdown begins when the player actually
 * receives the verse rather than while they are still reading the previous
 * result. Reloading does not restart it: the stamp is only ever written once.
 */
export const getGameState = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const gameId = requireGameId(request.data?.gameId);

  const game = await db.runTransaction(async (tx) => {
    const ref = db.collection('games').doc(gameId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'That game does not exist.');

    const current = snapshot.data();
    if (current.uid !== uid) {
      throw new HttpsError('permission-denied', 'That game belongs to someone else.');
    }

    if (current.status === 'active' && !current.roundStartedAt) {
      const startedAt = Timestamp.now();
      tx.update(ref, { roundStartedAt: startedAt });
      return { ...current, roundStartedAt: startedAt };
    }
    return current;
  });

  return toClientState(gameId, game);
});

/**
 * Submit a guess for the round currently in progress.
 *
 * The client sends only `{page, wordIndex}` — or nothing at all for a timeout.
 * The round being answered is whatever the server says is current, so a replayed
 * or reordered request cannot answer a round twice or jump ahead.
 */
export const submitGuess = onCall(callableOptions, async (request) => {
  // Taken first thing, before the database work, so the transaction's own
  // latency never counts against the player's clock.
  const receivedAt = Date.now();
  const uid = requireAuth(request);
  const gameId = requireGameId(request.data?.gameId);

  const manifest = getManifest();
  const rawPage = request.data?.page;
  const rawWordIndex = request.data?.wordIndex;

  let guess = null;
  if (rawPage !== null && rawPage !== undefined) {
    const page = sanitizeInt(rawPage, 1, manifest.totalPages);
    const wordIndex = sanitizeInt(rawWordIndex, 0, 5000);
    if (page === null || wordIndex === null) {
      throw new HttpsError('invalid-argument', 'That guess is not a valid page position.');
    }
    guess = { page, wordIndex };
  }

  const result = await db.runTransaction(async (tx) => {
    const ref = db.collection('games').doc(gameId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'That game does not exist.');
    }

    const game = snapshot.data();
    if (game.uid !== uid) {
      throw new HttpsError('permission-denied', 'That game belongs to someone else.');
    }
    if (game.status !== 'active') {
      throw new HttpsError('failed-precondition', 'That game has already finished.');
    }

    const roundIndex = game.currentRound;

    // If the client claims to be answering a different round than the server has
    // in progress, its state is stale — refuse rather than silently misapply it.
    const claimedRound = request.data?.roundIndex;
    if (claimedRound !== undefined && claimedRound !== null && claimedRound !== roundIndex) {
      throw new HttpsError('failed-precondition', 'That round is no longer in progress.');
    }

    // Timed by the player's click, as their browser reports it, credited for
    // network delay if it falls within a short window (see lib/timing.js).
    const timeTakenMs = creditedElapsed(elapsedOnRound(game, receivedAt), request.data?.elapsedMs);

    // Timer enforcement is server-side. A client that stalls past the limit
    // scores zero whether or not its own countdown fired.
    let effectiveGuess = guess;
    let timedOut = false;
    if (game.settings.timer > 0 && timeTakenMs > game.settings.timer * 1000 + TIMER_GRACE_MS) {
      effectiveGuess = null;
      timedOut = true;
    }

    // The client's countdown can legitimately fire inside the server's grace
    // window. Trusting its claim only ever changes the wording on an
    // already-zero round, never the score, so it is safe to take at face value.
    if (game.settings.timer > 0 && request.data?.timedOut === true) {
      timedOut = true;
    }

    const practice = game.mode === 'practice';
    // Practice keeps its current verse at the head of the queue.
    const target = practice ? game.targets[0] : game.targets[roundIndex];
    const evaluated = evaluateGuess(target, effectiveGuess);
    const roundResult = {
      round: roundIndex,
      timeTakenMs,
      ...evaluated,
      timedOut: evaluated.timedOut || timedOut,
    };

    const nextRound = roundIndex + 1;

    if (practice) {
      // Endless Practice: the round just played is dropped from the queue and
      // its result is not kept — only a running total — so the stored game
      // stays a handful of verses long and the session never has to end.
      const totalScore = (game.practiceScore ?? 0) + roundResult.score;
      tx.update(ref, {
        targets: nextPracticeTargets(game.targets, game.settings.popularity),
        practiceScore: totalScore,
        currentRound: nextRound,
        roundStartedAt: null,
      });
      return {
        result: roundResult,
        roundIndex,
        nextRound,
        finished: false,
        totalScore,
        maxScore: null,
        roundCount: null,
        mode: 'practice',
      };
    }

    const results = [...(game.results ?? []), roundResult];
    const finished = nextRound >= game.settings.rounds;

    tx.update(ref, {
      results,
      currentRound: nextRound,
      status: finished ? 'complete' : 'active',
      // Cleared rather than restamped: the next round's clock must not start
      // while the player is still reading this round's result. `getGameState`
      // stamps it when the round is actually served.
      roundStartedAt: finished ? game.roundStartedAt : null,
      ...(finished ? { completedAt: Timestamp.now() } : {}),
    });

    return {
      result: roundResult,
      roundIndex,
      nextRound,
      finished,
      totalScore: results.reduce((sum, r) => sum + r.score, 0),
      maxScore: maxGameScore(game.settings.rounds),
      roundCount: game.settings.rounds,
      mode: 'singleplayer',
    };
  });

  return result;
});

/**
 * Full breakdown of a finished game, for the summary screen.
 */
export const getGameSummary = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const gameId = requireGameId(request.data?.gameId);
  const { game } = await loadOwnedGame(gameId, uid);

  if (game.status !== 'complete') {
    throw new HttpsError('failed-precondition', 'That game is still in progress.');
  }

  return {
    gameId,
    settings: game.settings,
    rounds: game.results,
    totalScore: game.results.reduce((sum, r) => sum + r.score, 0),
    maxScore: maxGameScore(game.settings.rounds),
    completedAt: game.completedAt?.toMillis?.() ?? null,
    saved: Boolean(game.historySaved),
  };
});

/**
 * Persist a completed game to `/games_history`.
 *
 * Called by the summary screen the moment it mounts, before any navigation
 * control becomes interactive. The history document id IS the game id, which
 * makes the write naturally idempotent — a double-mount, a refresh or a retry
 * all converge on the same single record rather than duplicating the game.
 *
 * Guests are skipped: an anonymous session has nowhere durable to write to.
 * Their history begins the moment they link a real account.
 */
export const saveGameHistory = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const gameId = requireGameId(request.data?.gameId);
  const isAnonymous = request.auth?.token?.firebase?.sign_in_provider === 'anonymous';

  if (isAnonymous) {
    return { saved: false, reason: 'guest' };
  }

  return db.runTransaction(async (tx) => {
    const gameRef = db.collection('games').doc(gameId);
    const historyRef = db.collection('games_history').doc(gameId);
    const userRef = db.collection('users').doc(uid);

    const [gameSnap, historySnap, userSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(historyRef),
      tx.get(userRef),
    ]);

    if (!gameSnap.exists) throw new HttpsError('not-found', 'That game does not exist.');
    const game = gameSnap.data();
    if (game.uid !== uid) throw new HttpsError('permission-denied', 'That game belongs to someone else.');
    // Endless Practice is never recorded: no history entry, no stats.
    if (game.mode === 'practice') {
      return { saved: false, reason: 'practice' };
    }
    if (game.status !== 'complete') {
      throw new HttpsError('failed-precondition', 'That game is not finished yet.');
    }

    if (historySnap.exists) {
      return { saved: true, alreadySaved: true, historyId: gameId };
    }

    const totalScore = game.results.reduce((sum, r) => sum + r.score, 0);
    const completedAt = game.completedAt ?? Timestamp.now();

    tx.set(historyRef, {
      uid,
      gameId,
      mode: 'singleplayer',
      settings: game.settings,
      rounds: game.results,
      totalScore,
      maxScore: maxGameScore(game.settings.rounds),
      roundCount: game.settings.rounds,
      completedAt,
      createdAt: game.createdAt ?? completedAt,
    });

    tx.update(gameRef, { historySaved: true });

    const previousBest = userSnap.exists ? (userSnap.data().stats?.bestScore ?? 0) : 0;
    if (userSnap.exists) {
      tx.update(userRef, {
        'stats.gamesPlayed': FieldValue.increment(1),
        'stats.bestScore': Math.max(previousBest, totalScore),
        'stats.lastPlayedAt': completedAt,
      });
    }

    return { saved: true, alreadySaved: false, historyId: gameId, totalScore };
  });
});

/**
 * Promote games played as a guest into the caller's permanent history.
 *
 * Called immediately after signup. Because linking an email credential onto an
 * anonymous user preserves the uid, those games already belong to this account
 * — they were simply never written to `/games_history`, since a guest has
 * nowhere durable to write to. This backfills them.
 *
 * Nothing is copied or moved: the completed games have been sitting on the
 * server the whole time, so a guest never has to have trusted the browser to
 * hold their results. Logging into a *different* existing account does not
 * bring guest games along, because that is a different uid.
 *
 * Idempotent: history documents are keyed by game id and each game is marked
 * `historySaved` as it is claimed.
 */
export const claimGuestHistory = onCall(callableOptions, async (request) => {
  const uid = requireRegistered(request);

  const snapshot = await db
    .collection('games')
    .where('uid', '==', uid)
    .where('status', '==', 'complete')
    .where('historySaved', '==', false)
    .limit(50)
    .get();

  if (snapshot.empty) return { claimed: 0 };

  const batch = db.batch();
  let claimed = 0;
  let bestScore = 0;
  let latestCompletedAt = null;

  for (const doc of snapshot.docs) {
    const game = doc.data();
    if (game.mode === 'practice') continue; // never recorded
    if (!Array.isArray(game.results) || !game.results.length) continue;

    const totalScore = game.results.reduce((sum, round) => sum + round.score, 0);
    const completedAt = game.completedAt ?? Timestamp.now();

    batch.set(db.collection('games_history').doc(doc.id), {
      uid,
      gameId: doc.id,
      mode: 'singleplayer',
      settings: game.settings,
      rounds: game.results,
      totalScore,
      maxScore: maxGameScore(game.settings.rounds),
      roundCount: game.settings.rounds,
      completedAt,
      createdAt: game.createdAt ?? completedAt,
      claimedFromGuest: true,
    });
    batch.update(doc.ref, { historySaved: true });

    claimed += 1;
    bestScore = Math.max(bestScore, totalScore);
    if (!latestCompletedAt || completedAt.toMillis() > latestCompletedAt.toMillis()) {
      latestCompletedAt = completedAt;
    }
  }

  if (!claimed) return { claimed: 0 };

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const previousBest = userSnap.data().stats?.bestScore ?? 0;
    batch.update(userRef, {
      'stats.gamesPlayed': FieldValue.increment(claimed),
      'stats.bestScore': Math.max(previousBest, bestScore),
      'stats.lastPlayedAt': latestCompletedAt,
    });
  }

  await batch.commit();
  return { claimed };
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/**
 * Create or refresh the caller's `/users` profile.
 *
 * Called on every sign-in, including immediately after a guest links a real
 * account. Because credential linking preserves the uid, the guest's existing
 * `/games_history` documents already belong to the new account — this call just
 * flips the profile from anonymous to registered.
 */
export const ensureProfile = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const token = request.auth?.token ?? {};
  const isAnonymous = token.firebase?.sign_in_provider === 'anonymous';
  const email = typeof token.email === 'string' ? token.email.toLowerCase() : null;

  const ref = db.collection('users').doc(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const profile = {
      uid,
      email,
      username: null,
      usernameLower: null,
      usernameChangedAt: null,
      isAnonymous,
      createdAt: Timestamp.now(),
      stats: { gamesPlayed: 0, bestScore: 0, lastPlayedAt: null },
    };
    await ref.set(profile);
    return { ...profile, createdAt: profile.createdAt.toMillis(), usernameChangedAt: null };
  }

  const existing = snapshot.data();
  const patch = {};
  if (existing.isAnonymous !== isAnonymous) patch.isAnonymous = isAnonymous;
  if (email && existing.email !== email) patch.email = email;
  if (Object.keys(patch).length) await ref.update(patch);

  return {
    ...existing,
    ...patch,
    createdAt: existing.createdAt?.toMillis?.() ?? null,
    usernameChangedAt: existing.usernameChangedAt?.toMillis?.() ?? null,
  };
});

/**
 * Is this username both well-formed and free? Used for live feedback on the
 * signup and settings forms.
 */
export const checkUsername = onCall(callableOptions, async (request) => {
  requireAuth(request);

  const validated = validateUsername(request.data?.username);
  if (!validated.ok) {
    return { available: false, error: validated.error };
  }

  const snapshot = await db.collection('usernames').doc(usernameKey(validated.value)).get();
  if (snapshot.exists && snapshot.data().uid !== request.auth.uid) {
    return { available: false, error: 'That username is already taken.' };
  }

  return { available: true, username: validated.value };
});

/**
 * Claim or change a username.
 *
 * Uniqueness is enforced by a reservation document in `/usernames`, taken inside
 * a transaction so two simultaneous claims cannot both win. Changing an existing
 * username stamps `usernameChangedAt`, which gates the next change behind a
 * strict two-week cooldown.
 */
export const setUsername = onCall(callableOptions, async (request) => {
  const uid = requireRegistered(request);

  const validated = validateUsername(request.data?.username);
  if (!validated.ok) {
    throw new HttpsError('invalid-argument', validated.error);
  }
  const username = validated.value;
  const key = usernameKey(username);

  return db.runTransaction(async (tx) => {
    const userRef = db.collection('users').doc(uid);
    const claimRef = db.collection('usernames').doc(key);

    const [userSnap, claimSnap] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);
    if (!userSnap.exists) {
      throw new HttpsError('failed-precondition', 'Your profile is not set up yet.');
    }

    const user = userSnap.data();
    const previousKey = user.usernameLower ?? null;

    if (previousKey === key) {
      throw new HttpsError('invalid-argument', 'That is already your username.');
    }

    if (claimSnap.exists && claimSnap.data().uid !== uid) {
      throw new HttpsError('already-exists', 'That username is already taken.');
    }

    // The cooldown applies to *changes*, not to first-time claims.
    if (previousKey) {
      const lastChanged = user.usernameChangedAt?.toMillis?.() ?? null;
      const cooldown = usernameCooldown(lastChanged);
      if (!cooldown.allowed) {
        throw new HttpsError(
          'failed-precondition',
          `You can change your username again in ${formatDuration(cooldown.remainingMs)}.`
        );
      }
    }

    const now = Timestamp.now();
    tx.set(claimRef, { uid, username, claimedAt: now });
    if (previousKey) {
      tx.delete(db.collection('usernames').doc(previousKey));
    }
    tx.update(userRef, {
      username,
      usernameLower: key,
      // Timestamped flag that enforces the cooldown on the next attempt.
      usernameChangedAt: now,
    });

    return { username, usernameChangedAt: now.toMillis() };
  });
});

/**
 * Permanently delete the caller's account: their username reservation, their
 * profile, their entire game history, and finally the Auth record itself.
 *
 * Irreversible by design — the client gates this behind an explicit
 * type-to-confirm modal.
 */
export const deleteAccount = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  const batchLimit = 400;
  let deletedGames = 0;

  // Purge history in bounded batches so a long-lived account cannot blow the
  // 500-write transaction ceiling.
  for (const collectionName of ['games_history', 'games']) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snapshot = await db
        .collection(collectionName)
        .where('uid', '==', uid)
        .limit(batchLimit)
        .get();
      if (snapshot.empty) break;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deletedGames += snapshot.size;

      if (snapshot.size < batchLimit) break;
    }
  }

  const finalBatch = db.batch();
  if (userSnap.exists && userSnap.data().usernameLower) {
    finalBatch.delete(db.collection('usernames').doc(userSnap.data().usernameLower));
  }
  if (userSnap.exists) {
    finalBatch.delete(userRef);
  }
  await finalBatch.commit();

  // Deleting the Auth record last means a failure anywhere above leaves the
  // account intact and retryable, rather than orphaning its data.
  await getAuth().deleteUser(uid);

  return { deleted: true, documentsRemoved: deletedGames };
});
