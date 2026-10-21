'use strict';

/**
 * Opposing pairs: fire↔water, nature↔earth, light↔darkness.
 * Hitting an opposite deals bonus damage; hitting the same element resists.
 */
const ELEMENTS = {
  fire: { id: 'fire', name: 'Fire', color: '#ff6a3d', glow: 'rgba(255,106,61,0.55)', opposite: 'water' },
  water: { id: 'water', name: 'Water', color: '#4db8ff', glow: 'rgba(77,184,255,0.55)', opposite: 'fire' },
  nature: { id: 'nature', name: 'Nature', color: '#6dd46a', glow: 'rgba(109,212,106,0.55)', opposite: 'earth' },
  earth: { id: 'earth', name: 'Earth', color: '#c4a35a', glow: 'rgba(196,163,90,0.55)', opposite: 'nature' },
  light: { id: 'light', name: 'Light', color: '#ffe66d', glow: 'rgba(255,230,109,0.55)', opposite: 'darkness' },
  darkness: { id: 'darkness', name: 'Darkness', color: '#9b7bde', glow: 'rgba(155,123,222,0.55)', opposite: 'light' },
};

const ELEMENT_IDS = Object.keys(ELEMENTS);

const AFFINITY_STRONG = 1.55;
const AFFINITY_WEAK = 0.65;

function elementMult(atk, def) {
  if (!atk || !def || !ELEMENTS[atk] || !ELEMENTS[def]) return 1;
  if (ELEMENTS[atk].opposite === def) return AFFINITY_STRONG;
  if (atk === def) return AFFINITY_WEAK;
  return 1;
}

/** Weapon infusion cards — one element per weapon. Effects stack and scale with damage. */
const ELEMENT_INFUSE = {
  fire: { name: 'Ember Infusion', effect: 'Burns enemies (DoT scales with damage)' },
  water: { name: 'Tide Infusion', effect: 'Slows enemies (strength scales with damage)' },
  nature: { name: 'Bloom Infusion', effect: 'Heal on kill (scales with damage)' },
  earth: { name: 'Quake Infusion', effect: 'On kill: AoE for 10% of damage dealt' },
  light: { name: 'Radiant Infusion', effect: '2% chance on kill: permanently raise max HP' },
  darkness: { name: 'Umbral Infusion', effect: '2% chance on kill: permanently raise damage' },
};

/** Apply on-hit elemental status. Burn/slow stack and scale with `dealt`. */
function applyElementOnHit(a, element, dealt, game) {
  if (!a || a.dead || !element || dealt < 1) return;
  if (element === 'fire') {
    a.burns.push({ dps: (dealt * 0.4) / 3, life: 3 });
    if (a.burns.length > 12) a.burns.splice(0, a.burns.length - 12);
  } else if (element === 'water') {
    const add = clamp(dealt / (dealt + 60) * 0.4, 0.08, 0.4);
    a.slow = clamp(a.slow + add, 0, 0.7);
    a.slowT = Math.max(a.slowT, 1.1 + dealt / 120);
  }
}

