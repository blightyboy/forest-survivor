import Phaser from 'phaser';
import { HIT_COOLDOWN, MAX_PICKUPS, xpNeeded, elementMult, POWERUPS, ELEMENTS } from '../data/constants';
import type { KillContext, AnimalEntity } from './AnimalSystem';
import { applyBuffMultipliers } from './PlayerStats';
import { gearBonuses } from '../data/shop';
import type { MetaBonuses } from '../meta/Meta';
import { dist2, TAU, clamp, compactInPlace, rand, lerp } from '../core/math';
import type { World, StaticEntity } from '../world/World';
import type { ArsenalSystem } from './ArsenalSystem';
import type { AnimalSystem } from './AnimalSystem';
import type { RunPlayer, Pickup, FirePool } from '../run/RunTypes';
import { gainResource } from '../run/RunTypes';
import type { ElementId } from '../data/constants';
import { WEAPON_DEFS, type WeaponId } from '../data/weapons';
import { Audio } from '../audio/Audio';
import { CanvasSprite } from '../art/draw/CanvasSprite';
import { drawAxeHead, drawHammer, drawPikeThrust, drawUniqueGlow } from '../art/draw/weaponDraw';

type Proj = {
  x: number; y: number; vx: number; vy: number;
  dmg: number; pierce: number; life: number;
  r: number; element: ElementId | null; dead: boolean;
  gfx: Phaser.GameObjects.Image;
  boomerang?: boolean;
  returning?: boolean;
  travel?: number;
  maxDist?: number;
  dirX?: number;
  dirY?: number;
  hitSet?: Set<number>;
};

type FallingHammer = {
  x: number; y: number; z: number;
  dmg: number; radius: number;
  spin: number; age: number;
  hit: boolean; dead: boolean;
  element: ElementId | null;
  gfx: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  canvas?: CanvasSprite;
};

/** Legacy `Pike` — traveling thrust with shaft hitbox. */
type PikeThrust = {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  dmg: number;
  len: number;
  pierce: number;
  life: number;
  dead: boolean;
  element: ElementId | null;
  hit: Set<number>;
  canvas: CanvasSprite;
};

/** Legacy Dynamite — lobbed in an arc, explodes on landing for AoE. */
type DynamiteStick = {
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  z: number;
  t: number;
  dur: number;
  spin: number;
  dmg: number;
  radius: number;
  element: ElementId | null;
  dead: boolean;
  gfx: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
};

