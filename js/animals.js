'use strict';

/**
 * Base stats per species. Health and damage are multiplied by the current
 * threat level when an animal spawns, so later spawns are stronger.
 */
/** Global multiplier — every species' listed aggro is doubled in combat. */
const AGGRO_RANGE_MULT = 2;

const SPECIES = {
  boar: {
    name: 'Boar', radius: 17, hp: 34, dmg: 6, wander: 42, chase: 125, aggro: 260,
    windup: 0.5, lungeSpeed: 340, lungeTime: 0.2, cooldown: 1.1, kb: 280, stagger: true,
    meat: [1, 2], goldChance: 0.7, gold: 1, xp: 6, height: 32, bodyOff: 8, eye: [17.5, -16],
    color: '#7d4b2c',
  },
  dire_boar: {
    name: 'Dire Boar', family: 'boar', radius: 19, hp: 58, dmg: 10, wander: 40, chase: 132, aggro: 280,
    windup: 0.48, lungeSpeed: 360, lungeTime: 0.22, cooldown: 1.0, kb: 300, stagger: true,
    meat: [2, 3], goldChance: 0.85, gold: 2, xp: 12, height: 36, bodyOff: 9, eye: [17.5, -16],
    color: '#4a2a18', shade: '#1e120c', belly: '#8a5a3a',
  },
  wolf: {
    name: 'Wolf', radius: 14, hp: 24, dmg: 5, wander: 60, chase: 165, aggro: 340,
    windup: 0.3, lungeSpeed: 400, lungeTime: 0.16, cooldown: 0.8, kb: 320, stagger: true,
    meat: [1, 1], goldChance: 0.5, gold: 1, xp: 5, height: 32, bodyOff: 9, eye: [16.5, -21.5],
    color: '#7d8590',
  },
  dire_wolf: {
    name: 'Dire Wolf', family: 'wolf', radius: 16, hp: 42, dmg: 9, wander: 58, chase: 178, aggro: 380,
    windup: 0.28, lungeSpeed: 430, lungeTime: 0.17, cooldown: 0.72, kb: 360, stagger: true,
    meat: [1, 2], goldChance: 0.7, gold: 2, xp: 10, height: 36, bodyOff: 10, eye: [16.5, -21.5],
    color: '#3a4250', shade: '#1c222c', belly: '#6a7484',
  },
  bear: {
    name: 'Bear', radius: 25, hp: 170, dmg: 16, wander: 34, chase: 98, aggro: 230,
    windup: 0.75, lungeSpeed: 230, lungeTime: 0.25, cooldown: 1.5, kb: 110, stagger: false,
    meat: [3, 5], goldChance: 1, gold: 3, xp: 22, height: 48, bodyOff: 16, eye: [22.5, -27],
    color: '#6b4527',
  },
  dire_bear: {
    name: 'Dire Bear', family: 'bear', radius: 28, hp: 260, dmg: 22, wander: 32, chase: 105, aggro: 260,
    windup: 0.7, lungeSpeed: 250, lungeTime: 0.26, cooldown: 1.35, kb: 130, stagger: false,
    meat: [4, 7], goldChance: 1, gold: 5, xp: 34, height: 52, bodyOff: 17, eye: [22.5, -27],
    color: '#3a2418', shade: '#1a100c', belly: '#6a4830',
  },
  deer: {
    name: 'Deer', radius: 15, hp: 22, dmg: 6, wander: 38, chase: 145, aggro: 280,
    windup: 0.35, lungeSpeed: 370, lungeTime: 0.16, cooldown: 0.95, kb: 300, stagger: true,
    meat: [2, 3], goldChance: 0.15, gold: 1, xp: 4, height: 60, bodyOff: 20, eye: [19.5, -46],
    color: '#c08a52',
    bossCombat: { dmg: 9, chase: 155, aggro: 360, windup: 0.32, lungeSpeed: 390, lungeTime: 0.16, cooldown: 0.9 },
  },
  fox: {
    name: 'Fox', radius: 12, hp: 16, dmg: 5, wander: 50, chase: 175, aggro: 300,
    windup: 0.22, lungeSpeed: 400, lungeTime: 0.14, cooldown: 0.75, kb: 340, stagger: true,
    meat: [1, 2], goldChance: 0.12, gold: 1, xp: 3, height: 28, bodyOff: 10, eye: [14, -18],
    color: '#d4783a',
    bossCombat: { dmg: 8, chase: 190, aggro: 380, windup: 0.2, lungeSpeed: 420, lungeTime: 0.14, cooldown: 0.7 },
  },
  squirrel: {
    name: 'Squirrel', radius: 9, hp: 9, dmg: 4, wander: 60, chase: 205, aggro: 220,
    windup: 0.18, lungeSpeed: 380, lungeTime: 0.14, cooldown: 0.7, kb: 380, stagger: true,
    meat: [0, 1], goldChance: 0.08, gold: 1, xp: 1, height: 30, bodyOff: 7, eye: [9, -15.5],
    color: '#b5652b',
  },
  rat: {
    name: 'Rat', radius: 10, hp: 12, dmg: 5, wander: 58, chase: 198, aggro: 250,
    windup: 0.2, lungeSpeed: 400, lungeTime: 0.13, cooldown: 0.68, kb: 370, stagger: true,
    meat: [0, 1], goldChance: 0.12, gold: 1, xp: 2, height: 22, bodyOff: 6, eye: [12, -11.5],
    color: '#6a5548',
    blurb: 'Small, fast pack pests. Quick lunges and sharp bites.',
  },
  raccoon: {
    name: 'Raccoon', radius: 13, hp: 22, dmg: 6, wander: 50, chase: 150, aggro: 260,
    windup: 0.32, lungeSpeed: 300, lungeTime: 0.14, cooldown: 1.05, kb: 280, stagger: true,
    meat: [0, 1], goldChance: 0.2, gold: 1, xp: 2, height: 28, bodyOff: 9, eye: [14.5, -16.8],
    color: '#7a7d82',
    ranged: true, range: 320, preferRange: 210, shotSpeed: 290, shotRadius: 8,
    shotKind: 'rock', shotColor: '#9a9088', shotSpin: 6, shotCount: 5, shotSpread: 0.22,
    bossCombat: { dmg: 9, chase: 160, aggro: 360, windup: 0.28, cooldown: 0.85, range: 380, preferRange: 230, shotSpeed: 330 },
  },
  duck: {
    name: 'Duck', radius: 10, hp: 11, dmg: 3, wander: 55, chase: 175, aggro: 220,
    windup: 0.2, lungeSpeed: 320, lungeTime: 0.15, cooldown: 0.75, kb: 300, stagger: true,
    meat: [0, 1], goldChance: 0.1, gold: 1, xp: 1, height: 24, bodyOff: 8, eye: [12, -14],
    color: '#4a7a3a',
  },
  sheep: {
    name: 'Sheep', radius: 15, hp: 28, dmg: 5, wander: 36, chase: 100, aggro: 300,
    windup: 0.28, lungeSpeed: 220, lungeTime: 0.14, cooldown: 0.72, kb: 260, stagger: true,
    meat: [2, 3], goldChance: 0.25, gold: 1, xp: 5, height: 34, bodyOff: 12, eye: [16, -20],
    color: '#efe8dc',
    ranged: true, range: 340, preferRange: 230, shotSpeed: 280, shotRadius: 12,
    shotKind: 'wool', shotColor: '#f7f2ea', shotSpin: 4,
    bossCombat: { dmg: 9, chase: 115, aggro: 380, windup: 0.24, cooldown: 0.58, range: 400, preferRange: 250, shotSpeed: 320 },
  },
  beaver: {
    name: 'Beaver', radius: 14, hp: 36, dmg: 7, wander: 40, chase: 110, aggro: 290,
    windup: 0.48, lungeSpeed: 240, lungeTime: 0.16, cooldown: 1.25, kb: 280, stagger: true,
    meat: [1, 2], goldChance: 0.35, gold: 1, xp: 7, height: 30, bodyOff: 11, eye: [15, -17],
    color: '#7a4a28',
    ranged: true, range: 360, preferRange: 250, shotSpeed: 300, shotRadius: 11,
    shotKind: 'log', shotColor: '#8a5a2a', shotSpin: 7,
    bossCombat: { dmg: 11, chase: 120, aggro: 370, windup: 0.4, cooldown: 1.05, range: 420, preferRange: 270, shotSpeed: 340 },
  },
};

