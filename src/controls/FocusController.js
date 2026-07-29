import * as THREE from 'three';
import { CAMERA } from '../config.js';

/**
 * Pointer picking: magnetic hover + click-to-focus.
 *
 * No tween library — focusing simply retargets the camera rig
 * (`app.camPos` / `app.camLook`); the damped chase in App.update turns
 * that into a smooth, decelerating flight. Esc, clicking empty space or
 * wheeling releases the focus.
 */
export class FocusController {
  constructor(app) {
    this.app = app;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2(2, 2); // off-screen until first pointermove
    this._down = null;

    const dom = app.renderer.domElement;

    window.addEventListener('pointermove', (e) => {
      this.ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
      app.parallax.set(this.ndc.x, this.ndc.y);
    });

    dom.addEventListener('pointerdown', (e) => {
      this._down = [e.clientX, e.clientY];
    });

    dom.addEventListener('pointerup', (e) => {
      if (!this._down) return;
      const travelled = Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]);
      this._down = null;
      if (travelled > 6) return; // that was a drag
      const hit = this._pick();
      if (hit) this.focusOn(hit.object.userData.card);
      else this.release();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.release();
    });
  }

  _pick() {
    this.raycaster.setFromCamera(this.ndc, this.app.camera);
    const hits = this.raycaster.intersectObjects(this.app.wall.pickables, false);
    return hits.length ? hits[0] : null;
  }

  /** Per-frame magnetic hover: card + the UV point under the cursor. */
  updateHover() {
    const hit = this._pick();
    const card = hit ? hit.object.userData.card : null;
    this.app.wall.setHovered(card, hit ? hit.uv : null);
    const cursor = card ? 'pointer' : 'grab';
    if (this.app.renderer.domElement.style.cursor !== cursor && !this.app.drag.dragging) {
      this.app.renderer.domElement.style.cursor = cursor;
    }
  }

  focusOn(card) {
    this.app.state.focused = card;
    this.app.wall.setFocused(card);
    this.app.wall.setHovered(null, null);
    // camera targets are recomputed from the card every frame in App.update
  }

  release() {
    const app = this.app;
    if (!app.state.focused) return;
    app.state.focused = null;
    app.wall.setFocused(null);
    app.camPos.fromArray(CAMERA.POSITION);
    app.camLook.fromArray(CAMERA.LOOK_AT);
  }
}
