import * as THREE from 'three';
import { WALL, imageUrl } from '../config.js';
import { createBackCoverTexture, createFallbackTexture } from './textures.js';

/**
 * Cylindrical wall of true-3D photo cards.
 *
 * Each card = thick box frame (metallic) + photo plane on the front
 * + shared branded cover on the back, so the wall reads as a real object
 * from every angle — issue #1 (hollow backs) solved here.
 */
export class PhotoWall {
  constructor({ manager, maxAnisotropy = 1 } = {}) {
    this.group = new THREE.Group();
    this.cards = [];
    this.pickables = []; // photo front meshes used for raycasting
    this.hovered = null;
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
      card.position.set(Math.sin(theta) * RADIUS, y, Math.cos(theta) * RADIUS);
      card.rotation.y = theta; // face outward
      card.userData = { index: i, theta, scaleTarget: 1 };

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

  setHovered(card) { this.hovered = card; }
  setFocused(card) { this.focused = card; }

  /** Per-frame: ease card scales toward hover/focus targets. */
  update(dt) {
    const k = Math.min(1, dt * 10);
    for (const card of this.cards) {
      const want = card === this.focused || card === this.hovered ? 1.12 : 1;
      const s = card.scale.x + (want - card.scale.x) * k;
      card.scale.setScalar(s);
    }
  }
}
