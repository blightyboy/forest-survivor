import { RNG, SpatialGrid, fbm, dist2, TAU, clamp } from '../core/math';
import { WORLD_SIZE, WORLD_SEED, WORLD_MARGIN } from '../data/constants';

export type TreeKind = 'oak' | 'pine';
/** Legacy tree lifecycle: alive → falling → stump → growing → alive. */
export type TreeState = 'alive' | 'falling' | 'stump' | 'growing';

export const TREE_FALL_TIME = 0.75;

export class Tree {
  readonly type = 'tree';
  x: number;
  y: number;
  kind: TreeKind;
  size: number;
  indestructible: boolean;
  radius: number;
  solidR: number;
  maxHp: number;
  hp: number;
  wood: number;
  state: TreeState = 'alive';
  fallT = 0;
  fallDir = 1;
  /** Seconds until stump tries to regrow (legacy 35–55). */
  regrow = 0;
  growT = 1;

  constructor(x: number, y: number, _rng: RNG, kind: TreeKind, size: number, indestructible = false) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.size = size;
    this.indestructible = indestructible;
    this.solidR = 10 * size;
    this.radius = 20 * size;
    this.maxHp = Math.round(12 + 18 * size * size);
    this.hp = this.maxHp;
    this.wood = size < 0.95 ? 2 : size < 1.2 ? 3 : 5;
  }

  /** True when the tree is down (stump / falling) — not grown back yet. */
  get dead() {
    return this.state === 'falling' || this.state === 'stump';
  }

  isSolid() {
    return this.state === 'alive' || this.state === 'growing';
  }

  isHittable() {
    return this.state === 'alive' && !this.indestructible;
  }
}

export class Rock {
  readonly type = 'rock';
  x: number;
  y: number;
  ore: boolean;
  size: number;
  /** Baked texture variant index 0..5. */
  variant: number;
  radius: number;
  solidR: number;
  maxHp: number;
  hp: number;
  dead = false;

  constructor(x: number, y: number, rng: RNG, ore: boolean, size: number) {
    this.x = x;
    this.y = y;
    this.ore = ore;
    this.size = size;
    this.variant = rng.int(0, 5);
    const r = 15 * size;
    this.radius = r + 3;
    this.solidR = r * 0.85;
    this.maxHp = ore ? Math.round(60 + 30 * size) : 0;
    this.hp = this.maxHp;
  }

  isSolid() {
    return !this.dead;
  }

  isHittable() {
    return this.ore && !this.dead;
  }
}

export class Bush {
  readonly type = 'bush';
  x: number;
  y: number;
  size: number;
  /** Baked texture variant index 0..4. */
  variant: number;
  radius: number;
  /** Legacy rustle amount when the player brushes past (0–1). */
  wobble = 0;

  constructor(x: number, y: number, rng: RNG, size: number) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.variant = rng.int(0, 4);
    this.radius = 16 * size;
  }
}

export type StaticEntity = Tree | Rock;

export type HarvestResult = {
  killed: boolean;
  wood?: number;
  gold?: number;
};

export class World {
  seed: number;
  w: number;
  h: number;
  spawnX: number;
  spawnY: number;
  trees: Tree[] = [];
  rocks: Rock[] = [];
  bushes: Bush[] = [];
  staticGrid: SpatialGrid;
  bushGrid: SpatialGrid;
  private _q: StaticEntity[] = [];

  constructor(seed = WORLD_SEED) {
    this.seed = seed;
    this.w = WORLD_SIZE;
    this.h = WORLD_SIZE;
    this.spawnX = this.w / 2;
    this.spawnY = this.h / 2;
    this.staticGrid = new SpatialGrid(160, this.w, this.h);
    this.bushGrid = new SpatialGrid(160, this.w, this.h);
    this.generate();
  }

  density(x: number, y: number) {
    return fbm(x / 650, y / 650, this.seed, 3);
  }

  nearStatic(x: number, y: number, minDist: number) {
    const q = this._q;
    q.length = 0;
    this.staticGrid.query(x, y, minDist + 30, q);
    for (let i = 0; i < q.length; i++) {
      if (dist2(x, y, q[i].x, q[i].y) < minDist * minDist) return true;
    }
    return false;
  }

