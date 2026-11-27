// "My journey": a road through my career. Scrolling flies the camera from stop to stop,
// and each stop is a small living scene of what I actually did there.
// Sky, sun, weather and the cinematic look come from the shared engine (w3/engine.ts).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { journey } from "../data/journey";
import { createEngine } from "./w3/engine";
import { block, canvas, mesh, rand, rod, speckle, texture, type Kit } from "./w3/kit";

const GAP = 300; // metres between stops
const SIDE = -48; // the scenes sit north of the road; the camera looks from the south

type Updater = (dt: number, t: number) => void;

// ---------------------------------------------------------------- little effects
// expanding, fading rings: LiDAR sweeps, radio and GNSS signals, alerts
function pulses(parent: THREE.Object3D, at: THREE.Vector3, color: number, maxR: number, period: number, count = 3, vertical = false): Updater {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rings = Array.from({ length: count }, (_, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), mat.clone());
    if (!vertical) m.rotation.x = -Math.PI / 2;
    m.position.copy(at);
    m.userData.phase = i / count;
    parent.add(m);
    return m;
  });
  return (_dt, t) => rings.forEach((m) => {
    const k = (t / period + m.userData.phase) % 1;
    m.scale.setScalar(0.2 + k * maxR);
    (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.7;
  });
}
// glowing packets travelling along a link (radio, RTK corrections)
function link(parent: THREE.Object3D, a: () => THREE.Vector3, b: () => THREE.Vector3, color: number, speed = 0.6): Updater {
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  line.frustumCulled = false;
  parent.add(line);
  const dotMat = new THREE.MeshBasicMaterial({ color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const dots = Array.from({ length: 4 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), dotMat); parent.add(d); return d; });
  return (_dt, t) => {
    const p = a(), q = b();
    lineGeo.attributes.position.setXYZ(0, p.x, p.y, p.z);
    lineGeo.attributes.position.setXYZ(1, q.x, q.y, q.z);
    lineGeo.attributes.position.needsUpdate = true;
    dots.forEach((d, i) => d.position.lerpVectors(p, q, (t * speed + i / dots.length) % 1));
  };
}
// a text sprite (detection labels, signs)
function tag(text: string, color: string, w = 4, bg = "rgba(0,0,0,0.55)") {
  const t = texture(canvas(256, 64, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
    g.fillStyle = color; g.font = "bold 34px ui-monospace, monospace"; g.textBaseline = "middle"; g.fillText(text, 14, 34);
  }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(w, w / 4, 1);
  return s;
}
// arms swing while walking (people from the kit face +x)
function walk(p: THREE.Object3D, t: number, k: number) {
  const a = p.getObjectByName("armL"), b = p.getObjectByName("armR");
  if (a) a.rotation.z = Math.sin(t * 7) * 0.5 * k;
  if (b) b.rotation.z = -Math.sin(t * 7) * 0.5 * k;
  p.position.y = Math.abs(Math.sin(t * 7)) * 0.04 * k;
}
function makeDrone(kit: Kit) {
  const d = new THREE.Group();
  const body = kit.plastic(0x23272c, 0.4);
  d.add(block(0.5, 0.16, 0.5, body, body, 10, 10, 0));
  const parts: THREE.BufferGeometry[] = [];
  const rotors: THREE.Mesh[] = [];
  const blade = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.35, depthWrite: false });
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    parts.push(rod(new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(x * 0.55, 0.1, z * 0.55), 0.03));
    parts.push(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10).translate(x * 0.55, 0.14, z * 0.55));
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.01, 20).translate(0, 0.2, 0), blade);
    r.position.set(x * 0.55, 0, z * 0.55);
    rotors.push(r);
    d.add(r);
  }
  for (const s of [-1, 1]) parts.push(rod(new THREE.Vector3(0.15, 0, s * 0.18), new THREE.Vector3(0.18, -0.25, s * 0.25), 0.015), rod(new THREE.Vector3(-0.15, 0, s * 0.18), new THREE.Vector3(-0.18, -0.25, s * 0.25), 0.015));
  d.add(mesh(mergeGeometries(parts), kit.darkMetal));
  d.add(mesh(new THREE.SphereGeometry(0.08, 12, 8).translate(0.22, -0.05, 0), kit.plastic(0x111111, 0.2)));
  d.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05).translate(-0.24, 0.1, 0), kit.glow(0x39ff88, 3), false));
  return { d, rotors };
}

// ---------------------------------------------------------------- the stops
// me: where I stand in this scene (local); hold: what I'm holding there
type Scene = { update: Updater; pose: { pos: THREE.Vector3; target: THREE.Vector3 }; me: THREE.Vector3; hold?: "tablet" | "remote" };

function matrik(g: THREE.Group, kit: Kit): Scene {
  const { F } = kit;
  const tile = new THREE.MeshStandardMaterial({ color: 0x8e3b26, roughness: 0.7 });
  const gable = (w: number, h: number, len: number) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  };
  // an L of three-storey college blocks with tiled roofs
  const a = block(40, 11, 12, F.school.mat, kit.roofMat, F.school.tileW, F.school.tileH);
  a.position.set(-6, 0, -14);
  g.add(a);
  g.add(mesh(gable(13.4, 3.6, 41).rotateY(Math.PI / 2).translate(-26.5, 11, -14), tile));
  const b = block(12, 11, 30, F.school.mat, kit.roofMat, F.school.tileW, F.school.tileH);
  b.position.set(20, 0, -5);
  g.add(b);
  g.add(mesh(gable(13.4, 3.6, 31).translate(20, 11, -20.5), tile));
  // covered walkway along the front
  g.add(block(36, 0.3, 3.2, kit.roofMat, kit.roofMat, 10, 10, 3.2).translateX(-6).translateZ(-6.4));
  for (let x = -22; x <= 10; x += 4) g.add(mesh(rod(new THREE.Vector3(x, 0, -5), new THREE.Vector3(x, 3.2, -5), 0.08), kit.darkMetal));
  // courtyard, flagpole and flag
  kit.flat(g, new THREE.PlaneGeometry(48, 22), kit.paving, 0.04).position.set(-2, 0.04, 6);
  g.add(mesh(rod(new THREE.Vector3(-16, 0, 10), new THREE.Vector3(-16, 13, 10), 0.08), kit.metal));
  const flagTex = texture(canvas(256, 128, (c) => {
    for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? "#ffffff" : "#cc0001"; c.fillRect(0, (i * 128) / 14, 256, 128 / 14 + 1); }
    c.fillStyle = "#010066"; c.fillRect(0, 0, 128, 73);
    c.fillStyle = "#ffcc00"; c.beginPath(); c.arc(52, 36, 24, 0, 7); c.fill();
    c.fillStyle = "#010066"; c.beginPath(); c.arc(60, 36, 20, 0, 7); c.fill();
    c.fillStyle = "#ffcc00"; c.beginPath();
    for (let k = 0; k < 28; k++) { const r = k % 2 ? 7 : 17, an = (k / 28) * Math.PI * 2; c.lineTo(94 + Math.cos(an) * r, 36 + Math.sin(an) * r); }
    c.fill();
  }));
  const flagGeo = new THREE.PlaneGeometry(4, 2, 20, 6);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  const flag = mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }), false);
  flag.position.set(-14, 11.8, 10);
  g.add(flag);
  // Kedah is the rice bowl: paddy fields behind the college, and Gunung Jerai on the horizon
  const field = kit.flat(g, new THREE.PlaneGeometry(280, 80), kit.paddy, 0.04);
  field.position.set(0, 0.04, -68);
  (field.geometry.attributes.uv.array as Float32Array).forEach((_, i, arr) => { arr[i] *= i % 2 ? 80 / 8 : 280 / 8; });
  for (const x of [-100, -50, 0, 50, 100]) kit.flat(g, new THREE.PlaneGeometry(1.2, 80), kit.dirt, 0.08).position.set(x, 0.08, -68);
  kit.flat(g, new THREE.PlaneGeometry(280, 1.4), kit.dirt, 0.08).position.set(0, 0.08, -28);
  const hill = mesh(new THREE.ConeGeometry(520, 280, 48, 1, true), kit.grass, false);
  hill.position.set(-200, 120, -1100);
  hill.scale.set(1.6, 1, 1);
  g.add(hill);
  // a student on the way to class
  const student = kit.makePerson(0xf2f2f2, 0x1f2a44);
  student.add(mesh(new THREE.BoxGeometry(0.3, 0.45, 0.2).translate(-0.25, 1.25, 0), kit.plastic(0x274a7a)));
  student.scale.setScalar(1.8);
  g.add(student);
  return {
    pose: { pos: new THREE.Vector3(34, 34, 118), target: new THREE.Vector3(0, 6, -10) },
    me: new THREE.Vector3(-4, 0.05, 2),
    update: (_dt, t) => {
      // the flag ripples
      const p = flagGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = flagBase[i * 3] + 2;
        p.setZ(i, Math.sin(x * 2.2 - t * 5) * 0.18 * x);
      }
      p.needsUpdate = true;
      flagGeo.computeVertexNormals();
      // the student walks back and forth across the courtyard
      const k = (t * 0.05) % 2;
      const u = k < 1 ? k : 2 - k;
      student.position.x = -20 + u * 34;
      student.position.z = 7;
      student.rotation.y = k < 1 ? 0 : Math.PI;
      walk(student, t, 1);
      student.position.y += 0.04;
    },
  };
}

