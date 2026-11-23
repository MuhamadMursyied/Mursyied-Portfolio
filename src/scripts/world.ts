// "My world" on the home page.
// - hovering a building or its name lifts both (the buildings themselves are plain links)
// - a little robot drives a loop on the road behind me
// - on the full-screen home page: drag / scroll / buttons move the camera, a slow "orbit"
//   drift, a live Malaysia clock and the current weather in Rawang (Open-Meteo, no key needed)

import { robot } from "../iso";
import { url } from "../utils";

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
  if (home) {
    cleanups.push(startClock(home));
    loadWeather(home);
    boot(home, reducedMotion);
  }

  // The full-screen home page gets the real 3D world; the drawn map stays as the fallback.
  if (home && webgl()) {
    let stop3d: (() => void) | undefined;
    let gone = false;
    home.classList.add("w3-loading"); // hide the drawn map while the 3D world loads
    import("./world3d")
      .then(({ startWorld3D }) => {
        if (gone) return;
        stop3d = startWorld3D(home, root, { reducedMotion, baseUrl: url });
        home.classList.remove("w3-loading");
        const hint = home.querySelector(".hud-band .hint");
        if (hint) hint.textContent = "Drag to look around · Scroll to zoom · Click a building to explore";
      })
      .catch((err) => {
        console.warn("3D world unavailable, using the map", err);
        home.classList.remove("w3-loading");
        if (!gone) cleanups.push(draw2d(root, home, reducedMotion));
      });
    cleanups.push(() => { gone = true; stop3d?.(); });
  } else {
    cleanups.push(draw2d(root, home, reducedMotion));
  }

  return () => cleanups.forEach((fn) => fn());
}

function webgl() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

// The drawn isometric map: robot loop and (on the home page) camera controls.
function draw2d(root: HTMLElement, home: HTMLElement | null, reducedMotion: boolean) {
  const cleanups: (() => void)[] = [];
  const camera = home ? setupCamera(home, root) : null;

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

// ---------- live clock in the visitor's place (Malaysia until we know where they are) ----------
function startClock(home: HTMLElement) {
  const clockEl = home.querySelector<HTMLElement>("[data-hud-clock]");
  const partEl = home.querySelector<HTMLElement>("[data-hud-tod]");
  let zone = "";
  let format: Intl.DateTimeFormat | null = null;
  const tick = () => {
    const tz = home.dataset.tz || TIME_ZONE;
    if (tz !== zone || !format) {
      zone = tz;
      try { format = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
      catch { format = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
    }
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

// ---------- where the visitor is ----------
// 1. a place they shared before with "Use my location" (exact, e.g. "Bukit Jalil, Kuala Lumpur")
// 2. otherwise a rough guess from their internet connection (city level, no permission prompt)
// 3. otherwise Rawang, where I am
type Place = { lat: number; lon: number; name: string; precise: boolean };
const HOME_PLACE: Place = { lat: LAT, lon: LON, name: "Rawang, Selangor", precise: false };

const store = {
  get(area: Storage | undefined, key: string) { try { return JSON.parse(area?.getItem(key) || "null"); } catch { return null; } },
  set(area: Storage | undefined, key: string, value: unknown) { try { area?.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } },
};
const local = () => { try { return localStorage; } catch { return undefined; } };
const session = () => { try { return sessionStorage; } catch { return undefined; } };

async function guessPlace(): Promise<Place> {
  const saved = store.get(local(), "place") as Place | null;
  if (saved?.precise) return saved;
  const cached = store.get(session(), "ipPlace") as Place | null;
  if (cached) return cached;
  try {
    const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en");
    const d = await res.json();
    if (typeof d.latitude === "number" && (d.latitude || d.longitude)) {
      const town = d.locality || d.city;
      const name = [town, d.countryName].filter(Boolean).join(", ") || "Your area";
      const place = { lat: d.latitude, lon: d.longitude, name, precise: false };
      store.set(session(), "ipPlace", place);
      return place;
    }
  } catch { /* offline or blocked */ }
  return HOME_PLACE;
}

function exactPlace(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const lat = coords.latitude, lon = coords.longitude;
      let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      try {
        // OpenStreetMap knows neighbourhoods such as "Bukit Jalil"
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=16&accept-language=en`);
        const a = (await res.json()).address || {};
        const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town;
        const city = a.city || a.town || a.county || a.state;
        name = [area, city !== area ? city : null].filter(Boolean).join(", ") || name;
      } catch { /* keep the coordinates as the name */ }
      const place = { lat, lon, name, precise: true };
      store.set(local(), "place", place);
      resolve(place);
    }, reject, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
  });
}

// ---------- current weather where the visitor is ----------
type Weather = { temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; precipitation: number; weather_code: number };
type Forecast = { current: Weather; timezone: string; timezone_abbreviation: string; utc_offset_seconds: number };

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

function coords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
}

async function loadWeather(home: HTMLElement) {
  const set = (key: string, text: string) => {
    const el = home.querySelector<HTMLElement>(`[data-w=${key}]`);
    if (el) el.textContent = text;
  };
  const placeEl = home.querySelector<HTMLElement>("[data-hud-place]");
  const coordsEl = home.querySelector<HTMLElement>("[data-hud-coords]");
  const locate = home.querySelector<HTMLButtonElement>("[data-locate]");

  const show = (place: Place, f: Forecast) => {
    const w = f.current;
    set("temp", `${Math.round(w.temperature_2m)}°C`);
    set("cond", describe(w.weather_code));
    set("wind", `${Math.round(w.wind_speed_10m)} km/h`);
    set("hum", `${Math.round(w.relative_humidity_2m)}%`);
    set("rain", `${w.precipitation.toFixed(1)} mm`);
    set("status", place.precise ? "Your location · live" : place === HOME_PLACE ? "Rawang · live" : "Near you · live");
    if (placeEl) placeEl.textContent = `${place.name} · ${f.timezone_abbreviation}`;
    if (coordsEl) coordsEl.textContent = coords(place.lat, place.lon);
    if (locate) locate.hidden = place.precise;
    home.classList.add("has-weather");
    Object.assign(home.dataset, {
      wcode: String(w.weather_code),
      wrain: String(w.precipitation),
      lat: String(place.lat),
      lon: String(place.lon),
      tz: f.timezone,
      utcoff: String(f.utc_offset_seconds),
    });
    home.dispatchEvent(new Event("weather"));
  };

  const fetchFor = async (place: Place) => {
    // keep it for 15 minutes per place so moving between tabs doesn't refetch
    const key = `weather:${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
    const cached = store.get(session(), key);
    if (cached && Date.now() - cached.at < 15 * 60 * 1000) return show(place, cached.data);
    try {
      const query = `latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&timezone=auto`;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Forecast;
      show(place, data);
      store.set(session(), key, { at: Date.now(), data });
    } catch {
      set("cond", "Weather unavailable");
      set("status", "Offline");
    }
  };

  if (locate) {
    locate.onclick = async () => {
      locate.disabled = true;
      set("status", "Finding you…");
      try { await fetchFor(await exactPlace()); }
      catch { set("status", "Location not shared · showing your area"); }
      finally { locate.disabled = false; }
    };
  }
  await fetchFor(await guessPlace());
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
