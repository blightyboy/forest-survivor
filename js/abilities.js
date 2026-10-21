'use strict';

/**
 * Elemental specials (any elemental enemy) and randomized boss moves.
 * Abilities are separate from the regular windup→lunge melee loop and always
 * telegraph before dealing damage.
 */

const ELEMENT_ABILITY = {
  fire: {
    id: 'elem_charge', cd: 5.5, tele: 0.85, active: 0.48, speed: 460,
    dmgMul: 1.4, range: 300, color: '#ff6a3d',
  },
  water: {
    id: 'elem_bolt', cd: 4.4, tele: 0.7, speed: 300, radius: 11,
    dmgMul: 0.95, range: 440, color: '#4db8ff',
  },
  nature: {
    id: 'elem_poison', cd: 5.2, tele: 0.75, dmgMul: 0.5, poisonDpsMul: 0.3,
    poisonT: 4.2, range: 210, splash: 48, color: '#6dd46a',
  },
  earth: {
    id: 'elem_spikes', cd: 6.8, tele: 2.0, count: 3, radius: 34,
    dmgMul: 1.15, range: 270, color: '#c4a35a',
  },
  light: {
    id: 'elem_nova', cd: 6.2, tele: 1.2, radius: 105, dmgMul: 1.25,
    range: 170, color: '#ffe66d',
  },
  darkness: {
    id: 'elem_gloom', cd: 5.8, tele: 1.0, radius: 125, dmgMul: 0.35,
    slow: 0.5, slowT: 2.6, range: 190, color: '#9b7bde',
  },
};

const BOSS_ABILITY = {
  boss_charge: {
    name: 'Rampage', tele: 1.05, active: 0.75, speed: 560, dmgMul: 1.85,
    cd: 8.5, color: '#ff8a5a',
  },
  boss_fireground: {
    name: 'Fiery Ground', tele: 0.55, active: 1.5, trailEvery: 0.14,
    dmgMul: 0.5, groundLife: 5.5, groundR: 42, groundDpsMul: 0.45, cd: 10, color: '#ff6a3d',
  },
  boss_inspire: {
    name: 'Inspiring Aura', tele: 0.9, duration: 7, radius: 230, mul: 1.5,
    cd: 14, color: '#ffe66d',
  },
  boss_breath: {
    name: 'Water Breath', tele: 2.0, active: 0.4, range: 240, halfAngle: 0.58,
    dmgMul: 1.7, cd: 11, color: '#4db8ff',
  },
};

const BOSS_ABILITY_IDS = Object.keys(BOSS_ABILITY);

