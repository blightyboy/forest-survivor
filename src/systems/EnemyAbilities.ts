/**
 * Port of legacy/js/abilities.js — elemental specials + boss moves.
 * Telegraph → act, with ground hazards for earth spikes / fire trail.
 */
import Phaser from 'phaser';
import { clamp, damp, dist2, rand, TAU, compactInPlace } from '../core/math';
import type { ElementId } from '../data/constants';
import type { RunPlayer } from '../run/RunTypes';
import type { AnimalEntity } from './AnimalSystem';
import type { FxSystem } from './FxSystem';
import { CanvasSprite } from '../art/draw/CanvasSprite';
import { drawEnemyBolt, enemyBoltCanvasSize } from '../art/draw/enemyBoltDraw';
import { Audio } from '../audio/Audio';
import { isBearish } from '../data/animals';

export const ELEMENT_ABILITY = {
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
} as const;

export const BOSS_ABILITY = {
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
} as const;

export type BossAbilityId = keyof typeof BOSS_ABILITY;

export type AnimalAbility = {
  id: string;
  phase: 'tele' | 'act';
  t: number;
  dur: number;
  color: string;
  dmgMul: number;
  ang?: number;
  tx?: number;
  ty?: number;
  speed?: number;
  active?: number;
  pathLen?: number;
  traveled?: number;
  radius?: number;
  splash?: number;
  poisonDpsMul?: number;
  poisonT?: number;
  slow?: number;
  slowT?: number;
  spots?: { x: number; y: number }[];
  trailEvery?: number;
  groundLife?: number;
  groundR?: number;
  groundDpsMul?: number;
  range?: number;
  halfAngle?: number;
  mul?: number;
  buffDur?: number;
  _trailAcc?: number;
  aimX?: number;
  aimY?: number;
};

export type Hazard = {
  type: 'spikes' | 'burn';
  x: number;
  y: number;
  r: number;
  life: number;
  age: number;
  delay: number;
  dmg: number;
  dps: number;
  element: ElementId | null;
  color: string;
  hit: boolean;
  dead: boolean;
  _acc?: number;
};

export type EnemyBoltShot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  element: ElementId | null;
  color: number;
  colorHex: string;
  kind: string;
  life: number;
  dead: boolean;
  canvas?: CanvasSprite;
  gfx: Phaser.GameObjects.Image;
};

let enemyBoltUid = 1;

export function rollBossAbilities(n = 2): BossAbilityId[] {
  const pool = (Object.keys(BOSS_ABILITY) as BossAbilityId[]).slice();
  const out: BossAbilityId[] = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function initAnimalAbilities(a: AnimalEntity, opts: { trueBoss?: boolean; bossMoves?: BossAbilityId[] } = {}) {
  a.abilityCd = rand(1.5, 3.5);
  a.ability = null;
  a.bossMoves = opts.trueBoss ? (opts.bossMoves || rollBossAbilities(2)) : [];
  a.bossMoveCd = {};
  for (const id of a.bossMoves) a.bossMoveCd[id] = rand(2, 5);
  a.inspireT = 0;
  a.inspireMul = 1;
  a._abilHit = false;
}

export function animalEffectiveDamage(a: AnimalEntity) {
  return Math.max(1, Math.round(a.dmg * (a.inspireMul || 1)));
}

export function applyPlayerSlow(player: RunPlayer, amount: number, dur: number) {
  player.slow = clamp(Math.max(player.slow, amount), 0, 0.85);
  player.slowT = Math.max(player.slowT, dur);
}

export function applyPlayerPoison(player: RunPlayer, dps: number, life: number) {
  player.poisons.push({ dps, life });
  if (player.poisons.length > 8) player.poisons.splice(0, player.poisons.length - 8);
}

function finishAbility(a: AnimalEntity, id: string) {
  a.ability = null;
  a.state = 'recover';
  a.stateT = 0.45;
  if (id.startsWith('elem_') && a.element && ELEMENT_ABILITY[a.element as keyof typeof ELEMENT_ABILITY]) {
    a.abilityCd = ELEMENT_ABILITY[a.element as keyof typeof ELEMENT_ABILITY].cd * (a.trueBoss ? 0.75 : 1);
  } else if (id in BOSS_ABILITY) {
    a.bossMoveCd[id] = BOSS_ABILITY[id as BossAbilityId].cd;
    a.abilityCd = 1.2;
  } else {
    a.abilityCd = 3;
  }
}

function hurt(
  player: RunPlayer,
  amount: number,
  onHurt?: () => void,
  onFloat?: (x: number, y: number, msg: string, color?: string, size?: number) => void,
) {
  if (!player.alive || player.invuln > 0) return;
  const dealt = amount * (1 - clamp(player.armor, 0, 0.65));
  player.hp -= dealt;
  player.invuln = 0.35;
  Audio.playSfx('hurt');
  onHurt?.();
  onFloat?.(player.x + rand(-12, 12), player.y - 50, `-${Math.max(1, Math.round(dealt))}`, '#ff5a5f', 20);
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    Audio.playSfx('death');
  }
}

