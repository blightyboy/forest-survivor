import { ELEMENT_IDS, MAX_WEAPONS, WEAPON_MAX, type ElementId } from './constants.ts';
import { WEAPON_DEFS } from './weapons.ts';
import { isPassiveUnlocked, isWeaponUnlocked } from './achievements.ts';

export interface PassiveDef {
  name: string;
  desc: string;
  max: number;
}

export const PASSIVE_DEFS: Record<string, PassiveDef> = {
  might: { name: 'Whetstone', desc: '+15% damage', max: 5 },
  haste: { name: 'Strong Coffee', desc: 'Weapons fire 7% faster, axes spin 8% faster', max: 5 },
  area: { name: 'Long Handle', desc: '+10% weapon area and reach', max: 5 },
  speed: { name: 'Logger Boots', desc: '+8% move speed', max: 5 },
  magnet: { name: 'Lodestone', desc: '+35% pickup range', max: 5 },
  vitality: { name: 'Hearty Stew', desc: '+25 max health', max: 5 },
  armor: { name: 'Thick Flannel', desc: 'Take 7% less damage', max: 5 },
  regen: { name: 'Pine Sap', desc: 'Regenerate 0.5 health per second', max: 5 },
  luck: { name: 'Lucky Acorn', desc: '+6% critical hit chance', max: 5 },
  amount: { name: 'Extra Hands', desc: '+1 projectile for every thrown weapon', max: 2 },
  dash: { name: 'Second Wind', desc: '+1 dash charge', max: 3 },
  greed: { name: 'Greed', desc: '-8% max HP, +18% resource & XP drops', max: 5 },
  devil: { name: "Devil's Contract", desc: '-10% max HP, +12% damage', max: 5 },
  angel: { name: "Angel's Blessing", desc: '-8% damage, +12% max HP', max: 5 },
  ember: { name: 'Ember Mastery', desc: '+36% Fire damage (only if you deal Fire)', max: 3 },
  tide: { name: 'Tide Mastery', desc: '+36% Water damage (only if you deal Water)', max: 3 },
  bloom: { name: 'Bloom Mastery', desc: '+36% Nature damage (only if you deal Nature)', max: 3 },
  quake: { name: 'Quake Mastery', desc: '+36% Earth damage (only if you deal Earth)', max: 3 },
  radiance: { name: 'Radiant Mastery', desc: '+36% Light damage (only if you deal Light)', max: 3 },
  umbra: { name: 'Umbral Mastery', desc: '+36% Darkness damage (only if you deal Darkness)', max: 3 },
};

export const ELEMENT_PASSIVES: Record<string, ElementId> = {
  ember: 'fire', tide: 'water', bloom: 'nature', quake: 'earth', radiance: 'light', umbra: 'darkness',
};

export const BONUS_DEFS: Record<string, { name: string; desc: string }> = {
  gold: { name: 'Gold Pouch', desc: 'A pile of gold for the camp' },
  heal: { name: 'Roast Dinner', desc: 'Restore all health' },
};

export type LevelUpCardKind = 'weapon' | 'passive' | 'element' | 'bonus';

export interface LevelUpCard {
  kind: LevelUpCardKind;
  id: string;
  level: number;
  w?: number;
  element?: ElementId;
}

export function cardKey(card: LevelUpCard): string {
  if (card.kind === 'element') return 'element:' + card.id + ':' + card.element;
  return card.kind + ':' + card.id;
}

export interface ArsenalCardState {
  weapons: Record<string, number>;
  weaponOrder: string[];
  weaponElements: Record<string, ElementId | null | undefined>;
  passives: Record<string, number>;
  usedElements: Record<string, boolean>;
}

export type UnlockFilter = {
  /** Meta achievement ids — gates new weapons / risk passives. */
  achievements?: readonly string[];
};

/** Build the weighted pool of level-up card offers (mirrors Arsenal.cardOptions). */
export function buildLevelUpCardPool(
  state: ArsenalCardState,
  banished: Set<string> | null = null,
  unlocks: UnlockFilter | null = null,
): LevelUpCard[] {
  const banned = banished || new Set<string>();
  const ach = unlocks?.achievements || [];
  const pool: LevelUpCard[] = [];
  const push = (card: LevelUpCard) => {
    if (!banned.has(cardKey(card))) pool.push(card);
  };

  const weaponLevel = (id: string) => state.weapons[id] || 0;

  for (const id in WEAPON_DEFS) {
    const l = weaponLevel(id);
    // Already owned: always allow upgrades. New picks need unlock.
    if (l === 0) {
      if (!isWeaponUnlocked(id, ach)) continue;
      if (state.weaponOrder.length < MAX_WEAPONS) push({ kind: 'weapon', id, level: 1, w: 1.15 });
    } else if (l > 0 && l < WEAPON_MAX) {
      push({ kind: 'weapon', id, level: l + 1, w: 1.3 });
    }
  }

  for (const id of state.weaponOrder) {
    if (state.weaponElements[id]) continue;
    for (const el of ELEMENT_IDS) {
      push({ kind: 'element', id, element: el, level: 1, w: 0.55 });
    }
  }

  const used = state.usedElements;
  for (const id in PASSIVE_DEFS) {
    const l = state.passives[id] || 0;
    if (l >= PASSIVE_DEFS[id].max) continue;
    // Already stacked: allow further ranks. New picks need unlock.
    if (l === 0 && !isPassiveUnlocked(id, ach)) continue;
    const needEl = ELEMENT_PASSIVES[id];
    if (needEl && !used[needEl]) continue;
    push({ kind: 'passive', id, level: l + 1, w: 0.85 });
  }

  return pool;
}

/** Pick up to `n` distinct weighted-random cards from the pool. */
export function rollLevelUpCards(
  n: number,
  pool: LevelUpCard[],
  banished: Set<string> | null = null,
): LevelUpCard[] {
  const banned = banished || new Set<string>();
  const work = pool.slice();
  const out: LevelUpCard[] = [];

  while (out.length < n && work.length) {
    let total = 0;
    for (const c of work) total += c.w ?? 1;
    let r = Math.random() * total;
    let i = 0;
    while (i < work.length - 1 && (r -= work[i].w ?? 1) > 0) i++;
    out.push(work.splice(i, 1)[0]);
  }

  if (!out.length) {
    if (!banned.has('bonus:gold')) out.push({ kind: 'bonus', id: 'gold', level: 0 });
    if (!banned.has('bonus:heal') && out.length < n) out.push({ kind: 'bonus', id: 'heal', level: 0 });
  }

  return out;
}

/** Convenience: build pool from arsenal state and roll `n` offers. */
export function levelUpCardOptions(
  n: number,
  state: ArsenalCardState,
  banished: Set<string> | null = null,
  unlocks: UnlockFilter | null = null,
): LevelUpCard[] {
  return rollLevelUpCards(n, buildLevelUpCardPool(state, banished, unlocks), banished);
}
