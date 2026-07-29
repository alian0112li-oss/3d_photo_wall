import { imageUrl } from '../config.js';

/**
 * Opening sequence:
 *
 * 1. Cards drop one by one into the centre of the screen like a poker
 *    deck being dealt — each lands on top of the previous (rising
 *    z-index, random tilt/jitter), the last card is pure black.
 * 2. FLIP viewport fill: the black card — an ordinary card in the stack
 *    flow — is instantly converted into a fixed, fullscreen "viewport
 *    mask layer" (First -> Last layout change), inverted back onto its
 *    old rect with a transform so nothing appears to move, then played
 *    so it expands to fill the viewport.
 * 3. While the mask covers the screen the underlying layout is switched
 *    (stack removed, 3D wall input enabled), then the mask lifts.
 */

const FALL_COUNT = 10;      // photo cards before the black cap
const FALL_INTERVAL = 190;  // ms between drops
const FALL_DURATION = 640;  // ms per drop
const EXPAND_DURATION = 720;
const FADE_DURATION = 700;

/** Deterministic pseudo-random in [0, 1) so the pile looks the same every visit. */
const rand = (seed) => {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
};

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((res) => setTimeout(res, ms))]);

const waitTransition = (el, ms) =>
  Promise.race([
    new Promise((res) => el.addEventListener('transitionend', res, { once: true })),
    new Promise((res) => setTimeout(res, ms)),
  ]);

export class Intro {
  /**
   * @param {HTMLElement} root  the #intro overlay element
   * @param {Promise} ready     resolves when the 3D textures are loaded
   * @param {Function} onDone   called at the layout switch (mask fully covering)
   */
  constructor({ root, ready, onDone }) {
    this.root = root;
    this.ready = ready;
    this.onDone = onDone;
  }

  async play() {
    const { root } = this;
    root.classList.add('active');

    const stack = document.createElement('div');
    stack.className = 'intro-stack';
    root.appendChild(stack);

    // build the deck: FALL_COUNT photos + one black cap
    const cards = [];
    for (let i = 0; i < FALL_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'intro-card';
      const img = document.createElement('img');
      img.src = imageUrl(i);
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      el.appendChild(img);
      stack.appendChild(el);
      cards.push(el);
    }
    const black = document.createElement('div');
    black.className = 'intro-card intro-card-black';
    stack.appendChild(black);
    cards.push(black);

    // deal the deck — each card falls from above and lands on the pile
    const drops = cards.map((el, i) => {
      const isBlack = i === cards.length - 1;
      const rot = isBlack ? 0 : rand(i) * 24 - 12;        // deg tilt on landing
      const jx = isBlack ? 0 : rand(i + 40) * 26 - 13;    // px jitter
      const jy = isBlack ? 0 : rand(i + 80) * 18 - 9;
      el.style.zIndex = String(10 + i);                    // one pressing on another
      const settle = `translate(calc(-50% + ${jx}px), calc(-50% + ${jy}px)) rotate(${rot}deg)`;
      const anim = el.animate(
        [
          { transform: `translate(calc(-50% + ${jx}px), -170vh) rotate(${rot - 14}deg)` },
          { transform: settle },
        ],
        {
          duration: FALL_DURATION,
          delay: i * FALL_INTERVAL,
          easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)', // lands with a tiny overshoot
          fill: 'both',
        }
      );
      return anim.finished
        .catch(() => {})
        .then(() => {
          el.style.transform = settle; // pin the pose, free the animation
          anim.cancel();
        });
    });

    const dealTime = FALL_COUNT * FALL_INTERVAL + FALL_DURATION;
    await withTimeout(Promise.all(drops), dealTime + 1500);
    await this.ready; // hold on the pile until the wall's textures are in

    await this._flipToMask(black, stack);
  }

  /**
   * FLIP: the black card becomes the fullscreen viewport mask.
   * First -> measure its rect in the pile; Last -> instant switch to a
   * fixed fullscreen layer; Invert -> transform back onto the old rect;
   * Play -> transition to identity, filling the viewport.
   */
  async _flipToMask(black, stack) {
    const first = black.getBoundingClientRect();

    black.classList.add('as-mask');    // Last: fixed, inset 0 — instant layout change
    this.root.appendChild(black);      // survives the stack's removal
    const last = black.getBoundingClientRect();

    const sx = first.width / last.width;
    const sy = first.height / last.height;
    black.style.transformOrigin = '0 0';
    black.style.transform =
      `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${sx}, ${sy})`;
    void black.offsetWidth;            // commit the inverted state

    black.style.transition = `transform ${EXPAND_DURATION}ms cubic-bezier(0.65, 0, 0.35, 1)`;
    black.style.transform = 'none';
    await waitTransition(black, EXPAND_DURATION + 400);

    // the mask now covers the viewport — switch the underlying layout
    stack.remove();
    this.root.classList.remove('active'); // overlay turns transparent, only the mask remains
    this.onDone?.();

    // lift the mask to reveal the wall
    black.style.transition = `opacity ${FADE_DURATION}ms ease`;
    black.style.opacity = '0';
    await waitTransition(black, FADE_DURATION + 400);
    this.root.remove();
  }
}
