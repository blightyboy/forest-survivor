'use strict';

const META_STORAGE_KEY = 'jungleSurvival_meta_v1';

function metaSnapshot(meta) {
  return {
    credits: meta.credits,
    levels: meta.levels,
    runs: meta.runs,
    bestDay: meta.bestDay,
    totalCreditsEarned: meta.totalCreditsEarned,
  };
}

function readMetaRaw() {
  if (typeof window !== 'undefined' && window.jungleSave) {
    try {
      const fileData = window.jungleSave.load();
      if (fileData && typeof fileData === 'object') return fileData;
    } catch (_) { /* fall through */ }
    // First Electron launch: migrate an old browser save if present.
    try {
      const legacy = localStorage.getItem(META_STORAGE_KEY);
      if (legacy) {
        const data = JSON.parse(legacy);
        window.jungleSave.save(data);
        return data;
      }
    } catch (_) { /* ignore */ }
    return null;
  }
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeMetaRaw(data) {
  if (typeof window !== 'undefined' && window.jungleSave) {
    try {
      window.jungleSave.save(data);
      return;
    } catch (_) { /* fall through to localStorage */ }
  }
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* quota / private mode */ }
}

/**
 * Permanent account upgrades bought with credits earned from runs.
 * `apply(level)` returns the bonus contribution for that upgrade's level.
 */
const META_UPGRADES = [
  { id: 'health', name: 'Vitality', desc: '+15 max health', max: 20, baseCost: 35, growth: 1.32,
    apply: (n) => ({ maxHp: 15 * n }) },
  { id: 'regen', name: 'Recovery', desc: '+0.25 HP/s', max: 15, baseCost: 45, growth: 1.35,
    apply: (n) => ({ regen: 0.25 * n }) },
  { id: 'move', name: 'Swift Feet', desc: '+4% move speed', max: 15, baseCost: 40, growth: 1.34,
    apply: (n) => ({ move: 0.04 * n }) },
  { id: 'magnet', name: 'Attraction', desc: '+12% pickup range', max: 12, baseCost: 35, growth: 1.33,
    apply: (n) => ({ magnet: 0.12 * n }) },
  { id: 'rerolls', name: 'Fortune', desc: '+1 card reroll per run', max: 10, baseCost: 55, growth: 1.4,
    apply: (n) => ({ rerolls: n }) },
  { id: 'banishes', name: 'Exile', desc: '+1 card banish per run', max: 10, baseCost: 55, growth: 1.4,
    apply: (n) => ({ banishes: n }) },
  { id: 'flatDmg', name: 'Sharpened Edge', desc: '+2 flat damage', max: 20, baseCost: 45, growth: 1.35,
    apply: (n) => ({ flatDamage: 2 * n }) },
  { id: 'dmgPct', name: 'Brutal Force', desc: '+4% damage', max: 20, baseCost: 50, growth: 1.36,
    apply: (n) => ({ damagePct: 0.04 * n }) },
  { id: 'elemFlat', name: 'Elemental Core', desc: '+1.5 elemental flat damage', max: 15, baseCost: 50, growth: 1.36,
    apply: (n) => ({ elemFlat: 1.5 * n }) },
  { id: 'elemPct', name: 'Elemental Surge', desc: '+5% elemental damage', max: 15, baseCost: 55, growth: 1.38,
    apply: (n) => ({ elemPct: 0.05 * n }) },
  { id: 'income', name: 'Industry', desc: '+8% building income', max: 15, baseCost: 45, growth: 1.35,
    apply: (n) => ({ income: 0.08 * n }) },
  { id: 'wallHp', name: 'Reinforced Walls', desc: '+10% wall HP', max: 15, baseCost: 40, growth: 1.34,
    apply: (n) => ({ wallHp: 0.1 * n }) },
  { id: 'towerDmg', name: 'Ballistics', desc: '+8% tower damage', max: 15, baseCost: 45, growth: 1.35,
    apply: (n) => ({ towerDmg: 0.08 * n }) },
  { id: 'campHeal', name: 'Warmth', desc: '+10% campfire heal', max: 12, baseCost: 35, growth: 1.33,
    apply: (n) => ({ campHeal: 0.1 * n }) },
  { id: 'smithLuck', name: 'Master Smith', desc: '+8% better blacksmith stock', max: 12, baseCost: 65, growth: 1.42,
    apply: (n) => ({ smithLuck: 0.08 * n }) },
];

