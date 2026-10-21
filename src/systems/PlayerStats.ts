import { clamp } from '../core/math';
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

export function recomputePlayerStats(player: RunPlayer, arsenal: ArsenalSystem, meta: MetaBonuses) {
  const gear = gearBonuses(player.equipment);

  arsenal.baseMaxHp = 100 + (meta.maxHp || 0) + gear.maxHp;
  player.flatDamage = (meta.flatDamage || 0) + gear.flatDmg;
  player.crit = arsenal.passiveCrit() + gear.crit;
  player.armor = clamp(arsenal.passiveArmor() + gear.armor, 0, 0.75);

  const baseRegen = (meta.regen || 0) + arsenal.passiveRegen() + gear.regen;
  player.regen = baseRegen;

  const baseMove = 1 + (meta.move || 0) + arsenal.passiveMoveBonus() + gear.move;
  player.moveMult = baseMove;

  player.magnetR = 90 * (1 + (meta.magnet || 0) + arsenal.passiveMagnetBonus() + gear.magnet);

  const baseDmgMult = (1 + (meta.damagePct || 0)) * arsenal.passiveDamageBonus() * (1 + gear.might);
  player.damageMult = baseDmgMult;

  player.gearHaste = gear.haste;
  player.gearArea = gear.area;
  player.gearLifesteal = gear.lifesteal;
  player.gearXpGain = gear.xpGain;

  const prevMax = player.maxHp;
  arsenal.applyPassiveBonuses(player);
  player.maxHp = Math.max(20, arsenal.baseMaxHp + arsenal.passiveMaxHpBonus());
  player.hp = Math.min(player.maxHp, player.hp + Math.max(0, player.maxHp - prevMax));

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
  if (player.buffHaste > 0) player.moveMult = baseMove * 1.45;
  else player.moveMult = baseMove;
}
