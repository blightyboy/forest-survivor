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
  isTinyPest,
  type SpeciesId,
} from '../data/animals';
import { STAR_MAX, STAR_LOOT } from '../data/constants';
import { clamp, dist2, rand, compactInPlace, TAU } from '../core/math';
import type { RunPlayer, Pickup, FirePool } from '../run/RunTypes';
import type { CombatSystem } from './CombatSystem';

export const MAX_ANIMALS = 80;

export type AnimalState = 'wander' | 'chase' | 'windup' | 'lunge' | 'cooldown' | 'shoot';

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
  stars: number;
  raider: boolean;
  boss: boolean;
  dayBoss: boolean;
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
  sprite: Phaser.GameObjects.Image;
  bar?: Phaser.GameObjects.Graphics;
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
  private uid = 1;
  private spawnTimer = 0;
  scene: Phaser.Scene;
  layer: Phaser.GameObjects.Container;
  fxLayer: Phaser.GameObjects.Container | null = null;
  combat: CombatSystem | null = null;
  worldCenter = { x: 2400, y: 2400 };
  onDayBoss?: (name: string) => void;

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

  clear() {
    for (const a of this.animals) {
      a.sprite.destroy();
      a.bar?.destroy();
    }
    for (const s of this.shots) s.gfx.destroy();
    this.animals.length = 0;
    this.shots.length = 0;
  }

  hasBossOfType(species: SpeciesId) {
    for (const a of this.animals) {
      if (!a.dead && a.boss && a.species === species) return true;
    }
    return false;
  }

  spawn(
    species: SpeciesId,
    x: number,
    y: number,
    opts: {
      variant?: string;
      raider?: boolean;
      boss?: boolean;
      dayBoss?: boolean;
      threatM?: number;
      displayName?: string;
      hpMult?: number;
      dmgMult?: number;
    } = {},
  ) {
    if (this.animals.length >= MAX_ANIMALS) return null;
    const baseSp = SPECIES[species];
    if (!baseSp) return null;
    const sp = opts.boss && baseSp.bossCombat ? { ...baseSp, ...baseSp.bossCombat } : baseSp;
    const threatM = opts.threatM || 0;
    const threatHp = 1 + 0.4 * threatM;
    const threatDmg = 1 + 0.16 * threatM;
    const threatSpd = Math.min(1.5, 1 + 0.02 * threatM);
    const variant = rollAnimalVariant(threatM, {
      variant: opts.variant as never,
      raider: opts.raider,
      boss: opts.boss,
      species,
    });
    const vm = variantMult(variant);
    let hp = Math.round(sp.hp * threatHp * vm.hp * (opts.boss ? 4 : opts.raider ? 1.4 : 1));
    let dmg = sp.dmg * threatDmg * vm.dmg;
    if (opts.hpMult) hp = Math.round(hp * opts.hpMult);
    if (opts.dmgMult) dmg *= opts.dmgMult;
    const speed = sp.chase * threatSpd * vm.speed;
    const tex = `animal_${species}`;
    const sprite = this.scene.add.image(x, y, tex).setDepth(5);
    if (opts.boss) sprite.setScale(1.35);
    this.layer.add(sprite);
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
      radius: sp.radius * (opts.boss ? 1.15 : 1),
      dmg,
      speed,
      aggro: sp.aggro * AGGRO_RANGE_MULT,
      state: 'wander',
      stateT: rand(1, 3),
      cd: 0,
      stars: opts.boss ? 3 : 0,
      raider: !!opts.raider,
      boss: !!opts.boss,
      dayBoss: !!opts.dayBoss,
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
      sprite,
    };
    this.animals.push(a);
    return a;
  }

  spawnDayBoss(species: SpeciesId, nearX: number, nearY: number, dayNumber: number, threatM: number) {
    if (this.hasBossOfType(species)) return;
    const ang = rand(0, TAU);
    const x = nearX + Math.cos(ang) * rand(120, 220);
    const y = nearY + Math.sin(ang) * rand(120, 220);
    const name = BOSS_NAMES[species] || `Champion ${SPECIES[species]?.name || species}`;
    const tiny = isTinyPest(species);
    const dire = species.startsWith('dire_');
    const hpScale = tiny ? 22 + dayNumber * 4 : 14 + dayNumber * 3.5;
    const hpMult = hpScale * (dire ? 0.9 : 1);
    const dmgMult = (1.25 + dayNumber * 0.08) * (dire ? 1.1 : 1);
    const boss = this.spawn(species, x, y, {
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

  spawnAmbient(px: number, py: number, threatM: number, isNight: boolean) {
    const rate = isNight ? 0.55 : 0.35;
    if (Math.random() > rate) return;
    const speciesList: SpeciesId[] = ['boar', 'wolf', 'deer', 'fox', 'squirrel', 'rat'];
    const sp = speciesList[Math.floor(Math.random() * speciesList.length)];
    const ang = Math.random() * TAU;
    const d = rand(420, 720);
    this.spawn(sp, px + Math.cos(ang) * d, py + Math.sin(ang) * d, { threatM });
  }

  spawnRaidWave(count: number, threatM: number) {
    const cx = this.worldCenter.x;
    const cy = this.worldCenter.y;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + rand(-0.2, 0.2);
      const d = rand(900, 1100);
      const sp: SpeciesId = Math.random() < 0.4 ? 'wolf' : Math.random() < 0.7 ? 'boar' : 'rat';
      this.spawn(sp, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, { raider: true, threatM });
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
    const sp = SPECIES[a.species];
    const vm = variantMult(a.variant);
    if (this.combat) {
      const meat = Math.round(rand(sp.meat[0], sp.meat[1]) * vm.loot * lootMult);
      if (meat > 0) this.combat.spawnPickup('meat', a.x, a.y, meat);
      const xp = Math.round(sp.xp * vm.xp * lootMult * (1 + (player.gearXpGain || 0)));
      this.combat.spawnPickup('xp', a.x + rand(-8, 8), a.y, xp);
      if (Math.random() < sp.goldChance * vm.loot) {
        this.combat.spawnPickup('gold', a.x, a.y, sp.gold);
      }
      if (Math.random() < STAR_LOOT && a.stars < STAR_MAX) {
        a.stars++;
      }
      if (!ctx.fromSplit) this.combat.rollPowerupDrop(a);
    }
    if (a.variant === 'necromantic') {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * TAU;
        const child = this.spawn('rat', a.x + Math.cos(ang) * 12, a.y + Math.sin(ang) * 12, {
          threatM: 0.2,
        });
        if (child) {
          child.maxHp = Math.round(child.maxHp * 0.35);
          child.hp = child.maxHp;
          child.radius *= 0.75;
          child.sprite.setScale(0.7);
        }
      }
    }
    if (a.variant === 'demonic') {
      pools.push({ x: a.x, y: a.y, r: 48, dmg: 8, life: 4, dead: false });
    }
    if (!ctx.fromSplit) this.tryDayBossFromKill(a, ctx);
    a.sprite.setVisible(false);
  }

  fireShot(a: AnimalEntity, px: number, py: number) {
    const layer = this.fxLayer || this.layer;
    const baseAng = Math.atan2(py - a.y, px - a.x);
    const count = Math.max(1, a.shotCount);
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * a.shotSpread;
      const ang = baseAng + spread;
      const vx = Math.cos(ang) * a.shotSpeed;
      const vy = Math.sin(ang) * a.shotSpeed;
      const gfx = this.scene.add.image(a.x, a.y, 'particle').setDepth(12).setTint(0x9a9088);
      layer.add(gfx);
      this.shots.push({
        x: a.x,
        y: a.y,
        vx,
        vy,
        dmg: a.dmg * 0.85,
        r: a.shotRadius,
        life: 2.2,
        dead: false,
        gfx,
      });
    }
  }

  updateShots(dt: number, player: RunPlayer) {
    for (const s of this.shots) {
      if (s.dead) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.gfx.setPosition(s.x, s.y);
      if (s.life <= 0) s.dead = true;
      if (player.alive && player.invuln <= 0 && dist2(s.x, s.y, player.x, player.y) < (s.r + 18) ** 2) {
        player.hp -= s.dmg * (1 - clamp(player.armor, 0, 0.65));
        player.invuln = 0.35;
        if (player.hp <= 0) {
          player.hp = 0;
          player.alive = false;
        }
        s.dead = true;
      }
    }
    compactInPlace(this.shots, (s) => {
      if (s.dead) s.gfx.destroy();
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

    this.spawnTimer += dt;
    const spawnInterval = isNight ? 2.2 : 3.5;
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnAmbient(player.x, player.y, threatM, isNight);
    }

    const px = player.x;
    const py = player.y;
    for (const a of this.animals) {
      if (a.dead) continue;
      a.hitCd = Math.max(0, a.hitCd - dt);
      a.cd = Math.max(0, a.cd - dt);
      const sp = SPECIES[a.species];
      const d2 = dist2(a.x, a.y, px, py);
      const dist = Math.sqrt(d2);
      const aggro = a.raider || a.dayBoss ? a.aggro * 1.35 : a.aggro;

      if (a.ranged && dist < a.shotRange && dist > a.preferRange * 0.65 && a.cd <= 0 && dist < aggro) {
        a.state = 'shoot';
        a.stateT = sp.windup * 0.85;
      }

      if (a.state === 'wander') {
        a.stateT -= dt;
        a.x += Math.cos(a.wanderAngle) * sp.wander * dt;
        a.y += Math.sin(a.wanderAngle) * sp.wander * dt;
        if (a.stateT <= 0) {
          a.wanderAngle = rand(0, TAU);
          a.stateT = rand(1.5, 3.5);
        }
        if (d2 < aggro * aggro) a.state = 'chase';
      } else if (a.state === 'chase') {
        const dx = px - a.x;
        const dy = py - a.y;
        const inv = dist > 1 ? 1 / dist : 0;
        if (a.ranged && dist < a.preferRange) {
          a.x -= dx * inv * a.speed * 0.55 * dt;
          a.y -= dy * inv * a.speed * 0.55 * dt;
        } else {
          a.x += dx * inv * a.speed * dt;
          a.y += dy * inv * a.speed * dt;
        }
        if (!a.ranged && dist < a.radius + 22 && a.cd <= 0) {
          a.state = 'windup';
          a.stateT = sp.windup;
        }
        if (a.ranged && dist < a.shotRange && a.cd <= 0 && dist > a.preferRange * 0.5) {
          a.state = 'shoot';
          a.stateT = sp.windup * 0.85;
        }
        if (d2 > aggro * aggro * 1.6) a.state = 'wander';
      } else if (a.state === 'shoot') {
        a.stateT -= dt;
        if (a.stateT <= 0) {
          this.fireShot(a, px, py);
          a.state = 'cooldown';
          a.cd = sp.cooldown;
        }
      } else if (a.state === 'windup') {
        a.stateT -= dt;
        if (a.stateT <= 0) {
          a.state = 'lunge';
          a.stateT = sp.lungeTime;
          const dx = px - a.x;
          const dy = py - a.y;
          const inv = dist > 1 ? 1 / dist : 0;
          a.vx = dx * inv * sp.lungeSpeed;
          a.vy = dy * inv * sp.lungeSpeed;
        }
      } else if (a.state === 'lunge') {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.stateT -= dt;
        if (dist < a.radius + 18 && player.alive && player.invuln <= 0) {
          player.hp -= a.dmg * (1 - clamp(player.armor, 0, 0.65));
          player.invuln = 0.35;
          if (player.hp <= 0) {
            player.hp = 0;
            player.alive = false;
          }
          a.state = 'cooldown';
          a.cd = sp.cooldown;
          a.vx = a.vy = 0;
        }
        if (a.stateT <= 0) {
          a.state = 'cooldown';
          a.cd = sp.cooldown * 0.5;
          a.vx = a.vy = 0;
        }
      } else if (a.state === 'cooldown') {
        if (a.cd <= 0) a.state = d2 < aggro * aggro ? 'chase' : 'wander';
      }

      if (a.raider || a.dayBoss) {
        const tcx = a.dayBoss ? px : this.worldCenter.x;
        const tcy = a.dayBoss ? py : this.worldCenter.y;
        const td = Math.hypot(tcx - a.x, tcy - a.y);
        if (td > 80) {
          a.x += ((tcx - a.x) / td) * a.speed * (a.dayBoss ? 0.25 : 0.35) * dt;
          a.y += ((tcy - a.y) / td) * a.speed * (a.dayBoss ? 0.25 : 0.35) * dt;
        }
      }

      a.sprite.setPosition(a.x, a.y);
      if (a.hp < a.maxHp || a.boss || a.raider) {
        if (!a.bar) {
          a.bar = this.scene.add.graphics().setDepth(6);
          this.layer.add(a.bar);
        }
        a.bar.clear();
        a.bar.fillStyle(0x111111, 0.7);
        const w = a.boss ? 44 : 36;
        a.bar.fillRect(a.x - w / 2, a.y - a.radius - 14, w, 5);
        const frac = clamp(a.hp / a.maxHp, 0, 1);
        a.bar.fillStyle(a.boss ? 0xc46bff : frac > 0.5 ? 0x6dd46a : 0xff6a3d, 1);
        a.bar.fillRect(a.x - w / 2, a.y - a.radius - 14, w * frac, 5);
      }
    }

    this.updateShots(dt, player);

    compactInPlace(this.animals, (a) => {
      if (a.dead) {
        a.sprite.destroy();
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
