import { imageUrl } from '../config.js';

/**
 * K95-style opening sequence (https://k95.it reference):
 *
 * 1. DEAL — on a pure-white backdrop, photo cards bloom one by one from
 *    the exact centre of the screen: each layer is centre-anchored and
 *    its width grows 0 -> target with a strong ease-out, aspect locked,
 *    so it scales up out of nothing on top of the pile. Targets step up
 *    84% -> 100% so every card is slightly bigger than the last; the
 *    final 100% layer is pure black (no photo) and caps the stack.
 *    A [0..100] counter at the stack's top-right corner runs on the
 *    same clock as the deal.
 * 2. PUNCH — the stack blurs away while a "patch" element (a fixed,
 *    transparent rect sitting exactly on the stack, wearing a giant
 *    white box-shadow) takes over: everything is white EXCEPT a
 *    card-shaped hole, and through the hole you already see the live
 *    3D wall. The hole then scales from the centre until it swallows
 *    the whole viewport (expo-in-out), revealing the page.
 * 3. Cleanup: input enabled, intro removed. Every phase has a timeout
 *    safety net so a hidden tab can never stall the flow.
 */

// each card slightly bigger than the previous; the last (black) covers all
const LAYER_WIDTHS = [84, 86, 88, 90, 92, 94, 96, 98, 100];
const PHOTO_LAYERS = LAYER_WIDTHS.length - 1; // 8 photos + 1 black cap

const DEAL_TOTAL = 2800;    // ms — whole deal, counter reaches [100] here
const CARD_DURATION = 800;  // ms — one card's 0 -> target growth
const STAGGER = (DEAL_TOTAL - CARD_DURATION) / (LAYER_WIDTHS.length - 1); // 250ms
const PREVIEW_MS = 420;     // stack blur-out / hole preview
const PUNCH_DELAY = 60;     // beat between preview and expansion
const EXPAND_MS = 1000;     // hole expansion (expo.inOut feel)
const OVERSHOOT = 1.04;     // expand 4% past the viewport edges
const CLEAR_MS = 380;       // settle before removing the intro root

const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const waitTransition = (el, ms) =>
  Promise.race([
    new Promise((res) => el.addEventListener('transitionend', res, { once: true })),
    delay(ms),
  ]);

export class Intro {
  /**
   * @param {HTMLElement} root  the #intro overlay element
   * @param {Promise} ready     resolves when the 3D textures are loaded
   * @param {Function} onDone   called when the reveal completes (enable input)
   */
  constructor({ root, ready, onDone }) {
    this.root = root;
    this.ready = ready;
    this.onDone = onDone;
  }

  async play() {
    const { root } = this;
    root.classList.add('active');

    // centre stack + layers
    const stack = document.createElement('div');
    stack.className = 'intro-stack';
    root.appendChild(stack);
    this.stack = stack;

    this.layers = LAYER_WIDTHS.map((_, i) => {
      const layer = document.createElement('div');
      layer.className = 'intro-layer' + (i === LAYER_WIDTHS.length - 1 ? ' intro-layer--final' : '');
      layer.style.zIndex = String(i + 1); // one pressing on another
      if (i < PHOTO_LAYERS) {
        const img = document.createElement('img');
        img.src = imageUrl(i);
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.loading = 'eager';
        layer.appendChild(img);
      }
      stack.appendChild(layer);
      return layer;
    });

    this.counter = document.createElement('div');
    this.counter.className = 'intro-counter';
    this.counter.textContent = '[0]';
    stack.appendChild(this.counter);

    // the hole-punch patch (hidden until the reveal)
    this.patch = document.createElement('div');
    this.patch.className = 'intro-patch';
    root.appendChild(this.patch);

    await this._deal();
    await this.ready; // hold on the finished pile until the wall's textures are in
    await this._punchReveal();
  }

  /** Phase 1: one rAF clock grows every layer (staggered) + drives the counter. */
  _deal() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.layers.forEach((el, i) => { el.style.width = `${LAYER_WIDTHS[i]}%`; });
        this.counter.textContent = '[100]';
        resolve();
      };

      const start = performance.now();
      const tick = (now) => {
        if (settled) return;
        const t = Math.min(now - start, DEAL_TOTAL);
        this.layers.forEach((el, i) => {
          const local = t - i * STAGGER;
          if (local <= 0) return;
          const k = local >= CARD_DURATION ? 1 : easeOutQuint(local / CARD_DURATION);
          el.style.width = `${LAYER_WIDTHS[i] * k}%`;
        });
        this.counter.textContent = `[${Math.round((t / DEAL_TOTAL) * 100)}]`;
        if (t < DEAL_TOTAL) requestAnimationFrame(tick);
        else finish();
      };
      requestAnimationFrame(tick);

      // hidden tabs pause rAF — never let the deal stall
      setTimeout(finish, DEAL_TOTAL + 900);
    });
  }

  /**
   * Phase 2: white viewport with a card-shaped hole (the patch's giant
   * white box-shadow paints everything but the hole), expanding from the
   * stack's rect until it swallows the viewport.
   */
  async _punchReveal() {
    const { root, stack, patch } = this;
    const rect = stack.getBoundingClientRect();

    // degenerate viewport (hidden tab) -> skip the visual, finish cleanly
    if (rect.width < 2 || rect.height < 2) {
      this.onDone?.();
      root.remove();
      return;
    }

    // park the patch exactly on the stack
    patch.style.transition = 'none';
    patch.style.left = `${rect.left}px`;
    patch.style.top = `${rect.top}px`;
    patch.style.width = `${rect.width}px`;
    patch.style.height = `${rect.height}px`;
    patch.style.transform = 'scale(1)';

    // preview: stack blurs away, the white world with a live hole remains
    root.classList.add('is-punching');
    await delay(PREVIEW_MS + PUNCH_DELAY);

    // expand the hole from the centre until it covers the viewport
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const sx = Math.max(1, (Math.max(cx, window.innerWidth - cx) * 2) / rect.width) * OVERSHOOT;
    const sy = Math.max(1, (Math.max(cy, window.innerHeight - cy) * 2) / rect.height) * OVERSHOOT;
    void patch.offsetWidth; // commit the parked state
    patch.style.transition = `transform ${EXPAND_MS}ms cubic-bezier(0.87, 0, 0.13, 1)`; // expo.inOut
    patch.style.transform = `scale(${sx}, ${sy})`;
    await waitTransition(patch, EXPAND_MS + 400);

    this.onDone?.();
    await delay(CLEAR_MS);
    root.remove();
  }
}
