import { clamp } from '../core/math.ts';

/** Global multiplier — every species' listed aggro is doubled in combat. */
export const AGGRO_RANGE_MULT = 2;

export interface BossCombatOverrides {
  dmg?: number;
  chase?: number;
  aggro?: number;
  windup?: number;
  lungeSpeed?: number;
  lungeTime?: number;
  cooldown?: number;
  range?: number;
  preferRange?: number;
  shotSpeed?: number;
}

export interface SpeciesDef {
  name: string;
  family?: 'boar' | 'wolf' | 'bear';
  radius: number;
  hp: number;
  dmg: number;
  wander: number;
  chase: number;
  aggro: number;
  windup: number;
  lungeSpeed: number;
  lungeTime: number;
  cooldown: number;
  kb: number;
  stagger: boolean;
  meat: [number, number];
  goldChance: number;
  gold: number;
  xp: number;
  height: number;
  bodyOff: number;
  eye: [number, number];
  color: string;
  shade?: string;
  belly?: string;
  blurb?: string;
  flee?: number;
  ranged?: boolean;
  range?: number;
  preferRange?: number;
  shotSpeed?: number;
  shotRadius?: number;
  shotKind?: string;
  shotColor?: string;
  shotSpin?: number;
  shotCount?: number;
  shotSpread?: number;
  bossCombat?: BossCombatOverrides;
}

export const SPECIES: Record<string, SpeciesDef> = {
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

export type SpeciesId = keyof typeof SPECIES;

/** Daytime kill-triggered boss candidates (species id). */
export const DAY_BOSS_SPECIES: SpeciesId[] = [
  'boar', 'wolf', 'bear', 'deer', 'fox', 'squirrel', 'rat', 'raccoon', 'duck', 'sheep', 'beaver',
  'dire_boar', 'dire_wolf', 'dire_bear',
];

export const BOSS_NAMES: Partial<Record<SpeciesId, string>> = {
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

export function animalFamily(species: string): string {
  const sp = SPECIES[species];
  return (sp && sp.family) || species;
}

export function isBearish(species: string): boolean {
  return animalFamily(species) === 'bear';
}

export function isWolfish(species: string): boolean {
  return animalFamily(species) === 'wolf';
}

export function isBoarish(species: string): boolean {
  return animalFamily(species) === 'boar';
}

export function isTinyPest(species: string): boolean {
  return species === 'squirrel' || species === 'duck' || species === 'rat';
}

export type AnimalVariantId = 'basic' | 'dire' | 'necromantic' | 'demonic';

export interface AnimalVariantDef {
  id: AnimalVariantId;
  name: string;
  hp: number;
  dmg: number;
  speed: number;
  xp: number;
  loot: number;
  bar?: string;
  rim?: string;
}

export const ANIMAL_VARIANTS: Record<AnimalVariantId, AnimalVariantDef> = {
  basic: {
    id: 'basic', name: 'Basic',
    hp: 1, dmg: 1, speed: 1, xp: 1, loot: 1,
  },
  dire: {
    id: 'dire', name: 'Dire',
    hp: 1.4, dmg: 1.22, speed: 0.96, xp: 1.35, loot: 1.3,
    bar: '#8a6040',
    rim: 'rgba(42, 24, 10, 0.7)',
  },
  necromantic: {
    id: 'necromantic', name: 'Necromantic',
    hp: 1.35, dmg: 1.12, speed: 0.92, xp: 1.45, loot: 1.28,
    bar: '#6dd4a0',
    rim: 'rgba(90, 230, 150, 0.55)',
  },
  demonic: {
    id: 'demonic', name: 'Demonic',
    hp: 1.55, dmg: 1.38, speed: 1.04, xp: 1.6, loot: 1.45,
    bar: '#ff4a3a',
    rim: 'rgba(255, 55, 30, 0.5)',
  },
};

export const VARIANT_IDS: AnimalVariantId[] = ['basic', 'dire', 'necromantic', 'demonic'];

export interface VariantMult {
  hp: number;
  dmg: number;
  speed: number;
  xp: number;
  loot: number;
}

export function variantMult(variant: string): VariantMult {
  const v = ANIMAL_VARIANTS[variant as AnimalVariantId] || ANIMAL_VARIANTS.basic;
  return { hp: v.hp, dmg: v.dmg, speed: v.speed, xp: v.xp, loot: v.loot };
}

export interface RollAnimalVariantOpts {
  variant?: AnimalVariantId;
  swarm?: boolean;
  boss?: boolean;
  raider?: boolean;
  big?: boolean;
  species?: string;
}

/**
 * Roll an affliction variant. Higher threat → more dire / necro / demonic.
 * Swarms stay mostly basic.
 */
export function rollAnimalVariant(threatM: number, opts: RollAnimalVariantOpts = {}): AnimalVariantId {
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
  if (r < demonicP + necroP + direP) {
    if (opts.species && String(opts.species).startsWith('dire_')) return 'basic';
    return 'dire';
  }
  return 'basic';
}
