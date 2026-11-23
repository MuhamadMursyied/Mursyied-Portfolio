// Shared building blocks for the 3D pages: procedural textures, materials, facades,
// trees, palms, street lamps, cars, people and robots. Nothing here touches the renderer.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ---------------------------------------------------------------- small helpers
export function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = mulberry(7);
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return c;
}
export function texture(c: HTMLCanvasElement, color = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
export function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, amount: number, size: number, light = 255, alpha = 0.08) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < amount; i++) {
    const v = rand() < 0.5 ? 0 : light;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    const s = size * (0.3 + rand());
    g.fillRect(rand() * w, rand() * h, s, s);
  }
}

// A box standing on y = y0 whose UVs are in metres / tile size, so facades never stretch.
export function block(w: number, h: number, d: number, side: THREE.Material, top: THREE.Material, tileW = 10, tileH = 10, y0 = 0) {
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
export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
// a thin cylinder from p to q (struts, poles, cables)
export function rod(p: THREE.Vector3, q: THREE.Vector3, r: number, seg = 6) {
  const len = p.distanceTo(q);
  const c = new THREE.CylinderGeometry(r, r, len, seg);
  c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()));
  c.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  return c;
}

// ---------------------------------------------------------------- facades
// One texture tile = 8 bays x 8 floors. Roughness lives in G and metalness in B (three's convention).
export type FacadeStyle = "curtain" | "ribbon" | "punched";
export type Facade = { mat: THREE.MeshStandardMaterial; tileW: number; tileH: number };

