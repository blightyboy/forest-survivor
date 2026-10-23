import type { ElementId } from '../data/constants';
import { WEAPON_MAX, MAX_WEAPONS } from '../data/constants';
import {
  WEAPON_DEFS,
  applyUniqueMults,
  uniqueWeaponName,
  weaponDrawStyle,
  type WeaponStats,
  type WeaponId,
} from '../data/weapons';
import {
  PASSIVE_DEFS,
  ELEMENT_PASSIVES,
  type LevelUpCard,
  levelUpCardOptions,
  cardKey,
  type ArsenalCardState,
} from '../data/passives';
import type { RunPlayer } from '../run/RunTypes';
import { gainResource } from '../run/RunTypes';

export class ArsenalSystem {
  baseMaxHp = 100;
  weapons: Record<string, number> = {};
  weaponOrder: string[] = [];
  weaponElements: Record<string, ElementId | null> = {};
  weaponUnique: Record<string, boolean> = {};
  passives: Record<string, number> = {};
  usedElements: Record<string, boolean> = {};
  banished = new Set<string>();
  /** Meta achievement ids — filters gated weapons/passives in the card pool. */
  achievements: string[] = [];

  addWeapon(id: string, level = 1) {
    if (!WEAPON_DEFS[id]) return false;
    if (this.weaponOrder.length >= MAX_WEAPONS && !this.weapons[id]) return false;
    if (!this.weapons[id]) this.weaponOrder.push(id);
    this.weapons[id] = Math.min(WEAPON_MAX, Math.max(this.weapons[id] || 0, level));
    return true;
  }

  upgradeWeapon(id: string) {
    const l = this.weapons[id] || 0;
    if (l <= 0 || l >= WEAPON_MAX) return false;
    this.weapons[id] = l + 1;
    if (l + 1 >= WEAPON_MAX && this.weaponElements[id]) {
      this.weaponUnique[id] = true;
    }
    return true;
  }

  setElement(weaponId: string, element: ElementId) {
    if (!this.weapons[weaponId]) return false;
    if (this.weaponElements[weaponId]) return false;
    this.weaponElements[weaponId] = element;
    this.usedElements[element] = true;
    // Legacy isUnique: max level + infusion → awaken unique form.
    if ((this.weapons[weaponId] || 0) >= WEAPON_MAX) {
      this.weaponUnique[weaponId] = true;
    }
    return true;
  }

  /** Legacy Arsenal.isUnique */
  isUnique(id: string): boolean {
    return (this.weapons[id] || 0) >= WEAPON_MAX && !!this.weaponElements[id];
  }

  /** Legacy Arsenal.elementOf */
  elementOf(id: string) {
    return this.weaponElements[id] || null;
  }

  /** Legacy Arsenal.drawStyle — paint kit for projectile art. */
  drawStyle(id: string, flash = false) {
    return weaponDrawStyle(this.elementOf(id), this.isUnique(id), flash);
  }

  /** Legacy Arsenal.fireOpts — attach to spawned projectiles. */
  fireOpts(id: string) {
    return {
      element: this.elementOf(id),
      unique: this.isUnique(id),
      style: this.drawStyle(id),
    };
  }

  /** Legacy Arsenal.uniqueName — elemental unique title, or null. */
  uniqueName(id: string): string | null {
    const el = this.weaponElements[id];
    return el ? uniqueWeaponName(id, el) : null;
  }

  /** Legacy Arsenal.displayName — unique title when awakened, else base name. */
  displayName(id: string): string {
    return this.uniqueName(id) || WEAPON_DEFS[id as WeaponId]?.name || id;
  }

  getWeaponStats(id: string): WeaponStats | null {
    const l = this.weapons[id];
    if (!l) return null;
    const def = WEAPON_DEFS[id as WeaponId];
    if (!def) return null;
    let stats = { ...def.stats(l) };
    // Prefer computed uniqueness so element-on-max awakens without stale flags.
    if (this.isUnique(id)) {
      this.weaponUnique[id] = true;
      stats = applyUniqueMults(stats, id);
    }
    return stats;
  }