  queryStatic(x: number, y: number, r: number, out: StaticEntity[] = []) {
    out.length = 0;
    return this.staticGrid.query(x, y, r, out);
  }

  queryBushes(x: number, y: number, r: number, out: Bush[] = []) {
    out.length = 0;
    return this.bushGrid.query(x, y, r, out);
  }

  findHittableStatic(x: number, y: number, reach: number): StaticEntity | null {
    const q = this._q;
    q.length = 0;
    this.staticGrid.query(x, y, reach, q);
    let best: StaticEntity | null = null;
    let bestD = reach * reach;
    for (let i = 0; i < q.length; i++) {
      const o = q[i];
      if (!o.isHittable()) continue;
      const d2 = dist2(x, y, o.x, o.y);
      const rr = reach + o.radius;
      if (d2 >= rr * rr) continue;
      if (d2 < bestD) {
        bestD = d2;
        best = o;
      }
    }
    return best;
  }

  treeWoodYield(tree: Tree, bonusRoll = Math.random()) {
    const base = tree.wood + (bonusRoll < 0.35 ? 1 : 0);
    return Math.max(1, base);
  }

  damageTree(tree: Tree, amount: number, hitX?: number): HarvestResult {
    if (!tree.isHittable()) return { killed: false };
    tree.hp -= amount;
    if (tree.hp > 0) return { killed: false };
    tree.hp = 0;
    tree.state = 'falling';
    tree.fallT = 0;
    tree.fallDir = hitX != null && hitX < tree.x ? 1 : -1;
    tree.growT = 1;
    return { killed: true, wood: this.treeWoodYield(tree) };
  }

  /**
   * Legacy tree update: fall → stump → wait → grow when player is far enough.
   * Also decays bush rustle wobble (player brush is applied from RunScene).
   */
  updateTrees(dt: number, playerX: number, playerY: number) {
    for (const tree of this.trees) {
      if (tree.indestructible) continue;
      if (tree.state === 'falling') {
        tree.fallT += dt;
        if (tree.fallT >= TREE_FALL_TIME) {
          tree.state = 'stump';
          tree.regrow = 35 + Math.random() * 20;
        }
      } else if (tree.state === 'stump') {
        tree.regrow -= dt;
        if (tree.regrow <= 0) {
          if (dist2(playerX, playerY, tree.x, tree.y) > 150 * 150) {
            tree.state = 'growing';
            tree.growT = 0;
            tree.hp = tree.maxHp;
          } else {
            // Player still nearby — retry shortly (legacy).
            tree.regrow = 2;
          }
        }
      } else if (tree.state === 'growing') {
        tree.growT += dt / 1.1;
        if (tree.growT >= 1) {
          tree.growT = 1;
          tree.state = 'alive';
        }
      }
    }
    for (const b of this.bushes) {
      if (b.wobble > 0) b.wobble = Math.max(0, b.wobble - dt * 1.8);
    }
  }

  /** Legacy bush rustle when the player walks through foliage. */
  rustleBushes(playerX: number, playerY: number, playerRadius: number, moving: boolean) {
    if (!moving) return;
    const q: Bush[] = [];
    this.bushGrid.query(playerX, playerY, 60, q);
    for (let i = 0; i < q.length; i++) {
      const b = q[i];
      const rr = 16 * b.size + playerRadius;
      if (dist2(playerX, playerY, b.x, b.y) < rr * rr) b.wobble = 1;
    }
  }

  damageRock(rock: Rock, amount: number, goldRoll = Math.random()): HarvestResult {
    if (!rock.isHittable()) return { killed: false };
    rock.hp -= amount;
    const chipGold = goldRoll < 0.12 ? 1 : 0;
    if (rock.hp > 0) return { killed: false, gold: chipGold || undefined };
    rock.hp = 0;
    rock.dead = true;
    return { killed: true, gold: chipGold || undefined };
  }

