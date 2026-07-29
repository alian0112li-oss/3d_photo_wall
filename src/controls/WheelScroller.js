import { MathUtils } from 'three';
import { WHEEL, MOTION } from '../config.js';

/**
 * Wheel-driven virtual scroll with rubber-band edges.
 *
 * The wheel never moves the page — it only nudges `target` (0..1).
 * `value` chases `target` through exponential damping every frame, and an
 * additional spring pulls any overscroll back inside the range, which is
 * what produces the sticky, weighty descent instead of a stepped jump.
 */
export class WheelScroller {
  constructor({ onInput } = {}) {
    this.target = 0;
    this.value = 0;

    window.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        // deltaMode 1 = lines (Firefox); normalize to pixels
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        this.target += delta * WHEEL.SENSITIVITY;
        onInput?.();
      },
      { passive: false }
    );
  }

  /** Extra input source (e.g. vertical touch-drag). */
  nudge(amount) {
    this.target += amount;
  }

  update(dt) {
    // rubber band: overscroll springs back into [0, 1]
    const clamped = MathUtils.clamp(this.target, 0, 1);
    this.target = MathUtils.damp(this.target, clamped, MOTION.RUBBER_BAND, dt);
    // damped chase = the smooth, viscous travel
    this.value = MathUtils.damp(this.value, this.target, MOTION.WHEEL_DAMP, dt);
  }
}