  cardState(): ArsenalCardState {
    return {
      weapons: this.weapons,
      weaponOrder: this.weaponOrder,
      weaponElements: this.weaponElements,
      passives: this.passives,
      usedElements: this.usedElements,
    };
  }

  /** Legacy offers 5 cards per level-up (cardOptions(5, banished)). */
  rollCards(n = 5): LevelUpCard[] {
    return levelUpCardOptions(n, this.cardState(), this.banished, {
      achievements: this.achievements,
    });
  }

  applyCard(card: LevelUpCard, player: RunPlayer): boolean {
    if (card.kind === 'weapon') {
      const cur = this.weapons[card.id] || 0;
      if (cur === 0) return this.addWeapon(card.id, 1);
      return this.upgradeWeapon(card.id);
    }
    if (card.kind === 'element' && card.element) {
      return this.setElement(card.id, card.element);
    }
    if (card.kind === 'passive') {
      const def = PASSIVE_DEFS[card.id];
      if (!def) return false;
      const cur = this.passives[card.id] || 0;
      if (cur >= def.max) return false;
      this.passives[card.id] = cur + 1;
      this.applyPassiveBonuses(player);
      return true;
    }
    if (card.kind === 'bonus') {
      if (card.id === 'gold') gainResource(player, 'gold', 25);
      if (card.id === 'heal') player.hp = player.maxHp;
      return true;
    }
    return false;
  }

  banishCard(card: LevelUpCard) {
    this.banished.add(cardKey(card));
  }

  passiveMoveBonus(): number {
    return (this.passives.speed || 0) * 0.08;
  }

  passiveMagnetBonus(): number {
    return (this.passives.magnet || 0) * 0.35;
  }

  passiveDamageBonus(): number {
    let m = 1 + (this.passives.might || 0) * 0.15;
    m *= 1 + (this.passives.devil || 0) * 0.12;
    m *= 1 - (this.passives.angel || 0) * 0.08;
    return m;
  }

  passiveArmor(): number {
    return (this.passives.armor || 0) * 0.07;
  }

  passiveRegen(): number {
    return (this.passives.regen || 0) * 0.5;
  }

  passiveCrit(): number {
    return (this.passives.luck || 0) * 0.06;
  }

  passiveArea(): number {
    return 1 + (this.passives.area || 0) * 0.1;
  }

  /** Attack-speed divisor approximation for UI; combat uses legacy cooldownMult. */
  passiveHaste(): number {
    return 1 / Math.pow(0.93, this.passives.haste || 0);
  }

  /** Flat vitality only — angel is % max HP in recomputePlayerStats. */
  passiveMaxHpBonus(): number {
    return (this.passives.vitality || 0) * 25;
  }

  elementMasteryBonus(element: ElementId | null | undefined): number {
    if (!element) return 1;
    const map: Record<ElementId, string> = {
      fire: 'ember', water: 'tide', nature: 'bloom', earth: 'quake', light: 'radiance', darkness: 'umbra',
    };
    const pid = map[element];
    const lv = this.passives[pid] || 0;
    return 1 + lv * 0.36;
  }

  /**
   * Dash charges only. Combat stats (armor/crit/might/…) are owned by
   * `recomputePlayerStats` — writing them here wiped equipped gear bonuses.
   */
  applyPassiveBonuses(player: RunPlayer) {
    this.setDashCharges(player, 1 + (this.passives.dash || 0));
  }

  applyMetaRunStart(player: RunPlayer, metaBonuses: { rerolls?: number; banishes?: number }) {
    player.rerollsLeft = 5 + (metaBonuses.rerolls || 0);
    player.banishesLeft = 5 + (metaBonuses.banishes || 0);
    this.setDashCharges(player, 1 + (this.passives.dash || 0));
  }

  /** Legacy Player.setDashCharges — grow max without wiping available charges. */
  setDashCharges(player: RunPlayer, max: number) {
    const m = Math.max(1, max | 0);
    if (m > player.dashMax) player.dashCharges += m - player.dashMax;
    player.dashMax = m;
    player.dashCharges = Math.max(0, Math.min(player.dashCharges, player.dashMax));
  }
}