function rollBossAbilities(n = 2) {
  const pool = BOSS_ABILITY_IDS.slice();
  const out = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// ===========================================================================
// Hazards & enemy projectiles
// ===========================================================================

class Hazard {
  constructor(opts) {
    this.type = opts.type;
    this.x = opts.x; this.y = opts.y;
    this.r = opts.r || 36;
    this.life = opts.life || 3;
    this.age = 0;
    this.delay = opts.delay || 0;   // earth spikes: erupt after delay
    this.dmg = opts.dmg || 0;
    this.dps = opts.dps || 0;
    this.element = opts.element || null;
    this.color = opts.color || '#ff6a3d';
    this.hit = false;
    this.dead = false;
    this.owner = opts.owner || null;
  }

  update(dt, game) {
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; return; }
    const p = game.player;
    if (!p.alive) return;

    if (this.type === 'spikes') {
      if (this.age < this.delay) return;
      if (!this.hit && this.age < this.delay + 0.35) {
        if (dist2(this.x, this.y, p.x, p.y) < Math.pow(this.r + p.radius * 0.5, 2)) {
          this.hit = true;
          p.takeDamage(this.dmg, game, this.x, this.y, this.element);
          game.fx.dust(this.x, this.y, 6);
          game.fx.sparks(this.x, this.y - 8, 8, this.color);
        }
      }
      return;
    }

    if (this.type === 'burn') {
      if (dist2(this.x, this.y, p.x, p.y) < Math.pow(this.r + p.radius * 0.4, 2)) {
        this._acc = (this._acc || 0) + this.dps * dt;
        if (this._acc >= 1) {
          const d = Math.floor(this._acc);
          this._acc -= d;
          p.takeDamage(d, game, this.x, this.y, this.element || 'fire');
        }
      }
    }
  }

  draw(ctx, game) {
    if (this.type === 'spikes') {
      const erupting = this.age >= this.delay;
      const warn = clamp(this.age / Math.max(0.01, this.delay), 0, 1);
      ctx.save();
      if (!erupting) {
        ctx.globalAlpha = 0.25 + warn * 0.45;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2 + warn * 2;
        ctx.setLineDash([6, 5]);
        ellipse(ctx, this.x, this.y, this.r, this.r * 0.55);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(196,163,90,' + (0.12 + warn * 0.2).toFixed(3) + ')';
        ellipse(ctx, this.x, this.y, this.r * warn, this.r * 0.55 * warn);
        ctx.fill();
        // countdown ring
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, this.r * 0.7, -Math.PI / 2, -Math.PI / 2 + warn * TAU);
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const pop = clamp(1 - (this.age - this.delay) / 0.45, 0, 1);
        const h = 18 + pop * 22;
        ctx.fillStyle = '#8a6a3a';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(this.x + i * 10, this.y + 4);
          ctx.lineTo(this.x + i * 10 - 5, this.y + 4 - h * 0.4);
          ctx.lineTo(this.x + i * 10, this.y + 4 - h);
          ctx.lineTo(this.x + i * 10 + 5, this.y + 4 - h * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        ctx.globalAlpha = pop * 0.5;
        ctx.fillStyle = this.color;
        ellipse(ctx, this.x, this.y, this.r, this.r * 0.5);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (this.type === 'burn') {
      const pulse = 0.55 + Math.sin(game.time * 9 + this.x) * 0.12;
      const fade = clamp(1 - this.age / this.life, 0, 1);
      ctx.save();
      const g = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, this.r);
      g.addColorStop(0, 'rgba(255,140,40,' + (0.45 * pulse * fade).toFixed(3) + ')');
      g.addColorStop(0.7, 'rgba(230,60,20,' + (0.28 * fade).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(180,30,10,0)');
      ctx.fillStyle = g;
      ellipse(ctx, this.x, this.y, this.r, this.r * 0.72);
      ctx.fill();
      ctx.restore();
    }
  }
}

class EnemyBolt {
  constructor(x, y, angle, opts) {
    this.x = x; this.y = y;
    this.ang = angle;
    this.vx = Math.cos(angle) * opts.speed;
    this.vy = Math.sin(angle) * opts.speed;
    this.r = opts.radius || 11;
    this.dmg = opts.dmg;
    this.element = opts.element || null;
    this.color = opts.color || '#4db8ff';
    this.kind = opts.kind || 'bolt';
    this.hitBuildings = !!opts.hitBuildings;
    this.spin = opts.spin || 0;
    this.rot = Math.random() * TAU;
    this.life = opts.life || 1.8;
    this.dead = false;
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.spin) this.rot += this.spin * dt;
    const p = game.player;
    if (p.alive && dist2(this.x, this.y, p.x, p.y) < Math.pow(this.r + p.radius, 2)) {
      p.takeDamage(this.dmg, game, this.x, this.y, this.element);
      if (this.element) game.fx.elementHit(this.x, this.y - 8, this.element, 1);
      else game.fx.sparks(this.x, this.y - 6, 6, this.color);
      this.dead = true;
      return;
    }
    if (this.hitBuildings && game.base) {
      const core = game.base.core;
      if (core && core.alive && dist2(this.x, this.y, core.x, core.y) < Math.pow(this.r + (core.solidR || 28), 2)) {
        core.takeHit(this.dmg, game);
        game.fx.sparks(this.x, this.y, 5, this.color);
        this.dead = true;
        return;
      }
      const walls = game.base.walls;
      if (walls) {
        for (let i = 0; i < walls.length; i++) {
          const w = walls[i];
          if (!w.alive) continue;
          if (dist2(this.x, this.y, w.x, w.y) < Math.pow(this.r + w.solidR, 2)) {
            w.takeHit(this.dmg, game);
            game.fx.sparks(this.x, this.y, 5, this.color);
            this.dead = true;
            return;
          }
        }
      }
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(ctx, this.x, this.y + 2, this.r, this.r * 0.4);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 10);
    if (this.kind === 'wool') {
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color || '#f4f0e8';
      ellipse(ctx, 0, 0, this.r, this.r * 0.9); ctx.fill();
      ctx.fillStyle = '#fff';
      ellipse(ctx, -3, -3, this.r * 0.45, this.r * 0.4); ctx.fill();
      ellipse(ctx, 4, -1, this.r * 0.35, this.r * 0.32); ctx.fill();
      ellipse(ctx, 0, 4, this.r * 0.38, this.r * 0.3); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
      ellipse(ctx, 0, 0, this.r, this.r * 0.9); ctx.stroke();
    } else if (this.kind === 'log') {
      ctx.rotate(this.ang + this.rot);
      const L = this.r * 2.4, W = this.r * 0.85;
      roundRectPath(ctx, -L / 2, -W / 2, L, W, 3);
      ctx.fillStyle = this.color || '#8a5a2a'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#c48a4a';
      ellipse(ctx, -L / 2 + 1, 0, W * 0.42, W * 0.42); ctx.fill();
      ellipse(ctx, L / 2 - 1, 0, W * 0.42, W * 0.42); ctx.fill();
      ctx.strokeStyle = 'rgba(40,20,8,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-L * 0.2, -W * 0.15); ctx.lineTo(L * 0.25, -W * 0.1); ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, this.r + 4);
      g.addColorStop(0, '#dff6ff');
      g.addColorStop(0.55, this.color);
      g.addColorStop(1, 'rgba(30,80,160,0)');
      ctx.fillStyle = g;
      ellipse(ctx, 0, 0, this.r + 3, this.r + 3);
      ctx.fill();
      ctx.fillStyle = '#eaf8ff';
      ellipse(ctx, -2, -2, this.r * 0.45, this.r * 0.45);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ===========================================================================
// Ability helpers attached onto Animal instances
// ===========================================================================

function initAnimalAbilities(a, opts = {}) {
  a.trueBoss = !!opts.trueBoss;
  a.abilityCd = rand(1.5, 3.5);
  a.ability = null;
  a.bossMoves = a.trueBoss ? (opts.bossMoves || rollBossAbilities(2)) : [];
  a.bossMoveCd = {};
  for (const id of a.bossMoves) a.bossMoveCd[id] = rand(2, 5);
  a.inspireT = 0;
  a.inspireMul = 1;
  a._abilTrail = 0;
  a._abilHit = false;
  if (a.trueBoss) {
    a.boss = true;
    a.name = '★ ' + (BOSS_NAMES[a.species] || ('Great ' + a.sp.name));
  }
}

function animalEffectiveDamage(a) {
  return Math.max(1, Math.round(a.attackDamage * (a.inspireMul || 1)));
}

/** Called from Animal.updateHostile when chasing — may start a special. */
function tryStartAnimalAbility(a, game, dx, dy, d) {
  if (a.ability || a.dead || a.state === 'windup' || a.state === 'lunge') return false;
  if (!game.player.alive) return false;

  // Prefer a ready boss move when available.
  if (a.trueBoss && a.bossMoves.length) {
    const ready = a.bossMoves.filter((id) => (a.bossMoveCd[id] || 0) <= 0);
    if (ready.length && d < 400) {
      const id = ready[Math.floor(Math.random() * ready.length)];
      return beginAbility(a, game, id, dx, dy, d);
    }
  }

  if (a.abilityCd > 0) return false;
  if (!a.element || !ELEMENT_ABILITY[a.element]) return false;
  const def = ELEMENT_ABILITY[a.element];
  if (d > def.range) return false;
  // Don't interrupt if player is very close — let melee happen sometimes.
  if (d < a.radius + game.player.radius + 10 && Math.random() < 0.45) return false;
  return beginAbility(a, game, def.id, dx, dy, d);
}

function beginAbility(a, game, id, dx, dy, d) {
  const p = game.player;
  const ang = Math.atan2(dy, dx);
  a._abilHit = false;
  a._abilTrail = 0;

  if (id === 'elem_charge' || id === 'boss_charge') {
    const def = id === 'boss_charge' ? BOSS_ABILITY.boss_charge : ELEMENT_ABILITY.fire;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, tx: Math.cos(ang), ty: Math.sin(ang),
      speed: def.speed, dmgMul: def.dmgMul, color: def.color,
      active: def.active, pathLen: id === 'boss_charge' ? 420 : 280,
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Sound.play(a.species === 'bear' || a.species === 'dire_bear' ? 'roar' : 'growl');
    return true;
  }

  if (id === 'elem_bolt') {
    const def = ELEMENT_ABILITY.water;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, aimX: p.x, aimY: p.y, color: def.color, dmgMul: def.dmgMul,
      speed: def.speed, radius: def.radius,
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Sound.play('grunt');
    return true;
  }

  if (id === 'elem_poison') {
    const def = ELEMENT_ABILITY.nature;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      tx: p.x, ty: p.y, color: def.color, dmgMul: def.dmgMul,
      poisonDpsMul: def.poisonDpsMul, poisonT: def.poisonT, splash: def.splash,
    };
    a.state = 'ability';
    Sound.play('growl');
    return true;
  }

  if (id === 'elem_spikes') {
    const def = ELEMENT_ABILITY.earth;
    const spots = [];
    const baseAng = ang;
    for (let i = 0; i < def.count; i++) {
      const spread = (i - (def.count - 1) / 2) * 0.55;
      const dist = clamp(d * 0.55 + i * 28, 60, def.range);
      spots.push({
        x: a.x + Math.cos(baseAng + spread) * dist + rand(-18, 18),
        y: a.y + Math.sin(baseAng + spread) * dist + rand(-18, 18),
      });
    }
    // Always include one near the player
    spots[0] = { x: p.x + rand(-20, 20), y: p.y + rand(-20, 20) };
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      spots, color: def.color, dmgMul: def.dmgMul, radius: def.radius,
    };
    a.state = 'ability';
    // Spawn warning hazards immediately (erupt after full tele time)
    for (const s of spots) {
      game.hazards.push(new Hazard({
        type: 'spikes', x: s.x, y: s.y, r: def.radius, delay: def.tele,
        life: def.tele + 0.7, dmg: Math.round(animalEffectiveDamage(a) * def.dmgMul),
        element: 'earth', color: def.color, owner: a,
      }));
    }
    Sound.play('grunt');
    return true;
  }

  if (id === 'elem_nova') {
    const def = ELEMENT_ABILITY.light;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, color: def.color, dmgMul: def.dmgMul,
    };
    a.state = 'ability';
    Sound.play('roar');
    return true;
  }

  if (id === 'elem_gloom') {
    const def = ELEMENT_ABILITY.darkness;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, color: def.color, dmgMul: def.dmgMul,
      slow: def.slow, slowT: def.slowT,
    };
    a.state = 'ability';
    Sound.play('growl');
    return true;
  }

  if (id === 'boss_fireground') {
    const def = BOSS_ABILITY.boss_fireground;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, tx: Math.cos(ang), ty: Math.sin(ang),
      speed: a.chaseSpeed * 1.35, active: def.active,
      trailEvery: def.trailEvery, dmgMul: def.dmgMul,
      groundLife: def.groundLife, groundR: def.groundR,
      groundDpsMul: def.groundDpsMul, color: def.color,
    };
    a.state = 'ability';
    Sound.play('roar');
    return true;
  }

  if (id === 'boss_inspire') {
    const def = BOSS_ABILITY.boss_inspire;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, mul: def.mul, buffDur: def.duration, color: def.color,
    };
    a.state = 'ability';
    Sound.play('howl');
    return true;
  }

  if (id === 'boss_breath') {
    const def = BOSS_ABILITY.boss_breath;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, range: def.range, halfAngle: def.halfAngle,
      dmgMul: def.dmgMul, active: def.active, color: def.color,
    };
    a.state = 'ability';
    a.facing = Math.cos(ang) > 0 ? 1 : -1;
    Sound.play('roar');
    return true;
  }

  return false;
}