function umpsa(g: THREE.Group, kit: Kit): Scene {
  const { F } = kit;
  const blue = kit.plastic(0x2f6fc0, 0.4);
  // faculty building with a glass entrance, and the workshop
  const hall = block(44, 16, 16, F.academy.mat, kit.roofMat, F.academy.tileW, F.academy.tileH);
  hall.position.set(-16, 0, -24);
  g.add(hall);
  g.add(kit.parapet(44.2, 16.2, 16, blue).translateX(-16).translateZ(-24));
  const atrium = block(12, 14, 4, kit.glass, kit.roofMat);
  atrium.position.set(-16, 0, -14);
  g.add(atrium);
  const shop = block(26, 9, 16, kit.corrugated, kit.roofMat, 4, 4);
  shop.position.set(22, 0, -20);
  g.add(shop);
  const door = block(9, 6, 0.2, kit.plastic(0x121417, 0.9), kit.darkMetal);
  door.position.set(20, 0, -11.9);
  g.add(door);
  // Robocon practice field with my two robots: one shoots, one catches
  const mat = texture(canvas(512, 256, (c) => {
    c.fillStyle = "#3f7d3a"; c.fillRect(0, 0, 512, 256);
    c.strokeStyle = "#ffffff"; c.lineWidth = 6; c.strokeRect(8, 8, 496, 240);
    c.beginPath(); c.moveTo(256, 8); c.lineTo(256, 248); c.stroke();
    c.beginPath(); c.arc(256, 128, 40, 0, 7); c.stroke();
    c.fillStyle = "#c0392b"; c.fillRect(8, 90, 50, 76); c.fillStyle = "#2f6fc0"; c.fillRect(454, 90, 50, 76);
  }));
  mat.wrapS = mat.wrapT = THREE.ClampToEdgeWrapping;
  kit.flat(g, new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ map: mat, roughness: 0.9 }), 0.07).position.set(20, 0.07, 2);
  const orange = kit.plastic(0xf08a3c, 0.45);
  const shooter = new THREE.Group();
  shooter.add(block(1.4, 0.5, 1.2, orange, orange, 10, 10, 0.15));
  const tube = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 14), kit.darkMetal);
  tube.rotation.z = -Math.PI / 4;
  tube.position.set(0.3, 1.2, 0);
  shooter.add(tube);
  shooter.position.set(9.5, 0.07, 2);
  shooter.scale.setScalar(1.4);
  g.add(shooter);
  const catcher = new THREE.Group();
  catcher.add(block(1.3, 0.5, 1.3, blue, blue, 10, 10, 0.15));
  catcher.add(mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.6, 20, 1, true).translate(0, 1.05, 0), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })));
  catcher.add(mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 24).rotateX(Math.PI / 2).translate(0, 1.35, 0), kit.metal));
  catcher.scale.setScalar(1.4);
  g.add(catcher);
  for (const [x, w] of [[-2, 0], [2, 0], [-2, 1], [2, 1]] as const) {
    const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12).rotateX(Math.PI / 2);
    const target = w ? catcher : shooter;
    const wh = mesh(wheelGeo, kit.tyre);
    wh.position.set(x * 0.25, 0.18, 0.62 * Math.sign(x));
    target.add(wh);
  }
  const ball = mesh(new THREE.SphereGeometry(0.13 * 1.4, 14, 10), kit.glow(0xffd23f, 0.6));
  g.add(ball);
  const fans = [kit.makePerson(0x2f6fc0, 0x222222), kit.makePerson(0xf2f2f2, 0x3a3a3a), kit.makePerson(0x8e44ad, 0x2c3e50)];
  fans.forEach((p, i) => { p.scale.setScalar(1.8); p.position.set(14 + i * 5, 0, 10); p.rotation.y = Math.PI / 2; g.add(p); });
  // the self-driving lawn mower, cutting stripes into the lawn
  const lawnTex = texture(canvas(256, 256, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#5d7c33" : "#6f9140"; c.fillRect(0, i * 32, 256, 32); } }));
  kit.flat(g, new THREE.PlaneGeometry(40, 22), new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 0.95 }), 0.05).position.set(-16, 0.05, 6);
  const mower = new THREE.Group();
  const red = kit.plastic(0xc0392b, 0.35);
  mower.add(block(1.0, 0.35, 0.7, red, red, 10, 10, 0.12));
  mower.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12).translate(0.3, 0.55, 0), kit.darkMetal));
  for (const [x, z] of [[0.35, 0.38], [0.35, -0.38], [-0.35, 0.38], [-0.35, -0.38]]) { const w = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12).rotateX(Math.PI / 2), kit.tyre); w.position.set(x, 0.13, z); mower.add(w); }
  mower.scale.setScalar(2);
  g.add(mower);
  // IoT sensor box on a pole: solar panel, blinking LED, radio pulses
  g.add(mesh(rod(new THREE.Vector3(-38, 0, 2), new THREE.Vector3(-38, 3.6, 2), 0.06), kit.metal));
  g.add(block(0.5, 0.6, 0.35, kit.plastic(0xeeeeee), kit.plastic(0xeeeeee), 10, 10, 2.3).translateX(-38).translateZ(2.25));
  const panel = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: 0x1b2a44, metalness: 0.6, roughness: 0.25 }));
  panel.position.set(-38, 3.7, 2); panel.rotation.x = -0.4;
  g.add(panel);
  const led = mesh(new THREE.SphereGeometry(0.05, 8, 6).translate(-37.8, 2.75, 2.45), kit.glow(0x39ff88, 3), false);
  g.add(led);
  const iotPulse = pulses(g, new THREE.Vector3(-38, 4.1, 2), 0x6fbf6a, 5, 2.2, 3);
  // final-year project with MIMOS: a motor whose vibration is listened to; the screen raises the alarm
  g.add(block(3.4, 0.3, 2.2, kit.concrete, kit.concrete, 10, 10, 0).translateX(2).translateZ(12));
  const motor = new THREE.Group();
  motor.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 20).rotateZ(Math.PI / 2).translate(0, 0.85, 0), kit.plastic(0x3d5a80, 0.35)));
  motor.add(block(1.2, 0.35, 0.9, kit.darkMetal, kit.darkMetal, 10, 10, 0.3));
  motor.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12).translate(0, 1.4, 0), kit.plastic(0xc0392b)));
  motor.position.set(2, 0, 12);
  motor.scale.setScalar(1.4);
  g.add(motor);
  const vib = pulses(g, new THREE.Vector3(2, 2.2, 12), 0xff6b4a, 3, 1.1, 2);
  const scr = kit.screen(2.4, 1.4, (c, W, H) => {
    c.fillStyle = "#0b1016"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#7fd6ca"; c.lineWidth = 3; c.beginPath();
    for (let x = 0; x < W; x += 2) { const spike = x > W * 0.62 && x < W * 0.72 ? 3.2 : 1; c.lineTo(x, H * 0.55 + Math.sin(x * 0.18) * 14 * spike * (0.6 + Math.random() * 0.4)); }
    c.stroke();
    c.fillStyle = "#ff6b4a"; c.font = "bold 34px monospace"; c.fillText("⚠ FAULT · ALERT SENT", 20, 46);
  });
  scr.position.set(6, 2, 12.6);
  g.add(scr);
  g.add(mesh(rod(new THREE.Vector3(6, 0, 12.5), new THREE.Vector3(6, 1.3, 12.5), 0.05), kit.darkMetal));
  // a signpost to the partner university in Germany
  g.add(mesh(rod(new THREE.Vector3(-3, 0, 17), new THREE.Vector3(-3, 3.4, 17), 0.07), kit.darkMetal));
  const sign = kit.screen(4.2, 1.1, (c, W, H) => { c.fillStyle = "#f4f1ea"; c.fillRect(0, 0, W, H); c.fillStyle = "#1d3f73"; c.font = "bold 62px sans-serif"; c.textBaseline = "middle"; c.fillText("HKA KARLSRUHE  ➜", 26, H / 2); }, 0.25);
  sign.position.set(-1.2, 3, 17.05);
  g.add(sign);

  const shooterTip = new THREE.Vector3();
  const basket = new THREE.Vector3();
  return {
    pose: { pos: new THREE.Vector3(20, 30, 92), target: new THREE.Vector3(-2, 4, -4) },
    me: new THREE.Vector3(9, 0.07, 6.5),
    update: (dt, t) => {
      catcher.position.set(31, 0.07, 2 + Math.sin(t * 0.9) * 3.2);
      shooterTip.set(11.2, 2.4, 2);
      basket.set(31, 2, catcher.position.z);
      const ph = (t % 2.6) / 1.7;
      if (ph <= 1) { ball.visible = true; ball.position.lerpVectors(shooterTip, basket, ph); ball.position.y += Math.sin(Math.PI * ph) * 7; }
      else ball.visible = false;
      // mower: back and forth along lanes
      const lane = 2.6, lanes = 8, len = 36;
      const d = (t * 2.2) % (lanes * len * 2);
      const li = Math.floor(d / len) % (lanes * 2);
      const f = (d % len) / len;
      const fwd = li % 2 === 0;
      const row = li < lanes ? li : lanes * 2 - 1 - li;
      mower.position.set(-34 + (fwd ? f : 1 - f) * len, 0.05, -3.5 + row * lane);
      mower.rotation.y = fwd ? 0 : Math.PI;
      motor.position.y = Math.sin(t * 70) * 0.015;
      (led.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 6) > 0 ? 4 : 0.3;
      iotPulse(dt, t);
      vib(dt, t);
      fans.forEach((p, i) => { p.rotation.y = Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.3; });
    },
  };
}