/** Daytime kill-triggered boss candidates (species id → display). */
const DAY_BOSS_SPECIES = [
  'boar', 'wolf', 'bear', 'deer', 'fox', 'squirrel', 'rat', 'raccoon', 'duck', 'sheep', 'beaver',
  'dire_boar', 'dire_wolf', 'dire_bear',
];

const BOSS_NAMES = {
  boar: 'Tusk the Great Boar',
  dire_boar: 'Gorefang the Dire',
  wolf: 'Alpha Wolf',
  dire_wolf: 'Nighthowl',
  bear: 'Grizzly King',
  dire_bear: 'Ursa Dread',
  deer: 'Hart of the Grove',
  fox: 'Reynard the Cunning',
  squirrel: 'Nutlord Supreme',
  rat: 'The Rat King',
  raccoon: 'Bandit King',
  duck: 'Drake of the Pond',
  sheep: 'Woolly Terror',
  beaver: 'Dambreaker',
};

function animalFamily(species) {
  const sp = SPECIES[species];
  return (sp && sp.family) || species;
}

function isPassiveSpecies(species) {
  return false;
}

function isBearish(species) { return animalFamily(species) === 'bear'; }
function isWolfish(species) { return animalFamily(species) === 'wolf'; }
function isBoarish(species) { return animalFamily(species) === 'boar'; }
function isTinyPest(species) { return species === 'squirrel' || species === 'duck' || species === 'rat'; }

const NO_MULT = { hp: 1, dmg: 1, speed: 1 };

/**
 * Affliction / elite overlays on any species (orthogonal to dire_* forms,
 * veterancy stars, and elements).
 *  - basic: default look & stats
 *  - dire: darker brute (generic; not the same as dire_boar species)
 *  - necromantic: undead green-gray
 *  - demonic: crimson with back spikes
 */
const ANIMAL_VARIANTS = {
  basic: {
    id: 'basic', name: 'Basic',
    hp: 1, dmg: 1, speed: 1, xp: 1, loot: 1,
  },
  dire: {
    id: 'dire', name: 'Dire',
    hp: 1.4, dmg: 1.22, speed: 0.96, xp: 1.35, loot: 1.3,
    filter: 'brightness(0.66) saturate(0.7) contrast(1.18)',
    bar: '#8a6040',
  },
  necromantic: {
    id: 'necromantic', name: 'Necromantic',
    hp: 1.35, dmg: 1.12, speed: 0.92, xp: 1.45, loot: 1.28,
    filter: 'saturate(0.2) hue-rotate(100deg) brightness(0.92) contrast(1.08)',
    bar: '#6dd4a0',
  },
  demonic: {
    id: 'demonic', name: 'Demonic',
    hp: 1.55, dmg: 1.38, speed: 1.04, xp: 1.6, loot: 1.45,
    filter: 'sepia(0.45) hue-rotate(-18deg) saturate(2.4) brightness(0.72) contrast(1.22)',
    bar: '#ff4a3a',
  },
};

const VARIANT_IDS = ['basic', 'dire', 'necromantic', 'demonic'];

function variantMult(variant) {
  const v = ANIMAL_VARIANTS[variant] || ANIMAL_VARIANTS.basic;
  return { hp: v.hp, dmg: v.dmg, speed: v.speed, xp: v.xp, loot: v.loot };
}

/**
 * Roll an affliction variant. Higher threat → more dire / necro / demonic.
 * Swarms stay mostly basic.
 */
function rollAnimalVariant(threatM, opts = {}) {
  if (opts.variant) return opts.variant;
  if (opts.swarm && Math.random() > 0.2) return 'basic';
  const m = Math.max(0, threatM || 0);
  const boss = !!opts.boss;
  const raider = !!opts.raider;
  const big = !!opts.big;

  const demonicP = clamp(0.015 + m * 0.014 + (boss ? 0.1 : 0) + (raider ? 0.025 : 0), 0, 0.24);
  const necroP = clamp(0.03 + m * 0.02 + (boss ? 0.12 : 0) + (raider ? 0.04 : 0), 0, 0.3);
  const direP = clamp(0.07 + m * 0.028 + (big ? 0.12 : 0) + (boss ? 0.08 : 0) + (raider ? 0.05 : 0), 0, 0.4);

  const r = Math.random();
  if (r < demonicP) return 'demonic';
  if (r < demonicP + necroP) return 'necromantic';
  // Already-dire species skip the generic "Dire" overlay so names don't double up.
  if (r < demonicP + necroP + direP) {
    if (opts.species && String(opts.species).startsWith('dire_')) return 'basic';
    return 'dire';
  }
  return 'basic';
}

function variantDisplayName(baseName, variant) {
  const v = ANIMAL_VARIANTS[variant];
  if (!v || variant === 'basic') return baseName;
  if (variant === 'dire' && /^Dire\b/i.test(baseName)) return baseName;
  return v.name + ' ' + baseName;
}

class Animal {
  constructor(species, x, y, opts = {}) {
    const base = SPECIES[species];
    const mult = opts.mult || NO_MULT;
    this.type = 'animal';
    this.species = species;
    this.boss = !!opts.boss;
    this.trueBoss = !!opts.trueBoss;
    this.raider = !!opts.raider;
    /** Daytime assault-wave sieger (also sets raider so AI marches on camp). */
    this.assault = !!opts.assault;
    // Daytime champions (boss, not a night raider) always hunt the player or camp.
    this.dayBoss = !!opts.dayBoss || (this.boss && !this.raider && !this.trueBoss);
    // Boss forms can roll stronger combat overrides.
    this.sp = (this.boss && base.bossCombat) ? Object.assign({}, base, base.bossCombat) : base;
    const sp = this.sp;
    this.x = x; this.y = y;
    this.homeX = x; this.homeY = y;
    this.swarm = !!opts.swarm;
    this.big = !!opts.big && isBoarish(species) && !this.boss;
    this.variant = VARIANT_IDS.includes(opts.variant) ? opts.variant : 'basic';
    // Generic "Dire" overlay on an already-dire species — promote to necro/demonic instead.
    if (this.variant === 'dire' && String(species).startsWith('dire_')) {
      const r = Math.random();
      this.variant = r < 0.4 ? 'demonic' : r < 0.75 ? 'necromantic' : 'basic';
    }
    this.name = this.boss
      ? (BOSS_NAMES[species] || sp.name)
      : variantDisplayName(sp.name, this.variant);
    this.scale = this.trueBoss ? (isBearish(species) ? 2.15 : 2.55)
      : this.boss ? (isBearish(species) ? 1.7 : isTinyPest(species) ? 2.6 : 2.1)
      : this.big ? 1.4 : 1;
    if (this.variant === 'demonic') this.scale *= 1.06;
    else if (this.variant === 'dire') this.scale *= 1.04;
    this.radius = sp.radius * this.scale;
    this.height = sp.height * this.scale;
    this.bodyOff = sp.bodyOff * this.scale;
    this.stars = clamp(opts.stars != null ? opts.stars : 0, 0, typeof STAR_MAX === 'number' ? STAR_MAX : 15);
    this.element = opts.element || null;
    const sm = starMult(this.stars);
    const vm = variantMult(this.variant);
    this.maxHp = opts.maxHp || Math.round(sp.hp * (this.big ? 3.2 : 1) * mult.hp * sm.hp * vm.hp);
    this.hp = this.maxHp;
    this.attackDamage = Math.round(sp.dmg * (this.big ? 2 : 1) * (this.boss ? 2.5 : 1) * mult.dmg * sm.dmg * vm.dmg);
    this.wanderSpeed = sp.wander * sm.speed * vm.speed;
    this.chaseSpeed = sp.chase * (this.big ? 0.85 : 1) * (this.boss ? 0.8 : 1) * mult.speed * sm.speed * vm.speed;
    this.kbResist = this.boss ? 0.92 : this.big ? 0.4 : 0;
    this.xpMult = sm.xp * vm.xp;
    this.lootMult = sm.loot * vm.loot;
    this.passive = false;
    this.aggressive = true;
    this.leaving = false;
    this.age = 0;
    this.angry = 0;
    this.state = (this.raider || this.dayBoss) ? 'march' : this.swarm ? 'chase' : 'wander';
    this.stateT = rand(0.5, 2);
    this.dirX = 0; this.dirY = 0;
    this.vx = 0; this.vy = 0;
    this.kx = 0; this.ky = 0;
    this.lx = 0; this.ly = 0;
    this.lungeHit = false;
    this.rangedShot = false;
    this.strikeTarget = null;
    this.blockWall = null;
    this.bestCoreD = Infinity;
    this.stuckT = 0;
    this.detourT = 0;
    this.detourSide = 1;
    this.ghostT = 0;
    this.attackCd = 0;
    this.fleeT = 0;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.walkTime = Math.random() * 10;
    this.moving = false;
    this.flash = 0;
    this.dead = false;
    this.remove = false;
    this.deathT = 0;
    this.hitLog = new Map();
    this.burns = [];
    this.burnAcc = 0;
    this.slow = 0;
    this.slowT = 0;
    this.lastHit = null;
    initAnimalAbilities(this, opts);
  }