/** On-kill procs for nature / earth / light / darkness. */
function applyElementOnKill(a, element, dealt, game, weaponId) {
  if (!element || dealt < 1 || !game.player.alive) return;
  const p = game.player;
  if (element === 'nature') {
    const heal = Math.max(1, Math.round(dealt * 0.08));
    p.hp = Math.min(p.maxHp, p.hp + heal);
    game.addText(p.x, p.y - 50, '+' + heal, '#6dd46a', 14, { life: 0.8, vy: -28 });
    game.fx.sparkle(p.x, p.y, '#9ef08a');
  } else if (element === 'earth') {
    const aoe = Math.max(1, Math.round(dealt * 0.1));
    const r = 95;
    const q = game._q;
    q.length = 0;
    game.animalGrid.query(a.x, a.y, r + 40, q);
    for (let i = 0; i < q.length; i++) {
      const t = q[i];
      if (t.dead || t === a) continue;
      const rr = r + t.radius * 0.5;
      if (dist2(a.x, a.y, t.x, t.y) < rr * rr) {
        game.hitAnimal(t, aoe, a.x, a.y, 0.6, false, weaponId, { noProc: true, flat: true, element: 'earth' });
      }
    }
    game.fx.ring(a.x, a.y, 'rgba(196,163,90,0.85)', 18, r, 0.35);
    game.fx.dust(a.x, a.y, 8);
  } else if (element === 'light') {
    if (Math.random() < 0.02) {
      const gain = Math.max(1, Math.round(dealt * 0.05));
      game.permBonus.maxHp += gain;
      game.syncPlayerStats();
      game.addText(p.x, p.y - 70, '+' + gain + ' Max HP', '#ffe66d', 16, { life: 1.2, vy: -30 });
      game.fx.sparkle(p.x, p.y, '#ffe66d');
      Sound.play('upgrade', 1.2);
    }
  } else if (element === 'darkness') {
    if (Math.random() < 0.02) {
      const gain = Math.max(1, Math.round(dealt * 0.05));
      game.permBonus.damage += gain;
      game.addText(p.x, p.y - 70, '+' + gain + ' Dmg', '#9b7bde', 16, { life: 1.2, vy: -30 });
      game.fx.sparkle(p.x, p.y, '#9b7bde');
      Sound.play('upgrade', 1.2);
    }
  }
}

/**
 * Veterancy ranks 0–15:
 *   1–5   bronze ★
 *   6–10  silver ★
 *   11–15 gold ★
 * Display shows only the current tier's 1–5 stars (color = tier).
 */
const STAR_MAX = 15;
const STAR_TIER_SIZE = 5;

/** Per-rank bonuses stacked on enemy base stats (tuned for 15 ranks). */
const STAR_HP = 0.17;
const STAR_DMG = 0.11;
const STAR_SPEED = 0.028;
const STAR_XP = 0.55;
const STAR_LOOT = 0.32;

const STAR_TIER_STYLE = {
  bronze: { fill: '#c47a3a', stroke: '#5a3010' },
  silver: { fill: '#d8dee8', stroke: '#4a5568' },
  gold: { fill: '#ffe066', stroke: '#8a5d00' },
};

/** @returns {{ tier: 'bronze'|'silver'|'gold'|null, count: number, fill: string|null, stroke: string|null }} */
function starTierInfo(stars) {
  const n = clamp(stars | 0, 0, STAR_MAX);
  if (n <= 0) return { tier: null, count: 0, fill: null, stroke: null };
  if (n <= STAR_TIER_SIZE) {
    const s = STAR_TIER_STYLE.bronze;
    return { tier: 'bronze', count: n, fill: s.fill, stroke: s.stroke };
  }
  if (n <= STAR_TIER_SIZE * 2) {
    const s = STAR_TIER_STYLE.silver;
    return { tier: 'silver', count: n - STAR_TIER_SIZE, fill: s.fill, stroke: s.stroke };
  }
  const s = STAR_TIER_STYLE.gold;
  return { tier: 'gold', count: n - STAR_TIER_SIZE * 2, fill: s.fill, stroke: s.stroke };
}

/**
 * Roll 0–15 veterancy ranks. Threat unlocks higher caps:
 *   early     bronze (1–5)
 *   mid       silver (6–10)
 *   late      gold (11–15)
 * Swarms stay in bronze.
 */
