import * as THREE from 'three';
import gsap from 'gsap';
import { CAMERA } from '../config.js';

/**
 * Pointer picking: hover highlight + click-to-focus camera flight.
 * A click (distinguished from a drag by travel distance) flies the camera
 * in front of the card; Esc, clicking empty space, or scrolling releases it.
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
      const card = this._pick();
      if (card) this.focusOn(card);
      else this.release();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.release();
    });
  }

  _pick() {
    this.raycaster.setFromCamera(this.ndc, this.app.camera);
    const hits = this.raycaster.intersectObjects(this.app.wall.pickables, false);
    return hits.length ? hits[0].object.userData.card : null;
  }

  /** Per-frame hover raycast (skipped while focused / mid-scroll). */
  updateHover() {
    const card = this._pick();
    if (card !== this.app.wall.hovered) {
      this.app.wall.setHovered(card);
      this.app.renderer.domElement.style.cursor = card ? 'pointer' : 'grab';
    }
  }

  focusOn(card) {
    const app = this.app;
    app.state.focused = card;
    app.wall.setFocused(card);
    app.wall.setHovered(null);

    const worldPos = new THREE.Vector3();
    card.getWorldPosition(worldPos);
    const quat = new THREE.Quaternion();
    card.getWorldQuaternion(quat);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const camTo = worldPos.clone().addScaledVector(normal, CAMERA.FOCUS_DISTANCE);
    camTo.y += 0.15;

    gsap.to(app.camPos, { x: camTo.x, y: camTo.y, z: camTo.z, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to(app.camLook, { x: worldPos.x, y: worldPos.y, z: worldPos.z, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto' });
  }

  release() {
    const app = this.app;
    if (!app.state.focused) return;
    app.state.focused = null;
    app.wall.setFocused(null);
    const [px, py, pz] = CAMERA.POSITION;
    const [lx, ly, lz] = CAMERA.LOOK_AT;
    gsap.to(app.camPos, { x: px, y: py, z: pz, duration: 1.0, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to(app.camLook, { x: lx, y: ly, z: lz, duration: 1.0, ease: 'power3.inOut', overwrite: 'auto' });
  }
}
