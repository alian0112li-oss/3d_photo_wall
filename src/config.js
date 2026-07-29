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
  PARALLAX: [1.4, 0.8], // pointer parallax amplitude (x, y)
};

/** Scroll-driven intro (mouse wheel -> wall descends & rotates). */
export const SCROLL = {
  LENGTH_VH: 280, // scrub distance in vh — keep in sync with #scroll-driver height in CSS
  TURNS: 1.25,    // wall revolutions over the full scrub
  DESCEND: 30,    // how far the wall sinks (world units)
};

/** Scene atmosphere. */
export const SCENE = {
  BACKGROUND: 0x0a0b14,
  FOG_DENSITY: 0.022,
  FLOOR_GAP: 0.7,      // gap between lowest card edge and the mirror floor
  AUTO_ROTATE_SPEED: 0.07, // rad/s idle rotation
};

/** Resolve a photo URL (works in dev and on GitHub Pages). */
export const imageUrl = (i) =>
  `${import.meta.env.BASE_URL}images/photo_${String(i + 1).padStart(2, '0')}.png`;
