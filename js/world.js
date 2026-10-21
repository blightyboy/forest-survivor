'use strict';

const WORLD_SIZE = 4800;
const WORLD_SEED = 20261020;
const WORLD_MARGIN = 100;       // entities are kept this far from the world edge
const CHUNK_SIZE = 256;
const GROUND_CACHE_LIMIT = 90;

const GRASS_DARK = hexToRgb('#56963a');
const GRASS_LIGHT = hexToRgb('#80c04e');
const FOREST_FLOOR = hexToRgb('#3f6e2c');
const CLEARING = hexToRgb('#9cc95e');
const FLOWER_COLORS = ['#ffffff', '#ffd54f', '#f48fb1', '#ce93d8', '#90caf9'];

/** Ground chunks are identical between restarts, so the cache outlives World instances. */
const GroundCache = { map: new Map(), scale: 0, seed: 0 };

class World {
  constructor(seed) {
    this.seed = seed;
    this.w = WORLD_SIZE;
    this.h = WORLD_SIZE;
    this.spawnX = this.w / 2;
    this.spawnY = this.h / 2;
    this.trees = [];
    this.rocks = [];
    this.bushes = [];
    this.staticGrid = new SpatialGrid(160, this.w, this.h);   // trees + rocks (solid / harvestable)
    this.bushGrid = new SpatialGrid(160, this.w, this.h);
    this._q = [];
    this.generate();
  }

  density(x, y) { return fbm(x / 650, y / 650, this.seed, 3); }

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  nearStatic(x, y, minDist) {
    const q = this._q;
    q.length = 0;
    this.staticGrid.query(x, y, minDist + 30, q);
    for (let i = 0; i < q.length; i++) {
      if (dist2(x, y, q[i].x, q[i].y) < minDist * minDist) return true;
    }
    return false;
  }

  addTree(x, y, rng, kind, size, indestructible = false) {
    const t = new Tree(x, y, rng, kind, size, indestructible);
    this.trees.push(t);
    this.staticGrid.insert(t);
    return t;
  }

  addRock(x, y, rng, ore, size) {
    const r = new Rock(x, y, rng, ore, size);
    this.rocks.push(r);
    this.staticGrid.insert(r);
    return r;
  }

  generate() {
    const rng = new RNG(this.seed);
    const sx = this.spawnX, sy = this.spawnY;
    const W = this.w, H = this.h;
    const kindAt = (x, y) => (fbm(x / 900, y / 900, this.seed + 7, 2) > 0.55 ? 'pine' : 'oak');

    // Border: a dense wall of indestructible pines
    for (let row = 0; row < 2; row++) {
      const inset = row === 0 ? 30 : 78;
      const off = row * 32;
      for (let p = off; p <= W; p += 64) {
        const j = rng.range(-8, 8);
        this.addTree(p + j, inset + rng.range(-6, 6), rng, 'pine', rng.range(1.2, 1.5), true);
        this.addTree(p + j, H - inset + rng.range(-6, 6), rng, 'pine', rng.range(1.2, 1.5), true);
        if (p > 100 && p < H - 100) {
          this.addTree(inset + rng.range(-6, 6), p + j, rng, 'pine', rng.range(1.2, 1.5), true);
          this.addTree(W - inset + rng.range(-6, 6), p + j, rng, 'pine', rng.range(1.2, 1.5), true);
        }
      }
    }

    // Starter trees just outside the square camp
    for (let i = 0; i < 14; i++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const a = (i / 14) * TAU + rng.range(-0.25, 0.25);
        const d = rng.range(520, 680);
        const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d;
        if (this.nearStatic(x, y, 60)) continue;
        this.addTree(x, y, rng, rng.chance(0.3) ? 'pine' : 'oak', rng.range(0.8, 1.05));
        break;
      }
    }

    // Forest: jittered grid modulated by a density field (dense patches + clearings)
    const cell = 80;
    for (let gy = 0; gy < H / cell; gy++) {
      for (let gx = 0; gx < W / cell; gx++) {
        const x = gx * cell + rng.range(10, cell - 10);
        const y = gy * cell + rng.range(10, cell - 10);
        const roll = rng.next();
        const sizeRoll = rng.next();
        if (x < 150 || y < 150 || x > W - 150 || y > H - 150) continue;
        const ds = Math.max(Math.abs(x - sx), Math.abs(y - sy));
        if (ds < 540) continue;
        const d = this.density(x, y);
        let p = d > 0.58 ? 0.75 : d > 0.5 ? 0.42 : d > 0.43 ? 0.12 : 0.025;
        if (ds < 750) p *= 0.6;
        if (roll >= p) continue;
        if (this.nearStatic(x, y, 46)) continue;
        this.addTree(x, y, rng, kindAt(x, y), 0.8 + sizeRoll * 0.55);
      }
    }

