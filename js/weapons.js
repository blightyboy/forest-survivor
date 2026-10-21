'use strict';

const WEAPON_MAX = 8;
const MAX_WEAPONS = 5;

const at = (l, n, v) => (l >= n ? v : 0);

/**
 * Weapons picked from level-up cards. `stats(level)` is cumulative and
 * `text[level - 1]` describes what reaching that level adds.
 */
const WEAPON_DEFS = {
  axe: {
    name: 'Orbiting Axes',
    text: ['Axes circle you, chopping trees, ore and beasts', '+1 axe', '+12 damage, wider orbit', 'Spin 30% faster', '+1 axe',
      '+20 damage, wider orbit', '+14 damage, spin 25% faster', '+1 axe, +22 damage, wider orbit'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 5, 1) + at(l, 8, 1),
      dmg: 22 + at(l, 3, 12) + at(l, 6, 20) + at(l, 7, 14) + at(l, 8, 22),
      range: 70 + at(l, 3, 18) + at(l, 6, 20) + at(l, 8, 16),
      speed: 4.4 * (l >= 4 ? 1.3 : 1) * (l >= 7 ? 1.25 : 1),
    }),
  },
  hatchet: {
    name: 'Throwing Hatchets',
    text: ['Hurls a hatchet at the nearest beast', '+1 hatchet', '+16 damage', 'Pierces +1 beast', 'Throws 25% faster',
      '+1 hatchet', '+24 damage', '+18 damage, pierces +1 beast'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 6, 1),
      dmg: 32 + at(l, 3, 16) + at(l, 7, 24) + at(l, 8, 18),
      pierce: 1 + at(l, 4, 1) + at(l, 8, 1),
      cd: l >= 5 ? 0.8 : 1.05,
      speed: 680,
      range: 560,
    }),
  },
  saw: {
    name: 'Boomerang Saw',
    text: ['A saw blade flies out and returns, shredding everything', '+14 damage', '+1 saw', 'Bigger blade, flies further',
      'Thrown 25% faster', '+1 saw', '+24 damage', 'Huge blade, +16 damage'],
    stats: (l) => ({
      count: 1 + at(l, 3, 1) + at(l, 6, 1),
      dmg: 28 + at(l, 2, 14) + at(l, 7, 24) + at(l, 8, 16),
      size: 18 * (l >= 4 ? 1.35 : 1) * (l >= 8 ? 1.3 : 1),
      dist: 260 + at(l, 4, 80),
      cd: l >= 5 ? 1.7 : 2.2,
    }),
  },
  aura: {
    name: 'Flame Ring',
    text: ['A ring of embers burns beasts around you', 'Wider ring', '+7 damage', 'Wider ring, burns faster', '+8 damage',
      'Wider ring', '+10 damage', 'Huge ring, +10 damage'],
    stats: (l) => ({
      radius: 78 + at(l, 2, 18) + at(l, 4, 18) + at(l, 6, 22) + at(l, 8, 22),
      dmg: 10 + at(l, 3, 7) + at(l, 5, 8) + at(l, 7, 10) + at(l, 8, 10),
      tick: l >= 4 ? 0.36 : 0.45,
    }),
  },
  dynamite: {
    name: 'Dynamite',
    text: ['Lobs a stick of dynamite into the pack. Also fells trees', '+28 damage', '+1 stick', 'Bigger blast', 'Thrown 25% faster',
      '+1 stick', '+45 damage', 'Massive blast, +40 damage'],
    stats: (l) => ({
      count: 1 + at(l, 3, 1) + at(l, 6, 1),
      dmg: 60 + at(l, 2, 28) + at(l, 7, 45) + at(l, 8, 40),
      radius: 118 + at(l, 4, 36) + at(l, 8, 42),
      cd: l >= 5 ? 2.1 : 2.7,
    }),
  },
  pike: {
    name: 'Pike Thrust',
    text: ['A long pike stabs toward your aim (or the way you run)', '+1 pike', '+18 damage, longer reach', 'Pierces +2 beasts', 'Thrusts 25% faster',
      '+1 pike', '+26 damage', 'Huge reach, +20 damage'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 6, 1),
      dmg: 42 + at(l, 3, 18) + at(l, 7, 26) + at(l, 8, 20),
      pierce: 2 + at(l, 4, 2),
      len: 88 + at(l, 3, 22) + at(l, 8, 28),
      speed: 820,
      cd: l >= 5 ? 0.7 : 0.95,
    }),
  },
  crossbow: {
    name: 'Hunter Crossbow',
    text: ['Fires a bolt at the nearest threat', '+1 bolt', '+14 damage', 'Pierces +1', 'Reloads 25% faster',
      '+1 bolt', '+22 damage', '+16 damage, pierces +1'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 6, 1),
      dmg: 36 + at(l, 3, 14) + at(l, 7, 22) + at(l, 8, 16),
      pierce: 1 + at(l, 4, 1) + at(l, 8, 1),
      cd: l >= 5 ? 0.55 : 0.75,
      speed: 920,
      range: 640,
    }),
  },
  spikes: {
    name: 'Caltrop Ring',
    text: ['Wooden spikes burst around you', 'Wider ring', '+8 damage', 'Pulses faster', '+10 damage',
      'Wider ring', '+12 damage', 'Huge ring, +12 damage'],
    stats: (l) => ({
      radius: 70 + at(l, 2, 16) + at(l, 6, 22) + at(l, 8, 24),
      dmg: 14 + at(l, 3, 8) + at(l, 5, 10) + at(l, 7, 12) + at(l, 8, 12),
      tick: l >= 4 ? 0.55 : 0.75,
    }),
  },
  hammerfall: {
    name: 'Hammerfall',
    text: ['Hammers crash onto nearby beasts', '+1 hammer', '+22 damage, wider smash', 'Falls 20% faster', '+1 hammer',
      '+30 damage', '+1 hammer, bigger smash', 'Devastating smash, +28 damage'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 5, 1) + at(l, 7, 1),
      dmg: 52 + at(l, 3, 22) + at(l, 6, 30) + at(l, 8, 28),
      radius: 52 + at(l, 3, 14) + at(l, 7, 18) + at(l, 8, 16),
      range: 240 + at(l, 3, 30) + at(l, 8, 40),
      cd: l >= 4 ? 1.45 : 1.85,
    }),
  },
  longbow: {
    name: 'Longbow',
    text: ['A heavy arrow at long range — slow but brutal', '+22 damage', 'Pierces +1', 'Draws 15% faster', '+1 arrow',
      '+30 damage, longer range', '+20 damage', 'Pierces +1, +26 damage'],
    stats: (l) => ({
      count: 1 + at(l, 5, 1),
      dmg: 62 + at(l, 2, 22) + at(l, 6, 30) + at(l, 7, 20) + at(l, 8, 26),
      pierce: 1 + at(l, 3, 1) + at(l, 8, 1),
      cd: l >= 4 ? 1.05 : 1.35,
      speed: 1080,
      range: 860 + at(l, 6, 80),
    }),
  },
  knife: {
    name: 'Throwing Knives',
    text: ['Three knives fan toward nearby beasts', '+8 damage', 'Cone spreads wider', '+1 knife', 'Throws 20% faster',
      '+12 damage', '+1 knife', '+14 damage, pierces +1'],
    stats: (l) => ({
      count: 3 + at(l, 4, 1) + at(l, 7, 1),
      dmg: 24 + at(l, 2, 8) + at(l, 6, 12) + at(l, 8, 14),
      pierce: 1 + at(l, 8, 1),
      cone: 0.42 + at(l, 3, 0.18),
      cd: l >= 5 ? 0.7 : 0.9,
      speed: 760,
      range: 400,
    }),
  },
  guarddog: {
    name: 'Guard Dog',
    text: ['A loyal dog runs with you and bites beasts', '+6 damage, longer hunt', 'Respawns 15% faster', '+8 damage',
      'Hunts farther', '+10 damage', 'Stays out longer', '+12 damage, fierce bites'],
    stats: (l) => ({
      dmg: 20 + at(l, 2, 6) + at(l, 4, 8) + at(l, 6, 10) + at(l, 8, 12),
      orbit: 78 + at(l, 2, 12) + at(l, 5, 18),
      biteCd: l >= 8 ? 0.32 : 0.42,
      duration: 10 + at(l, 7, 4),
      spawnCd: Math.max(3.2, 7.5 * (l >= 3 ? 0.85 : 1) * (l >= 5 ? 0.9 : 1)),
      speed: 260 + at(l, 2, 30) + at(l, 5, 40),
    }),
  },
};

