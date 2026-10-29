// "My world" on the home page: hovering a building or its name lifts both, and a little
// robot drives a loop on the road behind me. The buildings themselves are plain links.

import { robot } from "../iso";

export function initWorld(): (() => void) | undefined {
  const root = document.querySelector<HTMLElement>("[data-world]");
  if (!root) return;
  const items = [...root.querySelectorAll<SVGElement>("[data-d]")];
  items.forEach((el) => {
    const id = el.getAttribute("data-d");
    const mark = (on: boolean) => items.forEach((other) => other.classList.toggle("hl", on && other.getAttribute("data-d") === id));
    el.addEventListener("pointerenter", () => mark(true));
    el.addEventListener("pointerleave", () => mark(false));
  });

  // ---------- the robot: a small oval on the road between me and Career HQ ----------
  // (that spot has no building in front of it, so the robot is never hidden)
  const robotLayer = root.querySelector<SVGGElement>(".w-robot");
  if (!robotLayer) return;
  const road = (195 * Math.PI) / 180;
  const along = { x: Math.cos(road), y: Math.sin(road) };
  const across = { x: -along.y, y: along.x };
  const center = { x: 3.1 * along.x, y: 3.1 * along.y };
  const rx = 1.0;
  const ry = 0.55;
  let t = 1.2;
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

  draw();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(root);
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
  };
}
