/**
 * Central configuration for the 3D photo wall.
 * Tune layout / motion here — no need to touch the modules.
 */

/** Photo wall layout (cylindrical array of 3D cards). */
export const WALL = {
  TOTAL: 36,        // number of photos (matches scripts/generate_images.py)
  COLS: 12,         // cards per ring
  ROWS: 3,          // stacked rings
  RADIUS: 12,       // cylinder radius (larger -> wider horizontal gaps)
  PHOTO_W: 2.4,     // photo width  (world units)
  PHOTO_H: 3.0,     // photo height (matches 600x750 -> 4:5)
  ROW_GAP: 6.0,     // vertical distance between ring centres
  FRAME_BORDER: 0.24, // extra frame size around the photo
  CARD_DEPTH: 0.14,   // card thickness -> real 3D body, visible from behind
};

// camera sits just 7.5 units from the front cards (19.5 - RADIUS 12),
// so the wall fills the view while the big cylinder wraps around it
export const CAMERA = {
  FOV: 52,
  POSITION: [0, 1.4, 19.5],
  LOOK_AT: [0, 0, 0],
};

/**
 * Wheel-driven virtual scroll (the page itself never scrolls).
 * The wheel ONLY moves the wall vertically — it never touches the spin,
 * which stays at the constant AUTO_ROTATE_SPEED. Natural direction:
 * wheel down -> the wall climbs upward past the view. TRAVEL = 2 × ROW_GAP
 * so the journey reads top ring centred -> middle -> bottom ring centred.
 */
export const WHEEL = {
  SENSITIVITY: 0.00055, // wheel delta -> progress (0..1)
  TRAVEL: 12,           // total vertical travel (= 2 × WALL.ROW_GAP)
};

/**
 * Motion feel — the heart of the "sticky / damped" quality.
 *
 * The wheel only writes a *target*; the frame loop chases it with
 * frame-rate independent exponential damping (THREE.MathUtils.damp).
 * Higher lambda = tighter follow, lower = heavier.
 */
export const MOTION = {
  WHEEL_DAMP: 5.5,    // virtual scroll smoothing — tight but still viscous
  RUBBER_BAND: 7,     // spring pulling overscroll back into range
  FLOAT_AMP: 0.025,   // idle per-card floating amplitude (subtle, grounded)
  BOB_AMP: 0.06,      // whole-wall breathing amplitude
};

/**
 * Spin speed model (rad/s) — three tiers blended with damping, so there
 * are no hard thresholds. Current values (this revision):
 *
 *   BASE   0.14  normal display spin
 *   HOVER  0.05  pointer resting on a photo -> slows for viewing
 *   SCROLL 0.45  while the wheel is scrolling -> a clearly visible
 *                spin-up (~3x BASE); the sign follows the scroll
 *                direction (wheel up reverses the spin)
 *
 * Priority: SCROLL > HOVER > BASE. DAMP controls how quickly the speed
 * eases between tiers (time constant ≈ 1/DAMP s); SCROLL_HOLD is how
 * long after the last wheel input the "scrolling" tier persists.
 */
export const SPIN = {
  BASE: 0.14,
  HOVER: 0.05,
  SCROLL: 0.45,
  DAMP: 6,          // tier blending — kicks in fast, still smooth
  SCROLL_HOLD: 450, // ms
};

/** Scene atmosphere. */
export const SCENE = {
  BACKGROUND: 0x0a0b14,
  FOG_DENSITY: 0.017, // light enough that far-side photos stay readable
  FLOOR_GAP: 0.7,     // gap between lowest card edge and the mirror floor
};

/** Resolve a photo URL (works in dev and on GitHub Pages). */
export const imageUrl = (i) =>
  `${import.meta.env.BASE_URL}images/photo_${String(i + 1).padStart(2, '0')}.png`;
