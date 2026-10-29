// Layout and drawing helpers for the Mission control page.
// Units are metres on the ground, drawn in a 2:1 isometric view.
// The layout is illustrative: it shows how my coverage missions run, not a real field.

export const TILE_W = 64;
export const TILE_H = 32;

export type Vec = { x: number; y: number };
export type Waypoint = Vec & { id: number; lane: number };

export const HOME: Vec = { x: 0, y: 7 };
export const TABLET: Vec = { x: -2.8, y: 10.4 };
export const FIELD = { x0: 1, x1: 23, y0: 0, y1: 14 };
export const POND = { x: 21.7, y: 11.6, r: 1.8 };
export const TERRAIN = { x0: -7, x1: 26, y0: -4, y1: 18 };

// Six lanes driven back and forth (boustrophedon). The last two stop short of the pond.
const LANES = [2, 4, 6, 8, 10, 12];
export const LANE_COUNT = LANES.length;
export const waypoints: Waypoint[] = [];
LANES.forEach((y, lane) => {
  const xs: number[] = [];
  for (let x = 3; x <= (y >= 10 ? 19 : 21); x += 2) xs.push(x);
  if (lane % 2) xs.reverse();
  xs.forEach((x) => waypoints.push({ id: waypoints.length + 1, x, y, lane: lane + 1 }));
});

// Home → 58 waypoints → home.
export const route: Vec[] = [HOME, ...waypoints, HOME];

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