  isHostile(game) { return !this.dead && this.aggressive; }

  /** Hostile animals are valid tower targets; raiders always are. */
  isThreat() { return !this.dead && this.aggressive; }

  /** Siege the camp (walls / cabin), not just the player. */
  canSiege(game) {
    return !this.swarm && !this.leaving && game.base && game.base.core && game.base.core.alive;
  }

  damage(amount, game, hx, hy, kbScale = 1) {
    if (this.dead) return false;
    this.hp -= amount;
    this.flash = 0.12;
    this.angry = 14;
    let dx = this.x - hx, dy = this.y - this.bodyOff - hy;
    let d = Math.hypot(dx, dy);
    if (d < 1) { dx = this.x - game.player.x; dy = this.y - game.player.y; d = Math.hypot(dx, dy) || 1; }
    const kb = this.sp.kb * (1 - this.kbResist) * kbScale;
    this.kx += (dx / d) * kb;
    this.ky += (dy / d) * kb;
    if (this.sp.stagger && !this.boss && (this.state === 'windup' || this.state === 'lunge')) {
      this.state = 'recover';
      this.stateT = 0.35;
      this.attackCd = 0.4;
    }
    if (!game.nuking) {
      game.fx.hitPuff(hx, hy - 10, 5);
      Sound.play('hit', rand(0.9, 1.1));
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathT = 0;
      game.onAnimalKilled(this);
      return true;
    }
    return false;
  }

  /** Fire DoT — no knockback, no hit-flash (embers + float text carry the feedback). */
  applyBurnDamage(amount, game) {
    if (this.dead || amount < 1) return;
    this.lastHit = { dealt: amount, element: 'fire', weaponId: null, source: 'burn' };
    this.hp -= amount;
    if (!game.nuking && Math.random() < 0.35) {
      game.addText(this.x + rand(-8, 8), this.y - this.height, String(amount), '#ff6a3d', 12, { life: 0.5, vy: -20 });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathT = 0;
      game.onAnimalKilled(this);
    }
  }

  tickStatuses(dt, game) {
    if (this.slowT > 0) {
      this.slowT -= dt;
      if (this.slowT <= 0) { this.slowT = 0; this.slow = 0; }
    }
    if (!this.burns.length) { this.burnAcc = 0; return; }
    let dps = 0;
    for (let i = this.burns.length - 1; i >= 0; i--) {
      const b = this.burns[i];
      b.life -= dt;
      dps += b.dps;
      if (b.life <= 0) this.burns.splice(i, 1);
    }
    if (dps <= 0) return;
    this.burnAcc += dps * dt;
    if (this.burnAcc >= 1) {
      const dmg = Math.floor(this.burnAcc);
      this.burnAcc -= dmg;
      this.applyBurnDamage(dmg, game);
    }
    if (Math.random() < dt * 8) {
      game.particles.spawn({
        x: this.x + rand(-8, 8), y: this.y, z: this.bodyOff + rand(4, 16),
        vx: rand(-15, 15), vy: 0, vz: rand(20, 50), g: -20,
        life: rand(0.25, 0.45), size: rand(1.5, 3), color: Math.random() < 0.5 ? '#ff6a3d' : '#ffb347', drag: 1,
      });
    }
  }

  update(dt, game) {
    if (this.flash > 0) this.flash -= dt;
    const kd = Math.exp(-7 * dt);
    if (this.dead) {
      this.deathT += dt;
      this.x += this.kx * dt; this.y += this.ky * dt;
      this.kx *= kd; this.ky *= kd;
      if (this.deathT > 1.0) this.remove = true;
      return;
    }
    this.tickStatuses(dt, game);
    if (this.dead) return;
    if (this.angry > 0) this.angry -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.abilityCd > 0) this.abilityCd -= dt;
    if (this.inspireT > 0) {
      this.inspireT -= dt;
      if (this.inspireT <= 0) { this.inspireT = 0; this.inspireMul = 1; }
    }
    if (this.bossMoveCd) {
      for (const id in this.bossMoveCd) {
        if (this.bossMoveCd[id] > 0) this.bossMoveCd[id] -= dt;
      }
    }

    const p = game.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;
    let tv;

