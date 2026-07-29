import * as THREE from 'three';

/**
 * Custom photo material — a port of the K95.it (mooh.dev-style)
 * WebGLImageMaterial ideas onto our cards:
 *
 * - travel wave: while the wheel scrolls, a sine-based non-linear UV
 *   stretch plus a subtle RGB channel shift, both proportional to the
 *   (signed) travel velocity — K95's signature scroll distortion
 * - vertex flex: the plane itself bows in Z with the velocity, so the
 *   card physically bends, not just its texture (needs a segmented plane)
 *
 * (Hover is a plain scale pop handled in PhotoWall — no lens here.)
 * All dynamic inputs are uniforms driven per-frame from PhotoWall.update;
 * tuning constants live inline below, commented.
 */

const VERTEX = /* glsl */ `
  uniform float uVel;   // signed travel velocity (-1..1)
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    // non-linear flex: the card bows along its height with velocity
    p.z += sin(uv.y * 3.1415926) * uVel * 0.22;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uVel;    // signed travel velocity (-1..1)
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // --- travel wave: sine UV stretch, amount follows the velocity ---
    uv.y += sin(uv.x * 8.0 + uTime * 0.8) * uVel * 0.035;

    // --- RGB shift: channels part ways with speed ---
    float shift = uVel * 0.02;

    vec3 col;
    if (uHasMap > 0.5) {
      float cr = texture2D(uMap, uv + vec2(shift, 0.0)).r;
      float cg = texture2D(uMap, uv).g;
      float cb = texture2D(uMap, uv - vec2(shift, 0.0)).b;
      col = vec3(cr, cg, cb);
    } else {
      col = vec3(0.008, 0.009, 0.022); // dark plate until the photo lands
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** One material per card — its uniforms are that card's animation state. */
export function createPhotoMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uVel: { value: 0 },
      uTime: { value: 0 },
    },
  });
}