export function facade(style: FacadeStyle, opts: { wall: string; frame?: string; glass?: string; bay?: number; floor?: number; lit?: number; seed?: number }): Facade {
  const cols = 8, rows = 8, P = 64;
  const W = cols * P, H = rows * P;
  const r = mulberry(opts.seed ?? 3);
  const glass = opts.glass ?? "#26394a";
  const frame = opts.frame ?? "#9aa3ab";
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
        if (r() < 0.35) { g.fillStyle = "rgba(220,225,230,0.18)"; g.fillRect(x, y, w, h * (0.2 + r() * 0.5)); }
        if (style !== "curtain") { g.fillStyle = frame; g.fillRect(x, y + h - 2, w, 3); }
      }
    if (style === "ribbon") for (let cx = 1; cx < cols; cx++) { g.fillStyle = frame; g.fillRect(cx * P - 1, 0, 2, H); }
  });
  const rm = canvas(W, H, (g) => {
    g.fillStyle = style === "curtain" ? "rgb(0,110,200)" : "rgb(0,225,0)";
    g.fillRect(0, 0, W, H);
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        const [x, y, w, h] = win(cx * P, cy * P);
        g.fillStyle = `rgb(0,${12 + Math.floor(r() * 14)},255)`;
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
  return { mat, tileW: cols * (opts.bay ?? 3), tileH: rows * (opts.floor ?? 3.6) };
}

// ---------------------------------------------------------------- the kit
export type Kit = ReturnType<typeof createKit>;

export function createKit() {
  // registries the engine drives with the time of day
  const reflective: { mat: THREE.MeshStandardMaterial; k: number }[] = [];
  const reflect = <T extends THREE.MeshStandardMaterial>(mat: T, k: number) => { reflective.push({ mat, k }); return mat; };
  const night = { windows: [] as THREE.MeshStandardMaterial[], lamps: [] as THREE.MeshStandardMaterial[] };
  const lightUp = <T extends THREE.MeshStandardMaterial>(mat: T) => { night.lamps.push(mat); return mat; };

  // ---------- ground textures
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
  const asphalt = reflect(new THREE.MeshStandardMaterial({ map: texture(canvas(512, 512, (g) => asphaltPaint(g, 512, 512))), roughnessMap: texture(canvas(512, 512, (g) => roughPaint(g, 512, 512)), false), roughness: 1 }), 0.7);
  const roadTex = texture(canvas(256, 512, (g) => {
    asphaltPaint(g, 256, 512);
    g.fillStyle = "#e9e6dc";
    g.fillRect(10, 0, 5, 512);
    g.fillRect(241, 0, 5, 512);
    g.fillStyle = "#e8c95a";
    for (let y = 0; y < 512; y += 128) g.fillRect(125, y, 6, 72);
  }));
  const road = reflect(new THREE.MeshStandardMaterial({ map: roadTex, roughnessMap: texture(canvas(256, 512, (g) => roughPaint(g, 256, 512)), false), roughness: 1 }), 0.7);
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
  const stone = new THREE.MeshStandardMaterial({ map: concreteTex, color: 0xf3ead8, roughness: 0.8 });
  // laterite: the red-brown earth of estate roads
  const dirt = new THREE.MeshStandardMaterial({ map: texture(canvas(256, 256, (g) => {
    speckle(g, 256, 256, "#8a5a3c", 7000, 3, 255, 0.12);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "60,36,22" : "150,110,80"},0.22)`; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 10 + rand() * 30, 6 + rand() * 14, rand() * 3, 0, 7); g.fill(); }
    // tyre ruts
    g.fillStyle = "rgba(50,30,18,0.35)"; g.fillRect(60, 0, 18, 256); g.fillRect(178, 0, 18, 256);
  })), roughness: 0.96 });
  // estate floor: dry fronds and shade under the palms
  const estateFloor = new THREE.MeshStandardMaterial({ map: texture(canvas(512, 512, (g) => {
    speckle(g, 512, 512, "#4f5a2a", 12000, 3, 255, 0.12);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(${rand() < 0.6 ? "120,96,52" : "70,62,30"},0.55)`; g.lineWidth = 1 + rand() * 2;
      const x = rand() * 512, y = rand() * 512, a = rand() * 6.28, l = 14 + rand() * 30;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  })), roughness: 0.97 });
  // paddy: water between rows of young rice
  const paddy = reflect(new THREE.MeshStandardMaterial({ map: texture(canvas(256, 256, (g) => {
    g.fillStyle = "#4b5a3c"; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) { g.fillStyle = "#6f9a3a"; g.fillRect(x + 3, 0, 8, 256); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "140,180,70" : "40,60,30"},0.3)`; g.fillRect(rand() * 256, rand() * 256, 1, 3); }
  })), roughnessMap: texture(canvas(256, 256, (g) => {
    g.fillStyle = "rgb(0,40,0)"; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) { g.fillStyle = "rgb(0,230,0)"; g.fillRect(x + 3, 0, 8, 256); }
  }), false), roughness: 1 }), 0.8);

  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bec4, metalness: 0.85, roughness: 0.35 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2b2f34, metalness: 0.6, roughness: 0.45 });
  const glass = reflect(new THREE.MeshPhysicalMaterial({ color: 0x6f8797, metalness: 0.9, roughness: 0.04, clearcoat: 1 }), 1);
  const corrugatedTex = texture(canvas(128, 128, (g) => {
    for (let x = 0; x < 128; x += 8) {
      const grad = g.createLinearGradient(x, 0, x + 8, 0);
      grad.addColorStop(0, "#b7bcc0"); grad.addColorStop(0.5, "#e3e6e8"); grad.addColorStop(1, "#9ea4a9");
      g.fillStyle = grad; g.fillRect(x, 0, 8, 128);
    }
  }));
  const corrugated = new THREE.MeshStandardMaterial({ map: corrugatedTex, metalness: 0.55, roughness: 0.45 });
  const water = reflect(new THREE.MeshPhysicalMaterial({ color: 0x1d4a5a, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92 }), 0.9);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const plastic = (color: number, rough = 0.5) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
  const glow = (color: number, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });

  const lampGlow = lightUp(new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc777, emissiveIntensity: 0 }));

  const F = {
    tower: facade("curtain", { wall: "#7d8a96", frame: "#8a96a0", glass: "#2f4d63", lit: 0.3, seed: 11 }),
    lab: facade("ribbon", { wall: "#cfcac1", frame: "#cfd4d8", glass: "#24404f", floor: 4.2, lit: 0.5, seed: 12 }),
    studio: facade("ribbon", { wall: "#3b3f46", frame: "#555b63", glass: "#2a3f52", floor: 4, lit: 0.6, seed: 13 }),
    academy: facade("punched", { wall: "#d9ccb0", frame: "#f4eee2", glass: "#2c3c48", bay: 3.4, floor: 4.2, lit: 0.35, seed: 14 }),
    shed: facade("punched", { wall: "#cfd2cf", frame: "#e8e8e8", glass: "#2c3c48", bay: 4, floor: 4, lit: 0.3, seed: 15 }),
    school: facade("punched", { wall: "#e8dfcf", frame: "#7a5a3a", glass: "#2c3c48", bay: 3.6, floor: 3.6, lit: 0.3, seed: 16 }),
    city1: facade("curtain", { wall: "#6c7a84", frame: "#77838c", glass: "#334b5c", lit: 0.25, seed: 21 }),
    city2: facade("punched", { wall: "#958c7f", frame: "#ece6da", glass: "#2b3843", floor: 3.2, lit: 0.3, seed: 22 }),
    city3: facade("ribbon", { wall: "#7f868b", frame: "#dde1e3", glass: "#27404f", floor: 3.4, lit: 0.35, seed: 23 }),
  };
  Object.values(F).forEach((f) => night.windows.push(f.mat));
  [F.tower, F.city1].forEach((f) => reflect(f.mat, 1));
  [F.lab, F.studio, F.city3, F.academy, F.shed, F.city2, F.school].forEach((f) => reflect(f.mat, 0.8));

  // soft round dot: lamp light pools, dust, signal glows
  const dotTex = texture(canvas(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,255,255,0.45)"); grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  }));

  // ---------- trees and palms (instanced, placed by the page, built by flush())
  const lists = { trees: [] as THREE.Matrix4[], palms: [] as THREE.Matrix4[], oilPalms: [] as THREE.Matrix4[], lamps: [] as THREE.Matrix4[] };
  const place = (list: THREE.Matrix4[], x: number, z: number, s = 1, rotY = rand() * 6.28, y = 0) =>
    list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(s, s, s)));

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
  const cards: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 46; i++) {
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
  // coconut palm: slim curved trunk and drooping fronds
  const palmCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 3, 0), new THREE.Vector3(0.9, 6, 0), new THREE.Vector3(1.4, 8.6, 0)]);
  const palmTrunk = new THREE.TubeGeometry(palmCurve, 12, 0.22, 7, false);
  const frondSet = (n: number, len: number, droop: number, at: THREE.Vector3, width = 0.55) => {
    const out: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.quadraticCurveTo(len * 0.45, width, len, 0); shape.quadraticCurveTo(len * 0.45, -width, 0, 0);
      const f = new THREE.ShapeGeometry(shape, 4);
      const p = f.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setXYZ(k, x, -droop * x * x + (i % 2 ? 0.25 : 0) * x, p.getY(k)); }
      f.rotateY((i / n) * Math.PI * 2 + rand() * 0.3);
      f.translate(at.x, at.y, at.z);
      out.push(f);
    }
    const g = mergeGeometries(out);
    g.computeVertexNormals();
    return g;
  };
  const palmLeaves = frondSet(9, 3.6, 0.12, new THREE.Vector3(1.4, 8.6, 0));
  // oil palm (estates): thick straight trunk with frond bases, a dense dark crown of long fronds
  const oilTrunk = mergeGeometries([
    new THREE.CylinderGeometry(0.42, 0.55, 6, 9).translate(0, 3, 0),
    ...Array.from({ length: 14 }, (_, i) => new THREE.BoxGeometry(0.16, 0.5, 0.3).rotateZ(0.6).rotateY((i / 14) * 6.28 * 2.3).translate(Math.cos((i / 14) * 6.28 * 2.3) * 0.45, 1.5 + i * 0.32, Math.sin((i / 14) * 6.28 * 2.3) * 0.45)),
  ]);
  const oilLeaves = frondSet(18, 5.2, 0.075, new THREE.Vector3(0, 6.2, 0), 0.7);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
  const palmBark = new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.95 });
  const oilBark = new THREE.MeshStandardMaterial({ color: 0x5d5342, roughness: 0.97 });

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
    mat.customProgramCacheKey = () => `sway-${base}-${amount}`;
  };
  sway(leafMat, 5, 0.045);
  sway(frondMat, 5.5, 0.1);

  const pole = mergeGeometries([
    new THREE.CylinderGeometry(0.09, 0.13, 7, 8).translate(0, 3.5, 0),
    new THREE.BoxGeometry(0.1, 0.1, 1.6).translate(0, 6.95, 0.75),
  ]);
  const lampHead = new THREE.BoxGeometry(0.5, 0.16, 0.8).translate(0, 6.85, 1.5);
  const poolMat = new THREE.MeshBasicMaterial({ map: dotTex, color: 0xffb769, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

  const instanced = (scene: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], tint?: () => THREE.Color, shadow = true) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => { im.setMatrixAt(i, m); if (tint) im.setColorAt(i, tint()); });
    im.castShadow = shadow;
    im.receiveShadow = true;
    scene.add(im);
    return im;
  };
  // build every placed tree, palm and lamp as instanced meshes
  const flush = (scene: THREE.Object3D) => {
    const greens = () => new THREE.Color(0.75 + rand() * 0.3, 0.8 + rand() * 0.25, 0.7 + rand() * 0.2);
    instanced(scene, treeLeaves, leafMat, lists.trees, greens);
    instanced(scene, treeTrunk, barkMat, lists.trees);
    instanced(scene, palmLeaves, frondMat, lists.palms, () => new THREE.Color().setHSL(0.24 + rand() * 0.05, 0.55, 0.05 + rand() * 0.03));
    instanced(scene, palmTrunk, palmBark, lists.palms);
    instanced(scene, oilLeaves, frondMat, lists.oilPalms, () => new THREE.Color().setHSL(0.26 + rand() * 0.04, 0.6, 0.035 + rand() * 0.02));
    instanced(scene, oilTrunk, oilBark, lists.oilPalms);
    instanced(scene, pole, darkMetal, lists.lamps);
    instanced(scene, lampHead, lampGlow, lists.lamps, undefined, false);
    const pools = instanced(scene, new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2).translate(0, 0.12, 1.5), poolMat, lists.lamps, undefined, false);
    if (pools) { pools.renderOrder = 2; pools.receiveShadow = false; }
  };

  // ---------- flat pieces on the ground (roads, plazas, fields)
  const flat = (scene: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    if (geo.type === "RingGeometry" || geo.type === "CircleGeometry") {
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 26, p.getY(i) / 26);
    }
    const m = mesh(geo, mat, false);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    scene.add(m);
    return m;
  };
  // a ribbon road along a curve, textured along its length
  const ribbon = (scene: THREE.Object3D, curve: THREE.Curve<THREE.Vector3>, width: number, mat: THREE.Material, y = 0.05, tile = 16, steps = 400) => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let dist = 0;
    let prev = curve.getPointAt(0);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const p = curve.getPointAt(u);
      dist += p.distanceTo(prev);
      prev = p;
      const t = curve.getTangentAt(u);
      const n = new THREE.Vector3(-t.z, 0, t.x).normalize().multiplyScalar(width / 2);
      pos.push(p.x - n.x, y, p.z - n.z, p.x + n.x, y, p.z + n.z);
      uv.push(0, dist / tile, 1, dist / tile);
      if (i < steps) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = mesh(g, mat, false);
    scene.add(m);
    return m;
  };

  // a thin coloured parapet around a roof
  const parapet = (w: number, d: number, y: number, mat: THREE.Material, h = 0.9, t = 0.35) => {
    const g = new THREE.Group();
    for (const [bw, bd, x, z] of [[w, t, 0, d / 2 - t / 2], [w, t, 0, -d / 2 + t / 2], [t, d, w / 2 - t / 2, 0], [t, d, -w / 2 + t / 2, 0]]) {
      const b = block(bw, h, bd, mat, mat, 10, 10, y);
      b.position.set(x, 0, z);
      g.add(b);
    }
    return g;
  };
  const beacon = (x: number, y: number, z: number, r = 0.5) => {
    const b = mesh(new THREE.SphereGeometry(r, 12, 8).translate(x, y, z), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2020, emissiveIntensity: 4 }), false);
    b.userData.blink = true;
    return b;
  };
  // a screen whose picture is drawn on a canvas (always glowing)
  const screen = (w: number, h: number, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void, intensity = 1.1) => {
    const W = 512, H = Math.round((512 * h) / w);
    const t = texture(canvas(W, H, (g) => draw(g, W, H)));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: intensity, roughness: 0.3 }), false);
  };

  // ---------- cars
  const carShape = new THREE.Shape();
  carShape.moveTo(-2.2, 0.35); carShape.lineTo(2.2, 0.35); carShape.lineTo(2.25, 0.9); carShape.lineTo(1.9, 1.0);
  carShape.lineTo(0.9, 1.05); carShape.lineTo(0.4, 1.45); carShape.lineTo(-1.2, 1.45); carShape.lineTo(-1.9, 1.05); carShape.lineTo(-2.2, 0.95); carShape.lineTo(-2.2, 0.35);
  const carBody = new THREE.ExtrudeGeometry(carShape, { depth: 1.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }).translate(0, 0, -0.85);
  const winShape = new THREE.Shape();
  winShape.moveTo(0.85, 1.07); winShape.lineTo(0.38, 1.42); winShape.lineTo(-1.15, 1.42); winShape.lineTo(-1.8, 1.07); winShape.lineTo(0.85, 1.07);
  const carGlass = new THREE.ExtrudeGeometry(winShape, { depth: 1.76, bevelEnabled: false }).translate(0, 0.01, -0.88);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14).rotateX(Math.PI / 2);
  const carGlassMat = reflect(new THREE.MeshPhysicalMaterial({ color: 0x14202a, metalness: 0.5, roughness: 0.05, clearcoat: 1 }), 0.9);
  const paints = [0xf2f2f0, 0x1c1c1e, 0x8c949c, 0xa31d1d, 0x1d3f73, 0xc7c9cc];
  const makeCar = (color: number) => {
    const car = new THREE.Group();
    const paint = reflect(new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }), 0.6);
    car.add(mesh(carBody, paint));
    car.add(mesh(carGlass, carGlassMat));
    for (const [x, z] of [[1.4, 0.82], [1.4, -0.82], [-1.4, 0.82], [-1.4, -0.82]]) {
      const w = mesh(wheelGeo, tyre);
      w.position.set(x, 0.36, z);
      car.add(w);
    }
    return car;
  };

  // ---------- people (forward is +x)
  const skin = new THREE.MeshStandardMaterial({ color: 0xc99572, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const makePerson = (shirtColor = 0x2aa198, pantsColor = 0x2c3e57, opts: { hat?: number; vest?: boolean } = {}) => {
    const p = new THREE.Group();
    const shirt = plastic(shirtColor, 0.8), pants = plastic(pantsColor, 0.85);
    for (const s of [-1, 1]) {
      p.add(mesh(new THREE.CapsuleGeometry(0.11, 0.75, 4, 8).translate(0, 0.5, s * 0.13), pants));
      const arm = new THREE.Group();
      arm.add(mesh(new THREE.CapsuleGeometry(0.075, 0.6, 4, 8).translate(0, -0.33, 0), shirt));
      arm.position.set(0, 1.55, s * 0.32);
      arm.name = s < 0 ? "armL" : "armR";
      p.add(arm);
    }
    p.add(mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 10).translate(0, 1.3, 0), shirt));
    if (opts.vest) p.add(mesh(new THREE.CapsuleGeometry(0.235, 0.36, 4, 10).translate(0, 1.32, 0), glow(0xe8ff3a, 0.25)));
    p.add(mesh(new THREE.SphereGeometry(0.13, 16, 12).translate(0, 1.78, 0), skin));
    if (opts.hat !== undefined) p.add(mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, 1.4).translate(0, 1.82, 0), plastic(opts.hat, 0.4)));
    else p.add(mesh(new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, 1.3).translate(0, 1.8, 0), hair));
    return p;
  };

  // ---------- the Hunter SE: Ackermann chassis, black sensor hat, LiDAR on a column, two GNSS antennas
  const makeHunter = () => {
    const r = new THREE.Group();
    const chassis = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.4, roughness: 0.5 });
    r.add(block(1.0, 0.32, 0.72, chassis, chassis, 10, 10, 0.2));
    r.add(block(1.04, 0.05, 0.76, darkMetal, darkMetal, 10, 10, 0.5));
    const hat = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.5 });
    r.add(block(0.6, 0.3, 0.52, hat, hat, 10, 10, 0.55));
    const scr = screen(0.3, 0.16, (g, W, H) => { g.fillStyle = "#06121a"; g.fillRect(0, 0, W, H); g.fillStyle = "#2ee6c4"; g.font = "bold 60px monospace"; g.fillText("NAV2 ●", 30, H / 2 + 20); }, 1.4);
    scr.position.set(0.301, 0.72, 0); scr.rotation.y = Math.PI / 2;
    r.add(scr);
    r.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 8).translate(0.18, 0.98, 0), plastic(0x9aa0a6)));
    const lidar = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.12, 20).translate(0.18, 1.17, 0), new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.7, roughness: 0.3 }));
    r.add(lidar);
    for (const z of [0.22, -0.22]) r.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16).translate(0.25, 0.87, z), plastic(0xeeeeee)));
    for (const [x, z] of [[0.33, 0.4], [0.33, -0.4], [-0.33, 0.4], [-0.33, -0.4]]) {
      const w = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14).rotateX(Math.PI / 2), tyre);
      w.position.set(x, 0.18, z);
      r.add(w);
    }
    const headlight = lightUp(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 0 }));
    for (const z of [0.22, -0.22]) { const l = mesh(new THREE.BoxGeometry(0.03, 0.06, 0.1), headlight, false); l.position.set(0.51, 0.38, z); r.add(l); }
    r.add(mesh(new THREE.BoxGeometry(0.62, 0.025, 0.54).translate(0, 0.7, 0), glow(0x2ee6c4, 2), false));
    return r;
  };

  return {
    reflective, reflect, night, lightUp, wind, sway, poolMat, dotTex,
    grass, asphalt, road, paving, concrete, darkConcrete, roofMat, stone, dirt, estateFloor, paddy,
    metal, darkMetal, glass, corrugated, corrugatedTex, concreteTex, water, tyre, lampGlow, F,
    plastic, glow, lists, place, flush, flat, ribbon, parapet, beacon, screen, instanced,
    makeCar, paints, makePerson, makeHunter,
  };
}
