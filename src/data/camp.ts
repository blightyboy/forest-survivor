/** Legacy base.js yard / wall geometry. */
export const BASE_HALF = 400;
export const WALL_HALF = 372;
export const SEGS_PER_SIDE = 8;
export const WALL_SOLID_R = 48;
export const MILL_INTERVAL = 10;
export const TOWER_INSET = 48;

export function campContains(cx: number, cy: number, x: number, y: number, pad = 0) {
  const h = BASE_HALF + pad;
  return Math.abs(x - cx) <= h && Math.abs(y - cy) <= h;
}