export function tryStartAnimalAbility(
  a: AnimalEntity,
  player: RunPlayer,
  dx: number,
  dy: number,
  d: number,
  hazards: Hazard[],
): boolean {
  if (a.ability || a.dead || a.state === 'windup' || a.state === 'lunge') return false;
  if (!player.alive) return false;

  if (a.trueBoss && a.bossMoves.length) {
    const ready = a.bossMoves.filter((id) => (a.bossMoveCd[id] || 0) <= 0);
    if (ready.length && d < 400) {
      const id = ready[Math.floor(Math.random() * ready.length)];
      return beginAbility(a, player, id, dx, dy, d, hazards);
    }
  }

  if (a.abilityCd > 0) return false;
  if (!a.element || !(a.element in ELEMENT_ABILITY)) return false;
  const def = ELEMENT_ABILITY[a.element as keyof typeof ELEMENT_ABILITY];
  if (d > def.range) return false;
  if (d < a.radius + 18 && Math.random() < 0.45) return false;
  return beginAbility(a, player, def.id, dx, dy, d, hazards);
}

function beginAbility(
  a: AnimalEntity,
  player: RunPlayer,
  id: string,
  dx: number,
  dy: number,
  d: number,
  hazards: Hazard[],
): boolean {
  const ang = Math.atan2(dy, dx);
  a._abilHit = false;

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
    Audio.playSfx(isBearish(a.species) ? 'roar' : 'growl');
    return true;
  }

  if (id === 'elem_bolt') {
    const def = ELEMENT_ABILITY.water;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, color: def.color, dmgMul: def.dmgMul,
      speed: def.speed, radius: def.radius,
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Audio.playSfx('grunt');
    return true;
  }

  if (id === 'elem_poison') {
    const def = ELEMENT_ABILITY.nature;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      tx: player.x, ty: player.y, color: def.color, dmgMul: def.dmgMul,
      poisonDpsMul: def.poisonDpsMul, poisonT: def.poisonT, splash: def.splash,
    };
    a.state = 'ability';
    Audio.playSfx('growl');
    return true;
  }

  if (id === 'elem_spikes') {
    const def = ELEMENT_ABILITY.earth;
    const spots: { x: number; y: number }[] = [];
    for (let i = 0; i < def.count; i++) {
      const spread = (i - (def.count - 1) / 2) * 0.55;
      const dist = clamp(d * 0.55 + i * 28, 60, def.range);
      spots.push({
        x: a.x + Math.cos(ang + spread) * dist + rand(-18, 18),
        y: a.y + Math.sin(ang + spread) * dist + rand(-18, 18),
      });
    }
    spots[0] = { x: player.x + rand(-20, 20), y: player.y + rand(-20, 20) };
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      spots, color: def.color, dmgMul: def.dmgMul, radius: def.radius,
    };
    a.state = 'ability';
    for (const s of spots) {
      hazards.push({
        type: 'spikes', x: s.x, y: s.y, r: def.radius, delay: def.tele,
        life: def.tele + 0.7, age: 0, dmg: Math.round(animalEffectiveDamage(a) * def.dmgMul),
        dps: 0, element: 'earth', color: def.color, hit: false, dead: false,
      });
    }
    Audio.playSfx('grunt');
    return true;
  }

  if (id === 'elem_nova') {
    const def = ELEMENT_ABILITY.light;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, color: def.color, dmgMul: def.dmgMul,
    };
    a.state = 'ability';
    Audio.playSfx('roar');
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
    Audio.playSfx('growl');
    return true;
  }

  if (id === 'boss_fireground') {
    const def = BOSS_ABILITY.boss_fireground;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, tx: Math.cos(ang), ty: Math.sin(ang),
      speed: a.speed * 1.35, active: def.active,
      trailEvery: def.trailEvery, dmgMul: def.dmgMul,
      groundLife: def.groundLife, groundR: def.groundR,
      groundDpsMul: def.groundDpsMul, color: def.color,
    };
    a.state = 'ability';
    Audio.playSfx('roar');
    return true;
  }

  if (id === 'boss_inspire') {
    const def = BOSS_ABILITY.boss_inspire;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, mul: def.mul, buffDur: def.duration, color: def.color, dmgMul: 1,
    };
    a.state = 'ability';
    Audio.playSfx('howl');
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
    Audio.playSfx('roar');
    return true;
  }

  return false;
}