function dreamedge(g: THREE.Group, kit: Kit): Scene {
  const { F } = kit;
  g.add(block(40, 6, 26, kit.darkConcrete, kit.roofMat, 10, 10).translateZ(-16));
  g.add(block(36, 5, 1, kit.glass, kit.glass).translateZ(-2.6));
  const tower = block(26, 30, 18, F.tower.mat, kit.roofMat, F.tower.tileW, F.tower.tileH, 6);
  tower.position.z = -18;
  g.add(tower);
  g.add(kit.parapet(26.2, 18.2, 36, kit.plastic(0xf08a3c, 0.4)).translateZ(-18));
  // the work on the screens: a CAD model in CATIA and a circuit board layout
  const cad = kit.screen(11, 6.4, (c, W, H) => {
    c.fillStyle = "#0b1a2e"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(127,214,202,0.12)"; c.lineWidth = 1;
    for (let x = 0; x < W; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = "#7fd6ca"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(40, 200); c.lineTo(80, 150); c.lineTo(170, 120); c.lineTo(250, 85); c.lineTo(360, 85); c.lineTo(420, 130); c.lineTo(470, 145); c.lineTo(472, 200); c.closePath(); c.stroke();
    c.beginPath(); c.arc(130, 205, 30, 0, 7); c.stroke(); c.beginPath(); c.arc(390, 205, 30, 0, 7); c.stroke();
    c.strokeStyle = "#f0c674"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(130, 250); c.lineTo(390, 250); c.stroke();
    c.fillStyle = "#f0c674"; c.font = "18px monospace"; c.fillText("2 620", 240, 268);
    c.fillStyle = "#9cdcfe"; c.font = "bold 20px monospace"; c.fillText("CATIA V5 · PART DESIGN", 16, 26);
  }, 1.2);
  cad.position.set(-6.2, 22, -8.8);
  g.add(cad);
  const pcb = kit.screen(11, 6.4, (c, W, H) => {
    c.fillStyle = "#0c3b22"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#d4af37"; c.lineWidth = 3;
    for (let i = 0; i < 26; i++) { let x = 20 + Math.random() * (W - 40), y = 40 + Math.random() * (H - 60); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 3; k++) { if (Math.random() < 0.5) x += (Math.random() - 0.5) * 160; else y += (Math.random() - 0.5) * 100; c.lineTo(x, y); } c.stroke(); }
    c.fillStyle = "#111"; c.fillRect(200, 110, 110, 80); c.fillRect(60, 60, 50, 30); c.fillRect(380, 180, 70, 40);
    c.fillStyle = "#c0c0c0"; for (let i = 0; i < 40; i++) c.fillRect(20 + Math.random() * (W - 40), 30 + Math.random() * (H - 50), 6, 6);
    c.fillStyle = "#e8f5e9"; c.font = "bold 20px monospace"; c.fillText("PCB · REV B", 16, 26);
  }, 1.2);
  pcb.position.set(6.2, 22, -8.8);
  g.add(pcb);
  // the lake in front, palms and the car park
  kit.flat(g, new THREE.PlaneGeometry(74, 32), kit.concrete, 0.05).position.set(-6, 0.05, 15);
  kit.flat(g, new THREE.PlaneGeometry(70, 28), kit.water, 0.14).position.set(-6, 0.14, 15);
  for (let x = -40; x <= 30; x += 10) kit.place(kit.lists.palms, x + g.position.x, g.position.z + 32 + rand() * 2, 0.9 + rand() * 0.3);
  kit.flat(g, new THREE.PlaneGeometry(14, 30), kit.asphalt, 0.05).position.set(34, 0.05, -10);
  for (let i = 0; i < 5; i++) { const car = kit.makeCar(kit.paints[i % kit.paints.length]); car.position.set(30 + (i % 2) * 7, 0.05, -20 + i * 4.6); car.rotation.y = (i % 2 ? 0 : Math.PI); g.add(car); }
  const intern = kit.makePerson(0x34495e, 0x2c2c2c);
  intern.scale.setScalar(1.8);
  intern.add(mesh(new THREE.BoxGeometry(0.35, 0.03, 0.25).translate(0.2, 1.1, 0), kit.plastic(0x222222)));
  g.add(intern);
  return {
    pose: { pos: new THREE.Vector3(34, 26, 124), target: new THREE.Vector3(0, 13, -10) },
    me: new THREE.Vector3(6, 0.05, -1),
    update: (_dt, t) => {
      const k = (t * 0.04) % 2, u = k < 1 ? k : 2 - k;
      intern.position.set(-30 + u * 40, 0.05, 0.5);
      intern.rotation.y = k < 1 ? 0 : Math.PI;
      walk(intern, t, 1);
      intern.position.y += 0.05;
    },
  };
}