    // Rocks
    for (let i = 0; i < 170; i++) {
      const x = rng.range(160, W - 160), y = rng.range(160, H - 160);
      const size = rng.range(0.8, 1.6);
      if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) < 480 || this.nearStatic(x, y, 50)) continue;
      this.addRock(x, y, rng, false, size);
    }

    // Gold ore: two close to spawn, the rest spread out (richer far away)
    for (let i = 0; i < 2; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const a = rng.next() * TAU, d = rng.range(560, 720);
        const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d;
        if (this.nearStatic(x, y, 55)) continue;
        this.addRock(x, y, rng, true, rng.range(1.0, 1.2));
        break;
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = rng.range(180, W - 180), y = rng.range(180, H - 180);
      const ds = Math.hypot(x - sx, y - sy);
      const keep = rng.chance(ds < 1200 ? 0.35 : 0.8);
      const size = rng.range(1.0, 1.4);
      if (!keep || ds < 600 || this.nearStatic(x, y, 55)) continue;
      this.addRock(x, y, rng, true, size);
    }

    // Bushes (decorative)
    for (let i = 0; i < 750; i++) {
      const x = rng.range(130, W - 130), y = rng.range(130, H - 130);
      const accept = rng.next();
      const size = rng.range(0.75, 1.25);
      if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) < 460) continue;
      if (this.density(x, y) < 0.42 && accept > 0.35) continue;
      if (this.nearStatic(x, y, 30)) continue;
      const b = new Bush(x, y, rng, size);
      this.bushes.push(b);
      this.bushGrid.insert(b);
    }
  }

  // -------------------------------------------------------------------------
  // Collision
  // -------------------------------------------------------------------------

  isFree(x, y, r) {
    if (x < WORLD_MARGIN + r || y < WORLD_MARGIN + r || x > this.w - WORLD_MARGIN - r || y > this.h - WORLD_MARGIN - r) return false;
    const q = this._q;
    q.length = 0;
    this.staticGrid.query(x, y, r + 40, q);
    for (let i = 0; i < q.length; i++) {
      const o = q[i];
      if (!o.isSolid()) continue;
      const rr = r + o.solidR;
      if (dist2(x, y, o.x, o.y) < rr * rr) return false;
    }
    return true;
  }

  /** Moves a circular entity and pushes it out of solid static objects. */
  moveEntity(e, dx, dy, r) {
    e.x += dx;
    e.y += dy;
    const q = this._q;
    for (let iter = 0; iter < 2; iter++) {
      q.length = 0;
      this.staticGrid.query(e.x, e.y, r + 40, q);
      let pushed = false;
      for (let i = 0; i < q.length; i++) {
        const o = q[i];
        if (!o.isSolid()) continue;
        const rr = r + o.solidR;
        let ox = e.x - o.x, oy = e.y - o.y;
        const d2 = ox * ox + oy * oy;
        if (d2 >= rr * rr) continue;
        let d = Math.sqrt(d2);
        if (d < 0.001) { ox = 1; oy = 0; d = 1; }
        const push = rr - d;
        e.x += (ox / d) * push;
        e.y += (oy / d) * push;
        pushed = true;
      }
      if (!pushed) break;
    }
    e.x = clamp(e.x, WORLD_MARGIN + r, this.w - WORLD_MARGIN - r);
    e.y = clamp(e.y, WORLD_MARGIN + r, this.h - WORLD_MARGIN - r);
  }

  /**
   * @param {(x:number,y:number)=>boolean} [ok] optional extra filter; return false to reject.
   */
  findSpawnSpot(px, py, minD, maxD, r, ok) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * TAU;
      const d = rand(minD, maxD);
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (!this.isFree(x, y, r + 6)) continue;
      if (ok && !ok(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Simulation
  // -------------------------------------------------------------------------

  update(dt, game) {
    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i];
      if (t.state !== 'alive' || t.shake > 0 || t.flash > 0) t.update(dt, game);
    }
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      if (r.ore) r.update(dt, game);
    }
    const p = game.player;
    if (p.moveAmount > 0.2) {
      const q = this._q;
      q.length = 0;
      this.bushGrid.query(p.x, p.y, 60, q);
      for (let i = 0; i < q.length; i++) {
        const b = q[i];
        const rr = 16 * b.size + p.radius;
        if (dist2(p.x, p.y, b.x, b.y) < rr * rr) b.wobble = 1;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Ground rendering (cached low-poly chunks)
  // -------------------------------------------------------------------------

  grassColor(x, y, jitter) {
    const n = fbm(x / 420, y / 420, this.seed + 3, 2);
    let c = mixRgb(GRASS_DARK, GRASS_LIGHT, clamp(n * 1.3 - 0.15 + (jitter - 0.5) * 0.2, 0, 1));
    const d = this.density(x, y);
    if (d > 0.5) c = mixRgb(c, FOREST_FLOOR, clamp((d - 0.5) * 3, 0, 0.55));
    const ds = Math.max(Math.abs(x - this.spawnX), Math.abs(y - this.spawnY));
    if (ds < 440) c = mixRgb(c, CLEARING, clamp((440 - ds) / 220, 0, 0.5));
    return rgbStr(c);
  }

  renderChunk(cx, cy, scale) {
    const canvas = document.createElement('canvas');
    const px = Math.ceil(CHUNK_SIZE * scale);
    canvas.width = px;
    canvas.height = px;
    const g = canvas.getContext('2d');
    g.scale(px / CHUNK_SIZE, px / CHUNK_SIZE);
    const ox = cx * CHUNK_SIZE, oy = cy * CHUNK_SIZE;
    const T = 32;
    g.lineWidth = 1;
    g.lineJoin = 'round';

    const tri = (ax, ay, bx, by, qx, qy, jitter) => {
      const col = this.grassColor(ox + (ax + bx + qx) / 3, oy + (ay + by + qy) / 3, jitter);
      g.fillStyle = col;
      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(qx, qy);
      g.closePath();
      g.fill();
      g.stroke();
    };

    for (let ty = 0; ty < CHUNK_SIZE / T; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE / T; tx++) {
        const x = tx * T, y = ty * T;
        const gx = (ox + x) / T, gy = (oy + y) / T;
        const h1 = hash2(gx, gy, this.seed + 5);
        const h2 = hash2(gx, gy, this.seed + 6);
        const h3 = hash2(gx, gy, this.seed + 9);
        if (h1 < 0.5) {
          tri(x, y, x + T, y, x, y + T, h2);
          tri(x + T, y, x + T, y + T, x, y + T, h3);
        } else {
          tri(x, y, x + T, y, x + T, y + T, h2);
          tri(x, y, x + T, y + T, x, y + T, h3);
        }
      }
    }

    const rng = new RNG((hash2(cx, cy, this.seed + 11) * 4294967296) >>> 0);
    const d = this.density(ox + CHUNK_SIZE / 2, oy + CHUNK_SIZE / 2);
    const inner = () => rng.range(10, CHUNK_SIZE - 10);

    // dirt patches
    if (rng.chance(0.18)) {
      g.fillStyle = 'rgba(120,96,58,0.22)';
      const x = inner(), y = inner();
      ellipse(g, x, y, rng.range(18, 34), rng.range(10, 18));
      g.fill();
    }
    // grass tufts
    g.lineCap = 'round';
    g.lineWidth = 1.6;
    for (let i = 0; i < 18; i++) {
      const x = inner(), y = inner();
      g.strokeStyle = rng.chance(0.6) ? 'rgba(38,84,28,0.5)' : 'rgba(176,222,112,0.5)';
      g.beginPath();
      g.moveTo(x - 3, y); g.lineTo(x - 4.5, y - 6);
      g.moveTo(x, y); g.lineTo(x, y - 8);
      g.moveTo(x + 3, y); g.lineTo(x + 4.5, y - 6);
      g.stroke();
    }
    // flowers (more in clearings)
    const flowers = Math.floor(rng.next() * (d < 0.45 ? 8 : 2.5));
    for (let i = 0; i < flowers; i++) {
      const x = inner(), y = inner();
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
    // pebbles
    for (let i = 0; i < 2; i++) {
      const x = inner(), y = inner();
      g.fillStyle = '#9aa0a0';
      g.strokeStyle = 'rgba(40,40,40,0.5)';
      g.lineWidth = 1;
      ellipse(g, x, y, rng.range(2, 4), rng.range(1.5, 2.5));
      g.fill(); g.stroke();
    }
    // mushrooms in the dense forest
    if (d > 0.52) {
      const n = rng.int(0, 2);
      for (let i = 0; i < n; i++) {
        const x = inner(), y = inner();
        g.fillStyle = '#f3ead6';
        g.fillRect(x - 1.5, y - 5, 3, 5);
        g.fillStyle = '#d84a3a';
        g.beginPath();
        g.ellipse(x, y - 5, 5, 3.6, 0, Math.PI, 0);
        g.closePath();
        g.fill();
        g.fillStyle = '#fff';
        ellipse(g, x - 1.8, y - 6.4, 0.9, 0.8); g.fill();
        ellipse(g, x + 1.8, y - 7, 0.8, 0.7); g.fill();
      }
    }
    return canvas;
  }

  drawGround(ctx, x0, y0, x1, y1, scale) {
    const cache = GroundCache;
    if (cache.scale !== scale || cache.seed !== this.seed) {
      cache.map.clear();
      cache.scale = scale;
      cache.seed = this.seed;
    }
    const n = Math.ceil(this.w / CHUNK_SIZE);
    const cx0 = Math.max(0, Math.floor(x0 / CHUNK_SIZE));
    const cy0 = Math.max(0, Math.floor(y0 / CHUNK_SIZE));
    const cx1 = Math.min(n - 1, Math.floor(x1 / CHUNK_SIZE));
    const cy1 = Math.min(n - 1, Math.floor(y1 / CHUNK_SIZE));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = cy * 1000 + cx;
        let c = cache.map.get(key);
        if (c) {
          cache.map.delete(key);
        } else {
          c = this.renderChunk(cx, cy, scale);
        }
        cache.map.set(key, c);
        ctx.drawImage(c, cx * CHUNK_SIZE, cy * CHUNK_SIZE, CHUNK_SIZE + 0.75, CHUNK_SIZE + 0.75);
      }
    }
    while (cache.map.size > GROUND_CACHE_LIMIT) {
      cache.map.delete(cache.map.keys().next().value);
    }
  }
}