    if (this.swarm && !this.leaving) {
      this.age += dt;
      if (d > 1800 || this.age > 60) this.leaving = true;
    }
    if (this.leaving) {
      tv = [(-dx / d) * this.wanderSpeed * 2.2, (-dy / d) * this.wanderSpeed * 2.2];
      if (d > 900) this.remove = true;
    } else if (this.passive) {
      tv = this.updateDeer(dt, p, dx, dy, d);
    } else if (this.ability) {
      tv = updateAnimalAbility(this, dt, game, dx, dy, d);
    } else {
      tv = this.updateHostile(dt, game, dx, dy, d);
    }
    const slowMul = this.slowT > 0 ? (1 - this.slow) : 1;
    const snap = this.state === 'lunge' || (this.ability && (this.ability.id === 'elem_charge' || this.ability.id === 'boss_charge' || this.ability.id === 'boss_fireground'));
    this.integrate(dt, game, tv[0] * slowMul, tv[1] * slowMul, snap, kd);
  }

  wanderVelocity(dt) {
    this.stateT -= dt;
    if (this.stateT <= 0) {
      this.stateT = rand(1.4, 3.4);
      const hx = this.homeX - this.x, hy = this.homeY - this.y;
      const hd = Math.hypot(hx, hy);
      if (hd > 320) { this.dirX = hx / hd; this.dirY = hy / hd; }
      else if (Math.random() < 0.35) { this.dirX = 0; this.dirY = 0; }
      else { const a = Math.random() * TAU; this.dirX = Math.cos(a); this.dirY = Math.sin(a); }
    }
    return [this.dirX * this.wanderSpeed, this.dirY * this.wanderSpeed];
  }

  updateDeer(dt, p, dx, dy, d) {
    const scared = p.alive && (d < 230 || this.angry > 0);
    if (this.state === 'tired') {
      this.stateT -= dt;
      if (this.stateT <= 0) { this.state = 'wander'; this.stateT = 0.2; }
      return [(-dx / d) * 55, (-dy / d) * 55];
    }
    if (scared) {
      if (this.state !== 'flee') { this.state = 'flee'; this.fleeT = 0; }
      this.fleeT += dt;
      if (this.fleeT > 2.6) { this.state = 'tired'; this.stateT = 1.7; }
      const wob = Math.sin(this.walkTime * 0.3) * 0.35;
      const ax = -dx / d, ay = -dy / d;
      return [(ax - ay * wob) * this.sp.flee, (ay + ax * wob) * this.sp.flee];
    }
    if (this.state === 'flee') { this.state = 'wander'; this.stateT = 0.5; this.homeX = this.x; this.homeY = this.y; }
    return this.wanderVelocity(dt);
  }

  updateHostile(dt, game, dx, dy, d) {
    const p = game.player;
    const hostile = this.isHostile(game);
    const night = game.isNight();
    const core = game.base.core;
    const cdx = core.x - this.x, cdy = core.y - this.y;
    const cd = Math.hypot(cdx, cdy) || 0.001;
    const baseAggro = Math.max(80, this.sp.aggro || 200);
    const aggroR = (this.angry > 0 ? baseAggro * 1.6 : baseAggro) * AGGRO_RANGE_MULT * (night ? 1.35 : 1);
    let engageR = aggroR;
    if (this.swarm) engageR = 1e9;
    else if (this.trueBoss) engageR = Math.max(920, aggroR);
    else if (this.dayBoss || this.boss) engageR = Math.max(720, aggroR);
    else if (this.raider) engageR = aggroR;

    const siege = this.canSiege(game);
    const playerLive = p.alive;
    const playerInAggro = hostile && playerLive && d < aggroR;
    const baseInAggro = siege && cd < aggroR * (this.dayBoss || this.raider || this.boss ? 1.6 : 1.2);
    // Prefer the player when clearly closer; otherwise press the camp.
    const preferPlayer = playerInAggro && (!baseInAggro || d <= cd * 0.92);

    let tvx = 0, tvy = 0;

    switch (this.state) {
      case 'wander': {
        const v = this.wanderVelocity(dt);
        tvx = v[0]; tvy = v[1];
        if (preferPlayer) {
          this.state = 'chase';
          if (d < 520) Sound.play(isWolfish(this.species) ? 'growl' : isBearish(this.species) ? 'roar' : 'grunt');
        } else if (baseInAggro) {
          this.state = 'march';
          this.bestCoreD = cd;
        }
        break;
      }
      case 'march': {
        if (preferPlayer && d < engageR) { this.state = 'chase'; break; }
        if (!siege) {
          this.state = playerInAggro ? 'chase' : 'wander';
          break;
        }
        const target = this.blockWall && this.blockWall.alive ? this.blockWall : core;
        const tx = target.x - this.x, ty = target.y - this.y;
        const td = Math.hypot(tx, ty) || 1;
        let dirX = tx / td, dirY = ty / td;
        this.trackProgress(dt, core, target !== core || td < 160);
        if (this.detourT > 0) {
          this.detourT -= dt;
          const c = Math.cos(1.2 * this.detourSide), s = Math.sin(1.2 * this.detourSide);
          const rx = dirX * c - dirY * s;
          dirY = dirX * s + dirY * c;
          dirX = rx;
        }
        const marchSpd = this.chaseSpeed * (this.dayBoss ? 0.92 : 0.8);
        tvx = dirX * marchSpd;
        tvy = dirY * marchSpd;
        if (this.sp.ranged && playerLive && d < (this.sp.range || 320) && this.attackCd <= 0) {
          this.state = 'windup';
          this.stateT = this.sp.windup;
          this.strikeTarget = null;
          this.rangedShot = true;
          break;
        }
        if (td < this.radius + target.solidR + 14 && this.attackCd <= 0 && target.alive) {
          this.state = 'windup';
          this.stateT = this.sp.windup;
          this.strikeTarget = target;
          this.rangedShot = false;
        }
        break;
      }
      case 'chase': {
        if (!hostile || !playerLive || d > engageR + 180) {
          if (baseInAggro || this.raider || this.dayBoss || this.boss) this.state = 'march';
          else {
            this.state = 'wander';
            this.stateT = rand(0.5, 1.5);
            this.homeX = this.x; this.homeY = this.y;
          }
          break;
        }
        // Switch to the cabin if the player runs far while the camp is closer.
        if (siege && baseInAggro && cd + 40 < d && d > 160) {
          this.state = 'march';
          break;
        }
        if (this.blockWall && this.blockWall.alive && this.attackCd <= 0) {
          this.state = 'windup';
          this.stateT = this.sp.windup;
          this.strikeTarget = this.blockWall;
          this.rangedShot = false;
          break;
        }
        if (tryStartAnimalAbility(this, game, dx, dy, d)) {
          return updateAnimalAbility(this, 0, game, dx, dy, d);
        }
        if (this.sp.ranged) {
          const ideal = this.sp.preferRange || 220;
          const maxR = this.sp.range || 320;
          if (d < ideal * 0.65) {
            tvx = (-dx / d) * this.chaseSpeed;
            tvy = (-dy / d) * this.chaseSpeed;
          } else if (d > ideal * 1.2) {
            tvx = (dx / d) * this.chaseSpeed;
            tvy = (dy / d) * this.chaseSpeed;
          } else {
            tvx = (-dy / d) * this.chaseSpeed * 0.6 * (this.facing || 1);
            tvy = (dx / d) * this.chaseSpeed * 0.6 * (this.facing || 1);
          }
          if (d <= maxR && d > this.radius + p.radius + 20 && this.attackCd <= 0) {
            this.state = 'windup';
            this.stateT = this.sp.windup;
            this.strikeTarget = null;
            this.rangedShot = true;
            Sound.play('grunt');
          } else if (d < this.radius + p.radius + 16 && this.attackCd <= 0) {
            this.state = 'windup';
            this.stateT = this.sp.windup;
            this.strikeTarget = null;
            this.rangedShot = false;
            Sound.play('grunt');
          }
          break;
        }
        tvx = (dx / d) * this.chaseSpeed;
        tvy = (dy / d) * this.chaseSpeed;
        if (d < this.radius + p.radius + 16 && this.attackCd <= 0) {
          this.state = 'windup';
          this.stateT = this.sp.windup;
          this.strikeTarget = null;
          this.rangedShot = false;
          Sound.play(isBearish(this.species) ? 'roar' : 'grunt');
        }
        break;
      }
      case 'ability': {
        return updateAnimalAbility(this, dt, game, dx, dy, d);
      }
      case 'windup': {
        this.stateT -= dt;
        const t = this.strikeTarget || p;
        this.facing = t.x > this.x ? 1 : -1;
        if (this.stateT <= 0) {
          if (this.strikeTarget) {
            const s = this.strikeTarget;
            if (s.alive && dist2(s.x, s.y, this.x, this.y) < Math.pow(this.radius + s.solidR + 24, 2)) {
              s.takeHit(animalEffectiveDamage(this), game, this);
            }
            this.strikeTarget = null;
            this.rangedShot = false;
            this.state = 'recover';
            this.stateT = 0.5;
            this.attackCd = this.sp.cooldown;
          } else if (this.rangedShot && this.sp.ranged) {
            this.fireRangedShot(game, p);
            this.rangedShot = false;
            this.state = 'recover';
            this.stateT = 0.45;
            this.attackCd = this.sp.cooldown;
          } else {
            this.state = 'lunge';
            this.stateT = this.sp.lungeTime;
            this.lx = dx / d; this.ly = dy / d;
            this.lungeHit = false;
            this.rangedShot = false;
          }
        }
        break;
      }
      case 'lunge': {
        this.stateT -= dt;
        tvx = this.lx * this.sp.lungeSpeed;
        tvy = this.ly * this.sp.lungeSpeed;
        if (!this.lungeHit && d < this.radius + p.radius + 8) {
          this.lungeHit = true;
          p.takeDamage(animalEffectiveDamage(this), game, this.x, this.y, this.element);
        }
        if (this.stateT <= 0) {
          this.state = 'recover';
          this.stateT = 0.7;
          this.attackCd = this.sp.cooldown;
        }
        break;
      }
      case 'recover': {
        this.stateT -= dt;
        if (this.stateT <= 0) {
          if (preferPlayer && d < engageR) this.state = 'chase';
          else if (baseInAggro || this.raider || this.dayBoss || this.boss) this.state = 'march';
          else if (hostile) this.state = 'chase';
          else this.state = 'wander';
        }
        break;
      }
    }
    return [tvx, tvy];
  }

  /** Throw a species projectile (wool, log, rocks, …) at a target with .x/.y. */
  fireRangedShot(game, target) {
    if (!target || !this.sp.ranged) return;
    const base = Math.atan2(target.y - this.y, target.x - this.x);
    this.facing = Math.cos(base) > 0 ? 1 : -1;
    const dmg = animalEffectiveDamage(this);
    const count = Math.max(1, this.sp.shotCount | 0 || 1);
    const spread = this.sp.shotSpread != null ? this.sp.shotSpread : 0.18;
    const ox = this.x;
    const oy = this.y - this.bodyOff * 0.45;
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? base : base + (i - (count - 1) / 2) * spread;
      game.enemyShots.push(new EnemyBolt(
        ox + Math.cos(a) * (this.radius * 0.6),
        oy + Math.sin(a) * (this.radius * 0.2),
        a,
        {
          speed: this.sp.shotSpeed || 280,
          radius: this.sp.shotRadius || 11,
          dmg,
          element: null,
          color: this.sp.shotColor || '#fff',
          kind: this.sp.shotKind || 'bolt',
          spin: this.sp.shotSpin || 0,
          hitBuildings: true,
          life: 2.4,
        }
      ));
    }
    game.fx.sparks(this.x, this.y - this.bodyOff, 3 + count, this.sp.shotColor || '#fff');
    Sound.play('throw', this.sp.shotKind === 'log' ? 0.7 : this.sp.shotKind === 'rock' ? 0.95 : 1.1);
  }

  /**
   * Raiders march in a straight line, which can wedge them in dense forest. When they stop
   * closing in on the camp they sidestep, and if that fails for long they squeeze through trees.
   */
  trackProgress(dt, core, engaged) {
    const cd = Math.hypot(core.x - this.x, core.y - this.y);
    if (engaged || cd < this.bestCoreD - 25) {
      this.bestCoreD = Math.min(this.bestCoreD, cd);
      this.stuckT = 0;
      return;
    }
    this.stuckT += dt;
    if (this.stuckT > 1.2 && this.detourT <= 0) {
      this.detourT = rand(0.8, 1.8);
      this.detourSide = Math.random() < 0.5 ? -1 : 1;
    }
    if (this.stuckT > 6) {
      this.ghostT = 3;
      this.stuckT = 0;
      this.bestCoreD = cd;
    }
  }

  integrate(dt, game, tvx, tvy, snap, kd) {
    if (snap) { this.vx = tvx; this.vy = tvy; }
    else { this.vx = damp(this.vx, tvx, 8, dt); this.vy = damp(this.vy, tvy, 8, dt); }

    const r = this.radius * 0.8;
    const mx = (this.vx + this.kx) * dt, my = (this.vy + this.ky) * dt;
    if (this.ghostT > 0 || this.swarm) {
      if (this.ghostT > 0) this.ghostT -= dt;
      const w = game.world;
      this.x = clamp(this.x + mx, WORLD_MARGIN + r, w.w - WORLD_MARGIN - r);
      this.y = clamp(this.y + my, WORLD_MARGIN + r, w.h - WORLD_MARGIN - r);
    } else {
      game.world.moveEntity(this, mx, my, r);
    }
    // Lunges / charge dashes phase through palisade walls instead of stopping in them.
    if (snap) this.blockWall = null;
    else this.blockWall = game.base.collideWalls(this, r);
    this.kx *= kd; this.ky *= kd;

    const p = game.player;
    if (p.alive) {
      const ndx = this.x - p.x, ndy = this.y - p.y;
      const nd = Math.hypot(ndx, ndy);
      const minD = this.radius + p.radius - 6;
      if (nd < minD) {
        const nx = nd > 0.001 ? ndx / nd : 1, ny = nd > 0.001 ? ndy / nd : 0;
        this.x = p.x + nx * minD;
        this.y = p.y + ny * minD;
      }
    }

    const sp = Math.hypot(this.vx, this.vy);
    if (this.state !== 'windup' && Math.abs(this.vx) > 5) this.facing = this.vx > 0 ? 1 : -1;
    this.walkTime += dt * (sp / 6);
    this.moving = sp > 8;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  drawShadow(ctx) {
    const a = this.dead ? 0.2 * (1 - clamp((this.deathT - 0.5) / 0.5, 0, 1)) : 0.22;
    if (this.boss && !this.dead) {
      ctx.fillStyle = 'rgba(190,60,255,0.22)';
      ellipse(ctx, this.x, this.y + 1, this.radius * 1.7, this.radius * 0.7);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ellipse(ctx, this.x, this.y + 1, (this.radius + 2) * 1.05, this.radius * 0.38);
    ctx.fill();
  }

  draw(ctx, game) {
    const s = this.scale;
    // Element ring sits on the ground behind the sprite so it never shows through the body.
    if (!this.dead && this.element && ELEMENTS[this.element]) {
      const el = ELEMENTS[this.element];
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(game.time * 4 + this.x) * 0.08;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 2.2;
      ellipse(ctx, this.x, this.y + 1, this.radius * 1.15, this.radius * 0.42);
      ctx.stroke();
      ctx.restore();
    }
    if (!this.dead && this.slowT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + this.slow * 0.35;
      ctx.strokeStyle = '#4db8ff';
      ctx.lineWidth = 2;
      ellipse(ctx, this.x, this.y + 1, this.radius * 1.25, this.radius * 0.48);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.dead) {
      const t = this.deathT;
      ctx.globalAlpha = 1 - clamp((t - 0.55) / 0.45, 0, 1);
      const hop = Math.sin(Math.min(t * 3.5, 1) * Math.PI) * 14;
      ctx.translate(0, -hop - this.bodyOff);
      ctx.rotate(this.facing * Math.min(t * 5, 1) * Math.PI);
      ctx.translate(0, this.bodyOff);
    } else if (this.state === 'windup' || (this.ability && this.ability.phase === 'tele')) {
      ctx.translate(Math.sin(game.time * 70) * 1.8, 0);
    }
    ctx.scale(this.facing * s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const flash = this.flash > 0;
    const windup = this.state === 'windup' || (this.ability && this.ability.phase === 'tele');
    const angry = !this.dead && this.isHostile(game);
    const vDef = ANIMAL_VARIANTS[this.variant];
    // Spikes sit on the back — draw before the body so the animal covers their base.
    if (!flash && this.variant === 'demonic') drawDemonicSpikes(ctx, this);
    if (!flash && vDef && vDef.filter) ctx.filter = vDef.filter;
    switch (animalFamily(this.species)) {
      case 'wolf': drawWolf(ctx, this, flash, windup, angry); break;
      case 'bear': drawBear(ctx, this, flash, windup, angry); break;
      case 'deer': drawDeer(ctx, this, flash); break;
      case 'fox': drawFox(ctx, this, flash); break;
      case 'squirrel': drawSquirrel(ctx, this, flash, windup); break;
      case 'rat': drawRat(ctx, this, flash, windup); break;
      case 'raccoon': drawRaccoon(ctx, this, flash, windup); break;
      case 'duck': drawDuck(ctx, this, flash, windup); break;
      case 'sheep': drawSheep(ctx, this, flash, windup); break;
      case 'beaver': drawBeaver(ctx, this, flash, windup); break;
      default: drawBoar(ctx, this, flash, windup, angry);
    }
    ctx.filter = 'none';
    if (!flash && this.variant === 'necromantic') drawNecroEyes(ctx, this);
    if (this.boss) drawCrown(ctx, this.sp.eye[0] - 3, this.sp.eye[1] - 11);
    ctx.restore();

    if (this.dead) return;
    if (this.element && ELEMENTS[this.element]) {
      drawElementOrb(ctx, this.x + this.radius * 0.75 * this.facing, this.y - this.height + 4, this.element);
    }
    // True bosses use the screen-space HP bar; skip the tiny world bar.
    if (this.trueBoss) return;
    const barY = this.y - this.height - (this.boss ? 14 : 8);
    const showBar = this.boss || this.raider || this.hp < this.maxHp || this.stars > 0
      || (this.variant && this.variant !== 'basic');
    if (showBar) {
      const w = this.boss ? 90 : Math.max(this.swarm ? 16 : 26, this.radius * 1.8);
      const col = this.boss ? '#c46bff' : this.raider ? '#ff4d4d' : this.passive ? '#ffd28a'
        : (vDef && vDef.bar) ? vDef.bar
        : (this.element && ELEMENTS[this.element] ? ELEMENTS[this.element].color : '#ff8a5a');
      drawHpBar(ctx, this.x, barY, w, this.hp / this.maxHp, col);
      if (this.stars > 0) drawStars(ctx, this.x, barY - 7, this.stars);
      if (this.variant && this.variant !== 'basic') {
        drawVariantMark(ctx, this.x, barY - (this.stars > 0 ? 14 : 7), this.variant);
      }
    }
  }

  drawAbilityGround(ctx, game) {
    drawAnimalAbilityGround(ctx, this, game);
  }

  /** Glowing eyes drawn on top of the night darkness. */
  drawEyeGlow(ctx, game) {
    if (this.dead || this.passive || !this.isHostile(game)) return;
    const e = this.sp.eye;
    const x = this.x + e[0] * this.facing * this.scale, y = this.y + e[1] * this.scale;
    const pulse = 0.75 + Math.sin(game.time * 5 + this.x) * 0.25;
    let glow = this.raider ? 'rgba(255,70,50,' + (0.35 * pulse) + ')' : 'rgba(255,220,80,' + (0.3 * pulse) + ')';
    let core = this.raider ? '#ff6a4d' : '#ffe680';
    if (this.variant === 'demonic') {
      glow = 'rgba(255,40,20,' + (0.45 * pulse) + ')';
      core = '#ff4a2a';
    } else if (this.variant === 'necromantic') {
      glow = 'rgba(80,255,140,' + (0.4 * pulse) + ')';
      core = '#7dffb0';
    } else if (this.variant === 'dire') {
      glow = 'rgba(200,120,60,' + (0.35 * pulse) + ')';
      core = '#ffb060';
    }
    ctx.fillStyle = glow;
    ellipse(ctx, x, y, 6, 5); ctx.fill();
    ctx.fillStyle = core;
    ellipse(ctx, x, y, 1.8, 1.6); ctx.fill();
  }
}

function drawCrown(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 3); ctx.lineTo(x - 6.5, y - 3.5); ctx.lineTo(x - 3, y - 0.5); ctx.lineTo(x, y - 6);
  ctx.lineTo(x + 3, y - 0.5); ctx.lineTo(x + 6.5, y - 3.5); ctx.lineTo(x + 6, y + 3);
  ctx.closePath();
  ctx.fillStyle = '#ffd23f'; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = '#e5484d';
  ellipse(ctx, x, y + 0.5, 1.3, 1.3); ctx.fill();
}

/** Crimson back / shoulder spikes for demonic variants (local animal space). */
function drawDemonicSpikes(ctx, a) {
  const baseY = -(a.sp.bodyOff || 10) - 6;
  const spikes = [
    [-12, baseY + 2, -14, baseY - 14],
    [-6, baseY, -7, baseY - 18],
    [0, baseY - 1, 1, baseY - 20],
    [6, baseY, 8, baseY - 17],
    [12, baseY + 2, 15, baseY - 13],
    [18, baseY + 6, 22, baseY - 6],
  ];
  ctx.lineJoin = 'round';
  for (const [bx, by, tx, ty] of spikes) {
    ctx.beginPath();
    ctx.moveTo(bx - 2.2, by);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + 2.2, by);
    ctx.closePath();
    ctx.fillStyle = '#5a0a0a';
    ctx.fill();
    ctx.strokeStyle = '#1a0000';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = '#ff3a2a';
    ellipse(ctx, tx, ty, 1.2, 1.2);
    ctx.fill();
  }
}

