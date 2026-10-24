/**
 * Elemental specials + boss moves.
 * Each element has a pool of abilities; higher veterancy (stars) unlocks more.
 * Telegraph → commit (locked aim) → act, with ground hazards for spikes / vines / burn trails.
 */

/** Pause after telegraph fills before the hit — gives the player a dodge window. */
export const ABILITY_COMMIT = 0.5;
import Phaser from 'phaser';
import { clamp, damp, dist2, lerp, rand, TAU, compactInPlace } from '../core/math';
import { applyDot, DOT_INTERVAL } from '../core/dot';
import type { ElementId } from '../data/constants';
import type { RunPlayer } from '../run/RunTypes';
import type { AnimalEntity } from './AnimalSystem';
import type { FxSystem } from './FxSystem';
import { CanvasSprite } from '../art/draw/CanvasSprite';
import { drawEnemyBolt, enemyBoltCanvasSize } from '../art/draw/enemyBoltDraw';
import { Audio } from '../audio/Audio';
import { frenzyMul, isBearish } from '../data/animals';

export type ElemAbilityDef = {
  id: string;
  /** Glossary / HUD name. */
  name: string;
  /** Short glossary description. */
  desc: string;
  cd: number;
  tele: number;
  range: number;
  color: string;
  dmgMul: number;
  active?: number;
  speed?: number;
  radius?: number;
  count?: number;
  splash?: number;
  poisonDpsMul?: number;
  poisonT?: number;
  slow?: number;
  slowT?: number;
  pathLen?: number;
  halfAngle?: number;
  trailEvery?: number;
  groundLife?: number;
  groundR?: number;
  groundDpsMul?: number;
  bolts?: number;
  spread?: number;
};

/** Per-element ability pools. Index 0 is the classic move; extras unlock with stars. */
export const ELEMENT_ABILITY_POOLS: Record<ElementId, readonly ElemAbilityDef[]> = {
  fire: [
    {
      id: 'elem_charge', name: 'Flame Charge', desc: 'Telegraphs a line, then rushes through you for heavy contact damage.', cd: 5.5, tele: 0.85, active: 0.48, speed: 460,
      dmgMul: 1.4, range: 300, color: '#ff6a3d', pathLen: 280,
    },
    {
      id: 'elem_emberburst', name: 'Emberburst', desc: 'Explodes in a short ring of fire around itself.', cd: 6.0, tele: 0.95, radius: 92, dmgMul: 1.15,
      range: 150, color: '#ff6a3d',
    },
    {
      id: 'elem_scorch', name: 'Scorch Pool', desc: 'Marks the ground under you; erupts into a lingering burn puddle.', cd: 6.4, tele: 1.1, radius: 40, dmgMul: 0.55,
      groundLife: 4.5, groundR: 40, groundDpsMul: 0.4, range: 260, color: '#ff8c28',
    },
  ],
  water: [
    {
      id: 'elem_bolt', name: 'Water Bolt', desc: 'Aims and fires a single water projectile.', cd: 4.4, tele: 0.7, speed: 300, radius: 11,
      dmgMul: 0.95, range: 440, color: '#4db8ff',
    },
    {
      id: 'elem_torrent', name: 'Torrent Fan', desc: 'Sprays three water bolts in a wide fan.', cd: 5.8, tele: 0.85, speed: 280, radius: 9,
      dmgMul: 0.7, bolts: 3, range: 400, color: '#4db8ff',
    },
    {
      id: 'elem_spray', name: 'Tide Spray', desc: 'Cone of water that damages and briefly slows anyone caught in it.', cd: 6.5, tele: 1.35, active: 0.35, range: 210,
      halfAngle: 0.62, dmgMul: 1.25, slow: 0.3, slowT: 1.2, color: '#4db8ff',
    },
  ],
  nature: [
    {
      id: 'elem_poison', name: 'Poison Spit', desc: 'Lobs a poison splash that deals damage and applies a DoT.', cd: 5.2, tele: 0.75, dmgMul: 0.5, poisonDpsMul: 0.3,
      poisonT: 4.2, range: 210, splash: 48, color: '#6dd46a',
    },
    {
      id: 'elem_spore', name: 'Spore Cloud', desc: 'Bursts toxic spores around itself — damage plus poison.', cd: 5.6, tele: 0.9, radius: 100, dmgMul: 0.4,
      poisonDpsMul: 0.28, poisonT: 3.6, range: 160, color: '#6dd46a',
    },
    {
      id: 'elem_vines', name: 'Grasping Vines', desc: 'Root markers erupt underfoot, dealing damage and strongly slowing.', cd: 6.6, tele: 1.5, count: 2, radius: 36, dmgMul: 0.7,
      slow: 0.55, slowT: 2.4, range: 240, color: '#5aaa4a',
    },
  ],
  earth: [
    {
      id: 'elem_spikes', name: 'Stone Spikes', desc: 'Warns several ground spots, then spikes erupt for heavy hits.', cd: 6.8, tele: 2.0, count: 3, radius: 54,
      dmgMul: 1.15, range: 270, color: '#c4a35a',
    },
    {
      id: 'elem_quake', name: 'Quake', desc: 'Stomps a wide earth shockwave around itself.', cd: 6.4, tele: 1.15, radius: 120, dmgMul: 1.2,
      range: 180, color: '#c4a35a',
    },
    {
      id: 'elem_boulder', name: 'Boulder Toss', desc: 'Hurls a slow, heavy rock projectile.', cd: 5.5, tele: 0.9, speed: 210, radius: 16,
      dmgMul: 1.35, range: 380, color: '#a88848',
    },
  ],
  light: [
    {
      id: 'elem_nova', name: 'Radiant Nova', desc: 'Charges a bright blast that damages everything nearby.', cd: 6.2, tele: 1.2, radius: 105, dmgMul: 1.25,
      range: 170, color: '#ffe66d',
    },
    {
      id: 'elem_beam', name: 'Light Beam', desc: 'Fires a narrow ray of light along its aim.', cd: 5.4, tele: 1.0, range: 280, dmgMul: 1.3,
      halfAngle: 0.18, color: '#ffe66d',
    },
    {
      id: 'elem_flare', name: 'Blinding Flare', desc: 'Flash of light that damages lightly and slows.', cd: 5.8, tele: 0.8, radius: 95, dmgMul: 0.55,
      slow: 0.4, slowT: 1.8, range: 200, color: '#fff1a0',
    },
  ],
  darkness: [
    {
      id: 'elem_gloom', name: 'Gloom Field', desc: 'Spreads a dark aura that chips HP and strongly slows.', cd: 5.8, tele: 1.0, radius: 125, dmgMul: 0.35,
      slow: 0.5, slowT: 2.6, range: 190, color: '#9b7bde',
    },
    {
      id: 'elem_drain', name: 'Shadow Drain', desc: 'Fires a darkness bolt that saps your strength.', cd: 5.2, tele: 0.85, range: 230, dmgMul: 0.85,
      radius: 14, color: '#9b7bde',
    },
    {
      id: 'elem_shadowstep', name: 'Shadowstep', desc: 'Vanishes and reappears beside you for a surprise strike.', cd: 7.0, tele: 0.7, active: 0.2, dmgMul: 1.15,
      range: 260, color: '#7a5ab8', pathLen: 40,
    },
  ],
};