function rollStars(threatM, opts = {}) {
  if (opts.passive) return 0;
  const m = Math.max(0, threatM || 0);
  let bias = m * 0.85 + (opts.boss ? 2.8 : 0) + (opts.big ? 0.7 : 0) + (opts.raider ? 0.55 : 0);
  if (opts.swarm) bias *= 0.4;

  let max;
  if (opts.swarm) {
    max = Math.min(STAR_TIER_SIZE, 1 + Math.floor(m / 3.5));
  } else if (opts.boss) {
    // Bosses reach silver earlier and can hit gold late.
    max = Math.min(STAR_MAX, 3 + Math.floor(m / 1.15));
  } else {
    // Ambient: bronze early, silver ~6–8m, gold ~12m+.
    max = Math.min(STAR_MAX, 1 + Math.floor(m / 0.95));
  }

  let stars = 0;
  for (let s = 1; s <= max; s++) {
    // Higher ranks (esp. silver/gold) stay rarer; threat softens the cliff.
    const tierPenalty = s <= 5 ? 0 : s <= 10 ? 0.04 : 0.07;
    const chance = clamp(
      0.15 + bias * 0.095 - s * (0.055 - Math.min(0.03, m * 0.002)) - tierPenalty,
      0.03,
      0.8
    );
    if (Math.random() < chance) stars = s;
    else break;
  }

  if (opts.boss) {
    stars = Math.max(stars, Math.min(STAR_MAX, 2 + Math.floor(m / 1.9)));
  }
  // Late-game floor: after ~8 minutes, ambient packs often carry at least 1★ bronze.
  if (!opts.boss && !opts.swarm && m >= 8 && stars === 0 && Math.random() < clamp((m - 8) * 0.08, 0, 0.55)) {
    stars = 1;
  }
  // Mid-late floor: after ~14 minutes, often at least mid-bronze / start of silver.
  if (!opts.boss && !opts.swarm && m >= 14 && stars < 4 && Math.random() < clamp((m - 14) * 0.06, 0, 0.45)) {
    stars = Math.max(stars, 4);
  }
  return clamp(stars, 0, STAR_MAX);
}

function rollEnemyElement(opts = {}) {
  if (opts.passive && Math.random() > 0.35) return null;
  if (opts.swarm && Math.random() > 0.55) return null;
  if (!opts.boss && !opts.raider && Math.random() > 0.42 + Math.min(0.35, (opts.threatM || 0) * 0.04)) return null;
  return ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)];
}

function starMult(stars) {
  const n = clamp(stars | 0, 0, STAR_MAX);
  return {
    hp: 1 + n * STAR_HP,
    dmg: 1 + n * STAR_DMG,
    speed: 1 + n * STAR_SPEED,
    xp: 1 + n * STAR_XP,
    loot: 1 + n * STAR_LOOT,
  };
}

// ===========================================================================
// Items / blacksmith stock
// ===========================================================================

const ITEM_SLOTS = [
  'mainWeapon', 'offWeapon',
  'head', 'chest', 'shoulders', 'hands', 'belt', 'pants', 'boots',
  'trinket', 'relic', 'leftRing', 'rightRing', 'necklace',
];

const SLOT_LABELS = {
  mainWeapon: 'Main Weapon', offWeapon: 'Off Weapon',
  head: 'Head', chest: 'Chest', shoulders: 'Shoulders', hands: 'Hands',
  belt: 'Belt', pants: 'Pants', boots: 'Boots',
  trinket: 'Trinket', relic: 'Relic', leftRing: 'Left Ring', rightRing: 'Right Ring',
  necklace: 'Necklace',
};

const WEAPON_SLOTS = new Set(['mainWeapon', 'offWeapon']);
const ARMOR_SLOTS = new Set(['head', 'chest', 'shoulders', 'hands', 'belt', 'pants', 'boots']);
const ACC_SLOTS = new Set(['trinket', 'relic', 'leftRing', 'rightRing', 'necklace']);

const ITEM_QUALITIES = [
  { id: 'poor', name: 'Poor', mult: 0.55, color: '#9a9a9a', weight: 26 },
  { id: 'common', name: 'Common', mult: 1, color: '#e8e8e8', weight: 30 },
  { id: 'uncommon', name: 'Uncommon', mult: 1.4, color: '#6dd46a', weight: 20 },
  { id: 'rare', name: 'Rare', mult: 1.9, color: '#4db8ff', weight: 14 },
  { id: 'epic', name: 'Epic', mult: 2.6, color: '#c46bff', weight: 7 },
  { id: 'legendary', name: 'Legendary', mult: 3.5, color: '#ffb347', weight: 3 },
];

