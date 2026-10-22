import { RNG, TAU, clamp, fbm, hash2, hexToRgb, mixRgb, rgbStr } from '../core/math';
import { cameraWorldBounds } from '../core/renderScale';
import { WORLD_SEED } from '../data/constants';
import { ellipse } from './draw/primitives';

export const CHUNK_SIZE = 256;
/** Soft cap — visible set may exceed this on ultrawide; eviction must not hang. */
const GROUND_CACHE_LIMIT = 120;

const GRASS_DARK = hexToRgb('#56963a');
const GRASS_LIGHT = hexToRgb('#80c04e');
const FOREST_FLOOR = hexToRgb('#3f6e2c');
const CLEARING = hexToRgb('#9cc95e');
const FLOWER_COLORS = ['#ffffff', '#ffd54f', '#f48fb1', '#ce93d8', '#90caf9'];

/** Legacy World.grassColor — triangular grass tint from noise + clearing. */
export function grassColor(
  x: number,
  y: number,
  jitter: number,
  seed: number,
  spawnX: number,
  spawnY: number,
) {
  const n = fbm(x / 420, y / 420, seed + 3, 2);
  let c = mixRgb(GRASS_DARK, GRASS_LIGHT, clamp(n * 1.3 - 0.15 + (jitter - 0.5) * 0.2, 0, 1));
  // Same density field as World.density — clearing / woods / dense pine bands.
  const d = fbm(x / 650, y / 650, seed, 3);
  if (d < 0.42) {
    c = mixRgb(c, CLEARING, clamp((0.42 - d) * 2.2, 0, 0.55));
  } else if (d > 0.55) {
    const pine = hexToRgb('#2f5a28');
    c = mixRgb(c, FOREST_FLOOR, clamp((d - 0.5) * 2.4, 0, 0.65));
    c = mixRgb(c, pine, clamp((d - 0.55) * 2.8, 0, 0.45));
  } else if (d > 0.5) {
    c = mixRgb(c, FOREST_FLOOR, clamp((d - 0.5) * 3, 0, 0.4));
  }
  const ds = Math.max(Math.abs(x - spawnX), Math.abs(y - spawnY));
  if (ds < 440) c = mixRgb(c, CLEARING, clamp((440 - ds) / 220, 0, 0.5));
  return rgbStr(c);
}

/** Legacy World.renderChunk — grass triangles, dirt, tufts, flowers, pebbles, mushrooms. */
export function renderGroundChunk(
  cx: number,
  cy: number,
  seed: number,
  spawnX: number,
  spawnY: number,
  scale = 1,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const px = Math.ceil(CHUNK_SIZE * scale);
  canvas.width = px;
  canvas.height = px;
  const g = canvas.getContext('2d')!;
  g.scale(px / CHUNK_SIZE, px / CHUNK_SIZE);
  const ox = cx * CHUNK_SIZE;
  const oy = cy * CHUNK_SIZE;
  const T = 32;
  g.lineWidth = 1;
  g.lineJoin = 'round';

  const tri = (ax: number, ay: number, bx: number, by: number, qx: number, qy: number, jitter: number) => {
    const col = grassColor(ox + (ax + bx + qx) / 3, oy + (ay + by + qy) / 3, jitter, seed, spawnX, spawnY);
    g.fillStyle = col;
    g.strokeStyle = col;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.lineTo(qx, qy);
    g.closePath();
    g.fill();
    g.stroke();
  };

  for (let ty = 0; ty < CHUNK_SIZE / T; ty++) {
    for (let tx = 0; tx < CHUNK_SIZE / T; tx++) {
      const x = tx * T;
      const y = ty * T;
      const gx = (ox + x) / T;
      const gy = (oy + y) / T;
      const h1 = hash2(gx, gy, seed + 5);
      const h2 = hash2(gx, gy, seed + 6);
      const h3 = hash2(gx, gy, seed + 9);
      if (h1 < 0.5) {
        tri(x, y, x + T, y, x, y + T, h2);
        tri(x + T, y, x + T, y + T, x, y + T, h3);
      } else {
        tri(x, y, x + T, y, x + T, y + T, h2);
        tri(x, y, x + T, y + T, x, y + T, h3);
      }
    }
  }

  const rng = new RNG((hash2(cx, cy, seed + 11) * 4294967296) >>> 0);
  const d = fbm(ox + CHUNK_SIZE / 2, oy + CHUNK_SIZE / 2, seed, 3);
  const inner = () => rng.range(10, CHUNK_SIZE - 10);

  if (rng.chance(0.18)) {
    g.fillStyle = 'rgba(120,96,58,0.22)';
    const x = inner();
    const y = inner();
    ellipse(g, x, y, rng.range(18, 34), rng.range(10, 18));
    g.fill();
  }

  g.lineCap = 'round';
  g.lineWidth = 1.6;
  for (let i = 0; i < 18; i++) {
    const x = inner();
    const y = inner();
    g.strokeStyle = rng.chance(0.6) ? 'rgba(38,84,28,0.5)' : 'rgba(176,222,112,0.5)';
    g.beginPath();
    g.moveTo(x - 3, y);
    g.lineTo(x - 4.5, y - 6);
    g.moveTo(x, y);
    g.lineTo(x, y - 8);
    g.moveTo(x + 3, y);
    g.lineTo(x + 4.5, y - 6);
    g.stroke();
  }

  const flowers = Math.floor(rng.next() * (d < 0.45 ? 8 : 2.5));
  for (let i = 0; i < flowers; i++) {
    const x = inner();
    const y = inner();
    const color = rng.pick(FLOWER_COLORS);
    g.fillStyle = color;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ellipse(g, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.2, 2, 1.8);
      g.fill();
    }
    g.fillStyle = '#f2a516';
    ellipse(g, x, y, 1.5, 1.4);
    g.fill();
  }

  for (let i = 0; i < 2; i++) {
    const x = inner();
    const y = inner();
    g.fillStyle = '#9aa0a0';
    g.strokeStyle = 'rgba(40,40,40,0.5)';
    g.lineWidth = 1;
    ellipse(g, x, y, rng.range(2, 4), rng.range(1.5, 2.5));
    g.fill();
    g.stroke();
  }

  if (d > 0.52) {
    const n = rng.int(0, 2);
    for (let i = 0; i < n; i++) {
      const x = inner();
      const y = inner();
      g.fillStyle = '#f3ead6';
      g.fillRect(x - 1.5, y - 5, 3, 5);
      g.fillStyle = '#d84a3a';
      g.beginPath();
      g.ellipse(x, y - 5, 5, 3.6, 0, Math.PI, 0);
      g.closePath();
      g.fill();
      g.fillStyle = '#fff';
      ellipse(g, x - 1.8, y - 6.4, 0.9, 0.8);
      g.fill();
      ellipse(g, x + 1.8, y - 7, 0.8, 0.7);
      g.fill();
    }
  }

  return canvas;
}

