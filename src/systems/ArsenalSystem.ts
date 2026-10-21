import type { ElementId } from '../data/constants';
import { WEAPON_MAX, MAX_WEAPONS } from '../data/constants';
import {
  WEAPON_DEFS,
  applyUniqueMults,
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

export class ArsenalSystem {
  baseMaxHp = 100;
  weapons: Record<string, number> = {};
  weaponOrder: string[] = [];
  weaponElements: Record<string, ElementId | null> = {};
  weaponUnique: Record<string, boolean> = {};
  passives: Record<string, number> = {};
  usedElements: Record<string, boolean> = {};
  banished = new Set<string>();

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
    return true;
  }

  getWeaponStats(id: string): WeaponStats | null {
    const l = this.weapons[id];
    if (!l) return null;
    const def = WEAPON_DEFS[id as WeaponId];
    if (!def) return null;
    let stats = { ...def.stats(l) };
    if (this.weaponUnique[id]) stats = applyUniqueMults(stats, id);
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

  rollCards(n = 3): LevelUpCard[] {
    return levelUpCardOptions(n, this.cardState(), this.banished);
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
      if (card.id === 'gold') player.gold += 25;
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

  passiveHaste(): number {
    return 1 + (this.passives.haste || 0) * 0.07;
  }

  passiveMaxHpBonus(): number {
    let hp = (this.passives.vitality || 0) * 25 + (this.passives.angel || 0) * 30;
    hp -= (this.passives.greed || 0) * 0.08 * 100;
    hp -= (this.passives.devil || 0) * 0.1 * 100;
    return hp;
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

  applyPassiveBonuses(player: RunPlayer) {
    const prevMax = player.maxHp;
    player.maxHp = Math.max(20, this.baseMaxHp + this.passiveMaxHpBonus());
    player.hp = Math.min(player.maxHp, player.hp + Math.max(0, player.maxHp - prevMax));
    player.armor = this.passiveArmor();
    player.regen = this.passiveRegen();
    player.crit = this.passiveCrit();
    player.moveMult = 1 + this.passiveMoveBonus();
    player.damageMult = this.passiveDamageBonus();
    player.dashCharges = 1 + (this.passives.dash || 0);
  }

  applyMetaRunStart(player: RunPlayer, metaBonuses: { rerolls?: number; banishes?: number }) {
    player.rerollsLeft = metaBonuses.rerolls || 0;
    player.banishesLeft = metaBonuses.banishes || 0;
    player.dashCharges = 1 + (this.passives.dash || 0);
  }
}
