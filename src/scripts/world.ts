// "My world" on the home page: open a building's panel on click, and drive the little robot
// around in front of the Robotics Lab.

import { robot } from "../iso";

export function initWorld(): (() => void) | undefined {
  const found = document.querySelector<HTMLElement>("[data-world]");
  if (!found) return;
  const root = found;
  const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")];
  const panelBox = root.querySelector<HTMLElement>(".world-panel")!;
  const robotLayer = root.querySelector<SVGGElement>(".w-robot");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mark = (cls: string, id: string | null) =>
    root.querySelectorAll<Element>("[data-d], [data-road]").forEach((el) => {
      const key = el.getAttribute("data-d") ?? el.getAttribute("data-road");
      el.classList.toggle(cls, key === id);
    });

  function show(id: string, fromMap: boolean) {
    panels.forEach((p) => { p.hidden = p.dataset.panel !== id; });
    mark("active", id === "intro" ? null : id);
    root.querySelectorAll("[data-road]").forEach((r) => r.classList.toggle("on", r.getAttribute("data-road") === id));
    panelBox.scrollTop = 0;
    // On phones the panel is under the map: bring it into view after a tap on the map.
    if (fromMap && panelBox.getBoundingClientRect().top > innerHeight * 0.6) {
      panelBox.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  }

  root.querySelectorAll<HTMLElement | SVGElement>("[data-d]").forEach((el) => {
    const id = el.getAttribute("data-d")!;
    const inMap = el instanceof SVGElement;
    el.addEventListener("click", () => show(id, inMap));
    el.addEventListener("keydown", (e) => {
      const key = (e as KeyboardEvent).key;
      if (inMap && (key === "Enter" || key === " ")) { e.preventDefault(); show(id, true); }
    });
    // hovering a name in the list lifts its building on the map, and the other way round
    el.addEventListener("pointerenter", () => mark("hl", id));
    el.addEventListener("pointerleave", () => mark("hl", null));
  });
  root.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show("intro", false)));

  // ---------- the robot: a small oval on the road between me and Career HQ ----------
  // (that spot has no building in front of it, so the robot is never hidden)
  if (!robotLayer) return;
  const road = (195 * Math.PI) / 180;
  const along = { x: Math.cos(road), y: Math.sin(road) };
  const across = { x: -along.y, y: along.x };
  const center = { x: 3.1 * along.x, y: 3.1 * along.y };
  const rx = 1.0;
  const ry = 0.55;
  let t = 0;
  let frame = 0;
  let last = performance.now();
  let visible = true;

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
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible) { t += dt * 0.45; draw(); }
    frame = requestAnimationFrame(loop);
  };

  t = 1.2;
  draw();
  if (reducedMotion) return;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(root);
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
  };
}