/** Flat id → def lookup. */
export const ELEMENT_ABILITY_BY_ID: Record<string, ElemAbilityDef> = (() => {
  const map: Record<string, ElemAbilityDef> = {};
  for (const pool of Object.values(ELEMENT_ABILITY_POOLS)) {
    for (const def of pool) map[def.id] = def;
  }
  return map;
})();

/** Legacy single-ability map (primary move per element). */
export const ELEMENT_ABILITY = {
  fire: ELEMENT_ABILITY_POOLS.fire[0],
  water: ELEMENT_ABILITY_POOLS.water[0],
  nature: ELEMENT_ABILITY_POOLS.nature[0],
  earth: ELEMENT_ABILITY_POOLS.earth[0],
  light: ELEMENT_ABILITY_POOLS.light[0],
  darkness: ELEMENT_ABILITY_POOLS.darkness[0],
} as const;

export const BOSS_ABILITY = {
  boss_charge: {
    name: 'Rampage',
    desc: 'Long, brutal charge — telegraphed line, then a devastating rush.',
    tele: 1.05, active: 0.75, speed: 560, dmgMul: 1.85,
    cd: 8.5, color: '#ff8a5a',
  },
  boss_fireground: {
    name: 'Fiery Ground',
    desc: 'Charges while leaving a trail of burning ground behind it.',
    tele: 0.55, active: 1.5, trailEvery: 0.14,
    dmgMul: 0.5, groundLife: 5.5, groundR: 42, groundDpsMul: 0.45, cd: 10, color: '#ff6a3d',
  },
  boss_inspire: {
    name: 'Inspiring Aura',
    desc: 'Buffs itself and nearby beasts with a damage multiplier for several seconds.',
    tele: 0.9, duration: 7, radius: 230, mul: 1.5,
    cd: 14, color: '#ffe66d',
  },
  boss_breath: {
    name: 'Water Breath',
    desc: 'Wide cone of pressurized water — heavy damage and a brief slow.',
    tele: 2.0, active: 0.4, range: 240, halfAngle: 0.58,
    dmgMul: 1.7, cd: 11, color: '#4db8ff',
  },
  boss_quake: {
    name: 'Titan Stomp',
    desc: 'Slams the earth — a huge shockwave around the boss.',
    tele: 1.35, radius: 175, dmgMul: 1.65, range: 220, cd: 11, color: '#c4a35a',
  },
  boss_volley: {
    name: 'Bone Volley',
    desc: 'Fans five heavy projectiles toward you.',
    tele: 1.1, speed: 320, radius: 12, bolts: 5, dmgMul: 0.95,
    range: 460, cd: 10, color: '#e8d4b0',
  },
  boss_leap: {
    name: 'Crushing Leap',
    desc: 'Marks your position, then leaps there for a smash landing.',
    tele: 1.25, radius: 78, dmgMul: 1.9, range: 380, cd: 12, color: '#ff7a6a',
  },
  boss_meteor: {
    name: 'Skyfall',
    desc: 'Calls down several delayed ground eruptions around you.',
    tele: 1.8, count: 5, radius: 58, dmgMul: 1.35, range: 320, cd: 13, color: '#ff9a4a',
  },
  boss_beam: {
    name: 'Ruin Beam',
    desc: 'Sweeps a thick destructive beam along its aim.',
    tele: 1.4, active: 0.45, range: 320, halfAngle: 0.22,
    dmgMul: 1.85, cd: 12, color: '#ffe66d',
  },
  boss_howl: {
    name: 'Dread Howl',
    desc: 'A terrifying roar — slows you heavily and whips the boss into a frenzy.',
    tele: 1.0, radius: 210, dmgMul: 0.45, slow: 0.6, slowT: 3.2,
    duration: 6, mul: 1.4, range: 240, cd: 14, color: '#9b7bde',
  },
} as const;

export type BossAbilityId = keyof typeof BOSS_ABILITY;

export type AnimalAbility = {
  id: string;
  /** tele = charging/aiming; commit = locked telegraph; act = resolving. */
  phase: 'tele' | 'commit' | 'act';
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
  bolts?: number;
  _trailAcc?: number;
  aimX?: number;
  aimY?: number;
};

