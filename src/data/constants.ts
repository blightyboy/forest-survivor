export const WORLD_SIZE = 4800;
export const WORLD_SEED = 20261020;
export const WORLD_MARGIN = 100;
export const DAY_LENGTH = 160;
export const PHASE_DUSK = 0.6;
export const PHASE_NIGHT = 0.68;
export const PHASE_DAWN = 0.95;
export const CLOCK_OFFSET = DAY_LENGTH * 0.05;
export const NIGHT_DARKNESS = 0.75;
export const RAID_DISTANCE = 1050;
export const HIT_COOLDOWN = 0.3;
export const MAX_PICKUPS = 160;
export const WEAPON_MAX = 8;
export const MAX_WEAPONS = 5;
export const STAR_MAX = 15;
export const STAR_LOOT = 0.08;

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

export function elementMult(atk: string | null, def: string | null) {
  if (!atk || !def) return 1;
  if (ELEMENTS[atk]?.opposite === def) return 1.35;
  if (ELEMENTS[def]?.opposite === atk) return 0.7;
  if (atk === def) return 0.85;
  return 1;
}
