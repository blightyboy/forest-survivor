import type { ElementId } from '../data/constants';
import type { GearItem, EquipmentLoadout } from '../data/shop';

export type PickupKind = 'xp' | 'wood' | 'meat' | 'gold' | 'heart' | 'powerup';

export interface RunPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  xp: number;
  wood: number;
  meat: number;
  gold: number;
  /** Lifetime tallies for end-of-run credits (not current inventory). */
  treesChopped: number;
  woodCollected: number;
  meatCollected: number;
  goldCollected: number;
  campUpgrades: number;
  kills: number;
  bosses: number;
  raidsSurvived: number;
  aimAngle: number;
  alive: boolean;
  dashCharges: number;
  dashMax: number;
  dashCd: number;
  dashCdMax: number;
  /** Active dash lunge timer (legacy dashT). */
  dashT: number;
  invuln: number;
  /** Player slow from enemy gloom / breath (0–1). */
  slow: number;
  slowT: number;
  /** Nature poison DoT stacks from enemy abilities. */
  poisons: { dps: number; life: number }[];
  magnetR: number;
  damageMult: number;
  flatDamage: number;
  moveMult: number;
  armor: number;
  regen: number;
  crit: number;
  rerollsLeft: number;
  banishesLeft: number;
  equipment: EquipmentLoadout;
  gearHaste?: number;
  gearArea?: number;
  gearLifesteal?: number;
  gearXpGain?: number;
  /** Flat reflect damage on being hit (legacy ps.thorns). */
  thorns?: number;
  /** Meta elemental flat added when attack has an element. */
  elemFlat?: number;
  /** Attack element from gear (legacy ps.attackElement) — mainWeapon first. */
  attackElement: ElementId | null;
  /** Per-element damage bonuses from gear + meta + mastery. */
  elementPower: Partial<Record<ElementId, number>>;
  /** Per-element damage resist from gear. */
  elementResist: Partial<Record<ElementId, number>>;
  buffFury: number;
  buffVital: number;
  buffHaste: number;
  /** Crimson Charm — slain foes may drop healing hearts. */
  buffHearts: number;
  /** Accrues fractional poison damage for tick feedback (legacy poisonAcc). */
  poisonAcc?: number;
  /** Accrues fractional fire-pool DoT for tick feedback. */
  burnAcc?: number;
  /** Seconds left showing "Burn" debuff while standing in a damage pool. */
  burnT?: number;
}

export interface RunStats {
  runTime: number;
  day: number;
  level: number;
  kills: number;
  raids: number;
  bosses: number;
}

/** Apply a resource gain and tally it for end-of-run credits. */
export function gainResource(
  player: RunPlayer,
  kind: 'wood' | 'meat' | 'gold',
  amount: number,
) {
  const n = Math.max(0, Math.round(amount));
  if (n <= 0) return;
  player[kind] += n;
  if (kind === 'wood') player.woodCollected += n;
  else if (kind === 'meat') player.meatCollected += n;
  else player.goldCollected += n;
}

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  amount: number;
  vx: number;
  vy: number;
  /** Bounce height (legacy-style hop, not world fall). */
  z: number;
  vz: number;
  age: number;
  rot: number;
  phase: number;
  dead: boolean;
  /** POWERUPS id when kind === 'powerup' */
  powerupId?: string;
  magnet?: boolean;
  speed?: number;
}

export interface FirePool {
  x: number;
  y: number;
  r: number;
  dmg: number;
  life: number;
  dead: boolean;
  /** burn hurts player; poison / enemyOnly only hurts beasts. */
  kind?: 'burn' | 'poison';
  /** Hex tint for ground VFX (poison ooze, etc.). */
  color?: string;
}

export type RunCallbacks = {
  onLevelUp: () => void;
  onPlayerDeath: () => void;
  onRaid: () => void;
  spendResources: (cost: Record<string, number>) => boolean;
  addResource: (kind: 'wood' | 'meat' | 'gold', n: number) => void;
  healPlayer: (n: number) => void;
  fullHeal: () => void;
  getShopItem: (index: number) => GearItem | null;
  buyShopItem: (index: number) => boolean;
};
