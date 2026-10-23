export const TAU = Math.PI * 2;
export const BUILD_VERSION = '0.2.6-alpha-build';

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
export function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
export function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
export function compactInPlace<T>(arr: T[], isDead: (item: T) => boolean) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!isDead(item)) arr[j++] = item;
  }
  arr.length = j;
}
export function formatNum(n: number) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'k';
  return (n / 1e6).toFixed(1) + 'M';
}
export function formatTime(sec: number) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  rand: () => number;
  constructor(seed: number) { this.rand = mulberry32(seed); }
  next() { return this.rand(); }
  range(a: number, b: number) { return a + (b - a) * this.rand(); }
  int(a: number, b: number) { return a + Math.floor(this.rand() * (b - a + 1)); }
  chance(p: number) { return this.rand() < p; }
  pick<T>(arr: T[]) { return arr[Math.floor(this.rand() * arr.length)]; }
}

export function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export type Rgb = { r: number; g: number; b: number };
export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}
export function rgbStr(c: Rgb) {
  return `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
}
function smoothstep01(t: number) { return t * t * (3 - 2 * t); }
function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smoothstep01(x - xi), v = smoothstep01(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x: number, y: number, seed: number, octaves = 3) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export class SpatialGrid {
  cellSize: number;
  cols: number;
  rows: number;
  cells: any[][];
  constructor(cellSize: number, worldW: number, worldH: number) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldW / cellSize) + 1;
    this.rows = Math.ceil(worldH / cellSize) + 1;
    this.cells = new Array(this.cols * this.rows);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }
  cellIndex(x: number, y: number) {
    const cx = clamp(Math.floor(x / this.cellSize), 0, this.cols - 1);
    const cy = clamp(Math.floor(y / this.cellSize), 0, this.rows - 1);
    return cy * this.cols + cx;
  }
  insert(obj: { x: number; y: number }) { this.cells[this.cellIndex(obj.x, obj.y)].push(obj); }
  clear() { for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0; }
  queryRect(x0: number, y0: number, x1: number, y1: number, out: any[]) {
    const cs = this.cellSize;
    const cx0 = clamp(Math.floor(x0 / cs), 0, this.cols - 1);
    const cy0 = clamp(Math.floor(y0 / cs), 0, this.rows - 1);
    const cx1 = clamp(Math.floor(x1 / cs), 0, this.cols - 1);
    const cy1 = clamp(Math.floor(y1 / cs), 0, this.rows - 1);
    for (let cy = cy0; cy <= cy1; cy++) {
      const row = cy * this.cols;
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = this.cells[row + cx];
        for (let i = 0; i < cell.length; i++) out.push(cell[i]);
      }
    }
    return out;
  }
  query(x: number, y: number, r: number, out: any[]) {
    return this.queryRect(x - r, y - r, x + r, y + r, out);
  }
}
