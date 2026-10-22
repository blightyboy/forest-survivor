import { clamp } from '../core/math';

export const WORLD_SIZE = 4800;
export const WORLD_SEED = 20261020;
export const WORLD_MARGIN = 100;
export const DAY_LENGTH = 160;
export const PHASE_DUSK = 0.6;
export const PHASE_NIGHT = 0.68;
export const PHASE_DAWN = 0.95;
export const CLOCK_OFFSET = DAY_LENGTH * 0.05;
export const NIGHT_DARKNESS = 0.8;
export const RAID_DISTANCE = 1050;
export const HIT_COOLDOWN = 0.3;
export const MAX_PICKUPS = 160;
/** Opening calm — wildlife won't hunt the player until struck or the timer ends. */
export const START_GRACE = 30;
export const WEAPON_MAX = 8;
export const MAX_WEAPONS = 5;
export const STAR_MAX = 15;
export const STAR_TIER_SIZE = 5;
/** Per-rank bonuses stacked on enemy base stats (legacy elements.js). */
export const STAR_HP = 0.17;
export const STAR_DMG = 0.11;
export const STAR_SPEED = 0.028;
export const STAR_XP = 0.55;
/** Per-star loot multiplier contribution (legacy STAR_LOOT). */
export const STAR_LOOT = 0.32;

export type StarTier = 'bronze' | 'silver' | 'gold';

export const RES_LABEL: Record<string, string> = { wood: 'Wood', meat: 'Meat', gold: 'Gold' };

export function xpNeeded(level: number) {
  return Math.round(10 * Math.pow(1.24, level - 1));
}

export function threatAt(time: number) {
  const m = time / 60;
  return {
    m,
    hp: (1 + 0.4 * m) * Math.pow(1.09, m),
    dmg: (1 + 0.16 * m) * Math.pow(1.035, m),
    speed: Math.min(1.5, 1 + 0.02 * m),
  };
}

export function compassName(angle: number) {
  const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  const i = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  return names[i];
}

export type UpgradeDef = {
  id: string;
  kind: string;
  name: string;
  desc: string;
  base: Record<string, number>;
  growth: number;
  max: number;
  value: (s: any) => string;
  requires?: (L: Record<string, number>) => boolean;
  reqText?: string;
};

export const UPGRADES: UpgradeDef[] = [
  { id: 'camp', kind: 'base', name: 'Camp', desc: 'Sturdier cabin. Passively yields wood, meat and gold', base: { wood: 18, meat: 6, gold: 4 }, growth: 1.65, max: 12,
    value: (s) => s.campHp + ' HP  ' + s.campWood + 'w ' + s.campMeat + 'm ' + s.campGold + 'g' },
  { id: 'walls', kind: 'base', name: 'Palisade', desc: 'Square wall that stops raiders', base: { wood: 22, meat: 5, gold: 2 }, growth: 1.55, max: 12,
    value: (s) => (s.wallHp ? s.wallHp + ' HP' : 'None') },
  { id: 'towers', kind: 'base', name: 'Watchtower', desc: 'Archer tower that shoots threats', base: { wood: 24, meat: 7, gold: 7 }, growth: 1.55, max: 8,
    value: (s) => s.towerCount + '/8 built' },
  { id: 'archers', kind: 'base', name: 'Archers', desc: 'Tower arrow damage & range', base: { wood: 8, meat: 10, gold: 6 }, growth: 1.45, max: 15,
    value: (s) => s.arrowDmg + ' dmg · ' + Math.round(s.towerRange) + ' rng',
    requires: (L) => L.towers > 0, reqText: 'Build a tower first' },
  { id: 'barrage', kind: 'base', name: 'Barrage', desc: 'Tower fire rate', base: { wood: 12, meat: 8, gold: 8 }, growth: 1.5, max: 12,
    value: (s) => s.fireRate.toFixed(1) + '/s',
    requires: (L) => L.towers > 0, reqText: 'Build a tower first' },
  { id: 'volley', kind: 'base', name: 'Volley', desc: 'Each tower shoots more targets at once', base: { wood: 16, meat: 10, gold: 10 }, growth: 1.65, max: 5,
    value: (s) => s.towerTargets + ' target' + (s.towerTargets > 1 ? 's' : ''),
    requires: (L) => L.towers > 0, reqText: 'Build a tower first' },
  { id: 'campfire', kind: 'base', name: 'Campfire', desc: 'Heals you inside the camp', base: { wood: 10, meat: 8, gold: 2 }, growth: 1.55, max: 6,
    value: (s) => s.healRate.toFixed(1) + ' HP/s' },
  { id: 'mill', kind: 'base', name: 'Lumber Mill', desc: 'Cuts lumber every 10s', base: { wood: 12, meat: 10, gold: 8 }, growth: 1.55, max: 12,
    value: (s) => (s.millWood ? s.millWood + ' wood' : 'None') },
  { id: 'mine', kind: 'base', name: 'Gold Mine', desc: 'Digs gold every 10s', base: { wood: 30, meat: 10, gold: 3 }, growth: 1.55, max: 12,
    value: (s) => (s.mineGold ? s.mineGold + ' gold' : 'None') },
  { id: 'butcher', kind: 'base', name: 'Butcher', desc: 'Prepares meat every 10s', base: { wood: 24, meat: 3, gold: 7 }, growth: 1.5, max: 12,
    value: (s) => (s.butcherMeat ? s.butcherMeat + ' meat' : 'None') },
  { id: 'blacksmith', kind: 'base', name: 'Blacksmith', desc: 'Sells random gear. Stock refreshes every 5 min', base: { wood: 40, meat: 12, gold: 18 }, growth: 1.7, max: 6,
    value: (s) => (s.forgeLevel ? 'Forge Lv ' + s.forgeLevel + ' · better stock' : 'Closed') },
];