const PASSIVE_DEFS = {
  might: { name: 'Whetstone', desc: '+15% damage', max: 5 },
  haste: { name: 'Strong Coffee', desc: 'Weapons fire 7% faster, axes spin 8% faster', max: 5 },
  area: { name: 'Long Handle', desc: '+10% weapon area and reach', max: 5 },
  speed: { name: 'Logger Boots', desc: '+8% move speed', max: 5 },
  magnet: { name: 'Lodestone', desc: '+35% pickup range', max: 5 },
  vitality: { name: 'Hearty Stew', desc: '+25 max health', max: 5 },
  armor: { name: 'Thick Flannel', desc: 'Take 7% less damage', max: 5 },
  regen: { name: 'Pine Sap', desc: 'Regenerate 0.5 health per second', max: 5 },
  luck: { name: 'Lucky Acorn', desc: '+6% critical hit chance', max: 5 },
  amount: { name: 'Extra Hands', desc: '+1 projectile for every thrown weapon', max: 2 },
  dash: { name: 'Second Wind', desc: '+1 dash charge', max: 3 },
  greed: { name: 'Greed', desc: '-8% max HP, +18% resource & XP drops', max: 5 },
  devil: { name: "Devil's Contract", desc: '-10% max HP, +12% damage', max: 5 },
  angel: { name: "Angel's Blessing", desc: '-8% damage, +30 max HP', max: 5 },
  ember: { name: 'Ember Mastery', desc: '+36% Fire damage (only if you deal Fire)', max: 3 },
  tide: { name: 'Tide Mastery', desc: '+36% Water damage (only if you deal Water)', max: 3 },
  bloom: { name: 'Bloom Mastery', desc: '+36% Nature damage (only if you deal Nature)', max: 3 },
  quake: { name: 'Quake Mastery', desc: '+36% Earth damage (only if you deal Earth)', max: 3 },
  radiance: { name: 'Radiant Mastery', desc: '+36% Light damage (only if you deal Light)', max: 3 },
  umbra: { name: 'Umbral Mastery', desc: '+36% Darkness damage (only if you deal Darkness)', max: 3 },
};

const ELEMENT_PASSIVES = {
  ember: 'fire', tide: 'water', bloom: 'nature', quake: 'earth', radiance: 'light', umbra: 'darkness',
};

function cardKey(card) {
  if (card.kind === 'element') return 'element:' + card.id + ':' + card.element;
  return card.kind + ':' + card.id;
}

const BONUS_DEFS = {
  gold: { name: 'Gold Pouch', desc: 'A pile of gold for the camp' },
  heal: { name: 'Roast Dinner', desc: 'Restore all health' },
};

function computePlayerStats(P, gear = null, level = 1, permBonus = null) {
  const lv = (k) => P[k] || 0;
  const g = gear || {
    might: 0, armor: 0, crit: 0, move: 0, regen: 0, magnet: 0, area: 0,
    maxHp: 0, flatDmg: 0, haste: 0, lifesteal: 0, thorns: 0, xpGain: 0,
    element: null, elementPower: {}, resist: {},
  };
  const pb = permBonus || {};
  const elementPower = {};
  for (const id of ELEMENT_IDS) {
    elementPower[id] = (g.elementPower[id] || 0) + (pb.elemPct || 0);
  }
  for (const pid in ELEMENT_PASSIVES) {
    const el = ELEMENT_PASSIVES[pid];
    elementPower[el] += 0.36 * lv(pid);
  }
  const hasteGear = g.haste || 0;
  return {
    might: 1 + 0.15 * lv('might') + 0.12 * lv('devil') - 0.08 * lv('angel') + g.might + (pb.damagePct || 0),
    cooldown: Math.pow(0.93, lv('haste')) / (1 + hasteGear),
    spin: 1 + 0.08 * lv('haste') + hasteGear * 0.5,
    area: 1 + 0.1 * lv('area') + g.area,
    moveSpeed: 180 * (1 + 0.08 * lv('speed') + g.move + (pb.move || 0)),
    magnet: 95 * (1 + 0.35 * lv('magnet') + g.magnet + (pb.magnet || 0)),
    maxHp: (() => {
      const base = 100 + 25 * lv('vitality') + 30 * lv('angel')
        + 10 * Math.max(0, level - 1) + (g.maxHp || 0) + (pb.maxHp || 0);
      // Contract-style cards cut max HP by % of the post-bonus pool.
      const mult = Math.max(0.25, 1 - 0.08 * lv('greed') - 0.10 * lv('devil'));
      return Math.max(40, Math.round(base * mult));
    })(),
    armor: Math.min(0.6, 0.07 * lv('armor') + g.armor),
    regen: 0.5 * lv('regen') + g.regen + (pb.regen || 0),
    crit: 0.05 + 0.06 * lv('luck') + g.crit,
    amount: lv('amount'),
    dashCharges: 1 + lv('dash'),
    attackElement: g.element || null,
    flatDamage: (pb.flatDamage || 0) + (pb.damage || 0) + (g.flatDmg || 0),
    elemFlat: pb.elemFlat || 0,
    lifesteal: g.lifesteal || 0,
    thorns: g.thorns || 0,
    xpGain: 1 + (g.xpGain || 0),
    lootMult: 1 + 0.18 * lv('greed'),
    elementPower,
    resist: g.resist || {},
  };
}

// ===========================================================================
// Projectiles
// ===========================================================================

