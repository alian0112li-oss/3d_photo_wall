import * as THREE from 'three';

/**
 * Custom photo material.
 *
 * The card must read as ONE solid piece — photo and frame together —
 * so the ONLY deformation is geometric: the whole sheet (silhouette
 * and image alike) bows in Z with the travel velocity via vertex
 * displacement. There is deliberately NO UV-space distortion (no sine
 * stretch, no RGB shift): texture-space effects make the image swim
 * inside a rigid outline, which breaks the one-piece feel.
 *
 * (Hover is a plain scale pop handled in PhotoWall.)
 */

const VERTEX = /* glsl */ `
  uniform float uVel;   // signed travel velocity (-1..1)
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    // geometric flex: the WHOLE card (image + outline as one) bows
    // along its height with the travel velocity
    p.z += sin(uv.y * 3.1415926) * uVel * 0.16;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  varying vec2 vUv;

  void main() {
    // a still-loading photo must never show as a dark block
    if (uHasMap < 0.5) discard;

    // single double-sided sheet: flip U on the rear face so the photo
    // reads right-side-up (not mirrored) from behind
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);

    // no UV-space distortion: the image stays rigidly locked to the
    // sheet — all motion comes from the vertex flex above
    gl_FragColor = texture2D(uMap, uv);
    #include <colorspace_fragment>
  }
`;

/** One material per card — its uniforms are that card's animation state. */
export function createPhotoMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide, // one curved sheet shows the photo on both faces
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uVel: { value: 0 },
    },
  });
}
