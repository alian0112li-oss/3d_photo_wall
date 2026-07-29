import * as THREE from 'three';
import { CAMERA, WHEEL, SCENE, MOTION } from '../config.js';
import { createEnvironment } from '../scene/environment.js';
import { PhotoWall } from '../scene/PhotoWall.js';
import { DragRotator } from '../controls/DragRotator.js';
import { WheelScroller } from '../controls/WheelScroller.js';
import { FocusController } from '../controls/FocusController.js';

const { damp } = THREE.MathUtils;

/**
 * Application orchestrator.
 *
 * Motion architecture — "targets + damped chase":
 * inputs (wheel / drag / pointer) never move anything directly; they only
 * write target values. The frame loop chases every target with
 * frame-rate independent exponential damping (THREE.MathUtils.damp),
 * which is what produces the sticky, viscous, weighty feel.
 *
 *   wall.rotation.y = drag chase + wheel chase * TURNS·2π + magnetic yaw
 *   wall.rotation.x = magnetic pitch (pointer follow)
 *   rig.position.y  = idle bob − wheel chase * TRAVEL
 *   camera          = damped flight toward rig targets + damped parallax
 */
export class App {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.state = {
      focused: null,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    // camera rig targets (FocusController retargets these)
    this.camPos = new THREE.Vector3(...CAMERA.POSITION);
    this.camLook = new THREE.Vector3(...CAMERA.LOOK_AT);
    this.lookCur = new THREE.Vector3(...CAMERA.LOOK_AT); // damped look-at point
    this.parallax = new THREE.Vector2();   // raw pointer (-1..1)
    this.parallaxSm = new THREE.Vector2(); // damped pointer — magnetic follow

    // scratch vectors (avoid per-frame allocation)
    this._wp = new THREE.Vector3();
    this._wq = new THREE.Quaternion();
    this._wn = new THREE.Vector3();
    this._tmp = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initLoader();
    this._initControls();

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
    this.camera.position.copy(this.camPos);
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
    this.manager.onLoad = () => overlay.classList.add('hidden');
    // safety net: never leave the overlay stuck
    setTimeout(() => overlay.classList.add('hidden'), 8000);
  }

  _initControls() {
    this.wheel = new WheelScroller({
      onInput: () => this.focus && this.focus.release(), // wheeling exits focus
    });
    this.drag = new DragRotator(this.renderer.domElement, {
      enabled: () => !this.state.focused,
      // vertical touch/drag also travels the wall (mobile-friendly)
      onVertical: (dy) => this.wheel.nudge(-dy * 0.0016),
    });
    this.focus = new FocusController(this);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
  }

  /** While a card is focused, keep the camera targets glued to it. */
  _updateFocusTargets() {
    const card = this.state.focused;
    card.getWorldPosition(this._wp);
    card.getWorldQuaternion(this._wq);
    this._wn.set(0, 0, 1).applyQuaternion(this._wq);
    // both faces show the photo — approach from whichever side the camera is on
    this._tmp.copy(this.camera.position).sub(this._wp);
    if (this._wn.dot(this._tmp) < 0) this._wn.negate();
    this.camPos.copy(this._wp).addScaledVector(this._wn, CAMERA.FOCUS_DISTANCE);
    this.camPos.y += 0.15;
    this.camLook.copy(this._wp);
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.state;
    const rm = s.reduceMotion;

    // ---- damped pointer (magnetic follow source) ----
    const px = rm ? 0 : this.parallax.x;
    const py = rm ? 0 : this.parallax.y;
    this.parallaxSm.x = damp(this.parallaxSm.x, px, MOTION.POINTER_DAMP, dt);
    this.parallaxSm.y = damp(this.parallaxSm.y, py, MOTION.POINTER_DAMP, dt);

    // ---- inputs chase their targets ----
    this.wheel.update(dt);
    const idle = s.focused || rm ? 0 : SCENE.AUTO_ROTATE_SPEED;
    this.drag.update(dt, { autoSpeed: idle });

    // ---- wall: drag + wheel travel + magnetic yaw/pitch ----
    const p = this.wheel.value; // 0..1 (briefly overshoots at the edges)
    this.wall.group.rotation.y =
      this.drag.value + p * WHEEL.TURNS * Math.PI * 2 + this.parallaxSm.x * MOTION.MAGNET_YAW;
    this.wall.group.rotation.x = -this.parallaxSm.y * MOTION.MAGNET_PITCH;

    // ---- travel: natural scrolling — wheel down, wall climbs upward ----
    // starts at -TRAVEL/2 (top ring centred) and ends at +TRAVEL/2
    // (bottom ring centred), browsing ring by ring
    const bob = rm ? 0 : Math.sin(t * 0.4) * MOTION.BOB_AMP;
    this.wall.group.position.y = bob + (p - 0.5) * WHEEL.TRAVEL;

    // ---- cards: hover magnetism, lift, float ----
    if (s.focused) this._updateFocusTargets();
    else this.focus.updateHover();
    this.wall.update(dt, t);

    // ---- camera: damped flight + damped parallax ----
    const pk = s.focused ? 0.12 : 1; // parallax nearly off while inspecting
    const ox = this.parallaxSm.x * CAMERA.PARALLAX[0] * pk;
    const oy = this.parallaxSm.y * CAMERA.PARALLAX[1] * pk;
    this.camera.position.x = damp(this.camera.position.x, this.camPos.x + ox, MOTION.CAM_DAMP, dt);
    this.camera.position.y = damp(this.camera.position.y, this.camPos.y + oy, MOTION.CAM_DAMP, dt);
    this.camera.position.z = damp(this.camera.position.z, this.camPos.z, MOTION.CAM_DAMP, dt);
    this.lookCur.x = damp(this.lookCur.x, this.camLook.x, MOTION.CAM_DAMP, dt);
    this.lookCur.y = damp(this.lookCur.y, this.camLook.y, MOTION.CAM_DAMP, dt);
    this.lookCur.z = damp(this.lookCur.z, this.camLook.z, MOTION.CAM_DAMP, dt);
    this.camera.lookAt(this.lookCur);

    this.renderer.render(this.scene, this.camera);
  }
}