export class CombatSystem {
  pickups: Pickup[] = [];
  pools: FirePool[] = [];
  axeAngle = 0;
  axeSprites: Phaser.GameObjects.Image[] = [];
  axeCanvas: CanvasSprite[] = [];
  private axeUid = 0;
  /** Last unique flag baked into orbiting axe canvases. */
  private axeDrawnUnique = false;
  auraSprite: Phaser.GameObjects.Image | null = null;
  spikesSprite: Phaser.GameObjects.Image | null = null;
  dogSprite: Phaser.GameObjects.Image | null = null;
  weaponTimers: Record<string, number> = {};
  /** Per-(source, target) hit cooldowns — legacy HIT_COOLDOWN uses game time, not frame ticks. */
  hitCdStatic = new Map<string, number>();
  hitCdAnimal = new Map<string, number>();
  projectiles: Proj[] = [];
  hammers: FallingHammer[] = [];
  dynamites: DynamiteStick[] = [];
  pikes: PikeThrust[] = [];
  dog: { x: number; y: number; life: number; cd: number; spawnCd: number } | null = null;
  private _near: AnimalEntity[] = [];
  killCtx: KillContext = { isNight: false, dayNumber: 1, threatM: 0 };
  private metaBonuses: MetaBonuses = {} as MetaBonuses;
  nuking = false;
  /** Last player passed to update / powerups — used when auto-granting overflow pickups. */
  private grantPlayer: RunPlayer | null = null;
  vfx: import('./FxSystem').FxSystem | null = null;
  /** Optional floating combat text (legacy addText). */
  onFloatText?: (
    x: number,
    y: number,
    msg: string,
    color?: string,
    size?: number,
    opts?: { life?: number; vx?: number; vy?: number },
  ) => void;
  /** Legacy addShake — wired from RunScene. */
  onShake?: (intensity: number) => void;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Container,
    private fx: Phaser.GameObjects.Container,
    public world: World,
    public arsenal: ArsenalSystem,
    public animals: AnimalSystem,
    private onLevelUp: () => void,
    metaBonuses: MetaBonuses,
  ) {
    this.metaBonuses = metaBonuses;
  }

  setKillContext(ctx: KillContext) {
    this.killCtx = ctx;
  }

  clear() {
    this.pickups.length = 0;
    for (const pr of this.projectiles) pr.gfx.destroy();
    this.projectiles.length = 0;
    for (const h of this.hammers) {
      if (h.canvas) h.canvas.destroy();
      else h.gfx.destroy();
      h.shadow.destroy();
    }
    this.hammers.length = 0;
    for (const d of this.dynamites) {
      d.gfx.destroy();
      d.shadow.destroy();
    }
    this.dynamites.length = 0;
    for (const pk of this.pikes) pk.canvas.destroy();
    this.pikes.length = 0;
    for (const a of this.axeCanvas) a.destroy();
    this.axeCanvas.length = 0;
    this.axeSprites.length = 0;
    this.auraSprite?.destroy();
    this.auraSprite = null;
    this.spikesSprite?.destroy();
    this.spikesSprite = null;
    this.dogSprite?.destroy();
    this.dogSprite = null;
    this.pools.length = 0;
    this.dog = null;
    this.weaponTimers = {};
    this.hitCdAnimal.clear();
    this.hitCdStatic.clear();
  }

  /**
   * Legacy spawnOrStack — merge into a nearby same-type pickup when possible,
   * otherwise spawn a new hop with outward velocity.
   */
  spawnPickup(kind: Pickup['kind'], x: number, y: number, amount: number, powerupId?: string) {
    const value = Math.max(1, Math.round(amount));
    if (kind !== 'powerup') {
      const STACK_R2 = 78 * 78;
      for (const pk of this.pickups) {
        if (pk.dead || pk.kind !== kind) continue;
        if (dist2(pk.x, pk.y, x, y) > STACK_R2) continue;
        pk.amount = (pk.amount || 1) + value;
        pk.age = Math.min(pk.age, 1.2);
        pk.z = Math.max(pk.z, 6);
        pk.vz = Math.max(pk.vz, 140);
        return;
      }
    }
    this.ensurePickupSlot();
    const a = Math.random() * TAU;
    const sp = kind === 'powerup' ? rand(80, 170) : rand(55, 140);
    this.pickups.push({
      kind,
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      amount: value,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.7,
      z: 2,
      vz: rand(170, 270),
      age: 0,
      rot: rand(-0.5, 0.5),
      phase: Math.random() * TAU,
      speed: 0,
      dead: false,
      powerupId,
    });
  }

  /** Legacy ensurePickupSlot — when full, merge oldest or auto-grant to the player. */
  private ensurePickupSlot() {
    if (this.pickups.length < MAX_PICKUPS) return;
    const old = this.pickups.shift();
    if (!old || old.dead) return;
    if (old.kind !== 'powerup') {
      for (const pk of this.pickups) {
        if (pk.dead || pk.kind !== old.kind) continue;
        pk.amount = (pk.amount || 1) + (old.amount || 1);
        return;
      }
    }
    // Cap overflow — grant into inventory (never destroy loot).
    this.grantPickupDirect(old);
    old.dead = true;
  }

  /** Apply a pickup's value without spatial collection (overflow / instant grant). */
  private grantPickupDirect(p: Pickup) {
    const player = this.grantPlayer;
    if (!player || p.kind === 'powerup') return;
    if (p.kind === 'xp') this.grantXp(player, p.amount);
    else if (p.kind === 'gold' || p.kind === 'wood' || p.kind === 'meat') {
      gainResource(player, p.kind, p.amount);
    }
  }

  private noteTreeKill(player: RunPlayer | null | undefined) {
    if (player) player.treesChopped++;
  }

  /** Legacy Game.rollPowerupDrop — chance rises with stars / bosses. */
  rollPowerupDrop(a: AnimalEntity) {
    if (this.nuking) return;
    let chance = 0.07;
    if (a.boss || a.trueBoss) chance = 0.55;
    else if (a.swarm) chance = 0.018;
    else if (a.big || a.raider || a.assault) chance = 0.14;
    chance += Math.min(0.35, (a.stars || 0) * 0.018);
    if (Math.random() > chance) return;
    let total = 0;
    for (const id in POWERUPS) total += POWERUPS[id].weight;
    let r = Math.random() * total;
    let pick = 'haste';
    for (const id in POWERUPS) {
      r -= POWERUPS[id].weight;
      if (r <= 0) {
        pick = id;
        break;
      }
    }
    this.spawnPickup('powerup', a.x + rand(-4, 4), a.y + rand(-4, 4), 1, pick);
  }

  onPowerupBanner?: (title: string, sub: string, color: string) => void;

  activatePowerup(type: string, player: RunPlayer) {
    this.grantPlayer = player;
    const def = POWERUPS[type];
    if (!def) return;
    this.vfx?.ring(player.x, player.y, def.color, 18, 220, 0.55);
    this.vfx?.sparkle(player.x, player.y, def.color);
    this.onFloatText?.(player.x, player.y - 70, `${def.label}!`, def.color, 22, { life: 1.3, vy: -40 });
    Audio.playSfx('upgrade', 1.2);
    if (type === 'magnet') {
      this.vacuumPickups(player);
      this.onPowerupBanner?.(def.name, def.desc, def.color);
      return;
    }
    if (type === 'nuke') {
      this.triggerNuke(player);
      this.onPowerupBanner?.('Cataclysm!', 'Forest and beasts scoured — loot rushes in. Bosses endure.', '#ffe066');
      return;
    }
    if (type === 'fury') player.buffFury = Math.max(player.buffFury, def.duration);
    else if (type === 'vital') player.buffVital = Math.max(player.buffVital, def.duration);
    else if (type === 'haste') player.buffHaste = Math.max(player.buffHaste, def.duration);
    this.refreshBuffStats(player);
    this.onPowerupBanner?.(def.name, `${def.desc} · ${def.duration}s`, def.color);
  }

  vacuumPickups(player: RunPlayer, style?: { ring?: string; label?: string }) {
    this.grantPlayer = player;
    const ring = style?.ring || 'rgba(255,107,107,0.9)';
    const label = style?.label || '#ff6b6b';
    let n = 0;
    for (const p of this.pickups) {
      if (p.dead || p.kind === 'powerup') continue;
      p.magnet = true;
      p.speed = 2200;
      p.age = Math.max(p.age, 0.35);
      n++;
    }
    this.vfx?.ring(player.x, player.y, ring, 40, 520, 0.7);
    if (n) {
      this.onFloatText?.(player.x, player.y - 90, `${n} drops inbound`, label, 16, { life: 1.1 });
    }
  }

  /** Wipe every tree and non-boss beast. Bosses survive. Full loot + vacuum all drops. */
  triggerNuke(player: RunPlayer) {
    this.grantPlayer = player;
    this.nuking = true;
    Audio.playSfx('boom');
    this.onShake?.(1.15);
    // Legacy cataclysm flash — expanding rings + spark burst.
    this.vfx?.ring(player.x, player.y, 'rgba(255,224,102,0.95)', 60, 900, 1.1);
    this.vfx?.ring(player.x, player.y, 'rgba(255,106,61,0.85)', 40, 720, 0.9);
    this.vfx?.sparkle(player.x, player.y, '#ffe066');
    this.vfx?.sparkle(player.x, player.y - 20, '#ff8a3d');

    let beasts = 0;
    let trees = 0;
    // Full loot (do NOT pass fromSplit — that was cutting drops). Bosses endure.
    for (const a of this.animals.animals) {
      if (a.dead || a.boss || a.trueBoss) continue;
      this.animals.damageAnimal(a, a.maxHp + 9999, player, this.pickups, this.pools, this.killCtx);
      beasts++;
    }
    for (const t of this.world.trees) {
      if (!t.isHittable()) continue;
      const res = this.world.damageTree(t, t.maxHp + 9999);
      if (res.killed) {
        this.noteTreeKill(player);
        if (res.wood) this.spawnPickup('wood', t.x, t.y, res.wood);
        trees++;
      }
    }
    this.nuking = false;
    // Pull every resource / XP shard on the map into the player.
    this.vacuumPickups(player, { ring: 'rgba(255,224,102,0.9)', label: '#ffe066' });
    this.onFloatText?.(
      player.x,
      player.y - 96,
      `${trees} trees · ${beasts} beasts`,
      '#ffe066',
      18,
      { life: 1.6, vy: -30 },
    );
  }

  refreshBuffStats(player: RunPlayer) {
    const gear = gearBonuses(player.equipment);
    const lv = (k: string) => this.arsenal.passives[k] || 0;
    const baseRegen =
      (this.metaBonuses.regen || 0) + this.arsenal.passiveRegen() + gear.regen;
    const baseMove =
      1 + (this.metaBonuses.move || 0) + this.arsenal.passiveMoveBonus() + gear.move;
    // Same additive might formula as recomputePlayerStats / legacy computePlayerStats.
    const baseDmg =
      1 +
      0.15 * lv('might') +
      0.12 * lv('devil') -
      0.08 * lv('angel') +
      gear.might +
      (this.metaBonuses.damagePct || 0);
    applyBuffMultipliers(player, baseRegen, baseMove, baseDmg);
  }

  /**
   * Legacy `g.ps.cooldown` — multiply weapon CDs / aura ticks by this (< 1 = faster).
   * `Math.pow(0.93, hasteLv) / (1 + gearHaste)`.
   */
  private cooldownMult(player: RunPlayer) {
    return Math.pow(0.93, this.arsenal.passives.haste || 0) / (1 + (player.gearHaste || 0));
  }

  /** Legacy `g.ps.spin` for orbiting axes. */
  private spinMult(player: RunPlayer) {
    return 1 + 0.08 * (this.arsenal.passives.haste || 0) + (player.gearHaste || 0) * 0.5;
  }

  private areaMult(player: RunPlayer) {
    return this.arsenal.passiveArea() * (1 + (player.gearArea || 0));
  }

  private tickHitCds(dt: number) {
    for (const [k, v] of this.hitCdAnimal) {
      const n = v - dt;
      if (n <= 0) this.hitCdAnimal.delete(k);
      else this.hitCdAnimal.set(k, n);
    }
    for (const [k, v] of this.hitCdStatic) {
      const n = v - dt;
      if (n <= 0) this.hitCdStatic.delete(k);
      else this.hitCdStatic.set(k, n);
    }
  }

  /** Legacy `s.count + g.ps.amount` — Extra Hands adds +1 projectile per level. */
  private projCount(stats: Record<string, number>) {
    return Math.max(1, Math.floor((stats.count as number) || 1) + (this.arsenal.passives.amount || 0));
  }

  calcDamage(base: number, element: ElementId | null, targetElement: ElementId | null, player: RunPlayer) {
    // Legacy hitAnimal: dmg * mightMult + flat (flat is not multiplied).
    const atk = element || player.attackElement || null;
    const crit = Math.random() < player.crit;
    let mult = player.damageMult * (crit ? 2 : 1) * rand(0.9, 1.1);
    if (atk) {
      // elementPower already includes gear + meta elemPct + mastery passives.
      mult *= 1 + (player.elementPower[atk] || 0);
      mult *= elementMult(atk, targetElement);
    }
    const flat = (player.flatDamage || 0) + (atk ? player.elemFlat || 0 : 0);
    const dmg = Math.max(1, base * mult + flat);
    return { dmg, crit };
  }

  /** Legacy thorns: flat no-proc hits on nearby animals when the player is hurt. */
  applyThorns(player: RunPlayer) {
    const thorns = player.thorns || 0;
    if (thorns <= 0) return;
    for (const a of this.animals.animals) {
      if (a.dead) continue;
      if (dist2(a.x, a.y, player.x, player.y) > 80 * 80) continue;
      const dealt = Math.max(1, Math.round(thorns));
      this.animals.damageAnimal(a, dealt, player, this.pickups, this.pools, this.killCtx);
      this.onFloatText?.(
        a.x + rand(-6, 6),
        a.y - a.radius * 2,
        String(dealt),
        '#c4d4a0',
        14,
        { vx: rand(-15, 15), life: 0.55 },
      );
    }
  }

  /** Legacy gainXp — gear xpGain at collect; greed already baked into drop amount. */
  grantXp(player: RunPlayer, amount: number) {
    const xpGain = 1 + (player.gearXpGain || 0);
    player.xp += amount * xpGain;
    while (player.xp >= xpNeeded(player.level)) {
      player.xp -= xpNeeded(player.level);
      player.level++;
      this.onLevelUp();
    }
  }

  update(dt: number, player: RunPlayer) {
    this.grantPlayer = player;
    if (player.buffFury > 0) player.buffFury = Math.max(0, player.buffFury - dt);
    if (player.buffVital > 0) player.buffVital = Math.max(0, player.buffVital - dt);
    if (player.buffHaste > 0) player.buffHaste = Math.max(0, player.buffHaste - dt);
    this.refreshBuffStats(player);
    this.tickHitCds(dt);

    if (!player.alive) return;
    const areaM = this.areaMult(player);
    const cdM = this.cooldownMult(player);

    const hasAura = this.arsenal.weaponOrder.includes('aura' as WeaponId);
    const hasSpikes = this.arsenal.weaponOrder.includes('spikes' as WeaponId);
    if (!hasAura && this.auraSprite) this.auraSprite.setVisible(false);
    if (!hasSpikes && this.spikesSprite) this.spikesSprite.setVisible(false);

    for (const id of this.arsenal.weaponOrder) {
      const stats = this.arsenal.getWeaponStats(id);
      if (!stats) continue;
      const el = this.arsenal.weaponElements[id] || null;
      if (id === 'axe') this.updateAxe(dt, player, stats, el, areaM);
      else if (id === 'aura') this.updateAura(dt, player, stats, el, cdM, 'aura');
      else if (id === 'spikes') this.updateAura(dt, player, stats, el, cdM, 'spikes');
      else if (id === 'hatchet') this.updateShooter(dt, player, stats, el, id, cdM);
      else if (id === 'crossbow') this.updateShooter(dt, player, stats, el, id, cdM);
      else if (id === 'longbow') this.updateShooter(dt, player, stats, el, id, cdM);
      else if (id === 'knife') this.updateKnife(dt, player, stats, el, cdM);
      else if (id === 'pike') this.updatePike(dt, player, stats, el, cdM);
      else if (id === 'saw') this.updateSaw(dt, player, stats, el, cdM);
      else if (id === 'dynamite') this.updateDynamite(dt, player, stats, el, cdM);
      else if (id === 'hammerfall') this.updateHammer(dt, player, stats, el, cdM);
      else if (id === 'guarddog') this.updateDog(dt, player, stats, el, cdM);
    }

    this.updateProjectiles(dt, player);
    this.updatePikes(dt, player);
    this.updateHammers(dt, player);
    this.updateDynamiteFlight(dt, player);
    this.updatePickups(dt, player);
    this.updatePools(dt, player);
  }

  /** True when the weapon timer has elapsed (does not start a new CD). */
  private weaponReady(id: string, dt: number) {
    const t = (this.weaponTimers[id] || 0) - dt;
    if (t > 0) {
      this.weaponTimers[id] = t;
      return false;
    }
    this.weaponTimers[id] = 0;
    return true;
  }

  /** Legacy: full CD on fire, else retry in 0.2s. */
  private armWeapon(id: string, fired: boolean, baseCd: number, cdM: number) {
    this.weaponTimers[id] = fired ? baseCd * cdM : 0.2;
  }

  private axeTrailGfx: Phaser.GameObjects.Graphics | null = null;

  private updateAxe(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, areaM: number) {
    const speed = (stats.speed as number) * this.spinMult(player);
    this.axeAngle += speed * dt;
    const count = this.projCount(stats);
    const range = (stats.range as number) * areaM;
    const dmg = stats.dmg as number;
    const st = this.arsenal.drawStyle('axe');
    const unique = st.unique;

    // Rebuild if unique unlocks so the larger unique art/scale matches legacy.
    if (unique !== this.axeDrawnUnique && this.axeCanvas.length) {
      while (this.axeCanvas.length) this.axeCanvas.pop()?.destroy();
      this.axeSprites.length = 0;
    }
    this.axeDrawnUnique = unique;
    // Legacy AxeSprite: scale = 1.2 * (unique ? 1.12 : 1). Canvas must fit blade extents.
    while (this.axeCanvas.length < count) {
      const cs = new CanvasSprite(this.scene, this.fx, 72, 80, `rt_axe_${this.axeUid++}`, 0.5, 0.72);
      cs.clear();
      cs.ctx.save();
      cs.ctx.translate(cs.w / 2, cs.h * 0.55);
      drawUniqueGlow(cs.ctx, 0, -4, 18, st);
      drawAxeHead(cs.ctx, 1.2 * st.scale, {
        unique,
        metal: st.metal,
        wood: st.wood,
        accent: st.accent,
      });
      cs.ctx.restore();
      cs.refresh();
      this.axeCanvas.push(cs);
      this.axeSprites.push(cs.image);
    }
    while (this.axeCanvas.length > count) {
      this.axeCanvas.pop()?.destroy();
      this.axeSprites.pop();
    }

    // Legacy Arsenal.drawTrails — orbit ring + motion wedges.
    if (!this.axeTrailGfx) {
      this.axeTrailGfx = this.scene.add.graphics().setDepth(6);
      this.fxLayerSafeAdd(this.axeTrailGfx);
    }
    const tg = this.axeTrailGfx;
    tg.clear();
    if (player.alive && count > 0) {
      const R = range;
      tg.lineStyle(st.unique ? 3 : 2, st.unique ? 0xffe8c0 : 0xffffff, st.unique ? 0.22 : 0.08);
      tg.strokeEllipse(player.x, player.y, R * 2, R * 2);
      const len = Math.min(1, Math.max(0.35, speed * 0.09));
      const segs = 6;
      const inner = 14;
      const trailCol = st.trail ? Phaser.Display.Color.HexStringToColor(st.trail).color : 0xffffff;
      for (let i = 0; i < count; i++) {
        const ang = this.axeAngle + (i / count) * TAU;
        for (let s = 0; s < segs; s++) {
          const a1 = ang - (len * s) / segs;
          const a0 = ang - (len * (s + 1)) / segs;
          const alpha = 0.09 * (1 - s / segs);
          tg.fillStyle(trailCol, alpha);
          tg.beginPath();
          tg.arc(player.x, player.y, R, a0, a1, false);
          tg.arc(player.x, player.y, inner, a1, a0, true);
          tg.closePath();
          tg.fillPath();
        }
      }
    }

    // Legacy AXE_HEIGHT = 16 float above ground; AXE_HIT_RADIUS = 16.
    for (let i = 0; i < count; i++) {
      const ang = this.axeAngle + (i / count) * TAU;
      const ax = player.x + Math.cos(ang) * range;
      const ay = player.y + Math.sin(ang) * range - 16;
      const spr = this.axeSprites[i];
      spr.setVisible(true)
        .setPosition(ax, ay)
        .setRotation(ang + Math.PI / 2)
        .setDepth(Math.floor(ay) + 4)
        .clearTint()
        .setScale(unique ? 1.12 : 1);
      this.hitArea(ax, ay + 16, 16 * areaM, dmg, player, el, true, `axe${i}`);
    }
  }

  private updateAura(
    dt: number,
    player: RunPlayer,
    stats: Record<string, number>,
    el: ElementId | null,
    cdM: number,
    key: string,
  ) {
    const r = (stats.radius as number) * this.arsenal.passiveArea();
    let spr = key === 'spikes' ? this.spikesSprite : this.auraSprite;
    if (!spr) {
      const tex = key === 'spikes' && this.scene.textures.exists('spikes_ring')
        ? 'spikes_ring'
        : 'aura_ring';
      spr = this.scene.add.image(player.x, player.y, tex).setDepth(8).setAlpha(key === 'spikes' ? 0.9 : 0.55);
      this.fxLayerSafeAdd(spr);
      if (key === 'spikes') this.spikesSprite = spr;
      else this.auraSprite = spr;
    }
    const baseSize = key === 'spikes' ? 128 : 64;
    const scale = (r * 2) / baseSize;
    spr.setVisible(true)
      .setPosition(player.x, player.y)
      .setScale(scale)
      .setDepth(Math.floor(player.y) - 2)
      .setTint(el === 'fire' ? 0xff8a4a : el === 'water' ? 0x9ad4ff : el === 'nature' ? 0x8fd98a : 0xffb347)
      .setRotation((spr.rotation || 0) + dt * (key === 'spikes' ? 0.15 : 0.6));

    if (!this.weaponReady(key, dt)) return;
    // Legacy always re-arms tick * cooldown (even if nothing was hit).
    this.armWeapon(key, true, stats.tick as number, cdM);
    const dmg = stats.dmg as number;
    this.hitArea(player.x, player.y, r, dmg, player, el, false, key);
  }

  private fxLayerSafeAdd(obj: Phaser.GameObjects.GameObject) {
    this.fx.add(obj);
  }

  private updateShooter(
    dt: number,
    player: RunPlayer,
    stats: Record<string, number>,
    el: ElementId | null,
    id: WeaponId,
    cdM: number,
  ) {
    if (!this.weaponReady(id, dt)) return;
    const count = this.projCount(stats);
    const range = stats.range as number;
    const targets: AnimalEntity[] = [];
    for (const a of this.animals.animals) {
      if (a.dead) continue;
      if (dist2(player.x, player.y, a.x, a.y) <= range * range) targets.push(a);
    }
    if (!targets.length) {
      this.armWeapon(id, false, 0, cdM);
      return;
    }
    targets.sort((a, b) => dist2(player.x, player.y, a.x, a.y) - dist2(player.x, player.y, b.x, b.y));
    this.armWeapon(id, true, (stats.cd as number) || 1, cdM);
    const speed = stats.speed as number;
    const tex = id === 'hatchet' ? 'hatchet' : id === 'longbow' ? 'arrow' : 'bolt';
    // Legacy projectile life = range / speed (exact travel distance).
    const life = range / speed;
    for (let i = 0; i < count; i++) {
      const t = targets[i % targets.length];
      const spread = i >= targets.length ? (i - targets.length + 1) * 0.12 * (i % 2 ? 1 : -1) : 0;
      const ang = Math.atan2(t.y - player.y, t.x - player.x) + spread;
      this.spawnProjectile(
        player.x, player.y - 8,
        Math.cos(ang) * speed, Math.sin(ang) * speed,
        stats.dmg as number, stats.pierce as number || 1, life, el, tex,
      );
    }
    if (id === 'hatchet') Audio.playSfx('throw');
    else if (id === 'longbow') Audio.playSfx('bow', 0.75);
    else Audio.playSfx('bow');
  }

  private updateKnife(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, cdM: number) {
    if (!this.weaponReady('knife', dt)) return;
    const count = this.projCount(stats);
    const focus = this.animals.nearest(player.x, player.y, stats.range as number);
    if (!focus) {
      this.armWeapon('knife', false, 0, cdM);
      return;
    }
    this.armWeapon('knife', true, stats.cd as number, cdM);
    const cone = stats.cone as number;
    const speed = stats.speed as number;
    const life = (stats.range as number) / speed;
    const base = Math.atan2(focus.y - player.y, focus.x - player.x);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / Math.max(1, count - 1) - 0.5) * cone * 2;
      const ang = base + t + rand(-0.04, 0.04);
      this.spawnProjectile(
        player.x, player.y - 4,
        Math.cos(ang) * speed, Math.sin(ang) * speed,
        stats.dmg as number, stats.pierce as number || 1, life, el, 'knife',
      );
    }
    Audio.playSfx('throw', 1.25);
  }

  private updatePike(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, cdM: number) {
    if (!this.weaponReady('pike', dt)) return;
    this.armWeapon('pike', true, stats.cd as number, cdM);
    const count = this.projCount(stats);
    const baseAng = player.aimAngle;
    // Legacy pike uses raw `s.len` (unique already multiplies via applyUniqueMults).
    const len = stats.len as number;
    const speed = stats.speed as number;
    const st = this.arsenal.drawStyle('pike');
    const unique = st.unique;
    for (let i = 0; i < count; i++) {
      const ang = baseAng + (count === 1 ? 0 : (i - (count - 1) / 2) * 0.28);
      // Canvas fits legacy tip at len*0.72 plus grip overhang.
      const cw = Math.max(64, Math.ceil(len * 0.72 + 24));
      const cs = new CanvasSprite(this.scene, this.fx, cw, 28, `rt_pike_${this.axeUid++}`, 0.12, 0.5);
      cs.clear();
      cs.ctx.save();
      cs.ctx.translate(cs.w * 0.12, cs.h / 2);
      drawUniqueGlow(cs.ctx, len * 0.35, 0, 18, st);
      drawPikeThrust(cs.ctx, len, unique ? { metal: st.metal, wood: st.wood } : undefined);
      cs.ctx.restore();
      cs.refresh();
      this.pikes.push({
        x: player.x,
        y: player.y - 4,
        angle: ang,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        dmg: stats.dmg as number,
        len,
        pierce: stats.pierce as number,
        life: 0.22,
        dead: false,
        element: el,
        hit: new Set(),
        canvas: cs,
      });
    }
    Audio.playSfx('throw', 1.2);
  }

  /** Legacy Pike.update — travels briefly; shaft segment is the hitbox. */
  private updatePikes(dt: number, player: RunPlayer) {
    for (const pk of this.pikes) {
      if (pk.dead) continue;
      pk.life -= dt;
      if (pk.life <= 0) {
        pk.dead = true;
        continue;
      }
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      const c = Math.cos(pk.angle);
      const s = Math.sin(pk.angle);
      pk.canvas.image
        .setPosition(pk.x, pk.y - 10)
        .setRotation(pk.angle)
        .setDepth(Math.floor(pk.y) + 8);
      for (const a of this.animals.animals) {
        if (a.dead || pk.hit.has(a.uid) || pk.pierce <= 0) continue;
        const dx = a.x - pk.x;
        const dy = a.y - a.radius * 0.6 - pk.y;
        const along = dx * c + dy * s;
        if (along < -10 || along > pk.len) continue;
        const px = dx - c * along;
        const py = dy - s * along;
        if (px * px + py * py > (12 + a.radius) * (12 + a.radius)) continue;
        pk.hit.add(a.uid);
        this.damageAnimal(a, pk.dmg, player, pk.element);
        pk.pierce--;
        if (pk.pierce <= 0) {
          pk.dead = true;
          break;
        }
      }
    }
    compactInPlace(this.pikes, (pk) => {
      if (pk.dead) pk.canvas.destroy();
      return pk.dead;
    });
  }

  private updateSaw(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, cdM: number) {
    if (!this.weaponReady('saw', dt)) return;
    this.armWeapon('saw', true, stats.cd as number, cdM);
    const count = this.projCount(stats);
    const focus = this.animals.nearest(player.x, player.y, (stats.dist as number) + 80);
    const base = focus
      ? Math.atan2(focus.y - player.y, focus.x - player.x)
      : player.aimAngle;
    const maxDist = (stats.dist as number) * this.arsenal.passiveArea();
    const size = ((stats.size as number) || 18) * this.arsenal.passiveArea();
    const key = this.scene.textures.exists('saw') ? 'saw' : 'particle';
    for (let i = 0; i < count; i++) {
      const ang = base + (count === 1 ? 0 : (i / count) * TAU);
      const dirX = Math.cos(ang);
      const dirY = Math.sin(ang);
      const gfx = this.scene.add.image(player.x, player.y - 8, key).setDepth(15).setScale(1);
      this.fx.add(gfx);
      this.projectiles.push({
        x: player.x,
        y: player.y - 8,
        vx: dirX * 430,
        vy: dirY * 430,
        dmg: stats.dmg as number,
        pierce: 99,
        life: 6,
        r: size,
        element: el,
        dead: false,
        gfx,
        boomerang: true,
        returning: false,
        travel: 0,
        maxDist,
        dirX,
        dirY,
        hitSet: new Set(),
      });
    }
    Audio.playSfx('throw', 0.7);
  }

  private updateDynamite(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, cdM: number) {
    if (!this.weaponReady('dynamite', dt)) return;
    const count = this.projCount(stats);
    const pool: AnimalEntity[] = [];
    for (const a of this.animals.animals) {
      if (a.dead) continue;
      if (dist2(player.x, player.y, a.x, a.y) <= 460 * 460) pool.push(a);
    }
    if (!pool.length) {
      this.armWeapon('dynamite', false, 0, cdM);
      return;
    }
    this.armWeapon('dynamite', true, stats.cd as number, cdM);
    const radius = (stats.radius as number) * this.arsenal.passiveArea();
    for (let i = 0; i < count; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const scatter = rand(-20, 20);
      const tx = t.x + t.vx * 0.5 + scatter;
      const ty = t.y + t.vy * 0.5 + scatter;
      const x0 = player.x;
      const y0 = player.y;
      const dur = clamp(Math.hypot(tx - x0, ty - y0) / 520, 0.35, 0.8);
      const gfx = this.scene.add.image(x0, y0 - 20, 'dynamite').setDepth(16).setScale(1.15);
      const shadow = this.scene.add.ellipse(x0, y0 + 1, 14, 6, 0x000000, 0.2).setDepth(Math.floor(y0) - 1);
      this.fx.add(gfx);
      this.fx.add(shadow);
      this.dynamites.push({
        x0,
        y0,
        tx,
        ty,
        x: x0,
        y: y0,
        z: 20,
        t: 0,
        dur,
        spin: 0,
        dmg: stats.dmg as number,
        radius,
        element: el,
        dead: false,
        gfx,
        shadow,
      });
    }
    Audio.playSfx('throw', 0.55);
  }

  /** Legacy Dynamite.update — lerp ground path + sin arc height, then explode. */
  private updateDynamiteFlight(dt: number, player: RunPlayer) {
    for (const d of this.dynamites) {
      if (d.dead) continue;
      d.t += dt;
      d.spin += dt * 12;
      const k = Math.min(1, d.t / d.dur);
      d.x = lerp(d.x0, d.tx, k);
      d.y = lerp(d.y0, d.ty, k);
      d.z = 20 + Math.sin(k * Math.PI) * 90 - 20 * k;
      d.gfx
        .setPosition(d.x, d.y - d.z)
        .setRotation(d.spin)
        .setDepth(Math.floor(d.y) + 20);
      d.shadow.setPosition(d.x, d.y + 1).setDepth(Math.floor(d.y) - 1).setAlpha(0.22 * (1 - k * 0.3));
      if (k >= 1) {
        d.dead = true;
        this.explodeDynamite(d.x, d.y, d.radius, d.dmg, player, d.element);
      }
    }
    compactInPlace(this.dynamites, (d) => {
      if (d.dead) {
        d.gfx.destroy();
        d.shadow.destroy();
      }
      return d.dead;
    });
  }

  /** Legacy Arsenal.explode for dynamite — AoE beasts + trees/ore + explosion FX. */
  private explodeDynamite(
    x: number,
    y: number,
    r: number,
    dmg: number,
    player: RunPlayer,
    el: ElementId | null,
  ) {
    this.hitArea(x, y, r, dmg, player, el, true, 'dynamite');
    // Legacy fancy blast: full explosion FX + heavy shake.
    this.fxSys()?.explosion(x, y, r);
    this.onShake?.(0.48);
    Audio.playSfx('boom', 0.85);
  }

  private updateHammer(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, cdM: number) {
    if (!this.weaponReady('hammerfall', dt)) return;
    const range = stats.range as number;
    const pool: AnimalEntity[] = [];
    for (const a of this.animals.animals) {
      if (a.dead) continue;
      if (dist2(player.x, player.y, a.x, a.y) <= range * range) pool.push(a);
    }
    if (!pool.length) {
      this.armWeapon('hammerfall', false, 0, cdM);
      return;
    }
    this.armWeapon('hammerfall', true, stats.cd as number, cdM);
    const count = this.projCount(stats);
    const radius = (stats.radius as number) * this.arsenal.passiveArea();
    for (let i = 0; i < count; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const tx = t.x + rand(-18, 18);
      const ty = t.y + rand(-12, 12);
      const cs = new CanvasSprite(this.scene, this.fx, 40, 44, `rt_hammer_${this.axeUid++}`, 0.5, 0.85);
      cs.clear();
      cs.ctx.save();
      cs.ctx.translate(cs.w / 2, cs.h * 0.45);
      drawHammer(cs.ctx);
      cs.ctx.restore();
      cs.refresh();
      const gfx = cs.image;
      gfx.setPosition(tx, ty - 200).setDepth(20);
      const shadow = this.scene.add.ellipse(tx, ty + 1, 28, 10, 0x000000, 0.22).setDepth(Math.floor(ty) - 1);
      this.fx.add(shadow);
      this.hammers.push({
        x: tx,
        y: ty,
        z: 200 + rand(0, 40),
        dmg: stats.dmg as number,
        radius,
        spin: rand(0, TAU),
        age: 0,
        hit: false,
        dead: false,
        element: el,
        gfx,
        shadow,
        canvas: cs,
      });
    }
    Audio.playSfx('throw', 0.45);
  }

  private updateHammers(dt: number, player: RunPlayer) {
    for (const h of this.hammers) {
      if (h.dead) continue;
      h.age += dt;
      h.spin += dt * 10;
      h.z = Math.max(0, h.z - 620 * dt);
      const k = clamp(1 - h.z / 240, 0.2, 1);
      h.shadow.setPosition(h.x, h.y + 1).setScale(k, k).setAlpha(0.22 * k);
      h.gfx.setPosition(h.x, h.y - h.z - 8).setRotation(h.spin).setDepth(Math.floor(h.y - h.z) + 20);
      if (h.z > 0) continue;
      if (!h.hit) {
        h.hit = true;
        this.hitArea(h.x, h.y, h.radius, h.dmg, player, h.element, false);
        this.fxSys()?.ring(h.x, h.y, 'rgba(196,163,90,0.95)', 12, h.radius * 0.85, 0.4);
        this.fxSys()?.dust(h.x, h.y, 10);
        this.onShake?.(0.12);
        Audio.playSfx('boom', 1.35);
      }
      if (h.age > 0.85) h.dead = true;
    }
    compactInPlace(this.hammers, (h) => {
      if (h.dead) {
        if (h.canvas) h.canvas.destroy();
        else h.gfx.destroy();
        h.shadow.destroy();
        return true;
      }
      return false;
    });
  }

  private fxSys() {
    return this.vfx;
  }

  private updateDog(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, cdM: number) {
    if (!this.dog) {
      this.dog = { x: player.x, y: player.y, life: stats.duration as number, cd: 0, spawnCd: stats.spawnCd as number };
    }
    this.dog.spawnCd -= dt;
    if (this.dog.spawnCd <= 0 && this.dog.life <= 0) {
      this.dog.life = stats.duration as number;
      this.dog.spawnCd = stats.spawnCd as number;
      this.dog.x = player.x;
      this.dog.y = player.y;
      Audio.playSfx('howl', 1.6);
    }
    if (!this.dogSprite) {
      this.dogSprite = this.scene.add.image(this.dog.x, this.dog.y, 'dog').setOrigin(0.5, 1).setDepth(this.dog.y);
      this.layer.add(this.dogSprite);
    }
    if (this.dog.life <= 0) {
      this.dogSprite.setVisible(false);
      return;
    }
    this.dog.life -= dt;
    this.dogSprite.setVisible(true);
    const target = this.animals.nearest(this.dog.x, this.dog.y, 280);
    if (target) {
      const dx = target.x - this.dog.x;
      const dy = target.y - this.dog.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = stats.speed as number;
      this.dog.x += (dx / d) * sp * dt;
      this.dog.y += (dy / d) * sp * dt;
      this.dogSprite.setFlipX(dx < 0);
      if (d < target.radius + 14) {
        this.dog.cd -= dt;
        if (this.dog.cd <= 0) {
          this.dog.cd = (stats.biteCd as number) * cdM;
          this.damageAnimal(target, stats.dmg as number, player, el);
          Audio.playSfx('boarDie', 1.8);
        }
      }
    } else {
      const dx = player.x - this.dog.x;
      const dy = player.y - this.dog.y;
      const d = Math.hypot(dx, dy) || 1;
      this.dog.x += (dx / d) * 180 * dt;
      this.dog.y += (dy / d) * 180 * dt;
      this.dogSprite.setFlipX(dx < 0);
    }
    this.dogSprite.setPosition(this.dog.x, this.dog.y).setDepth(this.dog.y);
  }

  private spawnProjectile(
    x: number, y: number, vx: number, vy: number,
    dmg: number, pierce: number, life: number, el: ElementId | null, tex: string,
  ) {
    const key = this.scene.textures.exists(tex) ? tex : 'particle';
    const gfx = this.scene.add.image(x, y, key).setDepth(15).setScale(tex === 'saw' ? 1 : 0.95);
    gfx.setRotation(Math.atan2(vy, vx));
    this.fx.add(gfx);
    this.projectiles.push({
      x, y, vx, vy, dmg, pierce, life, r: 10, element: el, dead: false, gfx, hitSet: new Set(),
    });
  }

  private updateProjectiles(dt: number, player: RunPlayer) {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.life -= dt;

      if (p.boomerang) {
        const dirX = p.dirX || 1;
        const dirY = p.dirY || 0;
        const maxDist = p.maxDist || 200;
        if (!p.returning) {
          const travel = p.travel || 0;
          const sp = 430 * (1 - 0.55 * (travel / maxDist));
          p.x += dirX * sp * dt;
          p.y += dirY * sp * dt;
          p.travel = travel + sp * dt;
          if ((p.travel || 0) >= maxDist) p.returning = true;
        } else {
          const dx = player.x - p.x;
          const dy = player.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const age = 6 - p.life;
          const sp = Math.min(430 * 1.4, 160 + age * 260);
          p.x += (dx / d) * sp * dt;
          p.y += (dy / d) * sp * dt;
          if (d < 22 || p.life <= 0) p.dead = true;
        }
        p.gfx.setPosition(p.x, p.y).setRotation(p.gfx.rotation + dt * 26).setDepth(Math.floor(p.y) + 15);
        for (const a of this.animals.animals) {
          if (a.dead) continue;
          if (dist2(p.x, p.y, a.x, a.y) >= (p.r + a.radius) * (p.r + a.radius)) continue;
          if (p.hitSet?.has(a.uid)) continue;
          p.hitSet?.add(a.uid);
          this.damageAnimal(a, p.dmg, player, p.element);
          // Allow re-hit after a short delay by clearing later via life buckets — simple: keep set small
          this.scene.time.delayedCall(350, () => p.hitSet?.delete(a.uid));
        }
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const key = p.gfx.texture.key;
      const spin = (key === 'saw' || key === 'axe' || key === 'knife') ? dt * (key === 'knife' ? 28 : 14) : 0;
      p.gfx
        .setPosition(p.x, p.y)
        .setRotation(spin ? p.gfx.rotation + spin : Math.atan2(p.vy, p.vx))
        .setDepth(Math.floor(p.y) + 15);
      if (p.life <= 0) p.dead = true;
      for (const a of this.animals.animals) {
        if (a.dead || p.pierce <= 0) continue;
        if (p.hitSet?.has(a.uid)) continue;
        if (dist2(p.x, p.y, a.x, a.y) < (p.r + a.radius) * (p.r + a.radius)) {
          p.hitSet?.add(a.uid);
          this.damageAnimal(a, p.dmg, player, p.element);
          p.pierce--;
          if (p.pierce <= 0) p.dead = true;
        }
      }
      if (p.dead) continue;
      const statics = this.world.queryStatic(p.x, p.y, 24);
      for (const s of statics) {
        if (!s.isHittable() || p.pierce <= 0) continue;
        if (dist2(p.x, p.y, s.x, s.y) < (p.r + s.radius) * (p.r + s.radius)) {
          this.hitStatic(s, p.dmg, player.x, player.y, player);
          p.pierce--;
          if (p.pierce <= 0) p.dead = true;
        }
      }
    }
    compactInPlace(this.projectiles, (p) => {
      if (p.dead) p.gfx.destroy();
      return p.dead;
    });
  }

  hitArea(
    x: number,
    y: number,
    r: number,
    baseDmg: number,
    player: RunPlayer,
    el: ElementId | null,
    chopTrees: boolean,
    source = 'area',
  ) {
    this.animals.queryNear(x, y, r, this._near);
    for (const a of this._near) {
      const key = `${source}:${a.uid}`;
      if ((this.hitCdAnimal.get(key) || 0) > 0) continue;
      this.hitCdAnimal.set(key, HIT_COOLDOWN);
      this.damageAnimal(a, baseDmg, player, el);
    }
    if (chopTrees) {
      const statics = this.world.queryStatic(x, y, r);
      for (const s of statics) {
        const key = `${source}:${s.type}:${s.x},${s.y}`;
        if ((this.hitCdStatic.get(key) || 0) > 0) continue;
        if (dist2(x, y, s.x, s.y) > (r + s.radius) * (r + s.radius)) continue;
        this.hitCdStatic.set(key, HIT_COOLDOWN);
        this.hitStatic(s, baseDmg, player.x, player.y, player);
      }
    }
  }

  private damageAnimal(a: AnimalEntity, baseDmg: number, player: RunPlayer, el: ElementId | null) {
    const atk = el || player.attackElement || null;
    const { dmg, crit } = this.calcDamage(baseDmg, el, a.element, player);
    const shown = Math.max(1, Math.round(dmg));
    const aff = atk ? elementMult(atk, a.element) : 1;
    let floatCol = crit ? '#ffe066' : '#ff6a3d';
    if (atk && ELEMENTS[atk]) {
      floatCol = aff > 1 ? ELEMENTS[atk].color : aff < 1 ? '#9aa3aa' : ELEMENTS[atk].color;
    }
    this.onFloatText?.(
      a.x + rand(-8, 8),
      a.y - (a.radius * 2.2) - 8,
      crit ? `${shown}!` : String(shown),
      floatCol,
      crit ? 22 : 16,
      { vx: rand(-25, 25), life: 0.7 },
    );
    this.applyElementOnHit(a, atk, dmg);
    if (atk) this.vfx?.elementHit(a.x, a.y - a.radius * 0.8, atk, aff);
    Audio.playSfx('hit', rand(0.9, 1.1));
    if (crit) this.onShake?.(0.1);
    const killed = this.animals.damageAnimal(a, dmg, player, this.pickups, this.pools, this.killCtx);
    if (!killed) this.vfx?.hitPuff(a.x, a.y - a.radius * 1.5, 4);
    // Legacy: lifesteal on every non-proc-skipped hit, not only on kill.
    if ((player.gearLifesteal || 0) > 0 && player.alive) {
      const heal = Math.max(0, Math.floor(dmg * (player.gearLifesteal || 0)));
      if (heal > 0) player.hp = Math.min(player.maxHp, player.hp + heal);
    }
    if (killed) {
      this.applyElementOnKill(a, atk, dmg, player);
      this.vfx?.deathBurst(a.x, a.y - a.radius, '#c4553e', a.boss ? 18 : 10);
    }
  }

  /** Legacy fire burn / water slow on hit. */
  private applyElementOnHit(a: AnimalEntity, element: ElementId | null, dealt: number) {
    if (!element || dealt < 1 || a.dead) return;
    if (element === 'fire') {
      a.burns.push({ dps: (dealt * 0.4) / 3, life: 3 });
      if (a.burns.length > 12) a.burns.splice(0, a.burns.length - 12);
    } else if (element === 'water') {
      const add = clamp(dealt / (dealt + 60) * 0.4, 0.08, 0.4);
      a.slow = clamp(a.slow + add, 0, 0.7);
      a.slowT = Math.max(a.slowT, 1.1 + dealt / 120);
    }
  }

  /** Legacy nature heal / earth AoE / light+darkness permanent procs. */
  private applyElementOnKill(a: AnimalEntity, element: ElementId | null, dealt: number, player: RunPlayer) {
    if (!element || dealt < 1 || !player.alive) return;
    if (element === 'nature') {
      const heal = Math.max(1, Math.round(dealt * 0.08));
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.onFloatText?.(player.x, player.y - 50, `+${heal}`, '#6dd46a', 14, { life: 0.8, vy: -28 });
    } else if (element === 'earth') {
      const aoe = Math.max(1, Math.round(dealt * 0.1));
      const r = 95;
      for (const t of this.animals.animals) {
        if (t.dead || t === a) continue;
        if (dist2(a.x, a.y, t.x, t.y) < (r + t.radius * 0.5) ** 2) {
          this.animals.damageAnimal(t, aoe, player, this.pickups, this.pools, {
            ...this.killCtx,
            fromSplit: true,
          });
        }
      }
    } else if (element === 'light' && Math.random() < 0.02) {
      const gain = Math.max(1, Math.round(dealt * 0.05));
      player.maxHp += gain;
      player.hp += gain;
      this.onFloatText?.(player.x, player.y - 70, `+${gain} Max HP`, '#ffe66d', 16, { life: 1.2, vy: -30 });
    } else if (element === 'darkness' && Math.random() < 0.02) {
      const gain = Math.max(1, Math.round(dealt * 0.05));
      player.flatDamage += gain;
      this.onFloatText?.(player.x, player.y - 70, `+${gain} Dmg`, '#9b7bde', 16, { life: 1.2, vy: -30 });
    }
  }

  private hitStatic(s: StaticEntity, dmg: number, px: number, py: number, player?: RunPlayer) {
    if (s.type === 'tree') {
      const res = this.world.damageTree(s, dmg, px);
      this.vfx?.woodChips(s.x, s.y - 14, px, py, res.killed ? 10 : 4);
      // Legacy: chop on every hit (pitched), treeFall when it goes down.
      Audio.playSfx('chop', rand(0.9, 1.15));
      if (res.killed) {
        this.noteTreeKill(player || this.grantPlayer);
        if (res.wood) this.spawnPickup('wood', s.x, s.y, res.wood);
        this.spawnPickup('xp', s.x + rand(-6, 6), s.y, 1);
        Audio.playSfx('treeFall');
        this.onStaticKilled?.(s);
      }
    } else if (s.type === 'rock') {
      const res = this.world.damageRock(s, dmg);
      this.vfx?.rockChips(s.x, s.y - 8, res.killed ? 12 : 5);
      Audio.playSfx('ore', rand(0.9, 1.2));
      if (res.gold) this.spawnPickup('gold', s.x, s.y, res.gold);
      if (res.killed) {
        this.onShake?.(0.25);
        this.onStaticKilled?.(s);
      }
    }
  }

  /** Optional hook so the scene can remove sprites immediately. */
  onStaticKilled?: (s: StaticEntity) => void;

  private updatePickups(dt: number, player: RunPlayer) {
    const magnet = player.magnetR;
    const margin = 40;
    const maxX = this.world.w - margin;
    const maxY = this.world.h - margin;
    for (const p of this.pickups) {
      if (p.dead) continue;
      p.age += dt;

      // Hop in Z (visual bounce) — never apply gravity to world Y.
      if (p.z > 0 || p.vz > 0) {
        p.z += p.vz * dt;
        p.vz -= 900 * dt;
        if (p.z <= 0) {
          p.z = 0;
          p.vz = p.vz < -140 ? -p.vz * 0.35 : 0;
        }
      }
      const fr = Math.exp(-(p.z > 0 ? 1.5 : 6) * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= fr;
      p.vy *= fr;
      p.x = clamp(p.x, margin, maxX);
      p.y = clamp(p.y, margin, maxY);

      if (!player.alive || p.age < 0.25) continue;

      const d2 = dist2(p.x, p.y, player.x, player.y);
      const d = Math.sqrt(d2) || 1;
      const pullR = p.kind === 'xp' ? magnet * 1.25 : magnet;
      const pickR = 24;
      if (d2 < pickR * pickR) {
        if (p.kind === 'powerup' && p.powerupId) this.activatePowerup(p.powerupId, player);
        else if (p.kind === 'xp') {
          this.grantXp(player, p.amount);
          Audio.playSfx('xp');
        } else if (p.kind === 'gold' || p.kind === 'wood' || p.kind === 'meat') {
          gainResource(player, p.kind, p.amount);
          if (p.kind === 'gold') Audio.playSfx('gold');
          else if (p.kind === 'wood') Audio.playSfx('pickup', rand(1, 1.15));
          else Audio.playSfx('pickup', 0.8);
        }
        p.dead = true;
        continue;
      }
      if (!p.magnet && d < pullR) p.magnet = true;
      if (p.magnet) {
        // Vacuum powerups set speed high; normal magnet ramps up to 1500.
        const cap = (p.speed || 0) > 1500 ? p.speed! : 1500;
        p.speed = Math.min((p.speed || 0) + 1500 * dt, cap);
        const step = Math.min((p.speed || 0) * dt, d);
        p.x += ((player.x - p.x) / d) * step;
        p.y += ((player.y - p.y) / d) * step;
      }
      const life = p.kind === 'powerup' ? 260 : p.kind === 'xp' ? 360 : 120;
      if (p.age > life) p.dead = true;
    }
    // Occasional merge pass (legacy does this periodically, not every frame).
    if (Math.random() < 0.08) this.stackNearbyPickups();
    compactInPlace(this.pickups, (p) => p.dead);
  }

  /** Legacy stackNearbyPickups — coalesce settled same-type drops. */
  private stackNearbyPickups() {
    const list = this.pickups;
    const R2 = 52 * 52;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead || a.kind === 'powerup' || a.z > 4) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead || b.kind !== a.kind || b.z > 4) continue;
        if (dist2(a.x, a.y, b.x, b.y) > R2) continue;
        a.amount = (a.amount || 1) + (b.amount || 1);
        a.x = (a.x + b.x) * 0.5;
        a.y = (a.y + b.y) * 0.5;
        b.dead = true;
      }
    }
  }

  private updatePools(dt: number, player: RunPlayer) {
    for (const pool of this.pools) {
      if (pool.dead) continue;
      pool.life -= dt;
      if (pool.life <= 0) pool.dead = true;
      if (dist2(pool.x, pool.y, player.x, player.y) < pool.r * pool.r) {
        player.hp -= pool.dmg * dt;
        if (player.hp <= 0) {
          player.hp = 0;
          player.alive = false;
        }
      }
      for (const a of this.animals.animals) {
        if (a.dead) continue;
        if (dist2(pool.x, pool.y, a.x, a.y) < pool.r * pool.r) {
          this.animals.damageAnimal(a, pool.dmg * dt * 0.5, player, this.pickups, this.pools, this.killCtx);
        }
      }
    }
    compactInPlace(this.pools, (p) => p.dead);
  }
}
