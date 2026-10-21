'use strict';

/** Shown as the bottom-right watermark; keep in sync with package.json version. */
const BUILD_VERSION = '0.1.22-alpha-build';

const TAU = Math.PI * 2;

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
/** Frame-rate independent exponential smoothing. */
function damp(current, target, lambda, dt) { return lerp(current, target, 1 - Math.exp(-lambda * dt)); }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInQuad(t) { return t * t; }
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function rand(a, b) { return a + Math.random() * (b - a); }

/** Remove items matching `isDead` in place, without allocating a new array. */
function compactInPlace(arr, isDead) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!isDead(item)) arr[j++] = item;
  }
  arr.length = j;
}

function formatNum(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'k';
  return (n / 1e6).toFixed(1) + 'M';
}

function formatTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class RNG {
  constructor(seed) { this.rand = mulberry32(seed); }
  next() { return this.rand(); }
  range(a, b) { return a + (b - a) * this.rand(); }
  int(a, b) { return a + Math.floor(this.rand() * (b - a + 1)); }
  chance(p) { return this.rand() < p; }
  pick(arr) { return arr[Math.floor(this.rand() * arr.length)]; }
}

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep01(t) { return t * t * (3 - 2 * t); }

function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smoothstep01(x - xi), v = smoothstep01(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function fbm(x, y, seed, octaves = 3) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// Spatial grid: buckets objects by their center point.
// Callers pad query radii by the largest object radius they care about.
// ---------------------------------------------------------------------------

class SpatialGrid {
  constructor(cellSize, worldW, worldH) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldW / cellSize) + 1;
    this.rows = Math.ceil(worldH / cellSize) + 1;
    this.cells = new Array(this.cols * this.rows);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }

  cellIndex(x, y) {
    const cx = clamp(Math.floor(x / this.cellSize), 0, this.cols - 1);
    const cy = clamp(Math.floor(y / this.cellSize), 0, this.rows - 1);
    return cy * this.cols + cx;
  }

  insert(obj) { this.cells[this.cellIndex(obj.x, obj.y)].push(obj); }

  clear() { for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0; }

  queryRect(x0, y0, x1, y1, out) {
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

  query(x, y, r, out) { return this.queryRect(x - r, y - r, x + r, y + r, out); }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function polygonPath(ctx, pts, ox = 0, oy = 0, scale = 1) {
  ctx.beginPath();
  ctx.moveTo(ox + pts[0] * scale, oy + pts[1] * scale);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(ox + pts[i] * scale, oy + pts[i + 1] * scale);
  ctx.closePath();
}

/** Irregular polygon around the origin as a flat [x0,y0,x1,y1,...] array. */
function makeBlob(rng, radius, count, jitter, squashY = 1) {
  const pts = [];
  const offset = rng.next() * TAU;
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * TAU;
    const r = radius * (1 - jitter + rng.next() * jitter * 2);
    pts.push(Math.cos(a) * r, Math.sin(a) * r * squashY);
  }
  return pts;
}

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbStr(c) {
  return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
}
