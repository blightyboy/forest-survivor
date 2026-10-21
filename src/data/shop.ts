import { ELEMENT_IDS, ELEMENTS, type ElementId } from './constants.ts';

export const ITEM_SLOTS = [
  'mainWeapon', 'offWeapon',
  'head', 'chest', 'shoulders', 'hands', 'belt', 'pants', 'boots',
  'trinket', 'relic', 'leftRing', 'rightRing', 'necklace',
] as const;

export type ItemSlot = typeof ITEM_SLOTS[number];

export const SLOT_LABELS: Record<ItemSlot, string> = {
  mainWeapon: 'Main Weapon', offWeapon: 'Off Weapon',
  head: 'Head', chest: 'Chest', shoulders: 'Shoulders', hands: 'Hands',
  belt: 'Belt', pants: 'Pants', boots: 'Boots',
  trinket: 'Trinket', relic: 'Relic', leftRing: 'Left Ring', rightRing: 'Right Ring',
  necklace: 'Necklace',
};

export const WEAPON_SLOTS = new Set<ItemSlot>(['mainWeapon', 'offWeapon']);
export const ARMOR_SLOTS = new Set<ItemSlot>(['head', 'chest', 'shoulders', 'hands', 'belt', 'pants', 'boots']);
export const ACC_SLOTS = new Set<ItemSlot>(['trinket', 'relic', 'leftRing', 'rightRing', 'necklace']);

export interface ItemQuality {
  id: string;
  name: string;
  mult: number;
  color: string;
  weight: number;
}

/** Gear quality tiers (rarities) for blacksmith stock. */
export const ITEM_QUALITIES: ItemQuality[] = [
  { id: 'poor', name: 'Poor', mult: 0.55, color: '#9a9a9a', weight: 26 },
  { id: 'common', name: 'Common', mult: 1, color: '#e8e8e8', weight: 30 },
  { id: 'uncommon', name: 'Uncommon', mult: 1.4, color: '#6dd46a', weight: 20 },
  { id: 'rare', name: 'Rare', mult: 1.9, color: '#4db8ff', weight: 14 },
  { id: 'epic', name: 'Epic', mult: 2.6, color: '#c46bff', weight: 7 },
  { id: 'legendary', name: 'Legendary', mult: 3.5, color: '#ffb347', weight: 3 },
];

export const WEAPON_PREFIX: Record<ElementId, string[]> = {
  fire: ['Ember', 'Cinder', 'Blazing'], water: ['Tide', 'Frost', 'Torrent'],
  nature: ['Bloom', 'Thorn', 'Verdant'], earth: ['Stone', 'Iron', 'Quake'],
  light: ['Dawn', 'Solar', 'Radiant'], darkness: ['Dusk', 'Void', 'Umbral'],
};

export const WEAPON_BASE = ['Hatchet', 'Cleaver', 'Maul', 'Blade', 'Pick', 'Spike', 'Spear', 'Saber'];

export const ARMOR_NAMES: Partial<Record<ItemSlot, string[]>> = {
  head: ['Cap', 'Helm', 'Hood', 'Circlet', 'Mask'],
  chest: ['Vest', 'Coat', 'Mail', 'Plate', 'Wrap'],
  shoulders: ['Pads', 'Guards', 'Mantle', 'Spaulders'],
  hands: ['Gloves', 'Gauntlets', 'Grips', 'Wraps'],
  belt: ['Belt', 'Sash', 'Cinch', 'Girdle'],
  pants: ['Pants', 'Greaves', 'Leggings', 'Trousers'],
  boots: ['Boots', 'Treads', 'Sabatons', 'Moccasins'],
};

export const ACC_BASE: Partial<Record<ItemSlot, string[]>> = {
  trinket: ['Charm', 'Totem', 'Idol', 'Fossil', 'Fetish'],
  relic: ['Relic', 'Shard', 'Bone', 'Emblem', 'Seal'],
  leftRing: ['Band', 'Loop', 'Signet', 'Coil'],
  rightRing: ['Band', 'Loop', 'Signet', 'Coil'],
  necklace: ['Amulet', 'Pendant', 'Torc', 'Chain', 'Locket'],
};

export const SHOP_REFRESH = 300;

export interface GearMods {
  might?: number;
  flatDmg?: number;
  crit?: number;
  area?: number;
  haste?: number;
  lifesteal?: number;
  armor?: number;
  maxHp?: number;
  regen?: number;
  move?: number;
  thorns?: number;
  magnet?: number;
  xpGain?: number;
  element?: ElementId;
  elementPower?: number;
  resist?: Partial<Record<ElementId, number>>;
}

export interface GearItem {
  id: string;
  slot: ItemSlot;
  quality: string;
  qualityName: string;
  color: string;
  element: ElementId | null;
  name: string;
  desc: string;
  price: Record<string, number>;
  mods: GearMods;
}

export type EquipmentLoadout = Record<ItemSlot, GearItem | null>;

export function emptyEquipment(): EquipmentLoadout {
  const o = {} as EquipmentLoadout;
  for (const s of ITEM_SLOTS) o[s] = null;
  return o;
}