/** Returns [tvx, tvy] while ability is active. */
export function updateAnimalAbility(
  a: AnimalEntity,
  dt: number,
  player: RunPlayer,
  animals: AnimalEntity[],
  hazards: Hazard[],
  bolts: EnemyBoltShot[],
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  fx: FxSystem | null,
  onHurt?: () => void,
  onFloat?: (x: number, y: number, msg: string, color?: string, size?: number) => void,
): [number, number] {
  const ab = a.ability;
  if (!ab) return [0, 0];
  ab.t -= dt;
  let tvx = 0;
  let tvy = 0;

  if (ab.phase === 'tele') {
    if (ab.id === 'elem_bolt' || ab.id === 'boss_breath') {
      const turn = 2.2 * dt;
      const want = Math.atan2(player.y - a.y, player.x - a.x);
      let diff = want - (ab.ang || 0);
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      ab.ang = (ab.ang || 0) + clamp(diff, -turn, turn);
      a.facing = Math.cos(ab.ang) > 0 ? 1 : -1;
    }
    if (ab.id === 'elem_poison' && ab.tx != null && ab.ty != null) {
      ab.tx = damp(ab.tx, player.x, 3, dt);
      ab.ty = damp(ab.ty, player.y, 3, dt);
    }

    if (ab.t > 0) return [0, 0];

    ab.phase = 'act';
    if (ab.id === 'elem_charge' || ab.id === 'boss_charge') {
      ab.t = ab.active || 0.5;
      ab.traveled = 0;
      a._abilHit = false;
    } else if (ab.id === 'elem_bolt') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const ang = ab.ang || 0;
      const sp = ab.speed || 300;
      const r = ab.radius || 11;
      const colorHex = ab.color || '#4db8ff';
      const size = enemyBoltCanvasSize(r, 'bolt');
      const canvas = new CanvasSprite(scene, layer, size, size, `abil_bolt_${enemyBoltUid++}`, 0.5, 0.5);
      canvas.clear();
      canvas.withCenterOrigin((ctx) => drawEnemyBolt(ctx, { kind: 'bolt', color: colorHex, r }));
      canvas.refresh();
      const x = a.x;
      const y = a.y - 10;
      canvas.setPosition(x, y, Math.floor(y) + 12);
      bolts.push({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        r, dmg, element: 'water', color: 0x4db8ff, colorHex, kind: 'bolt',
        life: 1.8, dead: false, canvas, gfx: canvas.image,
      });
      fx?.sparks(a.x, a.y - 12, 6, ab.color);
      Audio.playSfx('throw', 0.8);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_poison') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const rr = ab.splash || 48;
      const tx = ab.tx || a.x;
      const ty = ab.ty || a.y;
      if (dist2(tx, ty, player.x, player.y) < (rr + 13) ** 2) {
        hurt(player, dmg, onHurt, onFloat);
        applyPlayerPoison(
          player,
          Math.max(2, Math.round(animalEffectiveDamage(a) * (ab.poisonDpsMul || 0.3))),
          ab.poisonT || 4.2,
        );
      }
      fx?.ring(tx, ty, 'rgba(109,212,106,0.9)', 10, rr, 0.4);
      Audio.playSfx('hit', 0.7);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_spikes') {
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_nova') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const r = ab.radius || 105;
      if (dist2(a.x, a.y, player.x, player.y) < (r + 13) ** 2) {
        hurt(player, dmg, onHurt, onFloat);
      }
      fx?.ring(a.x, a.y, 'rgba(255,230,109,0.95)', r * 0.3, r * 1.15, 0.45);
      fx?.sparks(a.x, a.y - 10, 16, ab.color);
      Audio.playSfx('boom', 1.1);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_gloom') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const r = ab.radius || 125;
      if (dist2(a.x, a.y, player.x, player.y) < (r + 13) ** 2) {
        if (dmg > 0) hurt(player, Math.max(1, dmg), onHurt, onFloat);
        applyPlayerSlow(player, ab.slow || 0.5, ab.slowT || 2.6);
      }
      fx?.ring(a.x, a.y, 'rgba(155,123,222,0.9)', 16, r, 0.5);
      Audio.playSfx('hit', 0.6);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_fireground') {
      ab.t = ab.active || 1.5;
      ab._trailAcc = 0;
    } else if (ab.id === 'boss_inspire') {
      a.inspireT = ab.buffDur || 7;
      a.inspireMul = ab.mul || 1.5;
      const r = ab.radius || 230;
      for (const o of animals) {
        if (o.dead || o === a) continue;
        if (dist2(a.x, a.y, o.x, o.y) < r * r) {
          o.inspireT = Math.max(o.inspireT || 0, ab.buffDur || 7);
          o.inspireMul = Math.max(o.inspireMul || 1, ab.mul || 1.5);
        }
      }
      fx?.ring(a.x, a.y, 'rgba(255,230,109,0.9)', 20, r, 0.6);
      onFloat?.(a.x, a.y - 40, 'INSPIRED!', '#ffe66d', 16);
      Audio.playSfx('upgrade', 0.8);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_breath') {
      ab.t = ab.active || 0.4;
      a._abilHit = false;
    }
    return [0, 0];
  }

  // Active phase
  if (ab.id === 'elem_charge' || ab.id === 'boss_charge') {
    tvx = (ab.tx || 0) * (ab.speed || 400);
    tvy = (ab.ty || 0) * (ab.speed || 400);
    ab.traveled = (ab.traveled || 0) + (ab.speed || 400) * dt;
    if (!a._abilHit && player.alive && dist2(a.x, a.y, player.x, player.y) < (a.radius + 19) ** 2) {
      a._abilHit = true;
      hurt(player, Math.round(animalEffectiveDamage(a) * ab.dmgMul), onHurt, onFloat);
      fx?.hitPuff(player.x, player.y, 8);
    }
    if (ab.t <= 0 || (ab.traveled || 0) > (ab.pathLen || 280)) finishAbility(a, ab.id);
    return [tvx, tvy];
  }

  if (ab.id === 'boss_fireground') {
    tvx = (ab.tx || 0) * (ab.speed || 200);
    tvy = (ab.ty || 0) * (ab.speed || 200);
    ab._trailAcc = (ab._trailAcc || 0) + dt;
    if (ab._trailAcc >= (ab.trailEvery || 0.14)) {
      ab._trailAcc = 0;
      const dps = Math.max(1, animalEffectiveDamage(a) * (ab.groundDpsMul || 0.45));
      hazards.push({
        type: 'burn', x: a.x, y: a.y, r: ab.groundR || 42,
        life: ab.groundLife || 5.5, age: 0, delay: 0, dmg: 0, dps,
        element: 'fire', color: ab.color, hit: false, dead: false,
      });
    }
    if (!a._abilHit && player.alive && dist2(a.x, a.y, player.x, player.y) < (a.radius + 17) ** 2) {
      a._abilHit = true;
      hurt(player, Math.round(animalEffectiveDamage(a) * ab.dmgMul), onHurt, onFloat);
    }
    if (ab.t <= 0) finishAbility(a, ab.id);
    return [tvx, tvy];
  }

  if (ab.id === 'boss_breath') {
    if (!a._abilHit) {
      a._abilHit = true;
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      if (player.alive) {
        const pdx = player.x - a.x;
        const pdy = player.y - a.y;
        const pd = Math.hypot(pdx, pdy) || 1;
        const pang = Math.atan2(pdy, pdx);
        let diff = pang - (ab.ang || 0);
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        if (pd < (ab.range || 240) + 13 && Math.abs(diff) < (ab.halfAngle || 0.58)) {
          hurt(player, dmg, onHurt, onFloat);
          applyPlayerSlow(player, 0.35, 1.4);
        }
      }
      fx?.ring(
        a.x + Math.cos(ab.ang || 0) * 60,
        a.y + Math.sin(ab.ang || 0) * 60,
        'rgba(77,184,255,0.85)',
        20,
        80,
        0.35,
      );
      Audio.playSfx('boom', 0.7);
    }
    if (ab.t <= 0) finishAbility(a, ab.id);
    return [0, 0];
  }

  return [0, 0];
}

