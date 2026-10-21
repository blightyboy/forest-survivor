import Phaser from 'phaser';
import { UPGRADES, computeStats, upgradeCost } from '../data/constants';
import { refreshShopStock, type GearItem } from '../data/shop';
import { dist2, TAU } from '../core/math';
import type { RunPlayer } from '../run/RunTypes';
import type { AnimalSystem } from './AnimalSystem';
import type { MetaBonuses } from '../meta/Meta';
import { Audio } from '../audio/Audio';

const WAVES_PER_NIGHT = 3;
const WAVE_INTERVAL = 38;

export class CampSystem {
  levels: Record<string, number> = {
    camp: 1, walls: 0, towers: 0, archers: 0, barrage: 0, volley: 0,
    campfire: 0, mill: 0, mine: 0, butcher: 0, blacksmith: 0,
  };
  hp = 300;
  maxHp = 300;
  x: number;
  y: number;
  stats = computeStats(this.levels);
  millT = 0;
  mineT = 0;
  butcherT = 0;
  shopT = 0;
  shopStock: GearItem[] = [];
  towerTimers: number[] = [];
  /** Night key (dayNumber) when assault started. */
  assaultNight: number | null = null;
  wavesLeft = 0;
  waveTimer = 0;
  raidAnnounced = false;
  pendingRaidCredit = false;
  campSprite: Phaser.GameObjects.Image;
  wallGfx: Phaser.GameObjects.Graphics;
  towers: Phaser.GameObjects.Image[] = [];
  private meta: MetaBonuses;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
    meta: MetaBonuses,
  ) {
    this.x = cx;
    this.y = cy;
    this.meta = meta;
    this.recompute();
    this.campSprite = scene.add.image(cx, cy, 'camp').setDepth(2);
    this.wallGfx = scene.add.graphics().setDepth(1);
    layer.add([this.wallGfx, this.campSprite]);
    this.refreshShop();
  }

  recompute() {
    this.stats = computeStats(this.levels, this.meta);
    const prevMax = this.maxHp;
    this.maxHp = this.stats.campHp;
    if (prevMax > 0) this.hp = Math.min(this.maxHp, this.hp * (this.maxHp / prevMax));
    this.syncTowers();
    this.drawWalls();
  }

  syncTowers() {
    const want = this.stats.towerCount;
    while (this.towers.length < want) {
      const i = this.towers.length;
      const ang = (i / Math.max(1, want)) * TAU - Math.PI / 2;
      const d = 95;
      const t = this.scene.add.image(this.x + Math.cos(ang) * d, this.y + Math.sin(ang) * d, 'tower').setDepth(3);
      this.layer.add(t);
      this.towers.push(t);
      this.towerTimers.push(0);
    }
    while (this.towers.length > want) {
      const t = this.towers.pop();
      t?.destroy();
      this.towerTimers.pop();
    }
  }

  drawWalls() {
    const g = this.wallGfx;
    g.clear();
    if (!this.stats.wallHp) return;
    const half = 110;
    g.lineStyle(10, 0x7d5a3a, 0.9);
    g.strokeRect(this.x - half, this.y - half, half * 2, half * 2);
  }

  canUpgrade(id: string) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const lv = this.levels[id] || 0;
    if (lv >= def.max) return false;
    if (def.requires && !def.requires(this.levels)) return false;
    return true;
  }

  upgradeCost(id: string) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return {};
    return upgradeCost(def, this.levels[id] || 0);
  }

  tryUpgrade(id: string, player: RunPlayer): boolean {
    if (!this.canUpgrade(id)) return false;
    const cost = this.upgradeCost(id);
    for (const k in cost) {
      const key = k as 'wood' | 'meat' | 'gold';
      if ((player[key] || 0) < cost[k]) return false;
    }
    for (const k in cost) {
      const key = k as 'wood' | 'meat' | 'gold';
      player[key] -= cost[k];
    }
    this.levels[id] = (this.levels[id] || 0) + 1;
    this.recompute();
    Audio.playSfx('buy');
    return true;
  }

  refreshShop() {
    const forge = this.stats.forgeLevel;
    if (!forge) {
      this.shopStock = [];
      return;
    }
    this.shopStock = refreshShopStock(forge, this.meta.smithLuck || 0);
    this.shopT = 0;
  }

  buyShop(index: number, player: RunPlayer): GearItem | null {
    const item = this.shopStock[index];
    if (!item) return null;
    for (const k in item.price) {
      const key = k as 'wood' | 'meat' | 'gold';
      if ((player[key] || 0) < item.price[k]) return null;
    }
    for (const k in item.price) {
      const key = k as 'wood' | 'meat' | 'gold';
      player[key] -= item.price[k];
    }
    this.shopStock.splice(index, 1);
    Audio.playSfx('buy');
    return item;
  }

  damage(amount: number) {
    this.hp -= amount;
    return this.hp <= 0;
  }

  beginNightAssault(dayNumber: number, animals: AnimalSystem, threatM: number, onRaid: () => void) {
    if (this.assaultNight === dayNumber) return;
    this.assaultNight = dayNumber;
    this.wavesLeft = WAVES_PER_NIGHT;
    this.waveTimer = 0;
    this.pendingRaidCredit = true;
    if (!this.raidAnnounced) {
      this.raidAnnounced = true;
      onRaid();
      Audio.playSfx('raid');
    }
    animals.spawnRaidWave(6 + Math.floor(threatM * 2), threatM);
    this.wavesLeft--;
  }

  /** Call at dawn when camp still stands — grants raid survival credit. */
  resolveDawnSurvival(player: RunPlayer) {
    if (!this.pendingRaidCredit) return;
    if (this.hp > 0) player.raidsSurvived++;
    this.pendingRaidCredit = false;
    this.assaultNight = null;
    this.wavesLeft = 0;
    this.raidAnnounced = false;
  }

  update(
    dt: number,
    player: RunPlayer,
    animals: AnimalSystem,
    isNight: boolean,
    dayNumber: number,
    threatM: number,
    onRaid: () => void,
  ) {
    const s = this.stats;
    if (s.campWood) player.wood += s.campWood * dt * 0.02;
    if (s.campMeat) player.meat += s.campMeat * dt * 0.015;
    if (s.campGold) player.gold += s.campGold * dt * 0.012;

    this.millT += dt;
    if (s.millWood && this.millT >= 10) {
      this.millT = 0;
      player.wood += s.millWood;
    }
    this.mineT += dt;
    if (s.mineGold && this.mineT >= 10) {
      this.mineT = 0;
      player.gold += s.mineGold;
    }
    this.butcherT += dt;
    if (s.butcherMeat && this.butcherT >= 10) {
      this.butcherT = 0;
      player.meat += s.butcherMeat;
    }

    if (s.forgeLevel) {
      this.shopT += dt;
      if (this.shopT >= 300) this.refreshShop();
    }

    const inCamp = dist2(player.x, player.y, this.x, this.y) < 120 * 120;
    if (inCamp && s.healRate > 0) {
      player.hp = Math.min(player.maxHp, player.hp + s.healRate * dt);
    }

    for (let i = 0; i < this.towers.length; i++) {
      this.towerTimers[i] -= dt;
      if (this.towerTimers[i] > 0) continue;
      const tx = this.towers[i].x;
      const ty = this.towers[i].y;
      let shots = 0;
      for (const a of animals.animals) {
        if (a.dead || shots >= s.towerTargets) continue;
        const d2 = dist2(tx, ty, a.x, a.y);
        if (d2 > s.towerRange * s.towerRange) continue;
        a.hp -= s.arrowDmg;
        if (a.hp <= 0 && animals.combat) {
          animals.killAnimal(a, player, animals.combat.pickups, animals.combat.pools, {
            isNight,
            dayNumber,
            threatM,
          });
        }
        shots++;
      }
      this.towerTimers[i] = 1 / s.fireRate;
    }

    if (isNight) {
      this.beginNightAssault(dayNumber, animals, threatM, onRaid);
      if (this.wavesLeft > 0) {
        this.waveTimer += dt;
        if (this.waveTimer >= WAVE_INTERVAL) {
          this.waveTimer = 0;
          animals.spawnRaidWave(5 + Math.floor(threatM * 1.5), threatM);
          this.wavesLeft--;
        }
      }
    }

    for (const a of animals.animals) {
      if (a.dead || !a.raider) continue;
      if (dist2(a.x, a.y, this.x, this.y) < 55 * 55) {
        if (this.stats.wallHp > 0) {
          this.hp -= a.dmg * dt * 0.4;
        } else {
          this.hp -= a.dmg * dt * 0.8;
        }
      }
    }
  }

  destroy() {
    this.campSprite.destroy();
    this.wallGfx.destroy();
    for (const t of this.towers) t.destroy();
  }
}