function guthrie(g: THREE.Group, kit: Kit): Scene {
  // the estate: red laterite roads through rows of oil palms
  kit.flat(g, new THREE.PlaneGeometry(240, 150), kit.estateFloor, 0.035).position.set(0, 0.035, -30);
  (kit.estateFloor.map as THREE.Texture).repeat.set(8, 5);
  const roadZ = -6;
  const rd = kit.flat(g, new THREE.PlaneGeometry(240, 7), kit.dirt, 0.05);
  rd.position.set(0, 0.05, roadZ);
  (rd.geometry.attributes.uv.array as Float32Array).forEach((_, i, arr) => { if (i % 2 === 0) arr[i] *= 240 / 12; });
  const crowns: THREE.Vector3[] = [];
  for (let row = 0; row < 18; row++) {
    const z = 22 - row * 7.8;
    for (let x = -110; x <= 110; x += 9) {
      const px = x + (row % 2 ? 4.5 : 0) + (rand() - 0.5);
      if (Math.abs(z - roadZ) < 6 || (px > 52 && z > 4)) continue;
      kit.place(kit.lists.oilPalms, g.position.x + px, g.position.z + z, 0.9 + rand() * 0.25);
      if (z > 10 && Math.abs(px) < 55) crowns.push(new THREE.Vector3(px, 7.4, z));
    }
  }
  // A driverless fertiliser spreader with a hopper and a spinner at the back
  const spreader = new THREE.Group();
  const yellow = kit.plastic(0xe0a020, 0.45);
  spreader.add(block(3.6, 0.6, 1.8, kit.darkMetal, kit.darkMetal, 10, 10, 0.55));
  for (const [x, z] of [[1.2, 1], [1.2, -1], [-1.2, 1], [-1.2, -1]]) { const w = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16).rotateX(Math.PI / 2), kit.tyre); w.position.set(x, 0.55, z); spreader.add(w); }
  spreader.add(mesh(new THREE.CylinderGeometry(1.25, 0.5, 1.4, 4, 1).rotateY(Math.PI / 4).translate(-0.3, 1.9, 0), yellow));
  const spinner = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 12).translate(-2.0, 0.9, 0), kit.metal);
  spreader.add(spinner);
  spreader.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12).translate(1.7, 1.3, 0), kit.plastic(0x333333)));
  spreader.add(mesh(rod(new THREE.Vector3(0.8, 1.15, 0.6), new THREE.Vector3(0.8, 3.4, 0.6), 0.03), kit.darkMetal));
  spreader.add(kit.beacon(0.8, 3.5, 0.6, 0.12));
  g.add(spreader);
  // fertiliser granules thrown by the spinner
  const N = 500;
  const sprayPos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xf2f0e6, size: 0.12, transparent: true, opacity: 0.9 }));
  spray.frustumCulled = false;
  g.add(spray);
  // the long-range radio mast, linked to the vehicle
  g.add(mesh(rod(new THREE.Vector3(-84, 0, 20), new THREE.Vector3(-84, 24, 20), 0.18, 8), kit.metal));
  g.add(mesh(rod(new THREE.Vector3(-85.5, 22, 20), new THREE.Vector3(-82.5, 22, 20), 0.05), kit.metal));
  g.add(kit.beacon(-84, 24.4, 20, 0.3));
  g.add(block(2.4, 2.2, 2, kit.F.shed.mat, kit.roofMat, kit.F.shed.tileW, kit.F.shed.tileH).translateX(-81).translateZ(22));
  const mastTop = new THREE.Vector3(-84, 22.5, 20).add(g.position);
  const antenna = new THREE.Vector3();
  const radio = link(g.parent ?? g, () => mastTop, () => antenna, 0x7fd6ca, 0.5);
  const mastPulse = pulses(g, new THREE.Vector3(-84, 22.5, 20), 0x7fd6ca, 6, 2, 3, true);
  // the Husky test robot with the sensor and camera mounts I designed and 3D-printed
  const husky = new THREE.Group();
  const hy = kit.plastic(0xf2c200, 0.4);
  husky.add(block(1.0, 0.38, 0.68, hy, kit.plastic(0x1a1a1a), 10, 10, 0.12));
  for (const [x, z] of [[0.3, 0.38], [0.3, -0.38], [-0.3, 0.38], [-0.3, -0.38]]) { const w = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 14).rotateX(Math.PI / 2), kit.tyre); w.position.set(x, 0.17, z); husky.add(w); }
  const printed = kit.plastic(0x8f969c, 0.6);
  husky.add(block(0.12, 0.6, 0.12, printed, printed, 10, 10, 0.5));
  husky.add(block(0.3, 0.06, 0.3, printed, printed, 10, 10, 1.1));
  husky.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16).translate(0, 1.21, 0), kit.plastic(0x2b2b2b, 0.3)));
  husky.add(block(0.16, 0.08, 0.06, kit.plastic(0x111111), kit.plastic(0x111111), 10, 10, 0.95).translateX(0.18));
  husky.scale.setScalar(2.4);
  husky.position.set(70, 0.05, 14);
  husky.rotation.y = -0.6;
  g.add(husky);
  const office = block(12, 3.6, 7, kit.F.shed.mat, kit.roofMat, kit.F.shed.tileW, kit.F.shed.tileH);
  office.position.set(80, 0, 24);
  g.add(office);
  const engineer = kit.makePerson(0x1f5f3a, 0x2c3e50, { hat: 0xf2f2f2, vest: true });
  engineer.scale.setScalar(1.8);
  engineer.position.set(66, 0.05, 17);
  engineer.rotation.y = -0.3;
  g.add(engineer);
  // counting palm crowns from the air: a drone passes and the AI boxes each crown it sees
  const { d: drone, rotors } = makeDrone(kit);
  drone.scale.setScalar(3);
  g.add(drone);
  const cone = mesh(new THREE.ConeGeometry(9, 26, 4, 1, true).rotateY(Math.PI / 4).translate(0, -13, 0), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }), false);
  cone.scale.setScalar(1 / 3); // the drone itself is scaled up 3x
  drone.add(cone);
  const boxMat = new THREE.LineBasicMaterial({ color: 0x39ff88 });
  const boxes = crowns.slice(0, 18).map((c) => {
    const b = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 3.4, 7)), boxMat);
    b.position.copy(c);
    const lbl = tag(`palm ${(0.86 + rand() * 0.12).toFixed(2)}`, "#39ff88", 3.6);
    lbl.position.set(0, 2.6, 0);
    b.add(lbl);
    b.visible = false;
    g.add(b);
    return b;
  });
  let dir = 1, rx = -70;
  return {
    pose: { pos: new THREE.Vector3(12, 62, 92), target: new THREE.Vector3(0, 2, -6) },
    me: new THREE.Vector3(63, 0.05, 13),
    update: (dt, t) => {
      // the spreader drives up and down the estate road, spreading as it goes
      rx += dir * dt * 3.2;
      if (rx > 70) { rx = 70; dir = -1; }
      if (rx < -70) { rx = -70; dir = 1; }
      spreader.position.set(rx, 0.05, roadZ);
      spreader.rotation.y = dir > 0 ? 0 : Math.PI;
      spinner.rotation.y += dt * 20;
      antenna.set(0.8 * dir + rx, 3.4, roadZ + 0.6 * dir).add(g.position);
      const back = new THREE.Vector3(-2.0 * dir + rx, 0.95, roadZ);
      for (let i = 0; i < N; i++) {
        life[i] -= dt;
        if (life[i] <= 0) {
          if (rand() < 0.35) {
            life[i] = 0.7 + rand() * 0.5;
            sprayPos.set([back.x, back.y, back.z], i * 3);
            const a = (dir > 0 ? Math.PI : 0) + (rand() - 0.5) * 2.4;
            const sp = 4 + rand() * 5;
            vel.set([Math.cos(a) * sp, 1 + rand() * 2, Math.sin(a) * sp], i * 3);
          } else { sprayPos[i * 3 + 1] = -10; continue; }
        }
        vel[i * 3 + 1] -= 9.8 * dt;
        sprayPos[i * 3] += vel[i * 3] * dt; sprayPos[i * 3 + 1] = Math.max(0.06, sprayPos[i * 3 + 1] + vel[i * 3 + 1] * dt); sprayPos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      sprayGeo.attributes.position.needsUpdate = true;
      radio(dt, t);
      mastPulse(dt, t);
      // the drone sweeps over the front rows; crowns behind it are boxed
      const dx = -60 + ((t * 6) % 140);
      drone.position.set(dx, 26 + Math.sin(t * 0.8) * 0.6, 16);
      rotors.forEach((r) => { r.rotation.y += dt * 60; });
      boxes.forEach((b) => { b.visible = b.position.x < dx - 2; });
      engineer.rotation.y = -0.3 + Math.sin(t * 0.4) * 0.4;
    },
  };
}

function mimos(g: THREE.Group, kit: Kit): Scene {
  const { F } = kit;
  const lab = block(50, 14, 20, F.lab.mat, kit.roofMat, F.lab.tileW, F.lab.tileH);
  lab.position.set(0, 0, -62);
  g.add(lab);
  g.add(kit.parapet(50.2, 20.2, 14, kit.plastic(0x3fb8a8, 0.4)).translateZ(-62));
  g.add(block(10, 10, 3, kit.glass, kit.roofMat).translateZ(-51));
  // the test field: tall grass the robot is allowed to drive through, trees it must avoid
  const grassTex = texture(canvas(128, 128, (c) => {
    for (let i = 0; i < 70; i++) {
      const x = rand() * 128, h = 60 + rand() * 66, k = rand();
      c.strokeStyle = `rgb(${Math.floor(70 + 70 * k)},${Math.floor(100 + 60 * k)},${Math.floor(30 + 20 * k)})`;
      c.lineWidth = 1.5 + rand() * 2;
      c.beginPath(); c.moveTo(x, 128); c.quadraticCurveTo(x + (rand() - 0.5) * 20, 128 - h / 2, x + (rand() - 0.5) * 30, 128 - h); c.stroke();
    }
  }));
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  kit.sway(grassMat, 0, 0.12);
  const clump = mergeGeometries([0, 1, 2].map((i) => new THREE.PlaneGeometry(1.6, 1.3).translate(0, 0.65, 0).rotateY((i * Math.PI) / 3)));
  const spots: THREE.Matrix4[] = [];
  for (let i = 0; i < 2600; i++) {
    const x = -55 + rand() * 110, z = -42 + rand() * 66;
    spots.push(new THREE.Matrix4().compose(new THREE.Vector3(x + g.position.x, 0, z + g.position.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 3), new THREE.Vector3(1, 0.45 + rand() * 0.4, 1)));
  }
  kit.instanced(g.parent ?? g, clump, grassMat, spots, () => new THREE.Color(0.85 + rand() * 0.2, 0.85 + rand() * 0.2, 0.7));
  const trees = [new THREE.Vector3(-4, 0, -20), new THREE.Vector3(12, 0, -2), new THREE.Vector3(32, 0, -24), new THREE.Vector3(-22, 0, -4)];
  trees.forEach((p) => kit.place(kit.lists.trees, p.x + g.position.x, p.z + g.position.z, 1.1));
  // costmap: obstacles light up red with a blue inflation ring, grass stays clear
  const costTex = texture(canvas(128, 128, (c) => {
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,0,170,0.9)"); gr.addColorStop(0.3, "rgba(255,40,120,0.65)"); gr.addColorStop(0.55, "rgba(60,90,255,0.45)"); gr.addColorStop(1, "rgba(60,90,255,0)");
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  }));
  // drawn over the grass like an RViz overlay
  const costMat = new THREE.MeshBasicMaterial({ map: costTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0.6 });
  trees.forEach((p) => { const c = kit.flat(g, new THREE.PlaneGeometry(14, 14), costMat, 0.3); c.position.set(p.x, 0.3, p.z); c.renderOrder = 5; });
  // the planned route (Nav2) and the Hunter SE driving it
  const route = new THREE.CatmullRomCurve3([[-22, 10], [-10, -8], [6, -16], [24, -14], [34, 0], [20, 12], [4, 4], [-10, 16]].map(([x, z]) => new THREE.Vector3(x, 0.3, z)), true, "centripetal");
  const path = mesh(new THREE.TubeGeometry(route, 400, 0.16, 6, true), new THREE.MeshBasicMaterial({ color: 0x2ee6c4, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false }), false);
  path.renderOrder = 6;
  g.add(path);
  const ahead = Array.from({ length: 6 }, () => { const s = mesh(new THREE.SphereGeometry(0.3, 10, 8), kit.glow(0x6ffff0, 4), false); g.add(s); return s; });
  const hunter = kit.makeHunter();
  hunter.scale.setScalar(3);
  g.add(hunter);
  const scan = pulses(g, new THREE.Vector3(), 0x2ee6c4, 22, 1.4, 3);
  const scanRings: THREE.Object3D[] = g.children.slice(-3);
  // RTK base station on a tripod, sending corrections to the robot
  const base = new THREE.Vector3(44, 0, -8);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(mesh(rod(new THREE.Vector3(base.x + Math.cos(a) * 0.8, 0, base.z + Math.sin(a) * 0.8), new THREE.Vector3(base.x, 2.2, base.z), 0.04), kit.darkMetal)); }
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 20).translate(base.x, 2.3, base.z), kit.plastic(0xf2f2f2)));
  const rtkPulse = pulses(g, new THREE.Vector3(base.x, 2.4, base.z), 0xf0c674, 5, 1.8, 2, true);
  const baseTop = new THREE.Vector3(base.x, 2.4, base.z).add(g.position);
  const robotTop = new THREE.Vector3();
  const rtk = link(g.parent ?? g, () => baseTop, () => robotTop, 0xf0c674, 0.8);
  // the operator under the field tent, running the mission from the tablet app
  const tent = new THREE.Group();
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) tent.add(mesh(rod(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 2.6, z), 0.04), kit.metal));
  tent.add(mesh(new THREE.ConeGeometry(3.1, 1, 4).rotateY(Math.PI / 4).translate(0, 3.1, 0), kit.plastic(0xf4f4f4, 0.7)));
  tent.position.set(19, 0, -31);
  g.add(tent);
  let u = 0;
  const p = new THREE.Vector3(), tng = new THREE.Vector3();
  return {
    pose: { pos: new THREE.Vector3(16, 30, 80), target: new THREE.Vector3(0, 1, -4) },
    me: new THREE.Vector3(20.5, 0.05, -29.5),
    hold: "tablet",
    update: (dt, t) => {
      u = (u + dt * 2.2 / route.getLength()) % 1;
      route.getPointAt(u, p);
      route.getTangentAt(u, tng);
      hunter.position.set(p.x, 0.05, p.z);
      hunter.rotation.y = Math.atan2(-tng.z, tng.x);
      ahead.forEach((s, i) => route.getPointAt((u + 0.006 + i * 0.006) % 1, s.position));
      scanRings.forEach((r) => r.position.set(p.x, 1.4, p.z));
      scan(dt, t);
      robotTop.set(p.x, 3, p.z).add(g.position);
      rtk(dt, t);
      rtkPulse(dt, t);
    },
  };
}

