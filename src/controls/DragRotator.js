import { MathUtils } from 'three';
import { MOTION } from '../config.js';

/**
 * Sticky drag-to-rotate.
 *
 * The pointer writes `target`; the rendered rotation `value` chases it
 * through exponential damping, so the wall lags a touch behind the hand
 * (the "sticky" feel) and glides on with inertia after release. Vertical
 * drag travel is forwarded via `onVertical` (feeds the wheel scroller so
 * touch users can descend too).
 */
export class DragRotator {
  constructor(dom, { sensitivity = 0.0045, enabled = () => true, onVertical } = {}) {
    this.target = 0;
    this.value = 0;
    this.velocity = 0;
    this.dragging = false;
    this.enabled = enabled;

    dom.style.touchAction = 'none'; // the page never scrolls — all gestures are ours
    dom.style.cursor = 'grab';

    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled() || e.button !== 0) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.velocity = 0;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = (e.clientX - this.lastX) * sensitivity;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.target += dx;
      // clamp fling strength so a fast flick can't send the wall drifting
      this.velocity = Math.max(-0.035, Math.min(0.035, dx));
      onVertical?.(dy);
    });

    const stop = () => {
      this.dragging = false;
      dom.style.cursor = 'grab';
    };
    dom.addEventListener('pointerup', stop);
    dom.addEventListener('pointercancel', stop);
  }

  /** Per-frame: inertia, idle spin, damped chase. */
  update(dt, { autoSpeed = 0 } = {}) {
    if (!this.dragging) {
      this.target += this.velocity;                 // inertia glide
      this.velocity *= Math.pow(0.00005, dt);       // brisk decay — settles fast, no drift
      this.target += autoSpeed * dt;                // idle auto-rotation
    }
    this.value = MathUtils.damp(this.value, this.target, MOTION.DRAG_DAMP, dt);
  }
}
