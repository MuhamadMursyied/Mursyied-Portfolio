// "My world" on the home page.
// - hovering a building or its name lifts both (the buildings themselves are plain links)
// - a little robot drives a loop on the road behind me
// - on the full-screen home page: drag / scroll / buttons move the camera, a slow "orbit"
//   drift, a live Malaysia clock and the current weather in Rawang (Open-Meteo, no key needed)

import { robot } from "../iso";

const LAT = 3.32;
const LON = 101.58;
const TIME_ZONE = "Asia/Kuala_Lumpur";

export function initWorld(): (() => void) | undefined {
  const found = document.querySelector<HTMLElement>("[data-world]");
  if (!found) return;
  const root = found;
  const cleanups: (() => void)[] = [];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const items = [...root.querySelectorAll<SVGElement>("[data-d]")];
  items.forEach((el) => {
    const id = el.getAttribute("data-d");
    const mark = (on: boolean) => items.forEach((other) => other.classList.toggle("hl", on && other.getAttribute("data-d") === id));
    el.addEventListener("pointerenter", () => mark(true));
    el.addEventListener("pointerleave", () => mark(false));
  });

  const home = document.querySelector<HTMLElement>("[data-home]");
  const camera = home ? setupCamera(home, root) : null;
  if (home) {
    cleanups.push(startClock(home));
    loadWeather(home);
    boot(home, reducedMotion);
  }

  // ---------- the robot: a small oval on the road between me and Career HQ ----------
  // (that spot has no building in front of it, so the robot is never hidden)
  const robotLayer = root.querySelector<SVGGElement>(".w-robot");
  if (robotLayer) {
    const road = (195 * Math.PI) / 180;
    const along = { x: Math.cos(road), y: Math.sin(road) };
    const across = { x: -along.y, y: along.x };
    const center = { x: 3.1 * along.x, y: 3.1 * along.y };
    const rx = 1.0;
    const ry = 0.55;
    let t = 1.2;
    const draw = () => {
      const c = rx * Math.cos(t);
      const s = ry * Math.sin(t);
      const x = center.x + c * along.x + s * across.x;
      const y = center.y + c * along.y + s * across.y;
      const dc = -rx * Math.sin(t);
      const ds = ry * Math.cos(t);
      const heading = Math.atan2(dc * along.y + ds * across.y, dc * along.x + ds * across.x);
      robotLayer.innerHTML = robot(x, y, heading, 0.75);
    };
    draw();
    if (!reducedMotion) {
      let frame = 0;
      let last = performance.now();
      let visible = true;
      const loop = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (visible) {
          t += dt * 0.45;
          draw();
          camera?.tick(dt);
        }
        frame = requestAnimationFrame(loop);
      };
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      io.observe(root);
      frame = requestAnimationFrame(loop);
      cleanups.push(() => { cancelAnimationFrame(frame); io.disconnect(); });
    }
  }
  if (camera) cleanups.push(camera.stop);

  return () => cleanups.forEach((fn) => fn());
}

// ---------- camera: fit, zoom, drag to pan, slow orbit drift ----------
function setupCamera(home: HTMLElement, root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>("svg")!;
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const wide = () => matchMedia("(min-width: 901px)").matches;
  // On wide screens the text sits on the left, so the world is shifted to the right.
  const homeView = () => (wide() ? { x: -230, y: -10, scale: 1 } : { x: 0, y: -25, scale: 1 });
  const view = { ...homeView() };
  let orbit = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let time = 0;
  const orbitBtn = home.querySelector<HTMLButtonElement>("[data-view=orbit]");

  function apply() {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const baseW = wide() ? 2150 : Math.max(1050, (820 * r.width) / r.height);
    const w = baseW / view.scale;
    const h = (w * r.height) / r.width;
    let x = view.x;
    let y = view.y;
    let scale = 1;
    if (orbit) {
      x += 70 * Math.sin(time * 0.13);
      y += 22 * Math.sin(time * 0.1);
      scale = 1 + 0.05 * Math.sin(time * 0.08);
    }
    const sw = w / scale;
    const sh = h / scale;
    svg.setAttribute("viewBox", `${(x - sw / 2).toFixed(1)} ${(y - sh / 2).toFixed(1)} ${sw.toFixed(1)} ${sh.toFixed(1)}`);
  }
  const setOrbit = (on: boolean) => {
    orbit = on;
    orbitBtn?.setAttribute("aria-pressed", String(on));
    home.classList.toggle("orbiting", on);
    apply();
  };

  home.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const action = btn.dataset.view;
      if (action === "in") view.scale = Math.min(2.6, view.scale * 1.25);
      if (action === "out") view.scale = Math.max(0.7, view.scale / 1.25);
      if (action === "home") Object.assign(view, homeView());
      if (action === "orbit") setOrbit(!orbit);
      else apply();
    }),
  );

  // drag to pan; a drag never counts as a click on a building
  let drag: { x: number; y: number; moved: boolean } | null = null;
  let justDragged = false;
  svg.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; svg.setPointerCapture(e.pointerId); svg.classList.add("dragging"); setOrbit(false); }
    const r = svg.getBoundingClientRect();
    const unitsPerPx = Number(svg.getAttribute("viewBox")!.split(" ")[2]) / r.width;
    view.x -= dx * unitsPerPx;
    view.y -= dy * unitsPerPx;
    drag.x = e.clientX;
    drag.y = e.clientY;
    apply();
  });
  const end = () => {
    justDragged = !!drag?.moved;
    drag = null;
    svg.classList.remove("dragging");
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("click", (e) => {
    if (justDragged) { e.preventDefault(); e.stopPropagation(); justDragged = false; }
  }, true);
  // the home page never scrolls, so the wheel can zoom
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    view.scale = Math.min(2.6, Math.max(0.7, view.scale * Math.exp(-e.deltaY * 0.0012)));
    apply();
  }, { passive: false });

  const onResize = () => { Object.assign(view, homeView()); apply(); };
  addEventListener("resize", onResize);
  setOrbit(orbit);

  return {
    tick(dt: number) {
      if (!orbit) return;
      time += dt;
      apply();
    },
    stop() { removeEventListener("resize", onResize); },
  };
}

