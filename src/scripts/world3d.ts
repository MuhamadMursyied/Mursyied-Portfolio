// "My world" in real 3D (home page only).
// - physical sky with clouds; the sun sits where it really is over Rawang right now (Malaysia time)
// - glass facades reflect the sky, buildings cast soft shadows, windows and street lamps light up at night
// - the weather from Open-Meteo sets clouds, haze and rain
// - drag to orbit, scroll to zoom, click a building to open its tab
// Add ?time=19:30 to the URL to preview another time of day.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { gradePass, sunPass } from "./cinematic";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { navigate } from "astro:transitions/client";
import { districts } from "../data/world";

// the sun is placed for the visitor's location (set on <section data-home> by world.ts); Rawang until then
const RAWANG = { lat: 3.32, lon: 101.58 };
const RING = 52; // distance of the buildings from me, metres

const ACCENT: Record<string, number> = {
  robotics: 0x3fb8a8,
  career: 0x9b7be0,
  iot: 0x6fbf6a,
  electronics: 0xf08a3c,
  software: 0xe8648a,
  academy: 0x5f9fe0,
};

type Opts = { reducedMotion: boolean; baseUrl: (p: string) => string };

// ---------------------------------------------------------------- small helpers
const rand = mulberry(7);
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return c;
}
function texture(c: HTMLCanvasElement, color = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, amount: number, size: number, light = 255, alpha = 0.08) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < amount; i++) {
    const v = rand() < 0.5 ? 0 : light;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    const s = size * (0.3 + rand());
    g.fillRect(rand() * w, rand() * h, s, s);
  }
}

// ---------------------------------------------------------------- facades
// One texture tile = `cols` bays x `rows` floors. Roughness lives in G and metalness in B (three's convention).
type FacadeStyle = "curtain" | "ribbon" | "punched";
type Facade = { mat: THREE.MeshStandardMaterial; tileW: number; tileH: number };

function facade(style: FacadeStyle, opts: { wall: string; frame?: string; glass?: string; bay?: number; floor?: number; lit?: number; seed?: number }): Facade {
  const cols = 8;
  const rows = 8;
  const P = 64; // pixels per bay
  const W = cols * P;
  const H = rows * P;
  const r = mulberry(opts.seed ?? 3);
  const glass = opts.glass ?? "#26394a";
  const frame = opts.frame ?? "#9aa3ab";
  // window rectangle inside one bay, in pixels
  const win = (x: number, y: number) => {
    if (style === "curtain") return [x + 2, y + 2, P - 4, P - 14];
    if (style === "ribbon") return [x, y + 14, P, P - 30];
    return [x + 14, y + 12, P - 28, P - 26];
  };
  const map = canvas(W, H, (g) => {
    speckle(g, W, H, style === "curtain" ? frame : opts.wall, 2500, 3);
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        const [x, y, w, h] = win(cx * P, cy * P);
        const grad = g.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, glass);
        grad.addColorStop(1, "#101a24");
        g.fillStyle = grad;
        g.fillRect(x, y, w, h);
        // blinds / interior hints
        if (r() < 0.35) { g.fillStyle = "rgba(220,225,230,0.18)"; g.fillRect(x, y, w, h * (0.2 + r() * 0.5)); }
        if (style !== "curtain") { g.fillStyle = frame; g.fillRect(x, y + h - 2, w, 3); }
      }
    if (style === "ribbon") for (let cx = 1; cx < cols; cx++) { g.fillStyle = frame; g.fillRect(cx * P - 1, 0, 2, H); }
  });
  const rm = canvas(W, H, (g) => {
    // walls: rough, not metallic
    g.fillStyle = style === "curtain" ? "rgb(0,110,200)" : "rgb(0,225,0)";
    g.fillRect(0, 0, W, H);
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        const [x, y, w, h] = win(cx * P, cy * P);
        g.fillStyle = `rgb(0,${12 + Math.floor(r() * 14)},255)`; // glass: mirror-like, a little uneven
        g.fillRect(x, y, w, h);
      }
  });
  const lit = opts.lit ?? 0.4;
  const em = canvas(W, H, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        if (r() > lit) continue;
        const [x, y, w, h] = win(cx * P, cy * P);
        const warm = r() < 0.75;
        const k = 0.55 + r() * 0.45;
        g.fillStyle = warm ? `rgba(255,${Math.floor(200 * k + 30)},${Math.floor(140 * k)},1)` : `rgba(${Math.floor(200 * k)},${Math.floor(225 * k)},255,1)`;
        g.globalAlpha = k;
        g.fillRect(x, y, w, h);
        g.globalAlpha = 1;
      }
  });
  const mat = new THREE.MeshStandardMaterial({
    map: texture(map),
    roughnessMap: texture(rm, false),
    metalnessMap: texture(rm, false),
    roughness: 1,
    metalness: 1,
    emissiveMap: texture(em),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0,
  });
  const bay = opts.bay ?? 3;
  const floor = opts.floor ?? 3.6;
  return { mat, tileW: cols * bay, tileH: rows * floor };
}

// A box standing on y = 0 whose UVs are in metres / tile size, so facades never stretch.
function block(w: number, h: number, d: number, side: THREE.Material, top: THREE.Material, tileW = 10, tileH = 10, y0 = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2 + y0, 0);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
    if (Math.abs(ny) > 0.5) uv.setXY(i, x / 10, z / 10);
    else if (Math.abs(nx) > 0.5) uv.setXY(i, (nx > 0 ? -z : z) / tileW, (y - y0) / tileH);
    else uv.setXY(i, (nz > 0 ? x : -x) / tileW, (y - y0) / tileH);
  }
  const m = new THREE.Mesh(g, [side, side, top, top, side, side]);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- sun position (after SunCalc / NOAA)
function sunPosition(date: Date, LAT: number, LON: number) {
  const rad = Math.PI / 180;
  const d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const e = rad * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = rad * (280.16 + 360.9856235 * d) + rad * LON - ra;
  const phi = rad * LAT;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // from south, towards west
  // world: north = -z, east = +x, up = +y
  return new THREE.Vector3(-Math.cos(altitude) * Math.sin(azimuth), Math.sin(altitude), Math.cos(altitude) * Math.cos(azimuth));
}

function nowFor(params: URLSearchParams, home: HTMLElement) {
  const t = params.get("time");
  const m = t && /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return () => new Date();
  const base = new Date();
  const started = Date.now();
  // the given time is local time at the visitor's place (UTC+8 until we know it)
  return () => {
    const off = Number(home.dataset.utcoff ?? 28800) * 1000;
    const at = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), Number(m[1]), Number(m[2])) - off;
    return new Date(at + (Date.now() - started));
  };
}