export function computeStats(L: Record<string, number>, meta: Record<string, number> = {}) {
  const income = 1 + (meta.income || 0);
  const wallM = 1 + (meta.wallHp || 0);
  const towerM = 1 + (meta.towerDmg || 0);
  const healM = 1 + (meta.campHeal || 0);
  const scaleInc = (n: number) => (n > 0 ? Math.max(1, Math.round(n * income)) : 0);
  return {
    campHp: Math.round((300 + 200 * L.camp) * Math.pow(1.12, L.camp)),
    wallHp: L.walls ? Math.round(90 * L.walls * Math.pow(1.16, L.walls - 1) * wallM) : 0,
    towerCount: L.towers,
    arrowDmg: Math.round((14 + 7 * L.archers) * Math.pow(1.09, L.archers) * towerM),
    fireRate: 0.85 + 0.22 * (L.barrage || 0) + 0.04 * L.archers,
    towerRange: 360 + 16 * L.archers,
    towerTargets: 1 + (L.volley || 0),
    healRate: (2 + 2.5 * L.campfire) * healM,
    lightR: 250 + 28 * L.campfire,
    millWood: scaleInc(L.mill ? 3 + 6 * L.mill : 0),
    mineGold: scaleInc(L.mine ? 1 + 3 * L.mine : 0),
    butcherMeat: scaleInc(L.butcher ? 1 + 2 * L.butcher : 0),
    forgeLevel: L.blacksmith || 0,
    campWood: scaleInc(1 + 2 * L.camp),
    campMeat: scaleInc(L.camp),
    campGold: scaleInc(Math.floor((L.camp + 1) / 2)),
    smithLuck: meta.smithLuck || 0,
  };
}

export function upgradeCost(def: UpgradeDef, level: number) {
  const cost: Record<string, number> = {};
  for (const k in def.base) {
    const v = def.base[k] * Math.pow(def.growth, level);
    if (v >= 1) cost[k] = Math.round(v);
  }
  return cost;
}

export const POWERUPS: Record<string, { name: string; label: string; color: string; desc: string; duration: number; weight: number }> = {
  magnet: { name: 'Lodestone Surge', label: 'Magnet', color: '#ff6b6b', desc: 'Vacuum every drop on the map', duration: 0, weight: 18 },
  fury: { name: 'Fury Flask', label: '2× Damage', color: '#ff8a3d', desc: 'Double weapon damage', duration: 14, weight: 26 },
  vital: { name: 'Vital Sap', label: '2× Regen', color: '#9ef08a', desc: 'Double health regeneration', duration: 14, weight: 22 },
  haste: { name: 'Wind Tonic', label: 'Speed', color: '#7fd3ff', desc: 'Greatly increased move speed', duration: 12, weight: 26 },
  hearts: {
    name: 'Crimson Charm',
    label: 'Hearts',
    color: '#ff5a7a',
    desc: 'Slain foes may drop hearts that heal 10% max HP',
    duration: 22,
    weight: 20,
  },
  nuke: { name: 'Cataclysm Orb', label: 'Nuke', color: '#ffe066', desc: 'Fell every tree and beast (not bosses); vacuum all drops', duration: 0, weight: 2.2 },
};

export const ELEMENT_IDS = ['fire', 'water', 'nature', 'earth', 'light', 'darkness'] as const;
export type ElementId = typeof ELEMENT_IDS[number];

export const ELEMENTS: Record<string, { id: string; name: string; color: string; glow: string; opposite: string }> = {
  fire: { id: 'fire', name: 'Fire', color: '#ff6a3d', glow: 'rgba(255,106,61,0.55)', opposite: 'water' },
  water: { id: 'water', name: 'Water', color: '#4db8ff', glow: 'rgba(77,184,255,0.55)', opposite: 'fire' },
  nature: { id: 'nature', name: 'Nature', color: '#6dd46a', glow: 'rgba(109,212,106,0.55)', opposite: 'earth' },
  earth: { id: 'earth', name: 'Earth', color: '#c4a35a', glow: 'rgba(196,163,90,0.55)', opposite: 'nature' },
  light: { id: 'light', name: 'Light', color: '#ffe66d', glow: 'rgba(255,230,109,0.55)', opposite: 'darkness' },
  darkness: { id: 'darkness', name: 'Darkness', color: '#9b7bde', glow: 'rgba(155,123,222,0.55)', opposite: 'light' },
};

