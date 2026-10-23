import Phaser from 'phaser';
import { TREE_FALL_TIME, World } from '../world/World';
import { meta } from '../meta/Meta';
import { emptyEquipment } from '../data/shop';
import { ArsenalSystem } from '../systems/ArsenalSystem';
import { AnimalSystem } from '../systems/AnimalSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { CampSystem } from '../systems/CampSystem';
import { DayNightSystem } from '../systems/DayNightSystem';
import { LightingSystem, type LightSource } from '../systems/LightingSystem';
import { FloatingTextSystem } from '../systems/FloatingTextSystem';
import { EdgeIndicatorSystem } from '../systems/EdgeIndicatorSystem';
import { AssaultSystem } from '../systems/AssaultSystem';
import { FxSystem } from '../systems/FxSystem';
import { DomUI } from '../ui/DomUI';
import { Audio } from '../audio/Audio';
import type { RunPlayer } from '../run/RunTypes';
import type { LevelUpCard } from '../data/passives';
import { clamp, damp, formatNum, rand } from '../core/math';
import { tickDots } from '../core/dot';
import { cameraZoom, cameraWorldBounds } from '../core/renderScale';
import {
  threatAt,
  UPGRADES,
  buildParentUpgrades,
  isBossNight,
  ELEMENTS,
  upgradeCost,
  START_GRACE,
  MAX_WEAPONS,
  type ElementId,
} from '../data/constants';
import { COACH_STEPS } from '../data/tutorials';
import { Music } from '../audio/Music';
import { settings } from '../meta/Settings';
import { equipItem, recomputePlayerStats } from '../systems/PlayerStats';
import { BOSS_NAMES, SPECIES } from '../data/animals';
import type { BossAbilityId } from '../systems/EnemyAbilities';
import { CanvasSprite } from '../art/draw/CanvasSprite';
import { drawPlayer } from '../art/draw/playerDraw';
import { GroundLayer } from '../art/ground';
import {
  computeMutatorEffects,
  normalizeMutatorIds,
  type MutatorEffects,
  type MutatorId,
} from '../data/mutators';
import { POI_DEFS, POI_INTERACT_R, POI_PROMPT_R, type WorldPoi } from '../data/pois';
import {
  WIN_GOAL_BY_ID,
  normalizeWinGoal,
  winGoalNights,
  type WinGoalId,
} from '../data/winGoals';
import type { AchievementId } from '../data/achievements';
import { WEAPON_DEFS } from '../data/weapons';
import { PASSIVE_DEFS } from '../data/passives';
import {
  clearRunSnapshot,
  loadRunSnapshot,
  saveRunSnapshot,
  type RunSnapshot,
} from '../meta/RunSave';

