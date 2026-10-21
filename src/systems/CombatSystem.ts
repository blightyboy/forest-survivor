import Phaser from 'phaser';
import { HIT_COOLDOWN, MAX_PICKUPS, xpNeeded, elementMult, POWERUPS } from '../data/constants';
import type { KillContext, AnimalEntity } from './AnimalSystem';
import { applyBuffMultipliers } from './PlayerStats';
import { gearBonuses } from '../data/shop';
import type { MetaBonuses } from '../meta/Meta';
import { dist2, TAU, clamp, compactInPlace, rand } from '../core/math';
import type { World, StaticEntity } from '../world/World';
import type { ArsenalSystem } from './ArsenalSystem';
import type { AnimalSystem } from './AnimalSystem';
import type { RunPlayer, Pickup, FirePool } from '../run/RunTypes';
import type { ElementId } from '../data/constants';
import { WEAPON_DEFS, type WeaponId } from '../data/weapons';
import { Audio } from '../audio/Audio';

type Proj = {
  x: number; y: number; vx: number; vy: number;
  dmg: number; pierce: number; life: number;
  r: number; element: ElementId | null; dead: boolean;
  gfx: Phaser.GameObjects.Image;
};

export class CombatSystem {
  pickups: Pickup[] = [];
  pools: FirePool[] = [];
  axeAngle = 0;
  weaponTimers: Record<string, number> = {};
  hitCdStatic = new Map<StaticEntity, number>();
  hitCdAnimal = new Map<number, number>();
  projectiles: Proj[] = [];
  dog: { x: number; y: number; life: number; cd: number; spawnCd: number } | null = null;
  private _near: AnimalEntity[] = [];
  killCtx: KillContext = { isNight: false, dayNumber: 1, threatM: 0 };
  private metaBonuses: MetaBonuses = {} as MetaBonuses;
  nuking = false;

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
    for (const p of this.pickups) { /* no gfx yet */ }
    this.pickups.length = 0;
    for (const pr of this.projectiles) pr.gfx.destroy();
    this.projectiles.length = 0;
    this.pools.length = 0;
    this.dog = null;
  }

  spawnPickup(kind: Pickup['kind'], x: number, y: number, amount: number, powerupId?: string) {
    if (this.pickups.length >= MAX_PICKUPS) return;
    this.pickups.push({
      kind, x, y, amount,
      vx: rand(-20, 20), vy: rand(-30, -10),
      dead: false,
      powerupId,
    });
  }

  rollPowerupDrop(a: AnimalEntity) {
    if (this.nuking) return;
    let chance = 0.07;
    if (a.boss) chance = 0.55;
    else if (a.raider) chance = 0.14;
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
    this.spawnPickup('powerup', a.x, a.y, 1, pick);
  }

  activatePowerup(type: string, player: RunPlayer) {
    const def = POWERUPS[type];
    if (!def) return;
    if (type === 'magnet') {
      this.vacuumPickups(player);
      return;
    }
    if (type === 'nuke') {
      this.triggerNuke(player);
      return;
    }
    if (type === 'fury') player.buffFury = Math.max(player.buffFury, def.duration);
    else if (type === 'vital') player.buffVital = Math.max(player.buffVital, def.duration);
    else if (type === 'haste') player.buffHaste = Math.max(player.buffHaste, def.duration);
    this.refreshBuffStats(player);
  }

  vacuumPickups(player: RunPlayer) {
    for (const p of this.pickups) {
      if (p.dead || p.kind === 'powerup') continue;
      p.magnet = true;
    }
  }

  triggerNuke(player: RunPlayer) {
    this.nuking = true;
    for (const a of this.animals.animals) {
      if (a.dead || a.boss) continue;
      this.animals.damageAnimal(a, a.maxHp + 9999, player, this.pickups, this.pools, {
        ...this.killCtx,
        fromSplit: true,
      });
    }
    for (const t of this.world.trees) {
      if (!t.isHittable()) continue;
      const res = this.world.damageTree(t, t.maxHp + 9999);
      if (res.killed && res.wood) this.spawnPickup('wood', t.x, t.y, res.wood);
    }
    this.nuking = false;
    this.vacuumPickups(player);
  }

  refreshBuffStats(player: RunPlayer) {
    const gear = gearBonuses(player.equipment);
    const baseRegen =
      (this.metaBonuses.regen || 0) + this.arsenal.passiveRegen() + gear.regen;
    const baseMove =
      1 + (this.metaBonuses.move || 0) + this.arsenal.passiveMoveBonus() + gear.move;
    const baseDmg =
      (1 + (this.metaBonuses.damagePct || 0)) * this.arsenal.passiveDamageBonus() * (1 + gear.might);
    applyBuffMultipliers(player, baseRegen, baseMove, baseDmg);
  }

  private hasteMult(player: RunPlayer) {
    return this.arsenal.passiveHaste() * (1 + (player.gearHaste || 0));
  }

  private areaMult(player: RunPlayer) {
    return this.arsenal.passiveArea() * (1 + (player.gearArea || 0));
  }

  calcDamage(base: number, element: ElementId | null, targetElement: ElementId | null, player: RunPlayer) {
    let dmg = base + player.flatDamage;
    dmg *= player.damageMult;
    dmg *= this.arsenal.passiveArea();
    if (element) {
      dmg += 2;
      dmg *= this.arsenal.elementMasteryBonus(element);
      dmg *= elementMult(element, targetElement);
    }
    if (Math.random() < player.crit) dmg *= 2;
    return dmg;
  }

  grantXp(player: RunPlayer, amount: number) {
    const greed = (this.arsenal.passives.greed || 0) * 0.18;
    player.xp += amount * (1 + greed);
    while (player.xp >= xpNeeded(player.level)) {
      player.xp -= xpNeeded(player.level);
      player.level++;
      this.onLevelUp();
    }
  }

  update(dt: number, player: RunPlayer) {
    if (player.buffFury > 0) player.buffFury = Math.max(0, player.buffFury - dt);
    if (player.buffVital > 0) player.buffVital = Math.max(0, player.buffVital - dt);
    if (player.buffHaste > 0) player.buffHaste = Math.max(0, player.buffHaste - dt);
    this.refreshBuffStats(player);

    if (!player.alive) return;
    const areaM = this.areaMult(player);
    const haste = this.hasteMult(player);

    for (const id of this.arsenal.weaponOrder) {
      const stats = this.arsenal.getWeaponStats(id);
      if (!stats) continue;
      const el = this.arsenal.weaponElements[id] || null;
      if (id === 'axe') this.updateAxe(dt, player, stats, el, areaM);
      else if (id === 'aura') this.updateAura(dt, player, stats, el, 'aura');
      else if (id === 'spikes') this.updateAura(dt, player, stats, el, 'spikes');
      else if (id === 'hatchet') this.updateShooter(dt, player, stats, el, id, haste);
      else if (id === 'crossbow') this.updateShooter(dt, player, stats, el, id, haste);
      else if (id === 'longbow') this.updateShooter(dt, player, stats, el, id, haste);
      else if (id === 'knife') this.updateKnife(dt, player, stats, el, haste);
      else if (id === 'pike') this.updatePike(dt, player, stats, el, haste);
      else if (id === 'saw') this.updateSaw(dt, player, stats, el, haste);
      else if (id === 'dynamite') this.updateDynamite(dt, player, stats, el, haste);
      else if (id === 'hammerfall') this.updateHammer(dt, player, stats, el, haste);
      else if (id === 'guarddog') this.updateDog(dt, player, stats, el);
    }

    this.updateProjectiles(dt, player);
    this.updatePickups(dt, player);
    this.updatePools(dt, player);
  }

  private tickWeapon(id: string, cd: number, dt: number) {
    const t = (this.weaponTimers[id] || 0) - dt;
    if (t > 0) {
      this.weaponTimers[id] = t;
      return false;
    }
    this.weaponTimers[id] = cd;
    return true;
  }

  private updateAxe(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, areaM: number) {
    const speed = (stats.speed as number) * this.arsenal.passiveHaste();
    this.axeAngle += speed * dt;
    const count = stats.count as number;
    const range = (stats.range as number) * areaM;
    const dmg = stats.dmg as number;
    for (let i = 0; i < count; i++) {
      const ang = this.axeAngle + (i / count) * TAU;
      const ax = player.x + Math.cos(ang) * range;
      const ay = player.y + Math.sin(ang) * range;
      this.hitArea(ax, ay, 22 * areaM, dmg, player, el, true);
    }
  }

  private updateAura(
    dt: number,
    player: RunPlayer,
    stats: Record<string, number>,
    el: ElementId | null,
    key: string,
  ) {
    const tick = (stats.tick as number) / this.arsenal.passiveHaste();
    if (!this.tickWeapon(key, tick, dt)) return;
    const r = (stats.radius as number) * this.arsenal.passiveArea();
    const dmg = stats.dmg as number;
    this.hitArea(player.x, player.y, r, dmg, player, el, false);
  }

  private updateShooter(
    dt: number,
    player: RunPlayer,
    stats: Record<string, number>,
    el: ElementId | null,
    id: WeaponId,
    haste: number,
  ) {
    const cd = ((stats.cd as number) || 1) / haste;
    const count = (stats.count as number) + (this.arsenal.passives.amount || 0);
    if (!this.tickWeapon(id, cd / count, dt)) return;
    const target = this.animals.nearest(player.x, player.y, stats.range as number);
    if (!target) return;
    const ang = Math.atan2(target.y - player.y, target.x - player.x);
    const speed = stats.speed as number;
    this.spawnProjectile(
      player.x, player.y,
      Math.cos(ang) * speed, Math.sin(ang) * speed,
      stats.dmg as number, stats.pierce as number || 1, 1.2, el,
      id === 'hatchet' ? 'hatchet' : 'particle',
    );
    Audio.playSfx('hit', 0.9 + Math.random() * 0.2);
  }

  private updateKnife(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, haste: number) {
    const cd = (stats.cd as number) / haste;
    if (!this.tickWeapon('knife', cd, dt)) return;
    const count = stats.count as number;
    const cone = stats.cone as number;
    const base = Math.atan2(player.vy || 0.001, player.vx || 1);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * cone;
      const ang = base + t;
      const speed = stats.speed as number;
      this.spawnProjectile(
        player.x, player.y,
        Math.cos(ang) * speed, Math.sin(ang) * speed,
        stats.dmg as number, stats.pierce as number || 1, 0.9, el, 'particle',
      );
    }
  }

  private updatePike(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, haste: number) {
    const cd = (stats.cd as number) / haste;
    if (!this.tickWeapon('pike', cd, dt)) return;
    const ang = player.aimAngle;
    const len = stats.len as number;
    const hits = stats.pierce as number;
    let hit = 0;
    for (const a of this.animals.animals) {
      if (a.dead || hit >= hits) break;
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      const along = dx * Math.cos(ang) + dy * Math.sin(ang);
      if (along < 0 || along > len) continue;
      const perp = Math.abs(dx * Math.sin(ang) - dy * Math.cos(ang));
      if (perp > a.radius + 12) continue;
      this.damageAnimal(a, stats.dmg as number, player, el);
      hit++;
    }
  }

  private updateSaw(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, haste: number) {
    const cd = (stats.cd as number) / haste;
    if (!this.tickWeapon('saw', cd, dt)) return;
    const ang = player.aimAngle;
    const dist = stats.dist as number;
    const tx = player.x + Math.cos(ang) * dist;
    const ty = player.y + Math.sin(ang) * dist;
    this.spawnProjectile(tx, ty, -Math.cos(ang) * 200, -Math.sin(ang) * 200, stats.dmg as number, 99, 1.8, el, 'axe', true);
  }

  private updateDynamite(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, haste: number) {
    const cd = (stats.cd as number) / haste;
    if (!this.tickWeapon('dynamite', cd, dt)) return;
    const target = this.animals.nearest(player.x, player.y, 400);
    const tx = target ? target.x : player.x + rand(-80, 80);
    const ty = target ? target.y : player.y + rand(-80, 80);
    const r = (stats.radius as number) * this.arsenal.passiveArea();
    this.hitArea(tx, ty, r, stats.dmg as number, player, el, true);
    const boom = this.scene.add.circle(tx, ty, r, 0xffaa44, 0.35).setDepth(20);
    this.fx.add(boom);
    this.scene.time.delayedCall(200, () => boom.destroy());
  }

  private updateHammer(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null, haste: number) {
    const cd = (stats.cd as number) / haste;
    if (!this.tickWeapon('hammerfall', cd, dt)) return;
    const target = this.animals.nearest(player.x, player.y, stats.range as number);
    if (!target) return;
    const r = (stats.radius as number) * this.arsenal.passiveArea();
    this.hitArea(target.x, target.y, r, stats.dmg as number, player, el, false);
  }

  private updateDog(dt: number, player: RunPlayer, stats: Record<string, number>, el: ElementId | null) {
    if (!this.dog) {
      this.dog = { x: player.x, y: player.y, life: stats.duration as number, cd: 0, spawnCd: stats.spawnCd as number };
    }
    this.dog.spawnCd -= dt;
    if (this.dog.spawnCd <= 0 && this.dog.life <= 0) {
      this.dog.life = stats.duration as number;
      this.dog.spawnCd = stats.spawnCd as number;
      this.dog.x = player.x;
      this.dog.y = player.y;
    }
    if (this.dog.life <= 0) return;
    this.dog.life -= dt;
    const target = this.animals.nearest(this.dog.x, this.dog.y, 280);
    if (target) {
      const dx = target.x - this.dog.x;
      const dy = target.y - this.dog.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = stats.speed as number;
      this.dog.x += (dx / d) * sp * dt;
      this.dog.y += (dy / d) * sp * dt;
      if (d < target.radius + 14) {
        this.dog.cd -= dt;
        if (this.dog.cd <= 0) {
          this.dog.cd = stats.biteCd as number;
          this.damageAnimal(target, stats.dmg as number, player, el);
        }
      }
    } else {
      const dx = player.x - this.dog.x;
      const dy = player.y - this.dog.y;
      const d = Math.hypot(dx, dy) || 1;
      this.dog.x += (dx / d) * 180 * dt;
      this.dog.y += (dy / d) * 180 * dt;
    }
  }

  private spawnProjectile(
    x: number, y: number, vx: number, vy: number,
    dmg: number, pierce: number, life: number, el: ElementId | null, tex: string, boomerang = false,
  ) {
    const gfx = this.scene.add.image(x, y, tex).setDepth(15).setScale(0.8);
    this.fx.add(gfx);
    this.projectiles.push({ x, y, vx, vy, dmg, pierce, life, r: 10, element: el, dead: false, gfx, ...(boomerang ? { boomerang: true } : {}) } as Proj & { boomerang?: boolean });
  }

  private updateProjectiles(dt: number, player: RunPlayer) {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.gfx.setPosition(p.x, p.y);
      if (p.life <= 0) p.dead = true;
      for (const a of this.animals.animals) {
        if (a.dead || p.pierce <= 0) continue;
        if (dist2(p.x, p.y, a.x, a.y) < (p.r + a.radius) * (p.r + a.radius)) {
          this.damageAnimal(a, p.dmg, player, p.element);
          p.pierce--;
        }
      }
      const statics = this.world.queryStatic(p.x, p.y, 24);
      for (const s of statics) {
        if (!s.isHittable()) continue;
        if (dist2(p.x, p.y, s.x, s.y) < (p.r + s.radius) * (p.r + s.radius)) {
          this.hitStatic(s, p.dmg, player.x, player.y);
          p.pierce--;
        }
      }
    }
    compactInPlace(this.projectiles, (p) => {
      if (p.dead) p.gfx.destroy();
      return p.dead;
    });
  }

  hitArea(x: number, y: number, r: number, baseDmg: number, player: RunPlayer, el: ElementId | null, chopTrees: boolean) {
    this.animals.queryNear(x, y, r, this._near);
    for (const a of this._near) {
      const cd = this.hitCdAnimal.get(a.uid) || 0;
      if (cd > 0) continue;
      this.hitCdAnimal.set(a.uid, HIT_COOLDOWN);
      this.damageAnimal(a, baseDmg, player, el);
    }
    if (chopTrees) {
      const statics = this.world.queryStatic(x, y, r);
      for (const s of statics) {
        const cd = this.hitCdStatic.get(s) || 0;
        if (cd > 0) continue;
        if (dist2(x, y, s.x, s.y) > (r + s.radius) * (r + s.radius)) continue;
        this.hitCdStatic.set(s, HIT_COOLDOWN);
        this.hitStatic(s, baseDmg, player.x, player.y);
      }
    }
    for (const [k, v] of this.hitCdAnimal) {
      if (v > 0) this.hitCdAnimal.set(k, v - 0.016);
    }
    for (const s of this.hitCdStatic.keys()) {
      const v = (this.hitCdStatic.get(s) || 0) - 0.016;
      if (v <= 0) this.hitCdStatic.delete(s);
      else this.hitCdStatic.set(s, v);
    }
  }

  private damageAnimal(a: AnimalEntity, baseDmg: number, player: RunPlayer, el: ElementId | null) {
    const dmg = this.calcDamage(baseDmg, el, null, player);
    const killed = this.animals.damageAnimal(a, dmg, player, this.pickups, this.pools, this.killCtx);
    if (killed && (player.gearLifesteal || 0) > 0) {
      player.hp = Math.min(player.maxHp, player.hp + dmg * (player.gearLifesteal || 0));
    }
    Audio.playSfx('hit', 1);
  }

  private hitStatic(s: StaticEntity, dmg: number, px: number, py: number) {
    if (s.type === 'tree') {
      const res = this.world.damageTree(s, dmg);
      if (res.killed && res.wood) {
        this.spawnPickup('wood', s.x, s.y, res.wood);
        Audio.playSfx('chop');
      }
    } else if (s.type === 'rock') {
      const res = this.world.damageRock(s, dmg);
      if (res.gold) this.spawnPickup('gold', s.x, s.y, res.gold);
      if (res.killed) Audio.playSfx('chop');
    }
  }

  private updatePickups(dt: number, player: RunPlayer) {
    const magnet = player.magnetR;
    for (const p of this.pickups) {
      if (p.dead) continue;
      const d2 = dist2(p.x, p.y, player.x, player.y);
      const pickR = 22;
      if (d2 < pickR * pickR || (p.magnet && d2 < magnet * magnet * 4)) {
        if (p.kind === 'powerup' && p.powerupId) this.activatePowerup(p.powerupId, player);
        else if (p.kind === 'xp') this.grantXp(player, p.amount);
        else if (p.kind === 'wood') player.wood += p.amount;
        else if (p.kind === 'meat') player.meat += p.amount;
        else if (p.kind === 'gold') player.gold += p.amount;
        p.dead = true;
        continue;
      }
      if (p.magnet || d2 < magnet * magnet) {
        const d = Math.sqrt(d2) || 1;
        const pull = p.magnet ? 2200 * dt : 420 * dt;
        p.x += ((player.x - p.x) / d) * pull;
        p.y += ((player.y - p.y) / d) * pull;
      } else {
        p.vy += 180 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    compactInPlace(this.pickups, (p) => p.dead);
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
