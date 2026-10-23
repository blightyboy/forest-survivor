import Phaser from 'phaser';
import { UPGRADES, computeStats, upgradeCost, isBossNight, compassName } from '../data/constants';
import {
  BASE_HALF,
  WALL_HALF,
  SEGS_PER_SIDE,
  WALL_SOLID_R,
  MILL_INTERVAL,
  TOWER_INSET,
  campContains,
} from '../data/camp';
import { refreshShopStock, type GearItem } from '../data/shop';
import { SPECIES } from '../data/animals';
import { clamp, dist2, TAU, lerp, compactInPlace, rand } from '../core/math';
import type { RunPlayer } from '../run/RunTypes';
import { gainResource } from '../run/RunTypes';
import type { AnimalSystem, AnimalEntity } from './AnimalSystem';
import type { MetaBonuses } from '../meta/Meta';
import type { FxSystem } from './FxSystem';
import { Audio } from '../audio/Audio';
import { settings } from '../meta/Settings';
import { CanvasSprite } from '../art/draw/CanvasSprite';
import { drawTowerArrow } from '../art/draw/weaponDraw';
import {
  drawBlacksmithBaked,
  drawButcherBaked,
  drawCampBaked,
  drawCampfireBaked,
  drawMillBaked,
  drawMineBaked,
  drawTowerBaked,
} from '../art/draw/buildingBake';

/** Legacy `Arrow` — homing tower bolt with visible flight. */
type TowerArrow = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  speed: number;
  life: number;
  dmg: number;
  dead: boolean;
  target: AnimalEntity | null;
  canvas: CanvasSprite;
};

/** Legacy night raid: queue drains every ~0.3s from prepared fronts. */
const RAID_SPAWN_INTERVAL = 0.3;

type RaidQueueSpec = { species: string; big?: boolean };

export type WallSeg = {
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Legacy wall solid radius for melee reach checks. */
  solidR: number;
  sprites: Phaser.GameObjects.Image[];
  showLevel: boolean;
};

type BuildingSlot = {
  id: 'campfire' | 'mill' | 'mine' | 'butcher' | 'blacksmith';
  x: number;
  y: number;
  solidR: number;
  canvas: CanvasSprite | null;
  levelKey: string;
  badge: Phaser.GameObjects.Text | null;
};

type TowerVisual = {
  x: number;
  y: number;
  canvas: CanvasSprite;
  /** Archer facing: +1 right, -1 left. */
  aim: number;
};

const BLD_CANVAS: Record<BuildingSlot['id'], { w: number; h: number; pad: number }> = {
  campfire: { w: 64, h: 66, pad: 12 },
  mill: { w: 110, h: 80, pad: 8 },
  mine: { w: 80, h: 72, pad: 6 },
  butcher: { w: 72, h: 68, pad: 6 },
  blacksmith: { w: 80, h: 72, pad: 6 },
};

/** Push a circle out of a solid disc (legacy world.moveEntity solid resolve). */
function pushOut(
  e: { x: number; y: number },
  r: number,
  ox: number,
  oy: number,
  solidR: number,
) {
  const rr = r + solidR;
  let dx = e.x - ox;
  let dy = e.y - oy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return false;
  let d = Math.sqrt(d2);
  if (d < 0.001) {
    dx = 1;
    dy = 0;
    d = 1;
  }
  const push = rr - d;
  e.x += (dx / d) * push;
  e.y += (dy / d) * push;
  return true;
}

export class CampSystem {
  levels: Record<string, number> = {
    // Legacy: all upgrades start at 0; walls begin at 1 for a basic palisade.
    camp: 0, walls: 1, towers: 0, archers: 0, barrage: 0, volley: 0,
    campfire: 0, mill: 0, mine: 0, butcher: 0, blacksmith: 0,
    // Campfire subs
    warm_embers: 0, guardian_flame: 0, eternal_fire: 0,
    // Mill / mine / butcher subs
    efficient_logging: 0, improved_blades: 0,
    deep_veins: 0, reinforced_pickaxes: 0,
    prime_cuts: 0, skilled_butchery: 0,
    // Blacksmith subs
    sharpened_weapons: 0, reinforced_armor: 0, masterwork_forging: 0,
    // Camp risk one-shots
    predators_bait: 0, forest_beckons: 0, cursed_totem: 0,
  };
  hp = 300;
  maxHp = 300;
  x: number;
  y: number;
  stats = computeStats(this.levels);
  /** Cabin passive income timer. */
  incomeT = MILL_INTERVAL;
  millT = MILL_INTERVAL;
  mineT = MILL_INTERVAL;
  butcherT = MILL_INTERVAL;
  /** Forest Beckons escalating wave timer. */
  beckonsT = 60;
  beckonsWave = 0;

