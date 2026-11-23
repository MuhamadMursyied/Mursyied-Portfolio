// The shared 3D engine: renderer, physical sky with the real sun, weather, night lighting,
// rain, dust and the cinematic post-processing. A page builds its own scene with the kit,
// moves the camera in onFrame, and sets `focus` to the point it is looking at
// (shadows, dust, rain and depth of field follow that point).
//
// The host element carries the live data written by world.ts:
// data-lat, data-lon, data-utcoff (visitor's place), data-wcode, data-wrain (weather).
// URL previews: ?time=19:30  ?weather=rain|clear|cloudy

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { gradePass, sunPass } from "../cinematic";
import { createKit, rand, smooth, mesh } from "./kit";

const RAWANG = { lat: 3.32, lon: 101.58 };

// ---------------------------------------------------------------- sun position (after SunCalc / NOAA)
export function sunPosition(date: Date, lat: number, lon: number) {
  const rad = Math.PI / 180;
  const d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const e = rad * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = rad * (280.16 + 360.9856235 * d) + rad * lon - ra;
  const phi = rad * lat;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // from south, towards west
  // world: north = -z, east = +x, up = +y
  return new THREE.Vector3(-Math.cos(altitude) * Math.sin(azimuth), Math.sin(altitude), Math.cos(altitude) * Math.cos(azimuth));
}

function nowFor(params: URLSearchParams, host: HTMLElement) {
  const t = params.get("time");
  const m = t && /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return () => new Date();
  const base = new Date();
  const started = Date.now();
  // the given time is local time at the visitor's place (UTC+8 until we know it)
  return () => {
    const off = Number(host.dataset.utcoff ?? 28800) * 1000;
    const at = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), Number(m[1]), Number(m[2])) - off;
    return new Date(at + (Date.now() - started));
  };
}

export type EngineOpts = {
  host: HTMLElement; // element with the live data attributes
  stage: HTMLElement; // where the canvas goes
  fov: number;
  far?: number;
  shadowSize?: number; // half size of the sun's shadow box, metres
  // shift the picture sideways (fraction of the width) so text on the left doesn't cover it
  viewOffset?: () => number;
  onFrame: (dt: number, t: number) => void;
};

export type Engine = ReturnType<typeof createEngine>;