function next(g: THREE.Group, kit: Kit): Scene {
  // a modern automated factory, opened up so you can look in: a self-running line, a robot arm and an AMR
  const floorMat = kit.reflect(new THREE.MeshStandardMaterial({ color: 0x6d7a74, roughness: 0.32, metalness: 0.1 }), 0.5);
  g.add(block(66, 0.3, 36, floorMat, floorMat, 10, 10, 0).translateZ(-6));
  const yellow = kit.plastic(0xf2c200, 0.5);
  for (const z of [2.2, -10.2]) kit.flat(g, new THREE.PlaneGeometry(60, 0.25), yellow, 0.32).position.set(0, 0.32, z);
  // walls on three sides, steel frame and roof trusses; the front is open and the roof only covers the back
  g.add(block(66, 12, 0.5, kit.corrugated, kit.roofMat, 4, 4).translateZ(-24));
  g.add(block(0.5, 12, 36, kit.corrugated, kit.roofMat, 4, 4).translateX(-33).translateZ(-6));
  g.add(block(0.5, 5, 36, kit.corrugated, kit.roofMat, 4, 4).translateX(33).translateZ(-6));
  const steel = kit.plastic(0x3b4752, 0.5);
  const frame: THREE.BufferGeometry[] = [];
  for (let x = -32; x <= 32; x += 16) {
    for (const z of [12, -24]) frame.push(rod(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 12, z), 0.25, 8));
    frame.push(rod(new THREE.Vector3(x, 12, 12), new THREE.Vector3(x, 12, -24), 0.18));
    frame.push(rod(new THREE.Vector3(x, 12, 12), new THREE.Vector3(x, 14.5, -6), 0.1), rod(new THREE.Vector3(x, 14.5, -6), new THREE.Vector3(x, 12, -24), 0.1));
  }
  for (const z of [12, -6, -24]) frame.push(rod(new THREE.Vector3(-32, 12, z), new THREE.Vector3(32, 12, z), 0.14));
  g.add(mesh(mergeGeometries(frame), steel));
  g.add(block(66, 0.3, 12, kit.roofMat, kit.roofMat, 10, 10, 12).translateZ(-18));
  // racks of crates along the back wall
  const crate = kit.plastic(0x2f6fc0, 0.6);
  for (let x = -28; x <= 4; x += 8) {
    for (const y of [0.3, 2.3, 4.3]) {
      g.add(block(6, 0.12, 2, kit.darkMetal, kit.darkMetal, 10, 10, y).translateX(x).translateZ(-22));
      for (let k = 0; k < 3; k++) if (rand() < 0.8) g.add(block(1.5, 1.1, 1.4, crate, crate, 10, 10, y + 0.12).translateX(x - 2 + k * 2).translateZ(-22));
    }
    for (const dx of [-3, 3]) g.add(mesh(rod(new THREE.Vector3(x + dx, 0.3, -21.2), new THREE.Vector3(x + dx, 6, -21.2), 0.06), yellow));
  }
  const wall = kit.screen(14, 4, (c, W, H) => {
    c.fillStyle = "#0b1016"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#7fd6ca"; c.font = "bold 52px monospace"; c.fillText("LINE 1 · AUTO", 24, 62);
    c.fillStyle = "#39ff88"; c.fillText("● RUNNING", 24, 126);
  }, 1.2);
  wall.position.set(14, 8.5, -23.7);
  g.add(wall);

  // the line: a conveyor bringing boxes to the robot arm
  const lineZ = -4, beltY = 1.05, x0 = -26, x1 = 13.6;
  g.add(block(x1 - x0 + 1, 0.22, 1.3, kit.darkMetal, kit.darkMetal, 10, 10, 0.82).translateX((x0 + x1) / 2).translateZ(lineZ));
  g.add(block(x1 - x0 + 1, 0.04, 1.0, kit.plastic(0x1a1a1a, 0.7), kit.plastic(0x1a1a1a, 0.7), 10, 10, 1.03).translateX((x0 + x1) / 2).translateZ(lineZ));
  for (let x = x0; x <= x1; x += 4) for (const dz of [-0.55, 0.55]) g.add(mesh(rod(new THREE.Vector3(x, 0.3, lineZ + dz), new THREE.Vector3(x, 0.82, lineZ + dz), 0.05), kit.metal));
  // a light curtain and status tower on the line
  for (const dz of [-0.9, 0.9]) g.add(block(0.12, 1.6, 0.12, yellow, yellow, 10, 10, 0.3).translateX(6).translateZ(lineZ + dz));
  const tower = kit.glow(0x39ff88, 2.5);
  g.add(mesh(rod(new THREE.Vector3(8, 0.3, lineZ - 0.9), new THREE.Vector3(8, 2.2, lineZ - 0.9), 0.04), kit.darkMetal));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12).translate(8, 2.35, lineZ - 0.9), tower, false));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12).translate(8, 2.57, lineZ - 0.9), kit.plastic(0x5a4a10, 0.4), false));
  const boxTex = texture(canvas(128, 96, (c) => {
    speckle(c, 128, 96, "#b98d5c", 900, 2);
    c.fillStyle = "rgba(210,190,150,0.9)"; c.fillRect(56, 0, 16, 96);
    c.fillStyle = "#3a2a1a"; c.font = "bold 14px sans-serif"; c.fillText("↑↑", 12, 22);
  }));
  const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.85 });
  type Box = { m: THREE.Mesh; x: number; state: "belt" | "arm" | "out" };
  const boxes: Box[] = Array.from({ length: 12 }, (_, i) => {
    const m = mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), boxMat);
    g.add(m);
    return { m, x: x1 - 2 - i * 3.4, state: "belt" }; // the line starts full
  });
  // a pallet beside the arm, stacked two by two, two layers high
  const armBase = new THREE.Vector3(16.6, 0.3, lineZ);
  const pallet = new THREE.Vector3(16.6, 0.45, lineZ + 2.6);
  g.add(block(1.7, 0.15, 1.4, new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0xb08d60, roughness: 0.9 }), 10, 10, 0.3).translateX(pallet.x).translateZ(pallet.z));
  const slot = (i: number) => new THREE.Vector3(pallet.x + (i % 2 ? 0.42 : -0.42), pallet.y + 0.3 + Math.floor(i / 4) * 0.6, pallet.z + (Math.floor(i / 2) % 2 ? 0.32 : -0.32));
  const placed: Box[] = [];
  // 6-axis robot arm, posed by simple two-link IK every frame
  const orange = kit.plastic(0xf08a3c, 0.35);
  const L1 = 1.7, L2 = 1.5, H0 = 1.1, GRIP = 0.45;
  const arm = new THREE.Group();
  arm.position.copy(armBase);
  arm.add(mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 24).translate(0, 0.25, 0), kit.darkMetal));
  const yaw = new THREE.Group(); arm.add(yaw);
  yaw.add(mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.6, 20).translate(0, 0.8, 0), orange));
  const shoulder = new THREE.Group(); shoulder.position.y = H0; yaw.add(shoulder);
  shoulder.add(mesh(new THREE.BoxGeometry(L1, 0.36, 0.38).translate(L1 / 2, 0, 0), orange));
  shoulder.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 18).rotateX(Math.PI / 2), kit.darkMetal));
  const elbow = new THREE.Group(); elbow.position.x = L1; shoulder.add(elbow);
  elbow.add(mesh(new THREE.BoxGeometry(L2, 0.28, 0.3).translate(L2 / 2, 0, 0), orange));
  elbow.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.45, 16).rotateX(Math.PI / 2), kit.darkMetal));
  const wrist = new THREE.Group(); wrist.position.x = L2; elbow.add(wrist);
  wrist.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12).translate(0, -0.15, 0), kit.darkMetal));
  for (const dz of [-0.12, 0.12]) wrist.add(mesh(new THREE.BoxGeometry(0.06, 0.18, 0.04).translate(0, -GRIP + 0.09, dz), kit.metal));
  g.add(arm);
  const wristTarget = new THREE.Vector3();
  const ik = (tip: THREE.Vector3) => {
    wristTarget.set(tip.x, tip.y + GRIP, tip.z);
    const dx = wristTarget.x - armBase.x, dz = wristTarget.z - armBase.z;
    yaw.rotation.y = Math.atan2(-dz, dx);
    const r = Math.hypot(dx, dz), dy = wristTarget.y - (armBase.y + H0);
    const d = Math.min(L1 + L2 - 0.02, Math.hypot(r, dy));
    const phi = Math.atan2(dy, r);
    const alpha = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
    const beta = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2));
    shoulder.rotation.z = phi + alpha; // elbow up
    elbow.rotation.z = -(Math.PI - beta);
    wrist.rotation.z = -(shoulder.rotation.z + elbow.rotation.z); // gripper keeps pointing down
  };
  const pick = new THREE.Vector3(x1, beltY + 0.62, lineZ); // the gripper takes the box from the top
  const home = new THREE.Vector3(15.4, 2.6, lineZ);
  let job: Box | null = null, jobT = 0;
  const tip = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const hop = (p: THREE.Vector3, q: THREE.Vector3, k: number, lift = 1.2) => { tip.lerpVectors(p, q, smoothK(k)); tip.y += Math.sin(Math.PI * k) * lift; };
  const smoothK = (k: number) => k * k * (3 - 2 * k);

  // an AMR carrying crates around the floor
  const amr = new THREE.Group();
  amr.add(block(1.5, 0.4, 1.0, kit.plastic(0x4a5560, 0.4), kit.plastic(0x2b3038, 0.5), 10, 10, 0.08));
  amr.add(block(1.52, 0.06, 1.02, kit.glow(0x3aa0ff, 2), kit.glow(0x3aa0ff, 2), 10, 10, 0.3));
  amr.add(block(1.2, 0.8, 0.9, crate, crate, 10, 10, 0.48));
  amr.scale.setScalar(1.6);
  g.add(amr);
  const amrPath = new THREE.CatmullRomCurve3([[-24, 6], [0, 7], [22, 6], [24, -12], [0, -13], [-22, -12]].map(([x, z]) => new THREE.Vector3(x, 0.32, z)), true, "centripetal");
  const amrScan = pulses(g, new THREE.Vector3(), 0x3aa0ff, 5, 1.2, 2);
  const amrRings = g.children.slice(-2);
  let au = 0;
  const ap = new THREE.Vector3(), at = new THREE.Vector3();

  return {
    pose: { pos: new THREE.Vector3(22, 12, 30), target: new THREE.Vector3(9, 1.5, -5) },
    me: new THREE.Vector3(-1.2, 0.32, lineZ + 2.4),
    hold: "tablet",
    update: (dt, t) => {
      // the belt brings boxes to the arm; a box waits at the end while the arm is busy
      for (const bx of boxes) {
        if (bx.state !== "belt") continue;
        const ahead = boxes.filter((o) => o !== bx && o.state === "belt" && o.x > bx.x).reduce((m, o) => Math.min(m, o.x), Infinity);
        bx.x = Math.min(bx.x + dt * 1.6, x1, ahead - 1.2);
        bx.m.position.set(bx.x, beltY + 0.32, lineZ);
        bx.m.visible = bx.x > x0 - 0.5;
      }
      // the arm: pick the waiting box and stack it on the pallet
      if (!job && placed.length < 8) {
        const waiting = boxes.find((bx) => bx.state === "belt" && bx.x >= x1 - 0.01);
        if (waiting) { job = waiting; job.state = "arm"; jobT = 0; }
      }
      if (job) {
        jobT += dt / 3.2;
        const drop = slot(placed.length);
        b.set(drop.x, drop.y + 0.32, drop.z);
        if (jobT < 0.3) hop(home, pick, jobT / 0.3, 0.3);
        else if (jobT < 0.4) tip.copy(pick);
        else if (jobT < 0.75) hop(a.copy(pick), b, (jobT - 0.4) / 0.35, 1.2);
        else if (jobT < 1) hop(b, home, (jobT - 0.75) / 0.25, 0.3);
        if (jobT >= 0.4 && jobT < 0.75) job.m.position.set(tip.x, tip.y - 0.32, tip.z);
        if (jobT >= 0.75 && job.state === "arm") { job.state = "out"; job.m.position.copy(drop); placed.push(job); }
        if (jobT >= 1) { job = null; tip.copy(home); }
      } else tip.lerp(home, Math.min(1, dt * 2));
      // a full pallet is shipped: the boxes go back to the start of the line
      if (!job && placed.length >= 8) {
        const minX = Math.min(x0, ...boxes.filter((o) => o.state === "belt").map((o) => o.x));
        placed.forEach((bx, i) => { bx.state = "belt"; bx.x = minX - 3.4 * (i + 1); });
        placed.length = 0;
      }
      (tower as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 2) * 0.8;
      ik(tip);
      // the AMR loops the hall
      au = (au + dt * 2.4 / amrPath.getLength()) % 1;
      amrPath.getPointAt(au, ap);
      amrPath.getTangentAt(au, at);
      amr.position.copy(ap);
      amr.rotation.y = Math.atan2(-at.z, at.x);
      amrRings.forEach((r) => r.position.set(ap.x, 0.45, ap.z));
      amrScan(dt, t);
    },
  };
}