  /** Push forge / risk / campfire bonuses onto the player for combat hooks. */
  syncPlayerBuildBonuses(player: RunPlayer) {
    const s = this.stats;
    const inYard = this.contains(player.x, player.y);
    player.buildDmgMul = (s.smithDmgMul || 1) * (s.forestBeckons ? 1.2 : 1);
    player.buildArmorDr = s.smithArmorDr || 0;
    player.buildCritAdd = s.smithCrit || 0;
    player.buildHasteMul = (s.smithHaste || 1) * (s.forestBeckons ? 1.2 : 1);
    player.guardianDr = inYard ? (s.guardianFlameDr || 0) : 0;
    player.predatorsBait = !!s.predatorsBait;
    player.forestBeckons = !!s.forestBeckons;
    player.cursedTotem = !!s.cursedTotem;
  }
  /** Seconds until free forge restock (legacy refreshIn). */
  shopRefreshIn = 0;
  shopStock: (GearItem | null)[] = [];
  shopVersion = 0;
  /** Paid forge rerolls since last free restock — drives rising gold cost. */
  smithRerolls = 0;
  towerTimers: number[] = [];
  assaultNight: number | null = null;
  /** Legacy raid.angles — attack fronts chosen at dusk. */
  raidAngles: number[] = [ -Math.PI / 2 ];
  raidQueue: RaidQueueSpec[] = [];
  raidSpawnT = 0;
  raidActive = false;
  raidAnnounced = false;
  campAlertCd = 0;
  /** Throttle red screen flash while structures take continuous DPS. */
  structureHitFlashCd = 0;
  /** Mutator: thinner smith stock (Scarcity). */
  shopStockMult = 1;
  /** Mutator (Vanilla): no cabin, walls, or buildings — raids still fire. */
  noCamp = false;
  /** Win-goal night count — when assaultNight matches, run final gauntlet. */
  winGoalNights = 0;
  /** Fired when a true boss spawns (move telegraph — ability ids). */
  onTrueBossSpawn?: (name: string, moves: string[]) => void;
  healFx = 0;
  onCampAttack?: () => void;
  /** Fired (throttled) whenever the cabin or a palisade takes damage. */
  onStructureHit?: () => void;
  onNightBoss?: (kind: 'mini' | 'true', day: number) => void;
  /** Fired when the night raid banner should show (count + directions). */
  onRaidStart?: (
    day: number,
    count: number,
    directions: string,
    speciesHint?: string,
    topSpecies?: string[],
  ) => void;
  onPay?: (x: number, y: number, wood: number, meat: number, gold: number) => void;
  /** Legacy addShake — wired from RunScene (respects Options shakeScale). */
  onShake?: (intensity: number) => void;
  pendingRaidCredit = false;
  campCanvas: CanvasSprite;
  yardGfx: Phaser.GameObjects.Graphics;
  /** HP bars for camp + walls (redrawn each frame). */
  overlayGfx: Phaser.GameObjects.Graphics;
  walls: WallSeg[] = [];
  towers: TowerVisual[] = [];
  towerSlots: { x: number; y: number }[] = [];
  buildings: BuildingSlot[] = [];
  fx: FxSystem | null = null;
  /** Shared clock for building / flag / flame animations. */
  private animT = 0;
  /** Floating combat text for tower hits (wired from RunScene). */
  onFloatText?: (
    x: number,
    y: number,
    msg: string,
    color?: string,
    size?: number,
    opts?: { life?: number; vx?: number },
  ) => void;
  private arrows: TowerArrow[] = [];
  private arrowUid = 0;
  private meta: MetaBonuses;
  private nightBossSpawned = false;
  private layer: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private campBadge: Phaser.GameObjects.Text | null = null;
  private wallBadge: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
    meta: MetaBonuses,
  ) {
    this.scene = scene;
    this.layer = layer;
    this.x = cx;
    this.y = cy;
    this.meta = meta;

    this.yardGfx = scene.add.graphics().setDepth(0);
    layer.add(this.yardGfx);
    this.overlayGfx = scene.add.graphics().setDepth(1_000_000);
    layer.add(this.overlayGfx);

    this.campCanvas = new CanvasSprite(scene, layer, 140, 150, 'rt_camp', 0.5, 1);
    this.campCanvas.setPosition(cx, cy, cy);

    const c = WALL_HALF - TOWER_INSET;
    this.towerSlots = [
      { x: cx - c, y: cy - c }, { x: cx + c, y: cy - c },
      { x: cx - c, y: cy + c }, { x: cx + c, y: cy + c },
      { x: cx, y: cy - c }, { x: cx, y: cy + c },
      { x: cx - c, y: cy }, { x: cx + c, y: cy },
    ];

    this.buildings = [
      { id: 'campfire', x: cx, y: cy + 70, solidR: 16, canvas: null, levelKey: 'campfire', badge: null },
      { id: 'mill', x: cx - 210, y: cy + 160, solidR: 30, canvas: null, levelKey: 'mill', badge: null },
      { id: 'mine', x: cx + 210, y: cy + 160, solidR: 28, canvas: null, levelKey: 'mine', badge: null },
      { id: 'butcher', x: cx + 200, y: cy - 30, solidR: 26, canvas: null, levelKey: 'butcher', badge: null },
      { id: 'blacksmith', x: cx - 200, y: cy - 30, solidR: 28, canvas: null, levelKey: 'blacksmith', badge: null },
    ];

    this.recompute();
    this.redrawCampVisuals(null);
  }

  /** Vanilla mutator — strip the base so only the player matters. */
  enableNoCamp() {
    this.noCamp = true;
    this.levels.walls = 0;
    this.levels.camp = 0;
    this.levels.towers = 0;
    this.levels.campfire = 0;
    this.levels.mill = 0;
    this.levels.mine = 0;
    this.levels.butcher = 0;
    this.levels.blacksmith = 0;
    this.recompute();
    this.campCanvas.setVisible(false);
    this.yardGfx.clear().setVisible(false);
    this.overlayGfx.clear().setVisible(false);
    for (const b of this.buildings) {
      b.canvas?.setVisible(false);
      b.badge?.setVisible(false);
    }
    this.campBadge?.setVisible(false);
    this.wallBadge?.setVisible(false);
    // Keep hp > 0 so raid bookkeeping / win checks still work; never lose via cabin.
    this.hp = this.maxHp = 1;
  }

  private makeLevelBadge(x: number, y: number): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, '', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${settings.textPx(10)}px`,
        fontStyle: 'bold',
        color: '#ffe78a',
        backgroundColor: '#1e150c',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(920)
      .setVisible(false);
    // Approximate legacy stroked pill via a thin border using stroke.
    t.setStroke('#c9a227', 2);
    this.layer.add(t);
    return t;
  }

  private placeBadge(badge: Phaser.GameObjects.Text, x: number, y: number, level: number) {
    if (!(level > 0)) {
      badge.setVisible(false);
      return;
    }
    badge.setFontSize(settings.textPx(10));
    badge.setText(`Lv ${level}`);
    badge.setPosition(x, y);
      badge.setDepth(y + 80);
    badge.setVisible(true);
  }

  private drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number) {
    const f = clamp(frac, 0, 1);
    g.fillStyle(0x140c08, 0.75);
    g.fillRoundedRect(x - w / 2 - 1.5, y - 1.5, w + 3, 7, 3.5);
    g.fillStyle(0xffcf4a, 1);
    g.fillRoundedRect(x - w / 2, y, Math.max(2, w * f), 4, 2);
  }

  /** Camp / wall HP bars + structure level badges (legacy drawHpBar / drawLevelBadge). */
  private updateOverlays() {
    const g = this.overlayGfx;
    g.clear();
    if (this.noCamp) return;

    const campScale = 1 + this.levels.camp * 0.035;
    const campY = this.y - 40;
    const damaged = this.hp < this.maxHp;
    if (damaged) {
      this.drawHpBar(g, this.x, campY - 140 * campScale, 80, this.hp / this.maxHp);
    }
    if (!this.campBadge) this.campBadge = this.makeLevelBadge(this.x, campY);
    this.placeBadge(
      this.campBadge,
      this.x,
      campY - (damaged ? 152 : 132) * campScale,
      this.levels.camp,
    );

    const wallLv = this.levels.walls || 0;
    const wallH = wallLv >= 5 ? 34 : 28 + wallLv;
    let wallBadgePlaced = false;
    for (const w of this.walls) {
      if (!w.alive) continue;
      if (w.hp < w.maxHp) {
        this.drawHpBar(g, w.x, w.y - wallH - 18, 34, w.hp / w.maxHp);
      }
      if (w.showLevel && wallLv > 0) {
        if (!this.wallBadge) this.wallBadge = this.makeLevelBadge(w.x, w.y);
        this.placeBadge(
          this.wallBadge,
          w.x,
          w.y - wallH - (w.hp < w.maxHp ? 34 : 18),
          wallLv,
        );
        wallBadgePlaced = true;
      }
    }
    if (!wallBadgePlaced && this.wallBadge) this.wallBadge.setVisible(false);

    const badgeY: Record<BuildingSlot['id'], (lv: number) => number> = {
      campfire: (lv) => 44 + lv * 2,
      mill: () => 68,
      mine: () => 64,
      butcher: () => 64,
      blacksmith: () => 68,
    };
    for (const b of this.buildings) {
      const lv = this.levels[b.levelKey] || 0;
      if (lv <= 0) {
        b.badge?.setVisible(false);
        continue;
      }
      if (!b.badge) b.badge = this.makeLevelBadge(b.x, b.y);
      this.placeBadge(b.badge, b.x, b.y - badgeY[b.id](lv), lv);
    }
  }

  contains(x: number, y: number, pad = 0) {
    if (this.noCamp) return false;
    return campContains(this.x, this.y, x, y, pad);
  }

  recompute() {
    this.stats = computeStats(this.levels, this.meta);
    const prevMax = this.maxHp;
    this.maxHp = this.stats.campHp;
    if (prevMax > 0) this.hp = Math.min(this.maxHp, this.hp * (this.maxHp / prevMax));
    else this.hp = this.maxHp;
    this.syncWalls();
    this.syncTowers();
    this.syncBuildings();
    this.drawYard();
    this.updateOverlays();
  }

  private drawYard() {
    const g = this.yardGfx;
    g.clear();
    if (this.noCamp) return;
    const h = WALL_HALF - 8;
    g.fillStyle(0x967648, 0.28);
    g.fillRoundedRect(this.x - h, this.y - h, h * 2, h * 2, 18);
    g.fillStyle(0xb08c5a, 0.22);
    g.fillRoundedRect(this.x - 140, this.y - 110, 280, 240, 16);
    g.lineStyle(2, 0xffecaa, 0.32);
    // dashed approximation
    const bh = BASE_HALF;
    g.strokeRoundedRect(this.x - bh, this.y - bh, bh * 2, bh * 2, 12);
  }

  private syncWalls() {
    const want = this.stats.wallHp > 0;
    if (!want) {
      for (const w of this.walls) for (const s of w.sprites) s.destroy();
      this.walls.length = 0;
      return;
    }
    if (!this.walls.length) this.walls = this.makeWalls();
    const stone = this.levels.walls >= 5;
    const tex = stone ? 'wall_post_stone' : 'wall_post';
    for (const w of this.walls) {
      w.maxHp = this.stats.wallHp;
      w.hp = w.maxHp;
      w.alive = true;
      for (const s of w.sprites) {
        if (this.scene.textures.exists(tex)) s.setTexture(tex);
        s.setVisible(true).setAlpha(1).clearTint();
      }
    }
  }

  private makeWalls(): WallSeg[] {
    const walls: WallSeg[] = [];
    const h = WALL_HALF;
    const n = SEGS_PER_SIDE;
    const sides = [
      { x0: -h, y0: -h, x1: h, y1: -h, ang: -Math.PI / 2 },
      { x0: h, y0: -h, x1: h, y1: h, ang: 0 },
      { x0: h, y0: h, x1: -h, y1: h, ang: Math.PI / 2 },
      { x0: -h, y0: h, x1: -h, y1: -h, ang: Math.PI },
    ];
    let idx = 0;
    for (const s of sides) {
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = this.x + lerp(s.x0, s.x1, t);
        const y = this.y + lerp(s.y0, s.y1, t);
        // Tangent along the wall; place 5 upright posts per segment (legacy).
        const tx = -Math.sin(s.ang);
        const ty = Math.cos(s.ang);
        const sprites: Phaser.GameObjects.Image[] = [];
        for (const o of [-26, -13, 0, 13, 26]) {
          const px = x + tx * o;
          const py = y + ty * o;
          const spr = this.scene.add
            .image(px, py, 'wall_post')
            .setOrigin(0.5, 1)
            .setDepth(py + 2);
          this.layer.add(spr);
          sprites.push(spr);
        }
        walls.push({
          x, y, angle: s.ang,
          hp: this.stats.wallHp,
          maxHp: this.stats.wallHp,
          alive: true,
          solidR: WALL_SOLID_R,
          sprites,
          showLevel: idx === Math.floor(n / 2),
        });
        idx++;
      }
    }
    return walls;
  }

  syncTowers() {
    const want = Math.min(this.stats.towerCount, this.towerSlots.length);
    while (this.towers.length < want) {
      const i = this.towers.length;
      const slot = this.towerSlots[i];
      const canvas = new CanvasSprite(this.scene, this.layer, 72, 130, 'rt_tower', 0.5, 1);
      canvas.setPosition(slot.x, slot.y, slot.y + 3);
      this.towers.push({ x: slot.x, y: slot.y, canvas, aim: 1 });
      this.towerTimers.push(0.2);
    }
    while (this.towers.length > want) {
      this.towers.pop()?.canvas.destroy();
      this.towerTimers.pop();
    }
  }

  syncBuildings() {
    for (const b of this.buildings) {
      if (this.noCamp) {
        b.canvas?.setVisible(false);
        continue;
      }
      const lv = this.levels[b.levelKey] || 0;
      // Legacy campfire is always present (level 0 still draws the fire pit).
      const alwaysOn = b.id === 'campfire';
      if (lv > 0 || alwaysOn) {
        if (!b.canvas) {
          const sz = BLD_CANVAS[b.id];
          b.canvas = new CanvasSprite(
            this.scene,
            this.layer,
            sz.w,
            sz.h,
            `rt_bld_${b.id}`,
            0.5,
            1,
          );
          b.canvas.setPosition(b.x, b.y, b.y + 2);
        }
        b.canvas.setVisible(true);
      } else if (b.canvas) {
        b.canvas.setVisible(false);
      }
    }
  }

  /** Live redraw: flag, flame, saw, mine hoist, butcher, forge, tower aim. */
  private redrawCampVisuals(animals: AnimalSystem | null) {
    if (this.noCamp) return;
    const t = this.animT;
    this.campCanvas.clear();
    this.campCanvas.withFeetOrigin((ctx) => {
      drawCampBaked(ctx, { time: t, level: this.levels.camp || 0 });
    }, 10);
    this.campCanvas.refresh();
    this.campCanvas.setPosition(this.x, this.y, this.y);

    for (const tw of this.towers) {
      if (animals) {
        let bestD2 = Infinity;
        let bestX = tw.x + tw.aim * 40;
        for (const a of animals.animals) {
          if (a.dead) continue;
          const d2 = dist2(tw.x, tw.y, a.x, a.y);
          if (d2 < bestD2 && d2 < this.stats.towerRange * this.stats.towerRange) {
            bestD2 = d2;
            bestX = a.x;
          }
        }
        const want = bestX >= tw.x ? 1 : -1;
        if (want !== tw.aim) tw.aim = want;
      }
      tw.canvas.clear();
      tw.canvas.withFeetOrigin((ctx) => {
        drawTowerBaked(ctx, { time: t, aim: tw.aim });
      }, 6);
      tw.canvas.refresh();
      tw.canvas.setPosition(tw.x, tw.y, tw.y + 3);
    }

    for (const b of this.buildings) {
      if (!b.canvas || !b.canvas.image.visible) continue;
      const lv = this.levels[b.levelKey] || 0;
      const pad = BLD_CANVAS[b.id].pad;
      b.canvas.clear();
      b.canvas.withFeetOrigin((ctx) => {
        const anim = { time: t, level: lv };
        if (b.id === 'campfire') drawCampfireBaked(ctx, anim);
        else if (b.id === 'mill') drawMillBaked(ctx, anim);
        else if (b.id === 'mine') drawMineBaked(ctx, anim);
        else if (b.id === 'butcher') drawButcherBaked(ctx, anim);
        else drawBlacksmithBaked(ctx, anim);
      }, pad);
      b.canvas.refresh();
      b.canvas.setPosition(b.x, b.y, b.y + 2);
    }
  }

  /**
   * Legacy Base.collectLights — campfire, cabin, and tower torch cut-outs.
   */
  collectLights(
    out: { x: number; y: number; r: number; intensity?: number; warm?: boolean }[],
    time: number,
  ) {
    if (this.noCamp) return;
    const fl = 1 + Math.sin(time * 13) * 0.04 + Math.sin(time * 23) * 0.03;
    const fire = this.buildings.find((b) => b.id === 'campfire');
    if (fire) {
      out.push({
        x: fire.x,
        y: fire.y - 10,
        r: this.stats.lightR * fl,
        intensity: 1,
        warm: true,
      });
    }
    if (this.hp > 0) {
      out.push({ x: this.x, y: this.y - 70, r: 140, intensity: 0.8, warm: true });
    }
    for (const t of this.towers) {
      out.push({ x: t.x + 24, y: t.y - 60, r: 130, intensity: 0.85, warm: true });
    }
  }

  /**
   * Push entity out of camp core, built buildings, and towers (legacy staticGrid solids).
   * Call alongside collideWalls / World.moveEntity.
   */
  collideStructures(e: { x: number; y: number }, r: number) {
    if (this.noCamp) return;
    // Quick reject when far from the yard.
    if (Math.max(Math.abs(e.x - this.x), Math.abs(e.y - this.y)) > BASE_HALF + r + 80) return;
    // Camp core (always solid).
    pushOut(e, r, this.x, this.y - 40, 44);
    // Campfire is always solid (legacy); other buildings once built.
    for (const b of this.buildings) {
      const lv = this.levels[b.levelKey] || 0;
      if (lv <= 0 && b.id !== 'campfire') continue;
      pushOut(e, r, b.x, b.y, b.solidR);
    }
    for (const t of this.towers) {
      pushOut(e, r, t.x, t.y, 18);
    }
  }

  /** Legacy wall segment collision — push entity out of living posts. */
  collideWalls(e: { x: number; y: number }, r: number): WallSeg | null {
    if (this.noCamp || !this.walls.length) return null;
    const cheb = Math.max(Math.abs(e.x - this.x), Math.abs(e.y - this.y));
    if (Math.abs(cheb - WALL_HALF) > r + WALL_SOLID_R + 6) return null;
    let touched: WallSeg | null = null;
    for (const w of this.walls) {
      if (!w.alive) continue;
      if (pushOut(e, r, w.x, w.y, WALL_SOLID_R)) touched = w;
    }
    return touched;
  }

  /** True if a spawn point sits inside the camp yard (legacy spawnInBase). */
  spawnInBase(x: number, y: number, pad = 48) {
    return this.contains(x, y, pad);
  }

  /** Red screen flash when camp / palisade is struck (cooldown so raids don't strobe). */
  notifyStructureHit() {
    if (this.structureHitFlashCd > 0) return;
    this.structureHitFlashCd = 1.1;
    this.onStructureHit?.();
  }

  damageWall(w: WallSeg, dmg: number) {
    if (this.noCamp || !w.alive || dmg <= 0) return;
    w.hp -= dmg;
    this.notifyStructureHit();
    for (const s of w.sprites) s.setTint(0xffccaa);
    this.scene.time.delayedCall(80, () => {
      if (w.alive) for (const s of w.sprites) s.clearTint();
    });
    this.fx?.woodChips(w.x, w.y - 12, w.x + Math.cos(w.angle) * 40, w.y + Math.sin(w.angle) * 40, 4);
    Audio.playSfx('chop', 0.7);
    if (w.hp <= 0) {
      w.hp = 0;
      w.alive = false;
      for (const s of w.sprites) s.setAlpha(0.35).setTint(0x5e4128);
      this.fx?.woodChips(w.x, w.y - 10, w.x, w.y + 30, 10);
      this.onShake?.(0.2);
      Audio.playSfx('treeFall');
    }
  }

  canUpgrade(id: string) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const lv = this.levels[id] || 0;
    if (lv >= def.max) return false;
    if (def.requires && !def.requires(this.levels)) return false;
    return true;
  }

  upgradeCost(id: string) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return {};
    return upgradeCost(def, this.levels[id] || 0);
  }

  tryUpgrade(id: string, player: RunPlayer): boolean {
    if (this.noCamp) return false;
    if (!this.canUpgrade(id)) return false;
    const cost = this.upgradeCost(id);
    for (const k in cost) {
      const key = k as 'wood' | 'meat' | 'gold';
      if ((player[key] || 0) < cost[k]) return false;
    }
    for (const k in cost) {
      const key = k as 'wood' | 'meat' | 'gold';
      player[key] -= cost[k];
    }
    const prevForge = this.stats.forgeLevel;
    this.levels[id] = (this.levels[id] || 0) + 1;
    this.recompute();
    if (id === 'blacksmith') {
      // First build opens the forge; further levels restock with a fresh timer.
      this.restockShop(true);
    } else if (prevForge !== this.stats.forgeLevel) {
      this.restockShop(true);
    }
    // Legacy: first build of a structure uses hammer taps; upgrades chime.
    const wasFirst = (this.levels[id] || 0) === 1;
    Audio.playSfx(wasFirst ? 'build' : 'upgrade');
    this.fx?.ring(this.x, this.y, 'rgba(158,240,138,0.9)', 12, 220, 0.5);
    return true;
  }

  /** Free timer / build restock. When resetTimer, also clears paid-reroll cost curve. */
  restockShop(resetTimer = true) {
    const forge = this.stats.forgeLevel;
    if (!forge) {
      this.shopStock = [];
      this.shopRefreshIn = 0;
      this.smithRerolls = 0;
      this.shopVersion++;
      return;
    }
    this.shopStock = refreshShopStock(forge, this.meta.smithLuck || 0, this.shopStockMult);
    if (resetTimer) {
      this.shopRefreshIn = 300;
      this.smithRerolls = 0;
    }
    this.shopVersion++;
  }

  /** @deprecated use restockShop — kept for call sites that expect a free restock */
  refreshShop() {
    this.restockShop(true);
  }

  /** Gold cost for the next paid stock reroll (scales up with each use). */
  smithRerollCost() {
    return Math.max(6, Math.round(8 * Math.pow(1.55, this.smithRerolls)));
  }

  canAffordShop(item: GearItem, player: RunPlayer): boolean {
    for (const k in item.price) {
      const key = k as 'wood' | 'meat' | 'gold';
      if ((player[key] || 0) < item.price[k]) return false;
    }
    return true;
  }

  rerollShop(player: RunPlayer): boolean {
    if (!this.stats.forgeLevel) return false;
    const cost = this.smithRerollCost();
    if (player.gold < cost) return false;
    player.gold -= cost;
    this.smithRerolls++;
    this.restockShop(false);
    Audio.playSfx('upgrade');
    return true;
  }

  buyShop(index: number, player: RunPlayer): GearItem | null {
    const item = this.shopStock[index];
    if (!item || !this.stats.forgeLevel) return null;
    if (!this.canAffordShop(item, player)) return null;
    for (const k in item.price) {
      const key = k as 'wood' | 'meat' | 'gold';
      player[key] -= item.price[k];
    }
    this.shopStock[index] = null;
    this.shopVersion++;
    Audio.playSfx('upgrade');
    return item;
  }

  damage(amount: number) {
    if (this.noCamp) return false;
    if (amount <= 0) return this.hp <= 0;
    this.hp -= amount;
    this.notifyStructureHit();
    return this.hp <= 0;
  }

  /** Legacy dusk: pick 1–3 raid fronts so banners can name directions. */
  prepareRaidFronts(dayNumber: number) {
    const fronts = dayNumber >= 8 ? 3 : dayNumber >= 4 ? 2 : 1;
    const a0 = Math.random() * TAU;
    this.raidAngles = [];
    for (let i = 0; i < fronts; i++) {
      this.raidAngles.push(a0 + (i * TAU) / fronts + rand(-0.35, 0.35));
    }
  }

  raidDirections() {
    const names = this.raidAngles.map((a) => compassName(a));
    if (!names.length) return 'the forest';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /** Spawn focus for raids — player under Vanilla, cabin otherwise. */
  raidFocus(player?: { x: number; y: number }) {
    if (this.noCamp && player) return { x: player.x, y: player.y };
    return { x: this.x, y: this.y };
  }

  /**
   * Legacy startRaid + spawnMiniboss/spawnTrueBoss — call once when night begins.
   * Builds a spawn queue (staggered) and drops the night boss once grace has ended.
   */
  startNightRaid(
    dayNumber: number,
    animals: AnimalSystem,
    threatM: number,
    graceLeft = 0,
    player?: { x: number; y: number },
  ) {
    if (this.assaultNight === dayNumber && this.raidActive) return;
    if (!this.raidAngles.length) this.prepareRaidFronts(dayNumber);

    this.assaultNight = dayNumber;
    this.pendingRaidCredit = true;
    this.raidActive = true;
    this.raidAnnounced = true;
    this.nightBossSpawned = false;
    this.raidSpawnT = 0;

    const n = dayNumber;
    const gauntlet = this.winGoalNights > 0 && dayNumber === this.winGoalNights;
    let count = Math.min(52, 3 + 3 * n + Math.floor((n * n) / 3));
    if (gauntlet) count = Math.min(64, Math.round(count * 1.45) + 8);
    const queue: RaidQueueSpec[] = [];
    for (let i = 0; i < count; i++) {
      const wBoar = 1;
      const wWolf = n >= 2 ? 0.9 : 0;
      const wBear = n >= 3 ? Math.min(0.6, 0.12 * n) : 0;
      let r = Math.random() * (wBoar + wWolf + wBear);
      let species = 'boar';
      if ((r -= wBoar) >= 0) species = (r -= wWolf) < 0 ? 'wolf' : 'bear';
      if (species === 'boar' && n >= 3 && Math.random() < 0.12) species = 'dire_boar';
      else if (species === 'wolf' && n >= 4 && Math.random() < 0.14) species = 'dire_wolf';
      else if (species === 'bear' && n >= 5 && Math.random() < 0.16) species = 'dire_bear';
      else if (species === 'boar' && n >= 2 && Math.random() < 0.1) {
        species = Math.random() < 0.5 ? 'sheep' : 'beaver';
      }
      queue.push({
        species,
        big: species === 'boar' && n >= 2 && Math.random() < 0.25,
      });
    }
    this.raidQueue = queue;

    const dirs = this.raidDirections();
    const { hint: speciesHint, top: topSpecies } = summarizeRaidQueue(queue);
    this.onRaidStart?.(dayNumber, count, dirs, speciesHint, topSpecies);
    const gauntletNight = this.winGoalNights > 0 && dayNumber === this.winGoalNights;
    if (gauntletNight) {
      this.onNightBoss?.('true', dayNumber);
    } else {
      this.onNightBoss?.(isBossNight(dayNumber) ? 'true' : 'mini', dayNumber);
    }

    // Boss leads the night once start-of-run grace ends (retry in update).
    this.trySpawnNightBoss(animals, threatM, graceLeft, player);
  }

  /** Spawn (or retry) the night miniboss / true boss. */
  private trySpawnNightBoss(
    animals: AnimalSystem,
    threatM: number,
    graceLeft = 0,
    player?: { x: number; y: number },
  ) {
    if (this.nightBossSpawned) return;
    if (graceLeft > 0) return;
    const dayNumber = this.assaultNight || 1;
    const ww = animals.worldSize.w;
    const wh = animals.worldSize.h;
    const focus = this.raidFocus(player);
    const gauntlet = this.winGoalNights > 0 && dayNumber === this.winGoalNights;
    if (gauntlet || isBossNight(dayNumber)) {
      const boss = animals.spawnTrueBoss(
        dayNumber,
        threatM,
        focus.x,
        focus.y,
        ww,
        wh,
        this.raidAngles[0],
      );
      if (!boss) return;
      this.nightBossSpawned = true;
      const moves = [...(boss.bossMoves || [])];
      this.onTrueBossSpawn?.(boss.displayName || boss.species, moves);
      if (gauntlet) {
        // Extra miniboss escorts for the finish-line night.
        animals.spawnMiniboss(dayNumber, threatM * 1.1, focus.x, focus.y, ww, wh, this.raidAngles);
        if (dayNumber >= 12) {
          animals.spawnMiniboss(dayNumber, threatM * 1.15, focus.x, focus.y, ww, wh, this.raidAngles);
        }
      }
    } else {
      const n = animals.spawnMiniboss(dayNumber, threatM, focus.x, focus.y, ww, wh, this.raidAngles);
      if (!n) return;
      this.nightBossSpawned = true;
    }
  }

  /** Drain the night raid queue (legacy updateRaid). */
  updateNightRaid(
    dt: number,
    animals: AnimalSystem,
    threatM: number,
    graceLeft = 0,
    player?: { x: number; y: number },
  ) {
    if (!this.raidActive) return;
    // Boss first — never let the animal soft-cap eat the night lead.
    if (!this.nightBossSpawned) this.trySpawnNightBoss(animals, threatM, graceLeft, player);
    if (!this.raidQueue.length) return;
    this.raidSpawnT -= dt;
    if (this.raidSpawnT > 0) return;
    // Peek then pop only on successful spawn (legacy pops inside the free-spot loop).
    const spec = this.raidQueue[this.raidQueue.length - 1];
    if (!spec) return;
    const angles = this.raidAngles.length ? this.raidAngles : [-Math.PI / 2];
    const angle = angles[(this.raidQueue.length - 1) % angles.length];
    const focus = this.raidFocus(player);
    const spawned = animals.spawnRaidMember(
      spec.species,
      focus.x,
      focus.y,
      angle,
      threatM,
      !!spec.big,
      this.assaultNight || 1,
    );
    if (!spawned) {
      // Retry next tick after culling more ambient.
      this.raidSpawnT = 0.05;
      return;
    }
    this.raidQueue.pop();
    this.raidSpawnT = RAID_SPAWN_INTERVAL;
  }

  /**
   * Legacy Base.onDawn — cabin + palisades fully repaired at sunrise
   * (as long as the camp still stands).
   */
  onDawn() {
    if (this.hp > 0) this.hp = this.maxHp;
    for (const w of this.walls) {
      w.alive = true;
      w.hp = w.maxHp;
      for (const s of w.sprites) s.setVisible(true).setAlpha(1).clearTint();
    }
  }

  /** Dawn raid payout + clear siege state. Repair is handled by onDawn(). */
  resolveDawnSurvival(player: RunPlayer): { wood: number; gold: number } | null {
    if (!this.pendingRaidCredit) return null;
    let reward: { wood: number; gold: number } | null = null;
    if (this.hp > 0) {
      player.raidsSurvived++;
      if (!this.noCamp) {
        const wave = this.assaultNight || 1;
        const gold = 4 + 3 * wave;
        const wood = 10 * wave;
        gainResource(player, 'gold', gold);
        gainResource(player, 'wood', wood);
        reward = { wood, gold };
      } else {
        // Vanilla: survival still counts; XP payout is handled by RunScene.
        reward = { wood: 0, gold: 0 };
      }
    }
    this.pendingRaidCredit = false;
    this.assaultNight = null;
    this.raidActive = false;
    this.raidQueue.length = 0;
    this.raidAnnounced = false;
    this.nightBossSpawned = false;
    return reward;
  }

  private pay(player: RunPlayer, x: number, y: number, wood: number, meat: number, gold: number) {
    if (wood) gainResource(player, 'wood', wood);
    if (meat) gainResource(player, 'meat', meat);
    if (gold) gainResource(player, 'gold', gold);
    if (wood || meat || gold) this.onPay?.(x, y, wood, meat, gold);
  }

  update(
    dt: number,
    player: RunPlayer,
    animals: AnimalSystem,
    isNight: boolean,
    dayNumber: number,
    threatM: number,
    graceLeft: number,
    onRaid: () => void,
  ) {
    if (this.noCamp) {
      // Raids still fire; no structures, income, or collision.
      if (isNight) {
        if (!this.raidActive && this.assaultNight !== dayNumber) {
          this.startNightRaid(dayNumber, animals, threatM, graceLeft, player);
          onRaid();
        }
        this.updateNightRaid(dt, animals, threatM, graceLeft, player);
      }
      if (this.campAlertCd > 0) this.campAlertCd -= dt;
      return;
    }

    const s = this.stats;
    this.syncPlayerBuildBonuses(player);

    // Forest Beckons — escalating wildlife wave every 60s.
    if (s.forestBeckons) {
      this.beckonsT -= dt;
      if (this.beckonsT <= 0) {
        this.beckonsT = 60;
        this.beckonsWave++;
        animals.spawnForestBeckonsWave(this.x, this.y, this.beckonsWave, threatM);
        this.fx?.ring(this.x, this.y, 'rgba(109,212,106,0.85)', 20, 280, 0.55);
        Audio.playSfx('howl', 0.7);
      }
    }

    this.incomeT -= dt;
    if (this.incomeT <= 0) {
      this.incomeT = MILL_INTERVAL;
      this.pay(player, this.x, this.y - 80, s.campWood, s.campMeat, s.campGold);
    }
    if (this.levels.mill) {
      this.millT -= dt;
      if (this.millT <= 0) {
        this.millT = s.millInterval;
        this.pay(player, this.x - 210, this.y + 90, s.millWood, 0, 0);
      }
    }
    if (this.levels.mine) {
      this.mineT -= dt;
      if (this.mineT <= 0) {
        this.mineT = s.mineInterval;
        this.pay(player, this.x + 210, this.y + 90, 0, 0, s.mineGold);
      }
    }
    if (this.levels.butcher) {
      this.butcherT -= dt;
      if (this.butcherT <= 0) {
        this.butcherT = s.butcherInterval;
        this.pay(player, this.x + 200, this.y - 100, 0, s.butcherMeat, 0);
      }
    }

    if (s.forgeLevel) {
      this.shopRefreshIn -= dt;
      if (this.shopRefreshIn <= 0) this.restockShop(true);
    }

    // Campfire heal: full rate in yard; Eternal Fire = half rate in expanded ring.
    if (player.alive && s.healRate > 0 && player.hp < player.maxHp) {
      const inYard = this.contains(player.x, player.y);
      let rate = 0;
      if (inYard) {
        rate = s.healRate;
      } else if (s.eternalFire) {
        const d2 = dist2(player.x, player.y, this.x, this.y + 70);
        const r = s.eternalHealR || 260;
        if (d2 < r * r) rate = s.healRate * 0.5;
      }
      if (rate > 0) {
        player.hp = Math.min(player.maxHp, player.hp + rate * dt);
        this.healFx -= dt;
        if (this.healFx <= 0) {
          this.healFx = 0.35;
          this.fx?.sparkle(player.x, player.y, '#9ef08a');
        }
      }
    }

    // Campfire ember particles
    // Campfire embers always (legacy fire is always lit).
    if (Math.random() < dt * 6) {
      this.fx?.sparks(this.x + (Math.random() - 0.5) * 12, this.y + 70, 1, '#ffb347');
    }

    this.animT += dt;
    this.redrawCampVisuals(animals);

    for (let i = 0; i < this.towers.length; i++) {
      this.towerTimers[i] -= dt;
      if (this.towerTimers[i] > 0) continue;
      const tw = this.towers[i];
      const hits: { a: AnimalEntity; d2: number }[] = [];
      for (const a of animals.animals) {
        if (a.dead) continue;
        const d2 = dist2(tw.x, tw.y, a.x, a.y);
        if (d2 > s.towerRange * s.towerRange) continue;
        hits.push({ a, d2 });
      }
      hits.sort((p, q) => p.d2 - q.d2);
      const n = Math.min(s.towerTargets, hits.length);
      if (!n) {
        this.towerTimers[i] = 0.2;
        continue;
      }
      this.towerTimers[i] = 1 / s.fireRate;
      // Face the first (nearest) target when firing.
      if (hits[0].a.x < tw.x) tw.aim = -1;
      else tw.aim = 1;
      for (let k = 0; k < n; k++) {
        this.spawnArrow(tw.x, tw.y, hits[k].a, s.arrowDmg);
      }
    }

    this.updateArrows(dt, player, animals, isNight, dayNumber, threatM);

    // Night raid queue drain (start is triggered from RunScene on enteredNight).
    if (isNight) {
      if (!this.raidActive && this.assaultNight !== dayNumber) {
        // Fallback if phase enter was missed (huge dt / tab blur).
        this.startNightRaid(dayNumber, animals, threatM, graceLeft, player);
        onRaid();
      }
      this.updateNightRaid(dt, animals, threatM, graceLeft, player);
    }

    this.updateOverlays();

    if (this.campAlertCd > 0) this.campAlertCd -= dt;
    if (this.structureHitFlashCd > 0) this.structureHitFlashCd -= dt;
    const wallsUp = this.walls.some((w) => w.alive);
    for (const a of animals.animals) {
      if (a.dead || a.leaving) continue;
      this.collideStructures(a, a.radius);
      // Lunges phase through walls (legacy snap).
      if (a.state === 'lunge') {
        a.blockWall = null;
      } else {
        a.blockWall = this.collideWalls(a, a.radius * 0.8);
      }
      const sieging =
        a.raider ||
        a.assault ||
        a.dayBoss ||
        a.boss ||
        a.state === 'march' ||
        a.strikeStructure;
      if (a.blockWall && sieging && a.attackCd <= 0 && a.state === 'march') {
        // Contact DPS while pressing the palisade (complements discrete windup hits).
        this.damageWall(a.blockWall, a.dmg * dt * 1.4);
        if (this.campAlertCd <= 0) {
          this.campAlertCd = 10;
          this.onCampAttack?.();
        }
      }
      if (sieging && !wallsUp && dist2(a.x, a.y, this.x, this.y - 40) < 70 * 70) {
        this.damage(a.dmg * dt * 0.8);
        if (this.campAlertCd <= 0) {
          this.campAlertCd = 10;
          this.onCampAttack?.();
        }
      }
    }
  }

  /** Legacy `game.spawnArrow` — visual homing bolt from tower top. */
  private spawnArrow(tx: number, ty: number, target: AnimalEntity, dmg: number) {
    const sp = SPECIES[target.species];
    const bodyOff = (sp?.bodyOff || 10) * (target.scale || 1);
    const speed = 720;
    const dx = target.x - tx;
    const dy = target.y - bodyOff - ty;
    const d = Math.hypot(dx, dy) || 1;
    const cs = new CanvasSprite(this.scene, this.layer, 40, 16, `rt_tarrow_${this.arrowUid++}`, 0.5, 0.5);
    cs.clear();
    cs.ctx.save();
    cs.ctx.translate(cs.w / 2, cs.h / 2);
    drawTowerArrow(cs.ctx);
    cs.ctx.restore();
    cs.refresh();
    Audio.playSfx('bow');
    this.arrows.push({
      x: tx,
      y: ty,
      z: 78,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      speed,
      life: 1.4,
      dmg,
      dead: false,
      target,
      canvas: cs,
    });
  }

  private updateArrows(
    dt: number,
    player: RunPlayer,
    animals: AnimalSystem,
    isNight: boolean,
    dayNumber: number,
    threatM: number,
  ) {
    for (const ar of this.arrows) {
      if (ar.dead) continue;
      ar.life -= dt;
      if (ar.life <= 0) {
        ar.dead = true;
        continue;
      }
      const t = ar.target;
      if (t && !t.dead) {
        const sp = SPECIES[t.species];
        const bodyOff = (sp?.bodyOff || 10) * (t.scale || 1);
        const dx = t.x - ar.x;
        const dy = t.y - bodyOff - ar.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < t.radius + 6 + ar.speed * dt) {
          ar.dead = true;
          t.hp -= ar.dmg;
          this.fx?.sparks(t.x, t.y - 20, 3, '#9fd8ff');
          this.onFloatText?.(
            t.x + rand(-8, 8),
            t.y - ((sp?.height || 36) * (t.scale || 1)),
            String(Math.round(ar.dmg)),
            '#9fd8ff',
            13,
            { vx: rand(-20, 20), life: 0.6 },
          );
          if (t.hp <= 0 && animals.combat) {
            animals.killAnimal(t, player, animals.combat.pickups, animals.combat.pools, {
              isNight,
              dayNumber,
              threatM,
            });
          }
          continue;
        }
        ar.vx = (dx / d) * ar.speed;
        ar.vy = (dy / d) * ar.speed;
      }
      ar.x += ar.vx * dt;
      ar.y += ar.vy * dt;
      ar.z = Math.max(10, ar.z - 90 * dt);
      ar.canvas.image
        .setPosition(ar.x, ar.y - ar.z)
        .setRotation(Math.atan2(ar.vy, ar.vx))
        .setDepth(Math.floor(ar.y) + 20);
    }
    compactInPlace(this.arrows, (ar) => {
      if (ar.dead) ar.canvas.destroy();
      return ar.dead;
    });
  }

  destroy() {
    this.campCanvas.destroy();
    this.yardGfx.destroy();
    for (const w of this.walls) for (const s of w.sprites) s.destroy();
    for (const t of this.towers) t.canvas.destroy();
    for (const b of this.buildings) b.canvas?.destroy();
    for (const ar of this.arrows) ar.canvas.destroy();
    this.arrows.length = 0;
  }
}

function summarizeRaidQueue(queue: RaidQueueSpec[]): { hint: string; top: string[] } {
  const counts = new Map<string, number>();
  for (const q of queue) counts.set(q.species, (counts.get(q.species) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!ranked.length) return { hint: '', top: [] };
  const top = ranked.map(([sp]) => sp);
  const hint = ranked
    .map(([sp, n]) => {
      const label = SPECIES[sp]?.name || sp;
      return n > 1 ? `${n}× ${label}` : label;
    })
    .join(', ');
  return { hint, top };
}