// ---------- live clock in Malaysia time ----------
function startClock(home: HTMLElement) {
  const clockEl = home.querySelector<HTMLElement>("[data-hud-clock]");
  const partEl = home.querySelector<HTMLElement>("[data-hud-tod]");
  const format = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tick = () => {
    const text = format.format(new Date());
    if (clockEl) clockEl.textContent = text;
    const hour = Number(text.slice(0, 2));
    const part = hour >= 5 && hour < 12 ? "Morning" : hour < 16 && hour >= 12 ? "Afternoon" : hour < 19 && hour >= 16 ? "Evening" : "Night";
    if (partEl) partEl.textContent = part;
    home.dataset.tod = part.toLowerCase();
  };
  tick();
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}

// ---------- current weather in Rawang ----------
type Weather = { temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; precipitation: number; weather_code: number };

function describe(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

async function loadWeather(home: HTMLElement) {
  const set = (key: string, text: string) => {
    const el = home.querySelector<HTMLElement>(`[data-w=${key}]`);
    if (el) el.textContent = text;
  };
  const show = (w: Weather) => {
    set("temp", `${Math.round(w.temperature_2m)}°C`);
    set("cond", describe(w.weather_code));
    set("wind", `${Math.round(w.wind_speed_10m)} km/h`);
    set("hum", `${Math.round(w.relative_humidity_2m)}%`);
    set("rain", `${w.precipitation.toFixed(1)} mm`);
    set("status", "Live · Open-Meteo");
    home.classList.add("has-weather");
  };
  // keep it for 15 minutes so moving between tabs doesn't refetch
  try {
    const cached = JSON.parse(sessionStorage.getItem("weather") || "null");
    if (cached && Date.now() - cached.at < 15 * 60 * 1000) return show(cached.data);
  } catch { /* storage blocked */ }
  try {
    const query = `latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&timezone=${encodeURIComponent(TIME_ZONE)}`;
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()).current as Weather;
    show(data);
    try { sessionStorage.setItem("weather", JSON.stringify({ at: Date.now(), data })); } catch { /* storage blocked */ }
  } catch {
    set("cond", "Weather unavailable");
    set("status", "Offline");
  }
}

// ---------- "assembling my little world" intro, once per visit ----------
function boot(home: HTMLElement, reducedMotion: boolean) {
  const overlay = home.querySelector<HTMLElement>("[data-boot]");
  if (!overlay) return;
  let seen = false;
  try { seen = sessionStorage.getItem("booted") === "1"; sessionStorage.setItem("booted", "1"); } catch { /* storage blocked */ }
  if (seen || reducedMotion) { overlay.remove(); return; }
  const line = overlay.querySelector<HTMLElement>("[data-boot-line]");
  const steps = ["Reading my CV", "Raising the buildings", "Waking up the robot"];
  steps.forEach((text, i) => setTimeout(() => { if (line) line.textContent = text; }, 350 + i * 380));
  setTimeout(() => overlay.classList.add("done"), 1600);
  setTimeout(() => overlay.remove(), 2300);
}
