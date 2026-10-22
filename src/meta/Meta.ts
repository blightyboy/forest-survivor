import { clamp } from '../core/math';

const META_STORAGE_KEY = 'forestSurvivor_meta_v1';
/** Pre-rename key — migrate once so older Electron installs keep progress. */
const LEGACY_META_STORAGE_KEY = 'jungleSurvival_meta_v1';

function metaSnapshot(meta: MetaProgress) {
  return {
    credits: meta.credits,
    levels: meta.levels,
    runs: meta.runs,
    bestDay: meta.bestDay,
    totalCreditsEarned: meta.totalCreditsEarned,
  };
}

function readMetaRaw(): Record<string, unknown> | null {
  if (typeof window !== 'undefined' && window.forestSave) {
    try {
      const fileData = window.forestSave.load();
      if (fileData && typeof fileData === 'object') return fileData;
    } catch {
      /* fall through */
    }
    try {
      const legacy = localStorage.getItem(META_STORAGE_KEY);
      if (legacy) {
        const data = JSON.parse(legacy) as Record<string, unknown>;
        window.forestSave.save(data);
        return data;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
  try {
    const raw =
      localStorage.getItem(META_STORAGE_KEY) || localStorage.getItem(LEGACY_META_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    // Promote legacy key when found.
    if (!localStorage.getItem(META_STORAGE_KEY) && localStorage.getItem(LEGACY_META_STORAGE_KEY)) {
      try {
        localStorage.setItem(META_STORAGE_KEY, raw);
      } catch {
        /* ignore */
      }
    }
    return data;
  } catch {
    return null;
  }
}

function writeMetaRaw(data: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.forestSave) {
    try {
      window.forestSave.save(data);
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export type MetaBonuses = {
  maxHp: number;
  regen: number;
  move: number;
  magnet: number;
  rerolls: number;
  banishes: number;
  flatDamage: number;
  damagePct: number;
  elemFlat: number;
  elemPct: number;
  income: number;
  wallHp: number;
  towerDmg: number;
  campHeal: number;
  smithLuck: number;
};

export const META_UPGRADES = [
  { id: 'health', name: 'Vitality', desc: '+15 max health', max: 20, baseCost: 35, growth: 1.32,
    apply: (n: number) => ({ maxHp: 15 * n }) },
  { id: 'regen', name: 'Recovery', desc: '+0.25 HP/s', max: 15, baseCost: 45, growth: 1.35,
    apply: (n: number) => ({ regen: 0.25 * n }) },
  { id: 'move', name: 'Swift Feet', desc: '+4% move speed', max: 15, baseCost: 40, growth: 1.34,
    apply: (n: number) => ({ move: 0.04 * n }) },
  { id: 'magnet', name: 'Attraction', desc: '+12% pickup range', max: 12, baseCost: 35, growth: 1.33,
    apply: (n: number) => ({ magnet: 0.12 * n }) },
  { id: 'rerolls', name: 'Fortune', desc: '+1 card reroll per run', max: 10, baseCost: 55, growth: 1.4,
    apply: (n: number) => ({ rerolls: n }) },
  { id: 'banishes', name: 'Exile', desc: '+1 card banish per run', max: 10, baseCost: 55, growth: 1.4,
    apply: (n: number) => ({ banishes: n }) },
  { id: 'flatDmg', name: 'Sharpened Edge', desc: '+2 flat damage', max: 20, baseCost: 45, growth: 1.35,
    apply: (n: number) => ({ flatDamage: 2 * n }) },
  { id: 'dmgPct', name: 'Brutal Force', desc: '+4% damage', max: 20, baseCost: 50, growth: 1.36,
    apply: (n: number) => ({ damagePct: 0.04 * n }) },
  { id: 'elemFlat', name: 'Elemental Core', desc: '+1.5 elemental flat damage', max: 15, baseCost: 50, growth: 1.36,
    apply: (n: number) => ({ elemFlat: 1.5 * n }) },
  { id: 'elemPct', name: 'Elemental Surge', desc: '+5% elemental damage', max: 15, baseCost: 55, growth: 1.38,
    apply: (n: number) => ({ elemPct: 0.05 * n }) },
  { id: 'income', name: 'Industry', desc: '+8% building income', max: 15, baseCost: 45, growth: 1.35,
    apply: (n: number) => ({ income: 0.08 * n }) },
  { id: 'wallHp', name: 'Reinforced Walls', desc: '+10% wall HP', max: 15, baseCost: 40, growth: 1.34,
    apply: (n: number) => ({ wallHp: 0.1 * n }) },
  { id: 'towerDmg', name: 'Ballistics', desc: '+8% tower damage', max: 15, baseCost: 45, growth: 1.35,
    apply: (n: number) => ({ towerDmg: 0.08 * n }) },
  { id: 'campHeal', name: 'Warmth', desc: '+10% campfire heal', max: 12, baseCost: 35, growth: 1.33,
    apply: (n: number) => ({ campHeal: 0.1 * n }) },
  { id: 'smithLuck', name: 'Master Smith', desc: '+8% better blacksmith stock', max: 12, baseCost: 65, growth: 1.42,
    apply: (n: number) => ({ smithLuck: 0.08 * n }) },
] as const;

export type MetaUpgradeId = (typeof META_UPGRADES)[number]['id'];

const META_BY_ID = Object.fromEntries(META_UPGRADES.map((u) => [u.id, u])) as Record<
  MetaUpgradeId,
  (typeof META_UPGRADES)[number]
>;

function emptyMetaLevels(): Record<MetaUpgradeId, number> {
  const levels = {} as Record<MetaUpgradeId, number>;
  for (const u of META_UPGRADES) levels[u.id] = 0;
  return levels;
}

export function metaUpgradeCost(def: (typeof META_UPGRADES)[number], level: number) {
  return Math.max(1, Math.round(def.baseCost * Math.pow(def.growth, level)));
}

export function computeMetaBonuses(levels: Record<string, number>): MetaBonuses {
  const out: MetaBonuses = {
    maxHp: 0, regen: 0, move: 0, magnet: 0,
    rerolls: 0, banishes: 0,
    flatDamage: 0, damagePct: 0, elemFlat: 0, elemPct: 0,
    income: 0, wallHp: 0, towerDmg: 0, campHeal: 0, smithLuck: 0,
  };
  for (const u of META_UPGRADES) {
    const n = levels[u.id] || 0;
    if (n <= 0) continue;
    const part = u.apply(n) as Partial<MetaBonuses>;
    for (const k in part) {
      const key = k as keyof MetaBonuses;
      out[key] = (out[key] || 0) + (part[key] || 0);
    }
  }
  return out;
}

export type RunCreditStats = {
  day?: number;
  level?: number;
  kills?: number;
  raids?: number;
  bosses?: number;
  time?: number;
  /** Trees felled during the run. */
  trees?: number;
  /** Lifetime resources collected (not ending inventory). */
  wood?: number;
  meat?: number;
  gold?: number;
  /** Cabin upgrade level (`camp` structure). */
  campLevel?: number;
  /** Number of camp upgrades purchased. */
  campUpgrades?: number;
  /** Sum of all camp structure levels (development). */
  campDev?: number;
};

/**
 * Credits awarded at the end of a run.
 * Weights survival (day/time), combat (kills/raids/bosses), foraging (trees/resources),
 * and fortification (cabin level + camp development).
 */
export function calcRunCredits(stats: RunCreditStats) {
  const day = Math.max(1, stats.day || 1);
  const level = Math.max(1, stats.level || 1);
  const kills = Math.max(0, stats.kills || 0);
  const raids = Math.max(0, stats.raids || 0);
  const bosses = Math.max(0, stats.bosses || 0);
  const time = Math.max(0, stats.time || 0);
  const trees = Math.max(0, stats.trees || 0);
  const wood = Math.max(0, stats.wood || 0);
  const meat = Math.max(0, stats.meat || 0);
  const gold = Math.max(0, stats.gold || 0);
  const campLevel = Math.max(0, stats.campLevel || 0);
  const campUpgrades = Math.max(0, stats.campUpgrades || 0);
  const campDev = Math.max(0, stats.campDev ?? campUpgrades);

  // Soft-scale resource piles so long farms reward effort without exploding payouts.
  const resourceScore =
    Math.sqrt(wood) * 1.15 + Math.sqrt(meat) * 1.55 + Math.sqrt(gold) * 2.35;

  const raw =
    day * 12 +
    level * 5 +
    time / 10 +
    kills * 0.28 +
    trees * 0.4 +
    resourceScore +
    raids * 18 +
    bosses * 45 +
    campLevel * 10 +
    campDev * 2.5 +
    campUpgrades * 1.5;

  return Math.max(8, Math.floor(raw));
}

export class MetaProgress {
  credits = 0;
  levels: Record<MetaUpgradeId, number> = emptyMetaLevels();
  runs = 0;
  bestDay = 0;
  totalCreditsEarned = 0;

  constructor() {
    this.load();
  }

  load() {
    try {
      const data = readMetaRaw();
      if (!data) return;
      this.credits = Math.max(0, (data.credits as number) | 0);
      this.runs = Math.max(0, (data.runs as number) | 0);
      this.bestDay = Math.max(0, (data.bestDay as number) | 0);
      this.totalCreditsEarned = Math.max(0, (data.totalCreditsEarned as number) | 0);
      const levels = emptyMetaLevels();
      const saved = data.levels as Record<string, number> | undefined;
      if (saved && typeof saved === 'object') {
        for (const u of META_UPGRADES) {
          levels[u.id] = clamp(saved[u.id] | 0, 0, u.max);
        }
      }
      this.levels = levels;
    } catch {
      /* corrupt */
    }
  }

  save() {
    const existing = readMetaRaw() || {};
    writeMetaRaw({ ...existing, ...metaSnapshot(this) });
  }

  bonuses() {
    return computeMetaBonuses(this.levels);
  }

  costOf(id: MetaUpgradeId) {
    const def = META_BY_ID[id];
    if (!def) return Infinity;
    const lv = this.levels[id] || 0;
    if (lv >= def.max) return Infinity;
    return metaUpgradeCost(def, lv);
  }

  canBuy(id: MetaUpgradeId) {
    const def = META_BY_ID[id];
    if (!def) return false;
    const lv = this.levels[id] || 0;
    if (lv >= def.max) return false;
    return this.credits >= this.costOf(id);
  }

  buy(id: MetaUpgradeId) {
    return buyMetaUpgrade(this, id);
  }

  /** Total credits spent on the current permanent upgrade levels. */
  spentOnUpgrades() {
    let total = 0;
    for (const u of META_UPGRADES) {
      const lv = this.levels[u.id] || 0;
      for (let i = 0; i < lv; i++) total += metaUpgradeCost(u, i);
    }
    return total;
  }

  /**
   * Reset every permanent upgrade and refund all credits spent.
   * Returns the amount refunded (0 if nothing to refund).
   */
  refundAll() {
    const refund = this.spentOnUpgrades();
    if (refund <= 0) return 0;
    this.credits += refund;
    this.levels = emptyMetaLevels();
    this.save();
    return refund;
  }

  completeRun(stats: Parameters<typeof calcRunCredits>[0]) {
    return recordRunEnd(this, stats);
  }
}

export function buyMetaUpgrade(meta: MetaProgress, id: MetaUpgradeId): boolean {
  if (!meta.canBuy(id)) return false;
  const cost = meta.costOf(id);
  meta.credits -= cost;
  meta.levels[id] = (meta.levels[id] || 0) + 1;
  meta.save();
  return true;
}

export function recordRunEnd(
  meta: MetaProgress,
  stats: Parameters<typeof calcRunCredits>[0],
): number {
  const earned = calcRunCredits(stats);
  meta.credits += earned;
  meta.totalCreditsEarned += earned;
  meta.runs++;
  meta.bestDay = Math.max(meta.bestDay, stats.day || 1);
  meta.save();
  return earned;
}

export const meta = new MetaProgress();
