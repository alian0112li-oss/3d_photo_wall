import { imageUrl } from '../config.js';

/**
 * Opening sequence (white backdrop):
 *
 * 1. Cards drop one by one onto the exact centre of the screen, each
 *    perfectly straight and stacking on top of the previous (rising
 *    z-index) — a neat deck, not a scatter. Every card fades in as it
 *    falls so the motion reads clearly against the white backdrop.
 *    The last card is pure black — the only black element on the page.
 * 2. FLIP viewport fill: the black card — an ordinary card in the stack
 *    flow — is instantly converted into a fixed, fullscreen "viewport
 *    mask layer" (First -> Last layout change), inverted back onto its
 *    old rect with a transform so nothing appears to move, then played
 *    so it expands to fill the viewport. That expansion is the moment
 *    the page turns black.
 * 3. While the mask covers the screen the underlying layout is switched
 *    (stack removed, 3D wall input enabled), then the mask lifts to
 *    reveal the dark scene.
 */

const FALL_COUNT = 10;      // photo cards before the black cap
const FALL_INTERVAL = 170;  // ms between drops
const FALL_DURATION = 820;  // ms per drop
const ZOOM_SCALE = 1.1;     // the photo grows inside its fixed frame...
const ZOOM_DURATION = 420;  // ...briefly, as the card arrives
const EXPAND_DURATION = 720;
const FADE_DURATION = 700;

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

    // deal the deck — every card falls straight down from above the
    // viewport onto the same centred spot. It stays fully opaque the
    // whole way, so you can see exactly where each card comes from.
    const settle = 'translate(-50%, -50%) scale(1)';
    const drops = cards.map((el, i) => {
      el.style.zIndex = String(10 + i); // one pressing on another
      const anim = el.animate(
        [
          // parked fully above the top edge — enters the screen visibly
          { transform: 'translate(-50%, calc(-50% - 72vh)) scale(1.02)', opacity: 1 },
          { transform: settle, opacity: 1 },
        ],
        {
          duration: FALL_DURATION,
          delay: i * FALL_INTERVAL,
          easing: 'cubic-bezier(0.5, 0, 0.15, 1)', // gravity in, soft landing
          fill: 'both',
        }
      );
      // the photo grows briefly inside its fixed frame as the card arrives
      const img = el.querySelector('img');
      if (img) {
        img.animate(
          [{ transform: 'scale(1)' }, { transform: `scale(${ZOOM_SCALE})` }],
          {
            duration: ZOOM_DURATION,
            delay: i * FALL_INTERVAL + 180,
            easing: 'ease-out',
            fill: 'both',
          }
        );
      }
      return anim.finished
        .catch(() => {})
        .then(() => {
          el.style.transform = settle; // pin the pose, free the animation
          el.style.opacity = '1';
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
    black.style.transform = 'none';    // drop the settle transform, else the Last rect
                                       // is shifted by -50% and the mask appears to
                                       // grow from the bottom-right instead of centre
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