export type Hazard = {
  type: 'spikes' | 'burn' | 'vines' | 'totem';
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
  slow?: number;
  slowT?: number;
  /** Poison DoT applied while standing in a cursed totem aura. */
  poisonDps?: number;
  poisonT?: number;
  _acc?: number;
  _poisonCd?: number;
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

/** How many elemental moves this beast gets from its pool. */
export function elemAbilityCount(stars: number, boss = false): number {
  let n = 1;
  if (stars >= 3) n = 2;
  if (stars >= 7) n = 3;
  if (stars >= 12) n = 4;
  if (boss) n += 1;
  return n;
}

/** Always keep the classic (pool[0]) move, then fill from the rest. */
export function rollElemAbilities(element: ElementId | null, count: number): string[] {
  if (!element || !(element in ELEMENT_ABILITY_POOLS)) return [];
  const pool = ELEMENT_ABILITY_POOLS[element];
  const n = clamp(count | 0, 1, pool.length);
  const out: string[] = [pool[0].id];
  if (n <= 1) return out;
  const rest = pool.slice(1).map((d) => d.id);
  while (out.length < n && rest.length) {
    const i = Math.floor(Math.random() * rest.length);
    out.push(rest.splice(i, 1)[0]);
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

  const boss = !!(a.boss || a.trueBoss || opts.trueBoss);
  const n = elemAbilityCount(a.stars || 0, boss);
  a.elemMoves = rollElemAbilities(a.element, n);
  a.elemMoveCd = {};
  for (const id of a.elemMoves) a.elemMoveCd[id] = rand(0.8, 2.8);
}

export function animalEffectiveDamage(a: AnimalEntity) {
  // Frenzied ramps damage at low HP; inspireMul covers blessed / boss auras.
  return Math.max(1, Math.round(a.dmg * (a.inspireMul || 1) * frenzyMul(a, 'dmg')));
}

export function applyPlayerSlow(player: RunPlayer, amount: number, dur: number) {
  player.slow = clamp(Math.max(player.slow, amount), 0, 0.85);
  player.slowT = Math.max(player.slowT, dur);
}

export function applyPlayerPoison(player: RunPlayer, dps: number, life: number) {
  // Convert legacy DPS into per-tick damage (one tick ≈ DOT_INTERVAL seconds of old DPS).
  applyDot(player.poisons, dps * DOT_INTERVAL, life);
}

function finishAbility(a: AnimalEntity, id: string) {
  a.ability = null;
  a.state = 'recover';
  a.stateT = 0.45;
  const elemDef = ELEMENT_ABILITY_BY_ID[id];
  if (elemDef) {
    const cd = elemDef.cd * (a.trueBoss ? 0.75 : 1);
    a.elemMoveCd[id] = cd;
    a.abilityCd = 0.85;
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
  let dealt = amount * (1 - clamp(player.armor, 0, 0.65));
  dealt *= 1 - clamp((player.buildArmorDr || 0) + (player.guardianDr || 0), 0, 0.65);
  player.hp -= dealt;
  player.invuln = 0.35;
  Audio.playSfx('hurt');
  onHurt?.();
  onFloat?.(player.x + rand(-12, 12), player.y - 50, `-${Math.max(1, Math.round(dealt))}`, '#ff7075', 26);
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    Audio.playSfx('death');
  }
}

function spawnElemBolt(
  a: AnimalEntity,
  ang: number,
  opts: {
    speed: number;
    radius: number;
    dmg: number;
    colorHex: string;
    element: ElementId | null;
    kind?: string;
    life?: number;
  },
  bolts: EnemyBoltShot[],
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
) {
  const kind = opts.kind || 'bolt';
  const r = opts.radius;
  const size = enemyBoltCanvasSize(r, kind);
  const canvas = new CanvasSprite(scene, layer, size, size, `abil_bolt_${enemyBoltUid++}`, 0.5, 0.5);
  canvas.clear();
  canvas.withCenterOrigin((ctx) => drawEnemyBolt(ctx, { kind, color: opts.colorHex, r, ang }));
  canvas.refresh();
  const x = a.x;
  const y = a.y - 10;
  canvas.setPosition(x, y, Math.floor(y) + 12);
  const colNum = Phaser.Display.Color.HexStringToColor(opts.colorHex).color;
  bolts.push({
    x,
    y,
    vx: Math.cos(ang) * opts.speed,
    vy: Math.sin(ang) * opts.speed,
    r,
    dmg: opts.dmg,
    element: opts.element,
    color: colNum,
    colorHex: opts.colorHex,
    kind,
    life: opts.life ?? 1.8,
    dead: false,
    canvas,
    gfx: canvas.image,
  });
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
  if (!a.elemMoves?.length) return false;

  const ready = a.elemMoves.filter((id) => {
    if ((a.elemMoveCd[id] || 0) > 0) return false;
    const def = ELEMENT_ABILITY_BY_ID[id];
    if (!def) return false;
    if (d > def.range) return false;
    return true;
  });
  if (!ready.length) return false;
  if (d < a.radius + 18 && Math.random() < 0.45) return false;
  const id = ready[Math.floor(Math.random() * ready.length)];
  return beginAbility(a, player, id, dx, dy, d, hazards);
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
  const elem = ELEMENT_ABILITY_BY_ID[id];

  if (id === 'elem_charge' || id === 'boss_charge') {
    const def = id === 'boss_charge' ? BOSS_ABILITY.boss_charge : elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, tx: Math.cos(ang), ty: Math.sin(ang),
      speed: def.speed, dmgMul: def.dmgMul, color: def.color,
      active: def.active, pathLen: id === 'boss_charge' ? 420 : (elem?.pathLen || 280),
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Audio.playSfx(isBearish(a.species) ? 'roar' : 'growl');
    return true;
  }

  if (id === 'elem_bolt' || id === 'elem_boulder') {
    const def = elem!;
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

  if (id === 'elem_torrent') {
    const def = elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, color: def.color, dmgMul: def.dmgMul,
      speed: def.speed, radius: def.radius, bolts: def.bolts || 3,
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Audio.playSfx('grunt');
    return true;
  }

  if (id === 'elem_poison') {
    const def = elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      tx: player.x, ty: player.y, color: def.color, dmgMul: def.dmgMul,
      poisonDpsMul: def.poisonDpsMul, poisonT: def.poisonT, splash: def.splash,
    };
    a.state = 'ability';
    Audio.playSfx('growl');
    return true;
  }

  if (id === 'elem_spikes' || id === 'elem_vines') {
    const def = elem!;
    const count = def.count || 2;
    const spots: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.55;
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
      slow: def.slow, slowT: def.slowT,
    };
    a.state = 'ability';
    const hazType = id === 'elem_vines' ? 'vines' : 'spikes';
    for (const s of spots) {
      hazards.push({
        type: hazType, x: s.x, y: s.y, r: def.radius!, delay: def.tele + ABILITY_COMMIT,
        life: def.tele + ABILITY_COMMIT + 0.7, age: 0, dmg: Math.round(animalEffectiveDamage(a) * def.dmgMul),
        dps: 0, element: id === 'elem_vines' ? 'nature' : 'earth', color: def.color,
        hit: false, dead: false, slow: def.slow, slowT: def.slowT,
      });
    }
    Audio.playSfx('grunt');
    return true;
  }

  if (
    id === 'elem_nova' ||
    id === 'elem_gloom' ||
    id === 'elem_emberburst' ||
    id === 'elem_quake' ||
    id === 'elem_spore' ||
    id === 'elem_flare'
  ) {
    const def = elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, color: def.color, dmgMul: def.dmgMul,
      slow: def.slow, slowT: def.slowT,
      poisonDpsMul: def.poisonDpsMul, poisonT: def.poisonT,
    };
    a.state = 'ability';
    Audio.playSfx(id === 'elem_nova' || id === 'elem_emberburst' || id === 'elem_quake' ? 'roar' : 'growl');
    return true;
  }

  if (id === 'elem_scorch') {
    const def = elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      tx: player.x, ty: player.y, color: def.color, dmgMul: def.dmgMul,
      groundLife: def.groundLife, groundR: def.groundR, groundDpsMul: def.groundDpsMul,
      radius: def.radius,
    };
    a.state = 'ability';
    Audio.playSfx('growl');
    return true;
  }

  if (id === 'elem_spray' || id === 'boss_breath' || id === 'elem_beam') {
    const def = id === 'boss_breath' ? BOSS_ABILITY.boss_breath : elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, range: def.range, halfAngle: def.halfAngle,
      dmgMul: def.dmgMul, active: ('active' in def ? def.active : 0.25) || 0.25,
      color: def.color, slow: elem?.slow, slowT: elem?.slowT,
    };
    a.state = 'ability';
    a.facing = Math.cos(ang) > 0 ? 1 : -1;
    Audio.playSfx(id === 'elem_beam' ? 'grunt' : 'roar');
    return true;
  }

  if (id === 'elem_drain') {
    const def = elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, color: def.color, dmgMul: def.dmgMul, radius: def.radius, speed: 340,
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Audio.playSfx('growl');
    return true;
  }

  if (id === 'elem_shadowstep') {
    const def = elem!;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      tx: player.x, ty: player.y, color: def.color, dmgMul: def.dmgMul,
      active: def.active, pathLen: def.pathLen,
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

  if (id === 'boss_quake' || id === 'boss_howl') {
    const def = id === 'boss_quake' ? BOSS_ABILITY.boss_quake : BOSS_ABILITY.boss_howl;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      radius: def.radius, color: def.color, dmgMul: def.dmgMul,
      slow: 'slow' in def ? def.slow : undefined,
      slowT: 'slowT' in def ? def.slowT : undefined,
      mul: 'mul' in def ? def.mul : undefined,
      buffDur: 'duration' in def ? def.duration : undefined,
    };
    a.state = 'ability';
    Audio.playSfx(id === 'boss_howl' ? 'howl' : 'roar');
    return true;
  }

  if (id === 'boss_volley') {
    const def = BOSS_ABILITY.boss_volley;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      ang, color: def.color, dmgMul: def.dmgMul,
      speed: def.speed, radius: def.radius, bolts: def.bolts,
    };
    a.state = 'ability';
    a.facing = dx > 0 ? 1 : -1;
    Audio.playSfx('roar');
    return true;
  }

  if (id === 'boss_leap') {
    const def = BOSS_ABILITY.boss_leap;
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      tx: player.x, ty: player.y, radius: def.radius,
      color: def.color, dmgMul: def.dmgMul,
    };
    a.state = 'ability';
    Audio.playSfx('roar');
    return true;
  }

  if (id === 'boss_meteor') {
    const def = BOSS_ABILITY.boss_meteor;
    const count = def.count;
    const spots: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.7;
      const dist = clamp(40 + i * 36, 50, def.range * 0.7);
      spots.push({
        x: player.x + Math.cos(ang + spread) * dist * 0.35 + rand(-50, 50),
        y: player.y + Math.sin(ang + spread) * dist * 0.35 + rand(-50, 50),
      });
    }
    spots[0] = { x: player.x + rand(-16, 16), y: player.y + rand(-16, 16) };
    a.ability = {
      id, phase: 'tele', t: def.tele, dur: def.tele,
      spots, color: def.color, dmgMul: def.dmgMul, radius: def.radius,
    };
    a.state = 'ability';
    for (const s of spots) {
      hazards.push({
        type: 'spikes', x: s.x, y: s.y, r: def.radius, delay: def.tele + ABILITY_COMMIT,
        life: def.tele + ABILITY_COMMIT + 0.85, age: 0, dmg: Math.round(animalEffectiveDamage(a) * def.dmgMul),
        dps: 0, element: null, color: def.color, hit: false, dead: false,
      });
    }
    Audio.playSfx('roar');
    return true;
  }

  if (id === 'boss_beam') {
    const def = BOSS_ABILITY.boss_beam;
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
    if (
      ab.id === 'elem_bolt' ||
      ab.id === 'elem_torrent' ||
      ab.id === 'elem_boulder' ||
      ab.id === 'elem_drain' ||
      ab.id === 'boss_breath' ||
      ab.id === 'boss_volley' ||
      ab.id === 'boss_beam' ||
      ab.id === 'elem_spray' ||
      ab.id === 'elem_beam'
    ) {
      const turn = 2.2 * dt;
      const want = Math.atan2(player.y - a.y, player.x - a.x);
      let diff = want - (ab.ang || 0);
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      ab.ang = (ab.ang || 0) + clamp(diff, -turn, turn);
      a.facing = Math.cos(ab.ang) > 0 ? 1 : -1;
    }
    if (
      (ab.id === 'elem_poison' ||
        ab.id === 'elem_scorch' ||
        ab.id === 'elem_shadowstep' ||
        ab.id === 'boss_leap') &&
      ab.tx != null &&
      ab.ty != null
    ) {
      ab.tx = damp(ab.tx, player.x, 3, dt);
      ab.ty = damp(ab.ty, player.y, 3, dt);
    }

    if (ab.t > 0) return [0, 0];
    // Telegraph full — lock aim for a beat so the player can step out.
    ab.phase = 'commit';
    ab.t = ABILITY_COMMIT;
    ab.dur = ABILITY_COMMIT;
    return [0, 0];
  }

  if (ab.phase === 'commit') {
    if (ab.t > 0) return [0, 0];
    // Commit done — resolve the ability (instant hit or start a sustained act).
    ab.phase = 'act';
    if (ab.id === 'elem_charge' || ab.id === 'boss_charge') {
      ab.t = ab.active || 0.5;
      ab.traveled = 0;
      a._abilHit = false;
    } else if (ab.id === 'elem_bolt' || ab.id === 'elem_boulder' || ab.id === 'elem_drain') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const ang = ab.ang || 0;
      const kind = ab.id === 'elem_boulder' ? 'rock' : ab.id === 'elem_drain' ? 'bolt' : 'bolt';
      const el: ElementId | null =
        ab.id === 'elem_boulder'
          ? 'earth'
          : ab.id === 'elem_drain'
            ? 'darkness'
            : ((a.element as ElementId | null) || 'water');
      spawnElemBolt(
        a,
        ang,
        {
          speed: ab.speed || 300,
          radius: ab.radius || 11,
          dmg,
          colorHex: ab.color || '#4db8ff',
          element: el,
          kind,
          life: ab.id === 'elem_boulder' ? 2.2 : 1.8,
        },
        bolts,
        scene,
        layer,
      );
      fx?.sparks(a.x, a.y - 12, 6, ab.color);
      fx?.trail(a.x + Math.cos(ang) * 18, a.y + Math.sin(ang) * 18 - 8, {
        element: el,
        color: ab.color,
        strength: 1.1,
        rich: true,
        vx: Math.cos(ang) * (ab.speed || 300),
        vy: Math.sin(ang) * (ab.speed || 300),
      });
      Audio.playSfx('throw', 0.8);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_torrent') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const base = ab.ang || 0;
      const n = ab.bolts || 3;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.28;
        spawnElemBolt(
          a,
          base + spread,
          {
            speed: ab.speed || 280,
            radius: ab.radius || 9,
            dmg,
            colorHex: ab.color || '#4db8ff',
            element: 'water',
            kind: 'bolt',
          },
          bolts,
          scene,
          layer,
        );
      }
      fx?.sparks(a.x, a.y - 12, 8, ab.color);
      Audio.playSfx('throw', 0.9);
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
    } else if (ab.id === 'elem_spikes' || ab.id === 'elem_vines') {
      finishAbility(a, ab.id);
    } else if (
      ab.id === 'elem_nova' ||
      ab.id === 'elem_gloom' ||
      ab.id === 'elem_emberburst' ||
      ab.id === 'elem_quake' ||
      ab.id === 'elem_spore' ||
      ab.id === 'elem_flare'
    ) {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const r = ab.radius || 105;
      if (dist2(a.x, a.y, player.x, player.y) < (r + 13) ** 2) {
        if (dmg > 0) hurt(player, Math.max(1, dmg), onHurt, onFloat);
        if (ab.slow) applyPlayerSlow(player, ab.slow, ab.slowT || 2);
        if (ab.poisonDpsMul) {
          applyPlayerPoison(
            player,
            Math.max(2, Math.round(animalEffectiveDamage(a) * ab.poisonDpsMul)),
            ab.poisonT || 3.6,
          );
        }
      }
      const rgba =
        ab.id === 'elem_emberburst'
          ? 'rgba(255,106,61,0.95)'
          : ab.id === 'elem_quake'
            ? 'rgba(196,163,90,0.95)'
            : ab.id === 'elem_spore'
              ? 'rgba(109,212,106,0.9)'
              : ab.id === 'elem_flare'
                ? 'rgba(255,241,160,0.95)'
                : ab.id === 'elem_gloom'
                  ? 'rgba(155,123,222,0.9)'
                  : 'rgba(255,230,109,0.95)';
      fx?.ring(a.x, a.y, rgba, r * 0.25, r * 1.1, 0.45);
      fx?.sparks(a.x, a.y - 10, ab.id === 'elem_nova' || ab.id === 'elem_emberburst' ? 16 : 10, ab.color);
      Audio.playSfx(ab.id === 'elem_gloom' || ab.id === 'elem_spore' ? 'hit' : 'boom', 0.9);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_scorch') {
      const tx = ab.tx || player.x;
      const ty = ab.ty || player.y;
      const dps = Math.max(1, animalEffectiveDamage(a) * (ab.groundDpsMul || 0.4));
      hazards.push({
        type: 'burn', x: tx, y: ty, r: ab.groundR || 40,
        life: ab.groundLife || 4.5, age: 0, delay: 0, dmg: 0, dps,
        element: 'fire', color: ab.color, hit: false, dead: false,
      });
      if (dist2(tx, ty, player.x, player.y) < ((ab.groundR || 40) + 10) ** 2) {
        hurt(player, Math.round(animalEffectiveDamage(a) * ab.dmgMul), onHurt, onFloat);
      }
      fx?.ring(tx, ty, 'rgba(255,140,40,0.9)', 8, ab.groundR || 40, 0.4);
      Audio.playSfx('boom', 0.7);
      finishAbility(a, ab.id);
    } else if (ab.id === 'elem_shadowstep') {
      const tx = ab.tx || player.x;
      const ty = ab.ty || player.y;
      const ang = Math.atan2(ty - a.y, tx - a.x);
      // Blink beside the player.
      const side = Math.random() < 0.5 ? 1 : -1;
      const ox = Math.cos(ang + side * 1.2) * (a.radius + 28);
      const oy = Math.sin(ang + side * 1.2) * (a.radius + 28);
      const fromX = a.x;
      const fromY = a.y;
      fx?.sparks(fromX, fromY - 8, 10, ab.color);
      a.x = tx + ox;
      a.y = ty + oy;
      a.facing = player.x > a.x ? 1 : -1;
      // Darkness smear along the blink path.
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        fx?.trail(lerp(fromX, a.x, k), lerp(fromY, a.y, k) - a.radius * 0.35, {
          element: 'darkness',
          color: ab.color,
          strength: 1.2,
          rich: true,
        });
      }
      if (dist2(a.x, a.y, player.x, player.y) < (a.radius + 22) ** 2) {
        hurt(player, Math.round(animalEffectiveDamage(a) * ab.dmgMul), onHurt, onFloat);
        applyPlayerSlow(player, 0.35, 1.2);
      }
      fx?.sparks(a.x, a.y - 8, 12, ab.color);
      Audio.playSfx('hit', 0.85);
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
    } else if (ab.id === 'boss_quake') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const r = ab.radius || 175;
      if (dist2(a.x, a.y, player.x, player.y) < (r + 13) ** 2) {
        hurt(player, dmg, onHurt, onFloat);
      }
      fx?.ring(a.x, a.y, 'rgba(196,163,90,0.95)', r * 0.25, r * 1.1, 0.5);
      fx?.dust(a.x, a.y, 14);
      fx?.sparks(a.x, a.y - 10, 18, ab.color);
      Audio.playSfx('boom', 1.15);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_howl') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const r = ab.radius || 210;
      if (dist2(a.x, a.y, player.x, player.y) < (r + 13) ** 2) {
        if (dmg > 0) hurt(player, Math.max(1, dmg), onHurt, onFloat);
        applyPlayerSlow(player, ab.slow || 0.6, ab.slowT || 3.2);
      }
      a.inspireT = Math.max(a.inspireT || 0, ab.buffDur || 6);
      a.inspireMul = Math.max(a.inspireMul || 1, ab.mul || 1.4);
      fx?.ring(a.x, a.y, 'rgba(155,123,222,0.9)', 18, r, 0.55);
      onFloat?.(a.x, a.y - 44, 'DREAD!', '#9b7bde', 16);
      Audio.playSfx('howl', 1.05);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_volley') {
      const dmg = Math.round(animalEffectiveDamage(a) * ab.dmgMul);
      const base = ab.ang || 0;
      const n = ab.bolts || 5;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.22;
        spawnElemBolt(
          a,
          base + spread,
          {
            speed: ab.speed || 320,
            radius: ab.radius || 12,
            dmg,
            colorHex: ab.color || '#e8d4b0',
            element: null,
            kind: 'rock',
            life: 2.0,
          },
          bolts,
          scene,
          layer,
        );
      }
      fx?.sparks(a.x, a.y - 12, 12, ab.color);
      Audio.playSfx('throw', 1.0);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_leap') {
      const tx = ab.tx || player.x;
      const ty = ab.ty || player.y;
      const fromX = a.x;
      const fromY = a.y;
      fx?.sparks(fromX, fromY - 8, 10, ab.color);
      a.x = tx;
      a.y = ty;
      a.facing = player.x > a.x ? 1 : -1;
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const arc = Math.sin(k * Math.PI) * 40;
        fx?.trail(lerp(fromX, a.x, k), lerp(fromY, a.y, k) - arc, {
          color: ab.color,
          strength: 1.15,
          rich: true,
          vy: -80,
        });
      }
      const r = ab.radius || 78;
      if (dist2(a.x, a.y, player.x, player.y) < (r + 10) ** 2) {
        hurt(player, Math.round(animalEffectiveDamage(a) * ab.dmgMul), onHurt, onFloat);
      }
      fx?.ring(a.x, a.y, 'rgba(255,122,106,0.95)', 16, r, 0.45);
      fx?.dust(a.x, a.y, 12);
      Audio.playSfx('boom', 1.1);
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_meteor') {
      finishAbility(a, ab.id);
    } else if (ab.id === 'boss_breath' || ab.id === 'boss_beam' || ab.id === 'elem_spray' || ab.id === 'elem_beam') {
      ab.t = ab.active || 0.35;
      a._abilHit = false;
    }
    return [0, 0];
  }

  // Active phase
  if (ab.id === 'elem_charge' || ab.id === 'boss_charge') {
    tvx = (ab.tx || 0) * (ab.speed || 400);
    tvy = (ab.ty || 0) * (ab.speed || 400);
    ab.traveled = (ab.traveled || 0) + (ab.speed || 400) * dt;
    ab._trailAcc = (ab._trailAcc || 0) + dt;
    if (ab._trailAcc >= 0.03) {
      ab._trailAcc = 0;
      const el =
        ab.id === 'boss_charge'
          ? null
          : ((a.element as ElementId | null) || 'fire');
      fx?.trail(a.x, a.y - a.radius * 0.4, {
        element: el,
        color: ab.color,
        strength: ab.id === 'boss_charge' ? 1.2 : 1,
        rich: true,
        vx: tvx,
        vy: tvy,
      });
    }
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
      fx?.trail(a.x, a.y - 6, {
        element: 'fire',
        color: ab.color,
        strength: 1.15,
        rich: true,
        vx: tvx,
        vy: tvy,
      });
    }
    if (!a._abilHit && player.alive && dist2(a.x, a.y, player.x, player.y) < (a.radius + 17) ** 2) {
      a._abilHit = true;
      hurt(player, Math.round(animalEffectiveDamage(a) * ab.dmgMul), onHurt, onFloat);
    }
    if (ab.t <= 0) finishAbility(a, ab.id);
    return [tvx, tvy];
  }

  if (ab.id === 'boss_breath' || ab.id === 'boss_beam' || ab.id === 'elem_spray' || ab.id === 'elem_beam') {
    const beamEl: ElementId | null =
      ab.id === 'elem_spray'
        ? 'water'
        : ab.id === 'elem_beam'
          ? 'light'
          : ab.id === 'boss_breath'
            ? 'water'
            : 'light';
    // Continuous elemental stream along the cone / beam while active.
    ab._trailAcc = (ab._trailAcc || 0) + dt;
    if (ab._trailAcc >= 0.028) {
      ab._trailAcc = 0;
      const ang = ab.ang || 0;
      const len = ab.range || 240;
      const isBeam = ab.id === 'elem_beam' || ab.id === 'boss_beam';
      const samples = isBeam ? 5 : 4;
      for (let i = 1; i <= samples; i++) {
        const d = (len * i) / (samples + 0.5);
        const spread = isBeam ? 0 : rand(-0.35, 0.35);
        const a2 = ang + spread;
        fx?.trail(a.x + Math.cos(a2) * d, a.y + Math.sin(a2) * d - 6, {
          element: beamEl,
          color: ab.color,
          strength: isBeam ? 1.05 : 0.85,
          rich: true,
          vx: Math.cos(ang) * 180,
          vy: Math.sin(ang) * 180,
        });
      }
    }
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
        const half =
          ab.halfAngle ||
          (ab.id === 'elem_beam' ? 0.18 : ab.id === 'boss_beam' ? 0.22 : 0.58);
        if (pd < (ab.range || 240) + 13 && Math.abs(diff) < half) {
          hurt(player, dmg, onHurt, onFloat);
          if (ab.slow) applyPlayerSlow(player, ab.slow, ab.slowT || 1.2);
          else if (ab.id === 'boss_breath') applyPlayerSlow(player, 0.35, 1.4);
        }
      }
      if (ab.id === 'elem_beam' || ab.id === 'boss_beam') {
        const len = ab.range || 280;
        const x2 = a.x + Math.cos(ab.ang || 0) * len;
        const y2 = a.y + Math.sin(ab.ang || 0) * len;
        fx?.sparks((a.x + x2) / 2, (a.y + y2) / 2 - 8, ab.id === 'boss_beam' ? 16 : 10, ab.color);
      } else {
        fx?.ring(
          a.x + Math.cos(ab.ang || 0) * 60,
          a.y + Math.sin(ab.ang || 0) * 60,
          'rgba(77,184,255,0.85)',
          20,
          80,
          0.35,
        );
      }
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
    if (h.type === 'spikes' || h.type === 'vines') {
      if (h.age < h.delay) continue;
      if (!h.hit && h.age < h.delay + 0.35) {
        if (dist2(h.x, h.y, player.x, player.y) < (h.r + 8) ** 2) {
          h.hit = true;
          hurt(player, h.dmg, onHurt, onFloat);
          if (h.slow) applyPlayerSlow(player, h.slow, h.slowT || 2);
          fx?.dust(h.x, h.y, 6);
          fx?.sparks(h.x, h.y - 8, 8, h.color);
        }
      }
    } else if (h.type === 'burn') {
      if (Math.random() < dt * 8) {
        fx?.trail(h.x + rand(-h.r * 0.55, h.r * 0.55), h.y + rand(-h.r * 0.35, h.r * 0.35) - 4, {
          element: h.element || 'fire',
          color: h.color,
          strength: 0.55,
          rich: false,
          vy: -50,
        });
      }
      if (dist2(h.x, h.y, player.x, player.y) < (h.r + 6) ** 2) {
        h._acc = (h._acc || 0) + h.dps * dt;
        if (h._acc >= 1) {
          const d = Math.floor(h._acc);
          h._acc -= d;
          hurt(player, d, onHurt, onFloat);
        }
      }
    } else if (h.type === 'totem') {
      if (dist2(h.x, h.y, player.x, player.y) < (h.r + 8) ** 2) {
        if (h.slow) applyPlayerSlow(player, h.slow, h.slowT || 0.6);
        h._poisonCd = (h._poisonCd || 0) - dt;
        if ((h.poisonDps || 0) > 0 && (h._poisonCd || 0) <= 0) {
          h._poisonCd = 1.2;
          applyPlayerPoison(player, h.poisonDps || 4, h.poisonT || 4);
          fx?.sparks(player.x, player.y - 10, 4, h.color);
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
    const col = Phaser.Display.Color.HexStringToColor(ab.color || '#fff').color;
    if (ab.phase === 'act') {
      if (a.inspireT > 0) {
        g.lineStyle(2, 0xffe66d, 0.25);
        g.strokeEllipse(a.x, a.y, a.radius * 4.4, a.radius * 1.8);
      }
      continue;
    }
    // Full during commit (locked telegraph); fills during tele.
    const progress =
      ab.phase === 'commit' ? 1 : 1 - clamp(ab.t / Math.max(0.01, ab.dur), 0, 1);
    const pulse = ab.phase === 'commit' ? 0.12 + Math.abs(Math.sin(ab.t * 14)) * 0.18 : 0;
    if (ab.id === 'elem_charge' || ab.id === 'boss_charge' || ab.id === 'boss_fireground') {
      const len = ab.pathLen || (ab.id === 'boss_fireground' ? 220 : 280);
      const x2 = a.x + (ab.tx || 0) * len;
      const y2 = a.y + (ab.ty || 0) * len;
      g.lineStyle(10 + progress * 8, col, 0.35 + progress * 0.45 + pulse);
      g.lineBetween(a.x, a.y, x2, y2);
      g.lineStyle(2, col, 0.7 + pulse);
      g.lineBetween(a.x, a.y, x2, y2);
    } else if (
      ab.id === 'elem_bolt' ||
      ab.id === 'elem_torrent' ||
      ab.id === 'elem_boulder' ||
      ab.id === 'elem_drain' ||
      ab.id === 'boss_volley'
    ) {
      const ang = ab.ang || 0;
      const len = ab.id === 'elem_torrent' || ab.id === 'boss_volley' ? 70 : 80;
      g.lineStyle(3, col, 0.5 + progress * 0.4 + pulse);
      g.lineBetween(a.x, a.y - 8, a.x + Math.cos(ang) * len, a.y + Math.sin(ang) * len - 8);
      g.fillStyle(col, 0.7 + pulse);
      g.fillCircle(a.x + Math.cos(ang) * 28, a.y + Math.sin(ang) * 28 - 8, 6 + progress * 4);
      if (ab.id === 'elem_torrent' || ab.id === 'boss_volley') {
        const spreads = ab.id === 'boss_volley' ? [-0.44, -0.22, 0.22, 0.44] : [-0.28, 0.28];
        for (const s of spreads) {
          g.lineStyle(2, col, 0.35 + progress * 0.3);
          g.lineBetween(
            a.x,
            a.y - 8,
            a.x + Math.cos(ang + s) * 60,
            a.y + Math.sin(ang + s) * 60 - 8,
          );
        }
      }
    } else if (ab.id === 'elem_poison' || ab.id === 'elem_scorch') {
      const r0 = ab.id === 'elem_scorch' ? ab.groundR || 40 : ab.splash || 48;
      const r = r0 * progress;
      g.lineStyle(2.5, col, 0.3 + progress * 0.4 + pulse);
      g.strokeEllipse(ab.tx || a.x, ab.ty || a.y, r0 * 2, r0 * 1.4);
      g.fillStyle(col, 0.15 + progress * 0.2 + pulse);
      g.fillEllipse(ab.tx || a.x, ab.ty || a.y, r * 2, r * 1.4);
    } else if (ab.id === 'elem_shadowstep' || ab.id === 'boss_leap') {
      const r0 = ab.id === 'boss_leap' ? ab.radius || 78 : 36;
      g.lineStyle(2.5, col, 0.4 + progress * 0.4 + pulse);
      g.strokeEllipse(ab.tx || a.x, ab.ty || a.y, r0 * 2, r0 * 1.35);
      g.fillStyle(col, 0.12 + progress * 0.22 + pulse);
      g.fillEllipse(ab.tx || a.x, ab.ty || a.y, r0 * 2 * progress, r0 * 1.35 * progress);
    } else if (
      ab.id === 'elem_nova' ||
      ab.id === 'elem_gloom' ||
      ab.id === 'elem_emberburst' ||
      ab.id === 'elem_quake' ||
      ab.id === 'elem_spore' ||
      ab.id === 'elem_flare' ||
      ab.id === 'boss_inspire' ||
      ab.id === 'boss_quake' ||
      ab.id === 'boss_howl'
    ) {
      const r = (ab.radius || 100) * (0.35 + progress * 0.65);
      g.lineStyle(3, col, 0.3 + progress * 0.35 + pulse);
      g.strokeEllipse(a.x, a.y, r * 2, r * 1.56);
      g.fillStyle(col, 0.12 + progress * 0.18 + pulse);
      g.fillEllipse(a.x, a.y, r * 2, r * 1.56);
    } else if (
      ab.id === 'boss_breath' ||
      ab.id === 'boss_beam' ||
      ab.id === 'elem_spray' ||
      ab.id === 'elem_beam'
    ) {
      const half =
        ab.halfAngle ||
        (ab.id === 'elem_beam' ? 0.18 : ab.id === 'boss_beam' ? 0.22 : 0.58);
      const range = (ab.range || 240) * (0.4 + progress * 0.6);
      const ang = ab.ang || 0;
      g.fillStyle(col, 0.28 + progress * 0.4 + pulse);
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
    if (h.type === 'spikes' || h.type === 'vines') {
      const erupting = h.age >= h.delay;
      if (!erupting) {
        const warn = clamp(h.age / Math.max(0.01, h.delay), 0, 1);
        g.lineStyle(2 + warn * 2, col, 0.25 + warn * 0.45);
        g.strokeEllipse(h.x, h.y, h.r * 2, h.r * 1.1);
        g.fillStyle(col, 0.12 + warn * 0.2);
        g.fillEllipse(h.x, h.y, h.r * 2 * warn, h.r * 1.1 * warn);
      } else {
        const pop = clamp(1 - (h.age - h.delay) / 0.45, 0, 1);
        if (h.type === 'vines') {
          g.lineStyle(3, col, pop * 0.9);
          for (let i = -1; i <= 1; i++) {
            g.lineBetween(h.x + i * 8, h.y + 6, h.x + i * 4, h.y - 10 - pop * 16);
          }
          g.fillStyle(col, pop * 0.35);
          g.fillEllipse(h.x, h.y, h.r * 2, h.r);
        } else {
          // Tall stone spikes — base + tip layers so they read clearly at hazard scale.
          g.fillStyle(0x6a4e28, 1);
          for (let i = -2; i <= 2; i++) {
            const hx = h.x + i * 14;
            const hh = (28 + Math.abs(i) * 4) + pop * 48;
            const half = 7 + (2 - Math.abs(i)) * 1.5;
            g.fillTriangle(
              hx,
              h.y + 6 - hh,
              hx - half,
              h.y + 6 - hh * 0.28,
              hx + half,
              h.y + 6 - hh * 0.28,
            );
          }
          g.fillStyle(0xc4a35a, 0.85 * pop);
          for (let i = -1; i <= 1; i++) {
            const hx = h.x + i * 14;
            const hh = 36 + pop * 40;
            g.fillTriangle(hx, h.y + 4 - hh, hx - 5, h.y + 4 - hh * 0.35, hx + 5, h.y + 4 - hh * 0.35);
          }
          g.fillStyle(col, pop * 0.45);
          g.fillEllipse(h.x, h.y, h.r * 2, h.r * 1.05);
        }
      }
    } else if (h.type === 'totem') {
      const fade = clamp(1 - h.age / h.life, 0, 1);
      g.fillStyle(0x6dd46a, 0.18 * fade);
      g.fillEllipse(h.x, h.y, h.r * 2, h.r * 1.35);
      g.lineStyle(2, 0x9b7bde, 0.45 * fade);
      g.strokeEllipse(h.x, h.y, h.r * 2, h.r * 1.35);
      g.fillStyle(0x5a4028, 0.9 * fade);
      g.fillRect(h.x - 4, h.y - 22, 8, 24);
      g.fillStyle(0x3a2414, 0.95 * fade);
      g.fillTriangle(h.x, h.y - 30, h.x - 10, h.y - 18, h.x + 10, h.y - 18);
      g.fillStyle(0x6dd46a, 0.85 * fade);
      g.fillCircle(h.x, h.y - 12, 3.5);
    } else if (h.type === 'burn') {
      const fade = clamp(1 - h.age / h.life, 0, 1);
      g.fillStyle(0xff8c28, 0.35 * fade);
      g.fillEllipse(h.x, h.y, h.r * 2, h.r * 1.44);
    }
  }
}
