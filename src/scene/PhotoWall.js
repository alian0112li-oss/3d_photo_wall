import * as THREE from 'three';
import { WALL, MOTION, imageUrl } from '../config.js';
import { createFallbackTexture } from './textures.js';

/** easeOutBack — a small overshoot so each card lands with a pop. */
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const ENTRANCE_STAGGER = 0.055; // s between cards
const ENTRANCE_DURATION = 0.4;  // s per card pop

/**
 * Cylindrical wall of true-3D photo cards.
 *
 * Each card = thick box frame (metallic) + the SAME photo on both faces
 * (the rear plane is rotated 180°, not mirrored), so wherever a card
 * travels you always see the photo right-side-up — there is no "back".
 *
 * The wall never moves in response to the pointer; `pickables` exists
 * only so the app can detect "pointer over a photo" and slow the spin.
 * The only per-card animation is a gentle idle float on an individual phase.
 */
export class PhotoWall {
  constructor({ manager, maxAnisotropy = 1 } = {}) {
    this.group = new THREE.Group();
    this.cards = [];
    this.pickables = []; // photo faces, raycast solely for hover speed control

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
      this.pickables.push(photo, back);
    }
  }

  _applyTexture(material, tex, maxAnisotropy) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    material.map = tex;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  }

  /** Hide every card (used before the intro's staggered entrance). */
  hideAll() {
    for (const card of this.cards) {
      card.visible = false;
      card.scale.setScalar(0.0001);
    }
  }

  /** Cue the one-by-one entrance: each card pops up at its own position. */
  playEntrance(t0) {
    this.entrance = { t0 };
  }

  /** Per-frame: gentle idle float + (if cued) the staggered entrance. */
  update(t, reduceMotion = false) {
    if (!reduceMotion) {
      for (const card of this.cards) {
        const ud = card.userData;
        card.position.y = ud.base.y + Math.sin(t * 0.9 + ud.floatPhase * 6) * MOTION.FLOAT_AMP;
      }
    }

    if (this.entrance) {
      const { t0 } = this.entrance;
      let allDone = true;
      this.cards.forEach((card, i) => {
        const local = t - t0 - i * ENTRANCE_STAGGER;
        if (local <= 0) {
          allDone = false;
          return; // not this card's turn yet
        }
        card.visible = true;
        const k = Math.min(1, local / ENTRANCE_DURATION);
        if (k < 1) allDone = false;
        card.scale.setScalar(Math.max(0.0001, easeOutBack(k)));
      });
      if (allDone) {
        this.entrance = null;
        for (const card of this.cards) card.scale.setScalar(1);
      }
    }
  }
}
