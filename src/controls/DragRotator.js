/**
 * Horizontal drag-to-rotate with inertia.
 *
 * Deliberately does NOT hijack the mouse wheel (unlike OrbitControls) —
 * the wheel is reserved for page scrolling, which drives the intro
 * animation. `touch-action: pan-y` keeps vertical swipes scrolling the
 * page on mobile while horizontal swipes rotate the wall.
 */
export class DragRotator {
  constructor(dom, { sensitivity = 0.0045, enabled = () => true } = {}) {
    this.offset = 0;      // accumulated rotation (radians)
    this.velocity = 0;    // rad per frame while flinging
    this.dragging = false;
    this.enabled = enabled;

    dom.style.touchAction = 'pan-y';
    dom.style.cursor = 'grab';

    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled() || e.button !== 0) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.velocity = 0;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const delta = (e.clientX - this.lastX) * sensitivity;
      this.lastX = e.clientX;
      this.offset += delta;
      this.velocity = delta;
    });

    const stop = () => {
      this.dragging = false;
      dom.style.cursor = 'grab';
    };
    dom.addEventListener('pointerup', stop);
    dom.addEventListener('pointercancel', stop);
  }

  /** Per-frame: apply inertia and optional idle auto-rotation. */
  update(dt, { autoSpeed = 0 } = {}) {
    if (this.dragging) return;
    this.offset += this.velocity;
    this.velocity *= Math.pow(0.0025, dt); // frame-rate independent decay
    this.offset += autoSpeed * dt;
  }
}