/** Hollow green eyes for necromantic / undead variants. */
function drawNecroEyes(ctx, a) {
  const e = a.sp.eye || [16, -16];
  ctx.fillStyle = 'rgba(40, 80, 50, 0.55)';
  ellipse(ctx, e[0], e[1], 3.2, 2.8);
  ctx.fill();
  ctx.fillStyle = '#7dffb0';
  ellipse(ctx, e[0], e[1], 1.6, 1.4);
  ctx.fill();
  ctx.fillStyle = '#0a1a10';
  ellipse(ctx, e[0] + 0.3, e[1], 0.7, 0.9);
  ctx.fill();
}

/** Tiny glyph above the HP bar for non-basic variants. */
function drawVariantMark(ctx, x, y, variant) {
  const v = ANIMAL_VARIANTS[variant];
  if (!v || !v.bar) return;
  ctx.save();
  ctx.translate(x, y);
  if (variant === 'demonic') {
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(3.5, 3);
    ctx.lineTo(-3.5, 3);
    ctx.closePath();
    ctx.fillStyle = v.bar;
    ctx.fill();
    ctx.strokeStyle = '#4a0808';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else if (variant === 'necromantic') {
    ctx.strokeStyle = v.bar;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(3, 3);
    ctx.moveTo(3, -3);
    ctx.lineTo(-3, 3);
    ctx.stroke();
    ctx.fillStyle = v.bar;
    ellipse(ctx, 0, 0, 1.4, 1.4);
    ctx.fill();
  } else if (variant === 'dire') {
    ctx.fillStyle = v.bar;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSquirrel(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#d97b3c' : '#b5652b';
  const light = flash ? '#fff' : '#f0c896';
  const dark = flash ? '#fff' : '#7a3f17';
  // bushy tail curling up behind
  ctx.save();
  ctx.translate(-6, -8);
  ctx.rotate(-0.2 + Math.sin(a.walkTime * 0.9) * 0.14);
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.bezierCurveTo(-13, -1, -16, -21, -5, -26);
  ctx.bezierCurveTo(3, -29, 7, -20, 1, -15);
  ctx.bezierCurveTo(-3, -11, 3, -5, 5, -2);
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, -7, -19, 2.6, 4); ctx.fill();
  ctx.restore();
  legs(ctx, [-4, 4], -5, 3, dark, a, 5);
  ellipse(ctx, 0, -9, 8, 6.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, 2, -6.5, 4.5, 3.2); ctx.fill();
  ellipse(ctx, 7, -15, 5.5, 5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4.5, -18.5); ctx.lineTo(5.5, -24); ctx.lineTo(8.5, -19.5); ctx.closePath();
  ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 9, -15.5, 1.3, 1.5); ctx.fill();
  ctx.fillStyle = dark;
  ellipse(ctx, 12.2, -14, 1.1, 0.9); ctx.fill();
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(10.5, -12.6, 1.4, 2);
  }
}

