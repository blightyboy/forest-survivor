import type { ElementId } from './constants.ts';

export const at = (l: number, n: number, v: number) => (l >= n ? v : 0);

export type WeaponStats = Record<string, number>;

export interface WeaponDef {
  name: string;
  text: string[];
  stats: (level: number) => WeaponStats;
}

export const WEAPON_DEFS: Record<string, WeaponDef> = {
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
  chainhook: {
    name: 'Chain & Spikeball',
    text: ['Spiked iron balls whirl on chains around you', '+1 ball', '+10 damage, wider orbit', 'Spin 25% faster', '+1 ball',
      '+16 damage, wider orbit', '+12 damage, spin 20% faster', '+1 ball, +18 damage'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 5, 1) + at(l, 8, 1),
      dmg: 18 + at(l, 3, 10) + at(l, 6, 16) + at(l, 7, 12) + at(l, 8, 18),
      range: 64 + at(l, 3, 16) + at(l, 6, 18) + at(l, 8, 14),
      speed: 5.2 * (l >= 4 ? 1.25 : 1) * (l >= 7 ? 1.2 : 1),
    }),
  },
  trap: {
    name: 'Snare Trap',
    text: ['Places a snare that snaps when a beast steps on it', '+1 trap', '+18 damage', 'Wider trigger', 'Arms 20% faster',
      '+1 trap', '+28 damage', 'Huge snare, +22 damage'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 6, 1),
      dmg: 48 + at(l, 3, 18) + at(l, 7, 28) + at(l, 8, 22),
      radius: 28 + at(l, 4, 10) + at(l, 8, 12),
      cd: l >= 5 ? 1.6 : 2.1,
      maxArmed: 4 + at(l, 2, 2) + at(l, 6, 2) + at(l, 8, 2),
    }),
  },
  flashbomb: {
    name: 'Flash Bomb',
    text: ['Lobs a flash that stuns beasts — barely scrapes them', 'Wider flash', 'Stun lasts longer', '+1 bomb', 'Thrown 20% faster',
      'Wider flash', 'Longer stun', 'Huge flash, longer stun'],
    stats: (l) => ({
      count: 1 + at(l, 4, 1),
      dmg: 4 + at(l, 8, 2),
      radius: 90 + at(l, 2, 18) + at(l, 6, 22) + at(l, 8, 24),
      stun: 1.4 + at(l, 3, 0.4) + at(l, 5, 0.35) + at(l, 7, 0.45) + at(l, 8, 0.4),
      cd: l >= 5 ? 2.4 : 3.0,
    }),
  },
  stormflask: {
    name: 'Lightning in a Bottle',
    text: ['Uncorks chain lightning that leaps between beasts', '+1 jump', '+12 damage', '+1 jump', 'Fires 20% faster',
      '+1 jump', '+20 damage', '+1 jump, +16 damage'],
    stats: (l) => ({
      jumps: 3 + at(l, 2, 1) + at(l, 4, 1) + at(l, 6, 1) + at(l, 8, 1),
      dmg: 28 + at(l, 3, 12) + at(l, 7, 20) + at(l, 8, 16),
      range: 220 + at(l, 5, 40) + at(l, 8, 30),
      jumpRange: 160 + at(l, 4, 30) + at(l, 8, 25),
      cd: l >= 5 ? 1.35 : 1.75,
    }),
  },
  fishingpole: {
    name: 'Fishing Pole',
    text: ['Hooks a beast and reels it toward you', '+1 target', 'Stronger pull', '+1 target', 'Casts 20% faster',
      '+1 target', 'Stronger pull', '+1 target, fierce reel'],
    stats: (l) => ({
      count: 1 + at(l, 2, 1) + at(l, 4, 1) + at(l, 6, 1) + at(l, 8, 1),
      dmg: 14 + at(l, 3, 8) + at(l, 7, 12),
      pull: 780 + at(l, 3, 140) + at(l, 7, 160) + at(l, 8, 120),
      range: 280 + at(l, 5, 40) + at(l, 8, 30),
      cd: l >= 5 ? 1.15 : 1.5,
    }),
  },
  poisonflask: {
    name: 'Poison Bottle',
    text: ['Throws a vial that shatters into a green ooze pool', '+14 pool DPS', 'Wider pool', '+1 vial', 'Thrown 20% faster',
      'Longer ooze', '+18 pool DPS', 'Huge pool, +16 DPS'],
    stats: (l) => ({
      count: 1 + at(l, 4, 1),
      dmg: 22 + at(l, 2, 14) + at(l, 7, 18) + at(l, 8, 16),
      radius: 52 + at(l, 3, 14) + at(l, 8, 18),
      life: 5 + at(l, 6, 2.5) + at(l, 8, 1.5),
      cd: l >= 5 ? 2.0 : 2.55,
    }),
  },
};

export type WeaponId = keyof typeof WEAPON_DEFS;
export const WEAPON_IDS = Object.keys(WEAPON_DEFS) as WeaponId[];