export class RunScene extends Phaser.Scene {
  world!: World;
  player!: RunPlayer;
  playerSprite!: Phaser.GameObjects.Image;
  playerCanvas!: CanvasSprite;
  playerFacing = 1;
  playerWalkTime = 0;
  playerFlash = 0;
  playerDrawKey = '';
  arsenal = new ArsenalSystem();
  animals!: AnimalSystem;
  combat!: CombatSystem;
  camp!: CampSystem;
  dayNight = new DayNightSystem();
  lighting!: LightingSystem;
  floatText!: FloatingTextSystem;
  edges!: EdgeIndicatorSystem;
  vfx!: FxSystem;
  assault = new AssaultSystem();
  ui!: DomUI;
  groundLayer!: GroundLayer;
  groundRoot!: Phaser.GameObjects.Container;
  worldLayer!: Phaser.GameObjects.Container;
  fxLayer!: Phaser.GameObjects.Container;
  treeSprites = new Map<
    string,
    {
      body: Phaser.GameObjects.Image;
      stump: Phaser.GameObjects.Image;
      shadow: Phaser.GameObjects.Image;
      bar: Phaser.GameObjects.Graphics;
    }
  >();
  rockSprites = new Map<
    string,
    { img: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics }
  >();
  bushSprites = new Map<string, Phaser.GameObjects.Image>();
  poiSprites = new Map<number, Phaser.GameObjects.Image>();
  /** Floating [E] prompt above the nearest landmark. */
  poiPrompt: Phaser.GameObjects.Container | null = null;
  pickupGfx: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  metaBonuses = meta.bonuses();
  mutators: MutatorId[] = [];
  mutatorFx: MutatorEffects = computeMutatorEffects([], START_GRACE);
  winGoal: WinGoalId = 'none';
  /** Load mid-run checkpoint instead of a fresh world. */
  private resumeFromSave = false;
  private saveAcc = 0;
  private won = false;
  paused = false;
  levelUpOpen = false;
  faceNearest = true;
  day1BannerShown = false;
  currentCards: LevelUpCard[] = [];
  /** Silent pause while a first-run tutorial is open (legacy tutorialSilentPause). */
  tutorialSilentPause = false;
  tutorialOpen: string | null = null;
  tutorialQueue: string[] = [];
  /** Coach tips already shown this run (tips replay each run while Options → Tutorials is On). */
  tutorialsShownThisRun = new Set<string>();
  /** Show level-up cards after the first level-up coach dismisses. */
  pendingLevelUpAfterTutor = false;
  /** Seconds into the run — used to time the controls coach. */
  tutRunAge = 0;
  tutDashSeen = false;
  /** First beast the player hit this run — world spotlight for the enemy coach. */
  tutorBeastFocus: { x: number; y: number; radius: number } | null = null;
  /** Virtual joystick — drag on the canvas (legacy Input.joy). */
  private joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
    B: Phaser.Input.Keyboard.Key;
    U: Phaser.Input.Keyboard.Key;
    P: Phaser.Input.Keyboard.Key;
    M: Phaser.Input.Keyboard.Key;
    F: Phaser.Input.Keyboard.Key;
    R: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    FOUR: Phaser.Input.Keyboard.Key;
    FIVE: Phaser.Input.Keyboard.Key;
    SIX: Phaser.Input.Keyboard.Key;
    SEVEN: Phaser.Input.Keyboard.Key;
    EIGHT: Phaser.Input.Keyboard.Key;
    NINE: Phaser.Input.Keyboard.Key;
  };
  runStart = 0;
  /** Opening calm — wildlife won't hunt until struck or this hits 0. */
  graceLeft = 0;
  /** Collected in update; punched in prerender after the camera scrolls. */
  private pendingLights: LightSource[] = [];
  private pendingDuskTint = 0;

  constructor() {
    super({ key: 'RunScene' });
  }

  init(data?: { continue?: boolean }) {
    this.resumeFromSave = !!data?.continue;
  }

  create() {
    Audio.unlock();
    Music.setVolume(settings.musicVolume);
    // Phaser reuses the scene instance — reset per-run state (field inits only run once).
    this.paused = false;
    this.won = false;
    this.saveAcc = 0;
    this.levelUpOpen = false;
    this.faceNearest = true;
    this.day1BannerShown = false;
    this.currentCards = [];
    this.tutorialSilentPause = false;
    this.tutorialOpen = null;
    this.tutorialQueue = [];
    this.tutorialsShownThisRun = new Set();
    this.pendingLevelUpAfterTutor = false;
    this.tutRunAge = 0;
    this.tutDashSeen = false;
    this.tutorBeastFocus = null;
    this.joy.active = false;
    this.playerFacing = 1;
    this.playerWalkTime = 0;
    this.playerFlash = 0;
    this.playerDrawKey = '';
    this.treeSprites.clear();
    this.rockSprites.clear();
    this.bushSprites.clear();
    this.poiSprites.forEach((s) => s.destroy());
    this.poiSprites.clear();
    this.poiPrompt?.destroy();
    this.poiPrompt = null;
    this.pickupGfx.length = 0;
    this.arsenal = new ArsenalSystem();
    this.assault = new AssaultSystem();
    this.dayNight = new DayNightSystem();
    this.runStart = this.time.now;
    const snap = this.resumeFromSave ? loadRunSnapshot() : null;
    if (!snap) this.resumeFromSave = false;
    this.mutators = normalizeMutatorIds(snap?.mutators ?? settings.mutators);
    this.winGoal = normalizeWinGoal(snap?.winGoal ?? settings.winGoal);
    this.mutatorFx = computeMutatorEffects(this.mutators, START_GRACE);
    this.graceLeft = snap ? snap.graceLeft : this.mutatorFx.graceSec;
    this.assault.waveMult = this.mutatorFx.siegeWaveMult;
    this.assault.timerMult = this.mutatorFx.siegeTimerMult;
    if (snap) {
      this.assault.index = snap.assaultIndex || 0;
      this.assault.timer = snap.assaultTimer ?? 18;
    }
    // New procedural layout every run (ground layer follows world.seed).
    this.world = new World(snap?.worldSeed);
    if (this.mutatorFx.xpOnlyLoot) this.world.setPoiExclude(['vein']);
    // World entities Y-sort via child depth; FX (projectiles, float text) stay above.
    this.worldLayer = this.add.container(0, 0).setDepth(0);
    this.fxLayer = this.add.container(0, 0).setDepth(10);
    this.groundRoot = this.add.container(0, 0).setDepth(-10000);
    this.groundLayer = new GroundLayer(
      this,
      this.groundRoot,
      this.world.seed,
      this.world.spawnX,
      this.world.spawnY,
      this.world.w,
      this.world.h,
    );

    this.metaBonuses = meta.bonuses();
    const bonuses = this.metaBonuses;
    // Snap may move the player after systems boot; start at spawn for a fresh run.
    this.player = {
      x: this.world.spawnX,
      y: this.world.spawnY,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      speed: 180, // legacy computePlayerStats.moveSpeed base
      level: 1,
      xp: 0,
      wood: 30,
      meat: 10,
      gold: 5,
      treesChopped: 0,
      woodCollected: 0,
      meatCollected: 0,
      goldCollected: 0,
      campUpgrades: 0,
      kills: 0,
      bosses: 0,
      raidsSurvived: 0,
      aimAngle: 0,
      alive: true,
      dashCharges: 1,
      dashMax: 1,
      dashCd: 0,
      dashCdMax: 1.35,
      dashT: 0,
      invuln: 0,
      slow: 0,
      slowT: 0,
      poisons: [],
      burns: [],
      magnetR: 90,
      damageMult: 1,
      flatDamage: 0,
      moveMult: 1,
      armor: 0,
      regen: 0,
      crit: 0,
      rerollsLeft: 5 + (bonuses.rerolls || 0),
      banishesLeft: 5 + (bonuses.banishes || 0),
      equipment: emptyEquipment(),
      gearHaste: 0,
      gearArea: 0,
      gearLifesteal: 0,
      gearXpGain: 0,
      thorns: 0,
      elemFlat: 0,
      attackElement: null,
      elementPower: {},
      elementResist: {},
      buffFury: 0,
      buffVital: 0,
      buffHaste: 0,
      buffHearts: 0,
      burnT: 0,
      burnPoolCd: 0,
    };
    this.arsenal.achievements = [...meta.achievements];
    this.arsenal.addWeapon('axe', 1);
    this.arsenal.applyMetaRunStart(this.player, bonuses);
    recomputePlayerStats(this.player, this.arsenal, bonuses);
    this.applyMutatorPlayerMods(true);

    // Origin on feet (not canvas bottom) so HP/dash bars can sit below without floating the sprite.
    this.playerCanvas = new CanvasSprite(this, this.worldLayer, 72, 96, 'rt_player', 0.5, (96 - 18) / 96);
    this.playerSprite = this.playerCanvas.image;
    this.redrawPlayer();

    this.animals = new AnimalSystem(this, this.worldLayer);
    this.animals.worldCenter = { x: this.world.spawnX, y: this.world.spawnY };
    this.animals.worldSize = { w: this.world.w, h: this.world.h };
    this.animals.biomeAt = (x, y) => this.world.biomeAt(x, y);
    this.animals.onPlayerHurt = () => {
      this.playerFlash = 0.15;
      this.shake(0.45);
    };
    this.animals.onSwarm = (label, count, tint) => {
      Audio.playSfx('chitter');
      this.ui.banner(label, `${count} pests close in from every side!`, tint);
    };

    this.combat = new CombatSystem(
      this,
      this.worldLayer,
      this.fxLayer,
      this.world,
      this.arsenal,
      this.animals,
      () => this.onPlayerLevelUp(),
      bonuses,
    );
    this.combat.lootMult = this.mutatorFx.lootMult;
    this.combat.xpOnlyLoot = this.mutatorFx.xpOnlyLoot;
    if (this.mutatorFx.xpOnlyLoot) {
      for (const r of this.world.rocks) {
        if (r.ore) r.invulnerable = true;
      }
    }
    this.combat.onStaticKilled = (s) => {
      // Trees keep a stump and regrow — don't destroy the sprite entry.
      if (s.type === 'tree') return;
      const key = `r${s.x | 0},${s.y | 0}`;
      const spr = this.rockSprites.get(key);
      if (spr) {
        spr.img.destroy();
        spr.bar.destroy();
        this.rockSprites.delete(key);
      }
    };
    this.animals.setCombat(this.combat);
    this.animals.setFxLayer(this.fxLayer);

    this.camp = new CampSystem(this, this.worldLayer, this.world.spawnX, this.world.spawnY, bonuses);
    this.camp.shopStockMult = this.mutatorFx.shopCountMult;
    this.camp.winGoalNights = winGoalNights(this.winGoal);
    if (this.mutatorFx.shopCountMult !== 1) this.camp.restockShop(true);
    if (this.mutatorFx.noCamp) this.camp.enableNoCamp();
    this.animals.setCamp(this.camp);
    this.animals.spawnBlocked = (x, y) => this.camp.spawnInBase(x, y, 48);
    this.animals.huntPlayerOnly = this.mutatorFx.huntPlayerOnly;
    this.animals.xpOnlyLoot = this.mutatorFx.xpOnlyLoot;
    this.animals.enemyDmgMult = this.mutatorFx.enemyDmgMult;

    this.floatText = new FloatingTextSystem(this, this.fxLayer);
    this.vfx = new FxSystem(this, this.fxLayer);
    this.edges = new EdgeIndicatorSystem(this);
    this.camp.fx = this.vfx;
    this.combat.vfx = this.vfx;
    this.animals.vfx = this.vfx;
    this.combat.onFloatText = (x, y, msg, color, size, opts) =>
      this.floatText.spawn(x, y, msg, color, size, opts);
    this.combat.onShake = (intensity) => this.shake(intensity);
    this.combat.onAnimalHit = (a) => this.onPlayerHitBeast(a);
    this.camp.onShake = (intensity) => this.shake(intensity);
    this.camp.onFloatText = (x, y, msg, color, size, opts) =>
      this.floatText.spawn(x, y, msg, color, size, opts);
    this.camp.onPay = (x, y, wood, meat, gold) => {
      const bits: string[] = [];
      if (wood) bits.push(`+${wood} Wood`);
      if (meat) bits.push(`+${meat} Meat`);
      if (gold) bits.push(`+${gold} Gold`);
      if (!bits.length) return;
      this.floatText.spawn(
        x,
        y,
        bits.join('  '),
        gold ? '#ffe066' : meat ? '#ff9f8a' : '#ffd9a0',
        15,
        { life: 1.4, vy: -25 },
      );
    };

    this.lighting = new LightingSystem(this, 90);
    this.lighting.resize(this.scale.width, this.scale.height);
    // Lighting sits on its own zoom-1 camera so main zoom/DPR can't offset cutouts.
    this.lighting.bind(this.cameras.main, [this.worldLayer, this.fxLayer, this.groundRoot]);

    this.ui = new DomUI();
    this.ui.beginRunHud();
    this.combat.onPowerupBanner = (title, sub, color, iconId) =>
      this.ui.banner(title, sub, color, iconId ? { iconId } : undefined);
    this.camp.onCampAttack = () => {
      if (this.mutatorFx.noCamp) return;
      this.ui.banner('The camp is under attack!', 'Defend the cabin or the run is over.', '#ff6b6b', {
        iconId: 'house',
      });
    };
    this.camp.onStructureHit = () => {
      if (!this.mutatorFx.noCamp) this.ui.flashCampHurt();
    };
    this.camp.onRaidStart = (day, count, directions, speciesHint, topSpecies) => {
      const goalN = winGoalNights(this.winGoal);
      const gauntlet = goalN > 0 && day === goalN;
      const species = speciesHint ? ` · ${speciesHint}` : '';
      const pills = this.ui.speciesPillsHtml(topSpecies || []);
      const solo = this.mutatorFx.huntPlayerOnly;
      this.ui.banner(
        gauntlet ? `Night ${day}: FINAL GAUNTLET!` : `Night ${day}: RAID!`,
        `${count} beasts from the ${directions}${species}`,
        gauntlet ? '#ffe08a' : '#ff6b6b',
        {
          iconId: gauntlet ? 'world_win' : 'world_raids',
          subHtml: `${count} beasts from the ${directions}${species}${pills ? ` ${pills}` : ''}`,
        },
      );
      this.ui.setTip(
        gauntlet
          ? 'Final gauntlet — survive to win!'
          : solo
            ? 'Night raid — they hunt you!'
            : 'Night raid — defend the camp!',
      );
    };
    this.camp.onTrueBossSpawn = (name, moves) => {
      const ids = moves.filter((id): id is BossAbilityId => !!id) as BossAbilityId[];
      for (const id of ids) this.noteBossMoveDiscover(id);
      const chips = ids.map((id) => this.ui.bossMoveChipHtml(id)).filter(Boolean);
      this.ui.banner(
        `${name}`,
        chips.length ? '' : 'Signature moves incoming',
        '#ff4d6d',
        {
          iconId: 'true_boss',
          ...(chips.length
            ? {
                subHtml: `Signature moves<div class="fs-boss-moves" style="justify-content:center;margin-top:6px">${chips.join('')}</div>`,
              }
            : {}),
        },
      );
    };
    this.camp.onNightBoss = (kind, day) => {
      const goalN = winGoalNights(this.winGoal);
      if (goalN > 0 && day === goalN) {
        this.ui.banner('GAUNTLET BOSS', `Night ${day} — true boss + elite guards!`, '#ffe08a', {
          iconId: 'world_win',
        });
      } else if (kind === 'true') {
        this.ui.banner('BOSS NIGHT', `Night ${day} — true boss and elite guards!`, '#ff4d6d', {
          iconId: 'true_boss',
        });
      } else {
        const solo = this.mutatorFx.huntPlayerOnly;
        this.ui.banner(
          day >= 7 ? 'Twin minibosses!' : 'Miniboss incoming!',
          solo ? 'Elite guards hunt you.' : 'Elite guards hunt you and the camp.',
          '#c46bff',
          { iconId: 'world_champions' },
        );
      }
    };
    this.animals.onDayBoss = (name) => {
      const solo = this.mutatorFx.huntPlayerOnly;
      this.ui.banner(
        `${name}!`,
        solo ? 'Elite guards hunt you.' : 'Elite guards hunt you and your camp.',
        '#c46bff',
        { iconId: 'world_champions' },
      );
      this.ui.setTip(solo ? `${name} and guards hunt you!` : `${name} and guards hunt the camp!`);
    };
    this.wireUi();
    this.ui.threatHudMult = this.mutatorFx.threatMult;
    this.ui.setActiveMutators(this.mutators);
    this.ui.setNoCampMode(this.mutatorFx.noCamp);
    this.ui.refreshCampPanel(this.camp, this.player, this.camp.contains(this.player.x, this.player.y, 30));

    if (snap) {
      this.applyRunSnapshot(snap);
      this.ui.banner(
        `Day ${this.dayNight.dayNumber}`,
        this.mutatorFx.noCamp
          ? 'Checkpoint restored — stay alive.'
          : 'Checkpoint restored — keep the camp standing.',
        '#7fd3ff',
      );
      this.day1BannerShown = true;
    } else {
      clearRunSnapshot();
      const goal = WIN_GOAL_BY_ID[this.winGoal];
      const graceNote =
        this.graceLeft > 0
          ? `Wildlife ignores you for ${Math.round(this.graceLeft)}s.`
          : 'No opening grace.';
      const goalNote =
        goal.nights > 0
          ? ` Win goal: ${goal.name} (${goal.nights} nights).`
          : '';
      const openLine = this.mutatorFx.noCamp
        ? `Hunt and survive. ${graceNote}${goalNote}`
        : `Chop, hunt, fortify. ${graceNote}${goalNote}`;
      this.ui.banner('Day 1', openLine, '#ffe08a', {
        iconId: this.graceLeft > 0 ? 'world_grace' : 'sun',
      });
      this.day1BannerShown = true;
    }

    this.cameras.main.setBounds(0, 0, this.world.w, this.world.h);
    this.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12);
    this.applyCameraZoom();
    // Re-fit once layout/canvas CSS has settled (matches post-Options path).
    requestAnimationFrame(() => this.applyCameraZoom());
    // Edge arrows are screen-space — same zoom-1 overlay as lighting.
    this.lighting.attachHud(this.cameras.main, this.edges.display);

    this.keys = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      B: Phaser.Input.Keyboard.KeyCodes.B,
      U: Phaser.Input.Keyboard.KeyCodes.U,
      P: Phaser.Input.Keyboard.KeyCodes.P,
      M: Phaser.Input.Keyboard.KeyCodes.M,
      F: Phaser.Input.Keyboard.KeyCodes.F,
      R: Phaser.Input.Keyboard.KeyCodes.R,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
      TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
      THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
      FOUR: Phaser.Input.Keyboard.KeyCodes.FOUR,
      FIVE: Phaser.Input.Keyboard.KeyCodes.FIVE,
      SIX: Phaser.Input.Keyboard.KeyCodes.SIX,
      SEVEN: Phaser.Input.Keyboard.KeyCodes.SEVEN,
      EIGHT: Phaser.Input.Keyboard.KeyCodes.EIGHT,
      NINE: Phaser.Input.Keyboard.KeyCodes.NINE,
    }) as RunScene['keys'];

    // Legacy virtual joystick — drag anywhere on the game canvas.
    this.input.off('pointerdown', this.onJoyDown, this);
    this.input.off('pointermove', this.onJoyMove, this);
    this.input.off('pointerup', this.onJoyUp, this);
    this.input.off('pointerupoutside', this.onJoyUp, this);
    this.input.on('pointerdown', this.onJoyDown, this);
    this.input.on('pointermove', this.onJoyMove, this);
    this.input.on('pointerup', this.onJoyUp, this);
    this.input.on('pointerupoutside', this.onJoyUp, this);

    this.scale.off('resize', this.onScaleResize, this);
    this.scale.on('resize', this.onScaleResize, this);
    this.game.events.off('dpr-resize', this.onDprResize, this);
    this.game.events.on('dpr-resize', this.onDprResize, this);
    this.game.events.off('zoom-settings', this.onZoomSettings, this);
    this.game.events.on('zoom-settings', this.onZoomSettings, this);
    // Punch light cut-outs after Camera.preRender so scroll/midPoint match this frame.
    this.events.off('prerender', this.onLightingPrerender, this);
    this.events.on('prerender', this.onLightingPrerender, this);

    // Initial wildlife — always outside the camp yard (legacy spawnInBase).
    const starters: { sp: 'boar' | 'deer' | 'fox' | 'rat'; minD: number; maxD: number }[] = [
      { sp: 'boar', minD: 420, maxD: 700 },
      { sp: 'boar', minD: 420, maxD: 700 },
      { sp: 'deer', minD: 450, maxD: 900 },
      { sp: 'fox', minD: 480, maxD: 900 },
      { sp: 'rat', minD: 400, maxD: 800 },
      { sp: 'rat', minD: 400, maxD: 800 },
    ];
    for (const s of starters) {
      const spot = this.animals.findEnemySpawn(this.player.x, this.player.y, s.minD, s.maxD, 22);
      if (spot) this.animals.spawn(s.sp, spot.x, spot.y, { threatM: 0 });
    }

    this.groundLayer.sync(this.cameras.main);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  wireUi() {
    const ui = this.ui;
    ui.onCardPick = (card) => {
      const beforeUnique = card.kind === 'weapon' || card.kind === 'element'
        ? this.arsenal.isUnique(card.id)
        : false;
      this.arsenal.applyCard(card, this.player);
      if (
        (card.kind === 'weapon' || card.kind === 'element') &&
        !beforeUnique &&
        this.arsenal.isUnique(card.id)
      ) {
        const name = this.arsenal.uniqueName(card.id);
        const el = this.arsenal.weaponElements[card.id];
        const col = (el && ELEMENTS[el]?.color) || '#ffe08a';
        this.ui.banner('Unique unlocked!', name || card.id, col, {
          iconId: el || card.id,
        });
        Audio.playSfx('upgrade', 0.7);
        this.vfx?.sparkle(this.player.x, this.player.y, col);
      } else {
        Audio.playSfx('upgrade');
      }
      if (this.arsenal.weaponOrder.length >= MAX_WEAPONS) {
        this.tryUnlockAchievement('full_kit');
      }
      recomputePlayerStats(this.player, this.arsenal, this.metaBonuses);
      this.applyMutatorPlayerMods();
      this.closeLevelUp();
    };
    ui.onCardBanish = (card) => {
      if (this.player.banishesLeft <= 0) return;
      this.player.banishesLeft--;
      this.arsenal.banishCard(card);
      this.currentCards = this.arsenal.rollCards(5);
      ui.showLevelUpCards(
        this.currentCards,
        this.player.rerollsLeft,
        this.player.banishesLeft,
        this.arsenal,
        this.player,
      );
    };
    ui.onCardReroll = () => {
      if (this.player.rerollsLeft <= 0) return;
      this.player.rerollsLeft--;
      this.currentCards = this.arsenal.rollCards(5);
      ui.showLevelUpCards(
        this.currentCards,
        this.player.rerollsLeft,
        this.player.banishesLeft,
        this.arsenal,
        this.player,
      );
    };
    ui.onQuitRun = () => this.endRun(false);
    ui.onSaveQuit = () => this.saveAndQuitToMenu();
    this.animals.onBeastKilled = (a) => this.onBeastKilledMeta(a);
    ui.onUpgradeCamp = (id) => this.tryCampUpgrade(id);
    ui.onBuyShop = (i) => this.tryBuyShop(i);
    ui.onSmithReroll = () => {
      if (!this.camp.contains(this.player.x, this.player.y, 30)) {
        ui.setTip('Return to camp to reroll');
        return;
      }
      const cost = this.camp.smithRerollCost();
      if (this.camp.rerollShop(this.player)) {
        this.floatText.spawn(
          this.player.x,
          this.player.y - 64,
          `Forge rerolled (−${cost}g)`,
          '#ffe066',
          15,
          { life: 1.1 },
        );
        ui.invalidateCampPanel();
        ui.refreshCampPanel(this.camp, this.player, true);
      } else {
        ui.setTip(`Need ${cost} gold to reroll`);
      }
    };
    ui.onPauseToggle = () => this.togglePause();
    ui.onMuteToggle = () => {
      Audio.setMuted(!Audio.muted);
      ui.refreshMuteBtn();
    };
    ui.onRestartRun = () => {
      this.scene.restart();
    };
    ui.onQuitRun = () => this.endRun(false);
    ui.onSaveQuit = () => this.saveAndQuitToMenu();
    ui.onTutorialDismiss = () => this.dismissTutorial();
    ui.onCoachWorldRect = (key) => this.coachWorldRect(key);
  }

  /** Pause → Save & Quit: keep continue checkpoint and return to the main menu. */
  private saveAndQuitToMenu() {
    this.checkpointSave();
    this.paused = true;
    this.ui.hidePause();
    this.ui.hideLevelUp();
    this.ui.hideCampShop();
    this.ui.cancelConfirm();
    this.ui.banner('Run saved', 'Continue from the main menu anytime.', '#7fd3ff');
    this.scene.start('MenuScene');
  }

  /** Codex + achievements from beast kills. */
  private onBeastKilledMeta(a: { species: string; trueBoss?: boolean; bossMoves?: BossAbilityId[] }) {
    const discovered = meta.discoverSpecies(a.species);
    if (discovered) {
      const name = SPECIES[a.species]?.name || a.species;
      this.ui.setTip(`Codex: ${name} discovered (+${discovered.credits})`);
      const n = meta.discoveredSpecies.length;
      if (n >= 5) this.tryUnlockAchievement('bestiary_5');
      if (n >= 12) this.tryUnlockAchievement('bestiary_12');
    }
    this.tryUnlockAchievement('first_blood');
    if (a.trueBoss) {
      this.tryUnlockAchievement('true_boss');
      for (const id of a.bossMoves || []) this.noteBossMoveDiscover(id);
    }
  }

  private noteBossMoveDiscover(id: BossAbilityId) {
    const got = meta.discoverBossMove(id);
    if (got) this.ui.setTip(`Codex: boss move logged (+${got.credits})`);
  }

  private tryUnlockAchievement(id: AchievementId) {
    const got = meta.unlockAchievement(id);
    if (!got) return;
    this.arsenal.achievements = [...meta.achievements];
    const unlockBits: string[] = [];
    for (const wid of got.unlockWeapons) {
      unlockBits.push(WEAPON_DEFS[wid]?.name || wid);
    }
    for (const pid of got.unlockPassives) {
      unlockBits.push(PASSIVE_DEFS[pid]?.name || pid);
    }
    const sub = unlockBits.length
      ? `+${got.credits} credits · Unlocked: ${unlockBits.join(', ')}`
      : `+${got.credits} credits`;
    this.ui.banner(`Achievement: ${got.name}`, sub, '#ffe08a', { iconId: id });
  }

  private checkRaidAchievements() {
    const n = this.player.raidsSurvived;
    if (n >= 3) this.tryUnlockAchievement('raid_3');
    if (n >= 6) this.tryUnlockAchievement('raid_6');
  }

  /** Screen-space rect for world coach targets (dash bar / first-hit beast). */
  private coachWorldRect(key: string): { x: number; y: number; w: number; h: number } | null {
    if (!this.cameras?.main) return null;
    if (key === 'playerDash') {
      if (!this.player) return null;
      return this.worldToCoachRect(this.player.x, this.player.y + 10, 32, 10);
    }
    if (key === 'hitBeast') {
      const focus = this.tutorBeastFocus;
      if (!focus) return null;
      // Body sits above feet; pad enough to cover stars / element orbs.
      const r = Math.max(18, focus.radius);
      const w = r * 2.8;
      const h = r * 3.2;
      return this.worldToCoachRect(focus.x, focus.y - r * 0.85, w, h);
    }
    return null;
  }

  private worldToCoachRect(
    cx: number,
    cy: number,
    worldW: number,
    worldH: number,
  ): { x: number; y: number; w: number; h: number } | null {
    const cam = this.cameras.main;
    const canvas = this.game.canvas;
    const crect = canvas.getBoundingClientRect();
    const wv = cam.worldView;
    if (wv.width <= 0 || wv.height <= 0 || crect.width <= 0) return null;
    const toScreen = (wx: number, wy: number) => ({
      x: crect.left + ((wx - wv.x) / wv.width) * crect.width,
      y: crect.top + ((wy - wv.y) / wv.height) * crect.height,
    });
    const tl = toScreen(cx - worldW / 2, cy - worldH / 2);
    const br = toScreen(cx + worldW / 2, cy + worldH / 2);
    return {
      x: Math.min(tl.x, br.x),
      y: Math.min(tl.y, br.y),
      w: Math.max(28, Math.abs(br.x - tl.x)),
      h: Math.max(16, Math.abs(br.y - tl.y)),
    };
  }

  /** Coach: spotlight the first beast the player damages. */
  private onPlayerHitBeast(a: { x: number; y: number; radius: number; dead?: boolean }) {
    if (!settings.shouldShowTutorial('enemy')) return;
    if (this.tutorialsShownThisRun.has('enemy')) return;
    if (!this.tutorBeastFocus) {
      this.tutorBeastFocus = { x: a.x, y: a.y, radius: a.radius };
    }
    this.offerTutorial('enemy');
  }

  tryCampUpgrade(id: string) {
    if (!this.camp.contains(this.player.x, this.player.y, 30)) {
      this.ui.setTip('Return to camp to build');
      this.floatText.spawn(this.player.x, this.player.y - 64, 'Return to camp to build', '#ff9f8a', 14, { life: 0.9 });
      return false;
    }
    const prevSmith = this.camp.levels.blacksmith || 0;
    if (this.camp.tryUpgrade(id, this.player)) {
      this.player.campUpgrades++;
      const def = UPGRADES.find((u) => u.id === id);
      const riskWarn: Record<string, { title: string; sub: string; color: string }> = {
        predators_bait: {
          title: "Predator's Bait — RISK ACCEPTED",
          sub: 'Richer XP… but the forest hunts you harder. Beasts are faster and hungrier.',
          color: '#ff6b6b',
        },
        forest_beckons: {
          title: 'The Forest Beckons — RISK ACCEPTED',
          sub: 'Power surges through you… every minute, a stronger wave answers the call.',
          color: '#ff8a3d',
        },
        cursed_totem: {
          title: 'Cursed Totem — RISK ACCEPTED',
          sub: 'Loot overflows… but the dead leave poison shrines that slow and sicken.',
          color: '#9b7bde',
        },
      };
      const risk = riskWarn[id];
      if (risk) {
        this.ui.banner(risk.title, risk.sub, risk.color, { iconId: id });
        this.floatText.spawn(
          this.player.x,
          this.player.y - 74,
          `${def?.name || id}!`,
          risk.color,
          22,
          { life: 1.5, vy: -36 },
        );
        Audio.playSfx('howl', 0.85);
      } else {
        this.floatText.spawn(
          this.player.x,
          this.player.y - 74,
          `${def?.name || id} ${this.camp.levels[id]}!`,
          '#9ef08a',
          22,
          { life: 1.3, vy: -36 },
        );
      }
      this.ui.invalidateCampPanel();
      this.ui.refreshCampPanel(this.camp, this.player, true);
      if (id === 'blacksmith' && prevSmith === 0) this.offerTutorial('smith');
      return true;
    }
    return false;
  }

  tryBuyShop(i: number) {
    if (!this.camp.contains(this.player.x, this.player.y, 30)) {
      this.ui.setTip('Return to camp to buy');
      return;
    }
    const item = this.camp.buyShop(i, this.player);
    if (item) {
      equipItem(this.player, item, this.arsenal, this.metaBonuses);
      this.applyMutatorPlayerMods();
      this.floatText.spawn(this.player.x, this.player.y - 60, item.name, item.color, 16, { life: 1.2 });
      this.ui.invalidateCampPanel();
      this.ui.refreshCampPanel(this.camp, this.player, true);
    } else {
      this.ui.setTip('Cannot buy — check resources / camp');
    }
  }

  togglePause() {
    if (this.won) return;
    if (this.levelUpOpen) return;
    if (this.ui.isTutorialOpen()) {
      this.dismissTutorial();
      return;
    }
    if (this.ui.isConfirmOpen()) {
      this.ui.cancelConfirm();
      return;
    }
    if (this.ui.isOptionsOpen()) {
      this.ui.hideOptions();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.ui.hidePause();
    } else if (this.player.alive) {
      this.paused = true;
      this.checkpointSave();
      this.ui.showPause(
        this.player,
        this.arsenal,
        () => {
          this.paused = false;
          this.ui.hidePause();
        },
        {
          camp: this.camp,
          day: this.dayNight,
          runTime: this.dayNight.runTime,
        },
      );
    }
  }

  private onJoyDown(pointer: Phaser.Input.Pointer) {
    if (this.paused || this.levelUpOpen || !this.player.alive) return;
    if (this.joy.active) return;
    // Ignore UI clicks (DOM overlays sit above the canvas).
    if ((pointer.event?.target as HTMLElement | undefined)?.closest?.('#dom-ui')) return;
    this.joy.active = true;
    this.joy.id = pointer.id;
    this.joy.ox = this.joy.x = pointer.x;
    this.joy.oy = this.joy.y = pointer.y;
  }

  private onJoyMove(pointer: Phaser.Input.Pointer) {
    if (!this.joy.active || pointer.id !== this.joy.id) return;
    this.joy.x = pointer.x;
    this.joy.y = pointer.y;
  }

  private onJoyUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.joy.id) this.joy.active = false;
  }

  /** Spotlight coach — pauses the run and highlights a HUD target. */
  offerTutorial(id: string) {
    if (!settings.shouldShowTutorial(id)) return false;
    if (this.tutorialsShownThisRun.has(id)) return false;
    if (!COACH_STEPS[id]) return false;
    if (!this.player.alive) return false;
    // Vanilla has no camp / resources HUD — skip fortify / smith / resources coach.
    if (
      this.mutatorFx.noCamp &&
      (id === 'build' || id === 'smith' || id === 'resources')
    ) {
      return false;
    }
    if (this.tutorialOpen || this.ui.isTutorialOpen()) {
      if (!this.tutorialQueue.includes(id)) this.tutorialQueue.push(id);
      return false;
    }
    this.tutorialsShownThisRun.add(id);
    this.tutorialOpen = id;
    if (!this.paused && !this.levelUpOpen) {
      this.tutorialSilentPause = true;
      this.paused = true;
    } else {
      this.tutorialSilentPause = false;
    }
    const def = COACH_STEPS[id];
    if (
      !this.mutatorFx.noCamp &&
      (def.prepare === 'camp' || def.prepare === 'smith')
    ) {
      this.ui.setCampPanelOpen(true);
      this.ui.setCampSmithTab(def.prepare === 'smith');
      this.ui.refreshCampPanel(
        this.camp,
        this.player,
        this.camp.contains(this.player.x, this.player.y, 30),
      );
    }
    this.ui.showTutorial(id);
    Audio.playSfx('click');
    return true;
  }

  dismissTutorial() {
    if (!this.tutorialOpen && !this.ui.isTutorialOpen()) return;
    this.tutorialOpen = null;
    this.ui.hideTutorial();
    if (this.tutorialSilentPause && this.paused && !this.levelUpOpen) {
      this.tutorialSilentPause = false;
      this.paused = false;
    }
    this.tutorialSilentPause = false;

    if (this.pendingLevelUpAfterTutor) {
      this.pendingLevelUpAfterTutor = false;
      this.openLevelUp();
      return;
    }

    while (this.tutorialQueue.length) {
      const next = this.tutorialQueue.shift()!;
      if (this.offerTutorial(next)) return;
    }
  }

  private canOfferTutorial(id: string) {
    return settings.shouldShowTutorial(id) && !this.tutorialsShownThisRun.has(id);
  }

  /** Fire coach steps when the player hits first-time milestones. */
  private updateTutorials() {
    if (!settings.tutorialsEnabled) return;
    if (this.paused || this.levelUpOpen) return;
    if (this.tutorialOpen || this.ui.isTutorialOpen()) return;

    const p = this.player;

    // 1) Controls — shortly after the run begins.
    if (this.canOfferTutorial('controls') && this.tutRunAge >= 2.2) {
      this.offerTutorial('controls');
      return;
    }

    // 2) First XP shard collected.
    if (this.canOfferTutorial('xp') && (p.xp > 0 || p.level > 1)) {
      this.offerTutorial('xp');
      return;
    }

    // 3) First resource into the bag.
    if (
      this.canOfferTutorial('resources') &&
      p.woodCollected + p.meatCollected + p.goldCollected > 0
    ) {
      this.offerTutorial('resources');
      return;
    }

    // 4) Know your beasts — triggered on first weapon hit (see onPlayerHitBeast).

    // 5) Dash charges after the first dash.
    if (this.canOfferTutorial('dash') && this.tutDashSeen) {
      this.offerTutorial('dash');
      return;
    }

    // 6) Loadout once a second weapon / passive exists, or axe is upgraded.
    if (this.canOfferTutorial('loadout')) {
      const weapons = this.arsenal.weaponOrder.length;
      const passives = Object.keys(this.arsenal.passives).filter((k) => (this.arsenal.passives[k] || 0) > 0)
        .length;
      const axeLv = this.arsenal.weapons.axe || 0;
      if (weapons > 1 || passives > 0 || axeLv > 1) {
        this.offerTutorial('loadout');
        return;
      }
    }

    // 7) Can afford a basic fortification.
    if (this.canOfferTutorial('build')) {
      const walls = UPGRADES.find((u) => u.id === 'walls');
      const towers = UPGRADES.find((u) => u.id === 'towers');
      const can = (u: (typeof UPGRADES)[number] | undefined, lv: number) => {
        if (!u || lv >= u.max) return false;
        const cost = upgradeCost(u, lv);
        return (
          p.wood >= (cost.wood || 0) &&
          p.meat >= (cost.meat || 0) &&
          p.gold >= (cost.gold || 0)
        );
      };
      if (can(walls, this.camp.levels.walls || 0) || can(towers, this.camp.levels.towers || 0)) {
        this.offerTutorial('build');
        return;
      }
    }

    // 8) Threat climbing — after the first night or when threat ramps.
    if (this.canOfferTutorial('threat')) {
      const threat = this.runThreat();
      if (this.dayNight.dayNumber >= 2 || threat.hp >= 1.25) {
        this.offerTutorial('threat');
      }
    }
  }

  /** Threat scaled by active mutators (Savage). */
  private runThreat() {
    const base = threatAt(this.dayNight.runTime);
    const mul = this.mutatorFx.threatMult;
    if (mul === 1) return base;
    return {
      m: base.m * mul,
      hp: base.hp * mul,
      dmg: base.dmg * mul,
      speed: Math.min(1.5, base.speed * (1 + (mul - 1) * 0.35)),
    };
  }

  /** Re-apply Glass (etc.) after `recomputePlayerStats` rebuilds base numbers. */
  private applyMutatorPlayerMods(fillHp = false) {
    const fx = this.mutatorFx;
    if (fx.playerHpMult !== 1) {
      this.player.maxHp = Math.max(20, Math.round(this.player.maxHp * fx.playerHpMult));
      if (fillHp) this.player.hp = this.player.maxHp;
      else this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    }
    if (fx.playerDmgMult !== 1) this.player.damageMult *= fx.playerDmgMult;
  }

  /** Legacy Game.onLevelUp — apply +10 max HP / level, FX, then offer cards. */
  onPlayerLevelUp() {
    const p = this.player;
    recomputePlayerStats(p, this.arsenal, this.metaBonuses);
    this.applyMutatorPlayerMods();
    this.floatText.spawn(p.x, p.y - 90, `LEVEL ${p.level}!`, '#ffd23f', 26, { life: 1.6, vy: -30 });
    this.floatText.spawn(p.x, p.y - 112, '+10 Max HP', '#9ef08a', 14, { life: 1.2, vy: -24 });
    this.vfx?.ring(p.x, p.y, 'rgba(255,210,63,0.95)', 10, 260, 0.6);
    if (this.canOfferTutorial('levelup')) {
      this.pendingLevelUpAfterTutor = true;
      this.offerTutorial('levelup');
      return;
    }
    this.openLevelUp();
  }

  openLevelUp() {
    this.levelUpOpen = true;
    this.paused = true;
    Audio.playSfx('levelup');
    this.currentCards = this.arsenal.rollCards(5);
    this.ui.showLevelUpCards(
      this.currentCards,
      this.player.rerollsLeft,
      this.player.banishesLeft,
      this.arsenal,
      this.player,
    );
  }

  closeLevelUp() {
    this.levelUpOpen = false;
    this.paused = false;
    this.ui.hideLevelUp();
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(0.05, dtMs / 1000);
    this.handleHotkeys();
    Music.sync({
      state: !this.player.alive ? 'gameover' : 'playing',
      animals: this.animals?.animals,
    });

    if (this.paused || !this.player.alive) {
      // Keep float text / VFX alive during level-up pause.
      if (this.levelUpOpen) {
        this.floatText.update(dt);
        this.vfx.update(dt);
      }
      if (!this.player.alive && !this.ui.gameOverEl.classList.contains('hidden')) return;
      return;
    }

    this.updatePlayer(dt);
    this.updateTutorials();
    if (this.graceLeft > 0) this.graceLeft = Math.max(0, this.graceLeft - dt);
    this.tutRunAge += dt;
    this.saveAcc += dt;
    if (this.saveAcc >= 90) {
      this.saveAcc = 0;
      this.checkpointSave();
    }
    const threat = this.runThreat();
    const dayEvt = this.dayNight.update(dt);
    this.handleDayEvents(dayEvt, threat);
    if (this.won) return;

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
      this.graceLeft,
      () => {
        this.ui.setTip(
          this.mutatorFx.huntPlayerOnly
            ? 'Night raid — they hunt you!'
            : 'Night raid — defend the camp!',
        );
      },
    );
    {
      const focus = this.camp.raidFocus(this.player);
      this.assault.update(
        dt,
        this.animals,
        focus.x,
        focus.y,
        this.world.w,
        this.world.h,
        threat.m,
        threat.hp,
        this.dayNight.isNight,
        // Hold daytime assaults while a night raid is active (legacy raid.active).
        this.camp.raidActive,
        // Hold assaults during start-of-run grace.
        this.graceLeft,
        (title, sub, color, topSpecies) => {
          const pills = this.ui.speciesPillsHtml(topSpecies || []);
          this.ui.banner(title, sub, color, {
            iconId: 'world_assaults',
            ...(pills ? { subHtml: `${sub} ${pills}` } : {}),
          });
        },
      );
    }
    this.animals.update(
      dt,
      this.player,
      this.combat.pickups,
      this.combat.pools,
      threat.m,
      this.dayNight.isNight,
      this.dayNight.dayNumber,
      this.graceLeft,
    );
    this.combat.update(dt, this.player);
    this.world.updateTrees(dt, this.player.x, this.player.y);
    {
      const moving = Math.hypot(this.player.vx, this.player.vy) > 40 || this.player.dashT > 0;
      this.world.rustleBushes(this.player.x, this.player.y, 16, moving);
    }
    this.floatText.update(dt);
    this.vfx.update(dt);
    this.groundLayer.sync(this.cameras.main);
    this.cullWorldSprites();
    this.syncPickups();
    // Containers draw in list order, not child depth — re-sort like legacy vis.sort(y).
    this.worldLayer.sort('depth');
    this.pendingLights.length = 0;
    if (this.player.alive) {
      this.pendingLights.push({
        x: this.player.x,
        y: this.player.y - 15,
        r: 200,
        intensity: 1,
        warm: false,
      });
    }
    this.camp.collectLights(this.pendingLights, this.dayNight.runTime);
    // Legacy warm dusk/dawn wash.
    const p = this.dayNight.clock;
    const dusk =
      p >= 0.6 - 0.05 && p < 0.68 ? 1 - Math.abs(p - (0.6 + 0.02)) / 0.07 : 0;
    const dawn = p >= 0.95 ? 1 - Math.abs(p - (0.95 + 0.025)) / 0.03 : 0;
    this.pendingDuskTint = Math.max(0, Math.min(1, Math.max(dusk, dawn)));
    this.edges.update(
      this.cameras.main,
      this.camp.x,
      this.camp.y,
      this.player.x,
      this.player.y,
      this.animals.animals,
      !this.mutatorFx.noCamp,
    );
    this.ui.updateHud(this.player, this.dayNight, this.camp, this.arsenal, dt);
    this.ui.updateEventHud(this.graceLeft);
    this.ui.refreshCampPanel(
      this.camp,
      this.player,
      this.camp.contains(this.player.x, this.player.y, 30),
    );
    this.syncBossHud();

    if (!this.player.alive) {
      this.shake(0.7);
      this.endRun(true);
    }
    if (!this.mutatorFx.noCamp && this.camp.hp <= 0) {
      this.shake(0.8);
      this.ui.banner('Camp destroyed!', 'The cabin has fallen.', '#ff6b6b');
      this.player.alive = false;
      this.endRun(true);
    }
  }

  /**
   * Adaptive zoom × DPR × Options zoomScale.
   * Always use the canvas CSS size (or window) — never `scale.width / dpr`,
   * which disagrees with the real viewport when the buffer/CSS pairing drifts
   * and was making Apply jump the camera vs run-start.
   */
  private applyCameraZoom(cssW?: number, cssH?: number) {
    if (!this.sys?.isActive() || !this.cameras?.main) return;
    const canvas = this.game.canvas;
    const w =
      cssW && cssW > 0
        ? cssW
        : canvas?.clientWidth > 0
          ? canvas.clientWidth
          : window.innerWidth;
    const h =
      cssH && cssH > 0
        ? cssH
        : canvas?.clientHeight > 0
          ? canvas.clientHeight
          : window.innerHeight;
    const zoom = cameraZoom(w, h);
    const cam = this.cameras.main;
    // Absolute zoom from settings — never multiply the current camera.zoom.
    cam.setZoom(zoom);
    cam.setRoundPixels(true);
    // Snap follow target after big zoom jumps so lerp doesn't leave a drifted frame.
    if (this.playerSprite?.active) {
      cam.centerOn(this.playerSprite.x, this.playerSprite.y);
    }
    this.lighting?.resize(this.scale.width, this.scale.height);
  }

  /**
   * Screen shake (legacy addShake / trauma).
   * Options shakeScale: 0% = off; amplitude scales linearly so 5% vs 100% is obvious.
   * Base amp is halved vs the old curve so 100% feels moderate.
   */
  shake(intensity = 0.25) {
    const scale = Number.isFinite(settings.shakeScale) ? settings.shakeScale : 1;
    if (scale <= 0.001) return;
    const amount = Math.max(0, intensity);
    if (amount <= 0.001) return;
    // Duration from event strength; amplitude fully gated by the option %.
    const duration = 140 + amount * 240;
    const amp = (0.0025 + amount * 0.018) * 0.5 * scale;
    this.cameras.main.shake(duration, amp);
  }

  private handleHotkeys() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC) || Phaser.Input.Keyboard.JustDown(this.keys.P)) {
      if (this.ui.isConfirmOpen()) {
        this.ui.cancelConfirm();
        return;
      }
      this.togglePause();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      Audio.setMuted(!Audio.muted);
      this.ui.refreshMuteBtn();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.F) && this.player.alive) {
      this.faceNearest = !this.faceNearest;
      this.ui.banner(
        this.faceNearest ? 'Aim lock ON' : 'Aim lock OFF',
        this.faceNearest ? 'Weapons track the closest threat' : 'Facing follows movement',
        this.faceNearest ? '#7fd3ff' : '#c8b8a0',
      );
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) && this.levelUpOpen) {
      this.ui.onCardReroll?.();
    }
    if (
      this.player.alive &&
      !this.levelUpOpen &&
      !this.paused &&
      Phaser.Input.Keyboard.JustDown(this.keys.E)
    ) {
      this.tryInteractPoi();
    }
    if (
      !this.mutatorFx.noCamp &&
      (Phaser.Input.Keyboard.JustDown(this.keys.B) || Phaser.Input.Keyboard.JustDown(this.keys.U)) &&
      this.player.alive &&
      !this.levelUpOpen &&
      !this.paused
    ) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.B)) {
        this.ui.setCampPanelOpen(true);
        this.ui.setCampSmithTab(true);
      } else {
        this.ui.toggleCampPanel();
      }
      if (this.ui.isCampOpen()) {
        this.ui.refreshCampPanel(
          this.camp,
          this.player,
          this.camp.contains(this.player.x, this.player.y, 30),
        );
      }
    }
    if (this.levelUpOpen) {
      const cardKeys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE];
      for (let i = 0; i < cardKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(cardKeys[i]) && this.currentCards[i]) {
          this.ui.onCardPick?.(this.currentCards[i]);
        }
      }
      return;
    }
    if (!this.paused && this.player.alive && this.ui.isCampOpen()) {
      const upgKeys = [
        this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE,
        this.keys.SIX, this.keys.SEVEN, this.keys.EIGHT, this.keys.NINE,
      ];
      const parents = buildParentUpgrades();
      for (let i = 0; i < upgKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(upgKeys[i]) && parents[i]) {
          this.tryCampUpgrade(parents[i].id);
        }
      }
    }
  }

  private handleDayEvents(
    dayEvt: ReturnType<DayNightSystem['update']>,
    threat: ReturnType<typeof threatAt>,
  ) {
    if (dayEvt.leftNight || dayEvt.newDay) {
      const survived = this.camp.hp > 0 && this.camp.pendingRaidCredit;
      const nightJustCleared = this.camp.assaultNight;
      const reward = this.camp.resolveDawnSurvival(this.player);
      // Legacy Base.onDawn — full cabin + palisade repair whenever night ends.
      this.camp.onDawn();
      if (survived) this.animals.retreatRaiders();
      if (reward) {
        if (this.mutatorFx.xpOnlyLoot) {
          const wave = nightJustCleared || 1;
          const xp = 20 + 12 * wave;
          this.combat.spawnPickup('xp', this.player.x, this.player.y - 20, xp);
          this.ui.banner('Night survived!', `+${xp} XP`, '#9ef08a', {
            iconId: 'world_raids',
          });
        } else {
          this.ui.banner('Raid repelled!', `Reward: +${reward.wood} wood, +${reward.gold} gold`, '#9ef08a', {
            iconId: 'world_raids',
          });
        }
        this.checkRaidAchievements();
      }
      const goalN = winGoalNights(this.winGoal);
      if (survived && goalN > 0 && nightJustCleared === goalN && !this.won) {
        this.won = true;
        this.endRunVictory();
        return;
      }
      if (dayEvt.newDay && this.dayNight.dayNumber > 1 && !this.won) {
        this.reshuffleForestLandmarks();
        const intro = this.mutatorFx.noCamp
          ? survived
            ? 'You survived the night. '
            : ''
          : survived
            ? 'Raiders retreat. '
            : 'Camp repaired. ';
        const landmarks = this.mutatorFx.xpOnlyLoot
          ? 'dens, wagons & shrines move'
          : 'dens, wagons, shrines & veins move';
        this.ui.banner(
          'The forest has shifted',
          `Day ${this.dayNight.dayNumber} — ${landmarks}. ${intro}Threat x${threat.hp.toFixed(1)}.`,
          '#a8e6ff',
        );
      }
      this.checkpointSave();
    }
    if (dayEvt.enteredDusk) {
      const day = this.dayNight.dayNumber;
      this.camp.prepareRaidFronts(day);
      const dirs = this.camp.raidDirections();
      Audio.playSfx('horn');
      const solo = this.mutatorFx.huntPlayerOnly;
      if (isBossNight(day)) {
        this.ui.banner(
          'Boss night approaches!',
          solo
            ? `A true boss leads the raid from the ${dirs}. Survive!`
            : `A true boss leads the raid from the ${dirs}. Fortify the camp!`,
          '#ff4d6d',
          { iconId: 'true_boss' },
        );
      } else {
        this.ui.banner(
          'Dusk falls...',
          solo
            ? `Raiders gather to the ${dirs}. They hunt you!`
            : `Raiders gather to the ${dirs}. Get back to camp!`,
          '#ffb36b',
          { iconId: 'world_daynight' },
        );
      }
      if (day === 1) this.offerTutorial('firstNight');
      this.checkpointSave();
    }
    if (dayEvt.enteredNight) {
      Audio.playSfx('howl');
      this.camp.startNightRaid(
        this.dayNight.dayNumber,
        this.animals,
        threat.m,
        this.graceLeft,
        this.player,
      );
      this.checkpointSave();
    }
  }

  private syncBossHud() {
    const bosses: {
      uid: number;
      species: string;
      variant?: string;
      name: string;
      hp: number;
      maxHp: number;
      trueBoss?: boolean;
      element?: string | null;
      bossMoves?: BossAbilityId[];
      elemMoves?: string[];
    }[] = [];
    for (const a of this.animals.animals) {
      if (a.dead || !a.boss || a.hp <= 0) continue;
      bosses.push({
        uid: a.uid,
        species: a.species,
        variant: a.variant,
        name: a.displayName || BOSS_NAMES[a.species] || a.species,
        hp: a.hp,
        maxHp: a.maxHp,
        trueBoss: a.trueBoss,
        element: a.element,
        bossMoves: a.trueBoss && a.bossMoves?.length ? a.bossMoves : undefined,
        elemMoves: a.elemMoves?.length ? a.elemMoves : undefined,
      });
    }
    // True bosses first, then highest max HP — stable left→right order.
    bosses.sort((p, q) => {
      if (!!q.trueBoss !== !!p.trueBoss) return q.trueBoss ? 1 : -1;
      if (q.maxHp !== p.maxHp) return q.maxHp - p.maxHp;
      return p.uid - q.uid;
    });
    this.ui.updateBossHud(bosses);
  }

  updatePlayer(dt: number) {
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);

    // Legacy dash charge regen — fill next segment while recharging.
    if (p.dashCd > 0) {
      p.dashCd -= dt;
      if (p.dashCd <= 0) {
        p.dashCd = 0;
        if (p.dashCharges < p.dashMax) {
          p.dashCharges++;
          if (p.dashCharges < p.dashMax) p.dashCd = p.dashCdMax;
        }
      }
    }

    let mx = 0;
    let my = 0;
    if (this.keys.A.isDown) mx -= 1;
    if (this.keys.D.isDown) mx += 1;
    if (this.keys.W.isDown) my -= 1;
    if (this.keys.S.isDown) my += 1;
    // Legacy joystick blends with WASD (drag on canvas).
    if (this.joy.active) {
      const dx = this.joy.x - this.joy.ox;
      const dy = this.joy.y - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const k = Math.min(1, d / 55);
        mx += (dx / d) * k;
        my += (dy / d) * k;
      }
    }
    const moveLen = Math.hypot(mx, my);
    if (moveLen > 1) {
      mx /= moveLen;
      my /= moveLen;
    }

    // Legacy: Space keydown → tryDash (edge-triggered). Shift also accepted here.
    const dashPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SHIFT);
    if (dashPressed && p.alive && p.dashCharges > 0 && p.dashT <= 0) {
      Audio.playSfx('throw', 1.4);
      let dx = mx;
      let dy = my;
      if (Math.hypot(dx, dy) < 0.15) {
        dx = this.playerFacing;
        dy = 0;
      } else {
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
      }
      // Legacy Player.tryDash power — do not half this (prior port used 520).
      const power = 1040;
      p.vx = dx * power;
      p.vy = dy * power;
      p.dashT = 0.22;
      p.dashCharges--;
      this.tutDashSeen = true;
      if (p.dashCharges < p.dashMax && p.dashCd <= 0) p.dashCd = p.dashCdMax;
      p.invuln = Math.max(p.invuln, 0.22);
      if (Math.abs(dx) > 0.1) this.playerFacing = dx > 0 ? 1 : -1;
    }

    // Tick enemy-applied status (legacy Player.applySlow / applyPoison).
    if (p.slowT > 0) {
      p.slowT = Math.max(0, p.slowT - dt);
      if (p.slowT <= 0) p.slow = 0;
    }
    {
      const poisonTick = p.poisons.length ? tickDots(p.poisons, dt) : 0;
      const burnTick = p.burns.length ? tickDots(p.burns, dt) : 0;
      if (poisonTick > 0 && p.alive) {
        p.hp -= poisonTick;
        this.floatText.spawn(
          p.x + (Math.random() * 16 - 8),
          p.y - 36,
          String(Math.round(poisonTick)),
          '#6dd46a',
          13,
          { life: 0.55, vy: -24 },
        );
        this.vfx?.sparks(p.x, p.y - 8, 4, '#6dd46a');
        Audio.playSfx('hurt', 0.55);
      }
      if (burnTick > 0 && p.alive) {
        p.hp -= burnTick;
        p.burnT = Math.max(p.burnT || 0, 0.55);
        this.floatText.spawn(
          p.x + (Math.random() * 16 - 8),
          p.y - 34,
          String(Math.round(burnTick)),
          '#ff8a3d',
          13,
          { life: 0.5, vy: -22 },
        );
        this.vfx?.sparks(p.x, p.y - 6, 3, '#ff8a3d');
        Audio.playSfx('hurt', 0.5);
      }
      if ((poisonTick > 0 || burnTick > 0) && p.hp <= 0 && p.alive) {
        p.hp = 0;
        p.alive = false;
        Audio.playSfx('death');
      }
    }

    // moveMult already includes Wind Tonic (×1.65) via applyBuffMultipliers.
    const speed = p.speed * p.moveMult * (1 - clamp(p.slow, 0, 0.85));

    if (p.dashT > 0) {
      // Legacy dash lunge: move with current vx/vy, then exponential drag.
      p.dashT = Math.max(0, p.dashT - dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
    } else {
      // Legacy damp(..., 14, dt) toward wish direction (or 0).
      const wishX = mx || my ? (mx / (Math.hypot(mx, my) || 1)) * speed : 0;
      const wishY = mx || my ? (my / (Math.hypot(mx, my) || 1)) * speed : 0;
      p.vx = damp(p.vx, wishX, 14, dt);
      p.vy = damp(p.vy, wishY, 14, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if ((mx || my) && !this.faceNearest) p.aimAngle = Math.atan2(my, mx);
    }

    if (this.faceNearest) {
      const near = this.animals.nearest(p.x, p.y, 420);
      if (near) p.aimAngle = Math.atan2(near.y - p.y, near.x - p.x);
      else if (mx || my) p.aimAngle = Math.atan2(my, mx);
    }

    // Legacy player radius 13 — trees/rocks + buildings. Palisade blocks enemies only.
    this.world.moveEntity(p, 13);
    this.camp.collideStructures(p, 13);

    if (p.regen > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    }

    const moving = Math.hypot(p.vx, p.vy) > 12;
    if (Math.abs(p.vx) > 8) this.playerFacing = p.vx < 0 ? -1 : 1;
    if (moving) this.playerWalkTime += dt * 9;
    if (this.playerFlash > 0) this.playerFlash = Math.max(0, this.playerFlash - dt);
    this.redrawPlayer(moving ? 1 : 0);
    this.playerCanvas.setPosition(p.x, p.y, p.y);
  }

  private redrawPlayer(moveAmount = 0) {
    const p = this.player;
    const walkFrame = moveAmount > 0 ? (this.playerWalkTime * 2) | 0 : 0;
    const flashQ = this.playerFlash > 0 ? Math.ceil(this.playerFlash * 16) : 0;
    const invQ = p.invuln > 0 ? Math.ceil(p.invuln * 8) : 0;
    const hpQ = Math.round((p.hp / Math.max(1, p.maxHp)) * 20);
    const dashQ = Math.round(p.dashCharges * 4) + (p.dashCd > 0 ? Math.ceil(p.dashCd * 4) : 0);
    const poisoned = p.poisons.length > 0;
    const burning = p.burns.length > 0 || (p.burnT || 0) > 0;
    const slowed = p.slowT > 0 && p.slow > 0.05;
    const key = `${this.playerFacing}|${walkFrame}|${flashQ}|${invQ}|${hpQ}|${dashQ}|${poisoned ? 1 : 0}|${burning ? 1 : 0}|${slowed ? 1 : 0}|${p.alive ? 1 : 0}`;
    if (key === this.playerDrawKey) return;
    this.playerDrawKey = key;
    this.playerCanvas.clear();
    this.playerCanvas.withFeetOrigin((ctx) => {
      drawPlayer(ctx, {
        facing: this.playerFacing,
        walkTime: this.playerWalkTime,
        moveAmount,
        alive: p.alive,
        flash: this.playerFlash,
        invuln: p.invuln,
        hp: p.hp,
        maxHp: p.maxHp,
        dashCharges: p.dashCharges,
        dashMax: p.dashMax,
        dashCd: p.dashCd,
        dashCdMax: p.dashCdMax,
        poisoned,
        burning,
        slowed,
      });
    });
    this.playerCanvas.refresh();
  }

  cullWorldSprites() {
    const cam = this.cameras.main;
    const { x0: vx0, y0: vy0, x1: vx1, y1: vy1 } = cameraWorldBounds(cam, 120);

    for (const tree of this.world.trees) {
      const key = `t${tree.x | 0},${tree.y | 0}`;
      let vis = this.treeSprites.get(key);
      const onScreen = tree.x >= vx0 && tree.x <= vx1 && tree.y >= vy0 && tree.y <= vy1;
      if (!onScreen) {
        // Destroy off-camera props — keeping every explored tree forever tanks FPS.
        if (vis) {
          vis.body.destroy();
          vis.stump.destroy();
          vis.shadow.destroy();
          vis.bar.destroy();
          this.treeSprites.delete(key);
        }
        continue;
      }
      const bodyTex = tree.kind === 'pine' ? 'tree_pine' : 'tree_oak';
      if (!vis) {
        const shadow = this.add
          .image(tree.x + 9 * tree.size, tree.y + 1, 'tree_shadow')
          .setOrigin(0.5, 0.5)
          .setDepth(tree.y - 1)
          .setTint(0x000000)
          .setAlpha(0.22);
        const stump = this.add
          .image(tree.x, tree.y, 'tree_stump')
          .setOrigin(0.5, 1)
          .setDepth(tree.y)
          .setScale(Math.max(0.75, tree.size));
        const body = this.add
          .image(tree.x, tree.y, bodyTex)
          .setOrigin(0.5, 1)
          .setDepth(tree.y + 0.01);
        const bar = this.add.graphics().setVisible(false);
        this.worldLayer.add(shadow);
        this.worldLayer.add(stump);
        this.worldLayer.add(body);
        this.worldLayer.add(bar);
        vis = { body, stump, shadow, bar };
        this.treeSprites.set(key, vis);
      } else if (vis.body.texture.key !== bodyTex) {
        vis.body.setTexture(bodyTex);
      }

      const s = tree.size;
      const showStump = tree.state === 'stump' || tree.state === 'falling';
      const showBody = tree.state !== 'stump';
      const showShadow = tree.state !== 'stump';

      vis.stump
        .setVisible(showStump)
        .setPosition(tree.x, tree.y)
        .setDepth(tree.y)
        .setAlpha(1)
        .setRotation(0)
        .setScale(Math.max(0.75, s));

      if (tree.state === 'falling') {
        const t = Math.min(1, tree.fallT / TREE_FALL_TIME);
        // Legacy: stump stays put; canopy rotates (easeInQuad) and fades late.
        vis.body
          .setVisible(true)
          .setPosition(tree.x, tree.y)
          .setDepth(tree.y + 0.01)
          .setAlpha(1 - Math.max(0, (t - 0.7) / 0.3))
          .setRotation(t * t * Math.PI * 0.5 * tree.fallDir)
          .setScale(1);
        vis.shadow
          .setVisible(true)
          .setPosition(tree.x + 9 * s, tree.y + 1)
          .setDepth(tree.y - 1)
          .setRotation(0)
          .setScale(s)
          .setAlpha(0.22 * (1 - t));
      } else if (tree.state === 'growing') {
        const g = Math.min(1, tree.growT);
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const sc = Math.max(0.12, 1 + c3 * Math.pow(g - 1, 3) + c1 * Math.pow(g - 1, 2));
        vis.body
          .setVisible(true)
          .setPosition(tree.x, tree.y)
          .setDepth(tree.y + 0.01)
          .setAlpha(1)
          .setRotation(0)
          .setScale(sc);
        vis.shadow
          .setVisible(true)
          .setPosition(tree.x + 9 * s * sc, tree.y + 1)
          .setDepth(tree.y - 1)
          .setRotation(0)
          .setScale(s * sc)
          .setAlpha(0.22);
      } else if (showBody) {
        vis.body
          .setVisible(true)
          .setPosition(tree.x, tree.y)
          .setDepth(tree.y + 0.01)
          .setAlpha(1)
          .setRotation(0)
          .setScale(1);
        vis.shadow
          .setVisible(showShadow)
          .setPosition(tree.x + 9 * s, tree.y + 1)
          .setDepth(tree.y - 1)
          .setRotation(0)
          .setScale(s)
          .setAlpha(0.22);
      } else {
        vis.body.setVisible(false);
        vis.shadow.setVisible(false);
      }

      // Legacy: HP bar above canopy while damaged and alive.
      if (tree.state === 'alive' && tree.hp < tree.maxHp) {
        const canopyTop = tree.kind === 'pine' ? -80 * s : -84 * s;
        const barY = tree.y + canopyTop - 10;
        const w = 34;
        const frac = clamp(tree.hp / tree.maxHp, 0, 1);
        vis.bar.clear();
        vis.bar.setVisible(true).setDepth(tree.y + 0.5);
        vis.bar.fillStyle(0x140c08, 0.75);
        vis.bar.fillRoundedRect(tree.x - w / 2 - 1.5, barY - 1.5, w + 3, 7, 3.5);
        vis.bar.fillStyle(0x7ed957, 1);
        vis.bar.fillRoundedRect(tree.x - w / 2, barY, Math.max(2, w * frac), 4, 2);
      } else {
        vis.bar.setVisible(false);
      }
    }

    for (const rock of this.world.rocks) {
      const key = `r${rock.x | 0},${rock.y | 0}`;
      let spr = this.rockSprites.get(key);
      if (rock.dead) {
        if (spr) {
          spr.img.destroy();
          spr.bar.destroy();
          this.rockSprites.delete(key);
        }
        continue;
      }
      const onScreen = rock.x >= vx0 && rock.x <= vx1 && rock.y >= vy0 && rock.y <= vy1;
      if (!onScreen) {
        if (spr) {
          spr.img.destroy();
          spr.bar.destroy();
          this.rockSprites.delete(key);
        }
        continue;
      }
      if (!spr) {
        const base = rock.ore ? 'rock_ore' : 'rock';
        const tex =
          rock.variant > 0 && this.textures.exists(`${base}_${rock.variant}`)
            ? `${base}_${rock.variant}`
            : base;
        const img = this.add
          .image(rock.x, rock.y, tex)
          .setOrigin(0.5, 1)
          .setScale(rock.size)
          .setDepth(rock.y);
        const bar = this.add.graphics().setVisible(false);
        this.worldLayer.add(img);
        this.worldLayer.add(bar);
        spr = { img, bar };
        this.rockSprites.set(key, spr);
      }
      spr.img.setVisible(true).setPosition(rock.x, rock.y).setDepth(rock.y);
      // Legacy: gold ore HP bar above the rock while damaged.
      if (rock.ore && rock.hp < rock.maxHp) {
        const r = 15 * rock.size;
        const height = 11 * rock.size;
        const barY = rock.y - height - r - 6;
        const w = 30;
        const frac = clamp(rock.hp / rock.maxHp, 0, 1);
        spr.bar.clear();
        spr.bar.setVisible(true).setDepth(rock.y + 0.5);
        spr.bar.fillStyle(0x140c08, 0.75);
        spr.bar.fillRoundedRect(rock.x - w / 2 - 1.5, barY - 1.5, w + 3, 7, 3.5);
        spr.bar.fillStyle(0xffd54a, 1);
        spr.bar.fillRoundedRect(rock.x - w / 2, barY, Math.max(2, w * frac), 4, 2);
      } else {
        spr.bar.setVisible(false);
      }
    }

    for (const bush of this.world.bushes) {
      const onScreen = bush.x >= vx0 && bush.x <= vx1 && bush.y >= vy0 && bush.y <= vy1;
      const key = `b${bush.x | 0},${bush.y | 0}`;
      let spr = this.bushSprites.get(key);
      if (!onScreen) {
        if (spr) {
          spr.destroy();
          this.bushSprites.delete(key);
        }
        continue;
      }
      if (!spr) {
        const tex =
          bush.variant > 0 && this.textures.exists(`bush_${bush.variant}`)
            ? `bush_${bush.variant}`
            : 'bush';
        spr = this.add
          .image(bush.x, bush.y, tex)
          .setOrigin(0.5, 1)
          .setScale(bush.size)
          .setDepth(bush.y - 1);
        this.worldLayer.add(spr);
        this.bushSprites.set(key, spr);
      }
      // Legacy bush rustle — slight sway when walked through.
      const wob = bush.wobble > 0.01 ? Math.sin(this.dayNight.runTime * 28) * bush.wobble * 0.12 : 0;
      spr
        .setVisible(true)
        .setPosition(bush.x, bush.y)
        .setRotation(wob)
        .setDepth(bush.y - 1);
    }

    for (const poi of this.world.pois) {
      let spr = this.poiSprites.get(poi.id);
      if (poi.used) {
        if (spr) {
          spr.destroy();
          this.poiSprites.delete(poi.id);
        }
        continue;
      }
      const onScreen = poi.x >= vx0 && poi.x <= vx1 && poi.y >= vy0 && poi.y <= vy1;
      if (!onScreen) {
        if (spr) {
          spr.destroy();
          this.poiSprites.delete(poi.id);
        }
        continue;
      }
      if (!spr) {
        const def = POI_DEFS[poi.kind];
        const tex = this.textures.exists(def.tex) ? def.tex : 'rock';
        // Camp-scale bake (~cabin width); slight boost for presence.
        spr = this.add.image(poi.x, poi.y, tex).setOrigin(0.5, 1).setScale(1.05).setDepth(poi.y);
        this.worldLayer.add(spr);
        this.poiSprites.set(poi.id, spr);
      }
      spr.setVisible(true).setPosition(poi.x, poi.y).setDepth(poi.y).setAlpha(1);
    }

    this.syncPoiPrompt();
  }

  /** World-space [E] prompt when standing near a landmark. */
  private syncPoiPrompt() {
    if (!this.player?.alive || this.paused || this.levelUpOpen) {
      this.poiPrompt?.setVisible(false);
      return;
    }
    const poi = this.world.nearestPoi(this.player.x, this.player.y, POI_PROMPT_R);
    if (!poi) {
      this.poiPrompt?.setVisible(false);
      return;
    }
    const def = POI_DEFS[poi.kind];
    const inRange = Math.hypot(this.player.x - poi.x, this.player.y - poi.y) <= POI_INTERACT_R;
    if (!this.poiPrompt) {
      const keyBg = this.add
        .rectangle(0, 0, 168, 38, 0x1a140c, 0.9)
        .setStrokeStyle(2, 0xffe08a, 0.9);
      const keyLabel = this.add
        .text(-58, 0, 'E', {
          fontFamily: 'Trebuchet MS, Segoe UI, system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#1a140c',
          backgroundColor: '#ffe08a',
          padding: { x: 9, y: 3 },
        })
        .setOrigin(0.5);
      const nameLabel = this.add
        .text(-28, 0, '', {
          fontFamily: 'Trebuchet MS, Segoe UI, system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#f2e6d4',
        })
        .setOrigin(0, 0.5);
      this.poiPrompt = this.add.container(0, 0, [keyBg, keyLabel, nameLabel]);
      this.worldLayer.add(this.poiPrompt);
    }
    const nameLabel = this.poiPrompt.list[2] as Phaser.GameObjects.Text;
    nameLabel.setText(def.name);
    const bob = Math.sin(this.dayNight.runTime * 5) * 3;
    this.poiPrompt
      .setVisible(true)
      .setPosition(poi.x, poi.y - 128 + bob)
      .setDepth(poi.y + 40)
      .setAlpha(inRange ? 1 : 0.72);
  }

  /** E — activate nearest unused POI. */
  private tryInteractPoi() {
    const poi = this.world.nearestPoi(this.player.x, this.player.y, POI_INTERACT_R);
    if (!poi) {
      // Quiet deny when far — prompt only shows when close.
      return;
    }
    this.activatePoi(poi);
  }

  private activatePoi(poi: WorldPoi) {
    if (poi.used) return;
    poi.used = true;
    const def = POI_DEFS[poi.kind];
    const threat = this.runThreat();
    const p = this.player;

    if (poi.kind === 'den') {
      const pack = 3 + Math.floor(Math.random() * 2);
      const kinds = ['wolf', 'dire_wolf', 'boar', 'dire_boar'] as const;
      let n = 0;
      for (let i = 0; i < pack; i++) {
        const sp = kinds[Math.floor(Math.random() * kinds.length)];
        const ang = (i / pack) * Math.PI * 2 + rand(-0.2, 0.2);
        const d = rand(40, 90);
        const x = poi.x + Math.cos(ang) * d;
        const y = poi.y + Math.sin(ang) * d;
        const child = this.animals.spawn(sp, x, y, {
          threatM: threat.m,
          stars: 2 + Math.floor(Math.random() * 3),
          variant: sp.startsWith('dire_') ? 'dire' : Math.random() < 0.35 ? 'dire' : undefined,
        });
        if (child) n++;
      }
      this.ui.banner(def.name, `${n} elites pour out!`, def.color);
      Audio.playSfx('howl');
      this.vfx.sparks(poi.x, poi.y, 16, def.color);
    } else if (poi.kind === 'wagon') {
      if (this.mutatorFx.xpOnlyLoot) {
        const xp = 28 + Math.floor(p.level * 4);
        this.combat.spawnPickup('xp', poi.x, poi.y, xp);
        this.ui.banner(def.name, `+${xp} XP`, def.color);
      } else {
        this.combat.spawnPickup('wood', poi.x, poi.y, 18 + Math.floor(p.level * 1.5));
        this.combat.spawnPickup('meat', poi.x + 10, poi.y, 10 + Math.floor(p.level));
        this.combat.spawnPickup('gold', poi.x - 10, poi.y, 8 + Math.floor(p.level * 0.8));
        if (Math.random() < 0.45) {
          this.combat.spawnPickup('powerup', poi.x, poi.y + 8, 1, 'haste');
        }
        this.ui.banner(def.name, 'Supplies scattered!', def.color);
      }
      Audio.playSfx('gold');
      this.vfx.sparkle(poi.x, poi.y, def.color);
    } else if (poi.kind === 'shrine') {
      const roll = Math.random();
      if (roll < 0.34) {
        p.hp = p.maxHp;
        this.ui.banner(def.name, 'Full heal!', def.color);
        Audio.playSfx('eat');
      } else if (roll < 0.67) {
        const order = this.arsenal.weaponOrder;
        if (order.length) {
          const id = order[Math.floor(Math.random() * order.length)];
          this.arsenal.upgradeWeapon(id);
          this.ui.banner(def.name, `${id} +1 level`, def.color);
        } else {
          p.buffFury = Math.max(p.buffFury, 12);
          this.ui.banner(def.name, 'Fury blessing!', def.color);
        }
        Audio.playSfx('upgrade');
      } else {
        p.buffFury = Math.max(p.buffFury, 14);
        this.ui.banner(def.name, 'Fury blessing!', def.color);
        Audio.playSfx('horn');
      }
      this.vfx.ring(poi.x, poi.y, def.color, 20, 110, 0.55);
      recomputePlayerStats(p, this.arsenal, this.metaBonuses);
      this.applyMutatorPlayerMods();
    } else if (poi.kind === 'vein') {
      // Scatter gold chunks around the vein (no rock→ore conversion).
      const chunks = 5 + Math.floor(Math.random() * 3) + Math.floor(p.level / 4);
      let total = 0;
      for (let i = 0; i < chunks; i++) {
        const ang = (i / chunks) * Math.PI * 2 + rand(-0.35, 0.35);
        const d = rand(28, 95);
        const amount = 3 + Math.floor(Math.random() * 4) + Math.floor(p.level * 0.25);
        total += amount;
        this.combat.spawnPickup(
          'gold',
          poi.x + Math.cos(ang) * d,
          poi.y + Math.sin(ang) * d * 0.85,
          amount,
        );
      }
      // Central rich pile.
      const core = 10 + Math.floor(p.level * 0.9);
      total += core;
      this.combat.spawnPickup('gold', poi.x, poi.y - 8, core);
      this.ui.banner(def.name, `${chunks + 1} gold chunks · +${total}g`, def.color);
      Audio.playSfx('gold');
      this.vfx.rockChips(poi.x, poi.y, 14);
      this.vfx.sparkle(poi.x, poi.y, def.color);
    }

    const spr = this.poiSprites.get(poi.id);
    if (spr) {
      spr.destroy();
      this.poiSprites.delete(poi.id);
    }
  }

  syncPickups() {
    while (this.pickupGfx.length < this.combat.pickups.length) {
      const img = this.add.image(0, 0, 'pickup_xp').setDepth(8);
      const label = this.add
        .text(0, 0, '', {
          fontFamily: 'Trebuchet MS, Segoe UI, system-ui, sans-serif',
          fontSize: `${settings.textPx(12)}px`,
          fontStyle: 'bold',
          color: '#ffd9a0',
          stroke: 'rgba(20,12,6,0.85)',
          strokeThickness: Math.max(2, settings.textPx(3)),
        })
        .setOrigin(0.5, 0.5)
        .setDepth(9)
        .setVisible(false);
      this.fxLayer.add(img);
      this.fxLayer.add(label);
      this.pickupGfx.push({ img, label });
    }
    const t = this.time.now / 1000;
    for (let i = 0; i < this.combat.pickups.length; i++) {
      const p = this.combat.pickups[i];
      const { img, label } = this.pickupGfx[i];
      let tex = 'pickup_xp';
      if (p.kind === 'wood') tex = 'pickup_wood';
      else if (p.kind === 'meat') tex = 'pickup_meat';
      else if (p.kind === 'gold') tex = 'pickup_gold';
      else if (p.kind === 'heart') tex = 'pickup_heart';
      else if (p.kind === 'powerup' && p.powerupId) {
        const key = `pickup_${p.powerupId}`;
        tex = this.textures.exists(key) ? key : 'pickup_xp';
      }
      const bob = p.z > 0 ? 0 : Math.sin(t * 4 + p.phase) * 1.5;
      const drawY = p.y - p.z - 7 + bob;
      // Legacy Pickup.qualityScale — bigger pile for stacked yield.
      const q =
        p.kind === 'powerup'
          ? 1
          : clamp(0.9 + Math.log2(1 + (p.amount || 1)) * 0.22, 0.9, 2.1);
      const pulse =
        p.kind === 'powerup' || p.kind === 'heart'
          ? 1 + Math.sin(t * 8 + p.phase) * 0.08
          : 1;
      // Legacy gold coin squashes with cos spin; wood/meat use drop rotation.
      const sx =
        p.kind === 'gold'
          ? q * Math.max(0.2, Math.abs(Math.cos(t * 3 + p.phase)))
          : q * pulse;
      const sy = q * pulse;
      const rot =
        p.kind === 'powerup' || p.kind === 'gold' || p.kind === 'xp' || p.kind === 'heart'
          ? p.kind === 'xp'
            ? t * 3 + p.phase
            : 0
          : p.rot;
      const blinking = p.age > 100 && Math.floor(p.age * 6) % 2 === 0;
      img
        .setTexture(tex)
        .setPosition(p.x, drawY)
        .setRotation(rot)
        .setScale(sx, sy)
        .setDepth(p.y + 2)
        .setVisible(!blinking);

      // Legacy quantity label when stacked value > 1.
      const v = p.amount || 1;
      const showQty = v > 1 && p.kind !== 'powerup' && !blinking;
      if (showQty) {
        const col =
          p.kind === 'xp'
            ? '#e8fbff'
            : p.kind === 'gold'
              ? '#ffe066'
              : p.kind === 'meat'
                ? '#ffb0a0'
                : p.kind === 'heart'
                  ? '#ff5a7a'
                  : '#ffd9a0';
        label
          .setText(v >= 1000 ? formatNum(v) : String(v))
          .setColor(col)
          .setFontSize(settings.textPx(10 + Math.min(4, q * 2)))
          .setPosition(p.x, drawY - 12 * q)
          .setDepth(p.y + 3)
          .setVisible(true);
      } else {
        label.setVisible(false);
      }
    }
    for (let i = this.combat.pickups.length; i < this.pickupGfx.length; i++) {
      this.pickupGfx[i].img.setVisible(false);
      this.pickupGfx[i].label.setVisible(false);
    }
  }

  private onScaleResize = () => {
    if (!this.sys?.isActive()) return;
    this.lighting?.resize(this.scale.width, this.scale.height);
    this.applyCameraZoom();
  };

  private onDprResize = (payload?: { cssW?: number; cssH?: number }) => {
    if (!this.sys?.isActive()) return;
    this.lighting?.resize(this.scale.width, this.scale.height);
    this.applyCameraZoom(payload?.cssW, payload?.cssH);
  };

  private onZoomSettings = () => {
    if (!this.sys?.isActive()) return;
    this.applyCameraZoom();
  };

  private onLightingPrerender = () => {
    if (!this.sys?.isActive() || !this.lighting) return;
    this.lighting.update(
      this.dayNight.darkness,
      this.cameras.main,
      this.pendingLights,
      this.pendingDuskTint,
    );
    // Legacy: glowing eyes on top of night darkness (raiders/bosses red, ambient yellow).
    this.lighting.drawEyeGlows(
      this.cameras.main,
      this.animals.animals,
      this.dayNight.runTime,
      this.dayNight.darkness,
    );
  };

  /** Persist a mid-run checkpoint (dusk/dawn/pause/periodic). */
  checkpointSave() {
    if (this.won || !this.player?.alive || (!this.mutatorFx.noCamp && this.camp.hp <= 0)) return;
    try {
      saveRunSnapshot(this.buildRunSnapshot());
    } catch {
      /* ignore */
    }
  }

  private buildRunSnapshot(): RunSnapshot {
    return {
      v: 1,
      savedAt: Date.now(),
      worldSeed: this.world.seed,
      runTime: this.dayNight.runTime,
      dayNumber: this.dayNight.dayNumber,
      graceLeft: this.graceLeft,
      mutators: [...this.mutators],
      winGoal: this.winGoal,
      assaultIndex: this.assault.index,
      assaultTimer: this.assault.timer,
      player: {
        x: this.player.x,
        y: this.player.y,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        level: this.player.level,
        xp: this.player.xp,
        wood: this.player.wood,
        meat: this.player.meat,
        gold: this.player.gold,
        treesChopped: this.player.treesChopped,
        woodCollected: this.player.woodCollected,
        meatCollected: this.player.meatCollected,
        goldCollected: this.player.goldCollected,
        campUpgrades: this.player.campUpgrades,
        kills: this.player.kills,
        bosses: this.player.bosses,
        raidsSurvived: this.player.raidsSurvived,
        rerollsLeft: this.player.rerollsLeft,
        banishesLeft: this.player.banishesLeft,
        equipment: { ...this.player.equipment } as Record<string, unknown>,
      },
      arsenal: {
        weapons: { ...this.arsenal.weapons },
        weaponOrder: [...this.arsenal.weaponOrder],
        weaponElements: { ...this.arsenal.weaponElements },
        weaponUnique: { ...this.arsenal.weaponUnique },
        passives: { ...this.arsenal.passives },
        usedElements: { ...this.arsenal.usedElements },
        banished: [...this.arsenal.banished],
      },
      camp: {
        levels: { ...this.camp.levels },
        hp: this.camp.hp,
        maxHp: this.camp.maxHp,
        wallHps: this.camp.walls.map((w) => w.hp),
      },
      poisUsed: this.world.pois.filter((p) => p.used).map((p) => p.id),
      pois: this.world.pois.map((p) => ({
        id: p.id,
        kind: p.kind,
        x: p.x,
        y: p.y,
        used: p.used,
      })),
    };
  }

  /** Clear POI sprites and lay down a fresh random landmark set for this morning. */
  private reshuffleForestLandmarks() {
    this.poiSprites.forEach((s) => s.destroy());
    this.poiSprites.clear();
    this.poiPrompt?.setVisible(false);
    this.world.reshufflePois(this.dayNight.dayNumber);
  }

  private applyRunSnapshot(snap: RunSnapshot) {
    this.dayNight.runTime = snap.runTime;
    // Force clock/phase refresh.
    this.dayNight.update(0);
    this.graceLeft = snap.graceLeft;
    const p = this.player;
    Object.assign(p, {
      x: snap.player.x,
      y: snap.player.y,
      hp: snap.player.hp,
      maxHp: snap.player.maxHp,
      level: snap.player.level,
      xp: snap.player.xp,
      wood: snap.player.wood,
      meat: snap.player.meat,
      gold: snap.player.gold,
      treesChopped: snap.player.treesChopped,
      woodCollected: snap.player.woodCollected,
      meatCollected: snap.player.meatCollected,
      goldCollected: snap.player.goldCollected,
      campUpgrades: snap.player.campUpgrades,
      kills: snap.player.kills,
      bosses: snap.player.bosses,
      raidsSurvived: snap.player.raidsSurvived,
      rerollsLeft: snap.player.rerollsLeft,
      banishesLeft: snap.player.banishesLeft,
    });
    p.equipment = { ...emptyEquipment(), ...(snap.player.equipment as object) } as typeof p.equipment;
    this.arsenal.weapons = { ...snap.arsenal.weapons };
    this.arsenal.weaponOrder = [...snap.arsenal.weaponOrder];
    this.arsenal.weaponElements = { ...snap.arsenal.weaponElements } as typeof this.arsenal.weaponElements;
    this.arsenal.weaponUnique = { ...snap.arsenal.weaponUnique };
    this.arsenal.passives = { ...snap.arsenal.passives };
    this.arsenal.usedElements = { ...snap.arsenal.usedElements };
    this.arsenal.banished = new Set(snap.arsenal.banished);
    this.arsenal.achievements = [...meta.achievements];
    this.camp.levels = { ...this.camp.levels, ...snap.camp.levels };
    this.camp.recompute();
    this.camp.hp = snap.camp.hp;
    this.camp.maxHp = Math.max(this.camp.maxHp, snap.camp.maxHp);
    for (let i = 0; i < this.camp.walls.length; i++) {
      const hp = snap.camp.wallHps[i];
      if (hp == null) continue;
      this.camp.walls[i].hp = hp;
      this.camp.walls[i].alive = hp > 0;
      for (const s of this.camp.walls[i].sprites) {
        s.setVisible(true).setAlpha(hp > 0 ? 1 : 0.35);
        if (hp <= 0) s.setTint(0x5e4128);
        else s.clearTint();
      }
    }
    // Vanilla saves still carry camp fields — strip the base again after restore.
    if (this.mutatorFx.noCamp) this.camp.enableNoCamp();
    this.poiSprites.forEach((s) => s.destroy());
    this.poiSprites.clear();
    this.poiPrompt?.setVisible(false);
    if (snap.pois?.length) {
      this.world.loadPois(snap.pois);
    } else {
      // Older saves: reshape for the resumed day, then mark used IDs if they still match.
      if (snap.dayNumber > 1) this.world.reshufflePois(snap.dayNumber);
      const used = new Set(snap.poisUsed || []);
      for (const poi of this.world.pois) {
        if (used.has(poi.id)) poi.used = true;
      }
    }
    this.playerSprite.setPosition(p.x, p.y);
    this.cameras.main.centerOn(p.x, p.y);
    recomputePlayerStats(p, this.arsenal, this.metaBonuses);
    this.applyMutatorPlayerMods();
    p.hp = Math.min(p.hp, p.maxHp);
  }

  endRunVictory() {
    this.paused = true;
    clearRunSnapshot();
    Audio.playSfx('upgrade');
    const goal = WIN_GOAL_BY_ID[this.winGoal];
    if (goal.badge) meta.unlockBadge(goal.badge);
    if (this.winGoal === 'easy') this.tryUnlockAchievement('win_easy');
    else if (this.winGoal === 'medium') this.tryUnlockAchievement('win_medium');
    else if (this.winGoal === 'hard') this.tryUnlockAchievement('win_hard');
    const runTime = this.dayNight.runTime;
    const p = this.player;
    const campDev = Object.values(this.camp.levels).reduce((s, n) => s + (n || 0), 0);
    const creditStats = {
      day: this.dayNight.dayNumber,
      level: p.level,
      kills: p.kills,
      raids: p.raidsSurvived,
      bosses: p.bosses,
      time: runTime,
      trees: p.treesChopped,
      wood: p.woodCollected,
      meat: p.meatCollected,
      gold: p.goldCollected,
      campLevel: this.camp.levels.camp || 0,
      campUpgrades: p.campUpgrades,
      campDev,
      creditMult: this.mutatorFx.creditMult,
      winBonus: goal.creditBonus,
    };
    const credits = meta.completeRun(creditStats);
    this.ui.hidePause();
    this.ui.hideLevelUp();
    this.ui.hideCampShop();
    this.ui.cancelConfirm();
    this.ui.banner('Victory!', `${goal.name} cleared — ${goal.badge || 'well fought'}`, goal.color, {
      iconId: 'world_win',
    });
    this.ui.showGameOver(
      {
        reason: 'win',
        time: runTime,
        day: creditStats.day,
        level: creditStats.level,
        kills: creditStats.kills,
        raids: creditStats.raids,
        bosses: creditStats.bosses,
        trees: creditStats.trees,
        wood: creditStats.wood,
        meat: creditStats.meat,
        gold: creditStats.gold,
        campLevel: creditStats.campLevel,
        campUpgrades: creditStats.campUpgrades,
        credits,
        totalCredits: meta.credits,
        badge: goal.badge,
        winLabel: `${goal.name} (${goal.nights} nights)`,
      },
      () => {
        this.ui.cancelConfirm();
        this.scene.start('MenuScene');
      },
    );
  }

  endRun(record: boolean) {
    this.paused = true;
    clearRunSnapshot();
    // Camp loss (player still alive) — death sting; player death already played hurt→death.
    if (this.player.alive && !this.won) Audio.playSfx('death');
    const runTime = (this.time.now - this.runStart) / 1000;
    const p = this.player;
    const campDev = Object.values(this.camp.levels).reduce((s, n) => s + (n || 0), 0);
    const creditStats = {
      day: this.dayNight.dayNumber,
      level: p.level,
      kills: p.kills,
      raids: p.raidsSurvived,
      bosses: p.bosses,
      time: runTime,
      trees: p.treesChopped,
      wood: p.woodCollected,
      meat: p.meatCollected,
      gold: p.goldCollected,
      campLevel: this.camp.levels.camp || 0,
      campUpgrades: p.campUpgrades,
      campDev,
      creditMult: this.mutatorFx.creditMult,
    };
    let credits = 0;
    if (record) {
      credits = meta.completeRun(creditStats);
    }
    this.ui.hidePause();
    this.ui.hideLevelUp();
    this.ui.hideCampShop();
    this.ui.cancelConfirm();
    this.ui.showGameOver(
      {
        reason: p.alive ? 'camp' : 'death',
        time: runTime,
        day: creditStats.day,
        level: creditStats.level,
        kills: creditStats.kills,
        raids: creditStats.raids,
        bosses: creditStats.bosses,
        trees: creditStats.trees,
        wood: creditStats.wood,
        meat: creditStats.meat,
        gold: creditStats.gold,
        campLevel: creditStats.campLevel,
        campUpgrades: creditStats.campUpgrades,
        credits,
        totalCredits: meta.credits,
      },
      () => {
        this.ui.cancelConfirm();
        this.scene.start('MenuScene');
      },
    );
    if (settings.tutorialsEnabled) {
      this.ui.askConfirm({
        title: 'Turn off tutorials?',
        message:
          'Coach tips will keep showing every run while Tutorials are On. Turn them off now, or leave them On for the next run.',
        confirmLabel: 'Turn off',
        cancelLabel: 'Keep on',
        onConfirm: () => settings.setTutorialsEnabled(false),
      });
    }
  }

  shutdown() {
    this.scale.off('resize', this.onScaleResize, this);
    this.game.events.off('dpr-resize', this.onDprResize, this);
    this.game.events.off('zoom-settings', this.onZoomSettings, this);
    this.events.off('prerender', this.onLightingPrerender, this);
    this.cameras.main.stopFollow();

    this.playerCanvas?.destroy();
    this.animals?.clear();
    this.combat?.clear();
    this.groundLayer?.destroy();
    this.treeSprites.forEach((v) => {
      v.body.destroy();
      v.stump.destroy();
      v.shadow.destroy();
      v.bar.destroy();
    });
    this.treeSprites.clear();
    this.rockSprites.forEach((s) => {
      s.img.destroy();
      s.bar.destroy();
    });
    this.rockSprites.clear();
    this.bushSprites.forEach((s) => s.destroy());
    this.bushSprites.clear();
    this.pickupGfx.forEach((s) => {
      s.img.destroy();
      s.label.destroy();
    });
    this.pickupGfx.length = 0;
    this.floatText?.destroy();
    this.vfx?.destroy();
    this.edges?.destroy();
    this.camp?.destroy();
    this.lighting?.destroy();
    this.worldLayer?.destroy(true);
    this.fxLayer?.destroy(true);
    this.groundRoot?.destroy(true);
  }
}