function drawRat(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#8a6a58' : '#6a5548';
  const belly = flash ? '#fff' : '#b8a090';
  const dark = flash ? '#fff' : '#3e322c';
  const pink = flash ? '#fff' : '#e8a090';
  // long naked tail trailing behind
  ctx.save();
  ctx.translate(-6, -5);
  ctx.rotate(0.35 + Math.sin(a.walkTime * 1.1) * 0.18);
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.quadraticCurveTo(-8, 4, -16, 1);
  ctx.quadraticCurveTo(-22, -1, -26, -4);
  ctx.strokeStyle = pink;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
  legs(ctx, [-3.5, 4], -4, 2.6, dark, a, 4.5);
  // low elongated body
  ellipse(ctx, 1, -7, 9.5, 5.2);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = belly;
  ellipse(ctx, 2.5, -5.2, 5.5, 2.8); ctx.fill();
  // head + pointed snout
  ellipse(ctx, 10, -10, 5.2, 4.4);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13.5, -10);
  ctx.lineTo(18.5, -8.5);
  ctx.lineTo(13.8, -7);
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = pink;
  ellipse(ctx, 17.8, -8.4, 1.4, 1.0); ctx.fill();
  // round ears
  ellipse(ctx, 8.2, -14.2, 2.4, 2.6);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = pink;
  ellipse(ctx, 8.4, -14, 1.2, 1.3); ctx.fill();
  ellipse(ctx, 11.2, -13.8, 2.1, 2.3);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = pink;
  ellipse(ctx, 11.4, -13.6, 1.0, 1.1); ctx.fill();
  // eye + whiskers
  ctx.fillStyle = '#111';
  ellipse(ctx, 12, -11.5, 1.2, 1.35); ctx.fill();
  if (!flash) {
    ctx.strokeStyle = 'rgba(40,28,22,0.55)';
    ctx.lineWidth = 0.7;
    for (const dy of [-1.2, 0, 1.2]) {
      ctx.beginPath();
      ctx.moveTo(15.5, -8.8 + dy * 0.2);
      ctx.lineTo(20.5, -8.2 + dy);
      ctx.stroke();
    }
  }
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(14.2, -7.2, 1.5, 2.1);
  }
}

function drawRaccoon(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#a07c7c' : '#8a8d92';
  const dark = flash ? '#fff' : '#35373b';
  const light = flash ? '#fff' : '#dcdee1';
  // ringed tail
  ctx.save();
  ctx.translate(-11, -12);
  ctx.rotate(0.45 + Math.sin(a.walkTime * 0.8) * 0.12);
  ellipse(ctx, -8, 0, 10, 4.2);
  ctx.fillStyle = body; ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = dark;
  for (const rx of [-15, -10, -5]) ctx.fillRect(rx, -5, 2.6, 10);
  ctx.restore();
  ellipse(ctx, -8, 0, 10, 4.2);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  legs(ctx, [-8, -3, 5, 9], -8, 3.4, dark, a, 8);
  ellipse(ctx, 0, -13, 13, 8);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, 1, -9.5, 8, 3); ctx.fill();
  // ears
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
  for (const ex of [8.5, 12.5]) {
    ctx.beginPath(); ctx.moveTo(ex - 1.5, -20); ctx.lineTo(ex, -25.5); ctx.lineTo(ex + 2, -20.5); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.stroke();
  }
  ellipse(ctx, 12, -16, 7, 6);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.6; ctx.stroke();
  // bandit mask
  ctx.fillStyle = dark;
  ellipse(ctx, 13.5, -16.8, 5.5, 2.6); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 14.5, -16.8, 1.3, 1.3); ctx.fill();
  // snout
  ctx.beginPath();
  ctx.moveTo(16, -18); ctx.lineTo(21.5, -14.5); ctx.lineTo(16, -12.5);
  ctx.closePath();
  ctx.fillStyle = light; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 21.3, -14.6, 1.3, 1.1); ctx.fill();
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(17.5, -12.8, 1.4, 2.2);
  }
}