const WEAPON_PREFIX = {
  fire: ['Ember', 'Cinder', 'Blazing'], water: ['Tide', 'Frost', 'Torrent'],
  nature: ['Bloom', 'Thorn', 'Verdant'], earth: ['Stone', 'Iron', 'Quake'],
  light: ['Dawn', 'Solar', 'Radiant'], darkness: ['Dusk', 'Void', 'Umbral'],
};
const WEAPON_BASE = ['Hatchet', 'Cleaver', 'Maul', 'Blade', 'Pick', 'Spike', 'Spear', 'Saber'];
const ARMOR_NAMES = {
  head: ['Cap', 'Helm', 'Hood', 'Circlet', 'Mask'],
  chest: ['Vest', 'Coat', 'Mail', 'Plate', 'Wrap'],
  shoulders: ['Pads', 'Guards', 'Mantle', 'Spaulders'],
  hands: ['Gloves', 'Gauntlets', 'Grips', 'Wraps'],
  belt: ['Belt', 'Sash', 'Cinch', 'Girdle'],
  pants: ['Pants', 'Greaves', 'Leggings', 'Trousers'],
  boots: ['Boots', 'Treads', 'Sabatons', 'Moccasins'],
};
const ACC_BASE = {
  trinket: ['Charm', 'Totem', 'Idol', 'Fossil', 'Fetish'],
  relic: ['Relic', 'Shard', 'Bone', 'Emblem', 'Seal'],
  leftRing: ['Band', 'Loop', 'Signet', 'Coil'],
  rightRing: ['Band', 'Loop', 'Signet', 'Coil'],
  necklace: ['Amulet', 'Pendant', 'Torc', 'Chain', 'Locket'],
};

const SHOP_REFRESH = 300;

function emptyEquipment() {
  const o = {};
  for (const s of ITEM_SLOTS) o[s] = null;
  return o;
}