class Hatchet {
  constructor(x, y, angle, s) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * s.speed;
    this.vy = Math.sin(angle) * s.speed;
    this.dmg = s.dmg;
    this.pierce = s.pierce;
    this.life = s.range / s.speed;
    this.spin = 0;
    this.dead = false;
    this.hit = new Set();
    this.weaponId = 'hatchet';
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 22 * (this.vx >= 0 ? 1 : -1);
    const q = game.arsenal._q;
    q.length = 0;
    game.animalGrid.query(this.x, this.y, 60, q);
    for (const a of q) {
      if (a.dead || this.hit.has(a)) continue;
      const rr = 14 + a.radius;
      if (dist2(this.x, this.y, a.x, a.y - a.bodyOff) >= rr * rr) continue;
      this.hit.add(a);
      game.hitAnimal(a, this.dmg, this.x, this.y, 0.7, false, this.weaponId);
      if (--this.pierce <= 0) { this.dead = true; return; }
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ellipse(ctx, this.x, this.y + 2, 9, 3.5);
    ctx.fill();
  }

  draw(ctx) {
    drawAxe(ctx, this.x, this.y - 20, this.spin, 0.85, false);
  }
}

class SawBlade {
  constructor(x, y, angle, s) {
    this.x = x; this.y = y;
    this.dirX = Math.cos(angle); this.dirY = Math.sin(angle);
    this.dmg = s.dmg;
    this.size = s.size;
    this.maxDist = s.dist;
    this.travel = 0;
    this.returning = false;
    this.speed = 430;
    this.spin = 0;
    this.age = 0;
    this.dead = false;
    this.hits = new Map();
    this.weaponId = 'saw';
  }

  update(dt, game) {
    this.age += dt;
    this.spin += dt * 26;
    const p = game.player;
    if (!this.returning) {
      const sp = this.speed * (1 - 0.55 * (this.travel / this.maxDist));
      this.x += this.dirX * sp * dt;
      this.y += this.dirY * sp * dt;
      this.travel += sp * dt;
      if (this.travel >= this.maxDist) this.returning = true;
    } else {
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(this.speed * 1.4, 160 + this.age * 260);
      this.x += (dx / d) * sp * dt;
      this.y += (dy / d) * sp * dt;
      if (d < 22 || this.age > 6) { this.dead = true; return; }
    }
    const q = game.arsenal._q;
    q.length = 0;
    game.animalGrid.query(this.x, this.y, this.size + 40, q);
    for (const a of q) {
      if (a.dead) continue;
      const rr = this.size + a.radius;
      if (dist2(this.x, this.y, a.x, a.y - a.bodyOff) >= rr * rr) continue;
      const last = this.hits.get(a);
      if (last !== undefined && game.time - last < 0.35) continue;
      this.hits.set(a, game.time);
      game.hitAnimal(a, this.dmg, this.x, this.y, 0.5, false, this.weaponId);
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(ctx, this.x, this.y + 2, this.size, this.size * 0.38);
    ctx.fill();
  }

  draw(ctx) {
    const r = this.size;
    ctx.save();
    ctx.translate(this.x, this.y - 16);
    ctx.scale(1, 0.62);
    ctx.rotate(this.spin);
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const rr = i % 2 ? r * 0.8 : r;
      const a = (i / 28) * TAU;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#c3ced6';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#e9eef2';
    ellipse(ctx, 0, 0, r * 0.6, r * 0.6); ctx.fill();
    ctx.fillStyle = '#5d6b75';
    ellipse(ctx, 0, 0, r * 0.2, r * 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(93,107,117,0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.45, 0); ctx.stroke();
    ctx.restore();
  }
}

class Dynamite {
  constructor(x, y, tx, ty, s, radius) {
    this.x0 = x; this.y0 = y;
    this.tx = tx; this.ty = ty;
    this.x = x; this.y = y; this.z = 20;
    this.dmg = s.dmg;
    this.radius = radius;
    this.t = 0;
    this.dur = clamp(Math.hypot(tx - x, ty - y) / 520, 0.35, 0.8);
    this.spin = 0;
    this.dead = false;
    this.weaponId = 'dynamite';
  }

  update(dt, game) {
    this.t += dt;
    this.spin += dt * 12;
    const k = Math.min(1, this.t / this.dur);
    this.x = lerp(this.x0, this.tx, k);
    this.y = lerp(this.y0, this.ty, k);
    this.z = 20 + Math.sin(k * Math.PI) * 90 - 20 * k;
    if (Math.random() < dt * 30) {
      game.particles.spawn({ x: this.x, y: this.y, z: this.z + 8, vx: rand(-20, 20), vy: rand(-20, 20), vz: rand(20, 60), g: 0,
        life: 0.25, size: 1.6, color: '#ffd23f', shape: 'spark' });
    }
    if (k >= 1) {
      this.dead = true;
      game.arsenal.explode(this.x, this.y, this.radius, this.dmg, this.weaponId);
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, this.x, this.y + 1, 7, 3);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    ctx.rotate(this.spin);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, -3.5, -9, 7, 18, 2);
    ctx.fillStyle = '#e5484d'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(-3.5, -2, 7, 3);
    ctx.strokeStyle = '#2a1b12';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(2, -13, 5, -13); ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ellipse(ctx, 5, -13, 2.2, 2.2); ctx.fill();
    ctx.restore();
  }
}

class Pike {
  constructor(x, y, angle, s) {
    this.x = x; this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * s.speed;
    this.vy = Math.sin(angle) * s.speed;
    this.dmg = s.dmg;
    this.len = s.len;
    this.pierce = s.pierce;
    this.life = 0.22;
    this.dead = false;
    this.hit = new Set();
    this.weaponId = 'pike';
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const q = game.arsenal._q;
    q.length = 0;
    game.animalGrid.query(this.x, this.y, this.len + 40, q);
    for (const a of q) {
      if (a.dead || this.hit.has(a)) continue;
      const dx = a.x - this.x, dy = a.y - a.bodyOff - this.y;
      const along = dx * c + dy * s;
      if (along < -10 || along > this.len) continue;
      const px = dx - c * along, py = dy - s * along;
      if (px * px + py * py > (12 + a.radius) * (12 + a.radius)) continue;
      this.hit.add(a);
      game.hitAnimal(a, this.dmg, a.x, a.y, 0.9, false, this.weaponId);
      if (--this.pierce <= 0) { this.dead = true; return; }
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ellipse(ctx, this.x, this.y + 2, 10, 3);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 10);
    ctx.rotate(this.angle);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(this.len * 0.55, 0); ctx.stroke();
    ctx.strokeStyle = '#9a6232';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(this.len * 0.55, 0); ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    ctx.beginPath();
    ctx.moveTo(this.len * 0.55, 0); ctx.lineTo(this.len * 0.55 - 10, -5); ctx.lineTo(this.len * 0.72, 0); ctx.lineTo(this.len * 0.55 - 10, 5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }
}

class FallingHammer {
  constructor(tx, ty, s) {
    this.tx = tx; this.ty = ty;
    this.x = tx; this.y = ty;
    this.z = 200 + rand(0, 40);
    this.dmg = s.dmg;
    this.radius = s.radius;
    this.spin = rand(0, TAU);
    this.dead = false;
    this.hit = false;
    this.age = 0;
    this.weaponId = 'hammerfall';
  }