function legs(ctx, xs, top, w, color, a, len) {
  for (let i = 0; i < xs.length; i++) {
    const ph = Math.sin(a.walkTime + (i % 2) * Math.PI) * (a.moving ? 3 : 0);
    ctx.fillStyle = color;
    roundRectPath(ctx, xs[i] - w / 2 + ph * 0.5, top, w, len - Math.max(0, ph) * 0.6, 1.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  }
}

function drawBoar(ctx, a, flash, windup, angry) {
  const dire = a.species === 'dire_boar';
  const body = flash ? '#ffffff' : windup ? (dire ? '#6a3020' : '#a8492d')
    : a.big ? '#5a3925' : (a.sp.color || '#7d4b2c');
  const dark = flash ? '#ffffff' : a.big ? '#2f1d12' : (a.sp.shade || (dire ? '#1e120c' : '#3e2516'));
  legs(ctx, [-11, -5, 7, 12], -10, 4.6, flash ? '#fff' : (dire ? '#1a1008' : '#3a2214'), a, 10);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-17, -17); ctx.quadraticCurveTo(-24, -22, -21, -14); ctx.stroke();
  ellipse(ctx, 0, -15, 19, 11);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  if (!flash) { ctx.fillStyle = 'rgba(255,220,180,0.18)'; ellipse(ctx, 1, -10.5, 13, 4.5); ctx.fill(); }
  if (dire && !flash) {
    ctx.fillStyle = 'rgba(180,40,30,0.35)';
    ellipse(ctx, -2, -18, 10, 3.5); ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-14, -21);
  const spikes = [[-11, -29], [-7, -24], [-3, -31], [1, -25], [5, -31], [8, -25], [12, -28], [14, -19]];
  for (const pt of spikes) ctx.lineTo(pt[0], pt[1]);
  ctx.quadraticCurveTo(0, -24, -14, -21);
  ctx.fillStyle = dark; ctx.fill();
  // Snout drawn under the head so the skull sits on top in z-order.
  ellipse(ctx, 26, -12, 4.2, 4.4);
  ctx.fillStyle = flash ? '#fff' : '#e3a089'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // Head covers the snout base
  ellipse(ctx, 15, -14, 10, 8.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  // Tip + nostrils redrawn in front of the head
  ellipse(ctx, 26.5, -12, 3.2, 3.6);
  ctx.fillStyle = flash ? '#fff' : '#e3a089'; ctx.fill();
  ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = '#6b3a2a';
  ellipse(ctx, 27.6, -13.4, 0.85, 1.1); ctx.fill();
  ellipse(ctx, 27.6, -10.6, 0.85, 1.1); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9.5, -19.5); ctx.lineTo(12.5, -28); ctx.lineTo(17, -20.5);
  ctx.closePath();
  ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
  const tl = a.big ? 1.4 : 1;
  ctx.beginPath();
  ctx.moveTo(19, -7);
  ctx.quadraticCurveTo(24, -8, 23.5 + (tl - 1) * 3, -15 - (tl - 1) * 6);
  ctx.lineTo(21.5, -8.6);
  ctx.closePath();
  ctx.fillStyle = '#fffbe8'; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 17.5, -16, 1.8, 1.9); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 18, -16.6, 0.6, 0.6); ctx.fill();
  if (angry) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(14, -20.5); ctx.lineTo(20.5, -18); ctx.stroke();
  }
}

function drawWolf(ctx, a, flash, windup, angry) {
  const dire = a.species === 'dire_wolf';
  const body = flash ? '#fff' : windup ? (dire ? '#6a4048' : '#9a6a6a') : (a.sp.color || '#7d8590');
  const dark = flash ? '#fff' : (a.sp.shade || (dire ? '#1c222c' : '#545b64'));
  const light = flash ? '#fff' : (a.sp.belly || (dire ? '#6a7484' : '#bcc3ca'));
  legs(ctx, [-10, -5, 7, 11], -12, 3.6, flash ? '#fff' : (dire ? '#2a3038' : '#4b5159'), a, 12);
  // bushy tail
  ctx.save();
  ctx.translate(-14, -17);
  ctx.rotate(0.55 + Math.sin(a.walkTime * 0.8) * 0.15);
  ellipse(ctx, -9, 0, 11, 4.2);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, -17, 0, 3.5, 2.6); ctx.fill();
  ctx.restore();
  // body
  ellipse(ctx, 0, -17, 16, 8.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, 1, -12.5, 11, 3.4); ctx.fill();
  ctx.fillStyle = dark;
  ellipse(ctx, -2, -22.5, 12, 3); ctx.fill();
  // neck ruff + head
  ellipse(ctx, 11, -20, 6.5, 7);
  ctx.fillStyle = body; ctx.fill();
  ellipse(ctx, 15, -21, 7, 6);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  // snout
  ctx.beginPath();
  ctx.moveTo(18, -23.5); ctx.lineTo(28, -19.5); ctx.lineTo(27, -16); ctx.lineTo(17, -16.5);
  ctx.closePath();
  ctx.fillStyle = light; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 27.6, -18.8, 1.7, 1.5); ctx.fill();
  if (angry) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(21, -16.4); ctx.lineTo(22, -13.8); ctx.lineTo(23, -16.4); ctx.closePath(); ctx.fill();
  }
  // ears
  ctx.fillStyle = dark;
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(10.5, -24.5); ctx.lineTo(12, -32); ctx.lineTo(15, -25.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, -25.5); ctx.lineTo(16.5, -31.5); ctx.lineTo(18, -24.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  // eye
  ctx.fillStyle = dire ? '#ff6a3d' : '#ffd23f';
  ellipse(ctx, 16.5, -21.5, 1.8, 1.5); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 16.9, -21.5, 0.8, 1.1); ctx.fill();
}

function drawBear(ctx, a, flash, windup, angry) {
  const dire = a.species === 'dire_bear';
  const body = flash ? '#fff' : windup ? (dire ? '#5a2818' : '#8a3f22') : (a.sp.color || '#6b4527');
  const dark = flash ? '#fff' : (a.sp.shade || (dire ? '#1a100c' : '#4a2e18'));
  const muzzle = flash ? '#fff' : (dire ? '#8a6a48' : '#c69c6d');
  if (windup) {
    ctx.translate(-14, 0);
    ctx.rotate(-0.22);
    ctx.translate(14, 0);
  }
  legs(ctx, [-15, -7, 9, 16], -13, 7.5, flash ? '#fff' : (dire ? '#1e140e' : '#3e2614'), a, 13);
  // body + hump
  ellipse(ctx, 0, -21, 24, 15);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.stroke();
  ellipse(ctx, -5, -31, 13, 7);
  ctx.fillStyle = body; ctx.fill();
  if (!flash) {
    ctx.fillStyle = 'rgba(255,220,180,0.13)';
    ellipse(ctx, 2, -14, 16, 5); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ellipse(ctx, -8, -33, 9, 3); ctx.fill();
  }
  // head
  ellipse(ctx, 20, -25, 11, 10);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  // ears
  for (const ex of [14, 23]) {
    ellipse(ctx, ex, -34.5, 4.2, 4.2);
    ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
    ellipse(ctx, ex, -34.5, 2, 2);
    ctx.fillStyle = dark; ctx.fill();
  }
  // muzzle
  ellipse(ctx, 29, -21.5, 6.5, 5);
  ctx.fillStyle = muzzle; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#1a0f08';
  ellipse(ctx, 34, -23, 2.6, 2); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 22.5, -27, 1.9, 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 23, -27.6, 0.6, 0.6); ctx.fill();
  if (angry) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(19, -31); ctx.lineTo(26, -29); ctx.stroke();
  }
  if (windup && !flash) {
    ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(18 + i * 2.5, -4); ctx.lineTo(20 + i * 2.5, 0); ctx.stroke();
    }
  }
}

