import * as THREE from 'three';

/**
 * Procedural textures drawn on 2D canvas.
 */

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
