import type { ElementId } from '../data/constants';
import type { GearItem, EquipmentLoadout } from '../data/shop';

export type PickupKind = 'xp' | 'wood' | 'meat' | 'gold' | 'powerup';

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
  kills: number;
  bosses: number;
  raidsSurvived: number;
  aimAngle: number;
  alive: boolean;
  dashCharges: number;
  dashCd: number;
  dashBoost: number;
  invuln: number;
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
  buffFury: number;
  buffVital: number;
  buffHaste: number;
}

export interface RunStats {
  runTime: number;
  day: number;
  level: number;
  kills: number;
  raids: number;
  bosses: number;
}

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  amount: number;
  vx: number;
  vy: number;
  dead: boolean;
  /** POWERUPS id when kind === 'powerup' */
  powerupId?: string;
  magnet?: boolean;
}

export interface FirePool {
  x: number;
  y: number;
  r: number;
  dmg: number;
  life: number;
  dead: boolean;
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
