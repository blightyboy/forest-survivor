import Phaser from 'phaser';
import {
  AGGRO_RANGE_MULT,
  SPECIES,
  rollAnimalVariant,
  variantMult,
  DAY_BOSS_SPECIES,
  BOSS_NAMES,
  animalFamily,
  isBearish,
  isBoarish,
  isWolfish,
  isTinyPest,
  ANIMAL_VARIANTS,
  type SpeciesId,
} from '../data/animals';
import { Audio } from '../audio/Audio';
import {
  ELEMENTS,
  RAID_DISTANCE,
  rollStars,
  rollEnemyElement,
  starMult,
  starTierInfo,
  type ElementId,
} from '../data/constants';
import { clamp, dist2, rand, compactInPlace, TAU } from '../core/math';
import { cameraWorldBounds } from '../core/renderScale';
import { STAR_LOOT } from '../data/constants';
import type { RunPlayer, Pickup, FirePool } from '../run/RunTypes';
import type { CombatSystem } from './CombatSystem';
import type { CampSystem, WallSeg } from './CampSystem';
import { CanvasSprite } from '../art/draw/CanvasSprite';
import { drawAnimalBody } from '../art/draw/animalBodies';
import { drawEnemyBolt, enemyBoltCanvasSize } from '../art/draw/enemyBoltDraw';
import {
  initAnimalAbilities,
  tryStartAnimalAbility,
  updateAnimalAbility,
  updateHazards,
  drawAbilityOverlays,
  animalEffectiveDamage,
  type AnimalAbility,
  type Hazard,
  type EnemyBoltShot,
  type BossAbilityId,
} from './EnemyAbilities';
import type { FxSystem } from './FxSystem';
import { ellipse } from '../art/draw/primitives';

export const MAX_ANIMALS = 80;

export type AnimalState =
  | 'wander'
  | 'chase'
  | 'march'
  | 'windup'
  | 'lunge'
  | 'cooldown'
  | 'shoot'
  | 'ability'
  | 'recover';

export interface AnimalEntity {
  uid: number;
  species: SpeciesId;
  variant: string;
  displayName?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  dmg: number;
  speed: number;
  aggro: number;
  state: AnimalState;
  stateT: number;
  cd: number;
  /** Melee / structure attack cooldown (legacy attackCd). */
  attackCd: number;
  stars: number;
  raider: boolean;
  /** Daytime assault-wave sieger. */
  assault: boolean;
  /** Retreating after dawn — despawn when far. */
  leaving: boolean;
  swarm: boolean;
  boss: boolean;
  /** Night raid true boss (every 3rd night). */
  trueBoss: boolean;
  dayBoss: boolean;
  element: ElementId | null;
  burns: { dps: number; life: number }[];
  slow: number;
  slowT: number;
  dead: boolean;
  hitCd: number;
  wanderAngle: number;
  ranged: boolean;
  preferRange: number;
  shotRange: number;
  shotSpeed: number;
  shotRadius: number;
  shotCount: number;
  shotSpread: number;
  shotKind: string;
  shotColor: string;
  shotSpin: number;
  sprite: Phaser.GameObjects.Image;
  canvas?: CanvasSprite;
  facing: number;
  walkTime: number;
  moving: boolean;
  flash: number;
  scale: number;
  big: boolean;
  xpMult: number;
  lootMult: number;
  /** Necro split fragment — reduced loot (legacy fromSplit). */
  fromSplit: boolean;
  /** Wall currently pushing this animal (set by CampSystem). */
  blockWall: WallSeg | null;
  /** Windup targeting a wall / cabin instead of the player. */
  strikeStructure: boolean;
  bar?: Phaser.GameObjects.Graphics;
  /** Skip canvas redraw when visual state is unchanged. */
  drawKey?: string;
  /** Elemental / boss special (legacy abilities.js). */
  ability: AnimalAbility | null;
  abilityCd: number;
  bossMoves: BossAbilityId[];
  bossMoveCd: Record<string, number>;
  inspireT: number;
  inspireMul: number;
  _abilHit: boolean;
}

export type AnimalShot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  life: number;
  dead: boolean;
  kind: string;
  color: string;
  spin: number;
  rot: number;
  ang: number;
  /** Legacy EnemyBolt.hitBuildings — damage palisades / cabin on impact. */
  hitBuildings: boolean;
  canvas: CanvasSprite;
  gfx: Phaser.GameObjects.Image;
};

export type KillContext = {
  isNight: boolean;
  dayNumber: number;
  threatM: number;
  fromSplit?: boolean;
};

