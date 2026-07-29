import * as THREE from 'three';
import { WALL, MOTION, imageUrl } from '../config.js';
import { createBackCoverTexture, createFallbackTexture } from './textures.js';

const { damp } = THREE.MathUtils;

/**
 * Cylindrical wall of true-3D photo cards.
 *
 * Each card = thick box frame (metallic) + photo plane on the front
 * + shared branded cover on the back, so the wall reads as a real object
 * from every angle.
 *
 * Motion: every card owns damped state (scale / lift / magnetic tilt /
 * idle float). Hover only sets *targets*; `update()` chases them each
 * frame with exponential damping, giving the sticky magnetic feel.
 */
export class PhotoWall {
  constructor({ manager, maxAnisotropy = 1 } = {}) {
    this.group = new THREE.Group();
    this.cards = [];
    this.pickables = []; // photo front meshes used for raycasting
    this.hovered = null;
    this.hoverUV = new THREE.Vector2(0.5, 0.5);
    this.focused = null;

    const { TOTAL, COLS, ROWS, RADIUS, PHOTO_W: W, PHOTO_H: H, ROW_GAP, FRAME_BORDER: B, CARD_DEPTH: D } = WALL;

    // shared resources
    const frameGeo = new THREE.BoxGeometry(W + B, H + B, D);
    const photoGeo = new THREE.PlaneGeometry(W, H);
    const backGeo = new THREE.PlaneGeometry(W + B * 0.55, H + B * 0.55);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x11131f, metalness: 0.65, roughness: 0.32 });

    const backTex = createBackCoverTexture();
    backTex.anisotropy = maxAnisotropy;
    const backMat = new THREE.MeshBasicMaterial({ map: backTex, toneMapped: false });

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
      const dir = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)); // outward normal
      card.position.copy(base);
      card.rotation.y = theta; // face outward
      card.userData = {
        index: i,
        theta,
        base,
        dir,
        // damped motion state
        lift: 0,
        tiltX: 0,
        tiltY: 0,
        floatPhase: i * 0.53,
      };

      const frame = new THREE.Mesh(frameGeo, frameMat);
      card.add(frame);

      // photo front — starts as a dark plate, swaps to the texture when loaded
      const photoMat = new THREE.MeshBasicMaterial({ color: 0x1a1c2c, toneMapped: false });
      const photo = new THREE.Mesh(photoGeo, photoMat);
      photo.position.z = D / 2 + 0.01;
      photo.userData.card = card;
      card.add(photo);

      // branded back cover
      const back = new THREE.Mesh(backGeo, backMat);
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
      this.pickables.push(photo);
    }
  }

  _applyTexture(material, tex, maxAnisotropy) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    material.map = tex;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  }

  /** uv = where the cursor sits on the photo (drives the magnetic tilt). */
  setHovered(card, uv) {
    this.hovered = card;
    if (uv) this.hoverUV.copy(uv);
  }

  setFocused(card) {
    this.focused = card;
  }

  /**
   * Per-frame damped chase of every card's targets:
   * scale (hover pop), lift (toward the viewer), magnetic tilt
   * (card leans toward the cursor), and idle float.
   */
  update(dt, t) {
    const k = MOTION.CARD_DAMP;
    for (const card of this.cards) {
      const ud = card.userData;
      const hovered = card === this.hovered;
      const focused = card === this.focused;

      // targets
      const scaleT = focused || hovered ? 1.12 : 1;
      const liftT = focused ? MOTION.FOCUS_LIFT : hovered ? MOTION.CARD_LIFT : 0;
      // magnetic tilt: the card leans toward the cursor position on its face
      const tiltXT = hovered ? (this.hoverUV.y - 0.5) * MOTION.CARD_TILT : 0;
      const tiltYT = hovered ? -(this.hoverUV.x - 0.5) * MOTION.CARD_TILT : 0;

      // damped chase
      const s = damp(card.scale.x, scaleT, k, dt);
      card.scale.setScalar(s);
      ud.lift = damp(ud.lift, liftT, k, dt);
      ud.tiltX = damp(ud.tiltX, tiltXT, k, dt);
      ud.tiltY = damp(ud.tiltY, tiltYT, k, dt);

      // idle float — each card breathes on its own phase
      const floatY = Math.sin(t * 0.9 + ud.floatPhase * 6) * MOTION.FLOAT_AMP;

      card.position.set(
        ud.base.x + ud.dir.x * ud.lift,
        ud.base.y + floatY,
        ud.base.z + ud.dir.z * ud.lift
      );
      card.rotation.set(ud.tiltX, ud.theta + ud.tiltY, 0);
    }
  }
}