export function createEngine(o: EngineOpts) {
  const params = new URLSearchParams(location.search);
  const now = nowFor(params, o.host);
  const small = matchMedia("(max-width: 900px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const kit = createKit();

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const cvs = renderer.domElement;
  cvs.className = "w3-canvas";
  o.stage.prepend(cvs);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb9c9d6, 0.001);
  const camera = new THREE.PerspectiveCamera(o.fov, 1, 1, o.far ?? 6000);
  const focus = new THREE.Vector3();

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
  let envRT: THREE.WebGLRenderTarget | null = null;

  // The haze must match the sky at the horizon, or the ground ends in a hard line:
  // render the sky alone into a tiny float target, looking at the horizon, and average it.
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
    return horizon.setRGB(r / n, g / n, b / n);
  }

  const SH = o.shadowSize ?? 95;
  const shadowBox = (l: THREE.DirectionalLight, size: number) => {
    Object.assign(l.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 10, far: 600 });
    l.shadow.mapSize.set(size, size);
    l.shadow.bias = -0.0003;
    l.shadow.normalBias = 0.04;
    l.shadow.camera.updateProjectionMatrix();
  };
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.radius = 3;
  shadowBox(sun, small ? 2048 : 4096);
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0);
  shadowBox(moon, 2048);
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x55603f, 0.6);
  scene.add(hemi);

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
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // the ground everywhere
  const ground = mesh(new THREE.PlaneGeometry(8000, 8000), kit.grass, false);
  ground.rotation.x = -Math.PI / 2;
  (kit.grass.map as THREE.Texture).repeat.set(350, 350);
  scene.add(ground);

  // ---------- rain and dust (they follow the focus point)
  const RAIN = small ? 2500 : 6000;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN * 6);
  for (let i = 0; i < RAIN; i++) {
    const x = (rand() - 0.5) * 220, y = rand() * 90, z = (rand() - 0.5) * 220;
    rainPos.set([x, y, z, x + 0.15, y - 1.4, z + 0.1], i * 6);
  }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.35, depthWrite: false }));
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);

  const DUST = small ? 500 : 1400;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustPos.set([(rand() - 0.5) * 160, rand() * 45, (rand() - 0.5) * 160], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ map: kit.dotTex, color: 0xffe2b8, size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
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
  // depth of field: only a gentle softening far away (strong blur makes it look like a miniature)
  const dof = small ? null : new BokehPass(scene, camera, { focus: 200, aperture: 0.000005, maxblur: 0.002 });
  if (dof) composer.addPass(dof);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = gradePass();
  composer.addPass(grade);

  // ---------- weather and time of day
  const weather = { code: Number(o.host.dataset.wcode ?? 2) };
  const forced = params.get("weather");
  const sunDir = new THREE.Vector3();
  const sunFxK = { rays: 0, flare: 0 };
  let lastEnvSun = new THREE.Vector3(9, 9, 9);
  const state = { nightK: 0, golden: 0, lights: 0 };

  function applySky(forceEnv = false) {
    const lat = Number(o.host.dataset.lat ?? RAWANG.lat), lon = Number(o.host.dataset.lon ?? RAWANG.lon);
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
    const nightK = smooth(0.06, -0.14, alt);
    const day = 1 - nightK;
    const golden = smooth(0.45, 0.04, alt) * day;
    state.nightK = nightK;
    state.golden = golden;

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
    kit.reflective.forEach(({ mat, k }) => { mat.envMapIntensity = k * reflectK; });

    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(sampleHorizon()).lerp(new THREE.Color(0x0b1322).multiplyScalar(0.25), nightK * 0.6);
    fog.density = (overcast ? 0.0009 : 0.00075) + (rainy ? 0.001 : 0); // humid air: the far distance fades out
    renderer.toneMappingExposure = (overcast ? 0.36 : 0.42) + 0.3 * golden + 0.6 * nightK; // like a camera's auto-exposure

    const lights = Math.min(1, smooth(0.12, -0.04, alt) + (overcast ? 0.15 : 0));
    state.lights = lights;
    kit.night.windows.forEach((m) => { m.emissiveIntensity = 0.9 * lights; });
    kit.night.lamps.forEach((m) => { m.emissiveIntensity = 6 * lights; });
    kit.poolMat.opacity = 0.55 * lights;
    bloom.strength = 0.15 + 0.45 * nightK;
    bloom.threshold = 4 - 3.2 * nightK;

    sunFxK.rays = day * (overcast ? 0.15 : 0.55 + 0.9 * golden);
    sunFxK.flare = day * (overcast ? 0 : 0.7);
    (sunFx.uniforms.tint.value as THREE.Color).setRGB(1, 0.78 + 0.15 * (1 - golden), 0.5 + 0.35 * (1 - golden));
    dustMat.opacity = day * (overcast ? 0.15 : 0.35 + 0.5 * golden);
    rain.visible = rainy;
    const wet = rainy ? 1 : 0;
    kit.asphalt.roughness = kit.road.roughness = 1 - 0.55 * wet;
    kit.paving.roughness = 0.75 - 0.4 * wet;
    o.host.dataset.sky = nightK > 0.5 ? "night" : golden > 0.4 ? "golden" : "day";
    // the site theme follows the sky unless the visitor picked one
    let saved: string | null = null;
    try { saved = localStorage.getItem("theme"); } catch { /* storage blocked */ }
    if (!saved && !params.get("theme")) document.documentElement.dataset.theme = nightK > 0.5 ? "dark" : "light";

    if (forceEnv || sunDir.distanceTo(lastEnvSun) > 0.01) {
      lastEnvSun = sunDir.clone();
      envRT?.dispose();
      envRT = pmrem.fromScene(envScene, 0, 0.1, 1000);
      scene.environment = envRT.texture;
      kit.reflective.forEach(({ mat }) => { const first = !mat.envMap; mat.envMap = envRT!.texture; if (first) mat.needsUpdate = true; });
    }
  }
  const onWeather = () => { weather.code = Number(o.host.dataset.wcode ?? weather.code); applySky(true); };
  o.host.addEventListener("weather", onWeather);

  // ---------- size
  function resize() {
    const w = o.stage.clientWidth || innerWidth;
    const h = o.stage.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    gtao?.setSize(w, h);
    sunFx.uniforms.aspect.value = w / h;
    grade.uniforms.resolution.value.set(w, h);
    camera.aspect = w / h;
    const off = o.viewOffset?.() ?? 0;
    if (off) camera.setViewOffset(w, h, -w * off, h * 0.02, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);

  // ---------- loop
  const clock = new THREE.Timer();
  let frame = 0;
  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  const fwd = new THREE.Vector3();
  const sunScreen = new THREE.Vector3();
  const beacons: THREE.MeshStandardMaterial[] = [];
  let skyTimer = 0;

  function loop() {
    frame = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    clock.update();
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.getElapsed();
    o.onFrame(dt, t);

    // the sun's shadow box, dust and rain follow where the camera looks
    sun.position.copy(sunDir).multiplyScalar(300).add(focus);
    sun.target.position.copy(focus);
    moon.position.set(-120, 220, 60).add(focus);
    moon.target.position.copy(focus);
    stars.position.copy(camera.position);
    dust.position.set(focus.x, 0, focus.z);
    dust.rotation.y = t * 0.01;
    beacons.forEach((m) => { m.emissiveIntensity = Math.sin(t * 3) > 0.2 ? 5 : 0.2; });
    skyU.time.value = t;
    kit.wind.value = t;
    grade.uniforms.time.value = t;

    sunScreen.copy(sunDir).multiplyScalar(2000).add(camera.position).project(camera);
    const facing = sunDir.dot(camera.getWorldDirection(fwd)) > 0 && sunScreen.z < 1;
    const onScreen = facing ? 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(sunScreen.x), Math.abs(sunScreen.y)), 1.0, 1.8) : 0;
    sunFx.uniforms.sun.value.set((sunScreen.x + 1) / 2, (sunScreen.y + 1) / 2);
    sunFx.uniforms.rays.value = sunFxK.rays * onScreen;
    sunFx.uniforms.flare.value = sunFxK.flare * (facing && Math.abs(sunScreen.x) < 1 && Math.abs(sunScreen.y) < 1 ? 1 : 0);
    if (dof) (dof.uniforms as Record<string, THREE.IUniform>).focus.value = camera.position.distanceTo(focus);
    if (rain.visible) {
      rain.position.set(focus.x, 0, focus.z);
      const p = rainGeo.attributes.position as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < RAIN; i++) {
        const k = i * 6;
        arr[k + 1] -= dt * 38; arr[k + 4] -= dt * 38;
        if (arr[k + 4] < 0) { const y = 80 + rand() * 10; arr[k + 1] = y; arr[k + 4] = y - 1.4; }
      }
      p.needsUpdate = true;
    }
    composer.render(dt);
    if (++skyTimer % 900 === 0) applySky(); // the sun moves: about every 15 s
  }

  // call after the page has built its scene
  function start() {
    kit.flush(scene);
    scene.traverse((obj) => { if (obj.userData.blink) beacons.push((obj as THREE.Mesh).material as THREE.MeshStandardMaterial); });
    applySky(true);
    resize();
    ro.observe(o.stage);
    io.observe(o.stage);
    loop();
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__w3 = { renderer, scene, sun, camera, sky };
  }

  function dispose() {
    cancelAnimationFrame(frame);
    ro.disconnect();
    io.disconnect();
    o.host.removeEventListener("weather", onWeather);
    composer.dispose();
    pmrem.dispose();
    envRT?.dispose();
    probeRT.dispose();
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
        mat.dispose();
      });
    });
    renderer.dispose();
    cvs.remove();
  }

  return { kit, renderer, scene, camera, cvs, focus, sunDir, state, small, applySky, resize, start, dispose };
}