function pickWeighted(list: ItemQuality[], weightKey: keyof ItemQuality, qualityBoost: number): ItemQuality {
  let total = 0;
  const weights = list.map((q) => {
    let w = q[weightKey] as number;
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtPct(v: number) {
  return '+' + Math.round(v * 100) + '%';
}

function fmtNum(v: number, d = 1) {
  return '+' + (Math.round(v * Math.pow(10, d)) / Math.pow(10, d));
}

type ItemFamily = 'weapon' | 'armor' | 'accessory';

/** Rolls a single random modifier suited to the slot family. */
function rollItemMod(family: ItemFamily, m: number): GearMods {
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

export function describeMods(mods: GearMods, element: ElementId | null): string {
  const bits: string[] = [];
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

export interface GenerateItemOpts {
  qualityBoost?: number;
  slot?: ItemSlot;
}

export function generateItem(opts: GenerateItemOpts = {}): GearItem {
  const boost = opts.qualityBoost || 0;
  const q = pickWeighted(ITEM_QUALITIES, 'weight', boost);
  const slot = opts.slot || pick(ITEM_SLOTS as unknown as ItemSlot[]);
  const m = q.mult;
  const family: ItemFamily = WEAPON_SLOTS.has(slot) ? 'weapon' : ARMOR_SLOTS.has(slot) ? 'armor' : 'accessory';
  const item: GearItem = {
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

  const modCount = 1 + (m >= 1.9 ? 1 : 0) + (m >= 2.6 ? 1 : 0) + (Math.random() < 0.2 * Math.min(1, m - 1) ? 1 : 0);
  const mods: GearMods = {};
  for (let i = 0; i < Math.min(4, modCount); i++) {
    const rolled = rollItemMod(family, m);
    for (const k in rolled) {
      const val = rolled[k as keyof GearMods];
      if (typeof val === 'number') {
        const key = k as keyof GearMods;
        (mods[key] as number) = ((mods[key] as number) || 0) + val;
      }
    }
  }

  if (family === 'weapon') {
    item.element = pick(ELEMENT_IDS as unknown as ElementId[]);
    item.name = pick(WEAPON_PREFIX[item.element]) + ' ' + pick(WEAPON_BASE);
    if (!mods.might) mods.might = Math.round((0.08 + 0.07 * m) * 100) / 100;
    mods.elementPower = (mods.elementPower || 0) + Math.round((0.28 + 0.24 * m) * 100) / 100;
    mods.element = item.element;
  } else if (family === 'armor') {
    item.element = Math.random() < 0.55 ? pick(ELEMENT_IDS as unknown as ElementId[]) : null;
    const base = pick(ARMOR_NAMES[slot] || ARMOR_NAMES.chest || ['Wrap']);
    item.name = (item.element ? pick(WEAPON_PREFIX[item.element]) + ' ' : '') + base;
    if (!mods.armor && !mods.maxHp) mods.armor = Math.round((0.03 + 0.03 * m) * 1000) / 1000;
    if (item.element) {
      mods.resist = { [item.element]: Math.round((0.1 + 0.09 * m) * 100) / 100 };
    }
  } else {
    item.element = Math.random() < 0.5 ? pick(ELEMENT_IDS as unknown as ElementId[]) : null;
    const base = pick(ACC_BASE[slot] || ACC_BASE.trinket || ['Charm']);
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

export function refreshShopStock(forgeLevel: number, smithLuck = 0): GearItem[] {
  const boost = Math.max(0, (forgeLevel || 1) - 1) * 0.55 + (smithLuck || 0);
  const count = Math.min(8, 4 + Math.floor((forgeLevel || 1) / 2));
  const used = new Set<ItemSlot>();
  const items: GearItem[] = [];
  for (let i = 0; i < count; i++) {
    let slot: ItemSlot = ITEM_SLOTS[i % ITEM_SLOTS.length];
    if (used.has(slot) || Math.random() < 0.55) slot = pick(ITEM_SLOTS as unknown as ItemSlot[]);
    used.add(slot);
    items.push(generateItem({ slot, qualityBoost: boost }));
  }
  return items;
}

export interface GearBonuses {
  might: number;
  armor: number;
  crit: number;
  move: number;
  regen: number;
  magnet: number;
  area: number;
  maxHp: number;
  flatDmg: number;
  haste: number;
  lifesteal: number;
  thorns: number;
  xpGain: number;
  element: ElementId | null;
  elementPower: Record<ElementId, number>;
  resist: Partial<Record<ElementId, number>>;
}

/** Merges equipped gear into player combat stat bonuses. */
export function gearBonuses(gear: EquipmentLoadout): GearBonuses {
  const out: GearBonuses = {
    might: 0, armor: 0, crit: 0, move: 0, regen: 0, magnet: 0, area: 0,
    maxHp: 0, flatDmg: 0, haste: 0, lifesteal: 0, thorns: 0, xpGain: 0,
    element: null, elementPower: {} as Record<ElementId, number>, resist: {},
  };
  for (const id of ELEMENT_IDS) out.elementPower[id as ElementId] = 0;
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
      for (const k in m.resist) {
        const el = k as ElementId;
        out.resist[el] = (out.resist[el] || 0) + (m.resist[el] || 0);
      }
    }
  }
  return out;
}