export const UNIQUE_NAMES: Record<string, Partial<Record<ElementId, string>>> = {
  axe: {
    fire: 'Solar Guillotine', water: 'Maelstrom Axes', nature: 'Thorn Orbit',
    earth: 'Stone Cyclone', light: 'Dawn Wheels', darkness: 'Void Orbit',
  },
  hatchet: {
    fire: 'Cinder Hatchets', water: 'Riptide Hatchets', nature: 'Briar Hatchets',
    earth: 'Obsidian Hatchets', light: 'Sunshard Hatchets', darkness: 'Nightcleavers',
  },
  saw: {
    fire: 'Magma Disc', water: 'Tide Saw', nature: 'Bloomsaw',
    earth: 'Quake Blade', light: 'Halo Saw', darkness: 'Umbra Disc',
  },
  aura: {
    fire: 'Inferno Halo', water: 'Abyss Ring', nature: 'Grove Pulse',
    earth: 'Tremor Field', light: 'Radiant Corona', darkness: 'Eclipse Aura',
  },
  dynamite: {
    fire: 'Napalm Charge', water: 'Depth Charge', nature: 'Seedbomb',
    earth: 'Faultline Stick', light: 'Starburst Charge', darkness: 'Void Charge',
  },
  pike: {
    fire: 'Brandlance', water: 'Trident Pike', nature: 'Root Spear',
    earth: 'Earthen Pike', light: 'Lumen Lance', darkness: 'Shadow Pike',
  },
  crossbow: {
    fire: 'Emberbolt', water: 'Frostbolt', nature: 'Thornbolt',
    earth: 'Stonebolt', light: 'Sunbolt', darkness: 'Nightbolt',
  },
  spikes: {
    fire: 'Cinder Spikes', water: 'Ice Caltraps', nature: 'Thorn Ring',
    earth: 'Quill Stones', light: 'Solar Spikes', darkness: 'Umbral Spikes',
  },
  hammerfall: {
    fire: 'Meteor Hammer', water: 'Tidefall', nature: 'Oakcrush',
    earth: 'Mountain Drop', light: 'Judgment Hammer', darkness: 'Abyss Drop',
  },
  longbow: {
    fire: 'Phoenix Bow', water: 'Seabow', nature: 'Worldroot Bow',
    earth: 'Golem Bow', light: 'Astral Bow', darkness: 'Wraith Bow',
  },
  knife: {
    fire: 'Cinder Knives', water: 'Ice Needles', nature: 'Leafblades',
    earth: 'Flint Knives', light: 'Prism Knives', darkness: 'Shade Knives',
  },
  guarddog: {
    fire: 'Hellhound', water: 'Tide Hound', nature: 'Mosswolf',
    earth: 'Stonefang', light: 'Lightfang', darkness: 'Shade Hound',
  },
  chainhook: {
    fire: 'Meteor Flail', water: 'Tide Mace', nature: 'Thorn Flail',
    earth: 'Quake Ball', light: 'Solar Flail', darkness: 'Void Flail',
  },
  trap: {
    fire: 'Cinder Snare', water: 'Frost Snare', nature: 'Root Snare',
    earth: 'Quake Snare', light: 'Solar Snare', darkness: 'Void Snare',
  },
  flashbomb: {
    fire: 'Solar Flare', water: 'Tide Flash', nature: 'Pollen Burst',
    earth: 'Dust Flash', light: 'Nova Flash', darkness: 'Blackout Bomb',
  },
  stormflask: {
    fire: 'Plasma Flask', water: 'Stormglass', nature: 'Thorn Arc',
    earth: 'Fault Spark', light: 'Astral Arc', darkness: 'Void Arc',
  },
  fishingpole: {
    fire: 'Magma Gaff', water: 'Tide Gaff', nature: 'Vine Gaff',
    earth: 'Stone Gaff', light: 'Lumen Gaff', darkness: 'Shade Gaff',
  },
  poisonflask: {
    fire: 'Acid Flask', water: 'Brine Flask', nature: 'Venom Flask',
    earth: 'Mire Flask', light: 'Radiant Toxin', darkness: 'Blight Flask',
  },
};

export interface ElementWeaponStyle {
  metal: string;
  wood: string;
  accent: string;
  glow: string;
  trail: string;
}

/** Paint kit per element for unique weapon visuals. */
export const ELEMENT_WEAPON_STYLE: Record<ElementId, ElementWeaponStyle> = {
  fire: { metal: '#ff8a4a', wood: '#5a2210', accent: '#ffe066', glow: 'rgba(255,106,61,0.55)', trail: '#ff6a3d' },
  water: { metal: '#9ad4ff', wood: '#1e3a55', accent: '#e8f6ff', glow: 'rgba(77,184,255,0.55)', trail: '#4db8ff' },
  nature: { metal: '#8fd98a', wood: '#2a4a1a', accent: '#d4ffc8', glow: 'rgba(109,212,106,0.55)', trail: '#6dd46a' },
  earth: { metal: '#d4b878', wood: '#4a3420', accent: '#f0e0b0', glow: 'rgba(196,163,90,0.55)', trail: '#c4a35a' },
  light: { metal: '#fff3a0', wood: '#6a5a20', accent: '#ffffff', glow: 'rgba(255,230,109,0.6)', trail: '#ffe66d' },
  darkness: { metal: '#b89ae8', wood: '#2a1a3a', accent: '#e0d0ff', glow: 'rgba(155,123,222,0.55)', trail: '#9b7bde' },
};

