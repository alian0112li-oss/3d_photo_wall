import * as THREE from 'three';
import { WALL, MOTION, FX, imageUrl } from '../config.js';
import { createFallbackTexture } from './textures.js';
import { createPhotoMaterial } from './photoMaterial.js';

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
 * Each card = a thin edge box (exactly the photo's size — no dark rim
 * around the image) + the SAME photo shader on both faces (the rear
 * plane is rotated 180°, not mirrored). The photo faces run a custom
 * material: velocity-driven sine stretch + RGB shift and vertex flex —
 * see photoMaterial.js.
 *
 * Pointer input never moves the wall; hovering a card slows the spin
 * (App) and gives it a gentle scale pop here.
 */
export class PhotoWall {
  constructor({ manager, maxAnisotropy = 1 } = {}) {
    this.group = new THREE.Group();
    this.cards = [];
    this.pickables = []; // photo faces, raycast for hover (speed + lens)
    this.hovered = null;
    this.hoverUV = new THREE.Vector2(0.5, 0.5);
    this._vel = 0; // signed travel velocity (-1..1), set by App

    const { TOTAL, COLS, ROWS, RADIUS, PHOTO_W: W, PHOTO_H: H, ROW_GAP, FRAME_BORDER: B, CARD_DEPTH: D } = WALL;

    // shared resources — segmented plane so the vertex flex can bend it
    const frameGeo = new THREE.BoxGeometry(W + B, H + B, D);
    const photoGeo = new THREE.PlaneGeometry(W, H, 16, 20);
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
      const photoMat = createPhotoMaterial();
      card.userData = {
        index: i,
        base,
        floatPhase: i * 0.53,
        mat: photoMat,
        entS: 1,     // entrance scale (0 while hidden, eased to 1)
        hoverAmt: 0, // damped hover amount -> gentle scale pop
      };

      const frame = new THREE.Mesh(frameGeo, frameMat);
      card.add(frame);

      // photo front — dark plate until the texture loads
      const photo = new THREE.Mesh(photoGeo, photoMat);
      photo.position.z = D / 2 + 0.01;
      photo.userData.card = card;
      card.add(photo);

      // rear face: the same photo, rotated (not mirrored)
      const back = new THREE.Mesh(photoGeo, photoMat);
      back.position.z = -(D / 2 + 0.01);
      back.rotation.y = Math.PI;
      back.userData.card = card;
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
    material.uniforms.uMap.value = tex;
    material.uniforms.uHasMap.value = 1;
  }

  /** uv = cursor position on the hovered face (drives the lens centre). */
  setHovered(card, uv) {
    this.hovered = card;
    if (uv) this.hoverUV.copy(uv);
  }

  /** Signed, normalized travel velocity from the wheel (-1..1). */
  setVelocity(v) {
    this._vel = v;
  }

  /** Hide every card (used before the intro's staggered entrance). */
  hideAll() {
    for (const card of this.cards) {
      card.visible = false;
      card.userData.entS = 0.0001;
      card.scale.setScalar(0.0001);
    }
  }

  /** Cue the one-by-one entrance: each card pops up at its own position. */
  playEntrance(t0) {
    this.entrance = { t0 };
  }

  /** Per-frame: float, entrance, hover lens/scale, shader uniforms. */
  update(dt, t, reduceMotion = false) {
    const entrance = this.entrance;
    let allDone = true;
    const hoverK = Math.min(1, dt * FX.HOVER_DAMP);
    const vel = reduceMotion ? 0 : this._vel;

    this.cards.forEach((card, i) => {
      const ud = card.userData;

      // idle float
      if (!reduceMotion) {
        card.position.y = ud.base.y + Math.sin(t * 0.9 + ud.floatPhase * 6) * MOTION.FLOAT_AMP;
      }

      // staggered entrance
      if (entrance) {
        const local = t - entrance.t0 - i * ENTRANCE_STAGGER;
        if (local <= 0) {
          allDone = false;
        } else {
          card.visible = true;
          const k = Math.min(1, local / ENTRANCE_DURATION);
          if (k < 1) allDone = false;
          ud.entS = easeOutBack(k);
        }
      }

      // hover: a simple, gentle scale pop (damped in and out)
      const isHover = card === this.hovered;
      ud.hoverAmt += ((isHover ? 1 : 0) - ud.hoverAmt) * hoverK;

      // combined scale: entrance pop x hover pop
      const hoverScale = 1 + ud.hoverAmt * (FX.HOVER_SCALE - 1);
      card.scale.setScalar(Math.max(0.0001, ud.entS * hoverScale));

      // drive the shader (velocity distortion only)
      const u = ud.mat.uniforms;
      u.uVel.value = vel;
      u.uTime.value = t;
    });

    if (entrance && allDone) {
      this.entrance = null;
      for (const card of this.cards) card.userData.entS = 1;
    }
  }
}