// ---------------------------------------------------------------- the scene
export function startWorld3D(home: HTMLElement, stage: HTMLElement, opts: Opts) {
  const params = new URLSearchParams(location.search);
  const now = nowFor(params, home);
  const small = matchMedia("(max-width: 900px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const wide = () => matchMedia("(min-width: 901px)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.55;
  const cvs = renderer.domElement;
  cvs.className = "w3-canvas";
  stage.prepend(cvs);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb9c9d6, 0.0032);

  const camera = new THREE.PerspectiveCamera(26, 1, 1, 6000); // about a 50 mm lens on full frame
  const HOME_POS = new THREE.Vector3(70, 52, 238); // south of me, looking north: the sun lights the scene from the side
  const HOME_TARGET = new THREE.Vector3(0, 24, 0);
  camera.position.copy(HOME_POS);

  const controls = new OrbitControls(camera, cvs);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 60;
  controls.maxDistance = 330;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.48;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.autoRotateSpeed = 0.35;
  controls.autoRotate = !opts.reducedMotion;
  controls.update();

  // ---------- sky, sun, moon, environment
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  const skyU = sky.material.uniforms;
  skyU.mieDirectionalG.value = 0.8;

  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(450000);
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  // The haze must match the sky at the horizon, or the ground ends in a hard line.
  // Render the sky alone into a tiny float target, looking at the horizon, and average it.
  const probeRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.FloatType });
  const probeCam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  const probePx = new Float32Array(4 * 4 * 4);
  const horizon = new THREE.Color();
  function sampleHorizon() {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      probeCam.position.set(0, 0, 0);
      probeCam.lookAt(Math.cos(a), 0.02, Math.sin(a));
      renderer.setRenderTarget(probeRT);
      renderer.render(envScene, probeCam);
      renderer.readRenderTargetPixels(probeRT, 0, 0, 4, 4, probePx);
      for (let k = 0; k < probePx.length; k += 4) { r += probePx[k]; g += probePx[k + 1]; b += probePx[k + 2]; n++; }
    }
    renderer.setRenderTarget(null);
    horizon.setRGB(r / n, g / n, b / n);
    return horizon;
  }
  let envRT: THREE.WebGLRenderTarget | null = null;

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  const SH = 95;
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 10, far: 500 });
  sun.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  const moon = new THREE.DirectionalLight(0x9db4ff, 0);
  moon.position.set(-120, 220, 60);
  Object.assign(moon.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 10, far: 500 });
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.04;
  moon.shadow.camera.updateProjectionMatrix();
  scene.add(moon);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x55603f, 0.6);
  scene.add(hemi);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1800; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2;
    const y = Math.abs(u) * 0.95 + 0.05;
    const r = Math.sqrt(1 - y * y);
    starPos.push(r * Math.cos(a) * 1800, y * 1800, r * Math.sin(a) * 1800);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  // ---------- materials
  const grassTex = texture(canvas(512, 512, (g) => {
    speckle(g, 512, 512, "#4a6229", 14000, 3, 255, 0.12);
    for (let i = 0; i < 70; i++) {
      const c = ["122,128,64", "52,74,30", "96,104,48", "70,92,38"][Math.floor(rand() * 4)];
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, `rgba(${c},0.35)`); grad.addColorStop(1, `rgba(${c},0)`);
      const x = rand() * 512, y = rand() * 512, r = 30 + rand() * 90;
      g.save(); g.translate(x, y); g.scale(r, r * (0.5 + rand())); g.fillStyle = grad; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "30,45,18" : "140,150,80"},0.25)`; g.fillRect(rand() * 512, rand() * 512, 1, 3 + rand() * 4); }
  }));
  grassTex.repeat.set(260, 260);
  const grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 });

  // asphalt: patches, cracks and puddles (puddles are dark and mirror-smooth in the roughness map)
  const puddles: [number, number, number, number][] = [];
  for (let i = 0; i < 3; i++) puddles.push([rand() * 512, rand() * 512, 26 + rand() * 50, 0.4 + rand() * 0.5]);
  const cracks = (g: CanvasRenderingContext2D, w: number, h: number, n: number) => {
    g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      let x = rand() * w, y = rand() * h, a = rand() * 6.28;
      g.strokeStyle = `rgba(10,10,10,${0.35 + rand() * 0.35})`;
      g.lineWidth = 0.6 + rand() * 1.4;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 14; k++) { a += (rand() - 0.5) * 1.2; x += Math.cos(a) * 7; y += Math.sin(a) * 7; g.lineTo(x, y); }
      g.stroke();
    }
  };
  const asphaltPaint = (g: CanvasRenderingContext2D, w: number, h: number) => {
    speckle(g, w, h, "#333436", (w * h) / 22, 2, 255, 0.1);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "20,20,22" : "70,70,72"},0.35)`; g.fillRect(rand() * w, rand() * h, 30 + rand() * 90, 20 + rand() * 60); }
    cracks(g, w, h, 10);
    for (const [x, y, r] of puddles) {
      const grad = g.createRadialGradient(x % w, y % h, 0, x % w, y % h, r);
      grad.addColorStop(0, "rgba(12,14,16,0.75)"); grad.addColorStop(1, "rgba(12,14,16,0)");
      g.fillStyle = grad; g.beginPath(); g.ellipse(x % w, y % h, r, r * 0.6, 0, 0, 7); g.fill();
    }
  };
  const roughPaint = (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = "rgb(0,225,0)"; g.fillRect(0, 0, w, h);
    for (const [x, y, r, k] of puddles) {
      const grad = g.createRadialGradient(x % w, y % h, 0, x % w, y % h, r);
      grad.addColorStop(0, `rgba(0,${Math.floor(30 + 40 * (1 - k))},0,1)`); grad.addColorStop(0.7, "rgba(0,120,0,0.6)"); grad.addColorStop(1, "rgba(0,225,0,0)");
      g.fillStyle = grad; g.beginPath(); g.ellipse(x % w, y % h, r, r * 0.6, 0, 0, 7); g.fill();
    }
  };
  const asphaltTex = texture(canvas(512, 512, (g) => asphaltPaint(g, 512, 512)));
  const asphaltRough = texture(canvas(512, 512, (g) => roughPaint(g, 512, 512)), false);
  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex, roughnessMap: asphaltRough, roughness: 1 });
  const roadTex = texture(canvas(256, 512, (g) => {
    asphaltPaint(g, 256, 512);
    g.fillStyle = "#e9e6dc";
    g.fillRect(10, 0, 5, 512);
    g.fillRect(241, 0, 5, 512);
    g.fillStyle = "#e8c95a";
    for (let y = 0; y < 512; y += 128) g.fillRect(125, y, 6, 72);
  }));
  const roadRough = texture(canvas(256, 512, (g) => roughPaint(g, 256, 512)), false);
  const road = new THREE.MeshStandardMaterial({ map: roadTex, roughnessMap: roadRough, roughness: 1 });
  const pavingTex = texture(canvas(256, 256, (g) => {
    speckle(g, 256, 256, "#aaa397", 3000, 2);
    g.strokeStyle = "rgba(90,80,70,0.35)";
    g.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  }));
  const paving = new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 0.75 });
  const concreteTex = texture(canvas(256, 256, (g) => speckle(g, 256, 256, "#b9b4aa", 5000, 3)));
  const concrete = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.88 });
  const darkConcrete = new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x8d8a84, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x9a9a98, roughness: 0.92 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bec4, metalness: 0.85, roughness: 0.35 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2b2f34, metalness: 0.6, roughness: 0.45 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x6f8797, metalness: 0.9, roughness: 0.04, clearcoat: 1 });
  const corrugatedTex = texture(canvas(128, 128, (g) => {
    for (let x = 0; x < 128; x += 8) {
      const grad = g.createLinearGradient(x, 0, x + 8, 0);
      grad.addColorStop(0, "#b7bcc0"); grad.addColorStop(0.5, "#e3e6e8"); grad.addColorStop(1, "#9ea4a9");
      g.fillStyle = grad; g.fillRect(x, 0, 8, 128);
    }
  }));
  const corrugated = new THREE.MeshStandardMaterial({ map: corrugatedTex, metalness: 0.55, roughness: 0.45 });
  const water = new THREE.MeshPhysicalMaterial({ color: 0x1d4a5a, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92 });

  const night = { windows: [] as THREE.MeshStandardMaterial[], lamps: [] as THREE.MeshStandardMaterial[] };
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc777, emissiveIntensity: 0 });
  night.lamps.push(lampGlow);

  const F = {
    tower: facade("curtain", { wall: "#7d8a96", frame: "#8a96a0", glass: "#2f4d63", lit: 0.3, seed: 11 }),
    lab: facade("ribbon", { wall: "#cfcac1", frame: "#cfd4d8", glass: "#24404f", floor: 4.2, lit: 0.5, seed: 12 }),
    studio: facade("ribbon", { wall: "#3b3f46", frame: "#555b63", glass: "#2a3f52", floor: 4, lit: 0.6, seed: 13 }),
    academy: facade("punched", { wall: "#d9ccb0", frame: "#f4eee2", glass: "#2c3c48", bay: 3.4, floor: 4.2, lit: 0.35, seed: 14 }),
    shed: facade("punched", { wall: "#cfd2cf", frame: "#e8e8e8", glass: "#2c3c48", bay: 4, floor: 4, lit: 0.3, seed: 15 }),
    city1: facade("curtain", { wall: "#6c7a84", frame: "#77838c", glass: "#334b5c", lit: 0.25, seed: 21 }),
    city2: facade("punched", { wall: "#958c7f", frame: "#ece6da", glass: "#2b3843", floor: 3.2, lit: 0.3, seed: 22 }),
    city3: facade("ribbon", { wall: "#7f868b", frame: "#dde1e3", glass: "#27404f", floor: 3.4, lit: 0.35, seed: 23 }),
  };
  Object.values(F).forEach((f) => night.windows.push(f.mat));
  // Glass gets its own reflection map so it can mirror the sky strongly while the
  // sky's diffuse light on everything else stays low (otherwise it drowns the sun's shadows).
  const reflective: { mat: THREE.MeshStandardMaterial; k: number }[] = [];
  const reflect = (mat: THREE.MeshStandardMaterial, k: number) => reflective.push({ mat, k });
  [F.tower, F.city1].forEach((f) => reflect(f.mat, 1));
  [F.lab, F.studio, F.city3, F.academy, F.shed, F.city2].forEach((f) => reflect(f.mat, 0.8));
  reflect(glass, 1);
  reflect(water, 0.9);
  reflect(asphalt, 0.7); // the puddles mirror the sky
  reflect(road, 0.7);

  const accentMats: Record<string, THREE.MeshStandardMaterial> = {};
  for (const [id, c] of Object.entries(ACCENT)) accentMats[id] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2, emissive: c, emissiveIntensity: 0 });

  // ---------- ground, plaza, roads
  const ground = mesh(new THREE.PlaneGeometry(6000, 6000), grass, false);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const flat = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    if (geo.type === "RingGeometry") {
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 26, p.getY(i) / 26);
    }
    const m = mesh(geo, mat, false);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    scene.add(m);
    return m;
  };
  pavingTex.repeat.set(1, 1);
  const plazaGeo = new THREE.CircleGeometry(12, 64);
  plazaGeo.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] = (a as Float32Array)[i] * 6; });
  flat(plazaGeo, paving, 0.06);
  flat(new THREE.RingGeometry(12, 19.5, 96), asphalt, 0.04);
  flat(new THREE.RingGeometry(19.5, 21, 96), concrete, 0.07);
  flat(new THREE.RingGeometry(15.6, 15.85, 96), new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.7 }), 0.05);
  // a shallow pool around me
  const pool = flat(new THREE.RingGeometry(4.2, 7.5, 64), water, 0.18);
  pool.receiveShadow = true;
  flat(new THREE.RingGeometry(7.5, 8.1, 64), concrete, 0.2);
  flat(new THREE.RingGeometry(3.6, 4.2, 64), concrete, 0.2);

  // outer ring road with the city beyond it
  flat(new THREE.RingGeometry(80, 88, 160), asphalt, 0.04);
  flat(new THREE.RingGeometry(88, 90.5, 160), concrete, 0.06);
  flat(new THREE.RingGeometry(77.5, 80, 160), concrete, 0.06);

  // ---------- trees, lamps (instanced)
  const trees: THREE.Matrix4[] = [];
  const palms: THREE.Matrix4[] = [];
  const lamps: THREE.Matrix4[] = [];
  const place = (list: THREE.Matrix4[], x: number, z: number, s = 1, rotY = rand() * 6.28) =>
    list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(s, s, s)));

  const buildingSpots: { x: number; z: number; r: number }[] = [];
  // a thin coloured parapet around a roof: the district colour as trim, the roof itself stays grey
  const parapet = (w: number, d: number, y: number, mat: THREE.Material, h = 0.9, t = 0.35) => {
    const g = new THREE.Group();
    for (const [bw, bd, x, z] of [[w, t, 0, d / 2 - t / 2], [w, t, 0, -d / 2 + t / 2], [t, d, w / 2 - t / 2, 0], [t, d, -w / 2 + t / 2, 0]]) {
      const b = block(bw, h, bd, mat, mat, 10, 10, y);
      b.position.set(x, 0, z);
      g.add(b);
    }
    return g;
  };

  // roads from the roundabout to each building, lined with palms and lamps
  districts.forEach((d) => {
    const a = (d.angle * Math.PI) / 180;
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    const start = 21;
    const end = 40;
    const len = end - start;
    const mid = (start + end) / 2;
    const rg = new THREE.PlaneGeometry(8, len);
    rg.attributes.uv.array.forEach((_, i, arr) => { if (i % 2 === 1) (arr as Float32Array)[i] *= len / 16; });
    const rm = flat(rg, road, 0.05);
    const along = Math.atan2(-dir.x, -dir.y); // turns the plane's length onto the road direction
    rm.position.set(dir.x * mid, 0.05, dir.y * mid);
    rm.rotation.set(-Math.PI / 2, 0, along);
    // sidewalks
    for (const side of [-1, 1]) {
      const sw = flat(new THREE.PlaneGeometry(2.4, len), concrete, 0.07);
      const off = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(side * 5.2);
      sw.position.set(dir.x * mid + off.x, 0.07, dir.y * mid + off.y);
      sw.rotation.set(-Math.PI / 2, 0, along);
    }
    for (let s = 24; s < 38; s += 6.5) {
      for (const side of [-1, 1]) {
        const off = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(side * 7.6);
        place(palms, dir.x * s + off.x, dir.y * s + off.y, 0.9 + rand() * 0.3);
        const offL = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(side * 5.6);
        // lamp arm (+z) reaches over the road
        place(lamps, dir.x * (s + 3) + offL.x, dir.y * (s + 3) + offL.y, 1, Math.atan2(dir.y * side, -dir.x * side));
      }
    }
  });
  // big rain trees in the gaps between buildings, and a belt around the city
  districts.forEach((d) => {
    const a = ((d.angle + 30) * Math.PI) / 180;
    for (const r of [36, 54, 68]) place(trees, Math.cos(a) * r + (rand() - 0.5) * 6, Math.sin(a) * r + (rand() - 0.5) * 6, 0.9 + rand() * 0.5);
  });
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const r = 94 + rand() * 30;
    place(rand() < 0.4 ? palms : trees, Math.cos(a) * r, Math.sin(a) * r, 0.8 + rand() * 0.6);
  }

  // rain tree: wide umbrella canopy made of leaf cards (alpha-tested leaf texture)
  const leafTex = texture(canvas(256, 256, (g) => {
    for (let i = 0; i < 140; i++) {
      const x = 20 + rand() * 216, y = 20 + rand() * 216;
      g.save(); g.translate(x, y); g.rotate(rand() * 6.28);
      const l = 26 + rand() * 30;
      const k = rand();
      g.fillStyle = `rgb(${Math.floor(40 + 50 * k)},${Math.floor(78 + 60 * k)},${Math.floor(24 + 26 * k)})`;
      g.beginPath(); g.ellipse(0, 0, l / 2, l / 6.5, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(20,40,10,0.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-l / 2, 0); g.lineTo(l / 2, 0); g.stroke();
      g.restore();
    }
  }));
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3c30, roughness: 0.95 });
  const blob = (x: number, y: number, z: number, s: number, sy = 0.55) => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 0.85 + rand() * 0.3;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    g.scale(s, s * sy, s);
    g.translate(x, y, z);
    return g;
  };
  void blob;
  const cards: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 46; i++) {
    // points inside a flattened dome
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 4.6;
    const y = 6.4 + (1 - r / 4.6) * 2.2 * rand() + rand() * 0.8;
    const c = new THREE.PlaneGeometry(2.8, 2.8);
    c.rotateX(-Math.PI / 2 + (rand() - 0.5) * 1.2);
    c.rotateY(rand() * Math.PI);
    c.translate(Math.cos(a) * r, y, Math.sin(a) * r);
    // normals point out of the canopy so it lights like a volume, not like flat cards
    const n = c.attributes.normal, p = c.attributes.position;
    for (let k = 0; k < n.count; k++) {
      const v = new THREE.Vector3(p.getX(k), (p.getY(k) - 6.2) * 1.6, p.getZ(k)).normalize();
      n.setXYZ(k, v.x, v.y, v.z);
    }
    cards.push(c);
  }
  const treeLeaves = mergeGeometries(cards);
  const treeTrunk = mergeGeometries([
    new THREE.CylinderGeometry(0.28, 0.45, 6, 8).translate(0, 3, 0),
    new THREE.CylinderGeometry(0.14, 0.24, 3.4, 6).rotateZ(0.7).translate(1.1, 5.6, 0),
    new THREE.CylinderGeometry(0.14, 0.24, 3.2, 6).rotateZ(-0.7).translate(-1.1, 5.5, 0),
  ]);
  // palm: curved trunk and drooping fronds
  const palmCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 3, 0), new THREE.Vector3(0.9, 6, 0), new THREE.Vector3(1.4, 8.6, 0)]);
  const palmTrunk = new THREE.TubeGeometry(palmCurve, 12, 0.22, 7, false);
  const fronds: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.quadraticCurveTo(1.6, 0.55, 3.6, 0); shape.quadraticCurveTo(1.6, -0.55, 0, 0);
    const f = new THREE.ShapeGeometry(shape, 4);
    // droop: bend down along the frond
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setXYZ(k, x, -0.12 * x * x, p.getY(k)); }
    f.rotateY((i / 9) * Math.PI * 2 + rand() * 0.3);
    f.translate(1.4, 8.6, 0);
    fronds.push(f);
  }
  const palmLeaves = mergeGeometries(fronds);
  palmLeaves.computeVertexNormals();
  const frondMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
  // wind: leaves sway more the higher they are, each tree with its own phase
  const wind = { value: 0 };
  const sway = (mat: THREE.Material, base: number, amount: number) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = wind;
      sh.vertexShader = "uniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        float h = max(0.0, position.y - ${base.toFixed(1)});
        vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xyz;
        #endif
        float ph = ip.x * 0.13 + ip.z * 0.17;
        float gust = 0.6 + 0.4 * sin(uWind * 0.35 + ph * 0.5);
        transformed.x += sin(uWind * 1.7 + ph + position.z * 0.4) * ${amount.toFixed(3)} * h * gust;
        transformed.z += cos(uWind * 1.3 + ph + position.x * 0.4) * ${amount.toFixed(3)} * 0.8 * h * gust;
        transformed.y += sin(uWind * 3.1 + ph + position.x * 1.7) * ${amount.toFixed(3)} * 0.6 * h;`);
    };
  };
  sway(leafMat, 5, 0.045);
  sway(frondMat, 7.5, 0.11);
  const palmBark = new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.95 });

  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], tint?: () => THREE.Color) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => { im.setMatrixAt(i, m); if (tint) im.setColorAt(i, tint()); });
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
    return im;
  };
  const greens = () => new THREE.Color(0.75 + rand() * 0.3, 0.8 + rand() * 0.25, 0.7 + rand() * 0.2);
  instanced(treeLeaves, leafMat, trees, greens);
  instanced(treeTrunk, barkMat, trees);
  instanced(palmLeaves, frondMat, palms, () => new THREE.Color().setHSL(0.24 + rand() * 0.05, 0.55, 0.05 + rand() * 0.03));
  instanced(palmTrunk, palmBark, palms);

  // street lamps
  const pole = mergeGeometries([
    new THREE.CylinderGeometry(0.09, 0.13, 7, 8).translate(0, 3.5, 0),
    new THREE.BoxGeometry(0.1, 0.1, 1.6).translate(0, 6.95, 0.75),
  ]);
  const head = new THREE.BoxGeometry(0.5, 0.16, 0.8).translate(0, 6.85, 1.5);
  instanced(pole, darkMetal, lamps);
  const heads = instanced(head, lampGlow, lamps);
  heads.castShadow = false;
  // pools of warm light on the ground under each lamp (cheap stand-ins for real lights)
  const poolTex = texture(canvas(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,255,255,0.45)"); grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  }));
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: 0xffb769, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const poolGeo = new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2).translate(0, 0.12, 1.5);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, lamps.length);
  lamps.forEach((m, i) => pools.setMatrixAt(i, m));
  pools.renderOrder = 2;
  scene.add(pools);

  // ---------- my buildings
  type Building = { id: string; group: THREE.Group; top: number; href: string; accent: THREE.MeshStandardMaterial };
  const buildings: Building[] = [];
  const pickables: THREE.Object3D[] = [];

  const shapes: Record<string, (g: THREE.Group, acc: THREE.MeshStandardMaterial) => number> = {
    lab(g, acc) {
      g.add(block(30, 8.4, 16, F.lab.mat, roofMat, F.lab.tileW, F.lab.tileH));
      // glass entrance atrium
      const atrium = block(9, 7.6, 3, glass, roofMat);
      atrium.position.z = 9.4;
      g.add(atrium);
      const canopy = block(12, 0.4, 5, concrete, concrete, 10, 10, 7.6);
      canopy.position.z = 9.6;
      g.add(canopy);
      g.add(parapet(30.2, 16.2, 8.4, acc));
      // roof plant and solar panels
      for (let i = 0; i < 3; i++) { const u = block(3, 1.6, 2.4, metal, metal, 10, 10, 9.4); u.position.set(-10 + i * 4, 0, -4); g.add(u); }
      const panel = new THREE.MeshStandardMaterial({ color: 0x1b2a44, metalness: 0.6, roughness: 0.25 });
      for (let i = 0; i < 6; i++) {
        const p = mesh(new THREE.BoxGeometry(3.2, 0.08, 1.8), panel);
        p.position.set(2 + (i % 3) * 3.6, 10.1, 1.5 + Math.floor(i / 3) * 2.6);
        p.rotation.x = -0.25;
        g.add(p);
      }
      return 13;
    },
    tower(g, acc) {
      g.add(block(28, 7, 26, darkConcrete, roofMat, 10, 10));
      const podGlass = block(26, 5.6, 1, glass, glass);
      podGlass.position.z = 12.8;
      g.add(podGlass);
      g.add(block(17, 66, 17, F.tower.mat, roofMat, F.tower.tileW, F.tower.tileH, 7));
      g.add(parapet(17.4, 17.4, 73, acc, 3, 0.4));
      g.add(block(16.6, 0.4, 16.6, roofMat, roofMat, 10, 10, 73));
      g.add(block(11, 4, 11, darkMetal, darkMetal, 10, 10, 76));
      const mast = mesh(new THREE.CylinderGeometry(0.18, 0.3, 16, 8).translate(0, 88, 0), metal);
      g.add(mast);
      const beacon = mesh(new THREE.SphereGeometry(0.55, 12, 8).translate(0, 96.4, 0), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2020, emissiveIntensity: 4 }), false);
      beacon.userData.blink = true;
      g.add(beacon);
      return 98;
    },
    antenna(g, acc) {
      const shed = block(10, 4.2, 7, F.shed.mat, roofMat, F.shed.tileW, F.shed.tileH);
      shed.position.set(-7, 0, 5);
      g.add(shed);
      // lattice tower
      const H = 52;
      const parts: THREE.BufferGeometry[] = [];
      const leg = (x: number, z: number) => {
        const a = new THREE.Vector3(x * 3.2, 0, z * 3.2);
        const b = new THREE.Vector3(x * 0.8, H, z * 0.8);
        const len = a.distanceTo(b);
        const c = new THREE.CylinderGeometry(0.16, 0.22, len, 6);
        c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
        c.translate((a.x + b.x) / 2, len / 2 * ((b.y - a.y) / len), (a.z + b.z) / 2);
        parts.push(c);
      };
      leg(1, 1); leg(1, -1); leg(-1, 1); leg(-1, -1);
      const strut = (p: THREE.Vector3, q: THREE.Vector3) => {
        const len = p.distanceTo(q);
        const c = new THREE.CylinderGeometry(0.06, 0.06, len, 4);
        c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()));
        c.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
        parts.push(c);
      };
      const half = (y: number) => 3.2 - (2.4 * y) / H;
      for (let y = 0; y < H; y += 4) {
        const h0 = half(y), h1 = half(y + 4);
        const c0 = [[h0, h0], [h0, -h0], [-h0, -h0], [-h0, h0]];
        const c1 = [[h1, h1], [h1, -h1], [-h1, -h1], [-h1, h1]];
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          strut(new THREE.Vector3(c0[i][0], y, c0[i][1]), new THREE.Vector3(c1[j][0], y + 4, c1[j][1]));
          strut(new THREE.Vector3(c1[i][0], y + 4, c1[i][1]), new THREE.Vector3(c1[j][0], y + 4, c1[j][1]));
        }
      }
      const tower = mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xd9dde0, metalness: 0.7, roughness: 0.4 }));
      tower.position.set(4, 0, -3);
      g.add(tower);
      // antenna panels and dishes in the district colour
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = mesh(new THREE.BoxGeometry(0.5, 2.6, 0.25), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }));
        p.position.set(4 + Math.cos(a) * 1.3, H - 3, -3 + Math.sin(a) * 1.3);
        p.rotation.y = -a;
        g.add(p);
      }
      for (const [y, a] of [[34, 0.6], [40, 2.4], [28, 4.1]]) {
        const dish = mesh(new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, side: THREE.DoubleSide }));
        dish.rotation.set(Math.PI / 2, 0, a);
        dish.position.set(4 + Math.cos(a) * 1.6, y, -3 + Math.sin(a) * 1.6);
        g.add(dish);
      }
      const band = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.6, 12).translate(4, H - 6, -3), acc);
      g.add(band);
      const beacon = mesh(new THREE.SphereGeometry(0.45, 12, 8).translate(4, H + 0.6, -3), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2020, emissiveIntensity: 4 }), false);
      beacon.userData.blink = true;
      g.add(beacon);
      return H + 3;
    },
    workshop(g, acc) {
      const W = 32, D = 18, Hh = 8;
      g.add(block(W, Hh, D, corrugated, roofMat, 4, 4));
      // sawtooth roof: steep glass faces, sloped metal backs
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x0 = -W / 2 + (i * W) / n;
        const w = W / n;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(w, 0); shape.lineTo(w, 4); shape.lineTo(0, 0);
        const ex = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
        ex.translate(x0, Hh, -D / 2);
        g.add(mesh(ex, corrugated));
        const gl = block(0.15, 4, D - 0.2, glass, glass, 10, 10, Hh);
        gl.position.x = x0 + w - 0.1;
        g.add(gl);
      }
      // roller doors and an accent stripe
      for (let i = 0; i < 3; i++) {
        const door = block(5, 5.2, 0.3, new THREE.MeshStandardMaterial({ map: corrugatedTex, color: 0x9aa0a6, metalness: 0.5, roughness: 0.5 }), darkMetal);
        door.position.set(-10 + i * 8, 0, D / 2 + 0.1);
        g.add(door);
      }
      const stripe = block(W + 0.2, 0.8, D + 0.2, acc, acc, 10, 10, 6.6);
      g.add(stripe);
      const office = block(8, 6, 5, F.shed.mat, roofMat, F.shed.tileW, F.shed.tileH);
      office.position.set(W / 2 - 4, 0, D / 2 + 2.5);
      g.add(office);
      return 14;
    },
    studio(g, acc) {
      g.add(block(22, 18, 18, F.studio.mat, roofMat, F.studio.tileW, F.studio.tileH));
      g.add(parapet(22.2, 18.2, 18, acc));
      // LED wall with code on the front
      const code = canvas(512, 256, (c) => {
        c.fillStyle = "#05080f"; c.fillRect(0, 0, 512, 256);
        const cols = ["#e8648a", "#7fd6ca", "#c4aef5", "#f0c674", "#9cdcfe"];
        for (let y = 18; y < 250; y += 18) {
          let x = 16 + Math.floor(rand() * 3) * 24;
          while (x < 480) {
            const w = 20 + rand() * 90;
            c.fillStyle = cols[Math.floor(rand() * cols.length)];
            c.fillRect(x, y, Math.min(w, 496 - x), 8);
            x += w + 12;
            if (rand() < 0.25) break;
          }
        }
      });
      const screenTex = texture(code);
      screenTex.wrapS = screenTex.wrapT = THREE.ClampToEdgeWrapping;
      const screen = mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.3 }), false);
      screen.position.set(0, 11, 9.12);
      screen.userData.screen = true;
      g.add(screen);
      const frame = block(16.8, 8.8, 0.3, darkMetal, darkMetal, 10, 10, 6.6);
      frame.position.z = 9;
      g.add(frame);
      const entrance = block(8, 4.4, 2, glass, concrete);
      entrance.position.z = 9.8;
      g.add(entrance);
      return 21;
    },
    academy(g, acc) {
      // steps, main hall, colonnade and pediment
      for (let i = 0; i < 3; i++) g.add(block(30 - i * 1.2, 0.5, 22 - i * 1.2, concrete, concrete, 10, 10, i * 0.5));
      const hall = block(26, 11, 14, F.academy.mat, roofMat, F.academy.tileW, F.academy.tileH, 1.5);
      hall.position.z = -2;
      g.add(hall);
      const stone = new THREE.MeshStandardMaterial({ map: concreteTex, color: 0xf3ead8, roughness: 0.8 });
      for (let i = 0; i < 8; i++) {
        const col = mesh(new THREE.CylinderGeometry(0.55, 0.65, 10, 16).translate(-10.5 + i * 3, 6.5, 8), stone);
        g.add(col);
      }
      const cornice = block(27, 1.2, 20, stone, stone, 10, 10, 11.5);
      cornice.position.z = 0.5;
      g.add(cornice);
      const tri = new THREE.Shape();
      tri.moveTo(-14, 0); tri.lineTo(14, 0); tri.lineTo(0, 5); tri.lineTo(-14, 0);
      const ped = mesh(new THREE.ExtrudeGeometry(tri, { depth: 20, bevelEnabled: false }).translate(0, 12.7, -9.5), stone);
      g.add(ped);
      const tile = new THREE.MeshStandardMaterial({ color: 0x9c4a32, roughness: 0.7 });
      for (const s of [-1, 1]) {
        const roof = mesh(new THREE.BoxGeometry(15.2, 0.4, 20.6), tile);
        roof.position.set(s * 7, 15.2, 0.5);
        roof.rotation.z = -s * Math.atan2(5, 14);
        g.add(roof);
      }
      const medal = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 24).rotateX(Math.PI / 2).translate(0, 14.4, 10.6), acc);
      g.add(medal);
      return 20;
    },
  };

  districts.forEach((d) => {
    const a = (d.angle * Math.PI) / 180;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * RING, 0, Math.sin(a) * RING);
    const acc = accentMats[d.id];
    const top = shapes[d.shape](g, acc);
    g.lookAt(0, 0, 0); // front (+z) faces me
    g.traverse((o) => { o.userData.district = d.id; });
    // forecourt
    const court = flat(new THREE.PlaneGeometry(36, 30), paving, 0.03);
    court.position.set(g.position.x, 0.03, g.position.z);
    court.rotation.set(-Math.PI / 2, 0, Math.atan2(-Math.cos(a), -Math.sin(a)));
    (court.geometry.attributes.uv.array as Float32Array).forEach((_, i, arr) => { arr[i] *= 4; });
    scene.add(g);
    pickables.push(g);
    buildings.push({ id: d.id, group: g, top, href: d.href, accent: acc });
    buildingSpots.push({ x: g.position.x, z: g.position.z, r: 20 });
  });

  const beacons: THREE.MeshStandardMaterial[] = [];
  scene.traverse((o) => { if (o.userData.blink) beacons.push((o as THREE.Mesh).material as THREE.MeshStandardMaterial); });

  // ---------- the city around
  const cityParts: Record<string, THREE.BufferGeometry[]> = { city1: [], city2: [], city3: [] };
  const roofParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const r = 360 + rand() * 360;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const w = 12 + rand() * 20, d = 12 + rand() * 20;
    const tall = rand() < 0.25;
    const h = tall ? 40 + rand() * 70 : 9 + rand() * 24;
    const kind = tall ? (rand() < 0.8 ? "city1" : "city3") : (rand() < 0.5 ? "city2" : "city3");
    const f = F[kind as "city1"];
    const m = block(w, h, d, f.mat, roofMat, f.tileW, f.tileH);
    const geo = m.geometry.clone();
    geo.rotateY(rand() * Math.PI);
    geo.translate(x, 0, z);
    // keep only the side faces for the facade group, the roof faces go to the roof group
    const side = geo.clone();
    side.clearGroups();
    const idx = side.index!.array;
    const roofIdx: number[] = [];
    const sideIdx: number[] = [];
    for (let k = 0; k < idx.length; k += 3) (k >= 12 && k < 24 ? roofIdx : sideIdx).push(idx[k], idx[k + 1], idx[k + 2]);
    side.setIndex(sideIdx);
    const roof = geo.clone();
    roof.setIndex(roofIdx);
    cityParts[kind].push(side);
    roofParts.push(roof);
  }
  for (const [k, parts] of Object.entries(cityParts)) if (parts.length) scene.add(mesh(mergeGeometries(parts), F[k as "city1"].mat));
  scene.add(mesh(mergeGeometries(roofParts), roofMat));

  // ---------- parked cars
  const carShape = new THREE.Shape();
  carShape.moveTo(-2.2, 0.35); carShape.lineTo(2.2, 0.35); carShape.lineTo(2.25, 0.9); carShape.lineTo(1.9, 1.0);
  carShape.lineTo(0.9, 1.05); carShape.lineTo(0.4, 1.45); carShape.lineTo(-1.2, 1.45); carShape.lineTo(-1.9, 1.05); carShape.lineTo(-2.2, 0.95); carShape.lineTo(-2.2, 0.35);
  const carBody = new THREE.ExtrudeGeometry(carShape, { depth: 1.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }).translate(0, 0, -0.85);
  const winShape = new THREE.Shape();
  winShape.moveTo(0.85, 1.07); winShape.lineTo(0.38, 1.42); winShape.lineTo(-1.15, 1.42); winShape.lineTo(-1.8, 1.07); winShape.lineTo(0.85, 1.07);
  const carGlass = new THREE.ExtrudeGeometry(winShape, { depth: 1.76, bevelEnabled: false }).translate(0, 0.01, -0.88);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14).rotateX(Math.PI / 2);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const carGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x14202a, metalness: 0.5, roughness: 0.05, clearcoat: 1 });
  reflect(carGlassMat, 0.9);
  const paints = [0xf2f2f0, 0x1c1c1e, 0x8c949c, 0xa31d1d, 0x1d3f73, 0xc7c9cc];
  const makeCar = (color: number) => {
    const car = new THREE.Group();
    const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    reflect(paint, 0.6);
    car.add(mesh(carBody, paint));
    car.add(mesh(carGlass, carGlassMat));
    for (const [x, z] of [[1.4, 0.82], [1.4, -0.82], [-1.4, 0.82], [-1.4, -0.82]]) {
      const w = mesh(wheelGeo, tyre);
      w.position.set(x, 0.36, z);
      car.add(w);
    }
    return car;
  };
  districts.forEach((d, i) => {
    const a = (d.angle * Math.PI) / 180;
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    const n = new THREE.Vector2(-dir.y, dir.x);
    for (let k = 0; k < 2; k++) {
      const s = 24 + k * 6 + (i % 2) * 2;
      const car = makeCar(paints[(i * 2 + k) % paints.length]);
      const side = k % 2 ? 1 : -1;
      car.position.set(dir.x * s + n.x * side * 2.2, 0.05, dir.y * s + n.y * side * 2.2);
      car.rotation.y = -Math.atan2(dir.y, dir.x);
      scene.add(car);
    }
  });

  // ---------- me, and my robot
  const me = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a57f, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2aa198, roughness: 0.8 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2c3e57, roughness: 0.85 });
  for (const s of [-1, 1]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.11, 0.75, 4, 8).translate(s * 0.13, 0.5, 0), jeans);
    me.add(leg);
    const arm = mesh(new THREE.CapsuleGeometry(0.075, 0.6, 4, 8).translate(s * 0.32, 1.22, 0), shirt);
    me.add(arm);
  }
  me.add(mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 10).translate(0, 1.3, 0), shirt));
  me.add(mesh(new THREE.SphereGeometry(0.13, 16, 12).translate(0, 1.78, 0), skin));
  me.add(mesh(new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, 1.3).translate(0, 1.8, 0), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })));
  me.scale.setScalar(1.6);
  me.position.set(0, 0.2, 0);
  me.rotation.y = Math.PI / 4;
  scene.add(me);
  // a small stone island for me to stand on, inside the pool
  scene.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.2, 48).translate(0, 0.1, 0), paving));

  const robot = new THREE.Group();
  const chassis = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.4, roughness: 0.5 });
  robot.add(block(1.0, 0.32, 0.72, chassis, chassis, 10, 10, 0.2));
  const hat = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.5 });
  const hatBox = block(0.55, 0.32, 0.5, hat, hat, 10, 10, 0.52);
  robot.add(hatBox);
  robot.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12).translate(0.12, 0.94, 0), new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.6, roughness: 0.3 })));
  for (const [x, z] of [[0.33, 0.4], [0.33, -0.4], [-0.33, 0.4], [-0.33, -0.4]]) {
    const w = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14).rotateX(Math.PI / 2), tyre);
    w.position.set(x, 0.18, z);
    robot.add(w);
  }
  const headlight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 0 });
  night.lamps.push(headlight);
  for (const z of [0.22, -0.22]) { const l = mesh(new THREE.BoxGeometry(0.03, 0.06, 0.1), headlight, false); l.position.set(0.51, 0.38, z); robot.add(l); }
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x2ee6c4, emissive: 0x2ee6c4, emissiveIntensity: 2 });
  robot.add(mesh(new THREE.BoxGeometry(0.56, 0.03, 0.51).translate(0, 0.68, 0), ledMat, false));
  robot.scale.setScalar(2.2);
  scene.add(robot);

  // a little traffic on the roundabout
  const traffic = [0, 1].map((i) => ({ car: makeCar(paints[i * 3 + 1]), t: i * Math.PI }));
  traffic.forEach(({ car }) => scene.add(car));

  // ---------- rain
  const RAIN = small ? 2500 : 6000;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN * 6);
  for (let i = 0; i < RAIN; i++) {
    const x = (rand() - 0.5) * 220, y = rand() * 90, z = (rand() - 0.5) * 220;
    rainPos.set([x, y, z, x + 0.15, y - 1.4, z + 0.1], i * 6);
  }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.35, depthWrite: false });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);

  // ---------- dust floating in the sunlight
  const DUST = small ? 500 : 1400;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustPos.set([(rand() - 0.5) * 160, rand() * 45, (rand() - 0.5) * 160], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ map: poolTex, color: 0xffe2b8, size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---------- post-processing
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: small ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = small ? null : new GTAOPass(scene, camera, 1, 1);
  if (gtao) {
    gtao.blendIntensity = 0.9;
    gtao.updateGtaoMaterial({ radius: 2.5, distanceExponent: 1.5, thickness: 2, scale: 1 });
    composer.addPass(gtao);
  }
  const sunFx = sunPass();
  composer.addPass(sunFx);
  // depth of field: only a gentle softening of the far skyline (strong blur makes it look like a miniature)
  const dof = small ? null : new BokehPass(scene, camera, { focus: 200, aperture: 0.000005, maxblur: 0.002 });
  if (dof) composer.addPass(dof);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = gradePass();
  composer.addPass(grade);

  // ---------- weather and time of day
  const weather = { code: Number(home.dataset.wcode ?? 2), rain: Number(home.dataset.wrain ?? 0) };
  const onWeather = () => { weather.code = Number(home.dataset.wcode ?? weather.code); weather.rain = Number(home.dataset.wrain ?? 0); applySky(true); };
  home.addEventListener("weather", onWeather);
  const forced = params.get("weather"); // ?weather=rain|clear|cloudy for previews
  const sunDir = new THREE.Vector3();
  const sunFxK = { rays: 0, flare: 0 };
  let lastEnvSun = new THREE.Vector3(9, 9, 9);
  let nightK = 0;
  let wet = 0;

  function applySky(forceEnv = false) {
    const lat = Number(home.dataset.lat ?? RAWANG.lat), lon = Number(home.dataset.lon ?? RAWANG.lon);
    sunDir.copy(sunPosition(now(), lat, lon));
    const alt = Math.asin(sunDir.y);
    const code = forced === "rain" ? 63 : forced === "clear" ? 0 : forced === "cloudy" ? 3 : weather.code;
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    const overcast = code === 3 || code === 45 || code === 48 || rainy;
    const cloud = code === 0 ? 0.3 : code <= 2 ? 0.5 : overcast ? 0.85 : 0.6;

    for (const u of [skyU, envSky.material.uniforms]) {
      u.sunPosition.value.copy(sunDir);
      u.turbidity.value = overcast ? 9 : 4;
      u.rayleigh.value = overcast ? 1.2 : 2.2;
      u.mieCoefficient.value = overcast ? 0.02 : 0.006;
      u.cloudCoverage.value = cloud;
      u.cloudDensity.value = overcast ? 0.75 : 0.45;
    }
    nightK = smooth(0.06, -0.14, alt);
    const day = 1 - nightK;
    const golden = smooth(0.45, 0.04, alt) * day;

    sun.position.copy(sunDir).multiplyScalar(250);
    sun.intensity = (overcast ? 2.6 : 5) * smooth(-0.03, 0.12, alt);
    sun.color.setHSL(0.09 + 0.04 * (1 - golden), 0.9 * golden + 0.1, 0.62 + 0.3 * (1 - golden));
    sun.castShadow = sun.intensity > 0.05;
    moon.intensity = 0.55 * nightK;
    moon.castShadow = nightK > 0.6;
    hemi.intensity = 0.08 + 0.22 * day;
    hemi.color.setHSL(0.6, 0.5, 0.25 + 0.55 * day);
    hemi.groundColor.setHSL(0.25, 0.25, 0.08 + 0.2 * day);
    starMat.opacity = overcast ? nightK * 0.15 : nightK * 0.9;
    scene.environmentIntensity = 0.03 + 0.09 * day;
    const reflectK = 0.12 + 0.5 * day;
    reflective.forEach(({ mat, k }) => { mat.envMapIntensity = k * reflectK; });

    // haze colour = the sky at the horizon (with a little night glow from the city)
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(sampleHorizon()).lerp(new THREE.Color(0x0b1322).multiplyScalar(0.25), nightK * 0.6);
    fog.density = (overcast ? 0.0009 : 0.00075) + (rainy ? 0.001 : 0); // humid air: the skyline fades out
    renderer.toneMappingExposure = (overcast ? 0.36 : 0.42) + 0.3 * golden + 0.6 * nightK; // like a camera's auto-exposure

    // lights on at dusk
    const lights = smooth(0.12, -0.04, alt) + (overcast ? 0.15 : 0);
    night.windows.forEach((m) => { m.emissiveIntensity = 0.9 * Math.min(1, lights); });
    night.lamps.forEach((m) => { m.emissiveIntensity = 6 * Math.min(1, lights); });
    poolMat.opacity = 0.55 * Math.min(1, lights);
    // only real light sources glow: daylight surfaces stay below the threshold
    bloom.strength = 0.15 + 0.45 * nightK;
    bloom.threshold = 4 - 3.2 * nightK;

    // golden light makes the air glow; sun effects only when the sun is up and the sky is clear
    sunFxK.rays = day * (overcast ? 0.15 : 0.55 + 0.9 * golden);
    sunFxK.flare = day * (overcast ? 0 : 0.7);
    (sunFx.uniforms.tint.value as THREE.Color).setRGB(1, 0.78 + 0.15 * (1 - golden), 0.5 + 0.35 * (1 - golden));
    dustMat.opacity = day * (overcast ? 0.15 : 0.35 + 0.5 * golden);
    rain.visible = rainy;
    wet = rainy ? 1 : 0;
    asphalt.roughness = road.roughness = 1 - 0.55 * wet;
    paving.roughness = 0.75 - 0.4 * wet;
    home.dataset.sky = nightK > 0.5 ? "night" : golden > 0.4 ? "golden" : "day";
    // the site theme follows the sky unless the visitor picked one
    let saved: string | null = null;
    try { saved = localStorage.getItem("theme"); } catch { /* storage blocked */ }
    if (!saved && !params.get("theme")) document.documentElement.dataset.theme = nightK > 0.5 ? "dark" : "light";

    if (forceEnv || sunDir.distanceTo(lastEnvSun) > 0.01) {
      lastEnvSun = sunDir.clone();
      envRT?.dispose();
      envRT = pmrem.fromScene(envScene, 0, 0.1, 1000);
      scene.environment = envRT.texture;
      reflective.forEach(({ mat }) => { const first = !mat.envMap; mat.envMap = envRT!.texture; if (first) mat.needsUpdate = true; });
    }
  }
  applySky(true);
  const skyTimer = setInterval(() => applySky(), 30000);

  // ---------- size, view offset (text on the left on wide screens)
  function resize() {
    const w = stage.clientWidth || innerWidth;
    const h = stage.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    gtao?.setSize(w, h);
    sunFx.uniforms.aspect.value = w / h;
    grade.uniforms.resolution.value.set(w, h);
    camera.aspect = w / h;
    if (wide()) camera.setViewOffset(w, h, -w * 0.2, h * 0.02, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // ---------- labels (HTML, positioned every frame)
  const labelRoot = stage.querySelector<HTMLElement>("[data-w3-tags]");
  const tagEls = new Map<string, HTMLElement>();
  labelRoot?.querySelectorAll<HTMLElement>("[data-d]").forEach((el) => tagEls.set(el.dataset.d!, el));
  const meTag = labelRoot?.querySelector<HTMLElement>("[data-me]");
  if (labelRoot) labelRoot.hidden = false;
  const tmp = new THREE.Vector3();
  const placeTag = (el: HTMLElement | null | undefined, p: THREE.Vector3) => {
    if (!el) return;
    tmp.copy(p).project(camera);
    const vis = tmp.z < 1;
    el.style.opacity = vis ? "" : "0";
    el.style.transform = `translate(${((tmp.x + 1) / 2) * cvs.clientWidth}px, ${((1 - tmp.y) / 2) * cvs.clientHeight}px)`;
  };

  // ---------- hover and click
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hovered: string | null = null;
  let downAt: { x: number; y: number } | null = null;
  const setHover = (id: string | null) => {
    if (id === hovered) return;
    hovered = id;
    buildings.forEach((b) => { b.accent.emissiveIntensity = b.id === id ? 0.9 : 0; });
    tagEls.forEach((el, k) => el.classList.toggle("hl", k === id));
    cvs.style.cursor = id ? "pointer" : "";
  };
  const pick = (e: PointerEvent) => {
    const r = cvs.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    return (hit?.object.userData.district as string) ?? null;
  };
  const onMove = (e: PointerEvent) => { if (!downAt) setHover(pick(e)); };
  const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    const moved = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 99;
    downAt = null;
    if (moved > 6) return;
    const id = pick(e);
    const b = buildings.find((x) => x.id === id);
    if (b) navigate(opts.baseUrl(b.href));
  };
  cvs.addEventListener("pointermove", onMove);
  cvs.addEventListener("pointerdown", onDown);
  cvs.addEventListener("pointerup", onUp);
  tagEls.forEach((el, id) => {
    el.addEventListener("pointerenter", () => setHover(id));
    el.addEventListener("pointerleave", () => setHover(null));
  });

  // ---------- HUD buttons and compass
  const orbitBtn = home.querySelector<HTMLButtonElement>("[data-view=orbit]");
  const setOrbit = (on: boolean) => {
    controls.autoRotate = on;
    orbitBtn?.setAttribute("aria-pressed", String(on));
    home.classList.toggle("orbiting", on);
  };
  setOrbit(controls.autoRotate);
  const zoomTo = (k: number) => {
    const off = camera.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(off.length() * k, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(off.setLength(len));
  };
  let flyHome = 0;
  const onButton = (e: Event) => {
    const action = (e.currentTarget as HTMLElement).dataset.view;
    if (action === "in") zoomTo(0.8);
    if (action === "out") zoomTo(1.25);
    if (action === "home") flyHome = 1;
    if (action === "orbit") setOrbit(!controls.autoRotate);
  };
  const buttons = [...home.querySelectorAll<HTMLButtonElement>("[data-view]")];
  buttons.forEach((b) => b.addEventListener("click", onButton));
  controls.addEventListener("start", () => { flyHome = 0; });
  const compass = home.querySelector<HTMLElement>(".compass svg");

  // ---------- loop
  const clock = new THREE.Timer();
  let robotT = 0;
  let frame = 0;
  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(stage);
  const meAnchor = new THREE.Vector3(0, 6.5, 0);
  const tagAnchor = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const sunScreen = new THREE.Vector3();

  function loop() {
    frame = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    clock.update();
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.getElapsed();

    if (flyHome > 0) {
      flyHome = Math.max(0, flyHome - dt * 1.2);
      camera.position.lerp(HOME_POS, 0.08);
      controls.target.lerp(HOME_TARGET, 0.08);
    }
    controls.update(dt);

    // robot on the roundabout, cars a little faster the other way
    robotT += dt * (opts.reducedMotion ? 0 : 0.11);
    const rr = 14.6;
    robot.position.set(Math.cos(robotT) * rr, 0.05, Math.sin(robotT) * rr);
    robot.rotation.y = Math.atan2(-Math.cos(robotT), -Math.sin(robotT));
    traffic.forEach((c, i) => {
      c.t -= dt * (opts.reducedMotion ? 0 : 0.16);
      const r = 17.6;
      const a = c.t + i * Math.PI;
      c.car.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
      c.car.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
    });
    // blinking beacons
    beacons.forEach((m) => { m.emissiveIntensity = Math.sin(t * 3) > 0.2 ? 5 : 0.2; });
    skyU.time.value = t;
    wind.value = t;
    grade.uniforms.time.value = t;
    // dust drifts slowly around where the camera looks
    dust.position.set(controls.target.x, 0, controls.target.z);
    dust.rotation.y = t * 0.01;
    // where is the sun on screen? (drives the light shafts and the flare)
    sunScreen.copy(sunDir).multiplyScalar(2000).add(camera.position).project(camera);
    const facing = sunDir.dot(camera.getWorldDirection(fwd)) > 0 && sunScreen.z < 1;
    const onScreen = facing ? 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(sunScreen.x), Math.abs(sunScreen.y)), 1.0, 1.8) : 0;
    sunFx.uniforms.sun.value.set((sunScreen.x + 1) / 2, (sunScreen.y + 1) / 2);
    sunFx.uniforms.rays.value = sunFxK.rays * onScreen;
    sunFx.uniforms.flare.value = sunFxK.flare * (facing && Math.abs(sunScreen.x) < 1 && Math.abs(sunScreen.y) < 1 ? 1 : 0);
    if (dof) (dof.uniforms as Record<string, THREE.IUniform>).focus.value = camera.position.distanceTo(controls.target);
    if (rain.visible) {
      rain.position.set(controls.target.x, 0, controls.target.z);
      const p = rainGeo.attributes.position as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < RAIN; i++) {
        const k = i * 6;
        arr[k + 1] -= dt * 38; arr[k + 4] -= dt * 38;
        if (arr[k + 4] < 0) { const y = 80 + rand() * 10; arr[k + 1] = y; arr[k + 4] = y - 1.4; }
      }
      p.needsUpdate = true;
    }

    // labels and compass
    buildings.forEach((b) => placeTag(tagEls.get(b.id), tagAnchor.set(0, b.top + 4, 0).applyMatrix4(b.group.matrixWorld)));
    placeTag(meTag, meAnchor);
    camera.getWorldDirection(fwd);
    if (compass) compass.style.transform = `rotate(${(Math.atan2(fwd.x * -1 - fwd.z * 0, -fwd.z) * 180) / Math.PI}deg)`;

    composer.render(dt);
  }
  loop();
  home.classList.add("w3-ready");
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__w3 = { renderer, scene, sun, camera, sky };

  return () => {
    cancelAnimationFrame(frame);
    clearInterval(skyTimer);
    ro.disconnect();
    io.disconnect();
    home.removeEventListener("weather", onWeather);
    buttons.forEach((b) => b.removeEventListener("click", onButton));
    controls.dispose();
    composer.dispose();
    pmrem.dispose();
    envRT?.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
        mat.dispose();
      });
    });
    renderer.dispose();
    cvs.remove();
    if (labelRoot) labelRoot.hidden = true;
    home.classList.remove("w3-ready");
  };
}