function drawFox(ctx, a, flash) {
  const body = flash ? '#fff' : '#d4783a';
  const dark = flash ? '#fff' : '#8a3a18';
  const cream = flash ? '#fff' : '#f2e6d4';
  legs(ctx, [-8, -3, 6, 10], -10, 3.2, flash ? '#fff' : '#9a4a22', a, 10);
  // bushy tail
  ctx.save();
  ctx.translate(-12, -14);
  ctx.rotate(0.5 + Math.sin(a.walkTime * 0.9) * 0.14);
  ellipse(ctx, -10, 0, 12, 4.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = cream;
  ellipse(ctx, -19, 0, 3.5, 2.8); ctx.fill();
  ctx.restore();
  ellipse(ctx, 0, -14, 13, 7.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = cream;
  ellipse(ctx, 1, -10, 8, 3); ctx.fill();
  // head
  ellipse(ctx, 12, -17, 7, 6);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.6; ctx.stroke();
  // ears
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(9.5, -28); ctx.lineTo(12.5, -21); ctx.closePath();
  ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -21); ctx.lineTo(14.5, -28.5); ctx.lineTo(16, -20.5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark;
  ellipse(ctx, 9.8, -24.5, 1.2, 1.8); ctx.fill();
  ellipse(ctx, 14.2, -24.8, 1.2, 1.8); ctx.fill();
  // snout
  ctx.beginPath();
  ctx.moveTo(15, -18); ctx.lineTo(22, -15); ctx.lineTo(15, -13);
  ctx.closePath();
  ctx.fillStyle = cream; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 21.5, -15, 1.2, 1); ctx.fill();
  ellipse(ctx, 14, -18, 1.4, 1.5); ctx.fill();
}

function drawDuck(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#6a9a4a' : '#4a7a3a';
  const breast = flash ? '#fff' : '#c8a060';
  const beak = flash ? '#fff' : '#e8a020';
  legs(ctx, [-3, 4], -4, 2.4, flash ? '#fff' : '#e8a020', a, 5);
  // body
  ellipse(ctx, 0, -10, 11, 7);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = breast;
  ellipse(ctx, 3, -7, 6, 3.5); ctx.fill();
  // wing
  ctx.beginPath();
  ctx.moveTo(-2, -12); ctx.quadraticCurveTo(-8, -16, -4, -8); ctx.quadraticCurveTo(0, -10, -2, -12);
  ctx.fillStyle = flash ? '#fff' : '#3a5a2a'; ctx.fill();
  // head
  ellipse(ctx, 10, -14, 5.5, 5);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // beak
  ctx.beginPath();
  ctx.moveTo(14, -14); ctx.lineTo(20, -13); ctx.lineTo(14, -11.5);
  ctx.closePath();
  ctx.fillStyle = beak; ctx.fill();
  ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 12, -14.5, 1.2, 1.3); ctx.fill();
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(15.5, -11.2, 1.2, 1.8);
  }
}

function drawSheep(ctx, a, flash, windup) {
  const wool = flash ? '#fff' : windup ? '#fff6e8' : '#efe8dc';
  const skin = flash ? '#fff' : '#d8a090';
  const dark = flash ? '#fff' : '#6a5040';
  legs(ctx, [-9, -3, 5, 10], -10, 3.4, flash ? '#fff' : '#5a4030', a, 10);
  // fluffy body
  ellipse(ctx, 0, -16, 16, 11);
  ctx.fillStyle = wool; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  if (!flash) {
    ctx.fillStyle = '#fff';
    ellipse(ctx, -6, -20, 5, 4.5); ctx.fill();
    ellipse(ctx, 4, -22, 5.5, 4); ctx.fill();
    ellipse(ctx, 8, -14, 4.5, 4); ctx.fill();
    ellipse(ctx, -8, -12, 4, 3.5); ctx.fill();
  }
  // head
  ellipse(ctx, 14, -18, 7, 6);
  ctx.fillStyle = skin; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  // ears
  ctx.fillStyle = skin;
  ellipse(ctx, 10, -24, 2.4, 3.2); ctx.fill();
  ellipse(ctx, 17, -23.5, 2.4, 3.2); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 16, -18.5, 1.3, 1.4); ctx.fill();
  ctx.fillStyle = dark;
  ellipse(ctx, 20, -16.5, 1.6, 1.2); ctx.fill();
  if (windup) {
    // wool ball in mouth
    ctx.fillStyle = '#f7f2ea';
    ellipse(ctx, 21, -14, 3.5, 3.2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.stroke();
  }
}

function drawBeaver(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#9a6038' : '#7a4a28';
  const dark = flash ? '#fff' : '#4a2a14';
  const belly = flash ? '#fff' : '#c49a68';
  legs(ctx, [-8, -2, 6, 10], -9, 3.6, dark, a, 9);
  // flat paddle tail
  ctx.save();
  ctx.translate(-12, -10);
  ctx.rotate(0.35 + Math.sin(a.walkTime * 0.7) * 0.08);
  ellipse(ctx, -8, 0, 11, 4.5);
  ctx.fillStyle = dark; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (const ox of [-12, -8, -4]) {
    ctx.beginPath(); ctx.moveTo(ox, -3); ctx.lineTo(ox - 1, 3); ctx.stroke();
  }
  ctx.restore();
  ellipse(ctx, 0, -14, 14, 9);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = belly;
  ellipse(ctx, 1, -10, 8, 3.5); ctx.fill();
  // head
  ellipse(ctx, 12, -16, 7.5, 6.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  // buck teeth
  ctx.fillStyle = '#fff8d8';
  ctx.fillRect(17.5, -14.5, 2.2, 3.5);
  ctx.fillRect(20, -14.5, 2.2, 3.5);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.strokeRect(17.5, -14.5, 2.2, 3.5); ctx.strokeRect(20, -14.5, 2.2, 3.5);
  ctx.fillStyle = '#111';
  ellipse(ctx, 14.5, -17.5, 1.4, 1.5); ctx.fill();
  // ear
  ellipse(ctx, 8, -22, 2.5, 2.5);
  ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
  if (windup) {
    ctx.save();
    ctx.translate(22, -12);
    ctx.rotate(0.4);
    roundRectPath(ctx, -6, -2.5, 12, 5, 2);
    ctx.fillStyle = '#8a5a2a'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
}

function drawDeer(ctx, a, flash) {
  const body = flash ? '#fff' : '#c08a52';
  const legC = flash ? '#fff' : '#8a5a34';
  legs(ctx, [-9, -4.5, 8, 12], -24, 3.2, legC, a, 24);
  ctx.fillStyle = '#2a1b12';
  for (const lx of [-9, -4.5, 8, 12]) ctx.fillRect(lx - 1.8, -2, 3.6, 2);
  // tail
  ctx.fillStyle = flash ? '#fff' : '#f6efe2';
  ellipse(ctx, -15.5, -30, 3, 4); ctx.fill();
  // body
  ellipse(ctx, 0, -28, 15.5, 8.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  if (!flash) {
    ctx.fillStyle = '#f3e6d0';
    ellipse(ctx, 1.5, -23, 10, 3.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,225,0.75)';
    for (const [sx, sy] of [[-7, -32], [-2, -33.5], [3, -32.5], [-4.5, -29.5]]) { ellipse(ctx, sx, sy, 1.3, 1.1); ctx.fill(); }
  }
  // neck
  ctx.beginPath();
  ctx.moveTo(8, -32); ctx.lineTo(14, -45); ctx.lineTo(19.5, -43); ctx.lineTo(15, -27);
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  // antlers
  ctx.strokeStyle = flash ? '#fff' : '#efe1bd';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(15, -49); ctx.lineTo(12, -60); ctx.moveTo(13, -55); ctx.lineTo(8.5, -58); ctx.moveTo(12, -60); ctx.lineTo(14.5, -64);
  ctx.moveTo(17, -49); ctx.lineTo(19.5, -61); ctx.moveTo(18.5, -56); ctx.lineTo(23, -58.5); ctx.moveTo(19.5, -61); ctx.lineTo(18, -65);
  ctx.stroke();
  // ear + head
  ctx.save();
  ctx.translate(12.5, -48.5); ctx.rotate(-0.5);
  ellipse(ctx, 0, 0, 4.5, 2);
  ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(19, -46); ctx.rotate(0.25);
  ellipse(ctx, 0, 0, 7, 4.6);
  ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#1a1a1a';
  ellipse(ctx, 25.4, -44, 1.6, 1.4); ctx.fill();
  ellipse(ctx, 19.5, -46.5, 1.3, 1.5); ctx.fill();
}