function pickWeighted(list, weightKey, qualityBoost) {
  let total = 0;
  const weights = list.map((q) => {
    let w = q[weightKey];
    if (qualityBoost && q.mult > 1) w *= 1 + qualityBoost * (q.mult - 1);
    if (qualityBoost && q.mult < 1) w *= Math.max(0.25, 1 - qualityBoost * 0.35);
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function fmtPct(v) { return '+' + Math.round(v * 100) + '%'; }
function fmtNum(v, d = 1) { return '+' + (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)); }

/** Rolls a single random modifier suited to the slot family. */
function rollItemMod(family, m) {
  const r = Math.random();
  if (family === 'weapon') {
    if (r < 0.28) return { might: Math.round((0.07 + 0.07 * m) * 100) / 100 };
    if (r < 0.48) return { flatDmg: Math.round((2 + 3 * m) * 10) / 10 };
    if (r < 0.62) return { crit: Math.round((0.03 + 0.035 * m) * 1000) / 1000 };
    if (r < 0.74) return { area: Math.round((0.06 + 0.07 * m) * 100) / 100 };
    if (r < 0.86) return { haste: Math.round((0.04 + 0.04 * m) * 1000) / 1000 };
    return { lifesteal: Math.round((0.02 + 0.025 * m) * 1000) / 1000 };
  }
  if (family === 'armor') {
    if (r < 0.3) return { armor: Math.round((0.025 + 0.03 * m) * 1000) / 1000 };
    if (r < 0.5) return { maxHp: Math.round(8 + 10 * m) };
    if (r < 0.65) return { regen: Math.round((0.15 + 0.2 * m) * 10) / 10 };
    if (r < 0.78) return { move: Math.round((0.03 + 0.035 * m) * 1000) / 1000 };
    if (r < 0.9) return { thorns: Math.round((1.5 + 2 * m) * 10) / 10 };
    return { magnet: Math.round((0.08 + 0.1 * m) * 100) / 100 };
  }
  // accessory
  if (r < 0.14) return { crit: Math.round((0.035 + 0.04 * m) * 1000) / 1000 };
  if (r < 0.28) return { move: Math.round((0.04 + 0.045 * m) * 1000) / 1000 };
  if (r < 0.42) return { regen: Math.round((0.18 + 0.22 * m) * 10) / 10 };
  if (r < 0.54) return { magnet: Math.round((0.1 + 0.12 * m) * 100) / 100 };
  if (r < 0.64) return { area: Math.round((0.07 + 0.08 * m) * 100) / 100 };
  if (r < 0.74) return { might: Math.round((0.05 + 0.05 * m) * 100) / 100 };
  if (r < 0.84) return { maxHp: Math.round(6 + 8 * m) };
  if (r < 0.92) return { flatDmg: Math.round((1.5 + 2.5 * m) * 10) / 10 };
  return { xpGain: Math.round((0.06 + 0.07 * m) * 100) / 100 };
}

function describeMods(mods, element) {
  const bits = [];
  if (mods.might) bits.push(fmtPct(mods.might) + ' dmg');
  if (mods.flatDmg) bits.push(fmtNum(mods.flatDmg) + ' flat dmg');
  if (mods.armor) bits.push(fmtPct(mods.armor) + ' armor');
  if (mods.maxHp) bits.push(fmtNum(mods.maxHp, 0) + ' HP');
  if (mods.crit) bits.push(fmtPct(mods.crit) + ' crit');
  if (mods.move) bits.push(fmtPct(mods.move) + ' move');
  if (mods.regen) bits.push(fmtNum(mods.regen) + ' HP/s');
  if (mods.magnet) bits.push(fmtPct(mods.magnet) + ' magnet');
  if (mods.area) bits.push(fmtPct(mods.area) + ' area');
  if (mods.haste) bits.push(fmtPct(mods.haste) + ' attack speed');
  if (mods.lifesteal) bits.push(fmtPct(mods.lifesteal) + ' lifesteal');
  if (mods.thorns) bits.push(fmtNum(mods.thorns) + ' thorns');
  if (mods.xpGain) bits.push(fmtPct(mods.xpGain) + ' XP');
  if (mods.elementPower && element && ELEMENTS[element]) {
    bits.push(fmtPct(mods.elementPower) + ' ' + ELEMENTS[element].name);
  }
  if (mods.resist && element && ELEMENTS[element]) {
    bits.push('resist ' + ELEMENTS[element].name);
  }
  return bits.join(', ');
}

function generateItem(opts = {}) {
  const boost = opts.qualityBoost || 0;
  const q = pickWeighted(ITEM_QUALITIES, 'weight', boost);
  const slot = opts.slot || pick(ITEM_SLOTS);
  const m = q.mult;
  const family = WEAPON_SLOTS.has(slot) ? 'weapon' : ARMOR_SLOTS.has(slot) ? 'armor' : 'accessory';
  const item = {
    id: 'i' + Math.floor(Math.random() * 1e9).toString(36),
    slot,
    quality: q.id,
    qualityName: q.name,
    color: q.color,
    element: null,
    name: '',
    desc: '',
    price: {},
    mods: {},
  };

  // Extra modifiers on better quality (legendary can roll 3).
  const modCount = 1 + (m >= 1.9 ? 1 : 0) + (m >= 2.6 ? 1 : 0) + (Math.random() < 0.2 * Math.min(1, m - 1) ? 1 : 0);
  const mods = {};
  for (let i = 0; i < Math.min(4, modCount); i++) {
    const rolled = rollItemMod(family, m);
    for (const k in rolled) {
      if (typeof rolled[k] === 'number') mods[k] = (mods[k] || 0) + rolled[k];
    }
  }

  if (family === 'weapon') {
    item.element = pick(ELEMENT_IDS);
    item.name = pick(WEAPON_PREFIX[item.element]) + ' ' + pick(WEAPON_BASE);
    if (!mods.might) mods.might = Math.round((0.08 + 0.07 * m) * 100) / 100;
    mods.elementPower = (mods.elementPower || 0) + Math.round((0.28 + 0.24 * m) * 100) / 100;
    mods.element = item.element;
  } else if (family === 'armor') {
    item.element = Math.random() < 0.55 ? pick(ELEMENT_IDS) : null;
    const base = pick(ARMOR_NAMES[slot] || ARMOR_NAMES.chest);
    item.name = (item.element ? pick(WEAPON_PREFIX[item.element]) + ' ' : '') + base;
    if (!mods.armor && !mods.maxHp) mods.armor = Math.round((0.03 + 0.03 * m) * 1000) / 1000;
    if (item.element) {
      mods.resist = { [item.element]: Math.round((0.1 + 0.09 * m) * 100) / 100 };
    }
  } else {
    item.element = Math.random() < 0.5 ? pick(ELEMENT_IDS) : null;
    const base = pick(ACC_BASE[slot] || ACC_BASE.trinket);
    item.name = (item.element ? pick(WEAPON_PREFIX[item.element]) + ' ' : '') + base;
    if (item.element) {
      mods.elementPower = (mods.elementPower || 0) + Math.round((0.16 + 0.18 * m) * 100) / 100;
      mods.element = item.element;
    }
  }

  item.mods = mods;
  item.desc = describeMods(mods, item.element);

  const slotMult = family === 'weapon' ? 1.2 : family === 'armor' ? 1.05 : 0.95;
  const gold = Math.max(3, Math.round((7 + 12 * m + modCount * 3) * slotMult));
  const wood = Math.random() < 0.5 ? Math.round(3 + 5 * m) : 0;
  const meat = Math.random() < 0.38 ? Math.round(2 + 4 * m) : 0;
  item.price = { gold };
  if (wood) item.price.wood = wood;
  if (meat) item.price.meat = meat;
  return item;
}

function refreshShopStock(forgeLevel, smithLuck = 0) {
  const boost = Math.max(0, (forgeLevel || 1) - 1) * 0.55 + (smithLuck || 0);
  const count = Math.min(8, 4 + Math.floor((forgeLevel || 1) / 2));
  const used = new Set();
  const items = [];
  for (let i = 0; i < count; i++) {
    let slot = ITEM_SLOTS[i % ITEM_SLOTS.length];
    if (used.has(slot) || Math.random() < 0.55) slot = pick(ITEM_SLOTS);
    used.add(slot);
    items.push(generateItem({ slot, qualityBoost: boost }));
  }
  return items;
}

/** Merges equipped gear into player combat stats. */
function gearBonuses(gear) {
  const out = {
    might: 0, armor: 0, crit: 0, move: 0, regen: 0, magnet: 0, area: 0,
    maxHp: 0, flatDmg: 0, haste: 0, lifesteal: 0, thorns: 0, xpGain: 0,
    element: null, elementPower: {}, resist: {},
  };
  for (const id of ELEMENT_IDS) out.elementPower[id] = 0;
  for (const slot of ITEM_SLOTS) {
    const it = gear[slot];
    if (!it) continue;
    const m = it.mods || {};
    if (m.might) out.might += m.might;
    if (m.armor) out.armor += m.armor;
    if (m.crit) out.crit += m.crit;
    if (m.move) out.move += m.move;
    if (m.regen) out.regen += m.regen;
    if (m.magnet) out.magnet += m.magnet;
    if (m.area) out.area += m.area;
    if (m.maxHp) out.maxHp += m.maxHp;
    if (m.flatDmg) out.flatDmg += m.flatDmg;
    if (m.haste) out.haste += m.haste;
    if (m.lifesteal) out.lifesteal += m.lifesteal;
    if (m.thorns) out.thorns += m.thorns;
    if (m.xpGain) out.xpGain += m.xpGain;
    if (m.element) {
      if (slot === 'mainWeapon') out.element = m.element;
      else if (!out.element) out.element = m.element;
    }
    if (m.elementPower && m.element) out.elementPower[m.element] += m.elementPower;
    if (m.resist) {
      for (const k in m.resist) out.resist[k] = (out.resist[k] || 0) + m.resist[k];
    }
  }
  return out;
}

function drawStars(ctx, x, y, stars) {
  const info = starTierInfo(stars);
  if (!info.count) return;
  const gap = 7;
  const start = x - ((info.count - 1) * gap) / 2;
  for (let i = 0; i < info.count; i++) {
    const sx = start + i * gap;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      const r = p % 2 === 0 ? 3.3 : 1.4;
      const px = sx + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = info.fill;
    ctx.fill();
    ctx.strokeStyle = info.stroke;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Silver / gold get a small highlight so tiers read clearly at a glance.
    if (info.tier !== 'bronze') {
      ctx.fillStyle = info.tier === 'gold' ? 'rgba(255,255,220,0.55)' : 'rgba(255,255,255,0.45)';
      ellipse(ctx, sx - 0.6, y - 0.8, 1.1, 0.9);
      ctx.fill();
    }
  }
}

class GearShop {
  constructor() {
    this.equipped = emptyEquipment();
    this.stock = [];
    this.refreshIn = 0;
    this.version = 0;
    this.built = false;
    this.smithLuck = 0;
    this.rerolls = 0;
  }

  reset() {
    this.equipped = emptyEquipment();
    this.stock = [];
    this.refreshIn = 0;
    this.version = 0;
    this.built = false;
    this.smithLuck = 0;
    this.rerolls = 0;
  }

  onBuilt(forgeLevel, smithLuck = 0) {
    this.built = true;
    this.smithLuck = smithLuck || 0;
    this.restock(forgeLevel, true);
  }

  /** Gold cost for the next paid stock reroll (scales up with each use). */
  rerollCost() {
    return Math.max(6, Math.round(8 * Math.pow(1.55, this.rerolls)));
  }

  restock(forgeLevel, resetTimer = true) {
    this.stock = refreshShopStock(forgeLevel || 1, this.smithLuck);
    if (resetTimer) {
      this.refreshIn = SHOP_REFRESH;
      this.rerolls = 0;
    }
    this.version++;
  }

  update(dt, forgeLevel) {
    if (!this.built) return;
    this.refreshIn -= dt;
    if (this.refreshIn <= 0) this.restock(forgeLevel, true);
  }

  setSmithLuck(v) {
    this.smithLuck = v || 0;
  }

  bonuses() { return gearBonuses(this.equipped); }

  /** Pay gold to refresh stock immediately. Cost rises until the free timer restocks. */
  reroll(game) {
    if (!this.built || !game.atCamp()) return false;
    const cost = this.rerollCost();
    if ((game.res.gold || 0) < cost) return false;
    game.res.gold -= cost;
    game.resVersion++;
    this.rerolls++;
    this.restock(game.stats.forgeLevel, false);
    game.addText(game.player.x, game.player.y - 64, 'Forge rerolled (−' + cost + 'g)', '#ffe066', 15, { life: 1.1 });
    Sound.play('upgrade');
    return true;
  }

  buy(index, game) {
    const item = this.stock[index];
    if (!item || !this.built) return false;
    if (!game.atCamp()) return false;
    if (!game.canAfford(item.price)) return false;
    for (const k in item.price) game.res[k] -= item.price[k];
    game.resVersion++;
    this.equipped[item.slot] = item;
    this.stock[index] = null;
    this.version++;
    game.syncPlayerStats();
    game.addText(game.player.x, game.player.y - 60, item.name, item.color, 16, { life: 1.2 });
    Sound.play('upgrade');
    return true;
  }
}

function drawElementOrb(ctx, x, y, element) {
  if (!element || !ELEMENTS[element]) return;
  const el = ELEMENTS[element];
  ctx.fillStyle = el.glow;
  ellipse(ctx, x, y, 5.5, 5.5); ctx.fill();
  ctx.fillStyle = el.color;
  ellipse(ctx, x, y, 3.2, 3.2); ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();
}
