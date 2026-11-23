// "My world" on the home page: six buildings around me, my robot on the roundabout,
// a city beyond. Drag to orbit, scroll to zoom, click a building to open its tab.
// Sky, sun, weather and the cinematic look come from the shared engine (w3/engine.ts).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { navigate } from "astro:transitions/client";
import { districts } from "../data/world";
import { createEngine } from "./w3/engine";
import { block, canvas, mesh, rand, texture } from "./w3/kit";

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

export function startWorld3D(home: HTMLElement, stage: HTMLElement, opts: Opts) {
  const wide = () => matchMedia("(min-width: 901px)").matches;
  const HOME_POS = new THREE.Vector3(70, 52, 238); // south of me, looking north: the sun lights the scene from the side
  const HOME_TARGET = new THREE.Vector3(0, 24, 0);
  let controls: OrbitControls;
  let tick = (dt: number, t: number) => { void dt; void t; };
  const engine = createEngine({
    host: home,
    stage,
    fov: 26, // about a 50 mm lens on full frame
    viewOffset: () => (wide() ? 0.2 : 0),
    onFrame: (dt, t) => tick(dt, t),
  });
  const { kit, scene, camera, cvs } = engine;
  const { F, flat, place, lists } = kit;

  camera.position.copy(HOME_POS);
  controls = new OrbitControls(camera, cvs);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 60;
  controls.maxDistance = 330;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.48;
  controls.screenSpacePanning = false;
  controls.autoRotateSpeed = 0.35;
  controls.autoRotate = !opts.reducedMotion;
  controls.update();

  const accentMats: Record<string, THREE.MeshStandardMaterial> = {};
  for (const [id, c] of Object.entries(ACCENT)) accentMats[id] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2, emissive: c, emissiveIntensity: 0 });

  // ---------- plaza, roundabout, rings
  const plazaGeo = new THREE.CircleGeometry(12, 64);
  flat(scene, plazaGeo, kit.paving, 0.06);
  flat(scene, new THREE.RingGeometry(12, 19.5, 96), kit.asphalt, 0.04);
  flat(scene, new THREE.RingGeometry(19.5, 21, 96), kit.concrete, 0.07);
  flat(scene, new THREE.RingGeometry(15.6, 15.85, 96), new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.7 }), 0.05);
  flat(scene, new THREE.RingGeometry(4.2, 7.5, 64), kit.water, 0.18);
  flat(scene, new THREE.RingGeometry(7.5, 8.1, 64), kit.concrete, 0.2);
  flat(scene, new THREE.RingGeometry(3.6, 4.2, 64), kit.concrete, 0.2);
  flat(scene, new THREE.RingGeometry(80, 88, 160), kit.asphalt, 0.04);
  flat(scene, new THREE.RingGeometry(88, 90.5, 160), kit.concrete, 0.06);
  flat(scene, new THREE.RingGeometry(77.5, 80, 160), kit.concrete, 0.06);

  // roads from the roundabout to each building, lined with palms and lamps
  districts.forEach((d) => {
    const a = (d.angle * Math.PI) / 180;
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    const start = 21, end = 40, len = end - start, mid = (start + end) / 2;
    const rg = new THREE.PlaneGeometry(8, len);
    rg.attributes.uv.array.forEach((_, i, arr) => { if (i % 2 === 1) (arr as Float32Array)[i] *= len / 16; });
    const rm = flat(scene, rg, kit.road, 0.05);
    const along = Math.atan2(-dir.x, -dir.y);
    rm.position.set(dir.x * mid, 0.05, dir.y * mid);
    rm.rotation.set(-Math.PI / 2, 0, along);
    for (const side of [-1, 1]) {
      const sw = flat(scene, new THREE.PlaneGeometry(2.4, len), kit.concrete, 0.07);
      const off = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(side * 5.2);
      sw.position.set(dir.x * mid + off.x, 0.07, dir.y * mid + off.y);
      sw.rotation.set(-Math.PI / 2, 0, along);
    }
    for (let s = 24; s < 38; s += 6.5) {
      for (const side of [-1, 1]) {
        const off = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(side * 7.6);
        place(lists.palms, dir.x * s + off.x, dir.y * s + off.y, 0.9 + rand() * 0.3);
        const offL = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(side * 5.6);
        place(lists.lamps, dir.x * (s + 3) + offL.x, dir.y * (s + 3) + offL.y, 1, Math.atan2(dir.y * side, -dir.x * side));
      }
    }
  });
  districts.forEach((d) => {
    const a = ((d.angle + 30) * Math.PI) / 180;
    for (const r of [36, 54, 68]) place(lists.trees, Math.cos(a) * r + (rand() - 0.5) * 6, Math.sin(a) * r + (rand() - 0.5) * 6, 0.9 + rand() * 0.5);
  });
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const r = 94 + rand() * 30;
    place(rand() < 0.4 ? lists.palms : lists.trees, Math.cos(a) * r, Math.sin(a) * r, 0.8 + rand() * 0.6);
  }

  // ---------- my buildings
  type Building = { id: string; group: THREE.Group; top: number; href: string; accent: THREE.MeshStandardMaterial };
  const buildings: Building[] = [];
  const pickables: THREE.Object3D[] = [];
  const { roofMat, glass, concrete, metal, darkMetal, corrugated, corrugatedTex, darkConcrete, stone } = kit;

  const shapes: Record<string, (g: THREE.Group, acc: THREE.MeshStandardMaterial) => number> = {
    lab(g, acc) {
      g.add(block(30, 8.4, 16, F.lab.mat, roofMat, F.lab.tileW, F.lab.tileH));
      const atrium = block(9, 7.6, 3, glass, roofMat);
      atrium.position.z = 9.4;
      g.add(atrium);
      const canopy = block(12, 0.4, 5, concrete, concrete, 10, 10, 7.6);
      canopy.position.z = 9.6;
      g.add(canopy);
      g.add(kit.parapet(30.2, 16.2, 8.4, acc));
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
      g.add(kit.parapet(17.4, 17.4, 73, acc, 3, 0.4));
      g.add(block(16.6, 0.4, 16.6, roofMat, roofMat, 10, 10, 73));
      g.add(block(11, 4, 11, darkMetal, darkMetal, 10, 10, 76));
      g.add(mesh(new THREE.CylinderGeometry(0.18, 0.3, 16, 8).translate(0, 88, 0), metal));
      g.add(kit.beacon(0, 96.4, 0, 0.55));
      return 98;
    },
    antenna(g, acc) {
      const shed = block(10, 4.2, 7, F.shed.mat, roofMat, F.shed.tileW, F.shed.tileH);
      shed.position.set(-7, 0, 5);
      g.add(shed);
      const H = 52;
      const parts: THREE.BufferGeometry[] = [];
      const strut = (p: THREE.Vector3, q: THREE.Vector3, r = 0.06) => {
        const len = p.distanceTo(q);
        const c = new THREE.CylinderGeometry(r, r, len, 4);
        c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()));
        c.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
        parts.push(c);
      };
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) strut(new THREE.Vector3(x * 3.2, 0, z * 3.2), new THREE.Vector3(x * 0.8, H, z * 0.8), 0.2);
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
      g.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.6, 12).translate(4, H - 6, -3), acc));
      g.add(kit.beacon(4, H + 0.6, -3, 0.45));
      return H + 3;
    },
    workshop(g, acc) {
      const W = 32, D = 18, Hh = 8;
      g.add(block(W, Hh, D, corrugated, roofMat, 4, 4));
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
      for (let i = 0; i < 3; i++) {
        const door = block(5, 5.2, 0.3, new THREE.MeshStandardMaterial({ map: corrugatedTex, color: 0x9aa0a6, metalness: 0.5, roughness: 0.5 }), darkMetal);
        door.position.set(-10 + i * 8, 0, D / 2 + 0.1);
        g.add(door);
      }
      g.add(block(W + 0.2, 0.8, D + 0.2, acc, acc, 10, 10, 6.6));
      const office = block(8, 6, 5, F.shed.mat, roofMat, F.shed.tileW, F.shed.tileH);
      office.position.set(W / 2 - 4, 0, D / 2 + 2.5);
      g.add(office);
      return 14;
    },
    studio(g, acc) {
      g.add(block(22, 18, 18, F.studio.mat, roofMat, F.studio.tileW, F.studio.tileH));
      g.add(kit.parapet(22.2, 18.2, 18, acc));
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
      for (let i = 0; i < 3; i++) g.add(block(30 - i * 1.2, 0.5, 22 - i * 1.2, concrete, concrete, 10, 10, i * 0.5));
      const hall = block(26, 11, 14, F.academy.mat, roofMat, F.academy.tileW, F.academy.tileH, 1.5);
      hall.position.z = -2;
      g.add(hall);
      for (let i = 0; i < 8; i++) g.add(mesh(new THREE.CylinderGeometry(0.55, 0.65, 10, 16).translate(-10.5 + i * 3, 6.5, 8), stone));
      const cornice = block(27, 1.2, 20, stone, stone, 10, 10, 11.5);
      cornice.position.z = 0.5;
      g.add(cornice);
      const tri = new THREE.Shape();
      tri.moveTo(-14, 0); tri.lineTo(14, 0); tri.lineTo(0, 5); tri.lineTo(-14, 0);
      g.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 20, bevelEnabled: false }).translate(0, 12.7, -9.5), stone));
      const tile = new THREE.MeshStandardMaterial({ color: 0x9c4a32, roughness: 0.7 });
      for (const s of [-1, 1]) {
        const roof = mesh(new THREE.BoxGeometry(15.2, 0.4, 20.6), tile);
        roof.position.set(s * 7, 15.2, 0.5);
        roof.rotation.z = -s * Math.atan2(5, 14);
        g.add(roof);
      }
      g.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 24).rotateX(Math.PI / 2).translate(0, 14.4, 10.6), acc));
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
    const court = flat(scene, new THREE.PlaneGeometry(36, 30), kit.paving, 0.03);
    court.position.set(g.position.x, 0.03, g.position.z);
    court.rotation.set(-Math.PI / 2, 0, Math.atan2(-Math.cos(a), -Math.sin(a)));
    (court.geometry.attributes.uv.array as Float32Array).forEach((_, i, arr) => { arr[i] *= 4; });
    scene.add(g);
    pickables.push(g);
    buildings.push({ id: d.id, group: g, top, href: d.href, accent: acc });
  });

  // ---------- the city around
  const cityParts: Record<string, THREE.BufferGeometry[]> = { city1: [], city2: [], city3: [] };
  const roofParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const r = 360 + rand() * 360;
    const w = 12 + rand() * 20, d = 12 + rand() * 20;
    const tall = rand() < 0.25;
    const h = tall ? 40 + rand() * 70 : 9 + rand() * 24;
    const k = tall ? (rand() < 0.8 ? "city1" : "city3") : (rand() < 0.5 ? "city2" : "city3");
    const f = F[k as "city1"];
    const geo = block(w, h, d, f.mat, roofMat, f.tileW, f.tileH).geometry.clone();
    geo.rotateY(rand() * Math.PI);
    geo.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    const side = geo.clone();
    side.clearGroups();
    const idx = side.index!.array;
    const roofIdx: number[] = [], sideIdx: number[] = [];
    for (let j = 0; j < idx.length; j += 3) (j >= 12 && j < 24 ? roofIdx : sideIdx).push(idx[j], idx[j + 1], idx[j + 2]);
    side.setIndex(sideIdx);
    const roof = geo.clone();
    roof.setIndex(roofIdx);
    cityParts[k].push(side);
    roofParts.push(roof);
  }
  for (const [k, parts] of Object.entries(cityParts)) if (parts.length) scene.add(mesh(mergeGeometries(parts), F[k as "city1"].mat));
  scene.add(mesh(mergeGeometries(roofParts), roofMat));

  // ---------- parked cars, me, my robot, a little traffic
  districts.forEach((d, i) => {
    const a = (d.angle * Math.PI) / 180;
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    const n = new THREE.Vector2(-dir.y, dir.x);
    for (let k = 0; k < 2; k++) {
      const s = 24 + k * 6 + (i % 2) * 2;
      const car = kit.makeCar(kit.paints[(i * 2 + k) % kit.paints.length]);
      const side = k % 2 ? 1 : -1;
      car.position.set(dir.x * s + n.x * side * 2.2, 0.05, dir.y * s + n.y * side * 2.2);
      car.rotation.y = -Math.atan2(dir.y, dir.x);
      scene.add(car);
    }
  });
  const me = kit.makePerson();
  me.scale.setScalar(1.6);
  me.position.set(0, 0.2, 0);
  me.rotation.y = -Math.PI / 4;
  scene.add(me);
  scene.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.2, 48).translate(0, 0.1, 0), kit.paving));
  const robot = kit.makeHunter();
  robot.scale.setScalar(2.2);
  scene.add(robot);
  const traffic = [0, 1].map((i) => ({ car: kit.makeCar(kit.paints[i * 3 + 1]), t: i * Math.PI }));
  traffic.forEach(({ car }) => scene.add(car));

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
    el.style.opacity = tmp.z < 1 ? "" : "0";
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
  cvs.addEventListener("pointermove", (e) => { if (!downAt) setHover(pick(e)); });
  cvs.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  cvs.addEventListener("pointerup", (e) => {
    const moved = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 99;
    downAt = null;
    if (moved > 6) return;
    const b = buildings.find((x) => x.id === pick(e));
    if (b) navigate(opts.baseUrl(b.href));
  });
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

  // ---------- per frame
  let robotT = 0;
  const meAnchor = new THREE.Vector3(0, 6.5, 0);
  const tagAnchor = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  tick = (dt) => {
    if (flyHome > 0) {
      flyHome = Math.max(0, flyHome - dt * 1.2);
      camera.position.lerp(HOME_POS, 0.08);
      controls.target.lerp(HOME_TARGET, 0.08);
    }
    controls.update(dt);
    engine.focus.copy(controls.target);

    robotT += dt * (opts.reducedMotion ? 0 : 0.11);
    robot.position.set(Math.cos(robotT) * 14.6, 0.05, Math.sin(robotT) * 14.6);
    robot.rotation.y = Math.atan2(-Math.cos(robotT), -Math.sin(robotT));
    traffic.forEach((c, i) => {
      c.t -= dt * (opts.reducedMotion ? 0 : 0.16);
      const a = c.t + i * Math.PI;
      c.car.position.set(Math.cos(a) * 17.6, 0.05, Math.sin(a) * 17.6);
      c.car.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
    });

    buildings.forEach((b) => placeTag(tagEls.get(b.id), tagAnchor.set(0, b.top + 4, 0).applyMatrix4(b.group.matrixWorld)));
    placeTag(meTag, meAnchor);
    camera.getWorldDirection(fwd);
    if (compass) compass.style.transform = `rotate(${(Math.atan2(-fwd.x, -fwd.z) * 180) / Math.PI}deg)`;
  };

  engine.start();
  home.classList.add("w3-ready");

  return () => {
    buttons.forEach((b) => b.removeEventListener("click", onButton));
    controls.dispose();
    engine.dispose();
    if (labelRoot) labelRoot.hidden = true;
    home.classList.remove("w3-ready");
  };
}
