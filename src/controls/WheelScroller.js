import { MathUtils } from 'three';
import { WHEEL, MOTION } from '../config.js';

/**
 * Wheel-driven virtual scroll with rubber-band edges — the ONLY input
 * that moves the wall (mouse movement and clicks are deliberately inert).
 *
 * The wheel never moves the page — it only nudges `target` (0..1).
 * `value` chases `target` through exponential damping every frame, and an
 * additional spring pulls any overscroll back inside the range, which is
 * what produces the sticky, weighty travel instead of a stepped jump.
 *
 * On touch devices a vertical swipe acts as the wheel equivalent
 * (touch events only — mouse drags stay inert).
 */
export class WheelScroller {
  constructor() {
    this.target = 0;
    this.value = 0;
    this.enabled = false; // input stays inert until the intro finishes

    window.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (!this.enabled) return;
        // deltaMode 1 = lines (Firefox); normalize to pixels
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        this.target += delta * WHEEL.SENSITIVITY;
      },
      { passive: false }
    );

    // touch: vertical swipe = wheel (natural direction, finger up -> climb)
    let lastY = null;
    window.addEventListener('touchstart', (e) => {
      lastY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (lastY === null || !this.enabled) return;
      const y = e.touches[0].clientY;
      this.target += (lastY - y) * WHEEL.SENSITIVITY * 2.4;
      lastY = y;
    }, { passive: true });
    window.addEventListener('touchend', () => { lastY = null; });
  }

  update(dt) {
    // rubber band: overscroll springs back into [0, 1]
    const clamped = MathUtils.clamp(this.target, 0, 1);
    this.target = MathUtils.damp(this.target, clamped, MOTION.RUBBER_BAND, dt);
    // damped chase = the smooth, viscous travel
    this.value = MathUtils.damp(this.value, this.target, MOTION.WHEEL_DAMP, dt);
  }
}
