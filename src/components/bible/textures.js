import * as THREE from 'three';

/**
 * Procedural textures for the 3D Bible.
 *
 * Everything is drawn to a canvas at runtime rather than loaded as an image
 * file: it keeps the app dependency-free and offline-safe, and the page
 * striations need to be fine and irregular in a way that compresses badly as a
 * bitmap anyway.
 *
 * Colours follow the Wayfinding redesign: a navy cloth binding, amber gilt and
 * cream page edges. Only colour lives here; the book's shape is in
 * ClosedBible3D and does not depend on any of it.
 */

const NAVY = '#1f3f8f';
const NAVY_DEEP = '#173375';
const AMBER = '#e3a52b';
const TITLE_FONT = '"Overpass", "Helvetica Neue", Arial, sans-serif';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function finish(canvas, { repeat } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

/** Fine woven grain over a flat ground: book cloth rather than leather. */
function paintCloth(ctx, width, height, ground) {
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);

  // Warp and weft: faint alternating threads in both directions.
  for (let y = 0; y < height; y += 3) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.025 + Math.random() * 0.025})`;
    ctx.fillRect(0, y, width, 1);
  }
  for (let x = 0; x < width; x += 3) {
    ctx.fillStyle = `rgba(0, 0, 30, ${0.04 + Math.random() * 0.04})`;
    ctx.fillRect(x, 0, 1, height);
  }
  // A little uneven wear.
  for (let i = 0; i < 2500; i += 1) {
    ctx.fillStyle = `rgba(10, 20, 60, ${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }
}

/**
 * The fore edge — the face the player actually aims at.
 *
 * Drawn as several hundred individual leaves so that sweeping the cursor across
 * it reads as moving through a physical stack of paper rather than sliding along
 * a flat panel.
 */
export function createForeEdgeTexture(leaves = 900) {
  const canvas = makeCanvas(2048, 256);
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, '#e6dcc2');
  base.addColorStop(0.5, '#efe6cf');
  base.addColorStop(1, '#e2d7ba');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const step = canvas.width / leaves;
  for (let i = 0; i < leaves; i += 1) {
    const x = i * step;
    // Irregular darkness per leaf gives the stack its grain; a few much darker
    // lines read as the gaps where sections of the binding meet.
    const shade = 0.08 + Math.random() * 0.14 + (i % 37 === 0 ? 0.2 : 0);
    ctx.fillStyle = `rgba(150, 128, 88, ${shade})`;
    ctx.fillRect(x, 0, Math.max(step * 0.45, 0.6), canvas.height);
  }

  // Darken toward the covers, where a closed book compresses.
  const shadow = ctx.createLinearGradient(0, 0, canvas.width, 0);
  shadow.addColorStop(0, 'rgba(60, 50, 30, 0.32)');
  shadow.addColorStop(0.06, 'rgba(60, 50, 30, 0)');
  shadow.addColorStop(0.94, 'rgba(60, 50, 30, 0)');
  shadow.addColorStop(1, 'rgba(60, 50, 30, 0.32)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return finish(canvas);
}

/** Gilt top and bottom edges, in the redesign's amber. */
export function createGiltEdgeTexture() {
  const canvas = makeCanvas(1024, 128);
  const ctx = canvas.getContext('2d');

  const gold = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gold.addColorStop(0, '#9a6c12');
  gold.addColorStop(0.35, AMBER);
  gold.addColorStop(0.6, '#f4d28a');
  gold.addColorStop(1, '#a8770f');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 600; i += 1) {
    const x = Math.random() * canvas.width;
    ctx.fillStyle = `rgba(255, 244, 205, ${Math.random() * 0.35})`;
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  return finish(canvas);
}

/** Navy book cloth, for the back board. */
export function createBindingTexture() {
  const canvas = makeCanvas(512, 512);
  paintCloth(canvas.getContext('2d'), canvas.width, canvas.height, NAVY);
  return finish(canvas, { repeat: [2, 2] });
}

/** The spine: the same cloth, a shade deeper, as in the design. */
export function createSpineTexture() {
  const canvas = makeCanvas(512, 512);
  paintCloth(canvas.getContext('2d'), canvas.width, canvas.height, NAVY_DEEP);
  return finish(canvas, { repeat: [2, 2] });
}

/** Front cover: navy cloth with a double gilt rule and a blocked title. */
export function createCoverTexture() {
  const canvas = makeCanvas(768, 1024);
  const ctx = canvas.getContext('2d');

  function draw() {
    paintCloth(ctx, canvas.width, canvas.height, NAVY);

    // Gilt border rules: a heavy outer line and a fine inner one.
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 9;
    ctx.strokeRect(70, 78, canvas.width - 140, canvas.height - 156);
    ctx.lineWidth = 3;
    ctx.strokeRect(96, 104, canvas.width - 192, canvas.height - 208);

    ctx.textAlign = 'center';
    ctx.fillStyle = AMBER;
    ctx.font = `800 82px ${TITLE_FONT}`;
    ctx.fillText('THE HOLY', canvas.width / 2, 430);
    ctx.font = `800 128px ${TITLE_FONT}`;
    ctx.fillText('BIBLE', canvas.width / 2, 556);
    ctx.font = `600 32px ${TITLE_FONT}`;
    ctx.fillText('KING JAMES VERSION', canvas.width / 2, 640);
  }

  draw();
  const texture = finish(canvas);

  // The title is set in Overpass, which may still be loading when the book is
  // first built; repaint once it arrives rather than keep a fallback face.
  if (typeof document !== 'undefined' && document.fonts?.load) {
    Promise.all([
      document.fonts.load(`800 82px ${TITLE_FONT}`),
      document.fonts.load(`600 32px ${TITLE_FONT}`),
    ])
      .then(() => {
        draw();
        texture.needsUpdate = true;
      })
      .catch(() => {});
  }

  return texture;
}