function finishAbility(a, id) {
  a.ability = null;
  a.state = 'recover';
  a.stateT = 0.45;
  if (id && id.startsWith('elem_') && a.element && ELEMENT_ABILITY[a.element]) {
    a.abilityCd = ELEMENT_ABILITY[a.element].cd * (a.trueBoss ? 0.75 : 1);
  } else if (id && BOSS_ABILITY[id]) {
    a.bossMoveCd[id] = BOSS_ABILITY[id].cd;
    a.abilityCd = 1.2;
  } else {
    a.abilityCd = 3;
  }
}

/** Returns [tvx, tvy] while ability is active; mutates animal state. */
function updateAnimalAbility(a, dt, game, dx, dy, d) {
  const ab = a.ability;
  if (!ab) return [0, 0];
  const p = game.player;
  ab.t -= dt;
  let tvx = 0, tvy = 0;

  // ---- telegraph phase ----
  if (ab.phase === 'tele') {
    if (ab.id === 'elem_bolt' || ab.id === 'elem_poison' || ab.id === 'boss_breath' || ab.id === 'boss_charge' || ab.id === 'elem_charge' || ab.id === 'boss_fireground') {
      // track player slightly during tele for aim abilities
      if (ab.id === 'elem_bolt' || ab.id === 'boss_breath') {
        const turn = 2.2 * dt;
        const want = Math.atan2(p.y - a.y, p.x - a.x);
        let diff = want - ab.ang;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        ab.ang += clamp(diff, -turn, turn);
        a.facing = Math.cos(ab.ang) > 0 ? 1 : -1;
      }
      if (ab.id === 'elem_poison') {
        ab.tx = damp(ab.tx, p.x, 3, dt);
        ab.ty = damp(ab.ty, p.y, 3, dt);
      }
    }

    if (ab.t > 0) return [0, 0];

    // fire the ability
    ab.phase = 'act';
    if (ab.id === 'elem_charge' || ab.id === 'boss_charge') {
      ab.t = ab.active;
      ab.traveled = 0;
      a._abilHit = false;
    } else if (ab.id === 'elem_bolt') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      game.enemyShots.push(new EnemyBolt(a.x, a.y - a.bodyOff * 0.3, ab.ang, {
        speed: ab.speed, radius: ab.radius, dmg, element: 'water', color: ab.color,
      }));
      game.fx.sparks(a.x, a.y - a.bodyOff, 6, ab.color);
      Sound.play('throw', 0.8);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_poison') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const rr = ab.splash;
      if (dist2(ab.tx, ab.ty, p.x, p.y) < Math.pow(rr + p.radius, 2)) {
        p.takeDamage(dmg, game, ab.tx, ab.ty, 'nature');
        p.applyPoison(Math.max(2, Math.round(animalEffectiveDamage(a) * ab.poisonDpsMul)), ab.poisonT);
      }
      game.fx.ring(ab.tx, ab.ty, 'rgba(109,212,106,0.9)', 10, rr, 0.4);
      game.fx.elementHit(ab.tx, ab.ty, 'nature', 1);
      Sound.play('hit', 0.7);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_spikes') {
      // hazards already spawned; just finish
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_nova') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      if (dist2(a.x, a.y, p.x, p.y) < Math.pow(ab.radius + p.radius, 2)) {
        p.takeDamage(dmg, game, a.x, a.y, 'light');
      }
      game.fx.ring(a.x, a.y, 'rgba(255,230,109,0.95)', ab.radius * 0.3, ab.radius * 1.15, 0.45);
      game.fx.sparks(a.x, a.y - 10, 16, ab.color);
      game.addShake(0.25);
      Sound.play('boom', 1.1);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_gloom') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      if (dist2(a.x, a.y, p.x, p.y) < Math.pow(ab.radius + p.radius, 2)) {
        if (dmg > 0) p.takeDamage(Math.max(1, dmg), game, a.x, a.y, 'darkness');
        p.applySlow(ab.slow, ab.slowT);
      }
      game.fx.ring(a.x, a.y, 'rgba(155,123,222,0.9)', 16, ab.radius, 0.5);
      game.fx.elementHit(a.x, a.y - 8, 'darkness', 1);
      Sound.play('hit', 0.6);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_fireground') {
      ab.t = ab.active;
      ab._trailAcc = 0;
    } else if (ab.id === 'boss_inspire') {
      a.inspireT = ab.buffDur;
      a.inspireMul = ab.mul;
      const q = game._q;
      q.length = 0;
      game.animalGrid.query(a.x, a.y, ab.radius + 40, q);
      for (let i = 0; i < q.length; i++) {
        const o = q[i];
        if (o.dead || o === a || o.passive) continue;
        if (dist2(a.x, a.y, o.x, o.y) < ab.radius * ab.radius) {
          o.inspireT = Math.max(o.inspireT || 0, ab.buffDur);
          o.inspireMul = Math.max(o.inspireMul || 1, ab.mul);
        }
      }
      game.fx.ring(a.x, a.y, 'rgba(255,230,109,0.9)', 20, ab.radius, 0.6);
      game.addText(a.x, a.y - a.height - 10, 'INSPIRED!', '#ffe66d', 16, { life: 1.2, vy: -24 });
      Sound.play('upgrade', 0.8);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_breath') {
      ab.t = ab.active;
      a._abilHit = false;
    }
    return [0, 0];
  }

  // ---- active phase ----
  if (ab.id === 'elem_charge' || ab.id === 'boss_charge') {
    tvx = ab.tx * ab.speed;
    tvy = ab.ty * ab.speed;
    ab.traveled = (ab.traveled || 0) + ab.speed * dt;
    if (!a._abilHit && p.alive && dist2(a.x, a.y, p.x, p.y) < Math.pow(a.radius + p.radius + 6, 2)) {
      a._abilHit = true;
      p.takeDamage(Math.round(animalEffectiveDamage(a) * ab.dmgMul), game, a.x, a.y, a.element);
      game.fx.hitPuff(p.x, p.y, 8);
      game.addShake(0.2);
    }
    if (Math.random() < dt * 28) {
      game.particles.spawn({
        x: a.x + rand(-8, 8), y: a.y, z: rand(4, 16),
        vx: -ab.tx * rand(40, 100), vy: -ab.ty * rand(20, 60), vz: rand(10, 40),
        g: 60, life: 0.3, size: rand(2, 4),
        color: ab.color || 'rgba(255,200,120,0.7)', drag: 2,
      });
    }
    if (ab.t <= 0 || ab.traveled > ab.pathLen) finishAbility(a, ab.id);
    return [tvx, tvy];
  }

  if (ab.id === 'boss_fireground') {
    tvx = ab.tx * ab.speed;
    tvy = ab.ty * ab.speed;
    ab._trailAcc = (ab._trailAcc || 0) + dt;
    if (ab._trailAcc >= ab.trailEvery) {
      ab._trailAcc = 0;
      const dps = Math.max(1, animalEffectiveDamage(a) * ab.groundDpsMul);
      game.hazards.push(new Hazard({
        type: 'burn', x: a.x, y: a.y, r: ab.groundR, life: ab.groundLife,
        dps, element: 'fire', color: ab.color, owner: a,
      }));
    }
    if (!a._abilHit && p.alive && dist2(a.x, a.y, p.x, p.y) < Math.pow(a.radius + p.radius + 4, 2)) {
      a._abilHit = true;
      p.takeDamage(Math.round(animalEffectiveDamage(a) * ab.dmgMul), game, a.x, a.y, 'fire');
    }
    if (ab.t <= 0) finishAbility(a, ab.id);
    return [tvx, tvy];
  }

  if (ab.id === 'boss_breath') {
    // channel blast — cone damage once at start of act
    if (!a._abilHit) {
      a._abilHit = true;
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      if (p.alive) {
        const pdx = p.x - a.x, pdy = p.y - a.y;
        const pd = Math.hypot(pdx, pdy) || 1;
        const ang = Math.atan2(pdy, pdx);
        let diff = ang - ab.ang;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        if (pd < ab.range + p.radius && Math.abs(diff) < ab.halfAngle) {
          p.takeDamage(dmg, game, a.x, a.y, 'water');
          p.applySlow(0.35, 1.4);
        }
      }
      // spray particles along cone
      for (let i = 0; i < 18; i++) {
        const a2 = ab.ang + rand(-ab.halfAngle, ab.halfAngle);
        const sp = rand(180, 420);
        game.particles.spawn({
          x: a.x, y: a.y, z: a.bodyOff + rand(0, 20),
          vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp * 0.7, vz: rand(20, 80),
          g: 40, life: rand(0.35, 0.7), size: rand(2, 5), color: '#7fd3ff', drag: 2,
        });
      }
      game.fx.ring(a.x + Math.cos(ab.ang) * 60, a.y + Math.sin(ab.ang) * 60, 'rgba(77,184,255,0.85)', 20, 80, 0.35);
      Sound.play('boom', 0.7);
      game.addShake(0.28);
    }
    if (ab.t <= 0) finishAbility(a, ab.id);
    return [0, 0];
  }

  return [0, 0];
}