export class AnimalSystem {
  animals: AnimalEntity[] = [];
  shots: AnimalShot[] = [];
  hazards: Hazard[] = [];
  abilityBolts: EnemyBoltShot[] = [];
  private abilityGfx: Phaser.GameObjects.Graphics | null = null;
  /** World-space ground shadows / element rings (legacy drawShadow pass — not baked into body). */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private uid = 1;
  private shotUid = 1;
  private spawnTimer = 0;
  private swarmTimer = 42;
  scene: Phaser.Scene;
  layer: Phaser.GameObjects.Container;
  fxLayer: Phaser.GameObjects.Container | null = null;
  combat: CombatSystem | null = null;
  camp: CampSystem | null = null;
  vfx: FxSystem | null = null;
  worldCenter = { x: 2400, y: 2400 };
  worldSize = { w: 4800, h: 4800 };
  /** Reject spawn points inside the camp yard (legacy spawnInBase). */
  spawnBlocked: (x: number, y: number) => boolean = () => false;
  onDayBoss?: (name: string) => void;
  onPlayerHurt?: () => void;
  onSwarm?: (label: string, count: number, tint: string) => void;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.layer = layer;
  }

  setFxLayer(fx: Phaser.GameObjects.Container) {
    this.fxLayer = fx;
  }

  setCombat(c: CombatSystem) {
    this.combat = c;
  }

  setCamp(c: CampSystem) {
    this.camp = c;
  }

  clear() {
    for (const a of this.animals) {
      if (a.canvas) a.canvas.destroy();
      else a.sprite.destroy();
      a.bar?.destroy();
    }
    for (const s of this.shots) s.canvas.destroy();
    for (const b of this.abilityBolts) {
      if (b.canvas) b.canvas.destroy();
      else b.gfx.destroy();
    }
    this.animals.length = 0;
    this.shots.length = 0;
    this.hazards.length = 0;
    this.abilityBolts.length = 0;
    this.abilityGfx?.destroy();
    this.abilityGfx = null;
    this.groundGfx?.destroy();
    this.groundGfx = null;
  }

  hasBossOfType(species: SpeciesId) {
    for (const a of this.animals) {
      if (!a.dead && a.boss && a.species === species) return true;
    }
    return false;
  }

  /**
   * Free slots for priority spawns (raid / boss) by culling expendable ambient / swarm mobs.
   * Never removes raiders, assault siegers, bosses, or day bosses.
   */
  ensureSpawnSlots(need = 1, preferNear?: { x: number; y: number }) {
    const room = () => MAX_ANIMALS - this.animals.length;
    if (room() >= need) return;
    const scored: { a: AnimalEntity; d2: number }[] = [];
    for (const a of this.animals) {
      if (a.dead || a.raider || a.assault || a.boss || a.dayBoss || a.trueBoss) continue;
      const d2 = preferNear ? dist2(a.x, a.y, preferNear.x, preferNear.y) : 0;
      // Prefer culling swarms / far ambient first (high d2 = far = cull sooner via sort desc).
      scored.push({ a, d2: a.swarm ? d2 + 1e12 : d2 });
    }
    scored.sort((p, q) => q.d2 - p.d2);
    for (const { a } of scored) {
      if (room() >= need) break;
      a.dead = true;
      a.sprite.setVisible(false);
    }
    // Compact immediately so length reflects free slots for the upcoming spawn().
    compactInPlace(this.animals, (a) => {
      if (a.dead) {
        if (a.canvas) a.canvas.destroy();
        else a.sprite.destroy();
        a.bar?.destroy();
        return true;
      }
      return false;
    });
  }

  spawn(
    species: SpeciesId,
    x: number,
    y: number,
    opts: {
      variant?: string;
      raider?: boolean;
      assault?: boolean;
      swarm?: boolean;
      boss?: boolean;
      trueBoss?: boolean;
      dayBoss?: boolean;
      big?: boolean;
      fromSplit?: boolean;
      threatM?: number;
      displayName?: string;
      hpMult?: number;
      dmgMult?: number;
      element?: ElementId | null;
      stars?: number;
      maxHp?: number;
      /** Threat mult overrides (legacy enemyOpts.mult). */
      mult?: { hp?: number; dmg?: number; speed?: number };
    } = {},
  ) {
    if (this.animals.length >= MAX_ANIMALS) return null;
    const baseSp = SPECIES[species];
    if (!baseSp) return null;
    // Hard gate: nothing ever spawns inside the camp yard (legacy spawnInBase).
    if (this.spawnBlocked(x, y)) {
      const far =
        this.findEnemySpawn(this.worldCenter.x, this.worldCenter.y, RAID_DISTANCE * 0.6, RAID_DISTANCE, 36) ||
        this.findEnemySpawn(x, y, 80, 220, 24);
      if (!far) return null;
      x = far.x;
      y = far.y;
    }
    const sp = opts.boss && baseSp.bossCombat ? { ...baseSp, ...baseSp.bossCombat } : baseSp;
    const threatM = opts.threatM || 0;
    const multHp = opts.mult?.hp ?? 1 + 0.4 * threatM;
    const multDmg = opts.mult?.dmg ?? 1 + 0.16 * threatM;
    const multSpd = opts.mult?.speed ?? Math.min(1.5, 1 + 0.02 * threatM);
    const big = !!opts.big && isBoarish(species) && !opts.boss;
    const raider = !!opts.raider || !!opts.assault;
    const assault = !!opts.assault;
    const swarm = !!opts.swarm;
    const boss = !!opts.boss || !!opts.trueBoss;
    const dayBoss = !!opts.dayBoss || (boss && !raider && !opts.trueBoss);

    let variant = rollAnimalVariant(threatM, {
      variant: opts.variant as never,
      raider,
      boss,
      big,
      swarm,
      species,
    });
    if (opts.fromSplit) variant = 'basic';
    if (!opts.fromSplit && variant === 'dire' && String(species).startsWith('dire_')) {
      const r = Math.random();
      variant = r < 0.4 ? 'demonic' : r < 0.75 ? 'necromantic' : 'basic';
    }
    const vm = variantMult(variant);
    const stars =
      opts.stars != null
        ? clamp(opts.stars, 0, 15)
        : rollStars(threatM, { boss, big, raider, swarm });
    const sm = starMult(stars);
    const element =
      opts.element !== undefined
        ? opts.element
        : rollEnemyElement({ boss, raider, swarm, threatM });

    let scale = opts.trueBoss
      ? isBearish(species)
        ? 2.15
        : 2.55
      : boss
        ? isBearish(species)
          ? 1.7
          : isTinyPest(species)
            ? 2.6
            : 2.1
        : big
          ? 1.4
          : 1;
    if (opts.fromSplit) scale *= 0.7;
    else if (variant === 'demonic') scale *= 1.06;
    else if (variant === 'dire') scale *= 1.04;

    let hp = opts.maxHp
      ? opts.maxHp
      : Math.round(sp.hp * (big ? 3.2 : 1) * multHp * sm.hp * vm.hp);
    let dmg = Math.round(
      sp.dmg * (big ? 2 : 1) * (boss ? 2.5 : 1) * multDmg * sm.dmg * vm.dmg,
    );
    if (opts.hpMult) hp = Math.round(hp * opts.hpMult);
    if (opts.dmgMult) dmg = Math.round(dmg * opts.dmgMult);
    const speed =
      sp.chase * (big ? 0.85 : 1) * (boss ? 0.8 : 1) * multSpd * sm.speed * vm.speed * (opts.trueBoss ? 0.95 : 1);

    const feetPad = 18;
    const canvasW = Math.ceil(Math.max(72, sp.radius * 4 + 40) * scale * (boss ? 1.15 : 1));
    const canvasH = Math.ceil(Math.max(64, (sp.height || 40) + 28) * scale + feetPad);
    // Origin on feet (not canvas bottom) so the sprite lines up with world y / HP bars.
    const canvas = new CanvasSprite(
      this.scene,
      this.layer,
      canvasW,
      canvasH,
      `rt_animal_${this.uid}`,
      0.5,
      (canvasH - feetPad) / canvasH,
    );
    const initialState: AnimalState = raider || dayBoss ? 'march' : swarm ? 'chase' : 'wander';
    const a: AnimalEntity = {
      uid: this.uid++,
      species,
      variant,
      displayName: opts.displayName,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      radius: sp.radius * scale,
      dmg,
      speed,
      aggro: sp.aggro * AGGRO_RANGE_MULT * (opts.trueBoss ? 1.4 : 1),
      state: initialState,
      stateT: rand(1, 3),
      cd: 0,
      attackCd: 0,
      stars,
      raider,
      assault,
      leaving: false,
      swarm,
      boss,
      trueBoss: !!opts.trueBoss,
      dayBoss,
      element,
      burns: [],
      slow: 0,
      slowT: 0,
      dead: false,
      hitCd: 0,
      wanderAngle: rand(0, TAU),
      ranged: !!sp.ranged,
      preferRange: sp.preferRange || 200,
      shotRange: sp.range || 320,
      shotSpeed: sp.shotSpeed || 280,
      shotRadius: sp.shotRadius || 8,
      shotCount: sp.shotCount || 1,
      shotSpread: sp.shotSpread || 0,
      shotKind: sp.shotKind || 'bolt',
      shotColor: sp.shotColor || '#4db8ff',
      shotSpin: sp.shotSpin || 0,
      sprite: canvas.image,
      canvas,
      facing: 1,
      walkTime: rand(0, TAU),
      moving: false,
      flash: 0,
      scale,
      big,
      xpMult: sm.xp * vm.xp,
      lootMult: sm.loot * vm.loot,
      fromSplit: !!opts.fromSplit,
      blockWall: null,
      strikeStructure: false,
      ability: null,
      abilityCd: 0,
      bossMoves: [],
      bossMoveCd: {},
      inspireT: 0,
      inspireMul: 1,
      _abilHit: false,
    };
    initAnimalAbilities(a, { trueBoss: !!opts.trueBoss });
    this.redrawAnimal(a);
    this.animals.push(a);
    return a;
  }

  private redrawAnimal(a: AnimalEntity, force = false) {
    if (!a.canvas) return;
    // Quantize walk / flash so we don't re-upload a canvas texture every frame.
    const walkFrame = a.moving ? (a.walkTime * 2) | 0 : 0;
    const flashQ = a.flash > 0 ? Math.ceil(a.flash * 16) : 0;
    const key = `${a.facing}|${walkFrame}|${flashQ}|${a.state}|${a.variant}|${a.boss ? 1 : 0}`;
    if (!force && a.drawKey === key) return;
    a.drawKey = key;
    const sp = SPECIES[a.species];
    a.canvas.clear();
    a.canvas.withFeetOrigin((ctx) => {
      ctx.save();
      ctx.scale(a.facing * a.scale, a.scale);
      const windup = a.state === 'windup';
      const angry = a.state === 'chase' || a.state === 'lunge' || a.state === 'windup';
      drawAnimalBody(ctx, {
        species: a.species,
        variant: a.variant,
        walkTime: a.walkTime,
        moving: a.moving,
        facing: a.facing,
        scale: a.scale,
        big: a.big,
        boss: a.boss,
        flash: a.flash,
        // Unscaled SPECIES metrics — body art + variant rim/spikes share local space under ctx.scale.
        height: sp.height,
        radius: sp.radius,
        bodyOff: sp.bodyOff,
        sp: {
          color: sp.color,
          shade: sp.shade,
          belly: sp.belly,
          eye: sp.eye,
          height: sp.height,
          bodyOff: sp.bodyOff,
          radius: sp.radius,
        },
      }, windup, angry);
      ctx.restore();
      // Element orb (legacy drawElementOrb) — world-facing, not mirrored by facing.
      if (a.element && ELEMENTS[a.element]) {
        const el = ELEMENTS[a.element];
        const ox = a.radius * 0.75 * a.facing;
        const oy = -(sp.height || 40) * a.scale + 4;
        ctx.fillStyle = el.glow;
        ellipse(ctx, ox, oy, 5.5, 5.5);
        ctx.fill();
        ctx.fillStyle = el.color;
        ellipse(ctx, ox, oy, 3.2, 3.2);
        ctx.fill();
      }
    }, 18);
    a.canvas.refresh();
  }

  /**
   * Legacy drawShadow + ground element/slow rings — drawn in world space under feet
   * so they Y-sort on the ground instead of riding the body sprite (which made rings
   * look offset / clipped through fences).
   */
  private drawGroundMarkers() {
    if (!this.groundGfx) {
      this.groundGfx = this.scene.add.graphics().setDepth(1);
      this.layer.add(this.groundGfx);
    }
    const g = this.groundGfx;
    g.clear();
    // Keep markers under bodies: depth follows feet with a small bias.
    // Always under body sprites (legacy shadow pass runs before entity draws).
    g.setDepth(0);
    for (const a of this.animals) {
      if (a.dead || !a.sprite.visible) continue;
      const gy = a.y + 1;
      if (a.boss) {
        g.fillStyle(0xbe3cff, 0.22);
        g.fillEllipse(a.x, gy, a.radius * 3.4, a.radius * 1.4);
      }
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(a.x, gy, (a.radius + 2) * 2.1, a.radius * 0.76);
      if (a.element && ELEMENTS[a.element]) {
        const col = Phaser.Display.Color.HexStringToColor(ELEMENTS[a.element].color).color;
        g.lineStyle(2.2, col, 0.42);
        g.strokeEllipse(a.x, gy, a.radius * 2.3, a.radius * 0.84);
      }
      if (a.slowT > 0) {
        g.lineStyle(2, 0x4db8ff, 0.35 + a.slow * 0.35);
        g.strokeEllipse(a.x, gy, a.radius * 2.5, a.radius * 0.96);
      }
    }
  }

  /**
   * Raid-edge spawn near camp, never inside the yard (legacy spawnMiniboss / spawnTrueBoss).
   */
  private raidEdgeSpawn(campX: number, campY: number, worldW: number, worldH: number, ang: number, dist: number) {
    let x = clamp(campX + Math.cos(ang) * dist, 280, worldW - 280);
    let y = clamp(campY + Math.sin(ang) * dist, 280, worldH - 280);
    if (this.spawnBlocked(x, y)) {
      const far = this.findEnemySpawn(campX, campY, RAID_DISTANCE * 0.6, RAID_DISTANCE, 36);
      if (!far) return null;
      x = far.x;
      y = far.y;
    }
    return { x, y };
  }

  /** Night miniboss(es) — every non-boss night. Returns how many spawned. */
  spawnMiniboss(
    dayNumber: number,
    threatM: number,
    campX: number,
    campY: number,
    worldW: number,
    worldH: number,
    raidAngles?: number[],
  ) {
    const n = dayNumber >= 7 ? 2 : 1;
    this.ensureSpawnSlots(n + 2, { x: campX, y: campY });
    const kinds: SpeciesId[] =
      dayNumber <= 1 ? ['boar', 'dire_boar']
        : dayNumber === 2 ? ['boar', 'wolf', 'dire_wolf']
          : ['boar', 'wolf', 'bear', 'dire_boar', 'dire_wolf', 'dire_bear'];
    const used = new Set<string>();
    const angles = raidAngles?.length ? raidAngles : [rand(0, TAU)];
    let spawned = 0;
    for (let i = 0; i < n; i++) {
      let species = kinds[Math.floor(Math.random() * kinds.length)];
      if (used.has(species) && kinds.length > 1) {
        const alt = kinds.filter((k) => !used.has(k));
        if (alt.length) species = alt[Math.floor(Math.random() * alt.length)];
      }
      used.add(species);
      const ang = angles[i % angles.length] + rand(-0.4, 0.4);
      const spot = this.raidEdgeSpawn(campX, campY, worldW, worldH, ang, RAID_DISTANCE * 0.72);
      if (!spot) continue;
      this.ensureSpawnSlots(1, { x: campX, y: campY });
      const dire = species.startsWith('dire_');
      const hp = Math.round(SPECIES[species].hp * (16 + dayNumber * 5) * (1 + 0.4 * threatM) * (dire ? 0.85 : 1));
      const boss = this.spawn(species, spot.x, spot.y, {
        boss: true,
        raider: true,
        threatM,
        maxHp: hp,
        dmgMult: 1.4 + 0.12 * dayNumber,
        displayName: BOSS_NAMES[species],
      });
      if (boss) spawned++;
    }
    return spawned;
  }

  /** Every 3rd night: a true boss with the screen HP bar. */
  spawnTrueBoss(
    dayNumber: number,
    threatM: number,
    campX: number,
    campY: number,
    worldW: number,
    worldH: number,
    raidAngle?: number,
  ) {
    this.ensureSpawnSlots(3, { x: campX, y: campY });
    const kinds: SpeciesId[] =
      dayNumber <= 3 ? ['boar', 'wolf', 'dire_boar', 'dire_wolf']
        : ['boar', 'wolf', 'bear', 'dire_boar', 'dire_wolf', 'dire_bear'];
    const species = kinds[Math.floor(Math.random() * kinds.length)];
    const ang = (raidAngle ?? rand(0, TAU)) + rand(-0.3, 0.3);
    const spot = this.raidEdgeSpawn(campX, campY, worldW, worldH, ang, RAID_DISTANCE * 0.68);
    if (!spot) return null;
    const dire = species.startsWith('dire_');
    const hp = Math.round(SPECIES[species].hp * (42 + dayNumber * 10) * (1 + 0.4 * threatM) * (dire ? 0.9 : 1));
    return this.spawn(species, spot.x, spot.y, {
      trueBoss: true,
      boss: true,
      raider: true,
      threatM,
      maxHp: hp,
      dmgMult: 1.8 + 0.15 * dayNumber,
      displayName: BOSS_NAMES[species] || SPECIES[species]?.name,
    });
  }

  /** Legacy updateRaid member — spawn one raider on a camp-edge front. */
  spawnRaidMember(
    species: string,
    campX: number,
    campY: number,
    angle: number,
    threatM: number,
    big: boolean,
    wave: number,
  ) {
    this.ensureSpawnSlots(1, { x: campX, y: campY });
    const ww = this.worldSize.w;
    const wh = this.worldSize.h;
    const dist = RAID_DISTANCE * rand(0.85, 1.05);
    const ox = clamp(campX + Math.cos(angle) * dist, 260, ww - 260);
    const oy = clamp(campY + Math.sin(angle) * dist, 260, wh - 260);
    const bonus = 1 + 0.1 * wave;
    const opts = {
      raider: true as const,
      big: big && isBoarish(species as SpeciesId),
      threatM,
      mult: {
        hp: (1 + 0.4 * threatM) * bonus,
        dmg: 1 + 0.16 * threatM,
        speed: Math.min(1.5, 1 + 0.02 * threatM),
      },
    };
    for (let i = 0; i < 15; i++) {
      const x = ox + rand(-160, 160);
      const y = oy + rand(-160, 160);
      if (x < 80 || y < 80 || x > ww - 80 || y > wh - 80) continue;
      if (this.spawnBlocked(x, y)) continue;
      const spawned = this.spawn(species as SpeciesId, x, y, opts);
      if (spawned) return spawned;
    }
    // Last resort: any free ring around camp.
    const far = this.findEnemySpawn(campX, campY, RAID_DISTANCE * 0.6, RAID_DISTANCE, 30);
    if (!far) return null;
    return this.spawn(species as SpeciesId, far.x, far.y, opts);
  }

  /** Daytime champion — spawn well outside the kill / camp (legacy spawnDayBoss). */
  spawnDayBoss(species: SpeciesId, nearX: number, nearY: number, dayNumber: number, threatM: number) {
    if (this.hasBossOfType(species)) return;
    const spot =
      this.findEnemySpawn(nearX, nearY, 280, 520, 36) ||
      this.findEnemySpawn(this.worldCenter.x, this.worldCenter.y, 520, 900, 36);
    if (!spot || this.spawnBlocked(spot.x, spot.y)) return;
    const name = BOSS_NAMES[species] || `Champion ${SPECIES[species]?.name || species}`;
    const tiny = isTinyPest(species);
    const dire = species.startsWith('dire_');
    const hpScale = tiny ? 22 + dayNumber * 4 : 14 + dayNumber * 3.5;
    const hpMult = hpScale * (dire ? 0.9 : 1);
    const dmgMult = (1.25 + dayNumber * 0.08) * (dire ? 1.1 : 1);
    const boss = this.spawn(species, spot.x, spot.y, {
      boss: true,
      dayBoss: true,
      threatM,
      displayName: name,
      hpMult,
      dmgMult,
    });
    if (boss) this.onDayBoss?.(name);
  }

  tryDayBossFromKill(a: AnimalEntity, ctx: KillContext) {
    if (ctx.isNight || a.boss || a.raider || a.dayBoss) return;
    let kind: SpeciesId = a.species;
    if (!DAY_BOSS_SPECIES.includes(kind)) {
      const fam = animalFamily(kind) as SpeciesId;
      if (DAY_BOSS_SPECIES.includes(fam)) kind = fam;
      else return;
    }
    if (this.hasBossOfType(kind)) return;

    let chance = 0.035;
    if (isBearish(kind) || kind.startsWith('dire_')) chance = 0.07;
    else if (kind === 'deer' || kind === 'fox') chance = 0.045;
    else if (isTinyPest(kind)) chance = 0.028;
    chance += Math.min(0.06, ctx.dayNumber * 0.006);
    chance *= 1 + Math.min(0.55, (a.stars || 0) * 0.045);
    if (Math.random() > chance) return;
    this.spawnDayBoss(kind, a.x, a.y, ctx.dayNumber, ctx.threatM);
  }

  /** Legacy updateSpawning — day/night mix + ambient soft-cap. */
  spawnAmbient(px: number, py: number, threatM: number, isNight: boolean, dayNumber: number) {
    let ambient = 0;
    for (const a of this.animals) {
      if (!a.dead && !a.raider && !a.leaving && !a.swarm && !a.boss) ambient++;
    }
    if (ambient >= Math.min(80, 46 + dayNumber * 4)) return;

    const r = Math.random();
    let species: SpeciesId;
    let count = 1;
    if (isNight) {
      if (r < (dayNumber >= 2 ? 0.52 : 0.28)) {
        species = dayNumber >= 4 && Math.random() < 0.18 ? 'dire_wolf' : 'wolf';
        count = 2 + Math.floor(Math.random() * (dayNumber >= 3 ? 4 : 2));
      } else if (r < 0.68 || dayNumber < 2) {
        species = dayNumber >= 3 && Math.random() < 0.14 ? 'dire_boar' : 'boar';
      } else if (r < 0.82) {
        species = Math.random() < 0.55 ? 'beaver' : 'sheep';
      } else {
        species = dayNumber >= 5 && Math.random() < 0.2 ? 'dire_bear' : 'bear';
      }
    } else if (r < 0.1) species = 'deer';
    else if (r < 0.18) species = 'fox';
    else if (r < 0.28) {
      species = 'rat';
      count = 2 + Math.floor(Math.random() * 3);
    } else if (r < 0.38) species = 'sheep';
    else if (r < 0.48) species = 'beaver';
    else if (r < 0.82 || dayNumber < 2) {
      species = dayNumber >= 3 && Math.random() < 0.12 ? 'dire_boar' : 'boar';
    } else {
      species = dayNumber >= 5 && Math.random() < 0.15 ? 'dire_bear' : 'bear';
    }

    const spot = this.findEnemySpawn(px, py, 720, 1300, 30);
    if (!spot) return;
    const bigChance = clamp(0.08 + threatM * 0.04, 0.08, 0.4);
    for (let i = 0; i < count; i++) {
      if (this.animals.length >= MAX_ANIMALS) break;
      const x = spot.x + (i ? rand(-50, 50) : 0);
      const y = spot.y + (i ? rand(-50, 50) : 0);
      if (this.spawnBlocked(x, y)) continue;
      this.spawn(species, x, y, {
        threatM,
        big: isBoarish(species) && species === 'boar' && Math.random() < bigChance,
      });
    }
  }

  /** Legacy startSwarm — pest packs from every side. */
  spawnSwarm(px: number, py: number, threatM: number, dayNumber: number) {
    let live = 0;
    for (const a of this.animals) if (a.swarm && !a.dead) live++;
    if (live > 10) return;

    const roll = Math.random();
    let species: SpeciesId = 'rat';
    let label = 'Rat Swarm!';
    let tint = '#a89078';
    let pack = 18;
    if (dayNumber >= 3 && roll < 0.28) {
      species = 'raccoon';
      label = 'Raccoon Swarm!';
      tint = '#c8c4d8';
      pack = 10;
    } else if (roll < 0.48) {
      species = 'duck';
      label = 'Duck Swarm!';
      tint = '#6aaa4a';
      pack = 16;
    } else if (roll < 0.72) {
      species = 'squirrel';
      label = 'Squirrel Swarm!';
      tint = '#e0a060';
      pack = 14;
    }
    const count = Math.min(28, pack + dayNumber * 2);
    let n = 0;
    for (let i = 0; i < count; i++) {
      if (this.animals.length >= MAX_ANIMALS) break;
      const ang = (i / count) * TAU + rand(-0.12, 0.12);
      const d = rand(340, 520);
      const x = px + Math.cos(ang) * d;
      const y = py + Math.sin(ang) * d;
      if (x < 80 || y < 80 || x > this.worldSize.w - 80 || y > this.worldSize.h - 80) continue;
      if (this.spawnBlocked(x, y)) continue;
      const child = this.spawn(species, x, y, {
        swarm: true,
        threatM,
        mult: {
          hp: (1 + 0.4 * threatM) * 0.7,
          dmg: (1 + 0.16 * threatM) * 0.85,
          speed: Math.min(1.35, Math.min(1.5, 1 + 0.02 * threatM) + 0.08),
        },
      });
      if (child) n++;
    }
    if (n > 0) this.onSwarm?.(label, n, tint);
  }

  /** Dawn: night/assault raiders peel off (legacy leaving). */
  retreatRaiders() {
    for (const a of this.animals) {
      if (a.dead) continue;
      if (a.raider || a.assault) {
        a.leaving = true;
        a.raider = false;
        a.assault = false;
        a.state = 'wander';
      }
    }
  }

  /** Pick a spawn outside the base (and preferably free of solids). */
  findEnemySpawn(px: number, py: number, minD: number, maxD: number, _r = 20): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 40; attempt++) {
      const ang = Math.random() * TAU;
      const d = rand(minD, maxD);
      const x = px + Math.cos(ang) * d;
      const y = py + Math.sin(ang) * d;
      if (x < 120 || y < 120 || x > this.worldSize.w - 120 || y > this.worldSize.h - 120) continue;
      if (this.spawnBlocked(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  spawnRaidWave(count: number, threatM: number, dayNumber = 1) {
    const cx = this.worldCenter.x;
    const cy = this.worldCenter.y;
    for (let i = 0; i < count; i++) {
      const spot = this.findEnemySpawn(cx, cy, 900, 1200, 24);
      if (!spot) continue;
      const n = dayNumber;
      const wBoar = 1;
      const wWolf = n >= 2 ? 0.9 : 0;
      const wBear = n >= 3 ? Math.min(0.6, 0.12 * n) : 0;
      let roll = Math.random() * (wBoar + wWolf + wBear);
      let sp: SpeciesId = 'boar';
      if ((roll -= wBoar) >= 0) sp = (roll -= wWolf) < 0 ? 'wolf' : 'bear';
      if (sp === 'boar' && n >= 3 && Math.random() < 0.12) sp = 'dire_boar';
      if (sp === 'wolf' && n >= 4 && Math.random() < 0.14) sp = 'dire_wolf';
      if (sp === 'bear' && n >= 5 && Math.random() < 0.18) sp = 'dire_bear';
      this.spawn(sp, spot.x, spot.y, { raider: true, threatM });
    }
  }

  private hurtPlayer(player: RunPlayer, a: AnimalEntity, amount: number) {
    if (!player.alive || player.invuln > 0) return;
    let dealt = amount * (1 - clamp(player.armor, 0, 0.65));
    if (a.element && player.elementResist[a.element]) {
      dealt *= Math.max(0.25, 1 - (player.elementResist[a.element] || 0));
    }
    player.hp -= dealt;
    player.invuln = 0.35;
    Audio.playSfx('hurt');
    this.onPlayerHurt?.();
    this.combat?.onFloatText?.(
      player.x + rand(-12, 12),
      player.y - 50,
      `-${Math.max(1, Math.round(dealt))}`,
      '#ff5a5f',
      20,
      { life: 0.9, vx: rand(-20, 20) },
    );
    // Legacy Player.damage → ps.thorns flat reflect on nearby beasts.
    if ((player.thorns || 0) > 0) this.combat?.applyThorns(player);
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      Audio.playSfx('death');
    }
  }

  private hitStructure(a: AnimalEntity) {
    const camp = this.camp;
    if (!camp || camp.hp <= 0) return;
    if (a.blockWall && a.blockWall.alive) {
      camp.damageWall(a.blockWall, a.dmg);
      return;
    }
    // Cabin core (legacy CampCore at y - 40).
    if (dist2(a.x, a.y, camp.x, camp.y - 40) < (a.radius + 44 + 24) ** 2) {
      camp.damage(a.dmg);
    }
  }

  damageAnimal(
    a: AnimalEntity,
    amount: number,
    player: RunPlayer,
    pickups: Pickup[],
    pools: FirePool[],
    ctx: KillContext,
    lootMult = 1,
  ): boolean {
    if (a.dead) return false;
    a.hp -= amount;
    a.hitCd = 0.15;
    a.flash = 0.12;
    if (a.hp > 0) return false;
    this.killAnimal(a, player, pickups, pools, ctx, lootMult);
    return true;
  }

  killAnimal(
    a: AnimalEntity,
    player: RunPlayer,
    pickups: Pickup[],
    pools: FirePool[],
    ctx: KillContext,
    lootMult = 1,
  ) {
    if (a.dead) return;
    a.dead = true;
    player.kills++;
    if (a.boss) player.bosses++;
    if (!this.combat?.nuking) {
      Audio.playSfx(a.boss ? 'roar' : 'boarDie');
      // Legacy onAnimalKilled shake — routed through Combat so Options shakeScale applies.
      this.combat?.onShake?.(a.boss ? 0.7 : a.big || isBearish(a.species) ? 0.4 : 0.26);
    }
    const sp = SPECIES[a.species];
    const stars = a.stars || 0;
    const tm = ctx.threatM || 0;
    // Legacy onAnimalKilled: animal lootMult × player greed (ps.lootMult).
    const playerLoot = 1 + 0.18 * (this.combat?.arsenal.passives.greed || 0);
    const lootM = (a.lootMult || 1 + stars * STAR_LOOT) * playerLoot * lootMult;
    const threatLoot = 1 + tm * 0.14;
    const threatXp = 1 + tm * 0.12;
    const fromSplit = !!(a.fromSplit || ctx.fromSplit);

    if (this.combat) {
      // Meat
      let meat =
        (a.boss ? 4 : 0) +
        (a.big ? 2 : 0) +
        sp.meat[0] +
        Math.floor(Math.random() * (sp.meat[1] - sp.meat[0] + 1));
      meat = Math.round(meat * lootM * threatLoot);
      if (stars >= 3) meat += Math.min(10, stars - 2);
      if (fromSplit) meat = Math.max(0, Math.floor(meat * 0.35));
      if (meat > 0) this.combat.spawnPickup('meat', a.x, a.y, meat);

      // Gold
      const goldChance = Math.min(
        1,
        (a.boss ? 1 : sp.goldChance) * (1 + stars * 0.1) * (1 + tm * 0.05),
      );
      let gold = Math.random() < goldChance ? sp.gold : 0;
      if (a.big) gold += 2;
      if (a.boss) gold += 6 + ctx.dayNumber;
      if (a.raider || a.assault) gold += 1;
      if (gold > 0) {
        gold = Math.round(gold * lootM * threatLoot);
        gold += Math.floor(stars * 0.55) + Math.floor(tm * 0.35);
        if (fromSplit) gold = Math.max(0, Math.floor(gold * 0.35));
        if (gold > 0) this.combat.spawnPickup('gold', a.x, a.y, Math.max(1, gold));
      }

      // XP (greed already in playerLoot; gear xpGain applied on collect)
      let xp = Math.round(
        sp.xp *
          (a.big ? 2.3 : 1) *
          (a.boss ? 8 : 1) *
          (a.swarm ? 0.7 : 1) *
          (a.xpMult || 1) *
          threatXp *
          (a.element ? 1.15 : 1) *
          (a.trueBoss ? 1.35 : 1) *
          playerLoot,
      );
      if (fromSplit) xp = Math.max(1, Math.round(xp * 0.4));
      this.combat.spawnPickup('xp', a.x, a.y, Math.max(1, xp));

      if (!fromSplit) this.combat.rollPowerupDrop(a);
    }
    // Variant death effects (skip during screen nukes so clears stay clean).
    if (!this.combat?.nuking) {
      if (a.variant === 'necromantic' && !fromSplit) {
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * TAU + rand(-0.25, 0.25);
          let x = a.x + Math.cos(ang) * rand(26, 52);
          let y = a.y + Math.sin(ang) * rand(26, 52);
          x = clamp(x, 80, this.worldSize.w - 80);
          y = clamp(y, 80, this.worldSize.h - 80);
          if (this.spawnBlocked(x, y)) {
            const far = this.findEnemySpawn(a.x, a.y, 40, 90, 20);
            if (!far) continue;
            x = far.x;
            y = far.y;
          }
          this.spawn(a.species, x, y, {
            threatM: 0.2,
            fromSplit: true,
            variant: 'basic',
            stars: Math.max(0, Math.floor((a.stars || 0) * 0.3)),
            element: null,
            raider: !!(a.raider || a.assault),
            assault: !!a.assault,
            swarm: !!a.swarm,
          });
        }
      }
      if (a.variant === 'demonic') {
        pools.push({ x: a.x, y: a.y, r: 48, dmg: 8, life: 4, dead: false });
      }
    }
    if (!fromSplit) this.tryDayBossFromKill(a, ctx);
    a.sprite.setVisible(false);
  }

  fireShot(a: AnimalEntity, px: number, py: number) {
    const layer = this.fxLayer || this.layer;
    const sp = SPECIES[a.species];
    const bodyOff = (sp?.bodyOff || 10) * a.scale;
    const ox = a.x;
    const oy = a.y - bodyOff * 0.45;
    const baseAng = Math.atan2(py - oy, px - ox);
    const count = Math.max(1, a.shotCount);
    const kind = a.shotKind || 'bolt';
    const color = a.shotColor || '#4db8ff';
    const spin = a.shotSpin || 0;
    const r = a.shotRadius;
    const size = enemyBoltCanvasSize(r, kind);
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * a.shotSpread;
      const ang = baseAng + spread;
      const sx = ox + Math.cos(ang) * (a.radius * 0.6);
      const sy = oy + Math.sin(ang) * (a.radius * 0.2);
      const vx = Math.cos(ang) * a.shotSpeed;
      const vy = Math.sin(ang) * a.shotSpeed;
      const key = `enemy_shot_${this.shotUid++}`;
      const canvas = new CanvasSprite(this.scene, layer, size, size, key, 0.5, 0.5);
      const rot = Math.random() * TAU;
      canvas.clear();
      canvas.withCenterOrigin((ctx) => drawEnemyBolt(ctx, { kind, color, r, ang, rot }));
      canvas.refresh();
      canvas.setPosition(sx, sy, Math.floor(sy) + 12);
      this.shots.push({
        x: sx,
        y: sy,
        vx,
        vy,
        dmg: a.dmg * 0.85,
        r,
        life: 2.4,
        dead: false,
        kind,
        color,
        spin,
        rot,
        ang,
        hitBuildings: true,
        canvas,
        gfx: canvas.image,
      });
    }
    this.vfx?.sparks(a.x, a.y - bodyOff, 3 + count, color);
    Audio.playSfx(
      'throw',
      kind === 'log' ? 0.7 : kind === 'rock' ? 0.95 : 1.1,
    );
  }

  updateShots(dt: number, player: RunPlayer) {
    const camp = this.camp;
    for (const s of this.shots) {
      if (s.dead) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.spin) {
        s.rot += s.spin * dt;
        s.canvas.clear();
        s.canvas.withCenterOrigin((ctx) =>
          drawEnemyBolt(ctx, {
            kind: s.kind,
            color: s.color,
            r: s.r,
            ang: s.ang,
            rot: s.rot,
          }),
        );
        s.canvas.refresh();
      }
      s.canvas.setPosition(s.x, s.y, Math.floor(s.y) + 12);
      if (s.life <= 0) {
        s.dead = true;
        continue;
      }
      if (player.alive && player.invuln <= 0 && dist2(s.x, s.y, player.x, player.y) < (s.r + 18) ** 2) {
        const dealt = s.dmg * (1 - clamp(player.armor, 0, 0.65));
        player.hp -= dealt;
        player.invuln = 0.35;
        Audio.playSfx('hurt');
        this.onPlayerHurt?.();
        this.combat?.onFloatText?.(
          player.x + rand(-12, 12),
          player.y - 50,
          `-${Math.max(1, Math.round(dealt))}`,
          '#ff5a5f',
          20,
          { life: 0.9, vx: rand(-20, 20) },
        );
        if (player.hp <= 0) {
          player.hp = 0;
          player.alive = false;
          Audio.playSfx('death');
        }
        this.vfx?.sparks(s.x, s.y - 6, 6, s.color);
        s.dead = true;
        continue;
      }
      // Legacy EnemyBolt.hitBuildings — wool / rocks / logs chip walls or the cabin.
      if (s.hitBuildings && camp && camp.hp > 0) {
        const coreX = camp.x;
        const coreY = camp.y - 40;
        const coreR = 36;
        if (dist2(s.x, s.y, coreX, coreY) < (s.r + coreR) ** 2) {
          camp.damage(s.dmg);
          camp.onCampAttack?.();
          this.vfx?.sparks(s.x, s.y, 5, s.color);
          s.dead = true;
          continue;
        }
        for (const w of camp.walls) {
          if (!w.alive) continue;
          const hitR = w.solidR || 48;
          if (dist2(s.x, s.y, w.x, w.y) < (s.r + hitR) ** 2) {
            camp.damageWall(w, s.dmg);
            camp.onCampAttack?.();
            this.vfx?.sparks(s.x, s.y, 5, s.color);
            s.dead = true;
            break;
          }
        }
      }
    }
    compactInPlace(this.shots, (s) => {
      if (s.dead) s.canvas.destroy();
      return s.dead;
    });
  }

  update(
    dt: number,
    player: RunPlayer,
    pickups: Pickup[],
    pools: FirePool[],
    threatM: number,
    isNight: boolean,
    dayNumber: number,
  ) {
    const ctx: KillContext = { isNight, dayNumber, threatM };

    // Legacy spawn cadence ~1.6s. Hold ambient/swarms while a night raid owns the field.
    const raidActive = !!this.camp?.raidActive;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.6;
      if (player.alive && !raidActive) this.spawnAmbient(player.x, player.y, threatM, isNight, dayNumber);
    }

    this.swarmTimer -= dt;
    if (this.swarmTimer <= 0 && player.alive && !raidActive) {
      this.swarmTimer = rand(38, 70) - Math.min(18, dayNumber * 2);
      this.spawnSwarm(player.x, player.y, threatM, dayNumber);
    }

    const px = player.x;
    const py = player.y;
    const camp = this.camp;
    const coreX = camp?.x ?? this.worldCenter.x;
    const coreY = (camp?.y ?? this.worldCenter.y) - 40;
    const siegeOk = !!(camp && camp.hp > 0);
    const view = cameraWorldBounds(this.scene.cameras.main, 220);

    for (const a of this.animals) {
      if (a.dead) continue;
      a.hitCd = Math.max(0, a.hitCd - dt);
      a.cd = Math.max(0, a.cd - dt);
      a.attackCd = Math.max(0, a.attackCd - dt);
      a.abilityCd = Math.max(0, a.abilityCd - dt);
      if (a.inspireT > 0) {
        a.inspireT = Math.max(0, a.inspireT - dt);
        if (a.inspireT <= 0) a.inspireMul = 1;
      }
      for (const id of Object.keys(a.bossMoveCd)) {
        if (a.bossMoveCd[id] > 0) a.bossMoveCd[id] = Math.max(0, a.bossMoveCd[id] - dt);
      }

      if (a.burns.length) {
        let burnDmg = 0;
        for (let i = a.burns.length - 1; i >= 0; i--) {
          const b = a.burns[i];
          b.life -= dt;
          burnDmg += b.dps * dt;
          if (b.life <= 0) a.burns.splice(i, 1);
        }
        if (burnDmg > 0) {
          a.hp -= burnDmg;
          if (a.hp <= 0) {
            this.killAnimal(a, player, pickups, pools, ctx);
            continue;
          }
        }
      }
      if (a.slowT > 0) {
        a.slowT -= dt;
        if (a.slowT <= 0) a.slow = 0;
      }
      const moveMult = 1 - clamp(a.slow, 0, 0.7);
      const sp = SPECIES[a.species];

      // Leaving after dawn — flee map edge then despawn.
      if (a.leaving) {
        const ang = Math.atan2(a.y - this.worldCenter.y, a.x - this.worldCenter.x);
        a.x += Math.cos(ang) * a.speed * 1.1 * moveMult * dt;
        a.y += Math.sin(ang) * a.speed * 1.1 * moveMult * dt;
        a.moving = true;
        a.walkTime += dt * 8;
        if (
          a.x < 40 ||
          a.y < 40 ||
          a.x > this.worldSize.w - 40 ||
          a.y > this.worldSize.h - 40 ||
          dist2(a.x, a.y, this.worldCenter.x, this.worldCenter.y) > 1600 * 1600
        ) {
          a.dead = true;
          a.sprite.setVisible(false);
          continue;
        }
        this.redrawAnimal(a);
        a.canvas?.setPosition(a.x, a.y, a.y);
        continue;
      }

      const d2 = dist2(a.x, a.y, px, py);
      const dist = Math.sqrt(d2) || 0.001;
      const cdx = coreX - a.x;
      const cdy = coreY - a.y;
      const cd = Math.hypot(cdx, cdy) || 0.001;
      const nightMul = isNight ? 1.35 : 1;
      const baseAggro = Math.max(80, a.aggro);
      const aggroR = baseAggro * nightMul;
      let engageR = aggroR;
      if (a.swarm) engageR = 1e9;
      else if (a.trueBoss) engageR = Math.max(920, aggroR);
      else if (a.dayBoss || a.boss) engageR = Math.max(720, aggroR);

      const canSiege = siegeOk && !a.swarm;
      const playerLive = player.alive;
      const playerInAggro = playerLive && dist < aggroR;
      const baseInAggro =
        canSiege && cd < aggroR * (a.dayBoss || a.raider || a.boss || a.assault ? 1.6 : 1.2);
      const preferPlayer = playerInAggro && (!baseInAggro || dist <= cd * 0.92);

      if (a.state === 'wander') {
        a.stateT -= dt;
        a.x += Math.cos(a.wanderAngle) * sp.wander * moveMult * dt;
        a.y += Math.sin(a.wanderAngle) * sp.wander * moveMult * dt;
        if (a.stateT <= 0) {
          a.wanderAngle = rand(0, TAU);
          a.stateT = rand(1.5, 3.5);
        }
        if (preferPlayer) {
          a.state = 'chase';
          if (dist < 520) {
            Audio.playSfx(isWolfish(a.species) ? 'growl' : isBearish(a.species) ? 'roar' : 'grunt');
          }
        } else if (baseInAggro || a.raider || a.assault || a.dayBoss) a.state = 'march';
      } else if (a.state === 'march') {
        if (preferPlayer && dist < engageR) {
          a.state = 'chase';
        } else if (!canSiege) {
          a.state = playerInAggro ? 'chase' : 'wander';
        } else {
          const wall = a.blockWall && a.blockWall.alive ? a.blockWall : null;
          const tx = wall ? wall.x - a.x : cdx;
          const ty = wall ? wall.y - a.y : cdy;
          const td = Math.hypot(tx, ty) || 1;
          const marchSpd = a.speed * (a.dayBoss ? 0.92 : 0.8) * moveMult;
          a.x += (tx / td) * marchSpd * dt;
          a.y += (ty / td) * marchSpd * dt;
          const reach = a.radius + (wall ? wall.solidR : 44) + 14;
          if (td < reach && a.attackCd <= 0) {
            a.state = 'windup';
            a.stateT = sp.windup;
            a.strikeStructure = true;
          }
        }
      } else if (a.state === 'ability') {
        const dx = px - a.x;
        const dy = py - a.y;
        const [tvx, tvy] = updateAnimalAbility(
          a,
          dt,
          player,
          this.animals,
          this.hazards,
          this.abilityBolts,
          this.scene,
          this.fxLayer || this.layer,
          this.vfx || this.combat?.vfx || null,
          this.onPlayerHurt,
          (x, y, msg, color, size) => this.combat?.onFloatText?.(x, y, msg, color, size),
        );
        a.x += tvx * moveMult * dt;
        a.y += tvy * moveMult * dt;
        if (Math.abs(dx) > 4) a.facing = dx < 0 ? -1 : 1;
      } else if (a.state === 'recover') {
        a.stateT -= dt;
        if (a.stateT <= 0) {
          if (preferPlayer && dist < engageR) a.state = 'chase';
          else if (baseInAggro || a.raider || a.assault || a.dayBoss || a.boss) a.state = 'march';
          else a.state = dist < aggroR ? 'chase' : 'wander';
        }
      } else if (a.state === 'chase') {
        if (!playerLive || dist > engageR + 180) {
          if (baseInAggro || a.raider || a.assault || a.dayBoss || a.boss) a.state = 'march';
          else {
            a.state = 'wander';
            a.stateT = rand(0.5, 1.5);
          }
        } else if (canSiege && baseInAggro && cd + 40 < dist && dist > 160) {
          a.state = 'march';
        } else if (a.blockWall && a.blockWall.alive && a.attackCd <= 0) {
          a.state = 'windup';
          a.stateT = sp.windup;
          a.strikeStructure = true;
        } else if (
          tryStartAnimalAbility(a, player, px - a.x, py - a.y, dist, this.hazards)
        ) {
          // Ability begun — state set inside tryStart.
        } else {
          const dx = px - a.x;
          const dy = py - a.y;
          const inv = 1 / dist;
          if (a.ranged && dist < a.preferRange) {
            a.x -= dx * inv * a.speed * 0.55 * moveMult * dt;
            a.y -= dy * inv * a.speed * 0.55 * moveMult * dt;
          } else {
            a.x += dx * inv * a.speed * moveMult * dt;
            a.y += dy * inv * a.speed * moveMult * dt;
          }
          if (a.ranged && dist < a.shotRange && a.attackCd <= 0 && dist > a.preferRange * 0.5) {
            a.state = 'shoot';
            a.stateT = sp.windup * 0.85;
            a.strikeStructure = false;
            Audio.playSfx('grunt');
          } else if (!a.ranged && dist < a.radius + 22 && a.attackCd <= 0) {
            a.state = 'windup';
            a.stateT = sp.windup;
            a.strikeStructure = false;
            Audio.playSfx(isBearish(a.species) ? 'roar' : 'grunt');
          }
        }
      } else if (a.state === 'shoot') {
        a.stateT -= dt;
        if (a.stateT <= 0) {
          this.fireShot(a, px, py);
          a.state = 'cooldown';
          a.cd = sp.cooldown;
          a.attackCd = sp.cooldown;
        }
      } else if (a.state === 'windup') {
        a.stateT -= dt;
        if (a.stateT <= 0) {
          if (a.strikeStructure) {
            this.hitStructure(a);
            a.strikeStructure = false;
            a.state = 'cooldown';
            a.cd = sp.cooldown;
            a.attackCd = sp.cooldown;
          } else {
            a.state = 'lunge';
            a.stateT = sp.lungeTime;
            const inv = 1 / dist;
            a.vx = (px - a.x) * inv * sp.lungeSpeed;
            a.vy = (py - a.y) * inv * sp.lungeSpeed;
          }
        }
      } else if (a.state === 'lunge') {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.stateT -= dt;
        if (dist < a.radius + 18) {
          this.hurtPlayer(player, a, animalEffectiveDamage(a));
          a.state = 'cooldown';
          a.cd = sp.cooldown;
          a.attackCd = sp.cooldown;
          a.vx = a.vy = 0;
        } else if (a.stateT <= 0) {
          a.state = 'cooldown';
          a.cd = sp.cooldown * 0.5;
          a.attackCd = sp.cooldown * 0.5;
          a.vx = a.vy = 0;
        }
      } else if (a.state === 'cooldown') {
        if (a.cd <= 0) {
          if (preferPlayer && dist < engageR) a.state = 'chase';
          else if (baseInAggro || a.raider || a.assault || a.dayBoss || a.boss) a.state = 'march';
          else a.state = dist < aggroR ? 'chase' : 'wander';
        }
      }

      if (a.state === 'wander') {
        a.facing = Math.cos(a.wanderAngle) < 0 ? -1 : 1;
      } else if (a.state === 'march') {
        const faceDx = (a.blockWall?.alive ? a.blockWall.x : coreX) - a.x;
        if (Math.abs(faceDx) > 4) a.facing = faceDx < 0 ? -1 : 1;
      } else {
        const faceDx = px - a.x;
        if (Math.abs(faceDx) > 4) a.facing = faceDx < 0 ? -1 : 1;
      }
      a.moving =
        a.state === 'chase' ||
        a.state === 'lunge' ||
        a.state === 'wander' ||
        a.state === 'march' ||
        a.state === 'ability';
      if (a.moving) {
        a.walkTime += dt * (a.state === 'lunge' ? 14 : a.state === 'chase' || a.state === 'march' ? 10 : 5);
      }
      if (a.flash > 0) a.flash = Math.max(0, a.flash - dt);

      // Skip canvas uploads + bars when far off-camera (AI still runs).
      const onScreen = a.x >= view.x0 && a.x <= view.x1 && a.y >= view.y0 && a.y <= view.y1;
      if (!onScreen) {
        a.sprite.setVisible(false);
        if (a.bar) a.bar.setVisible(false);
        continue;
      }

      this.redrawAnimal(a);
      a.sprite.setVisible(true);
      a.canvas?.setPosition(a.x, a.y, a.y);

      // Legacy: true bosses use the screen HP bar only.
      if (a.trueBoss) {
        if (a.bar) {
          a.bar.clear();
          a.bar.setVisible(false);
        }
        continue;
      }
      // Legacy: barY = y - height - (boss ? 14 : 8); height is already scaled on the entity in legacy.
      const headH = (sp.height || 40) * a.scale;
      const barY = a.y - headH - (a.boss ? 14 : 8);
      const showBar =
        a.hp < a.maxHp ||
        a.boss ||
        a.raider ||
        a.assault ||
        a.stars > 0 ||
        a.variant !== 'basic' ||
        !!a.element;
      if (showBar) {
        if (!a.bar) {
          a.bar = this.scene.add.graphics();
          this.layer.add(a.bar);
        }
        a.bar.setVisible(true).setDepth(a.y + 0.5);
        a.bar.clear();
        const w = a.boss ? 90 : Math.max(a.swarm ? 16 : 26, a.radius * 1.8);
        a.bar.fillStyle(0x140c08, 0.8);
        a.bar.fillRoundedRect(a.x - w / 2 - 1, barY - 1, w + 2, 7, 3);
        const frac = clamp(a.hp / a.maxHp, 0, 1);
        const vDef = ANIMAL_VARIANTS[a.variant as keyof typeof ANIMAL_VARIANTS];
        let col = a.boss
          ? 0xc46bff
          : a.raider || a.assault
            ? 0xff4d4d
            : frac > 0.5
              ? 0x6dd46a
              : 0xff6a3d;
        if (a.element && ELEMENTS[a.element] && !a.boss && !(a.raider || a.assault)) {
          col = Phaser.Display.Color.HexStringToColor(ELEMENTS[a.element].color).color;
        } else if (vDef?.bar && a.variant !== 'basic' && !a.boss) {
          col = Phaser.Display.Color.HexStringToColor(vDef.bar).color;
        }
        a.bar.fillStyle(col, 1);
        a.bar.fillRoundedRect(a.x - w / 2, barY, Math.max(2, w * frac), 4, 2);
        // Veterancy stars above the bar.
        const info = starTierInfo(a.stars);
        if (info.count && info.fill) {
          const gap = 7;
          const start = a.x - ((info.count - 1) * gap) / 2;
          const sy = barY - 7;
          const fill = Phaser.Display.Color.HexStringToColor(info.fill).color;
          const stroke = Phaser.Display.Color.HexStringToColor(info.stroke || '#000').color;
          for (let i = 0; i < info.count; i++) {
            const sx = start + i * gap;
            a.bar.fillStyle(fill, 1);
            a.bar.lineStyle(0.7, stroke, 1);
            a.bar.beginPath();
            for (let p = 0; p < 10; p++) {
              const ang = -Math.PI / 2 + (p * Math.PI) / 5;
              const rr = p % 2 === 0 ? 3.3 : 1.4;
              const px2 = sx + Math.cos(ang) * rr;
              const py2 = sy + Math.sin(ang) * rr;
              if (p === 0) a.bar.moveTo(px2, py2);
              else a.bar.lineTo(px2, py2);
            }
            a.bar.closePath();
            a.bar.fillPath();
            a.bar.strokePath();
          }
        }
        if (a.variant && a.variant !== 'basic') {
          // Tiny glyph via fill circle / triangle approximation.
          const markY = barY - (a.stars > 0 ? 14 : 7);
          const vcol = Phaser.Display.Color.HexStringToColor(vDef?.bar || '#fff').color;
          a.bar.fillStyle(vcol, 1);
          if (a.variant === 'demonic') {
            a.bar.fillTriangle(a.x, markY - 4, a.x + 3.5, markY + 3, a.x - 3.5, markY + 3);
          } else if (a.variant === 'necromantic') {
            a.bar.lineStyle(1.4, vcol, 1);
            a.bar.lineBetween(a.x - 3, markY - 3, a.x + 3, markY + 3);
            a.bar.lineBetween(a.x + 3, markY - 3, a.x - 3, markY + 3);
          } else {
            a.bar.fillCircle(a.x, markY, 2.5);
          }
        }
      } else if (a.bar) {
        a.bar.clear();
        a.bar.setVisible(false);
      }
    }

    this.updateShots(dt, player);

    updateHazards(
      this.hazards,
      dt,
      player,
      this.onPlayerHurt,
      (x, y, msg, color, size) => this.combat?.onFloatText?.(x, y, msg, color, size),
      this.vfx || this.combat?.vfx || null,
    );

    for (const b of this.abilityBolts) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.gfx.setPosition(b.x, b.y).setDepth(Math.floor(b.y) + 12);
      if (b.life <= 0) b.dead = true;
      if (player.alive && player.invuln <= 0 && dist2(b.x, b.y, player.x, player.y) < (b.r + 14) ** 2) {
        const dealt = b.dmg * (1 - clamp(player.armor, 0, 0.65));
        player.hp -= dealt;
        player.invuln = 0.35;
        Audio.playSfx('hurt');
        this.onPlayerHurt?.();
        this.combat?.onFloatText?.(
          player.x + rand(-12, 12),
          player.y - 50,
          `-${Math.max(1, Math.round(dealt))}`,
          '#ff5a5f',
          20,
          { life: 0.9, vx: rand(-20, 20) },
        );
        if (player.hp <= 0) {
          player.hp = 0;
          player.alive = false;
          Audio.playSfx('death');
        }
        b.dead = true;
      }
    }
    compactInPlace(this.abilityBolts, (b) => {
      if (b.dead) {
        if (b.canvas) b.canvas.destroy();
        else b.gfx.destroy();
      }
      return b.dead;
    });

    this.drawGroundMarkers();

    if (!this.abilityGfx) {
      this.abilityGfx = this.scene.add.graphics().setDepth(5);
      this.layer.add(this.abilityGfx);
    }
    drawAbilityOverlays(this.abilityGfx, this.animals, this.hazards);

    compactInPlace(this.animals, (a) => {
      if (a.dead) {
        if (a.canvas) a.canvas.destroy();
        else a.sprite.destroy();
        a.bar?.destroy();
        return true;
      }
      return false;
    });
  }

  queryNear(x: number, y: number, r: number, out: AnimalEntity[] = []) {
    out.length = 0;
    for (const a of this.animals) {
      if (a.dead) continue;
      if (dist2(x, y, a.x, a.y) <= (r + a.radius) * (r + a.radius)) out.push(a);
    }
    return out;
  }

  nearest(x: number, y: number, maxR: number): AnimalEntity | null {
    let best: AnimalEntity | null = null;
    let bestD = maxR * maxR;
    for (const a of this.animals) {
      if (a.dead) continue;
      const d = dist2(x, y, a.x, a.y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }
}