export function updateHazards(
  hazards: Hazard[],
  dt: number,
  player: RunPlayer,
  onHurt?: () => void,
  onFloat?: (x: number, y: number, msg: string, color?: string, size?: number) => void,
  fx?: FxSystem | null,
) {
  for (const h of hazards) {
    if (h.dead) continue;
    h.age += dt;
    if (h.age >= h.life) {
      h.dead = true;
      continue;
    }
    if (!player.alive) continue;
    if (h.type === 'spikes') {
      if (h.age < h.delay) continue;
      if (!h.hit && h.age < h.delay + 0.35) {
        if (dist2(h.x, h.y, player.x, player.y) < (h.r + 8) ** 2) {
          h.hit = true;
          hurt(player, h.dmg, onHurt, onFloat);
          fx?.dust(h.x, h.y, 6);
          fx?.sparks(h.x, h.y - 8, 8, h.color);
        }
      }
    } else if (h.type === 'burn') {
      if (dist2(h.x, h.y, player.x, player.y) < (h.r + 6) ** 2) {
        h._acc = (h._acc || 0) + h.dps * dt;
        if (h._acc >= 1) {
          const d = Math.floor(h._acc);
          h._acc -= d;
          hurt(player, d, onHurt, onFloat);
        }
      }
    }
  }
  compactInPlace(hazards, (h) => h.dead);
}