  update(dt, game) {
    this.age += dt;
    this.spin += dt * 10;
    this.z = Math.max(0, this.z - 620 * dt);
    if (this.z > 0) return;
    if (!this.hit) {
      this.hit = true;
      const r = this.radius;
      const q = game.arsenal._q;
      q.length = 0;
      game.animalGrid.query(this.x, this.y, r + 40, q);
      for (const a of q) {
        if (a.dead) continue;
        if (dist2(this.x, this.y, a.x, a.y) < (r + a.radius * 0.5) * (r + a.radius * 0.5)) {
          game.hitAnimal(a, this.dmg, this.x, this.y, 1.2, false, this.weaponId);
        }
      }
      game.arsenal.blasts.push(new Blast(this.x, this.y, r * 0.85));
      game.fx.dust(this.x, this.y, 7);
      game.addShake(0.12);
      Sound.play('boom', 1.35);
    }
    if (this.age > 0.85) this.dead = true;
  }

  drawShadow(ctx) {
    const k = clamp(1 - this.z / 240, 0.2, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.22 * k).toFixed(3) + ')';
    ellipse(ctx, this.x, this.y + 1, 14 * k, 5 * k);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - this.z - 8);
    ctx.rotate(this.spin);
    ctx.fillStyle = '#6a7076';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, -11, -7, 22, 12, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a2e';
    roundRectPath(ctx, -3, 4, 6, 16, 1.5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

class Knife {
  constructor(x, y, angle, s) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * s.speed;
    this.vy = Math.sin(angle) * s.speed;
    this.angle = angle;
    this.dmg = s.dmg;
    this.pierce = s.pierce;
    this.life = s.range / s.speed;
    this.spin = 0;
    this.dead = false;
    this.hit = new Set();
    this.weaponId = 'knife';
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 28;
    const q = game.arsenal._q;
    q.length = 0;
    game.animalGrid.query(this.x, this.y, 48, q);
    for (const a of q) {
      if (a.dead || this.hit.has(a)) continue;
      const rr = 11 + a.radius;
      if (dist2(this.x, this.y, a.x, a.y - a.bodyOff) >= rr * rr) continue;
      this.hit.add(a);
      game.hitAnimal(a, this.dmg, this.x, this.y, 0.45, false, this.weaponId);
      if (--this.pierce <= 0) { this.dead = true; return; }
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ellipse(ctx, this.x, this.y + 2, 6, 2.5);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 10);
    ctx.rotate(this.angle + this.spin * 0.15);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#dfe7ec';
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-2, -3.5); ctx.lineTo(-6, 0); ctx.lineTo(-2, 3.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a2e';
    roundRectPath(ctx, -12, -2, 7, 4, 1); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

class GuardDog {
  constructor(game) {
    this.type = 'guarddog';
    this.game = game;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.alive = false;
    this.lifeT = 0;
    this.spawnT = 0.4;
    this.biteT = 0;
    this.flash = 0;
    this.walk = 0;
    this.target = null;
  }

  spawn(p, s) {
    this.alive = true;
    this.lifeT = s.duration;
    this.x = p.x + rand(-30, 30);
    this.y = p.y + rand(-20, 20);
    this.biteT = 0.2;
    this.flash = 0.25;
  }

  update(dt, s) {
    const g = this.game, p = g.player;
    if (this.flash > 0) this.flash -= dt;
    if (!this.alive) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && p.alive) {
        this.spawn(p, s);
        Sound.play('howl', 1.6);
      }
      return;
    }
    this.lifeT -= dt;
    if (this.lifeT <= 0 || !p.alive) {
      this.alive = false;
      this.spawnT = s.spawnCd;
      g.fx.dust(this.x, this.y, 5);
      return;
    }
    if (this.biteT > 0) this.biteT -= dt;

    let target = this.target;
    if (!target || target.dead || target.remove || dist2(target.x, target.y, p.x, p.y) > (s.orbit + 160) ** 2) {
      const near = g.arsenal.nearestHunt(p.x, p.y, s.orbit + 120, 1);
      target = near[0] || null;
      this.target = target;
    }

    let tx, ty, spd;
    if (target) {
      tx = target.x; ty = target.y;
      spd = s.speed * 1.15;
    } else {
      const a = g.time * 2.2;
      tx = p.x + Math.cos(a) * (s.orbit * 0.55);
      ty = p.y + Math.sin(a) * (s.orbit * 0.4);
      spd = s.speed * 0.75;
    }
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = damp(this.vx, (dx / d) * spd, 10, dt);
    this.vy = damp(this.vy, (dy / d) * spd, 10, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.abs(this.vx) > 20) this.facing = this.vx > 0 ? 1 : -1;
    this.walk += dt * (6 + Math.hypot(this.vx, this.vy) / 40);

    if (target && this.biteT <= 0) {
      const rr = 22 + target.radius;
      if (dist2(this.x, this.y, target.x, target.y) < rr * rr) {
        g.hitAnimal(target, s.dmg, this.x, this.y, 0.7, false, 'guarddog');
        this.biteT = s.biteCd * g.ps.cooldown;
        this.flash = 0.12;
        Sound.play('boarDie', 1.8);
      }
    }
  }

  drawShadow(ctx) {
    if (!this.alive) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x, this.y + 1, 14, 5);
    ctx.fill();
  }

  draw(ctx) {
    if (!this.alive) return;
    const flash = this.flash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);
    const bob = Math.sin(this.walk) * 1.5;
    ctx.translate(0, -6 + bob);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = flash ? '#fff' : '#c4a574';
    // body
    ellipse(ctx, 0, 0, 11, 7); ctx.fill(); ctx.stroke();
    // head
    ellipse(ctx, 12, -3, 6.5, 5.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = flash ? '#fff' : '#2a1b12';
    ellipse(ctx, 15.5, -4.5, 1.3, 1.3); ctx.fill();
    // ear
    ctx.fillStyle = flash ? '#fff' : '#a88858';
    ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(11, -14); ctx.lineTo(13, -6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // legs
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    const leg = Math.sin(this.walk) * 3;
    ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-7, 10 + leg); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(5, 10 - leg); ctx.stroke();
    // tail
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.quadraticCurveTo(-16, -8 + Math.sin(this.walk * 2) * 2, -14, -1); ctx.stroke();
    ctx.restore();
  }
}

class Bolt {
  constructor(x, y, angle, s, weaponId = 'crossbow') {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * s.speed;
    this.vy = Math.sin(angle) * s.speed;
    this.angle = angle;
    this.dmg = s.dmg;
    this.pierce = s.pierce;
    this.life = s.range / s.speed;
    this.dead = false;
    this.hit = new Set();
    this.weaponId = weaponId;
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const q = game.arsenal._q;
    q.length = 0;
    game.animalGrid.query(this.x, this.y, 50, q);
    for (const a of q) {
      if (a.dead || this.hit.has(a)) continue;
      const rr = 12 + a.radius;
      if (dist2(this.x, this.y, a.x, a.y - a.bodyOff) >= rr * rr) continue;
      this.hit.add(a);
      game.hitAnimal(a, this.dmg, this.x, this.y, 0.55, false, this.weaponId);
      if (--this.pierce <= 0) { this.dead = true; return; }
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ellipse(ctx, this.x, this.y + 2, 8, 3);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 12);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#6b4022';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -3.2); ctx.lineTo(6, 3.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5484d';
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-16, -3); ctx.lineTo(-10, 0); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/** Short-lived explosion flash drawn above everything. */
class Blast {
  constructor(x, y, r, fancy = false) {
    this.x = x; this.y = y; this.r = r;
    this.fancy = !!fancy;
    this.age = 0;
    this.life = fancy ? 0.55 : 0.32;
  }