export type WeaponDrawStyle = {
  metal: string;
  wood: string;
  accent: string;
  glow: string | null;
  trail: string | null;
  unique: boolean;
  scale: number;
};

/** Legacy weaponDrawStyle — paint kit + unique scale for projectile art. */
export function weaponDrawStyle(
  element: ElementId | string | null | undefined,
  unique: boolean,
  flash = false,
): WeaponDrawStyle {
  if (flash) {
    return { metal: '#fff', wood: '#fff', accent: '#fff', glow: null, trail: '#fff', unique: false, scale: 1 };
  }
  // Elemental infusion always paints metal/trail accents; unique also glows + scales up.
  if (element && ELEMENT_WEAPON_STYLE[element as ElementId]) {
    const s = ELEMENT_WEAPON_STYLE[element as ElementId];
    return {
      metal: s.metal,
      wood: s.wood,
      accent: s.accent,
      glow: unique ? s.glow : null,
      trail: s.trail,
      unique,
      scale: unique ? 1.12 : 1,
    };
  }
  return {
    metal: '#c3ced6',
    wood: '#9a6232',
    accent: '#e9eef2',
    glow: null,
    trail: null,
    unique: false,
    scale: 1,
  };
}

/** Legacy hexRgba — convert #rrggbb to rgba() for trail strokes. */
export function hexRgba(hex: string, a: number) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Flat unique-form multipliers applied on top of max-level stats. */
export const UNIQUE_STAT_MULT = {
  dmg: 1.3,
  area: 1.2,
  range: 1.15,
  speed: 1.1,
  cd: 0.85,
  size: 1.18,
  radius: 1.2,
  pierce: 1,
  count: 0,
} as const;

export function uniqueWeaponName(weaponId: string, element: string): string | null {
  const row = UNIQUE_NAMES[weaponId];
  return (row && row[element as ElementId]) || null;
}

/** Apply unique-form multipliers on top of max-level weapon stats. */
export function applyUniqueMults(s: WeaponStats | null | undefined, weaponId: string): WeaponStats {
  if (!s) return {};
  const out: WeaponStats = { ...s };
  if (out.dmg != null) out.dmg = Math.round(out.dmg * UNIQUE_STAT_MULT.dmg);
  if (out.range != null) out.range = Math.round(out.range * UNIQUE_STAT_MULT.range);
  if (out.speed != null && weaponId !== 'axe' && weaponId !== 'chainhook') {
    out.speed = Math.round(out.speed * UNIQUE_STAT_MULT.speed);
  }
  if (out.speed != null && (weaponId === 'axe' || weaponId === 'chainhook')) {
    out.speed *= UNIQUE_STAT_MULT.speed;
  }
  if (out.cd != null) out.cd *= UNIQUE_STAT_MULT.cd;
  if (out.size != null) out.size *= UNIQUE_STAT_MULT.size;
  if (out.radius != null) out.radius = Math.round(out.radius * UNIQUE_STAT_MULT.radius);
  if (out.dist != null) out.dist = Math.round(out.dist * UNIQUE_STAT_MULT.range);
  if (out.len != null) out.len = Math.round(out.len * UNIQUE_STAT_MULT.area);
  if (out.orbit != null) out.orbit = Math.round(out.orbit * UNIQUE_STAT_MULT.area);
  if (out.cone != null) out.cone *= 1.15;
  if (out.pierce != null) out.pierce += 1;
  if (
    out.count != null &&
    (weaponId === 'hatchet' ||
      weaponId === 'knife' ||
      weaponId === 'crossbow' ||
      weaponId === 'trap' ||
      weaponId === 'flashbomb' ||
      weaponId === 'poisonflask' ||
      weaponId === 'fishingpole')
  ) {
    out.count += 1;
  }
  if (out.jumps != null) out.jumps += 1;
  if (out.jumpRange != null) out.jumpRange = Math.round(out.jumpRange * UNIQUE_STAT_MULT.range);
  if (out.stun != null) out.stun *= 1.2;
  if (out.pull != null) out.pull = Math.round(out.pull * 1.15);
  if (out.life != null) out.life *= 1.2;
  if (out.maxArmed != null) out.maxArmed += 2;
  if (out.biteCd != null) out.biteCd *= 0.85;
  if (out.tick != null) out.tick *= 0.85;
  return out;
}
