import * as THREE from 'three';
import { WALL, MOTION, imageUrl } from '../config.js';
import { createFallbackTexture } from './textures.js';

/**
 * Cylindrical wall of true-3D photo cards.
 *
 * Each card = thick box frame (metallic) + the SAME photo on both faces
 * (the rear plane is rotated 180°, not mirrored), so wherever a card
 * travels you always see the photo right-side-up — there is no "back".
 *
 * The wall is display-only: it takes no pointer input. The only per-card
 * animation is a gentle idle float on an individual phase.
 */
export class PhotoWall {
  constructor({ manager, maxAnisotropy = 1 } = {}) {
    this.group = new THREE.Group();
    this.cards = [];

    const { TOTAL, COLS, ROWS, RADIUS, PHOTO_W: W, PHOTO_H: H, ROW_GAP, FRAME_BORDER: B, CARD_DEPTH: D } = WALL;

    // shared resources
    const frameGeo = new THREE.BoxGeometry(W + B, H + B, D);
    const photoGeo = new THREE.PlaneGeometry(W, H);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x11131f, metalness: 0.65, roughness: 0.32 });

    const loader = new THREE.TextureLoader(manager);
    const step = (Math.PI * 2) / COLS;

    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      // stagger alternate rings by half a step for a woven, less grid-like look
      const theta = (col + (row % 2) * 0.5) * step;
      const y = ((ROWS - 1) / 2 - row) * ROW_GAP;

      const card = new THREE.Group();
      const base = new THREE.Vector3(Math.sin(theta) * RADIUS, y, Math.cos(theta) * RADIUS);
      card.position.copy(base);
      card.rotation.y = theta; // face outward
      card.userData = { index: i, base, floatPhase: i * 0.53 };

      const frame = new THREE.Mesh(frameGeo, frameMat);
      card.add(frame);

      // photo front — starts as a dark plate, swaps to the texture when loaded
      const photoMat = new THREE.MeshBasicMaterial({ color: 0x1a1c2c, toneMapped: false });
      const photo = new THREE.Mesh(photoGeo, photoMat);
      photo.position.z = D / 2 + 0.01;
      card.add(photo);

      // rear face: the same photo, rotated (not mirrored) — the card shows
      // the photo right-side-up from behind as well
      const back = new THREE.Mesh(photoGeo, photoMat);
      back.position.z = -(D / 2 + 0.01);
      back.rotation.y = Math.PI;
      card.add(back);

      loader.load(
        imageUrl(i),
        (tex) => this._applyTexture(photoMat, tex, maxAnisotropy),
        undefined,
        () => this._applyTexture(photoMat, createFallbackTexture(i), maxAnisotropy)
      );

      this.group.add(card);
      this.cards.push(card);
    }
  }

  _applyTexture(material, tex, maxAnisotropy) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    material.map = tex;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  }

  /** Per-frame: gentle idle float, each card on its own phase. */
  update(t, reduceMotion = false) {
    if (reduceMotion) return;
    for (const card of this.cards) {
      const ud = card.userData;
      card.position.y = ud.base.y + Math.sin(t * 0.9 + ud.floatPhase * 6) * MOTION.FLOAT_AMP;
    }
  }
}