  draw(ctx) {
    const k = this.age / this.life;
    const ease = easeOutCubic(Math.min(1, k * 1.35));
    const r = this.r * (0.4 + 0.7 * ease);
    const cx = this.x, cy = this.y - 12;
    ctx.save();
    if (this.fancy) {
      // Ground scorch
      ctx.globalAlpha = (1 - k) * 0.45;
      ctx.fillStyle = 'rgba(40, 18, 8, 0.85)';
      ellipse(ctx, this.x, this.y + 2, r * 0.95, r * 0.38);
      ctx.fill();
      // Outer shockwave ring
      ctx.globalAlpha = Math.max(0, 1 - k * 1.4) * 0.9;
      ctx.strokeStyle = 'rgba(255, 220, 140, 0.95)';
      ctx.lineWidth = 5 * (1 - k);
      ellipse(ctx, cx, cy, r * 1.15, r * 0.85);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 120, 40, 0.7)';
      ctx.lineWidth = 2.5 * (1 - k);
      ellipse(ctx, cx, cy, r * 1.05, r * 0.78);
      ctx.stroke();
      // Hot core bloom
      ctx.globalAlpha = Math.max(0, 1 - k * 1.6);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
      core.addColorStop(0, 'rgba(255,255,245,1)');
      core.addColorStop(0.25, 'rgba(255,230,120,0.95)');
      core.addColorStop(0.55, 'rgba(255,140,40,0.7)');
      core.addColorStop(1, 'rgba(180,40,10,0)');
      ctx.fillStyle = core;
      ellipse(ctx, cx, cy, r * 0.55, r * 0.45);
      ctx.fill();
      // Ember spokes
      ctx.globalAlpha = Math.max(0, 0.85 - k);
      ctx.strokeStyle = 'rgba(255, 180, 60, 0.85)';
      ctx.lineWidth = 2;
      const spokes = 10;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU + k * 0.8;
        const len = r * (0.55 + 0.45 * ease);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.1);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.75);
        ctx.stroke();
      }
    }
    // Main fireball
    ctx.globalAlpha = Math.max(0, 1 - k);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,250,210,0.98)');
    g.addColorStop(0.22, 'rgba(255,210,80,0.95)');
    g.addColorStop(0.5, 'rgba(255,110,30,0.75)');
    g.addColorStop(0.78, 'rgba(200,40,20,0.4)');
    g.addColorStop(1, 'rgba(80,20,10,0)');
    ctx.fillStyle = g;
    ellipse(ctx, cx, cy, r, r * 0.78);
    ctx.fill();
    ctx.restore();
  }
}

// ===========================================================================
// Arsenal: owned weapons, passives and their runtime state
// ===========================================================================

class Arsenal {
  constructor(game) {
    this.game = game;
    this.weapons = {};
    this.weaponElements = {};
    this.passives = {};
    this.order = [];
    this.cd = {};
    this.axes = [];
    this.axeAngle = -Math.PI / 2;
    this.axeR = 0;
    this.axeSpin = 0;
    this.auraR = 0;
    this.auraT = 0;
    this.auraFlash = 0;
    this.spikeR = 0;
    this.spikeT = 0;
    this.spikeFlash = 0;
    this.projectiles = [];
    this.blasts = [];
    this.dogs = [];
    this.version = 0;
    this._q = [];
    this._near = [];
  }

  level(id) { return this.weapons[id] || 0; }
  stats(id) { return WEAPON_DEFS[id].stats(this.weapons[id]); }
  elementOf(id) { return this.weaponElements[id] || null; }

  /** True if the player currently deals this element (weapon infusion or gear). */
  usesElement(el) {
    if (!el) return false;
    for (const id in this.weaponElements) {
      if (this.weaponElements[id] === el) return true;
    }
    const ps = this.game.ps;
    if (ps && ps.attackElement === el) return true;
    if (this.game.shop) {
      const gear = this.game.shop.bonuses();
      if (gear && gear.element === el) return true;
    }
    return false;
  }

  /** Elements the player can currently deal damage with. */
  usedElements() {
    const set = {};
    for (const id in this.weaponElements) {
      const el = this.weaponElements[id];
      if (el) set[el] = true;
    }
    const ps = this.game.ps;
    if (ps && ps.attackElement) set[ps.attackElement] = true;
    if (this.game.shop) {
      const gear = this.game.shop.bonuses();
      if (gear && gear.element) set[gear.element] = true;
    }
    return set;
  }

  apply(card) {
    if (card.kind === 'weapon') {
      if (!this.weapons[card.id]) {
        this.order.push(card.id);
        this.cd[card.id] = 0.4;
      }
      this.weapons[card.id] = (this.weapons[card.id] || 0) + 1;
    } else if (card.kind === 'passive') {
      this.passives[card.id] = (this.passives[card.id] || 0) + 1;
    } else if (card.kind === 'element') {
      if (this.weapons[card.id] && !this.weaponElements[card.id]) {
        this.weaponElements[card.id] = card.element;
      }
    }
    this.version++;
    this.game.syncPlayerStats();
  }

  /** Up to `n` distinct, weighted-random upgrade offers. */
  cardOptions(n, banished = null) {
    const banned = banished || new Set();
    const pool = [];
    const push = (card) => {
      if (!banned.has(cardKey(card))) pool.push(card);
    };
    for (const id in WEAPON_DEFS) {
      const l = this.level(id);
      if (l === 0 && this.order.length < MAX_WEAPONS) push({ kind: 'weapon', id, level: 1, w: 1.15 });
      else if (l > 0 && l < WEAPON_MAX) push({ kind: 'weapon', id, level: l + 1, w: 1.3 });
    }
    for (const id of this.order) {
      if (this.weaponElements[id]) continue;
      for (const el of ELEMENT_IDS) {
        push({ kind: 'element', id, element: el, level: 1, w: 0.55 });
      }
    }
    const used = this.usedElements();
    for (const id in PASSIVE_DEFS) {
      const l = this.passives[id] || 0;
      if (l >= PASSIVE_DEFS[id].max) continue;
      const needEl = ELEMENT_PASSIVES[id];
      if (needEl && !used[needEl]) continue;
      push({ kind: 'passive', id, level: l + 1, w: 0.85 });
    }
    const out = [];
    while (out.length < n && pool.length) {
      let total = 0;
      for (const c of pool) total += c.w;
      let r = Math.random() * total;
      let i = 0;
      while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
      out.push(pool.splice(i, 1)[0]);
    }
    if (!out.length) {
      if (!banned.has('bonus:gold')) out.push({ kind: 'bonus', id: 'gold', level: 0 });
      if (!banned.has('bonus:heal') && out.length < n) out.push({ kind: 'bonus', id: 'heal', level: 0 });
    }
    return out;
  }