function future(g: THREE.Group, kit: Kit): Scene {
  // a city junction with traffic lights; a self-driving car with a roof sensor rig waits for green.
  // Malaysia drives on the left: eastbound (+x) uses the north lane, southbound (+z) the east lane.
  const cz = -6; // centre of the junction
  const roadW = 12;
  // roads, kerbs and crossings
  const ew = kit.flat(g, new THREE.PlaneGeometry(roadW, 150), kit.road, 0.05);
  ew.position.set(0, 0.05, cz); ew.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  (ew.geometry.attributes.uv.array as Float32Array).forEach((_, i, arr) => { if (i % 2 === 1) arr[i] *= 150 / 16; });
  const ns = kit.flat(g, new THREE.PlaneGeometry(roadW, 120), kit.road, 0.055);
  ns.position.set(0, 0.055, cz);
  (ns.geometry.attributes.uv.array as Float32Array).forEach((_, i, arr) => { if (i % 2 === 1) arr[i] *= 120 / 16; });
  kit.flat(g, new THREE.PlaneGeometry(roadW, roadW), kit.asphalt, 0.06).position.set(0, 0.06, cz);
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 });
  for (let k = -5; k <= 5; k += 1.25) {
    kit.flat(g, new THREE.PlaneGeometry(0.6, 3), white, 0.07).position.set(k, 0.07, cz + 8.5); // south crossing
    kit.flat(g, new THREE.PlaneGeometry(3, 0.6), white, 0.07).position.set(8.5, 0.07, cz + k); // east crossing
  }
  kit.flat(g, new THREE.PlaneGeometry(0.4, roadW / 2), white, 0.07).position.set(-6.6, 0.07, cz - 3); // stop line, eastbound
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pave = kit.flat(g, new THREE.PlaneGeometry(60, 50), kit.paving, 0.12);
    pave.position.set(x * (roadW / 2 + 30), 0.12, cz + z * (roadW / 2 + 25));
  }
  // city blocks on the corners
  const city = [kit.F.city1, kit.F.city3, kit.F.city2, kit.F.tower];
  // tall blocks behind the junction, low shops on the near corners so the camera can see in
  [[-1, -1, 34, 22], [1, -1, 46, 22], [-1, 1, 6, 34], [1, 1, 7, 34]].forEach(([x, z, h, off], i) => {
    const f = city[i];
    const b = block(22, h, 18, f.mat, kit.roofMat, f.tileW, f.tileH);
    b.position.set(x * off, 0.12, cz + z * 22);
    g.add(b);
  });
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) kit.place(kit.lists.lamps, g.position.x + x, g.position.z + cz + z, 1, Math.atan2(-x, -z));
  for (let x = -60; x <= 60; x += 12) if (Math.abs(x) > 14) for (const z of [-8.5, 8.5]) kit.place(kit.lists.trees, g.position.x + x, g.position.z + cz + z, 0.6);
  // traffic lights: a 12 s cycle, the east-west road first
  const lamp = (c: number) => new THREE.MeshStandardMaterial({ color: 0x222222, emissive: c, emissiveIntensity: 0 });
  type Light = { red: THREE.MeshStandardMaterial; amber: THREE.MeshStandardMaterial; green: THREE.MeshStandardMaterial };
  const signal = (x: number, z: number, face: number): Light => {
    const L = { red: lamp(0xff2a2a), amber: lamp(0xffb020), green: lamp(0x39ff88) };
    g.add(mesh(rod(new THREE.Vector3(x, 0.1, z), new THREE.Vector3(x, 4.2, z), 0.08), kit.darkMetal));
    const head = new THREE.Group();
    head.add(block(0.45, 1.3, 0.35, kit.darkMetal, kit.darkMetal, 10, 10, 0));
    [L.red, L.amber, L.green].forEach((m, k) => head.add(mesh(new THREE.SphereGeometry(0.14, 12, 8).translate(0, 1.05 - k * 0.4, 0.18), m, false)));
    head.position.set(x, 3.3, z);
    head.rotation.y = face;
    g.add(head);
    return L;
  };
  const ewLight = signal(-7.4, cz - 7, -Math.PI / 2);
  const nsLight = signal(7, cz - 7.4, 0);
  const setLight = (L: Light, state: "red" | "amber" | "green") => { L.red.emissiveIntensity = state === "red" ? 4 : 0; L.amber.emissiveIntensity = state === "amber" ? 4 : 0; L.green.emissiveIntensity = state === "green" ? 4 : 0; };
  // the autonomous car: a white saloon with a roof rack, LiDAR and cameras
  const av = kit.makeCar(0xf4f4f2);
  av.add(block(1.2, 0.1, 1.1, kit.darkMetal, kit.darkMetal, 10, 10, 1.5).translateX(-0.4));
  av.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.24, 20).translate(-0.4, 1.74, 0), kit.plastic(0x2b2b2b, 0.3)));
  for (const [x, z] of [[0.15, 0.5], [0.15, -0.5], [-0.95, 0.5], [-0.95, -0.5]]) av.add(block(0.14, 0.12, 0.14, kit.plastic(0x111111), kit.plastic(0x111111), 10, 10, 1.6).translateX(x).translateZ(z));
  av.add(mesh(new THREE.BoxGeometry(4.5, 0.05, 1.8).translate(0, 0.32, 0), kit.glow(0x2ee6c4, 1.5), false));
  av.scale.setScalar(1.15);
  g.add(av);
  const avScan = pulses(g, new THREE.Vector3(), 0x2ee6c4, 16, 1.3, 3);
  const avRings = g.children.slice(-3);
  // what the car sees: boxes around other cars and people, and its planned path
  const seen = new THREE.LineBasicMaterial({ color: 0x6ffff0, transparent: true, opacity: 0.9, depthTest: false });
  const boxAround = (o: THREE.Object3D, w: number, h: number, d: number, y = h / 2) => { const bx = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), seen); bx.position.y = y; bx.renderOrder = 7; o.add(bx); };
  const path = mesh(new THREE.PlaneGeometry(1, 1.6).rotateX(-Math.PI / 2).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: 0x2ee6c4, transparent: true, opacity: 0.35, depthWrite: false }), false);
  path.position.y = 0.12;
  g.add(path);
  // cross traffic and people on the crossing
  type Mover = { o: THREE.Object3D; p: number; axis: "x" | "z"; lane: number; dir: number; stopAt: number; speed: number; from: number; to: number };
  const movers: Mover[] = [];
  [0, 1].forEach((i) => { const c = kit.makeCar(kit.paints[(i * 2 + 1) % kit.paints.length]); g.add(c); boxAround(c, 4.6, 1.6, 2, 0.8); movers.push({ o: c, p: -50 - i * 26, axis: "z", lane: 3, dir: 1, stopAt: cz - 9, speed: 9, from: -50, to: 40 }); });
  [0, 1].forEach((i) => { const c = kit.makeCar(kit.paints[(i * 3) % kit.paints.length]); g.add(c); boxAround(c, 4.6, 1.6, 2, 0.8); movers.push({ o: c, p: 40 + i * 26, axis: "z", lane: -3, dir: -1, stopAt: cz + 9, speed: 9, from: 40, to: -50 }); });
  const peds = [kit.makePerson(0xe8648a, 0x2c2c2c), kit.makePerson(0xf0c674, 0x1f2a44)].map((pp, i) => {
    pp.scale.setScalar(1.8); g.add(pp); boxAround(pp, 0.8, 1.9, 0.8, 0.95);
    return { o: pp, p: i * 6, dir: i ? -1 : 1 };
  });
  let avX = -60, avV = 0;
  const avZ = cz - 3; // eastbound lane
  return {
    pose: { pos: new THREE.Vector3(26, 24, 50), target: new THREE.Vector3(0, 1.5, -8) },
    me: new THREE.Vector3(10.5, 0.15, cz + 11),
    update: (dt, t) => {
      const ph = t % 12;
      const ew = ph < 5 ? "green" : ph < 6 ? "amber" : "red";
      const nsState = ph >= 6.5 && ph < 11 ? "green" : ph >= 11 && ph < 12 ? "amber" : "red";
      setLight(ewLight, ew);
      setLight(nsLight, nsState);
      // the self-driving car: slows to stop at the line on amber/red, goes on green
      const stopX = -9;
      const mustStop = ew !== "green" && avX < stopX - 0.5;
      const gap = mustStop ? stopX - avX : 99;
      const want = mustStop ? Math.min(11, Math.max(0, gap * 1.2)) : 11;
      avV += THREE.MathUtils.clamp(want - avV, -dt * 8, dt * 5);
      avX += avV * dt;
      if (avX > 70) avX = -70;
      av.position.set(avX, 0.06, avZ);
      av.rotation.y = 0;
      avRings.forEach((r) => r.position.set(avX, 1.2, avZ));
      avScan(dt, t);
      const ahead = mustStop ? Math.max(0.5, gap) : 22;
      path.position.set(avX + 2.6, 0.12, avZ);
      path.scale.set(ahead, 1, 1);
      // cross traffic stops for its red light
      for (const m of movers) {
        const before = m.dir > 0 ? m.p < m.stopAt : m.p > m.stopAt;
        const blocked = nsState !== "green" && before && Math.abs(m.p - m.stopAt) < 14;
        if (!blocked || Math.abs(m.p - m.stopAt) > 0.6) m.p += m.dir * dt * (blocked ? Math.min(m.speed, Math.abs(m.p - m.stopAt) * 1.5) : m.speed);
        if ((m.dir > 0 && m.p > m.to) || (m.dir < 0 && m.p < m.to)) m.p = m.from;
        m.o.position.set(m.lane, 0.06, m.p);
        m.o.rotation.y = m.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      // people cross the east side while the east-west road is red
      peds.forEach((pd, i) => {
        if (ew === "red") pd.p = Math.min(12, pd.p + dt * 1.5);
        else if (pd.p >= 12) pd.p = 0;
        const z = cz + (pd.dir > 0 ? -6 + pd.p : 6 - pd.p);
        pd.o.position.set(8.5 + (i ? 0.8 : -0.8), 0.1, z);
        pd.o.rotation.y = pd.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        walk(pd.o, t + i, ew === "red" && pd.p < 12 ? 1 : 0);
        pd.o.position.y += 0.1;
      });
    },
  };
}

