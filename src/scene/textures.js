import * as THREE from 'three';

/**
 * Procedural textures drawn on 2D canvas — the branded card back and a
 * fallback front used when a photo fails to load.
 */

/** Shared branded back cover for every card (so the wall looks finished from behind). */
export function createBackCoverTexture() {
  const w = 512;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // base
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#151830');
  grad.addColorStop(1, '#0b0d1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // subtle diagonal hatch
  ctx.strokeStyle = 'rgba(124, 140, 255, 0.06)';
  ctx.lineWidth = 2;
  for (let x = -h; x < w; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }

  // border
  ctx.strokeStyle = 'rgba(124, 140, 255, 0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  // centre brand mark
  ctx.save();
  ctx.translate(w / 2, h / 2 - 30);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(179, 164, 255, 0.85)';
  ctx.lineWidth = 6;
  ctx.strokeRect(-38, -38, 76, 76);
  ctx.strokeStyle = 'rgba(124, 140, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-58, -58, 116, 116);
  ctx.restore();

  // wordmark
  ctx.fillStyle = 'rgba(238, 241, 255, 0.9)';
  ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.fillText('3D WALL', w / 2, h / 2 + 96);
  ctx.fillStyle = 'rgba(154, 160, 195, 0.6)';
  ctx.font = '500 17px "Segoe UI", system-ui, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('PHOTO COLLECTION', w / 2, h / 2 + 134);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Per-photo fallback shown if the real image fails to load. */
export function createFallbackTexture(index) {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 375;
  const ctx = c.getContext('2d');
  const hue = (30 + index * 222) % 360;
  const grad = ctx.createLinearGradient(0, 0, 300, 375);
  grad.addColorStop(0, `hsl(${hue}, 60%, 58%)`);
  grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 70%, 32%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 300, 375);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 120px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1).padStart(2, '0'), 150, 180);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
