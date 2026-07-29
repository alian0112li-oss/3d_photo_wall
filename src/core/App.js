import * as THREE from 'three';
import { CAMERA, WHEEL, SCENE, MOTION, SPIN } from '../config.js';
import { createEnvironment } from '../scene/environment.js';
import { PhotoWall } from '../scene/PhotoWall.js';
import { WheelScroller } from '../controls/WheelScroller.js';

const { damp } = THREE.MathUtils;

/**
 * Application orchestrator.
 *
 * The wheel drives the vertical travel through a damped chase; the spin
 * is a wheel-position-independent auto-rotation whose SPEED shifts
 * between three damped tiers (see SPIN in config):
 *   scrolling  -> slightly faster than normal
 *   hover      -> slower, for viewing a photo
 *   otherwise  -> base speed
 *
 *   wall.rotation.y = ∫ speed(t) dt
 *   wall.position.y = idle bob + (wheel chase − ½) · TRAVEL
 */
export class App {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._rot = 0;             // accumulated auto-rotation angle
    this._speed = SPIN.BASE;   // current damped spin speed
    this._hovering = false;
    this._ndc = new THREE.Vector2(2, 2); // off-screen until first pointermove
    this._raycaster = new THREE.Raycaster();

    this._initRenderer();
    this._initScene();
    this._initLoader();
    this.wheel = new WheelScroller();

    // pointer position feeds hover detection only — it never moves the wall
    window.addEventListener('pointermove', (e) => {
      this._ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(CAMERA.FOV, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(...CAMERA.POSITION);
    this.camera.lookAt(new THREE.Vector3(...CAMERA.LOOK_AT));
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE.BACKGROUND);
    this.scene.fog = new THREE.FogExp2(SCENE.BACKGROUND, SCENE.FOG_DENSITY);

    // static rig holding floor + wall; only the wall group travels
    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this.manager = new THREE.LoadingManager();
    this.env = createEnvironment({ scene: this.scene, rig: this.rig });
    this.wall = new PhotoWall({
      manager: this.manager,
      maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
    });
    this.rig.add(this.wall.group);
  }

  _initLoader() {
    const overlay = document.getElementById('loader');
    const barFill = document.getElementById('bar-fill');
    const label = document.getElementById('loader-label');
    this.manager.onProgress = (_url, loaded, total) => {
      barFill.style.width = `${Math.round((loaded / total) * 100)}%`;
      label.textContent = `正在加载照片 ${loaded}/${total}…`;
    };
    /** Resolves when all textures are in (8s safety net) — the intro awaits this. */
    this.ready = new Promise((resolve) => {
      const done = () => {
        overlay.classList.add('hidden');
        resolve();
      };
      this.manager.onLoad = done;
      setTimeout(done, 8000);
    });
  }

  /** Called when the intro's mask covers the screen (or when skipping it). */
  enableInput() {
    this.wheel.enabled = true;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
  }

  /** Is the pointer currently over a photo? (speed control only) */
  _checkHover() {
    if (this._ndc.x > 1.5) return false; // pointer never entered
    this._raycaster.setFromCamera(this._ndc, this.camera);
    return this._raycaster.intersectObjects(this.wall.pickables, false).length > 0;
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // wheel chases its target (damped travel + rubber-band edges)
    this.wheel.update(dt);

    // spin speed: scrolling > hover > base, blended smoothly (no hard steps);
    // while scrolling the spin direction follows the scroll direction
    this._hovering = this._checkHover();
    const tier = this.reduceMotion
      ? 0
      : this.wheel.isActive(SPIN.SCROLL_HOLD)
        ? SPIN.SCROLL * this.wheel.lastDir
        : this._hovering
          ? SPIN.HOVER
          : SPIN.BASE;
    this._speed = damp(this._speed, tier, SPIN.DAMP, dt);
    this._rot += this._speed * dt;
    this.wall.group.rotation.y = this._rot;

    // travel: wheel down -> the wall climbs upward past the view,
    // from -TRAVEL/2 (top ring centred) to +TRAVEL/2 (bottom ring centred)
    const bob = this.reduceMotion ? 0 : Math.sin(t * 0.4) * MOTION.BOB_AMP;
    this.wall.group.position.y = bob + (this.wheel.value - 0.5) * WHEEL.TRAVEL;

    // per-card idle float
    this.wall.update(t, this.reduceMotion);

    this.renderer.render(this.scene, this.camera);
  }
}
