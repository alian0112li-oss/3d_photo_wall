import * as THREE from 'three';
import { CAMERA, SCROLL, SCENE } from '../config.js';
import { createEnvironment } from '../scene/environment.js';
import { PhotoWall } from '../scene/PhotoWall.js';
import { DragRotator } from '../controls/DragRotator.js';
import { FocusController } from '../controls/FocusController.js';
import { initScrollAnimation } from '../scroll/scrollAnimation.js';

/**
 * Application orchestrator: owns renderer/scene/camera, composes the
 * modules and runs the frame loop. Rotation sources are additive:
 *
 *   wall.rotation.y = drag offset (+ inertia + idle spin)
 *                   + scrollProgress * TURNS * 2π
 *   rig.position.y  = idle bob - scrollProgress * DESCEND
 */
export class App {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.state = {
      scrollProgress: 0,   // raw, from ScrollTrigger
      smoothProgress: 0,   // eased in the frame loop
      focused: null,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    // camera rig targets (GSAP tweens these on focus/release)
    this.camPos = new THREE.Vector3(...CAMERA.POSITION);
    this.camLook = new THREE.Vector3(...CAMERA.LOOK_AT);
    this.parallax = new THREE.Vector2();

    this._initRenderer();
    this._initScene();
    this._initLoader();
    this._initControls();
    initScrollAnimation(this);

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

    // the rig sinks as the user scrolls; wall + floor ride on it
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
    this.drag = new DragRotator(this.renderer.domElement, {
      enabled: () => !this.state.focused,
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

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.state;

    // ease the raw scroll progress for a weighty, cinematic feel
    s.smoothProgress += (s.scrollProgress - s.smoothProgress) * Math.min(1, dt * 6);

    // wall rotation: drag/inertia + idle spin + scroll-driven turns
    const idle = s.focused || s.reduceMotion ? 0 : SCENE.AUTO_ROTATE_SPEED;
    this.drag.update(dt, { autoSpeed: idle });
    this.wall.group.rotation.y = this.drag.offset + s.smoothProgress * SCROLL.TURNS * Math.PI * 2;

    // rig: idle bob + scroll-driven descent
    const bob = s.reduceMotion ? 0 : Math.sin(t * 0.4) * 0.15;
    this.rig.position.y = bob - s.smoothProgress * SCROLL.DESCEND;

    this.wall.update(dt);

    // hover picking only while the wall is up and nothing is focused
    if (!s.focused && s.smoothProgress < 0.25) this.focus.updateHover();
    else if (!s.focused && this.wall.hovered) this.wall.setHovered(null);

    // camera: eased follow of rig targets + pointer parallax
    const pk = s.focused ? 0.12 : 1; // parallax nearly off while inspecting a photo
    const px = s.reduceMotion ? 0 : this.parallax.x * CAMERA.PARALLAX[0] * pk;
    const py = s.reduceMotion ? 0 : this.parallax.y * CAMERA.PARALLAX[1] * pk;
    const k = Math.min(1, dt * 4);
    this.camera.position.x += (this.camPos.x + px - this.camera.position.x) * k;
    this.camera.position.y += (this.camPos.y + py - this.camera.position.y) * k;
    this.camera.position.z += (this.camPos.z - this.camera.position.z) * k;
    this.camera.lookAt(this.camLook);

    this.renderer.render(this.scene, this.camera);
  }
}