  syncAxes() {
    const n = this.level('axe') ? this.stats('axe').count + this.game.ps.amount : 0;
    while (this.axes.length < n) this.axes.push(new AxeSprite(this.axes.length));
    this.axes.length = n;
    this.placeAxes();
  }

  /** Threat animals nearest to (x, y) within maxR, closest first. */
  nearest(x, y, maxR, n) {
    const out = this._near;
    out.length = 0;
    const max2 = maxR * maxR;
    for (const a of this.game.animals) {
      if (!a.isThreat()) continue;
      const d2 = dist2(a.x, a.y, x, y);
      if (d2 > max2) continue;
      a._d2 = d2;
      if (out.length < n) out.push(a);
      else if (d2 < out[out.length - 1]._d2) out[out.length - 1] = a;
      else continue;
      out.sort((p, q) => p._d2 - q._d2);
    }
    return out;
  }

  /** Current aim-lock target, if still valid. */
  lockedTarget() {
    const t = this.game.lockTarget;
    if (!t || t.dead || t.passive || t.remove) return null;
    return t;
  }

  /** Fightable beasts near (x, y) — includes calm hostiles, not only aggro'd threats. */
  nearestHunt(x, y, maxR, n) {
    const out = this._near;
    out.length = 0;
    const max2 = maxR * maxR;
    for (const a of this.game.animals) {
      if (a.dead || a.passive || a.remove) continue;
      const d2 = dist2(a.x, a.y, x, y);
      if (d2 > max2) continue;
      a._d2 = d2;
      if (out.length < n) out.push(a);
      else if (d2 < out[out.length - 1]._d2) out[out.length - 1] = a;
      else continue;
      out.sort((p, q) => p._d2 - q._d2);
    }
    return out;
  }

  /**
   * Prefer the aim-lock target, then fill remaining slots with nearest beasts.
   * Used by all directed weapons when F-lock is on.
   */
  aimTargets(x, y, maxR, n) {
    const out = [];
    const max2 = maxR * maxR;
    if (this.game.faceNearest) {
      const lock = this.lockedTarget();
      if (lock && dist2(lock.x, lock.y, x, y) <= max2) out.push(lock);
    }
    if (out.length >= n) return out;
    const near = this.game.faceNearest ? this.nearestHunt(x, y, maxR, n) : this.nearest(x, y, maxR, n);
    for (let i = 0; i < near.length; i++) {
      const a = near[i];
      if (out.indexOf(a) >= 0) continue;
      out.push(a);
      if (out.length >= n) break;
    }
    return out;
  }

  /** Aim angle toward lock / nearest beast, or a facing/movement fallback. */
  aimAngle(fallbackMoving) {
    const g = this.game, p = g.player;
    if (g.faceNearest) {
      const lock = this.lockedTarget() || this.nearestHunt(p.x, p.y, 560, 1)[0];
      if (lock) return Math.atan2(lock.y - lock.bodyOff - (p.y - 4), lock.x - p.x);
    }
    if (fallbackMoving) {
      const moving = Math.hypot(p.vx, p.vy) > 12;
      if (moving) return Math.atan2(p.vy, p.vx);
    }
    return p.facing > 0 ? 0 : Math.PI;
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.updateAxes(dt);
    if (this.auraFlash > 0) this.auraFlash -= dt;
    if (this.spikeFlash > 0) this.spikeFlash -= dt;
    if (p.alive) {
      for (const id of this.order) {
        if (id === 'axe') continue;
        if (id === 'aura') { this.updateAura(dt); continue; }
        if (id === 'spikes') { this.updateSpikes(dt); continue; }
        if (id === 'guarddog') { this.updateGuardDogs(dt); continue; }
        this.cd[id] -= dt;
        if (this.cd[id] > 0) continue;
        this.cd[id] = this.fire(id) ? this.stats(id).cd * g.ps.cooldown : 0.2;
      }
    } else if (this.dogs.length) {
      for (const d of this.dogs) d.alive = false;
    }
    for (let i = 0; i < this.projectiles.length; i++) this.projectiles[i].update(dt, g);
    compactInPlace(this.projectiles, (o) => o.dead);
    for (const b of this.blasts) b.age += dt;
    compactInPlace(this.blasts, (b) => b.age >= b.life);
  }