/** Draw telegraphs + hazard warnings into a shared Graphics. */
export function drawAbilityOverlays(
  g: Phaser.GameObjects.Graphics,
  animals: AnimalEntity[],
  hazards: Hazard[],
) {
  g.clear();
  for (const a of animals) {
    if (a.dead || !a.ability) continue;
    const ab = a.ability;
    const progress = 1 - clamp(ab.t / Math.max(0.01, ab.dur), 0, 1);
    const col = Phaser.Display.Color.HexStringToColor(ab.color || '#fff').color;
    if (ab.phase !== 'tele') {
      if (a.inspireT > 0) {
        g.lineStyle(2, 0xffe66d, 0.25);
        g.strokeEllipse(a.x, a.y, a.radius * 4.4, a.radius * 1.8);
      }
      continue;
    }
    if (ab.id === 'elem_charge' || ab.id === 'boss_charge' || ab.id === 'boss_fireground') {
      const len = ab.pathLen || (ab.id === 'boss_fireground' ? 220 : 280);
      const x2 = a.x + (ab.tx || 0) * len;
      const y2 = a.y + (ab.ty || 0) * len;
      g.lineStyle(10 + progress * 8, col, 0.35 + progress * 0.45);
      g.lineBetween(a.x, a.y, x2, y2);
      g.lineStyle(2, col, 0.7);
      g.lineBetween(a.x, a.y, x2, y2);
    } else if (ab.id === 'elem_bolt') {
      const ang = ab.ang || 0;
      g.lineStyle(3, col, 0.5 + progress * 0.4);
      g.lineBetween(a.x, a.y - 8, a.x + Math.cos(ang) * 80, a.y + Math.sin(ang) * 80 - 8);
      g.fillStyle(col, 0.7);
      g.fillCircle(a.x + Math.cos(ang) * 28, a.y + Math.sin(ang) * 28 - 8, 6 + progress * 4);
    } else if (ab.id === 'elem_poison') {
      const r = (ab.splash || 48) * progress;
      g.lineStyle(2.5, col, 0.3 + progress * 0.4);
      g.strokeEllipse(ab.tx || a.x, ab.ty || a.y, (ab.splash || 48) * 2, (ab.splash || 48) * 1.4);
      g.fillStyle(col, 0.15 + progress * 0.2);
      g.fillEllipse(ab.tx || a.x, ab.ty || a.y, r * 2, r * 1.4);
    } else if (ab.id === 'elem_nova' || ab.id === 'elem_gloom' || ab.id === 'boss_inspire') {
      const r = (ab.radius || 100) * (0.35 + progress * 0.65);
      g.lineStyle(3, col, 0.3 + progress * 0.35);
      g.strokeEllipse(a.x, a.y, r * 2, r * 1.56);
      g.fillStyle(col, 0.12 + progress * 0.18);
      g.fillEllipse(a.x, a.y, r * 2, r * 1.56);
    } else if (ab.id === 'boss_breath') {
      const half = ab.halfAngle || 0.58;
      const range = (ab.range || 240) * (0.4 + progress * 0.6);
      const ang = ab.ang || 0;
      g.fillStyle(col, 0.28 + progress * 0.4);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.arc(a.x, a.y, range, ang - half, ang + half, false);
      g.closePath();
      g.fillPath();
    }
  }

  for (const h of hazards) {
    if (h.dead) continue;
    const col = Phaser.Display.Color.HexStringToColor(h.color || '#c4a35a').color;
    if (h.type === 'spikes') {
      const erupting = h.age >= h.delay;
      if (!erupting) {
        const warn = clamp(h.age / Math.max(0.01, h.delay), 0, 1);
        g.lineStyle(2 + warn * 2, col, 0.25 + warn * 0.45);
        g.strokeEllipse(h.x, h.y, h.r * 2, h.r * 1.1);
        g.fillStyle(col, 0.12 + warn * 0.2);
        g.fillEllipse(h.x, h.y, h.r * 2 * warn, h.r * 1.1 * warn);
      } else {
        const pop = clamp(1 - (h.age - h.delay) / 0.45, 0, 1);
        g.fillStyle(0x8a6a3a, 1);
        for (let i = -1; i <= 1; i++) {
          const hx = h.x + i * 10;
          const hh = 18 + pop * 22;
          g.fillTriangle(hx, h.y + 4 - hh, hx - 5, h.y + 4 - hh * 0.4, hx + 5, h.y + 4 - hh * 0.4);
        }
        g.fillStyle(col, pop * 0.5);
        g.fillEllipse(h.x, h.y, h.r * 2, h.r);
      }
    } else if (h.type === 'burn') {
      const fade = clamp(1 - h.age / h.life, 0, 1);
      g.fillStyle(0xff8c28, 0.35 * fade);
      g.fillEllipse(h.x, h.y, h.r * 2, h.r * 1.44);
    }
  }
}