/** Fallback single tile for BootScene (unused once GroundLayer is active). */
export function bakeGroundTileCanvas(): HTMLCanvasElement {
  return renderGroundChunk(0, 0, WORLD_SEED, 2400, 2400, 1);
}

type ChunkEntry = { key: string; img: Phaser.GameObjects.Image };

/**
 * Legacy GroundCache — bake visible 256² chunks on demand, LRU-evict offscreen.
 */
export class GroundLayer {
  private scene: Phaser.Scene;
  private layer: Phaser.GameObjects.Container;
  private seed: number;
  private spawnX: number;
  private spawnY: number;
  private worldW: number;
  private worldH: number;
  private cache = new Map<string, ChunkEntry>();
  private order: string[] = [];

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    seed: number,
    spawnX: number,
    spawnY: number,
    worldW: number,
    worldH: number,
  ) {
    this.scene = scene;
    this.layer = layer;
    this.seed = seed;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.worldW = worldW;
    this.worldH = worldH;
  }

  sync(cam: Phaser.Cameras.Scene2D.Camera) {
    const { x0, y0, x1, y1 } = cameraWorldBounds(cam, CHUNK_SIZE);
    const n = Math.ceil(this.worldW / CHUNK_SIZE);
    const cx0 = Math.max(0, Math.floor(x0 / CHUNK_SIZE));
    const cy0 = Math.max(0, Math.floor(y0 / CHUNK_SIZE));
    const cx1 = Math.min(n - 1, Math.floor(x1 / CHUNK_SIZE));
    const cy1 = Math.min(n - 1, Math.floor(y1 / CHUNK_SIZE));

    const want = new Set<string>();
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const id = `${cx},${cy}`;
        want.add(id);
        this.ensureChunk(cx, cy, id);
      }
    }

    for (const [id, entry] of this.cache) {
      entry.img.setVisible(want.has(id));
    }

    // Evict off-screen chunks only. Never spin forever when the visible set is
    // larger than the cache limit (ultrawide / low zoom) — that used to freeze Play.
    let guard = this.order.length;
    while (this.order.length > GROUND_CACHE_LIMIT && guard-- > 0) {
      const old = this.order.shift()!;
      if (want.has(old)) {
        this.order.push(old);
        continue;
      }
      const entry = this.cache.get(old);
      if (!entry) continue;
      entry.img.destroy();
      this.cache.delete(old);
      if (this.scene.textures.exists(entry.key)) this.scene.textures.remove(entry.key);
    }
  }

  private ensureChunk(cx: number, cy: number, id: string) {
    if (this.cache.has(id)) {
      const idx = this.order.indexOf(id);
      if (idx >= 0) {
        this.order.splice(idx, 1);
        this.order.push(id);
      }
      return;
    }
    const texKey = `gnd_${this.seed}_${cx}_${cy}`;
    const el = renderGroundChunk(cx, cy, this.seed, this.spawnX, this.spawnY, 1);
    if (this.scene.textures.exists(texKey)) this.scene.textures.remove(texKey);
    const tex = this.scene.textures.addCanvas(texKey, el);
    if (tex && typeof (tex as Phaser.Textures.CanvasTexture).refresh === 'function') {
      (tex as Phaser.Textures.CanvasTexture).refresh();
    }
    const img = this.scene.add
      .image(cx * CHUNK_SIZE, cy * CHUNK_SIZE, texKey)
      .setOrigin(0, 0)
      .setDepth(-10000);
    this.layer.add(img);
    this.cache.set(id, { key: texKey, img });
    this.order.push(id);
  }

  destroy() {
    for (const entry of this.cache.values()) {
      entry.img.destroy();
      if (this.scene.textures.exists(entry.key)) this.scene.textures.remove(entry.key);
    }
    this.cache.clear();
    this.order.length = 0;
  }
}
