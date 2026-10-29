// Isometric drawing helpers shared by the "My world" map (build time) and its script (browser).
// Ground units are drawn in a 2:1 isometric view; z is height in pixels.

export const TILE_W = 64;
export const TILE_H = 32;

export type Vec = { x: number; y: number };

export function iso(x: number, y: number, z = 0): [number, number] {
  return [((x - y) * TILE_W) / 2, ((x + y) * TILE_H) / 2 - z];
}

const point = (x: number, y: number, z = 0) => iso(x, y, z).map((n) => n.toFixed(1)).join(",");

export function polygon(points: [number, number, number?][], cls: string) {
  return `<polygon class="${cls}" points="${points.map(([x, y, z]) => point(x, y, z)).join(" ")}"/>`;
}

// A box standing on the ground, turned by `heading` (radians). Only the faces that look
// towards the viewer are drawn, so a single box never needs depth sorting.
// Faces get the classes `${cls}-l`, `${cls}-r` (sides) and `${cls}-t` (top) for shading.
export function box(cx: number, cy: number, heading: number, halfL: number, halfW: number, z0: number, z1: number, cls: string) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const corners = [[halfL, halfW], [halfL, -halfW], [-halfL, -halfW], [-halfL, halfW]].map(
    ([u, v]) => [cx + u * c - v * s, cy + u * s + v * c] as [number, number],
  );
  let svg = "";
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const nx = (a[0] + b[0]) / 2 - cx;
    const ny = (a[1] + b[1]) / 2 - cy;
    if (nx + ny <= 0.001) continue; // faces away from the viewer
    svg += polygon([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], `${cls}-${nx > ny ? "r" : "l"}`);
  }
  return svg + polygon(corners.map(([x, y]) => [x, y, z1]), `${cls}-t`);
}

// A small UGV (dark chassis, light electronics deck, sensor mast) at (x, y) facing `heading`.
export function robot(x: number, y: number, heading: number, size = 1) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const local = (u: number, v: number): Vec => ({ x: x + (u * c - v * s) * size, y: y + (u * s + v * c) * size });
  const k = size;
  const [gx, gy] = iso(x, y);
  const wheels = [local(0.62, 0.6), local(0.62, -0.6), local(-0.62, 0.6), local(-0.62, -0.6)];
  const wheel = (w: Vec) => box(w.x, w.y, heading, 0.27 * k, 0.12 * k, 0, 13 * k, "rw");
  const mast = local(-0.4, 0);
  const lamp = local(0.86, 0);
  const [ax, ay] = iso(mast.x, mast.y, 48 * k);
  return (
    `<ellipse class="r-shadow" cx="${gx}" cy="${gy}" rx="${50 * k}" ry="${25 * k}"/>` +
    wheels.filter((w) => w.x + w.y < x + y).map(wheel).join("") +
    box(x, y, heading, 0.95 * k, 0.62 * k, 5 * k, 19 * k, "rb") +
    wheels.filter((w) => w.x + w.y >= x + y).map(wheel).join("") +
    box(x, y, heading, 0.62 * k, 0.46 * k, 19 * k, 29 * k, "rd") +
    box(lamp.x, lamp.y, heading, 0.05 * k, 0.4 * k, 19 * k, 21 * k, "rl") +
    box(mast.x, mast.y, heading, 0.07 * k, 0.07 * k, 29 * k, 46 * k, "rm") +
    `<circle class="r-ant" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${4.5 * k}"/>`
  );
}
