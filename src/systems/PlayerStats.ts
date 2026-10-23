import { ELEMENT_IDS, type ElementId } from '../data/constants';
import { gearBonuses, type GearItem } from '../data/shop';
import type { MetaBonuses } from '../meta/Meta';
import type { ArsenalSystem } from './ArsenalSystem';
import type { RunPlayer } from '../run/RunTypes';

/** Equip into slot (replaces existing) and recompute stats. */
export function equipItem(
  player: RunPlayer,
  item: GearItem,
  arsenal: ArsenalSystem,
  meta: MetaBonuses,
) {
  player.equipment[item.slot] = item;
  recomputePlayerStats(player, arsenal, meta);
}

/**
 * Legacy `computePlayerStats` — single source of truth for run combat stats.
 * Gear mods must be folded in here; do not overwrite afterward with passives-only values.
 */
export function recomputePlayerStats(player: RunPlayer, arsenal: ArsenalSystem, meta: MetaBonuses) {
  const gear = gearBonuses(player.equipment);
  const lv = (k: string) => arsenal.passives[k] || 0;

  // Base pool, then greed/devil % cut and angel % boost.
  const baseHp =
    100 +
    25 * lv('vitality') +
    10 * Math.max(0, player.level - 1) +
    (gear.maxHp || 0) +
    (meta.maxHp || 0);
  const hpMult = Math.max(
    0.25,
    1 - 0.08 * lv('greed') - 0.1 * lv('devil') + 0.12 * lv('angel'),
  );
  const newMax = Math.max(40, Math.round(baseHp * hpMult));
  arsenal.baseMaxHp = newMax;

  // Legacy: additive might (passives + gear.might + meta.damagePct).
  const baseDmgMult =
    1 +
    0.15 * lv('might') +
    0.12 * lv('devil') -
    0.08 * lv('angel') +
    gear.might +
    (meta.damagePct || 0);
  player.damageMult = baseDmgMult;

  player.flatDamage = (meta.flatDamage || 0) + gear.flatDmg;
  player.elemFlat = meta.elemFlat || 0;
  // Legacy crit: 0.05 base + luck + gear.
  player.crit = 0.05 + arsenal.passiveCrit() + gear.crit;
  player.armor = Math.min(0.6, arsenal.passiveArmor() + gear.armor);

  const baseRegen = (meta.regen || 0) + arsenal.passiveRegen() + gear.regen;
  player.regen = baseRegen;

  const baseMove = 1 + (meta.move || 0) + arsenal.passiveMoveBonus() + gear.move;
  player.moveMult = baseMove;

  // Legacy magnet base 95.
  player.magnetR = 95 * (1 + (meta.magnet || 0) + arsenal.passiveMagnetBonus() + gear.magnet);

  player.gearHaste = gear.haste;
  player.gearArea = gear.area;
  player.gearLifesteal = gear.lifesteal;
  player.gearXpGain = gear.xpGain;
  player.thorns = gear.thorns;
  player.attackElement = gear.element;

  // Legacy: gear elementPower + meta elemPct + elemental mastery passives.
  const elementPower: Partial<Record<ElementId, number>> = {};
  for (const id of ELEMENT_IDS) {
    elementPower[id as ElementId] =
      (gear.elementPower[id as ElementId] || 0) + (meta.elemPct || 0);
  }
  const mastery: Record<string, ElementId> = {
    ember: 'fire',
    tide: 'water',
    bloom: 'nature',
    quake: 'earth',
    radiance: 'light',
    umbra: 'darkness',
  };
  for (const pid in mastery) {
    const el = mastery[pid];
    elementPower[el] = (elementPower[el] || 0) + 0.36 * lv(pid);
  }
  player.elementPower = elementPower;
  player.elementResist = { ...gear.resist };

  if (player.maxHp < newMax) player.hp += newMax - player.maxHp;
  player.maxHp = newMax;
  player.hp = Math.min(player.hp, player.maxHp);

  arsenal.applyPassiveBonuses(player);

  applyBuffMultipliers(player, baseRegen, baseMove, baseDmgMult);
}

export function applyBuffMultipliers(
  player: RunPlayer,
  baseRegen: number,
  baseMove: number,
  baseDmgMult: number,
) {
  if (player.buffFury > 0) player.damageMult = baseDmgMult * 2;
  else player.damageMult = baseDmgMult;
  if (player.buffVital > 0) player.regen = baseRegen * 2;
  else player.regen = baseRegen;
  // Legacy Wind Tonic: moveSpeed × 1.65
  if (player.buffHaste > 0) player.moveMult = baseMove * 1.65;
  else player.moveMult = baseMove;
}