/** Weapon infusion cards — one element per weapon. Effects stack and scale with damage. */
export const ELEMENT_INFUSE: Record<ElementId, { name: string; effect: string }> = {
  fire: { name: 'Ember Infusion', effect: 'Burns enemies (DoT scales with damage)' },
  water: { name: 'Tide Infusion', effect: 'Slows enemies (strength scales with damage)' },
  nature: { name: 'Bloom Infusion', effect: 'Heal on kill (scales with damage)' },
  earth: { name: 'Quake Infusion', effect: 'On kill: AoE for 10% of damage dealt' },
  light: { name: 'Radiant Infusion', effect: '2% chance on kill: permanently raise max HP' },
  darkness: { name: 'Umbral Infusion', effect: '2% chance on kill: permanently raise damage' },
};

/** Legacy affinity: strong opposite 1.55, same-element resist 0.65. */
export function elementMult(atk: string | null, def: string | null) {
  if (!atk || !def || !ELEMENTS[atk] || !ELEMENTS[def]) return 1;
  if (ELEMENTS[atk].opposite === def) return 1.55;
  if (atk === def) return 0.65;
  return 1;
}

/** True boss every 3rd night (nights 3, 6, 9…). Nights 1–2 are miniboss. */
export function isBossNight(day: number) {
  return day > 0 && day % 3 === 0;
}

export function starTierInfo(stars: number): {
  tier: StarTier | null;
  count: number;
  fill: string | null;
  stroke: string | null;
} {
  const n = clamp(stars | 0, 0, STAR_MAX);
  if (n <= 0) return { tier: null, count: 0, fill: null, stroke: null };
  if (n <= STAR_TIER_SIZE) {
    return { tier: 'bronze', count: n, fill: '#c47a3a', stroke: '#5a3010' };
  }
  if (n <= STAR_TIER_SIZE * 2) {
    return { tier: 'silver', count: n - STAR_TIER_SIZE, fill: '#d8dee8', stroke: '#4a5568' };
  }
  return { tier: 'gold', count: n - STAR_TIER_SIZE * 2, fill: '#ffe066', stroke: '#8a5d00' };
}

export function starMult(stars: number) {
  const n = clamp(stars | 0, 0, STAR_MAX);
  return {
    hp: 1 + n * STAR_HP,
    dmg: 1 + n * STAR_DMG,
    speed: 1 + n * STAR_SPEED,
    xp: 1 + n * STAR_XP,
    loot: 1 + n * STAR_LOOT,
  };
}

/** Roll 0–15 veterancy ranks from threat (legacy rollStars). */
export function rollStars(
  threatM: number,
  opts: { boss?: boolean; big?: boolean; raider?: boolean; swarm?: boolean; passive?: boolean } = {},
) {
  if (opts.passive) return 0;
  const m = Math.max(0, threatM || 0);
  let bias = m * 0.85 + (opts.boss ? 2.8 : 0) + (opts.big ? 0.7 : 0) + (opts.raider ? 0.55 : 0);
  if (opts.swarm) bias *= 0.4;

  let max: number;
  if (opts.swarm) {
    max = Math.min(STAR_TIER_SIZE, 1 + Math.floor(m / 3.5));
  } else if (opts.boss) {
    max = Math.min(STAR_MAX, 3 + Math.floor(m / 1.15));
  } else {
    max = Math.min(STAR_MAX, 1 + Math.floor(m / 0.95));
  }

  let stars = 0;
  for (let s = 1; s <= max; s++) {
    const tierPenalty = s <= 5 ? 0 : s <= 10 ? 0.04 : 0.07;
    const chance = clamp(
      0.15 + bias * 0.095 - s * (0.055 - Math.min(0.03, m * 0.002)) - tierPenalty,
      0.03,
      0.8,
    );
    if (Math.random() < chance) stars = s;
    else break;
  }

  if (opts.boss) {
    stars = Math.max(stars, Math.min(STAR_MAX, 2 + Math.floor(m / 1.9)));
  }
  if (!opts.boss && !opts.swarm && m >= 8 && stars === 0 && Math.random() < clamp((m - 8) * 0.08, 0, 0.55)) {
    stars = 1;
  }
  if (!opts.boss && !opts.swarm && m >= 14 && stars < 4 && Math.random() < clamp((m - 14) * 0.06, 0, 0.45)) {
    stars = Math.max(stars, 4);
  }
  return clamp(stars, 0, STAR_MAX);
}

/** Roll an elemental affinity for enemies (legacy rollEnemyElement). */
export function rollEnemyElement(opts: {
  boss?: boolean;
  raider?: boolean;
  swarm?: boolean;
  passive?: boolean;
  threatM?: number;
} = {}): ElementId | null {
  if (opts.passive && Math.random() > 0.35) return null;
  if (opts.swarm && Math.random() > 0.55) return null;
  if (!opts.boss && !opts.raider && Math.random() > 0.42 + Math.min(0.35, (opts.threatM || 0) * 0.04)) {
    return null;
  }
  return ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)];
}
