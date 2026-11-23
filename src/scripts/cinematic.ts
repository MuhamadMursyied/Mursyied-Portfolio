// Camera-style post effects for the 3D world: light shafts and lens flare from the sun,
// then a film grade (teal-and-orange, contrast, vignette, chromatic aberration, grain).

import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const quadVS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// Runs on the linear HDR image (before tone mapping), so the bright sky drives the shafts.
export function sunPass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      sun: { value: new THREE.Vector2(0.5, 0.5) },
      aspect: { value: 1 },
      rays: { value: 0 }, // light shaft strength
      flare: { value: 0 }, // lens flare strength
      threshold: { value: 6 },
      tint: { value: new THREE.Color(1, 0.8, 0.55) },
    },
    vertexShader: quadVS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 sun;
      uniform float aspect, rays, flare, threshold;
      uniform vec3 tint;
      varying vec2 vUv;
      const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);

      float bright(vec2 uv) {
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
        float l = dot(texture2D(tDiffuse, uv).rgb, LUM);
        return smoothstep(threshold, threshold * 3.0, l);
      }
      float disc(vec2 p, vec2 c, float r) {
        vec2 d = p - c; d.x *= aspect;
        return smoothstep(r, r * 0.55, length(d));
      }

      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        vec3 col = base.rgb;

        // light shafts: march towards the sun, gathering only very bright (sky / sun) pixels
        if (rays > 0.001) {
          vec2 delta = (vUv - sun) * (0.92 / 48.0);
          vec2 uv = vUv;
          float decay = 1.0, acc = 0.0;
          for (int i = 0; i < 48; i++) {
            uv -= delta;
            acc += bright(uv) * decay;
            decay *= 0.965;
          }
          col += tint * (acc / 48.0) * rays;
        }

        // lens flare: a halo and ghosts on the line from the sun through the centre,
        // only when the sun itself is not hidden behind a building
        if (flare > 0.001) {
          float seen = bright(sun) * 0.6 + bright(sun + vec2(0.004, 0.0)) * 0.2 + bright(sun - vec2(0.004, 0.0)) * 0.2;
          vec2 axis = vec2(0.5) - sun;
          vec3 f = vec3(0.0);
          f += vec3(1.0, 0.85, 0.6) * disc(vUv, sun, 0.09) * 0.35;
          f += vec3(0.35, 0.6, 1.0) * disc(vUv, sun + axis * 0.55, 0.035) * 0.25;
          f += vec3(1.0, 0.55, 0.25) * disc(vUv, sun + axis * 1.1, 0.06) * 0.18;
          f += vec3(0.4, 1.0, 0.7) * disc(vUv, sun + axis * 1.45, 0.022) * 0.3;
          f += vec3(0.7, 0.45, 1.0) * disc(vUv, sun + axis * 1.8, 0.1) * 0.12;
          // a soft horizontal streak, like an anamorphic lens
          vec2 d = vUv - sun; d.x *= aspect;
          f += vec3(1.0, 0.8, 0.6) * exp(-abs(d.y) * 260.0) * exp(-abs(d.x) * 3.0) * 0.5;
          col += f * seen * flare;
        }
        gl_FragColor = vec4(col, base.a);
      }
    `,
  });
}

// Runs last, on the display image.
export function gradePass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      grain: { value: 0.035 },
      vignette: { value: 0.32 },
      ca: { value: 0.0022 },
      contrast: { value: 1.16 },
      saturation: { value: 1.12 },
      shadows: { value: new THREE.Vector3(-0.025, 0.006, 0.03) }, // teal
      highlights: { value: new THREE.Vector3(0.04, 0.012, -0.035) }, // orange
      resolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: quadVS,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float time, grain, vignette, ca, contrast, saturation;
      uniform vec3 shadows, highlights;
      uniform vec2 resolution;
      varying vec2 vUv;
      const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        vec2 d = vUv - 0.5;
        float r = length(d);
        // chromatic aberration grows towards the edges
        vec2 off = d * ca * (r * 2.0);
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);

        float l = dot(col, LUM);
        col = mix(vec3(l), col, saturation);
        col = (col - 0.5) * contrast + 0.5;
        col += shadows * (1.0 - smoothstep(0.0, 0.55, l)) + highlights * smoothstep(0.45, 1.0, l);
        col *= 1.0 - vignette * smoothstep(0.3, 0.85, r);

        // film grain, stronger in the darks like real film
        float n = hash(vUv * resolution + fract(time * 13.7) * 100.0) - 0.5;
        col += n * grain * (1.2 - l);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `,
  });
}
