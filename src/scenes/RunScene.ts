import Phaser from 'phaser';
import { World } from '../world/World';
import { meta } from '../meta/Meta';
import { emptyEquipment } from '../data/shop';
import { ArsenalSystem } from '../systems/ArsenalSystem';
import { AnimalSystem } from '../systems/AnimalSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { CampSystem } from '../systems/CampSystem';
import { DayNightSystem } from '../systems/DayNightSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { DomUI } from '../ui/DomUI';
import { Audio } from '../audio/Audio';
import type { RunPlayer } from '../run/RunTypes';
import type { LevelUpCard } from '../data/passives';
import { clamp } from '../core/math';
import { threatAt, POWERUPS } from '../data/constants';
import { equipItem, recomputePlayerStats } from '../systems/PlayerStats';

export class RunScene extends Phaser.Scene {
  world!: World;
  player!: RunPlayer;
  playerSprite!: Phaser.GameObjects.Image;
  arsenal = new ArsenalSystem();
  animals!: AnimalSystem;
  combat!: CombatSystem;
  camp!: CampSystem;
  dayNight = new DayNightSystem();
  lighting!: LightingSystem;
  ui!: DomUI;
  worldLayer!: Phaser.GameObjects.Container;
  fxLayer!: Phaser.GameObjects.Container;
  treeSprites = new Map<string, Phaser.GameObjects.Image>();
  rockSprites = new Map<string, Phaser.GameObjects.Image>();
  bushSprites = new Map<string, Phaser.GameObjects.Image>();
  pickupGfx: Phaser.GameObjects.Image[] = [];
  metaBonuses = meta.bonuses();
  paused = false;
  levelUpOpen = false;
  currentCards: LevelUpCard[] = [];
  keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
    B: Phaser.Input.Keyboard.Key;
  };
  runStart = 0;

  constructor() {
    super({ key: 'RunScene' });
  }

  create() {
    Audio.unlock();
    this.runStart = this.time.now;
    this.world = new World();
    this.worldLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);

    this.metaBonuses = meta.bonuses();
    const bonuses = this.metaBonuses;
    this.player = {
      x: this.world.spawnX,
      y: this.world.spawnY,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      speed: 220,
      level: 1,
      xp: 0,
      wood: 30,
      meat: 10,
      gold: 5,
      kills: 0,
      bosses: 0,
      raidsSurvived: 0,
      aimAngle: 0,
      alive: true,
      dashCharges: 1,
      dashCd: 0,
      dashBoost: 0,
      invuln: 0,
      magnetR: 90,
      damageMult: 1,
      flatDamage: 0,
      moveMult: 1,
      armor: 0,
      regen: 0,
      crit: 0,
      rerollsLeft: bonuses.rerolls,
      banishesLeft: bonuses.banishes,
      equipment: emptyEquipment(),
      gearHaste: 0,
      gearArea: 0,
      gearLifesteal: 0,
      gearXpGain: 0,
      buffFury: 0,
      buffVital: 0,
      buffHaste: 0,
    };
    this.arsenal.addWeapon('axe', 1);
    this.arsenal.applyMetaRunStart(this.player, bonuses);
    recomputePlayerStats(this.player, this.arsenal, bonuses);

    this.playerSprite = this.add.image(this.player.x, this.player.y, 'player').setDepth(10);
    this.worldLayer.add(this.playerSprite);

    this.animals = new AnimalSystem(this, this.worldLayer);
    this.animals.worldCenter = { x: this.world.spawnX, y: this.world.spawnY };

    this.combat = new CombatSystem(
      this,
      this.worldLayer,
      this.fxLayer,
      this.world,
      this.arsenal,
      this.animals,
      () => this.openLevelUp(),
      bonuses,
    );
    this.animals.setCombat(this.combat);
    this.animals.setFxLayer(this.fxLayer);
    this.animals.onDayBoss = (name) => this.ui.setTip(`${name} hunts the camp!`);

    this.camp = new CampSystem(this, this.worldLayer, this.world.spawnX, this.world.spawnY, bonuses);

    this.lighting = new LightingSystem(this, 90);
    this.lighting.resize(this.scale.width, this.scale.height);

    this.ui = new DomUI();
    this.ui.hideMainMenu();
    this.ui.hideGameOver();
    this.wireUi();

    this.cameras.main.setBounds(0, 0, this.world.w, this.world.h);
    this.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.keys = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      B: Phaser.Input.Keyboard.KeyCodes.B,
    }) as RunScene['keys'];

    this.scale.on('resize', () => {
      this.lighting.resize(this.scale.width, this.scale.height);
    });

    for (let i = 0; i < 6; i++) {
      this.animals.spawn('boar', this.player.x + 300 + i * 40, this.player.y + 200, { threatM: 0 });
    }

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  wireUi() {
    const ui = this.ui;
    ui.onCardPick = (card) => {
      this.arsenal.applyCard(card, this.player);
      recomputePlayerStats(this.player, this.arsenal, this.metaBonuses);
      this.closeLevelUp();
    };
    ui.onCardBanish = (card) => {
      if (this.player.banishesLeft <= 0) return;
      this.player.banishesLeft--;
      this.arsenal.banishCard(card);
      this.currentCards = this.arsenal.rollCards(3);
      ui.showLevelUpCards(this.currentCards, this.player.rerollsLeft, this.player.banishesLeft);
    };
    ui.onCardReroll = () => {
      if (this.player.rerollsLeft <= 0) return;
      this.player.rerollsLeft--;
      this.currentCards = this.arsenal.rollCards(3);
      ui.showLevelUpCards(this.currentCards, this.player.rerollsLeft, this.player.banishesLeft);
    };
    ui.onQuitRun = () => this.endRun(false);
    ui.onUpgradeCamp = (id) => {
      if (this.camp.tryUpgrade(id, this.player)) {
        ui.showCampShop(this.camp, this.player);
      }
    };
    ui.onBuyShop = (i) => {
      const item = this.camp.buyShop(i, this.player);
      if (item) {
        equipItem(this.player, item, this.arsenal, this.metaBonuses);
        ui.showCampShop(this.camp, this.player);
      }
    };
  }

  openLevelUp() {
    this.levelUpOpen = true;
    this.paused = true;
    Audio.playSfx('levelup');
    this.currentCards = this.arsenal.rollCards(3);
    this.ui.showLevelUpCards(this.currentCards, this.player.rerollsLeft, this.player.banishesLeft);
  }

  closeLevelUp() {
    this.levelUpOpen = false;
    this.paused = false;
    this.ui.hideLevelUp();
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(0.05, dtMs / 1000);
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      if (this.levelUpOpen) return;
      if (this.ui.isModalOpen() && !this.paused) {
        this.ui.hideCampShop();
      } else if (this.paused) {
        this.paused = false;
        this.ui.hidePause();
      } else if (this.player.alive) {
        this.paused = true;
        this.ui.showPause(this.player, this.arsenal, () => {
          this.paused = false;
          this.ui.hidePause();
        });
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.B) && this.player.alive) {
      this.ui.showCampShop(this.camp, this.player);
    }

    if (this.paused || !this.player.alive) {
      if (!this.player.alive && !this.ui.gameOverEl.classList.contains('hidden')) return;
      return;
    }

    this.updatePlayer(dt);
    const threat = threatAt(this.dayNight.runTime);
    const dayEvt = this.dayNight.update(dt);
    if (dayEvt.leftNight || dayEvt.newDay) {
      this.camp.resolveDawnSurvival(this.player);
    }
    this.combat.setKillContext({
      isNight: this.dayNight.isNight,
      dayNumber: this.dayNight.dayNumber,
      threatM: threat.m,
    });
    this.camp.update(
      dt,
      this.player,
      this.animals,
      this.dayNight.isNight,
      this.dayNight.dayNumber,
      threat.m,
      () => this.ui.setTip('Night raid — defend the camp!'),
    );
    this.animals.update(
      dt,
      this.player,
      this.combat.pickups,
      this.combat.pools,
      threat.m,
      this.dayNight.isNight,
      this.dayNight.dayNumber,
    );
    this.combat.update(dt, this.player);
    this.cullWorldSprites();
    this.syncPickups();
    const lightSources = [
      { x: this.player.x, y: this.player.y, r: 160, intensity: 1.15 },
      { x: this.camp.x, y: this.camp.y, r: this.camp.stats.lightR, intensity: 1.05 },
    ];
    if (this.camp.stats.healRate > 0) {
      lightSources.push({ x: this.camp.x, y: this.camp.y + 28, r: 120, intensity: 1.35 });
    }
    this.lighting.update(this.dayNight.darkness, this.cameras.main, lightSources);

    this.ui.updateHud(this.player, this.dayNight, this.camp, dt);

    if (!this.player.alive) this.endRun(true);
    if (this.camp.hp <= 0) {
      this.player.alive = false;
      this.endRun(true);
    }
  }

  updatePlayer(dt: number) {
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    if (p.dashBoost > 0) p.dashBoost = Math.max(0, p.dashBoost - dt);

    let mx = 0;
    let my = 0;
    if (this.keys.A.isDown) mx -= 1;
    if (this.keys.D.isDown) mx += 1;
    if (this.keys.W.isDown) my -= 1;
    if (this.keys.S.isDown) my += 1;
    const dashKey = this.keys.SHIFT.isDown || this.keys.SPACE.isDown;
    if (dashKey && p.dashCharges > 0 && p.dashCd <= 0 && (mx || my)) {
      const len = Math.hypot(mx, my) || 1;
      p.vx = (mx / len) * 520;
      p.vy = (my / len) * 520;
      p.dashBoost = 0.18;
      p.dashCd = 0.55;
      p.dashCharges--;
      this.time.delayedCall(600, () => {
        p.dashCharges = Math.min(p.dashCharges + 1, 1 + (this.arsenal.passives.dash || 0));
      });
    }

    const speed = p.speed * p.moveMult * (p.dashBoost > 0 ? 1.6 : 1);
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      p.vx = lerpVel(p.vx, (mx / len) * speed, dt);
      p.vy = lerpVel(p.vy, (my / len) * speed, dt);
      p.aimAngle = Math.atan2(my, mx);
    } else if (p.dashBoost <= 0) {
      p.vx *= Math.pow(0.02, dt);
      p.vy *= Math.pow(0.02, dt);
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = clamp(p.x, 80, this.world.w - 80);
    p.y = clamp(p.y, 80, this.world.h - 80);

    if (p.regen > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    }

    this.playerSprite.setPosition(p.x, p.y);
  }

  cullWorldSprites() {
    const cam = this.cameras.main;
    const margin = 120;
    const vx0 = cam.scrollX - margin;
    const vy0 = cam.scrollY - margin;
    const vx1 = cam.scrollX + cam.width + margin;
    const vy1 = cam.scrollY + cam.height + margin;

    for (const tree of this.world.trees) {
      if (tree.dead) continue;
      const vis = tree.x >= vx0 && tree.x <= vx1 && tree.y >= vy0 && tree.y <= vy1;
      const key = `t${tree.x | 0},${tree.y | 0}`;
      let spr = this.treeSprites.get(key);
      if (!vis) {
        spr?.setVisible(false);
        continue;
      }
      if (!spr) {
        const tex = tree.kind === 'pine' ? 'tree_pine' : 'tree_oak';
        spr = this.add.image(tree.x, tree.y, tex).setDepth(0);
        this.worldLayer.add(spr);
        this.treeSprites.set(key, spr);
      }
      spr.setVisible(true).setPosition(tree.x, tree.y);
    }

    for (const rock of this.world.rocks) {
      if (rock.dead) continue;
      const vis = rock.x >= vx0 && rock.x <= vx1 && rock.y >= vy0 && rock.y <= vy1;
      const key = `r${rock.x | 0},${rock.y | 0}`;
      let spr = this.rockSprites.get(key);
      if (!vis) {
        spr?.setVisible(false);
        continue;
      }
      if (!spr) {
        const tex = rock.ore ? 'rock_ore' : 'rock';
        spr = this.add.image(rock.x, rock.y, tex).setDepth(0);
        this.worldLayer.add(spr);
        this.rockSprites.set(key, spr);
      }
      spr.setVisible(true).setPosition(rock.x, rock.y);
    }

    for (const bush of this.world.bushes) {
      const vis = bush.x >= vx0 && bush.x <= vx1 && bush.y >= vy0 && bush.y <= vy1;
      const key = `b${bush.x | 0},${bush.y | 0}`;
      let spr = this.bushSprites.get(key);
      if (!vis) {
        spr?.setVisible(false);
        continue;
      }
      if (!spr) {
        spr = this.add.image(bush.x, bush.y, 'bush').setDepth(0);
        this.worldLayer.add(spr);
        this.bushSprites.set(key, spr);
      }
      spr.setVisible(true).setPosition(bush.x, bush.y);
    }
  }

  syncPickups() {
    while (this.pickupGfx.length < this.combat.pickups.length) {
      const g = this.add.image(0, 0, 'pickup_xp').setDepth(8);
      this.fxLayer.add(g);
      this.pickupGfx.push(g);
    }
    for (let i = 0; i < this.combat.pickups.length; i++) {
      const p = this.combat.pickups[i];
      const g = this.pickupGfx[i];
      let tex = 'pickup_xp';
      if (p.kind === 'wood') tex = 'pickup_wood';
      else if (p.kind === 'meat') tex = 'pickup_meat';
      else if (p.kind === 'gold') tex = 'pickup_gold';
      else if (p.kind === 'powerup' && p.powerupId) {
        tex = POWERUPS[p.powerupId] ? `pickup_${p.powerupId}` : 'pickup_xp';
      }
      g.setTexture(tex).setPosition(p.x, p.y).setVisible(true);
    }
    for (let i = this.combat.pickups.length; i < this.pickupGfx.length; i++) {
      this.pickupGfx[i].setVisible(false);
    }
  }

  endRun(record: boolean) {
    this.paused = true;
    const runTime = (this.time.now - this.runStart) / 1000;
    let credits = 0;
    if (record) {
      credits = meta.completeRun({
        day: this.dayNight.dayNumber,
        level: this.player.level,
        kills: this.player.kills,
        raids: this.player.raidsSurvived,
        bosses: this.player.bosses,
        time: runTime,
      });
    }
    this.ui.hidePause();
    this.ui.hideLevelUp();
    this.ui.hideCampShop();
    this.ui.showGameOver(
      { day: this.dayNight.dayNumber, level: this.player.level, kills: this.player.kills, credits },
      () => {
        this.scene.start('MenuScene');
      },
    );
  }

  shutdown() {
    this.treeSprites.forEach((s) => s.destroy());
    this.rockSprites.forEach((s) => s.destroy());
    this.bushSprites.forEach((s) => s.destroy());
    this.pickupGfx.forEach((s) => s.destroy());
    this.camp.destroy();
    this.lighting.destroy();
    this.animals.clear();
    this.combat.clear();
  }
}

function lerpVel(cur: number, target: number, dt: number) {
  return cur + (target - cur) * (1 - Math.exp(-12 * dt));
}
