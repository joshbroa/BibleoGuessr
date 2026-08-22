import * as THREE from 'three';

/**
 * Procedural textures for the 3D Bible.
 *
 * Everything is drawn to a canvas at runtime rather than loaded as an image
 * file: it keeps the app dependency-free and offline-safe, and the page
 * striations need to be fine and irregular in a way that compresses badly as a
 * bitmap anyway.
 */

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
  base.addColorStop(0, '#e8dcc0');
  base.addColorStop(0.5, '#f3ead6');
  base.addColorStop(1, '#dccfae');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const step = canvas.width / leaves;
  for (let i = 0; i < leaves; i += 1) {
    const x = i * step;
    // Irregular darkness per leaf gives the stack its grain; a few much darker
    // lines read as the gaps where sections of the binding meet.
    const shade = 0.06 + Math.random() * 0.14 + (i % 37 === 0 ? 0.22 : 0);
    ctx.fillStyle = `rgba(90, 68, 40, ${shade})`;
    ctx.fillRect(x, 0, Math.max(step * 0.45, 0.6), canvas.height);
  }

  // Darken toward the covers, where a closed book compresses.
  const shadow = ctx.createLinearGradient(0, 0, canvas.width, 0);
  shadow.addColorStop(0, 'rgba(60, 40, 20, 0.45)');
  shadow.addColorStop(0.06, 'rgba(60, 40, 20, 0)');
  shadow.addColorStop(0.94, 'rgba(60, 40, 20, 0)');
  shadow.addColorStop(1, 'rgba(60, 40, 20, 0.45)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return finish(canvas);
}

/** Gilt top and bottom edges. */
export function createGiltEdgeTexture() {
  const canvas = makeCanvas(1024, 128);
  const ctx = canvas.getContext('2d');

  const gold = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gold.addColorStop(0, '#8d6a1f');
  gold.addColorStop(0.35, '#e3c366');
  gold.addColorStop(0.6, '#f6e3a8');
  gold.addColorStop(1, '#9c7826');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 600; i += 1) {
    const x = Math.random() * canvas.width;
    ctx.fillStyle = `rgba(255, 245, 210, ${Math.random() * 0.35})`;
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  return finish(canvas);
}

/** Grained leather, used for the covers and the spine. */
export function createLeatherTexture() {
  const canvas = makeCanvas(512, 512);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a2c1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 9000; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 2.4;
    ctx.fillStyle =
      Math.random() > 0.5
        ? `rgba(96, 60, 34, ${Math.random() * 0.5})`
        : `rgba(30, 16, 8, ${Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return finish(canvas, { repeat: [2, 2] });
}

/** Front cover: leather with a gilt rule and blocked title. */
export function createCoverTexture() {
  const canvas = makeCanvas(768, 1024);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#46291700';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#4a2c1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 12000; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle =
      Math.random() > 0.5
        ? `rgba(102, 64, 36, ${Math.random() * 0.45})`
        : `rgba(28, 15, 7, ${Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gilt border rule.
  ctx.strokeStyle = '#c79a3c';
  ctx.lineWidth = 5;
  ctx.strokeRect(52, 60, canvas.width - 104, canvas.height - 120);
  ctx.strokeStyle = 'rgba(199, 154, 60, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 78, canvas.width - 140, canvas.height - 156);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9b45b';
  ctx.font = 'bold 74px Georgia, "Times New Roman", serif';
  ctx.fillText('THE HOLY', canvas.width / 2, 420);
  ctx.font = 'bold 104px Georgia, "Times New Roman", serif';
  ctx.fillText('BIBLE', canvas.width / 2, 530);

  ctx.font = '34px Georgia, serif';
  ctx.fillStyle = 'rgba(217, 180, 91, 0.75)';
  ctx.fillText('KING JAMES VERSION', canvas.width / 2, 640);

  return finish(canvas);
}