const builders = { matrik, umpsa, dreamedge, guthrie, mimos, next, future };

// ---------------------------------------------------------------- the page
type Opts = { reducedMotion: boolean };

export function startJourney3D(host: HTMLElement, stage: HTMLElement, opts: Opts) {
  const wide = () => matchMedia("(min-width: 901px)").matches;
  let tick: Updater = () => {};
  const engine = createEngine({ host, stage, fov: 30, shadowSize: 110, viewOffset: () => (wide() ? 0.17 : 0), onFrame: (dt, t) => tick(dt, t) });
  const { kit, scene, camera, cvs } = engine;
  const N = journey.length;

  // the road through my career, with lamps and trees
  const roadPt = (i: number) => new THREE.Vector3(i * GAP, 0, Math.sin(i * 1.3) * 22);
  const knots = [roadPt(-1.2), ...journey.map((_, i) => roadPt(i)), roadPt(N - 0.4)];
  const road = new THREE.CatmullRomCurve3(knots, false, "centripetal");
  kit.ribbon(scene, road, 13, kit.concrete, 0.03, 16, 700);
  kit.ribbon(scene, road, 9, kit.road, 0.05, 16, 700);
  for (let d = 0; d < road.getLength(); d += 42) {
    const u = d / road.getLength();
    const p = road.getPointAt(u), tg = road.getTangentAt(u);
    const n = new THREE.Vector3(-tg.z, 0, tg.x);
    const side = Math.round(d / 42) % 2 ? 1 : -1;
    kit.place(kit.lists.lamps, p.x + n.x * side * 6.4, p.z + n.z * side * 6.4, 1, Math.atan2(-side * n.x, -side * n.z));
    if (rand() < 0.7) kit.place(rand() < 0.5 ? kit.lists.trees : kit.lists.palms, p.x - n.x * (10 + rand() * 6) * (n.z > 0 ? 1 : -1), p.z + Math.abs(n.z) * (10 + rand() * 6), 0.8 + rand() * 0.4);
  }
  // forest behind the scenes, and fields between them
  for (let i = 0; i < 420; i++) {
    const x = -300 + rand() * (N * GAP + 400);
    const z = -140 - rand() * 260;
    kit.place(rand() < 0.65 ? kit.lists.trees : kit.lists.palms, x, z, 0.9 + rand() * 0.6);
  }
  for (let i = 0; i < 160; i++) {
    const x = -300 + rand() * (N * GAP + 400);
    const z = 40 + rand() * 120;
    if (journey.some((_, k) => Math.abs(x - k * GAP) < 70)) continue;
    kit.place(rand() < 0.5 ? kit.lists.trees : kit.lists.palms, x, z, 0.8 + rand() * 0.5);
  }

  // the stops, and a roadside sign at each one
  const scenes: Scene[] = journey.map((s, i) => {
    const g = new THREE.Group();
    const c = roadPt(i).add(new THREE.Vector3(0, 0, SIDE));
    g.position.copy(c);
    scene.add(g);
    const built = builders[s.scene](g, kit);
    const sign = kit.screen(9, 2.6, (ctx, W, H) => {
      ctx.fillStyle = "#0f1720"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#7fd6ca"; ctx.font = "bold 44px sans-serif"; ctx.textBaseline = "middle"; ctx.fillText(s.years, 24, H * 0.32);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 40px sans-serif"; ctx.fillText(s.org.split(" · ")[0], 24, H * 0.72);
    }, 0.9);
    const rp = roadPt(i);
    sign.position.set(rp.x - 34, 4.2, rp.z + 9);
    scene.add(sign);
    for (const dx of [-4, 4]) scene.add(mesh(rod(new THREE.Vector3(rp.x - 34 + dx, 0, rp.z + 8.9), new THREE.Vector3(rp.x - 34 + dx, 3, rp.z + 8.9), 0.1), kit.darkMetal));
    built.pose.pos.add(c);
    built.pose.target.add(c);
    return built;
  });

  // me: standing in each scene, walking to the next one as you scroll
  const me = kit.makePerson(0x2aa198, 0x2c3e57);
  me.scale.setScalar(1.8);
  const tablet = kit.screen(0.36, 0.24, (c, W, H) => { c.fillStyle = "#0b1416"; c.fillRect(0, 0, W, H); c.strokeStyle = "#2ee6c4"; c.lineWidth = 10; c.beginPath(); c.moveTo(40, H - 40); c.quadraticCurveTo(W / 2, 20, W - 40, H / 2); c.stroke(); c.fillStyle = "#ff3b3b"; c.fillRect(W - 110, H - 80, 90, 60); }, 1.6);
  tablet.position.set(0.32, 1.25, 0);
  tablet.rotation.set(0, Math.PI / 2, -0.5);
  const remote = mesh(new THREE.BoxGeometry(0.25, 0.05, 0.35).translate(0.32, 1.2, 0), kit.plastic(0x222222));
  me.add(tablet, remote);
  scene.add(me);
  const spots = scenes.map((sc, i) => sc.me.clone().add(roadPt(i).add(new THREE.Vector3(0, 0, SIDE))));

  // camera poses: an overview first, then one per stop
  const poses = [{ pos: new THREE.Vector3(-170, 60, 120), target: new THREE.Vector3(120, 4, -60) }, ...scenes.map((s) => s.pose)];
  const posCurve = new THREE.CatmullRomCurve3(poses.map((p) => p.pos), false, "centripetal");
  const tgtCurve = new THREE.CatmullRomCurve3(poses.map((p) => p.target), false, "centripetal");

  // ---------- scroll → where we are on the journey (0 = overview, 1..N = stops)
  const secs = [...host.querySelectorAll<HTMLElement>("[data-j-sec]")];
  const dots = [...host.querySelectorAll<HTMLElement>("[data-j-dot]")];
  const meTag = host.querySelector<HTMLElement>("[data-j-me]");
  let target = 0, current = 0, active = -1;
  const readScroll = () => {
    const y = scrollY + innerHeight * 0.5;
    let s = 0;
    for (let i = 0; i < secs.length; i++) {
      const top = secs[i].offsetTop, h = secs[i].offsetHeight;
      const mid = top + h / 2;
      if (y >= mid) s = i;
      if (y >= mid && i + 1 < secs.length) {
        const nmid = secs[i + 1].offsetTop + secs[i + 1].offsetHeight / 2;
        s = i + Math.min(1, (y - mid) / (nmid - mid));
      }
    }
    target = Math.min(secs.length - 1, Math.max(0, s));
  };
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", readScroll);
  // arriving with a link like about/#experience: centre that stop and start there
  const hashed = location.hash ? host.querySelector(decodeURIComponent(location.hash))?.closest<HTMLElement>("[data-j-sec]") : null;
  if (hashed) hashed.scrollIntoView({ block: "center", behavior: "instant" });
  readScroll();
  current = target;
  dots.forEach((d, i) => d.addEventListener("click", () => secs[i]?.scrollIntoView({ behavior: opts.reducedMotion ? "auto" : "smooth" })));

  const ease = (f: number) => f * f * f * (f * (f * 6 - 15) + 10); // dwell at each stop
  const tmp = new THREE.Vector3(), look = new THREE.Vector3(), meAt = new THREE.Vector3(), meDir = new THREE.Vector3();
  tick = (dt, t) => {
    current += (target - current) * (1 - Math.exp(-dt * (opts.reducedMotion ? 30 : 3.2)));
    const k = Math.floor(current), f = current - k;
    const s = Math.min(N, k + ease(Math.min(1, f)));
    const u = s / N;
    posCurve.getPoint(u, camera.position);
    tgtCurve.getPoint(u, look);
    camera.position.x += Math.sin(t * 0.13) * 2;
    camera.position.y += Math.sin(t * 0.11) * 1;
    camera.lookAt(look);
    engine.focus.copy(look);

    // me: at my spot in the stop you're at, walking across between stops
    const ms = THREE.MathUtils.clamp(current - 1, 0, N - 1);
    const mk = Math.min(N - 2, Math.floor(ms)), mf = ease(Math.min(1, ms - mk));
    meAt.lerpVectors(spots[mk], spots[mk + 1], mf);
    const step = meAt.distanceTo(me.position);
    if (step > 0.01) { meDir.subVectors(meAt, me.position); me.rotation.y = Math.atan2(-meDir.z, meDir.x); }
    else me.rotation.y += (-Math.PI / 2 - me.rotation.y) * Math.min(1, dt * 3); // settle facing the camera
    me.position.copy(meAt);
    walk(me, t, Math.min(1, step * 8));
    me.position.y = meAt.y + Math.abs(Math.sin(t * 7)) * 0.05 * Math.min(1, step * 8);
    const stop = scenes[Math.round(ms)];
    const still = step < 0.01;
    tablet.visible = still && stop.hold === "tablet";
    remote.visible = still && stop.hold === "remote";
    const armL = me.getObjectByName("armL"), armR = me.getObjectByName("armR");
    if (still && stop.hold && armL && armR) { armL.rotation.z = 1.1; armR.rotation.z = 1.1; }
    if (meTag) {
      tmp.set(me.position.x, me.position.y + 4.6, me.position.z).project(camera);
      meTag.style.opacity = tmp.z < 1 && current > 0.5 ? "" : "0";
      meTag.style.transform = `translate(${((tmp.x + 1) / 2) * cvs.clientWidth}px, ${((1 - tmp.y) / 2) * cvs.clientHeight}px)`;
    }

    // only animate the stops you can see
    scenes.forEach((sc, i) => { if (Math.abs(current - (i + 1)) < 1.6) sc.update(dt, t); });
    const a = Math.round(current);
    if (a !== active) {
      active = a;
      dots.forEach((d, i) => d.classList.toggle("on", i === a));
      secs.forEach((sec, i) => sec.classList.toggle("on", i === a));
    }
  };

  engine.start();
  host.classList.add("j3-ready");

  return () => {
    removeEventListener("scroll", readScroll);
    removeEventListener("resize", readScroll);
    engine.dispose();
    host.classList.remove("j3-ready");
  };
}