  addTree(x: number, y: number, rng: RNG, kind: TreeKind, size: number, indestructible = false) {
    const t = new Tree(x, y, rng, kind, size, indestructible);
    this.trees.push(t);
    this.staticGrid.insert(t);
    return t;
  }

  addRock(x: number, y: number, rng: RNG, ore: boolean, size: number) {
    const r = new Rock(x, y, rng, ore, size);
    this.rocks.push(r);
    this.staticGrid.insert(r);
    return r;
  }

  generate() {
    const rng = new RNG(this.seed);
    const sx = this.spawnX;
    const sy = this.spawnY;
    const W = this.w;
    const H = this.h;
    const kindAt = (x: number, y: number) => (fbm(x / 900, y / 900, this.seed + 7, 2) > 0.55 ? 'pine' : 'oak');

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

    for (let i = 0; i < 14; i++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const a = (i / 14) * TAU + rng.range(-0.25, 0.25);
        const d = rng.range(520, 680);
        const x = sx + Math.cos(a) * d;
        const y = sy + Math.sin(a) * d;
        if (this.nearStatic(x, y, 60)) continue;
        this.addTree(x, y, rng, rng.chance(0.3) ? 'pine' : 'oak', rng.range(0.8, 1.05));
        break;
      }
    }

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

    for (let i = 0; i < 170; i++) {
      const x = rng.range(160, W - 160);
      const y = rng.range(160, H - 160);
      const size = rng.range(0.8, 1.6);
      if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) < 480 || this.nearStatic(x, y, 50)) continue;
      this.addRock(x, y, rng, false, size);
    }

    for (let i = 0; i < 2; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const a = rng.next() * TAU;
        const d = rng.range(560, 720);
        const x = sx + Math.cos(a) * d;
        const y = sy + Math.sin(a) * d;
        if (this.nearStatic(x, y, 55)) continue;
        this.addRock(x, y, rng, true, rng.range(1.0, 1.2));
        break;
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = rng.range(180, W - 180);
      const y = rng.range(180, H - 180);
      const ds = Math.hypot(x - sx, y - sy);
      const keep = rng.chance(ds < 1200 ? 0.35 : 0.8);
      const size = rng.range(1.0, 1.4);
      if (!keep || ds < 600 || this.nearStatic(x, y, 55)) continue;
      this.addRock(x, y, rng, true, size);
    }

    for (let i = 0; i < 750; i++) {
      const x = rng.range(130, W - 130);
      const y = rng.range(130, H - 130);
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

  isFree(x: number, y: number, r: number) {
    if (x < WORLD_MARGIN + r || y < WORLD_MARGIN + r || x > this.w - WORLD_MARGIN - r || y > this.h - WORLD_MARGIN - r) {
      return false;
    }
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

  /** Moves a circular entity and pushes it out of solid static objects (trees/rocks). */
  moveEntity(e: { x: number; y: number }, r: number) {
    const q = this._q;
    for (let iter = 0; iter < 2; iter++) {
      q.length = 0;
      this.staticGrid.query(e.x, e.y, r + 40, q);
      let pushed = false;
      for (let i = 0; i < q.length; i++) {
        const o = q[i];
        if (!o.isSolid()) continue;
        const rr = r + o.solidR;
        let ox = e.x - o.x;
        let oy = e.y - o.y;
        const d2v = ox * ox + oy * oy;
        if (d2v >= rr * rr) continue;
        let d = Math.sqrt(d2v);
        if (d < 0.001) {
          ox = 1;
          oy = 0;
          d = 1;
        }
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
   * Find a free spawn near (px,py). Optional `ok` filter rejects spots (e.g. inside camp).
   */
  findSpawnSpot(
    px: number,
    py: number,
    minD: number,
    maxD: number,
    r: number,
    ok?: (x: number, y: number) => boolean,
  ): { x: number; y: number } | null {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * TAU;
      const d = minD + Math.random() * (maxD - minD);
      const x = px + Math.cos(a) * d;
      const y = py + Math.sin(a) * d;
      if (!this.isFree(x, y, r)) continue;
      if (ok && !ok(x, y)) continue;
      return { x, y };
    }
    return null;
  }
}