  fire(id) {
    const g = this.game, p = g.player, s = this.stats(id);
    const count = s.count + g.ps.amount;
    if (id === 'hatchet') {
      const targets = this.aimTargets(p.x, p.y, s.range, count);
      if (!targets.length) return false;
      for (let i = 0; i < count; i++) {
        const t = targets[i % targets.length];
        const spread = i >= targets.length ? (i - targets.length + 1) * 0.22 * (i % 2 ? 1 : -1) : 0;
        const ang = Math.atan2(t.y - t.bodyOff - (p.y - 4), t.x - p.x) + spread;
        this.projectiles.push(new Hatchet(p.x, p.y - 4, ang, s));
      }
      Sound.play('throw');
      return true;
    }
    if (id === 'saw') {
      const targets = this.aimTargets(p.x, p.y, 420, 1);
      const base = targets.length
        ? Math.atan2(targets[0].y - p.y, targets[0].x - p.x)
        : this.aimAngle(true);
      const sz = Object.assign({}, s, { size: s.size * g.ps.area, dist: s.dist * g.ps.area });
      for (let i = 0; i < count; i++) {
        const off = count === 1 ? 0 : (i / count) * TAU;
        this.projectiles.push(new SawBlade(p.x, p.y, base + off, sz));
      }
      Sound.play('throw', 0.7);
      return true;
    }
    if (id === 'pike') {
      const ang = this.aimAngle(true);
      for (let i = 0; i < count; i++) {
        const spread = count === 1 ? 0 : (i - (count - 1) / 2) * 0.28;
        this.projectiles.push(new Pike(p.x, p.y - 4, ang + spread, s));
      }
      Sound.play('throw', 1.2);
      return true;
    }
    if (id === 'crossbow') {
      const targets = this.aimTargets(p.x, p.y, s.range, count);
      if (!targets.length) return false;
      for (let i = 0; i < count; i++) {
        const t = targets[i % targets.length];
        const spread = i >= targets.length ? (i - targets.length + 1) * 0.18 * (i % 2 ? 1 : -1) : 0;
        const ang = Math.atan2(t.y - t.bodyOff - (p.y - 8), t.x - p.x) + spread;
        this.projectiles.push(new Bolt(p.x, p.y - 8, ang, s));
      }
      Sound.play('bow');
      return true;
    }
    if (id === 'dynamite') {
      const targets = this.aimTargets(p.x, p.y, 460, Math.max(count, 6));
      if (!targets.length) return false;
      const radius = s.radius * g.ps.area;
      const lock = g.faceNearest ? this.lockedTarget() : null;
      for (let i = 0; i < count; i++) {
        // First stick always goes at the lock; extras scatter among aim targets.
        const t = (i === 0 && lock && targets.indexOf(lock) >= 0)
          ? lock
          : targets[Math.floor(Math.random() * targets.length)];
        const scatter = t === lock ? rand(-8, 8) : rand(-20, 20);
        const tx = t.x + t.vx * 0.5 + scatter, ty = t.y + t.vy * 0.5 + scatter;
        this.projectiles.push(new Dynamite(p.x, p.y, tx, ty, s, radius));
      }
      Sound.play('throw', 0.55);
      return true;
    }
    if (id === 'hammerfall') {
      const pool = this.nearestHunt(p.x, p.y, s.range * g.ps.area, Math.max(count * 3, 8));
      if (!pool.length) return false;
      const smash = Object.assign({}, s, { radius: s.radius * g.ps.area });
      for (let i = 0; i < count; i++) {
        const t = pool[Math.floor(Math.random() * pool.length)];
        const tx = t.x + rand(-18, 18), ty = t.y + rand(-12, 12);
        this.projectiles.push(new FallingHammer(tx, ty, smash));
      }
      Sound.play('throw', 0.45);
      return true;
    }
    if (id === 'longbow') {
      const targets = this.aimTargets(p.x, p.y, s.range, count);
      if (!targets.length) return false;
      for (let i = 0; i < count; i++) {
        const t = targets[i % targets.length];
        const spread = i >= targets.length ? (i - targets.length + 1) * 0.12 * (i % 2 ? 1 : -1) : 0;
        const ang = Math.atan2(t.y - t.bodyOff - (p.y - 8), t.x - p.x) + spread;
        this.projectiles.push(new Bolt(p.x, p.y - 8, ang, s, 'longbow'));
      }
      Sound.play('bow', 0.75);
      return true;
    }
    if (id === 'knife') {
      const pool = this.nearestHunt(p.x, p.y, s.range, Math.max(count, 6));
      if (!pool.length) return false;
      const focus = pool[Math.floor(Math.random() * pool.length)];
      const base = Math.atan2(focus.y - focus.bodyOff - (p.y - 4), focus.x - p.x);
      const cone = s.cone || 0.45;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const ang = base + (t - 0.5) * cone * 2 + rand(-0.04, 0.04);
        this.projectiles.push(new Knife(p.x, p.y - 4, ang, s));
      }
      Sound.play('throw', 1.25);
      return true;
    }
    return false;
  }

  updateGuardDogs(dt) {
    const s = this.stats('guarddog');
    const want = 1 + (this.weapons.guarddog >= 8 ? 1 : 0);
    while (this.dogs.length < want) this.dogs.push(new GuardDog(this.game));
    this.dogs.length = want;
    for (const d of this.dogs) d.update(dt, s);
  }

  explode(x, y, r, dmg, weaponId = 'dynamite') {
    const g = this.game, q = this._q;
    const fancy = weaponId === 'dynamite';
    q.length = 0;
    g.animalGrid.query(x, y, r + 50, q);
    for (const a of q) {
      if (a.dead) continue;
      const rr = r + a.radius * 0.5;
      if (dist2(x, y, a.x, a.y) < rr * rr) g.hitAnimal(a, dmg, x, y, fancy ? 1.75 : 1.4, false, weaponId);
    }
    q.length = 0;
    g.world.staticGrid.query(x, y, r + 50, q);
    for (const o of q) {
      if (!o.isHittable()) continue;
      const rr = r + o.hitR * 0.5;
      if (dist2(x, y, o.x, o.y) < rr * rr) g.hitStatic(o, dmg, x, y);
    }
    this.blasts.push(new Blast(x, y, r * (fancy ? 1.15 : 1), fancy));
    if (fancy) {
      g.fx.explosion(x, y, r);
      g.addShake(0.48);
      Sound.play('boom', 0.85);
    } else {
      g.fx.dust(x, y, 10);
      g.fx.sparks(x, y - 10, 14, '#ffb347');
      g.fx.ring(x, y, 'rgba(255,170,70,0.9)', r * 0.3, r * 1.1, 0.35);
      g.addShake(0.22);
      Sound.play('boom');
    }
  }

  updateSpikes(dt) {
    const g = this.game, p = g.player, s = this.stats('spikes');
    this.spikeR = s.radius * g.ps.area;
    this.spikeT -= dt;
    if (this.spikeT > 0) return;
    this.spikeT = s.tick * g.ps.cooldown;
    const q = this._q, r = this.spikeR;
    q.length = 0;
    g.animalGrid.query(p.x, p.y, r + 30, q);
    let any = false;
    for (const a of q) {
      if (a.dead) continue;
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d > r + a.radius * 0.5 || d < 18) continue;
      g.hitAnimal(a, s.dmg, a.x, a.y - a.bodyOff, 0.4, false, 'spikes');
      any = true;
    }
    if (any) this.spikeFlash = 0.18;
  }

  updateAura(dt) {
    const g = this.game, p = g.player, s = this.stats('aura');
    this.auraR = s.radius * g.ps.area;
    this.auraT -= dt;
    if (this.auraT > 0) return;
    this.auraT = s.tick * g.ps.cooldown;
    const q = this._q, r = this.auraR;
    q.length = 0;
    g.animalGrid.query(p.x, p.y, r + 30, q);
    let any = false;
    for (const a of q) {
      if (a.dead) continue;
      const rr = r + a.radius * 0.6;
      if (dist2(p.x, p.y, a.x, a.y) >= rr * rr) continue;
      g.hitAnimal(a, s.dmg, a.x, a.y - a.bodyOff, 0.15, true, 'aura');
      g.particles.spawn({ x: a.x + rand(-6, 6), y: a.y, z: a.bodyOff + 6, vx: rand(-15, 15), vy: 0, vz: rand(40, 80), g: -10,
        life: rand(0.3, 0.5), size: rand(1.5, 2.5), color: Math.random() < 0.5 ? '#ffb347' : '#ff6a3d', drag: 1 });
      any = true;
    }
    if (any) this.auraFlash = 0.12;
  }

  // -------------------------------------------------------------------------
  // Orbiting axes
  // -------------------------------------------------------------------------

  placeAxes() {
    const p = this.game.player, R = this.axeR, n = this.axes.length;
    for (let i = 0; i < n; i++) {
      const axe = this.axes[i];
      axe.angle = this.axeAngle + (i / n) * TAU;
      axe.x = p.x + Math.cos(axe.angle) * R;
      axe.y = p.y + Math.sin(axe.angle) * R;
    }
  }

  /**
   * Each axe sweeps the segment from the player out to its orbit, so targets
   * hugging the player are hit as well as those at full range. The sweep is
   * sub-stepped along the arc so fast spins or low frame rates never skip a target.
   */
  updateAxes(dt) {
    const g = this.game, p = g.player, n = this.axes.length;
    if (!n) return;
    const s = this.stats('axe');
    this.axeR = s.range * g.ps.area;
    this.axeSpin = s.speed * g.ps.spin;
    const prev = this.axeAngle;
    const delta = this.axeSpin * dt;
    this.axeAngle = (this.axeAngle + delta) % TAU;
    for (const axe of this.axes) {
      axe.spin += dt * 15;
      if (axe.flash > 0) axe.flash -= dt;
    }
    if (p.alive) {
      const steps = clamp(Math.ceil((delta * this.axeR) / 12), 1, 10);
      for (let st = 1; st <= steps; st++) {
        const base = prev + (delta * st) / steps;
        for (let i = 0; i < n; i++) {
          const a = base + (i / n) * TAU;
          this.axeSweep(this.axes[i], p.x, p.y, Math.cos(a), Math.sin(a), p.radius + 4, this.axeR, s.dmg);
        }
      }
    }
    this.placeAxes();
  }

  axeSweep(axe, px, py, c, s, r0, r1, dmg) {
    const g = this.game;
    const half = (r1 - r0) / 2;
    const mx = px + c * (r0 + half), my = py + s * (r0 + half);
    const q = this._q;
    q.length = 0;
    g.world.staticGrid.query(mx, my, half + AXE_HIT_RADIUS + 34, q);
    for (let i = 0; i < q.length; i++) {
      const o = q[i];
      if (!o.isHittable()) continue;
      const t = clamp((o.x - px) * c + (o.y - py) * s, r0, r1);
      const hx = px + c * t, hy = py + s * t;
      const rr = AXE_HIT_RADIUS + o.hitR;
      if (dist2(hx, hy, o.x, o.y) < rr * rr) this.tryAxeHit(o, axe, hx, hy, dmg);
    }
    q.length = 0;
    g.animalGrid.query(mx, my, half + AXE_HIT_RADIUS + 30, q);
    for (let i = 0; i < q.length; i++) {
      const b = q[i];
      if (b.dead) continue;
      const by = b.y - b.bodyOff;
      const t = clamp((b.x - px) * c + (by - py) * s, r0, r1);
      const hx = px + c * t, hy = py + s * t;
      const rr = AXE_HIT_RADIUS + b.radius;
      if (dist2(hx, hy, b.x, by) < rr * rr) this.tryAxeHit(b, axe, hx, hy, dmg);
    }
  }

  tryAxeHit(target, axe, x, y, dmg) {
    const g = this.game;
    const last = target.hitLog.get(axe.id);
    if (last !== undefined && g.time - last < HIT_COOLDOWN) return;
    target.hitLog.set(axe.id, g.time);
    axe.flash = 0.06;
    if (target.type === 'animal') g.hitAnimal(target, dmg, x, y, 1, false, 'axe');
    else g.hitStatic(target, dmg, x, y);
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  /** Ground-level effects drawn under every entity. */
  drawGround(ctx) {
    const g = this.game, p = g.player;
    if (!p.alive) return;
    if (this.level('spikes')) this.drawSpikes(ctx, p);
    if (!this.level('aura')) return;
    const r = this.auraR, t = g.time;
    const glow = 0.16 + (this.auraFlash > 0 ? 0.1 : 0) + Math.sin(t * 6) * 0.03;
    const grad = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r);
    grad.addColorStop(0, 'rgba(255,140,40,0)');
    grad.addColorStop(0.75, 'rgba(255,120,30,' + (glow * 0.6).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(255,90,20,' + glow.toFixed(3) + ')');
    ctx.fillStyle = grad;
    ellipse(ctx, p.x, p.y, r, r * 0.92);
    ctx.fill();
    const n = Math.round(10 + r / 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.9;
      const fx = p.x + Math.cos(a) * r, fy = p.y + Math.sin(a) * r * 0.92;
      const h = 9 + Math.sin(t * 13 + i * 1.7) * 3.5;
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy);
      ctx.quadraticCurveTo(fx - 4, fy - h * 0.5, fx, fy - h);
      ctx.quadraticCurveTo(fx + 4, fy - h * 0.5, fx + 4, fy);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,120,40,0.85)' : 'rgba(255,200,80,0.85)';
      ctx.fill();
    }
  }

  drawSpikes(ctx, p) {
    const r = this.spikeR, t = this.game.time;
    const flash = this.spikeFlash > 0;
    const n = Math.max(8, Math.round(r / 9));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.15;
      const k = flash ? 1 : 0.55 + Math.sin(t * 8 + i) * 0.08;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.92;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      roundRectPath(ctx, -3.5, -18 * k, 7, 18 * k, 1.5);
      ctx.fillStyle = flash ? '#fff0c8' : '#9a6232';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3.5, -18 * k); ctx.lineTo(0, -26 * k); ctx.lineTo(3.5, -18 * k);
      ctx.closePath();
      ctx.fillStyle = flash ? '#fff' : '#c08850';
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  /** Motion trails of the orbiting axes (above shadows, below sprites). */
  drawTrails(ctx) {
    const p = this.game.player;
    if (!p.alive || !this.axes.length) return;
    const R = this.axeR;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ellipse(ctx, p.x, p.y, R, R);
    ctx.stroke();
    const len = clamp(this.axeSpin * 0.09, 0.35, 1.0);
    const segs = 6;
    const inner = p.radius + 4;
    ctx.lineCap = 'round';
    for (const axe of this.axes) {
      for (let i = 0; i < segs; i++) {
        const a1 = axe.angle - (len * i) / segs;
        const a0 = axe.angle - (len * (i + 1)) / segs;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.09 * (1 - i / segs)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, a0, a1);
        ctx.arc(p.x, p.y, inner, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < segs; i++) {
        const a1 = axe.angle - (len * i) / segs;
        const a0 = axe.angle - (len * (i + 1)) / segs;
        const k = 1 - i / segs;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.34 * k).toFixed(3) + ')';
        ctx.lineWidth = 10 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y - AXE_HEIGHT, R, a0, a1);
        ctx.stroke();
      }
    }
  }

  collectVisible(out, x0, y0, x1, y1) {
    if (this.game.player.alive) for (const a of this.axes) out.push(a);
    for (const o of this.projectiles) {
      if (o.x > x0 - 40 && o.x < x1 + 40 && o.y > y0 - 40 && o.y < y1 + 120) out.push(o);
    }
    for (const d of this.dogs) {
      if (d.alive && d.x > x0 - 40 && d.x < x1 + 40 && d.y > y0 - 40 && d.y < y1 + 60) out.push(d);
    }
  }

  drawAbove(ctx) {
    const g = this.game;
    for (const b of this.blasts) {
      if (!g.inView(b.x, b.y, b.r + 20)) continue;
      b.draw(ctx);
    }
  }
}