function drawAnimalAbilityGround(ctx, a, game) {
  const ab = a.ability;
  if (!ab || a.dead) return;
  const progress = 1 - clamp(ab.t / Math.max(0.01, ab.dur), 0, 1);

  ctx.save();
  if (ab.phase === 'tele') {
    if (ab.id === 'elem_charge' || ab.id === 'boss_charge' || ab.id === 'boss_fireground') {
      const len = ab.pathLen || (ab.id === 'boss_fireground' ? 220 : 280);
      const x2 = a.x + ab.tx * len, y2 = a.y + ab.ty * len;
      ctx.strokeStyle = ab.color;
      ctx.globalAlpha = 0.35 + progress * 0.45;
      ctx.lineWidth = 10 + progress * 8;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      // arrow head
      const ah = 16;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - ab.tx * ah + ab.ty * 8, y2 - ab.ty * ah - ab.tx * 8);
      ctx.lineTo(x2 - ab.tx * ah - ab.ty * 8, y2 - ab.ty * ah + ab.tx * 8);
      ctx.closePath();
      ctx.fillStyle = ab.color;
      ctx.globalAlpha = 0.8;
      ctx.fill();
    } else if (ab.id === 'elem_bolt') {
      const x2 = a.x + Math.cos(ab.ang) * 80, y2 = a.y + Math.sin(ab.ang) * 80;
      ctx.strokeStyle = ab.color;
      ctx.globalAlpha = 0.5 + progress * 0.4;
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 8); ctx.lineTo(x2, y2 - 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ab.color;
      ellipse(ctx, a.x + Math.cos(ab.ang) * 28, a.y + Math.sin(ab.ang) * 28 - 8, 6 + progress * 4, 6 + progress * 4);
      ctx.fill();
    } else if (ab.id === 'elem_poison') {
      ctx.globalAlpha = 0.3 + progress * 0.4;
      ctx.strokeStyle = ab.color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ellipse(ctx, ab.tx, ab.ty, ab.splash, ab.splash * 0.7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(109,212,106,' + (0.15 + progress * 0.2).toFixed(3) + ')';
      ellipse(ctx, ab.tx, ab.ty, ab.splash * progress, ab.splash * 0.7 * progress);
      ctx.fill();
    } else if (ab.id === 'elem_nova' || ab.id === 'elem_gloom' || ab.id === 'boss_inspire') {
      const r = ab.radius * (0.35 + progress * 0.65);
      ctx.globalAlpha = 0.3 + progress * 0.35;
      ctx.strokeStyle = ab.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ellipse(ctx, a.x, a.y, r, r * 0.78);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ab.color;
      ctx.globalAlpha = 0.12 + progress * 0.18;
      ellipse(ctx, a.x, a.y, r, r * 0.78);
      ctx.fill();
    } else if (ab.id === 'boss_breath') {
      const half = ab.halfAngle;
      const range = ab.range;
      ctx.globalAlpha = 0.28 + progress * 0.4;
      ctx.fillStyle = ab.color;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.arc(a.x, a.y, range * (0.4 + progress * 0.6), ab.ang - half, ab.ang + half);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#dff6ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      // channel ticks
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BREATH', a.x, a.y - a.height - 18);
    }
  }
  ctx.restore();

  // inspire aura while buffed
  if (a.inspireT > 0) {
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(game.time * 6) * 0.06;
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 2;
    ellipse(ctx, a.x, a.y, a.radius * 2.2, a.radius * 0.9);
    ctx.stroke();
    ctx.restore();
  }
}
