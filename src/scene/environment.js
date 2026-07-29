import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { WALL, WHEEL, SCENE } from '../config.js';

/**
 * Scene atmosphere: lights, reflective floor, grid tint and ambient particles.
 * The floor pieces are parented to `rig` so the whole installation sinks
 * together during the scroll-driven descent.
 */
export function createEnvironment({ scene, rig }) {
  // ---- lights (world-fixed) ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(6, 12, 10);
  scene.add(key);

  const rimBlue = new THREE.PointLight(0x6f7bff, 60, 60);
  rimBlue.position.set(-14, 6, -6);
  scene.add(rimBlue);

  const rimPink = new THREE.PointLight(0xff7bd0, 45, 60);
  rimPink.position.set(14, -2, 8);
  scene.add(rimPink);

  // ---- reflective floor (parented to the rig) ----
  // low enough that the wall clears it even at the start of its travel
  // (the wall group begins offset -TRAVEL/2 and climbs as the user scrolls)
  const floorY =
    -(((WALL.ROWS - 1) / 2) * WALL.ROW_GAP +
      (WALL.PHOTO_H + WALL.FRAME_BORDER) / 2 +
      SCENE.FLOOR_GAP +
      WHEEL.TRAVEL / 2);

  const dpr = Math.min(window.devicePixelRatio, 2);
  const mirror = new Reflector(new THREE.CircleGeometry(40, 80), {
    textureWidth: window.innerWidth * dpr,
    textureHeight: window.innerHeight * dpr,
    color: 0x0e1020,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = floorY;
  rig.add(mirror);

  const grid = new THREE.GridHelper(80, 40, 0x2a2e52, 0x181b32);
  grid.material.transparent = true;
  grid.material.opacity = 0.25;
  grid.position.y = floorY + 0.01;
  rig.add(grid);

  // ---- ambient particles (world-fixed, so stars stay while the wall sinks) ----
  const N = 260;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 12 + Math.random() * 26;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      color: 0x9aa4ff,
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  scene.add(particles);

  return { mirror, particles, floorY };
}