const META_BY_ID = Object.fromEntries(META_UPGRADES.map((u) => [u.id, u]));

function emptyMetaLevels() {
  const levels = {};
  for (const u of META_UPGRADES) levels[u.id] = 0;
  return levels;
}

function metaUpgradeCost(def, level) {
  return Math.max(1, Math.round(def.baseCost * Math.pow(def.growth, level)));
}

function computeMetaBonuses(levels) {
  const out = {
    maxHp: 0, regen: 0, move: 0, magnet: 0,
    rerolls: 0, banishes: 0,
    flatDamage: 0, damagePct: 0, elemFlat: 0, elemPct: 0,
    income: 0, wallHp: 0, towerDmg: 0, campHeal: 0, smithLuck: 0,
  };
  for (const u of META_UPGRADES) {
    const n = levels[u.id] || 0;
    if (n <= 0) continue;
    const part = u.apply(n);
    for (const k in part) out[k] = (out[k] || 0) + part[k];
  }
  return out;
}

/** Credits awarded at the end of a run. */
function calcRunCredits(stats) {
  const day = stats.day || 1;
  const level = stats.level || 1;
  const kills = stats.kills || 0;
  const raids = stats.raids || 0;
  const bosses = stats.bosses || 0;
  const time = stats.time || 0;
  const raw = day * 10 + level * 4 + kills * 0.2 + raids * 15 + bosses * 40 + time / 8;
  return Math.max(5, Math.floor(raw));
}

class MetaProgress {
  constructor() {
    this.credits = 0;
    this.levels = emptyMetaLevels();
    this.runs = 0;
    this.bestDay = 0;
    this.totalCreditsEarned = 0;
    this.load();
  }

  load() {
    try {
      const data = readMetaRaw();
      if (!data) return;
      this.credits = Math.max(0, data.credits | 0);
      this.runs = Math.max(0, data.runs | 0);
      this.bestDay = Math.max(0, data.bestDay | 0);
      this.totalCreditsEarned = Math.max(0, data.totalCreditsEarned | 0);
      const levels = emptyMetaLevels();
      if (data.levels && typeof data.levels === 'object') {
        for (const u of META_UPGRADES) {
          levels[u.id] = clamp(data.levels[u.id] | 0, 0, u.max);
        }
      }
      this.levels = levels;
    } catch (_) { /* ignore corrupt save */ }
  }

  save() {
    // Preserve settings / other keys already stored in the save file.
    const existing = readMetaRaw() || {};
    writeMetaRaw(Object.assign({}, existing, metaSnapshot(this)));
  }

  bonuses() { return computeMetaBonuses(this.levels); }

  costOf(id) {
    const def = META_BY_ID[id];
    if (!def) return Infinity;
    const lv = this.levels[id] || 0;
    if (lv >= def.max) return Infinity;
    return metaUpgradeCost(def, lv);
  }

  canBuy(id) {
    const def = META_BY_ID[id];
    if (!def) return false;
    const lv = this.levels[id] || 0;
    if (lv >= def.max) return false;
    return this.credits >= this.costOf(id);
  }

  buy(id) {
    if (!this.canBuy(id)) return false;
    const cost = this.costOf(id);
    this.credits -= cost;
    this.levels[id] = (this.levels[id] || 0) + 1;
    this.save();
    return true;
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

  /** Record a finished run and grant credits. Returns credits earned. */
  completeRun(stats) {
    const earned = calcRunCredits(stats);
    this.credits += earned;
    this.totalCreditsEarned += earned;
    this.runs++;
    this.bestDay = Math.max(this.bestDay, stats.day || 1);
    this.save();
    return earned;
  }
}
