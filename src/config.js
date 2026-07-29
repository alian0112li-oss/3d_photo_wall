/**
 * Central configuration for the 3D photo wall.
 * Tune layout / motion here — no need to touch the modules.
 */

/** Photo wall layout (cylindrical array of 3D cards). */
export const WALL = {
  TOTAL: 30,        // number of photos (matches scripts/generate_images.py)
  COLS: 10,         // cards per ring
  ROWS: 3,          // stacked rings
  RADIUS: 8.2,      // cylinder radius
  PHOTO_W: 2.4,     // photo width  (world units)
  PHOTO_H: 3.0,     // photo height (matches 600x750 -> 4:5)
  ROW_GAP: 3.7,     // vertical distance between ring centres
  FRAME_BORDER: 0.24, // extra frame size around the photo
  CARD_DEPTH: 0.14,   // card thickness -> real 3D body, visible from behind
};

/** Camera rig. */
export const CAMERA = {
  FOV: 52,
  POSITION: [0, 1.4, 20],
  LOOK_AT: [0, 0, 0],
  FOCUS_DISTANCE: 4.8,  // camera distance from a focused card
  PARALLAX: [1.6, 0.9], // pointer parallax amplitude (x, y)
};

/** Wheel-driven virtual scroll (the page itself never scrolls). */
export const WHEEL = {
  SENSITIVITY: 0.00055, // wheel delta -> progress (0..1)
  TRAVEL: 8.5,          // wall descent over the full range (world units)
  TURNS: 1.15,          // wall revolutions over the full range
};

/**
 * Motion feel — the heart of the "sticky / damped" quality.
 *
 * Every input (wheel, drag, pointer) only writes a *target*; the frame
 * loop chases targets with frame-rate independent exponential damping
 * (THREE.MathUtils.damp). Higher lambda = tighter follow, lower = heavier.
 */
export const MOTION = {
  WHEEL_DAMP: 3.6,    // virtual scroll smoothing (weighty descent)
  RUBBER_BAND: 5,     // spring pulling overscroll back into range
  DRAG_DAMP: 5.0,     // wall lags stickily behind the dragging hand
  CAM_DAMP: 3.0,      // camera flight & parallax follow
  POINTER_DAMP: 3.2,  // magnetic pointer follow smoothing
  CARD_DAMP: 8,       // hover scale / tilt / lift easing
  MAGNET_YAW: 0.09,   // wall yaw drawn toward the pointer (radians)
  MAGNET_PITCH: 0.045,// wall pitch drawn toward the pointer (radians)
  CARD_TILT: 0.22,    // max magnetic tilt of a hovered card (radians)
  CARD_LIFT: 0.35,    // hovered card pops toward the viewer (world units)
  FOCUS_LIFT: 0.55,   // focused card lift
  FLOAT_AMP: 0.05,    // idle per-card floating amplitude
};

/** Scene atmosphere. */
export const SCENE = {
  BACKGROUND: 0x0a0b14,
  FOG_DENSITY: 0.022,
  FLOOR_GAP: 0.7,          // gap between lowest card edge and the mirror floor
  AUTO_ROTATE_SPEED: 0.07, // rad/s idle rotation
};

/** Resolve a photo URL (works in dev and on GitHub Pages). */
export const imageUrl = (i) =>
  `${import.meta.env.BASE_URL}images/photo_${String(i + 1).padStart(2, '0')}.png`;
