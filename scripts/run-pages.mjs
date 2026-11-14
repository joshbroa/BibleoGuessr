#!/usr/bin/env node
/**
 * Cross-platform launcher for `generate_bible_pages.py`.
 *
 * The generator is plain-stdlib Python, but the command that runs it is not
 * portable: Windows ships the `py` launcher (and leaves `python` as a Microsoft
 * Store stub that merely prints an advert), while Linux build images — Vercel's
 * included — expose `python3`. Hard-coding either one breaks the other, so this
 * probes for a real interpreter and reports clearly when there is none.
 *
 *   node scripts/run-pages.mjs              regenerate the page data
 *   node scripts/run-pages.mjs --if-missing only generate when it is absent
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const GENERATOR = path.join(HERE, 'generate_bible_pages.py');
const MANIFEST = path.join(ROOT, 'public', 'bible_pages', 'manifest.json');
const FUNCTIONS_MANIFEST = path.join(ROOT, 'functions', 'src', 'bible_pages', 'manifest.json');
const VERSE_POOL = path.join(ROOT, 'functions', 'src', 'verse_pool.json');

// `py -3` first on Windows: it is the only one of the three that is reliably a
// real interpreter rather than the Store stub.
const CANDIDATES =
  process.platform === 'win32'
    ? [
        ['py', ['-3']],
        ['python', []],
        ['python3', []],
      ]
    : [
        ['python3', []],
        ['python', []],
        ['py', ['-3']],
      ];

/** Is this command a working Python 3, rather than missing or a stub? */
function isRealPython(command, args) {
  const probe = spawnSync(command, [...args, '--version'], { encoding: 'utf-8' });
  if (probe.error || probe.status !== 0) return false;
  return /Python 3\./.test(`${probe.stdout ?? ''}${probe.stderr ?? ''}`);
}

function findPython() {
  for (const [command, args] of CANDIDATES) {
    if (isRealPython(command, args)) return { command, args };
  }
  return null;
}

/** Does a complete set of generated page data already exist? */
function pageDataLooksComplete() {
  // contents.json arrived after the rest, so data generated before it counts
  // as missing and is rebuilt.
  const CONTENTS = path.join(path.dirname(MANIFEST), 'contents.json');
  for (const file of [MANIFEST, FUNCTIONS_MANIFEST, VERSE_POOL, CONTENTS]) {
    if (!existsSync(file)) return false;
  }
  try {
    const { totalPages } = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
    if (!Number.isInteger(totalPages) || totalPages < 1) return false;
    // Spot-check the ends of the range rather than all ~3,200 files.
    const dir = path.dirname(MANIFEST);
    return existsSync(path.join(dir, '1.json')) && existsSync(path.join(dir, `${totalPages}.json`));
  } catch {
    return false;
  }
}

const ifMissing = process.argv.includes('--if-missing');

if (ifMissing && pageDataLooksComplete()) {
  console.log('[pages] Existing Bible page data looks complete — skipping generation.');
  process.exit(0);
}

const python = findPython();
if (!python) {
  console.error(
    [
      '',
      '[pages] No working Python 3 interpreter found.',
      '',
      '  Tried: ' + CANDIDATES.map(([c, a]) => [c, ...a].join(' ')).join(', '),
      '',
      '  The Bible page data is generated from bible_data/ by a stdlib-only',
      '  Python script. Install Python 3 and re-run, or (for a deploy that',
      '  cannot run Python) commit public/bible_pages/ and functions/src/',
      '  so this step can be skipped with --if-missing.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

console.log(`[pages] Generating Bible page data with "${[python.command, ...python.args].join(' ')}"…`);
const result = spawnSync(python.command, [...python.args, GENERATOR], {
  stdio: 'inherit',
  cwd: ROOT,
});

if (result.error) {
  console.error(`[pages] Failed to run the generator: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
