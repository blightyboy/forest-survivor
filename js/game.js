'use strict';

const HIT_COOLDOWN = 0.3;       // per (axe, target) pair
const MAX_PICKUPS = 160;
const MAX_TEXTS = 80;
const MAX_ARROWS = 120;
const RES_LABEL = { wood: 'Wood', meat: 'Meat', gold: 'Gold' };
const RES_COLOR = { wood: '#ffd9a0', meat: '#ff9f8a', gold: '#ffe066' };
const RES_SLOT = { wood: 0, meat: 1, gold: 2 };

/** Timed / instant power-ups dropped by slain enemies. */
const POWERUPS = {
  magnet: {
    name: 'Lodestone Surge', label: 'Magnet', color: '#ff6b6b',
    desc: 'Vacuum every drop on the map', duration: 0, weight: 18,
  },
  fury: {
    name: 'Fury Flask', label: '2× Damage', color: '#ff8a3d',
    desc: 'Double weapon damage', duration: 14, weight: 26,
  },
  vital: {
    name: 'Vital Sap', label: '2× Regen', color: '#9ef08a',
    desc: 'Double health regeneration', duration: 14, weight: 22,
  },
  haste: {
    name: 'Wind Tonic', label: 'Speed', color: '#7fd3ff',
    desc: 'Greatly increased move speed', duration: 12, weight: 26,
  },
  nuke: {
    name: 'Cataclysm Orb', label: 'Nuke', color: '#ffe066',
    desc: 'Fell every tree and beast (not bosses); vacuum all drops', duration: 0, weight: 2.2,
  },
};
const POWERUP_IDS = Object.keys(POWERUPS);

// Day / night: phases are fractions of one full day.
const DAY_LENGTH = 160;
const PHASE_DUSK = 0.6;
const PHASE_NIGHT = 0.68;
const PHASE_DAWN = 0.95;
const CLOCK_OFFSET = DAY_LENGTH * 0.05;   // the game starts in the morning
const NIGHT_DARKNESS = 0.8;
const LIGHT_SCALE = 0.5;                  // resolution of the darkness layer
const RAID_DISTANCE = 1050;

const UPGRADES = [
  // Costs mix wood / meat / gold so hunting, chopping and mining all matter.
  // Buildings that *produce* a resource lean on the other two.
  { id: 'camp', kind: 'base', name: 'Camp', desc: 'Sturdier cabin. Passively yields wood, meat and gold', base: { wood: 18, meat: 6, gold: 4 }, growth: 1.65, max: 12,
    value: (s) => s.campHp + ' HP  ' + s.campWood + 'w ' + s.campMeat + 'm ' + s.campGold + 'g' },
  { id: 'walls', kind: 'base', name: 'Palisade', desc: 'Square wall that stops raiders', base: { wood: 22, meat: 5, gold: 2 }, growth: 1.55, max: 12,
    value: (s) => (s.wallHp ? s.wallHp + ' HP' : 'None') },
  { id: 'towers', kind: 'base', name: 'Watchtower', desc: 'Archer tower that shoots threats', base: { wood: 24, meat: 7, gold: 7 }, growth: 1.55, max: 8,
    value: (s) => s.towerCount + '/8 built' },
  { id: 'archers', kind: 'base', name: 'Archers', desc: 'Tower arrow damage & range', base: { wood: 8, meat: 10, gold: 6 }, growth: 1.45, max: 15,
    value: (s) => s.arrowDmg + ' dmg · ' + Math.round(s.towerRange) + ' rng',
    requires: (L) => L.towers > 0, reqText: 'Build a tower first' },
  { id: 'barrage', kind: 'base', name: 'Barrage', desc: 'Tower fire rate', base: { wood: 12, meat: 8, gold: 8 }, growth: 1.5, max: 12,
    value: (s) => s.fireRate.toFixed(1) + '/s',
    requires: (L) => L.towers > 0, reqText: 'Build a tower first' },
  { id: 'volley', kind: 'base', name: 'Volley', desc: 'Each tower shoots more targets at once', base: { wood: 16, meat: 10, gold: 10 }, growth: 1.65, max: 5,
    value: (s) => s.towerTargets + ' target' + (s.towerTargets > 1 ? 's' : ''),
    requires: (L) => L.towers > 0, reqText: 'Build a tower first' },
  { id: 'campfire', kind: 'base', name: 'Campfire', desc: 'Heals you inside the camp', base: { wood: 10, meat: 8, gold: 2 }, growth: 1.55, max: 6,
    value: (s) => s.healRate.toFixed(1) + ' HP/s' },
  { id: 'mill', kind: 'base', name: 'Lumber Mill', desc: 'Cuts lumber every 10s', base: { wood: 12, meat: 10, gold: 8 }, growth: 1.55, max: 12,
    value: (s) => (s.millWood ? s.millWood + ' wood' : 'None') },
  { id: 'mine', kind: 'base', name: 'Gold Mine', desc: 'Digs gold every 10s', base: { wood: 30, meat: 10, gold: 3 }, growth: 1.55, max: 12,
    value: (s) => (s.mineGold ? s.mineGold + ' gold' : 'None') },
  { id: 'butcher', kind: 'base', name: 'Butcher', desc: 'Prepares meat every 10s', base: { wood: 24, meat: 3, gold: 7 }, growth: 1.5, max: 12,
    value: (s) => (s.butcherMeat ? s.butcherMeat + ' meat' : 'None') },
  { id: 'blacksmith', kind: 'base', name: 'Blacksmith', desc: 'Sells random gear. Stock refreshes every 5 min', base: { wood: 40, meat: 12, gold: 18 }, growth: 1.7, max: 6,
    value: (s) => (s.forgeLevel ? 'Forge Lv ' + s.forgeLevel + ' · better stock' : 'Closed') },
];

function computeStats(L, meta = null) {
  const m = meta || {};
  const income = 1 + (m.income || 0);
  const wallM = 1 + (m.wallHp || 0);
  const towerM = 1 + (m.towerDmg || 0);
  const healM = 1 + (m.campHeal || 0);
  const scaleInc = (n) => (n > 0 ? Math.max(1, Math.round(n * income)) : 0);
  return {
    campHp: Math.round((300 + 200 * L.camp) * Math.pow(1.12, L.camp)),
    wallHp: L.walls ? Math.round(90 * L.walls * Math.pow(1.16, L.walls - 1) * wallM) : 0,
    towerCount: L.towers,
    arrowDmg: Math.round((14 + 7 * L.archers) * Math.pow(1.09, L.archers) * towerM),
    fireRate: 0.85 + 0.22 * (L.barrage || 0) + 0.04 * L.archers,
    towerRange: 360 + 16 * L.archers,
    towerTargets: 1 + (L.volley || 0),
    healRate: (2 + 2.5 * L.campfire) * healM,
    lightR: 250 + 28 * L.campfire,
    millWood: scaleInc(L.mill ? 3 + 6 * L.mill : 0),
    mineGold: scaleInc(L.mine ? 1 + 3 * L.mine : 0),
    butcherMeat: scaleInc(L.butcher ? 1 + 2 * L.butcher : 0),
    forgeLevel: L.blacksmith || 0,
    campWood: scaleInc(1 + 2 * L.camp),
    campMeat: scaleInc(L.camp),
    campGold: scaleInc(Math.floor((L.camp + 1) / 2)),
    smithLuck: m.smithLuck || 0,
  };
}

/** Cost components below 1 are omitted, so some resources only join the price at higher levels. */
function upgradeCost(def, level) {
  const cost = {};
  for (const k in def.base) {
    const v = def.base[k] * Math.pow(def.growth, level);
    if (v >= 1) cost[k] = Math.round(v);
  }
  return cost;
}

function xpNeeded(level) { return Math.round(10 * Math.pow(1.24, level - 1)); }

/** Enemy strength grows with elapsed time so upgrades never fully outpace it. */
function threatAt(time) {
  const m = time / 60;
  return {
    m,
    hp: (1 + 0.4 * m) * Math.pow(1.09, m),
    dmg: (1 + 0.16 * m) * Math.pow(1.035, m),
    speed: Math.min(1.5, 1 + 0.02 * m),
  };
}

function compassName(angle) {
  const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  return names[(Math.round(angle / (Math.PI / 4)) % 8 + 8) % 8];
}

// ===========================================================================
// Input
// ===========================================================================

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.onAction = null;
    this.move = { x: 0, y: 0 };
    this.joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (MOVE_KEYS[e.code] || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      // A focused button must not be "clicked" by gameplay keys.
      const ae = document.activeElement;
      if (ae && ae !== document.body && typeof ae.blur === 'function') ae.blur();
      this.keys.add(e.code);
      if (!e.repeat && this.onAction) this.onAction(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());

    // Drag anywhere on the canvas for a virtual joystick (touch or mouse).
    canvas.addEventListener('pointerdown', (e) => {
      if (this.joy.active) return;
      this.joy.active = true;
      this.joy.id = e.pointerId;
      this.joy.ox = this.joy.x = e.clientX;
      this.joy.oy = this.joy.y = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      this.joy.x = e.clientX;
      this.joy.y = e.clientY;
    });
    const end = (e) => { if (e.pointerId === this.joy.id) this.joy.active = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  reset() {
    this.keys.clear();
    this.joy.active = false;
  }

  getMove() {
    let x = 0, y = 0;
    for (const code of this.keys) {
      const m = MOVE_KEYS[code];
      if (m) { x += m[0]; y += m[1]; }
    }
    x = clamp(x, -1, 1);
    y = clamp(y, -1, 1);
    if (this.joy.active) {
      const dx = this.joy.x - this.joy.ox, dy = this.joy.y - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const k = Math.min(1, d / 55);
        x += (dx / d) * k;
        y += (dy / d) * k;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.move.x = x;
    this.move.y = y;
    return this.move;
  }
}

// ===========================================================================
// Game
// ===========================================================================

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.input.onAction = (code) => this.handleAction(code);
    this.particles = new ParticleSystem(900);
    this.fx = new Effects(this.particles);
    this.texts = [];
    this.animalGrid = new SpatialGrid(128, WORLD_SIZE, WORLD_SIZE);
    this._q = [];
    this._vis = [];
    this._lights = [];
    this.faceNearest = false;
    this.lockTarget = null;
    this.frameDt = 0;
    this.lastTs = null;
    this.fps = 0;
    this.fpsFrames = 0;
    this.fpsAccum = 0;
    this.view = { x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0 };
    this.meta = new MetaProgress();
    this.creditsAwarded = false;
    this.state = 'menu';

    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.setPaused(true);
      this.lastTs = null;
    });
    const unlock = () => Sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    this.ui = new UI(this);
    Settings.load();
    Settings.apply();
    this.ui.syncOptionsForm();
    this.reset(false);
    this.showMainMenu();
    this.frameCb = (ts) => this.frame(ts);
    requestAnimationFrame(this.frameCb);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  metaBonuses() { return this.meta.bonuses(); }

  showMainMenu() {
    // Abandoning a run still pays out credits if the run was underway.
    if ((this.state === 'playing' || this.state === 'paused' || this.state === 'choosing' || this.state === 'dying') &&
        this.time > 20 && !this.creditsAwarded) {
      this.deathTime = this.time;
      this.awardRunCredits();
    }
    this.tutorialOpen = null;
    this.tutorialQueue.length = 0;
    this.tutorialSilentPause = false;
    this.state = 'menu';
    this.ui.hideTutorial();
    this.ui.showPause(false);
    this.ui.showMainMenu();
  }

  startNewRun() {
    this.reset(true);
  }

  reset(startPlaying = true) {
    const mb = this.metaBonuses();
    this.world = new World(WORLD_SEED);
    this.base = new Base(this.world.spawnX, this.world.spawnY, this.world);
    this.player = new Player(this.world.spawnX, this.world.spawnY + 150);
    this.animals = [];
    this.arrows = [];
    this.pickups = [];
    this.hazards = [];
    this.enemyShots = [];
    this.activeBoss = null;
    this.particles.clear();
    this.texts.length = 0;
    this.res = { wood: 0, meat: 0, gold: 0 };
    this.levels = {};
    for (const u of UPGRADES) this.levels[u.id] = 0;
    this.levels.walls = 1; // start with a basic palisade
    this.stats = computeStats(this.levels, mb);
    this.base.apply(this.levels, this.stats);
    this.arsenal = new Arsenal(this);
    this.shop = new GearShop();
    this.shop.setSmithLuck(mb.smithLuck || 0);
    this.buffs = { fury: 0, vital: 0, haste: 0 };
    this.permBonus = Object.assign({ maxHp: 0, damage: 0 }, mb);
    this.banished = new Set();
    this.rerollsLeft = 5 + (mb.rerolls || 0);
    this.banishesLeft = 5 + (mb.banishes || 0);
    this.nuking = false;
    this.creditsAwarded = false;
    this.ps = computePlayerStats({});
    this.arsenal.apply({ kind: 'weapon', id: 'axe' });
    this.syncPlayerStats();
    this.arsenal.syncAxes();
    this.time = 0;
    this.deathTime = 0;
    this.level = 1;
    this.xp = 0;
    this.levelQueue = 0;
    this.cards = [];
    this.counters = { trees: 0, kills: 0, gold: 0, upgrades: 0, raids: 0, bosses: 0 };
    this.camera = { x: this.player.x, y: this.player.y - 20, trauma: 0, ox: 0, oy: 0 };
    this.hurtFlash = 0;
    this.spawnTimer = 2.4;
    this.swarmTimer = rand(24, 38);
    this.assault = {
      timer: 48,
      index: 0,
      queue: [],
      spawnT: 0,
      angle: -Math.PI / 2,
      alive: 0,
    };
    this.tutorialOpen = null;
    this.tutorialQueue = [];
    this.tutorialSilentPause = false;
    this.campAlertCd = 0;
    this.deathTimer = 0;
    this.gameOverReason = 'player';
    this.resVersion = 0;
    this.darkLevel = 0;
    this.phaseName = 'day';
    this.raid = { active: false, wave: 0, queue: [], spawnT: 0, angles: [-Math.PI / 2], alive: 0 };
    this.state = startPlaying ? 'playing' : 'menu';
    this.lastTs = null;
    this.spawnInitialAnimals();
    this.ui.onReset();
    if (startPlaying) {
      this.ui.hideMainMenu();
      this.ui.banner('Day 1', 'Chop, hunt, fortify. Assault waves march on camp — full raids hit at night!', '#ffe08a');
    }
  }

  /** Award credits once per run when the game ends. */
  awardRunCredits() {
    if (this.creditsAwarded) return 0;
    this.creditsAwarded = true;
    const earned = this.meta.completeRun({
      reason: this.gameOverReason,
      time: this.deathTime || this.time,
      day: this.dayNumber(),
      level: this.level,
      trees: this.counters.trees,
      kills: this.counters.kills,
      raids: this.counters.raids,
      bosses: this.counters.bosses,
      gold: this.counters.gold,
      upgrades: this.counters.upgrades,
    });
    return earned;
  }

  /** True if (x,y) sits inside the camp yard (no enemy spawns allowed here). */
  spawnInBase(x, y, pad = 48) {
    return this.base.contains(x, y, pad);
  }

  /** World spawn that also rejects the camp radius. */
  findEnemySpawn(px, py, minD, maxD, r) {
    return this.world.findSpawnSpot(px, py, minD, maxD, r, (x, y) => !this.spawnInBase(x, y));
  }

  spawnInitialAnimals() {
    const rng = new RNG(WORLD_SEED + 77);
    const w = this.world;
    const sx = w.spawnX, sy = w.spawnY;
    const place = (minD, maxD, r, make) => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const a = rng.next() * TAU, d = rng.range(minD, maxD);
        const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d;
        if (!w.isFree(x, y, r) || this.spawnInBase(x, y)) continue;
        this.animals.push(make(x, y, d));
        return;
      }
    };
    for (let i = 0; i < 5; i++) place(420, 700, 24, (x, y) => new Animal('boar', x, y, this.enemyOpts({ stars: 0 })));
    for (let i = 0; i < 5; i++) place(450, 1100, 22, (x, y) => new Animal('deer', x, y, this.enemyOpts({ stars: 0, element: null })));
    for (let i = 0; i < 4; i++) place(480, 1000, 20, (x, y) => new Animal('fox', x, y, this.enemyOpts({ stars: 0, element: null })));
    for (let i = 0; i < 28; i++) {
      place(750, 2200, 30, (x, y, d) => {
        const dire = d > 1400 && rng.chance(0.08);
        return new Animal(dire ? 'dire_boar' : 'boar', x, y, this.enemyOpts({
          big: !dire && rng.chance(d > 1300 ? 0.25 : 0.05),
        }));
      });
    }
    for (let i = 0; i < 4; i++) place(1100, 2200, 22, (x, y) => new Animal('deer', x, y, this.enemyOpts({ stars: 0 })));
    for (let i = 0; i < 4; i++) place(1000, 2100, 20, (x, y) => new Animal('fox', x, y, this.enemyOpts({ stars: 0 })));
    for (let i = 0; i < 4; i++) place(900, 1900, 22, (x, y) => new Animal('sheep', x, y, this.enemyOpts({ stars: 0 })));
    for (let i = 0; i < 4; i++) place(950, 2000, 24, (x, y) => new Animal('beaver', x, y, this.enemyOpts({ stars: 0 })));
    for (let i = 0; i < 3; i++) place(1700, 2200, 34, (x, y) => new Animal(rng.chance(0.2) ? 'dire_bear' : 'bear', x, y, this.enemyOpts({})));
  }

  setPaused(paused, opts = {}) {
    if (paused && this.state === 'playing') {
      this.state = 'paused';
      this.input.reset();
      this.ui.showPause(!opts.silent);
    } else if (!paused && this.state === 'paused') {
      this.state = 'playing';
      this.lastTs = null;
      this.ui.showPause(false);
    }
  }

  togglePause() {
    if (this.ui.isTutorialOpen()) {
      this.dismissTutorial();
      return;
    }
    this.setPaused(this.state === 'playing');
  }

  /** Pause silently and show a first-run tutorial popup (queued if one is open). */
  offerTutorial(id) {
    if (typeof Settings === 'undefined' || !Settings.shouldShowTutorial(id)) return false;
    if (this.state === 'menu' || this.state === 'gameover' || this.state === 'dying') return false;
    if (this.tutorialOpen || this.ui.isTutorialOpen()) {
      if (this.tutorialQueue.indexOf(id) < 0) this.tutorialQueue.push(id);
      return false;
    }
    // Mark seen immediately so reloads / re-triggers cannot spam.
    Settings.markTutorialSeen(id);
    this.tutorialOpen = id;
    if (this.state === 'playing') {
      this.tutorialSilentPause = true;
      this.setPaused(true, { silent: true });
    } else if (this.state === 'paused') {
      this.tutorialSilentPause = false;
      this.ui.showPause(false);
    } else if (this.state === 'choosing') {
      // Cards stay up; tutorial sits on top without changing state.
      this.tutorialSilentPause = false;
    }
    this.ui.showTutorial(id);
    Sound.play('click');
    return true;
  }

  dismissTutorial() {
    if (!this.tutorialOpen && !this.ui.isTutorialOpen()) return;
    this.tutorialOpen = null;
    this.ui.hideTutorial();
    if (this.tutorialSilentPause && this.state === 'paused') {
      this.tutorialSilentPause = false;
      this.setPaused(false);
    } else if (this.state === 'paused' && !this.tutorialSilentPause) {
      this.ui.showPause(true);
    }
    this.tutorialSilentPause = false;
    // Drain queue one at a time.
    while (this.tutorialQueue.length) {
      const next = this.tutorialQueue.shift();
      if (this.offerTutorial(next)) return;
    }
  }

  /** Runtime checks for enemy-near and first affordable fortification. */
  updateTutorials() {
    if (typeof Settings === 'undefined' || !Settings.tutorialsEnabled) return;
    if (this.state !== 'playing') return;
    if (this.tutorialOpen || this.ui.isTutorialOpen()) return;

    if (Settings.shouldShowTutorial('enemy')) {
      const p = this.player;
      if (p && p.alive) {
        const R2 = 460 * 460;
        for (let i = 0; i < this.animals.length; i++) {
          const a = this.animals[i];
          if (a.dead || a.leaving) continue;
          if (dist2(a.x, a.y, p.x, p.y) < R2) {
            this.offerTutorial('enemy');
            return;
          }
        }
      }
    }

    if (Settings.shouldShowTutorial('build')) {
      const walls = UPGRADES.find((u) => u.id === 'walls');
      const towers = UPGRADES.find((u) => u.id === 'towers');
      const canWalls = walls && this.levels.walls < walls.max &&
        this.canAfford(upgradeCost(walls, this.levels.walls || 0));
      const canTowers = towers && (this.levels.towers || 0) < towers.max &&
        this.canAfford(upgradeCost(towers, this.levels.towers || 0));
      if (canWalls || canTowers) {
        this.offerTutorial('build');
      }
    }
  }

  toggleMute() {
    Sound.setMuted(!Sound.muted);
    this.ui.setSoundIcon();
  }

  toggleFaceNearest() {
    this.faceNearest = !this.faceNearest;
    const on = this.faceNearest;
    if (!on) this.lockTarget = null;
    this.ui.banner(on ? 'Aim lock ON' : 'Aim lock OFF',
      on ? 'Weapons track the closest threat' : 'Facing follows movement',
      on ? '#7fd3ff' : '#c8b8a0');
    Sound.play('click');
  }

  handleAction(code) {
    if (this.ui.isConfirmOpen()) {
      if (code === 'Enter' || code === 'Space') this.ui.acceptConfirm();
      else if (code === 'Escape' || code === 'KeyP') this.ui.cancelConfirm();
      return;
    }
    if (this.ui.isTutorialOpen()) {
      if (code === 'Escape' || code === 'Enter' || code === 'KeyP' || code === 'Space') {
        this.dismissTutorial();
      }
      return;
    }
    if (this.ui.isOptionsOpen()) {
      if (code === 'Escape' || code === 'KeyP') this.ui.hideOptions();
      return;
    }
    if (this.state === 'choosing') {
      const m = /^(?:Digit|Numpad)([1-5])$/.exec(code);
      if (m) this.pickCard(Number(m[1]) - 1);
      if (code === 'KeyR') this.rerollCards();
      if (code === 'KeyM') this.toggleMute();
      return;
    }
    switch (code) {
      case 'KeyP':
      case 'Escape':
        this.togglePause();
        return;
      case 'KeyU':
        this.ui.togglePanel();
        return;
      case 'KeyB':
        this.ui.togglePanel(true);
        this.ui.setSmithTab(true);
        return;
      case 'Space':
        if (this.state === 'playing') this.player.tryDash(this);
        return;
      case 'KeyF':
        if (this.state === 'playing' || this.state === 'paused') this.toggleFaceNearest();
        return;
      case 'KeyM':
        this.toggleMute();
        return;
      case 'Enter':
      case 'KeyR':
        if (this.state === 'gameover') this.startNewRun();
        return;
    }
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (m) {
      const def = UPGRADES[Number(m[1]) - 1];
      if (def && !this.buyUpgrade(def.id)) this.ui.denyUpgrade(def.id);
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.lightCanvas.width = Math.max(1, Math.ceil(w * LIGHT_SCALE));
    this.lightCanvas.height = Math.max(1, Math.ceil(h * LIGHT_SCALE));
    this.viewW = w;
    this.viewH = h;
    this.zoom = clamp(Math.min(w / 1100, h / 720), 0.62, 1.25);
    this.groundScale = clamp(Math.round(this.dpr * this.zoom * 2) / 2, 1, 1.5);
    const g = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,25,5,0.45)');
    this.vignette = g;
    const r = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    r.addColorStop(0, 'rgba(200,0,0,0)');
    r.addColorStop(1, 'rgba(200,0,0,0.55)');
    this.hurtGradient = r;
  }

  frame(ts) {
    requestAnimationFrame(this.frameCb);
    if (this.lastTs === null) this.lastTs = ts;
    const rawDt = (ts - this.lastTs) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTs = ts;
    this.fpsFrames++;
    this.fpsAccum += rawDt;
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }
    const simulate = this.state === 'playing' || this.state === 'dying';
    this.frameDt = simulate ? dt : 0;
    if (simulate) this.update(dt);
    this.render();
    this.ui.update();
    if (typeof Music !== 'undefined') Music.sync(this);
  }

  // -------------------------------------------------------------------------
  // Clock, day / night and raids
  // -------------------------------------------------------------------------

  clock() { return this.time + CLOCK_OFFSET; }
  dayNumber() { return Math.floor(this.clock() / DAY_LENGTH) + 1; }
  phase() { return (this.clock() % DAY_LENGTH) / DAY_LENGTH; }
  isNight() { const p = this.phase(); return p >= PHASE_NIGHT && p < PHASE_DAWN; }
  /** True boss every 3rd night (nights 3, 6, 9…). */
  isBossNight(day = this.dayNumber()) { return day > 0 && day % 3 === 0; }
  threat() { return threatAt(this.time); }

  phaseNameAt(p) {
    if (p < PHASE_DUSK) return 'day';
    if (p < PHASE_NIGHT) return 'dusk';
    if (p < PHASE_DAWN) return 'night';
    return 'dawn';
  }

  darknessAt(p) {
    if (p < PHASE_DUSK) return 0;
    if (p < PHASE_NIGHT) return ((p - PHASE_DUSK) / (PHASE_NIGHT - PHASE_DUSK)) * NIGHT_DARKNESS;
    if (p < PHASE_DAWN) return NIGHT_DARKNESS;
    return (1 - (p - PHASE_DAWN) / (1 - PHASE_DAWN)) * NIGHT_DARKNESS;
  }

  /** Seconds until the next phase boundary, for the HUD. */
  secondsToPhase(target) {
    const p = this.phase();
    let d = target - p;
    if (d < 0) d += 1;
    return d * DAY_LENGTH;
  }

  updateClock() {
    const p = this.phase();
    this.darkLevel = this.darknessAt(p);
    const name = this.phaseNameAt(p);
    if (name === this.phaseName) return;
    this.phaseName = name;
    const day = this.dayNumber();
    if (name === 'dusk') {
      const fronts = day >= 8 ? 3 : day >= 4 ? 2 : 1;
      const a0 = Math.random() * TAU;
      this.raid.angles = [];
      for (let i = 0; i < fronts; i++) this.raid.angles.push(a0 + (i * TAU) / fronts + rand(-0.35, 0.35));
      if (this.isBossNight(day)) {
        this.ui.banner('Boss night approaches!',
          'A true boss leads the raid from the ' + this.raidDirections() + '. Fortify the camp!',
          '#ff4d6d');
      } else {
        this.ui.banner('Dusk falls...', 'Raiders gather to the ' + this.raidDirections() + '. Get back to camp!', '#ffb36b');
      }
      Sound.play('horn');
      if (day === 1) this.offerTutorial('firstNight');
    } else if (name === 'night') {
      this.startRaid(day);
      if (this.isBossNight(day)) this.spawnTrueBoss(day);
      else this.spawnMiniboss(day);
      Sound.play('howl');
    } else if (name === 'day') {
      const survived = this.raid.active;
      if (survived) {
        this.raid.active = false;
        this.raid.queue.length = 0;
        for (const a of this.animals) {
          if (a.raider && !a.dead) {
            a.leaving = true;
            a.raider = false;
            a.assault = false;
          }
        }
      }
      this.activeBoss = null;
      this.ui.showBossBar(null);
      this.base.onDawn();
      for (const a of this.animals) if (isWolfish(a.species) && !a.raider && !a.dead) a.leaving = true;
      const intro = survived ? 'The raiders retreat at sunrise. ' : 'The camp has been repaired. ';
      if (this.isBossNight(day)) {
        this.ui.banner('Day ' + day + ' — Boss Night',
          intro + 'A true boss comes at nightfall. Prepare!',
          '#ff4d6d');
      } else {
        const nightsLeft = 3 - (day % 3);
        const bossHint = nightsLeft === 1
          ? ' Boss night tomorrow.'
          : ' Boss night in ' + nightsLeft + ' nights.';
        this.ui.banner('Day ' + day, intro + 'Threat grows: x' + this.threat().hp.toFixed(1) + '.' + bossHint, '#ffe08a');
      }
      Sound.play('levelup');
    }
  }

  startRaid(wave) {
    const n = wave;
    const count = Math.min(52, 3 + 3 * n + Math.floor((n * n) / 3));
    const queue = [];
    for (let i = 0; i < count; i++) {
      const wBoar = 1, wWolf = n >= 2 ? 0.9 : 0, wBear = n >= 3 ? Math.min(0.6, 0.12 * n) : 0;
      let r = Math.random() * (wBoar + wWolf + wBear);
      let species = 'boar';
      if ((r -= wBoar) >= 0) species = (r -= wWolf) < 0 ? 'wolf' : 'bear';
      if (species === 'boar' && n >= 3 && Math.random() < 0.12) species = 'dire_boar';
      else if (species === 'wolf' && n >= 4 && Math.random() < 0.14) species = 'dire_wolf';
      else if (species === 'bear' && n >= 5 && Math.random() < 0.16) species = 'dire_bear';
      else if (species === 'boar' && n >= 2 && Math.random() < 0.1) species = Math.random() < 0.5 ? 'sheep' : 'beaver';
      queue.push({ species, big: species === 'boar' && n >= 2 && Math.random() < 0.25 });
    }
    this.raid.active = true;
    this.raid.wave = n;
    this.raid.queue = queue;
    this.raid.spawnT = 0;
    this.ui.banner('Night ' + n + ': RAID!', count + ' beasts attack from the ' + this.raidDirections() + '!', '#ff6b6b');
  }

  raidDirections() {
    const names = this.raid.angles.map(compassName);
    return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  }

  updateRaid(dt) {
    const raid = this.raid;
    if (!raid.active) return;
    if (raid.queue.length) {
      raid.spawnT -= dt;
      if (raid.spawnT <= 0) {
        raid.spawnT = 0.3;
        const W = this.world.w, H = this.world.h;
        const angle = raid.angles[raid.queue.length % raid.angles.length];
        const ox = clamp(this.base.x + Math.cos(angle) * RAID_DISTANCE, 260, W - 260);
        const oy = clamp(this.base.y + Math.sin(angle) * RAID_DISTANCE, 260, H - 260);
        for (let i = 0; i < 15; i++) {
          const x = ox + rand(-160, 160), y = oy + rand(-160, 160);
          if (!this.world.isFree(x, y, 30) || this.spawnInBase(x, y)) continue;
          const spec = raid.queue.pop();
          const t = this.threat();
          const bonus = 1 + 0.1 * raid.wave;
          this.animals.push(new Animal(spec.species, x, y, this.enemyOpts({
            raider: true, aggressive: true, big: spec.big,
            mult: { hp: t.hp * bonus, dmg: t.dmg, speed: t.speed },
          })));
          break;
        }
      }
    } else if (raid.alive === 0) {
      raid.active = false;
      this.counters.raids++;
      const gold = 4 + 3 * raid.wave, wood = 10 * raid.wave;
      this.res.gold += gold;
      this.res.wood += wood;
      this.counters.gold += gold;
      this.resVersion++;
      this.ui.banner('Raid repelled!', 'Reward: +' + wood + ' wood, +' + gold + ' gold', '#9ef08a');
      Sound.play('upgrade');
    }
  }

  /**
   * Daytime assault waves: packs spawn at the forest edge and march on the camp.
   * Count and species mix grow with threat (elapsed minutes).
   */
  updateAssaultWaves(dt) {
    const wave = this.assault;
    if (!wave) return;
    if (!this.player.alive || this.state === 'menu' || this.state === 'gameover') return;

    // Night raids own the siege; hold daytime waves until dawn.
    if (this.isNight() || this.raid.active) {
      wave.queue.length = 0;
      wave.timer = Math.max(wave.timer, 22);
      return;
    }

    if (wave.queue.length) {
      wave.spawnT -= dt;
      if (wave.spawnT > 0) return;
      wave.spawnT = 0.28;
      this.spawnAssaultMember(wave.queue.pop(), wave.angle);
      return;
    }

    // Soft cap so unfinished packs don't pile forever.
    if (wave.alive >= 18) {
      wave.timer = Math.max(wave.timer, 8);
      return;
    }

    wave.timer -= dt;
    if (wave.timer > 0) return;
    this.startAssaultWave();
  }

  /** Build the next assault pack from current threat. */
  startAssaultWave() {
    const t = this.threat();
    const m = t.m;
    const wave = this.assault;
    wave.index++;

    // Size: early trickle → mid packs → late pressure, soft-capped.
    const size = Math.min(22, Math.round(3 + m * 1.35 + Math.pow(Math.max(0, m - 1), 1.2) * 0.45));
    const pool = this.assaultSpeciesPool(m);
    const queue = [];
    for (let i = 0; i < size; i++) {
      const species = pool[Math.floor(Math.random() * pool.length)];
      const big = species === 'boar' && m >= 2.5 && Math.random() < clamp(0.1 + m * 0.04, 0.1, 0.4);
      queue.push({ species, big });
    }

    wave.angle = Math.random() * TAU;
    wave.queue = queue;
    wave.spawnT = 0;
    // Next wave cadence: faster as threat rises (never below ~28s).
    wave.timer = Math.max(28, 72 - m * 5.5 + rand(-4, 6));

    const dir = compassName(wave.angle);
    this.ui.banner(
      'Assault wave ' + wave.index + '!',
      size + ' beasts advance from the ' + dir + ' · Threat x' + t.hp.toFixed(1),
      '#ff9a6b'
    );
    Sound.play('horn');
  }

  /** Species unlocked by threat minutes (variety expands over the run). */
  assaultSpeciesPool(m) {
    const pool = ['boar'];
    if (m >= 0.8) pool.push('boar', 'wolf');
    if (m >= 1.6) pool.push('sheep', 'beaver');
    if (m >= 2.5) pool.push('deer', 'fox', 'dire_boar');
    if (m >= 3.5) pool.push('wolf', 'raccoon', 'duck');
    if (m >= 4.5) pool.push('dire_wolf', 'bear', 'beaver', 'sheep');
    if (m >= 6) pool.push('dire_bear', 'dire_boar', 'dire_wolf');
    if (m >= 8) pool.push('dire_bear', 'bear', 'dire_wolf');
    return pool;
  }

  spawnAssaultMember(spec, angle) {
    if (!spec) return;
    const W = this.world.w, H = this.world.h;
    const dist = RAID_DISTANCE * rand(0.72, 0.92);
    const ox = clamp(this.base.x + Math.cos(angle) * dist, 260, W - 260);
    const oy = clamp(this.base.y + Math.sin(angle) * dist, 260, H - 260);
    const t = this.threat();
    const bonus = 1 + 0.06 * this.assault.index;
    for (let i = 0; i < 16; i++) {
      const x = ox + rand(-140, 140), y = oy + rand(-140, 140);
      if (!this.world.isFree(x, y, 28) || this.spawnInBase(x, y)) continue;
      this.animals.push(new Animal(spec.species, x, y, this.enemyOpts({
        raider: true, assault: true, aggressive: true, big: spec.big,
        mult: { hp: t.hp * bonus, dmg: t.dmg * (0.92 + Math.min(0.2, t.m * 0.02)), speed: t.speed },
      })));
      return;
    }
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  /** World-space camera frustum used for draw/update culling. */
  refreshViewBounds(withShake = false) {
    const cam = this.camera;
    const halfW = this.viewW / this.zoom / 2;
    const halfH = this.viewH / this.zoom / 2;
    const cx = cam.x + (withShake ? cam.ox : 0);
    const cy = cam.y + (withShake ? cam.oy : 0);
    const v = this.view;
    v.cx = cx; v.cy = cy;
    v.x0 = cx - halfW; v.y0 = cy - halfH;
    v.x1 = cx + halfW; v.y1 = cy + halfH;
    if (this.particles) this.particles.cull = v;
  }

  /** True if (x,y) is inside the camera view (plus optional margin). */
  inView(x, y, margin = 0) {
    const v = this.view;
    return x > v.x0 - margin && x < v.x1 + margin && y > v.y0 - margin && y < v.y1 + margin;
  }

  /**
   * Far-off ambient animals freeze to save CPU; bosses, raiders, swarms,
   * anything near the player/camp/camera or mid-combat still simulates.
   */
  animalNeedsUpdate(a) {
    if (a.dead || a.boss || a.dayBoss || a.trueBoss || a.raider || a.assault || a.swarm || a.leaving || a.ability) return true;
    if (a.state === 'march' || a.state === 'chase' || a.state === 'windup' || a.state === 'lunge' || a.state === 'recover') return true;
    if (this.inView(a.x, a.y, 300)) return true;
    const p = this.player;
    if (dist2(a.x, a.y, p.x, p.y) < 780 * 780) return true;
    const b = this.base;
    if (dist2(a.x, a.y, b.x, b.y) < 920 * 920) return true;
    return false;
  }

  update(dt) {
    this.time += dt;
    const p = this.player;
    this.refreshViewBounds(false);
    this.updateClock();

    p.update(dt, this);
    this.updateSurvival(dt);

    // Animals: update (culled), rebuild the dynamic grid, then separate overlaps.
    const animals = this.animals;
    this.animalGrid.clear();
    let raidAlive = 0;
    let assaultAlive = 0;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      if (!a.dead && !this.animalNeedsUpdate(a)) {
        a._sim = false;
        this.animalGrid.insert(a);
        continue;
      }
      a._sim = true;
      a.update(dt, this);
      if (!a.dead) {
        this.animalGrid.insert(a);
        if (a.assault) assaultAlive++;
        else if (a.raider) raidAlive++;
      }
    }
    this.raid.alive = raidAlive;
    this.assault.alive = assaultAlive;
    this.separateAnimals();
    compactInPlace(animals, (a) => a.remove);

    // Aim lock after animals move so facing / lockTarget use current positions.
    if (this.faceNearest && p.alive) p.faceClosestEnemy(this);

    this.updateRaid(dt);
    this.updateAssaultWaves(dt);
    this.updateSwarms(dt);
    this.updateTutorials();
    this.arsenal.update(dt);
    this.base.update(dt, this);
    this.shop.update(dt, this.stats.forgeLevel);
    for (let i = 0; i < this.arrows.length; i++) this.arrows[i].update(dt, this);
    compactInPlace(this.arrows, (ar) => ar.dead);
    this.world.update(dt, this);

    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      // Settled far-away drops only age; magnetized / airborne ones always tick.
      if (!pk.magnet && pk.z <= 0 && !this.inView(pk.x, pk.y, 420)) {
        pk.age += dt;
        if (pk.age > pk.lifetime()) pk.dead = true;
        continue;
      }
      pk.update(dt, this);
    }
    // Occasional merge pass so same-type drops coalesce on the ground.
    if ((this._stackAcc = (this._stackAcc || 0) + dt) >= 0.28) {
      this._stackAcc = 0;
      this.stackNearbyPickups();
    }
    compactInPlace(this.pickups, (pk) => pk.dead);

    for (let i = 0; i < this.hazards.length; i++) this.hazards[i].update(dt, this);
    compactInPlace(this.hazards, (h) => h.dead);
    for (let i = 0; i < this.enemyShots.length; i++) this.enemyShots[i].update(dt, this);
    compactInPlace(this.enemyShots, (s) => s.dead);

    if (this.activeBoss && (this.activeBoss.dead || this.activeBoss.remove)) {
      if (this.activeBoss.dead && !this.activeBoss._bossCleared) {
        this.activeBoss._bossCleared = true;
        this.ui.banner('Boss felled!', this.activeBoss.name + ' has been slain!', '#9ef08a');
        Sound.play('upgrade');
      }
      this.activeBoss = null;
      this.ui.showBossBar(null);
    } else if (this.activeBoss) {
      this.ui.updateBossBar(this.activeBoss);
    }

    this.particles.update(dt);
    this.updateTexts(dt);
    this.updateSpawning(dt);
    this.updateCamera(dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    if (this.campAlertCd > 0) this.campAlertCd -= dt;

    if (this.state === 'dying') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.state = 'gameover';
        const earned = this.awardRunCredits();
        this.ui.showGameOver({
          reason: this.gameOverReason,
          time: this.deathTime, day: this.dayNumber(), level: this.level, trees: this.counters.trees,
          kills: this.counters.kills, raids: this.counters.raids, bosses: this.counters.bosses,
          gold: this.counters.gold, upgrades: this.counters.upgrades,
          credits: earned, totalCredits: this.meta.credits,
        });
      }
    }
  }

  separateAnimals() {
    const q = this._q;
    for (const b of this.animals) {
      if (b.dead || b._sim === false) continue;
      q.length = 0;
      this.animalGrid.query(b.x, b.y, 64, q);
      for (const o of q) {
        if (o === b || o.dead) continue;
        const minD = (b.radius + o.radius) * 0.85;
        const dx = b.x - o.x, dy = b.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const push = (minD - d) * 0.5;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
        o.x -= (dx / d) * push; o.y -= (dy / d) * push;
      }
    }
  }

  syncPlayerStats() {
    const gear = this.shop ? this.shop.bonuses() : null;
    this.ps = computePlayerStats(this.arsenal.passives, gear, this.level || 1, this.permBonus);
    const p = this.player;
    if (p.maxHp < this.ps.maxHp) p.hp += this.ps.maxHp - p.maxHp;
    p.maxHp = this.ps.maxHp;
    p.hp = Math.min(p.hp, p.maxHp);
    p.setDashCharges(this.ps.dashCharges || 1);
  }

  /** Difficulty + element rolled from current threat. */
  enemyOpts(extra = {}) {
    const t = this.threat();
    const threatM = t.m;
    const opts = Object.assign({
      mult: { hp: t.hp, dmg: t.dmg, speed: t.speed },
      aggressive: true,
      threatM,
    }, extra);
    opts.aggressive = true;
    opts.passive = false;
    if (opts.stars == null) {
      opts.stars = rollStars(threatM, {
        boss: opts.boss, big: opts.big, raider: opts.raider, swarm: opts.swarm,
        passive: false,
      });
    }
    if (opts.element === undefined) {
      opts.element = rollEnemyElement({
        boss: opts.boss, raider: opts.raider, swarm: opts.swarm,
        passive: false, threatM,
      });
    }
    return opts;
  }

  /**
   * @param {string|null} weaponId  weapon that dealt the hit (for per-weapon elements)
   * @param {{ noProc?: boolean, flat?: boolean, element?: string }} flags
   */
  hitAnimal(a, dmg, x, y, kb = 1, silent = false, weaponId = null, flags = null) {
    const f = flags || {};
    const atk = f.element || (weaponId && this.arsenal.elementOf(weaponId)) || this.ps.attackElement || null;
    let dealt;
    let crit = false;
    if (f.flat) {
      dealt = Math.max(1, Math.round(dmg));
    } else {
      crit = Math.random() < this.ps.crit;
      let mult = this.ps.might * (crit ? 2 : 1) * rand(0.9, 1.1);
      if (this.buffs.fury > 0) mult *= 2;
      if (atk) {
        mult *= 1 + (this.ps.elementPower[atk] || 0);
        mult *= elementMult(atk, a.element);
      }
      const flat = (this.ps.flatDamage || 0) + (atk ? (this.ps.elemFlat || 0) : 0);
      dealt = Math.max(1, Math.round(dmg * mult + flat));
    }
    if (!silent) {
      let col = crit ? '#ffd23f' : '#ffffff';
      if (atk && ELEMENTS[atk]) {
        const aff = elementMult(atk, a.element);
        if (aff > 1) col = ELEMENTS[atk].color;
        else if (aff < 1) col = '#a8b0b8';
        else col = ELEMENTS[atk].color;
      }
      this.addText(a.x + rand(-10, 10), a.y - a.height, crit ? dealt + '!' : String(dealt), col, crit ? 22 : 16, { vx: rand(-25, 25), life: 0.7 });
      if (crit) this.addShake(0.1);
      if (atk) this.fx.elementHit(a.x, a.y - a.bodyOff, atk, elementMult(atk, a.element));
    }
    a.lastHit = { dealt, element: atk, weaponId, source: f.noProc ? 'aoe' : 'hit' };
    if (!f.noProc && atk) applyElementOnHit(a, atk, dealt, this);
    const killed = a.damage(dealt, this, x, y, kb);
    if (!f.noProc && this.ps.lifesteal > 0 && this.player.alive) {
      const heal = Math.max(0, Math.floor(dealt * this.ps.lifesteal));
      if (heal > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      }
    }
    if (killed && !f.noProc && atk) applyElementOnKill(a, atk, dealt, this, weaponId);
  }

  hitStatic(o, dmg, x, y) {
    let mult = this.ps.might * rand(0.9, 1.1);
    if (this.buffs.fury > 0) mult *= 2;
    const dealt = Math.max(1, Math.round(dmg * mult));
    const ty = o.type === 'tree' ? o.y - 30 * o.size : o.y - 26;
    this.addText(o.x + rand(-10, 10), ty, String(dealt), '#ffffff', 16, { vx: rand(-25, 25), life: 0.7 });
    o.damage(dealt, this, x, y);
  }

  spawnArrow(tower, target) {
    if (this.arrows.length >= MAX_ARROWS) return;
    this.arrows.push(new Arrow(tower.x, tower.y, 78, target, this.stats.arrowDmg));
    Sound.play('bow');
  }

  updateSurvival(dt) {
    const p = this.player;
    if (!p.alive) return;
    for (const k of ['fury', 'vital', 'haste']) {
      if (this.buffs[k] > 0) this.buffs[k] = Math.max(0, this.buffs[k] - dt);
    }
    let regen = this.ps.regen;
    if (this.buffs.vital > 0) regen = Math.max(regen, 1) * 2;
    if (regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + regen * dt);
  }

  /** Keeps the wilderness populated; composition depends on time of day and how far the game is. */
  updateSpawning(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 1.6;
    const p = this.player;
    if (!p.alive) return;
    const day = this.dayNumber();
    let ambient = 0;
    for (const a of this.animals) if (!a.raider && !a.leaving && !a.swarm && !a.boss) ambient++;
    if (ambient >= Math.min(80, 46 + day * 4)) return;

    const night = this.isNight();
    const r = Math.random();
    let species, count = 1;
    if (night) {
      if (r < (day >= 2 ? 0.52 : 0.28)) {
        species = (day >= 4 && Math.random() < 0.18) ? 'dire_wolf' : 'wolf';
        count = 2 + Math.floor(Math.random() * (day >= 3 ? 4 : 2));
      } else if (r < 0.68 || day < 2) {
        species = (day >= 3 && Math.random() < 0.14) ? 'dire_boar' : 'boar';
      } else if (r < 0.82) {
        species = Math.random() < 0.55 ? 'beaver' : 'sheep';
      } else {
        species = (day >= 5 && Math.random() < 0.2) ? 'dire_bear' : 'bear';
      }
    } else {
      if (r < 0.12) species = 'deer';
      else if (r < 0.22) species = 'fox';
      else if (r < 0.34) species = 'sheep';
      else if (r < 0.46) species = 'beaver';
      else if (r < 0.82 || day < 2) species = (day >= 3 && Math.random() < 0.12) ? 'dire_boar' : 'boar';
      else species = (day >= 5 && Math.random() < 0.15) ? 'dire_bear' : 'bear';
    }

    const spot = this.findEnemySpawn(p.x, p.y, 720, 1300, 30);
    if (!spot) return;
    for (let i = 0; i < count; i++) {
      const x = spot.x + (i ? rand(-50, 50) : 0), y = spot.y + (i ? rand(-50, 50) : 0);
      if (this.spawnInBase(x, y)) continue;
      this.animals.push(new Animal(species, x, y, this.enemyOpts({
        species,
        big: isBoarish(species) && species === 'boar' && Math.random() < clamp(0.08 + this.time / 800, 0.08, 0.4),
        aggressive: true,
      })));
    }
  }

  updateSwarms(dt) {
    this.swarmTimer -= dt;
    if (this.swarmTimer > 0 || !this.player.alive) return;
    const day = this.dayNumber();
    this.swarmTimer = rand(38, 70) - Math.min(18, day * 2);
    let live = 0;
    for (const a of this.animals) if (a.swarm && !a.dead) live++;
    if (live > 10) return;
    this.startSwarm();
  }

  startSwarm() {
    const p = this.player;
    const day = this.dayNumber();
    const roll = Math.random();
    let species = 'squirrel';
    let label = 'Squirrel Swarm!';
    let tint = '#e0a060';
    let pack = 14;
    if (day >= 3 && roll < 0.34) {
      species = 'raccoon'; label = 'Raccoon Swarm!'; tint = '#c8c4d8'; pack = 10;
    } else if (roll < 0.62) {
      species = 'duck'; label = 'Duck Swarm!'; tint = '#6aaa4a'; pack = 16;
    }
    const count = Math.min(28, pack + day * 2);
    const t = this.threat();
    let n = 0;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + rand(-0.12, 0.12);
      const d = rand(340, 520);
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
      if (x < 80 || y < 80 || x > this.world.w - 80 || y > this.world.h - 80) continue;
      if (this.spawnInBase(x, y)) continue;
      this.animals.push(new Animal(species, x, y, this.enemyOpts({
        swarm: true, aggressive: true,
        mult: { hp: t.hp * 0.7, dmg: t.dmg * 0.85, speed: Math.min(1.35, t.speed + 0.08) },
      })));
      n++;
    }
    if (!n) return;
    this.ui.banner(label, n + ' pests close in from every side!', tint);
    Sound.play('chitter');
  }

  spawnMiniboss(wave) {
    const t = this.threat();
    const n = wave >= 7 ? 2 : 1;
    const kinds = wave <= 1 ? ['boar', 'dire_boar']
      : wave === 2 ? ['boar', 'wolf', 'dire_wolf']
      : ['boar', 'wolf', 'bear', 'dire_boar', 'dire_wolf', 'dire_bear'];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      let species = kinds[Math.floor(Math.random() * kinds.length)];
      // Twin minibosses prefer different types.
      if (used.has(species) && kinds.length > 1) {
        const alt = kinds.filter((k) => !used.has(k));
        if (alt.length) species = alt[Math.floor(Math.random() * alt.length)];
      }
      used.add(species);
      const ang = this.raid.angles[i % this.raid.angles.length] + rand(-0.4, 0.4);
      const dist = RAID_DISTANCE * 0.72;
      let x = clamp(this.base.x + Math.cos(ang) * dist, 280, this.world.w - 280);
      let y = clamp(this.base.y + Math.sin(ang) * dist, 280, this.world.h - 280);
      if (this.spawnInBase(x, y)) {
        const far = this.findEnemySpawn(this.base.x, this.base.y, RAID_DISTANCE * 0.6, RAID_DISTANCE, 36);
        if (!far) continue;
        x = far.x; y = far.y;
      }
      const stars = rollStars(t.m, { boss: true, raider: true });
      const sm = starMult(stars);
      const dire = species.startsWith('dire_');
      const hp = Math.round(SPECIES[species].hp * (16 + wave * 5) * t.hp * sm.hp * (dire ? 0.85 : 1));
      this.animals.push(new Animal(species, x, y, {
        boss: true, raider: true, aggressive: true, stars,
        element: rollEnemyElement({ boss: true, raider: true, threatM: t.m }),
        maxHp: hp,
        mult: { hp: 1, dmg: t.dmg * (1.4 + 0.12 * wave) * (dire ? 1.1 : 1), speed: Math.min(1.15, t.speed) },
      }));
    }
    this.ui.banner(n > 1 ? 'Twin minibosses!' : 'Miniboss incoming!', 'A huge beast leads tonight\'s raid.', '#c46bff');
  }

  /** Every 3rd night: a true boss with randomized specials + screen HP bar. */
  spawnTrueBoss(wave) {
    const t = this.threat();
    const kinds = wave <= 3 ? ['boar', 'wolf', 'dire_boar', 'dire_wolf']
      : ['boar', 'wolf', 'bear', 'dire_boar', 'dire_wolf', 'dire_bear'];
    const species = kinds[Math.floor(Math.random() * kinds.length)];
    const ang = this.raid.angles[0] + rand(-0.3, 0.3);
    const dist = RAID_DISTANCE * 0.68;
    let x = clamp(this.base.x + Math.cos(ang) * dist, 280, this.world.w - 280);
    let y = clamp(this.base.y + Math.sin(ang) * dist, 280, this.world.h - 280);
    if (this.spawnInBase(x, y)) {
      const far = this.findEnemySpawn(this.base.x, this.base.y, RAID_DISTANCE * 0.6, RAID_DISTANCE, 36);
      if (!far) return;
      x = far.x; y = far.y;
    }
    const stars = Math.max(3, rollStars(t.m, { boss: true, raider: true }));
    const sm = starMult(stars);
    const dire = species.startsWith('dire_');
    const hp = Math.round(SPECIES[species].hp * (42 + wave * 10) * t.hp * sm.hp * (dire ? 0.9 : 1));
    const moves = rollBossAbilities(2);
    const element = rollEnemyElement({ boss: true, raider: true, threatM: t.m }) || ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)];
    const boss = new Animal(species, x, y, {
      boss: true, trueBoss: true, raider: true, aggressive: true, stars,
      element, maxHp: hp, bossMoves: moves,
      mult: { hp: 1, dmg: t.dmg * (1.8 + 0.15 * wave) * (dire ? 1.12 : 1), speed: Math.min(1.1, t.speed * 0.95) },
    });
    this.animals.push(boss);
    this.activeBoss = boss;
    const moveNames = moves.map((id) => BOSS_ABILITY[id].name).join(' · ');
    this.ui.banner('BOSS NIGHT', boss.name + ' — ' + (ELEMENTS[element] ? ELEMENTS[element].name : '') + ' · ' + moveNames, '#ff4d6d');
    this.ui.showBossBar(boss);
    Sound.play('horn');
  }

  /** True if a living boss of this exact species is already on the map. */
  hasBossOfType(species) {
    for (const a of this.animals) {
      if (!a.dead && a.boss && a.species === species) return true;
    }
    return false;
  }

  /**
   * Daytime: killing wildlife can awaken a matching boss. Multiple bosses may
   * roam at once, but never two of the same species.
   */
  tryDayBossFromKill(a) {
    if (this.nuking || this.isNight() || !this.player.alive) return;
    if (a.boss || a.trueBoss || a.raider) return;
    let kind = a.species;
    // Swarm pests can wake their own champion; dire kills prefer the dire form.
    if (!DAY_BOSS_SPECIES.includes(kind)) {
      kind = animalFamily(kind);
      if (!DAY_BOSS_SPECIES.includes(kind)) return;
    }
    if (this.hasBossOfType(kind)) return;

    const day = this.dayNumber();
    let chance = 0.035;
    if (a.swarm) chance = 0.012;
    else if (isBearish(kind) || kind.startsWith('dire_')) chance = 0.07;
    else if (kind === 'deer' || kind === 'fox') chance = 0.045;
    else if (isTinyPest(kind)) chance = 0.028;
    if (a.big) chance += 0.025;
    chance += Math.min(0.06, day * 0.006);
    chance *= 1 + Math.min(0.5, (a.stars || 0) * 0.08);
    if (Math.random() > chance) return;

    this.spawnDayBoss(kind, a.x, a.y);
  }

  spawnDayBoss(species, nearX, nearY) {
    if (this.hasBossOfType(species)) return;
    const t = this.threat();
    const day = this.dayNumber();
    const spot = this.findEnemySpawn(nearX, nearY, 280, 520, 36)
      || this.findEnemySpawn(this.player.x, this.player.y, 420, 780, 36)
      || this.findEnemySpawn(this.base.x, this.base.y, 520, 900, 36);
    if (!spot || this.spawnInBase(spot.x, spot.y)) return;
    const stars = Math.max(1, rollStars(t.m, { boss: true }));
    const sm = starMult(stars);
    const tiny = isTinyPest(species);
    const dire = species.startsWith('dire_');
    const hpScale = tiny ? 22 + day * 4 : 14 + day * 3.5;
    const hp = Math.round(SPECIES[species].hp * hpScale * t.hp * sm.hp * (dire ? 0.9 : 1));
    const boss = new Animal(species, spot.x, spot.y, {
      boss: true, dayBoss: true, aggressive: true, stars,
      element: rollEnemyElement({ boss: true, threatM: t.m }),
      maxHp: hp,
      mult: {
        hp: 1,
        dmg: t.dmg * (1.25 + day * 0.08) * (dire ? 1.1 : 1),
        speed: Math.min(1.2, t.speed),
      },
    });
    this.animals.push(boss);
    this.ui.banner(boss.name + '!', 'Hunts you and your camp.', '#c46bff');
    this.fx.ring(boss.x, boss.y, 'rgba(196,107,255,0.85)', 28, 420, 0.65);
    this.addShake(0.35);
    Sound.play(isWolfish(species) ? 'growl' : isBearish(species) ? 'roar' : 'horn');
  }

  updateCamera(dt) {
    const c = this.camera, p = this.player;
    c.x = damp(c.x, p.x + p.vx * 0.22, 5, dt);
    c.y = damp(c.y, p.y - 20 + p.vy * 0.22, 5, dt);
    const halfW = this.viewW / this.zoom / 2, halfH = this.viewH / this.zoom / 2;
    const W = this.world.w, H = this.world.h;
    c.x = halfW * 2 < W ? clamp(c.x, halfW, W - halfW) : W / 2;
    c.y = halfH * 2 < H ? clamp(c.y, halfH, H - halfH) : H / 2;
    c.trauma = Math.max(0, c.trauma - dt * 2.2);
    const intensity = (typeof Settings !== 'undefined' ? Settings.shakeScale : 1);
    const shake = c.trauma * c.trauma * 16 * intensity;
    c.ox = shake ? rand(-shake, shake) : 0;
    c.oy = shake ? rand(-shake, shake) : 0;
  }

  addShake(amount) {
    const intensity = (typeof Settings !== 'undefined' ? Settings.shakeScale : 1);
    if (intensity <= 0) return;
    this.camera.trauma = Math.min(0.8, this.camera.trauma + amount * intensity);
  }

  // -------------------------------------------------------------------------
  // Floating text
  // -------------------------------------------------------------------------

  addText(x, y, text, color, size = 16, opts = {}) {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x, y, text, color, size,
      age: 0, life: opts.life || 0.9,
      vx: opts.vx || 0, vy: opts.vy === undefined ? -48 : opts.vy,
      key: opts.key || null, amount: opts.amount || 0, follow: !!opts.follow,
      oy: opts.oy || 0,
    });
  }

  addCollectText(type, amount) {
    const p = this.player;
    const key = 'res_' + type;
    const oy = -58 - RES_SLOT[type] * 18;
    for (const t of this.texts) {
      if (t.key === key && t.age < 0.6) {
        t.amount += amount;
        t.text = '+' + t.amount + ' ' + RES_LABEL[type];
        t.age = 0.12;
        return;
      }
    }
    this.addText(p.x, p.y + oy, '+' + amount + ' ' + RES_LABEL[type], RES_COLOR[type], 17,
      { key, amount, life: 1.0, vy: -20, follow: true, oy });
  }

  updateTexts(dt) {
    const p = this.player;
    for (const t of this.texts) {
      t.age += dt;
      if (t.follow) {
        t.x = p.x;
        t.oy += t.vy * dt;
        t.y = p.y + t.oy;
      } else {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
      }
    }
    compactInPlace(this.texts, (t) => t.age >= t.life);
  }

  // -------------------------------------------------------------------------
  // Resources, drops, progression
  // -------------------------------------------------------------------------

  /**
   * Spawns one high-value drop (amount = total yield). Merges into a nearby
   * same-type pickup when possible so the ground stays uncluttered.
   */
  spawnDrops(type, amount, x, y) {
    const value = Math.max(1, Math.round(amount));
    this.spawnOrStack(type, value, x, y);
  }

  spawnOrStack(type, value, x, y) {
    const STACK_R2 = 78 * 78;
    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      if (pk.dead || pk.collected || pk.type !== type) continue;
      if (pk.isPowerup || pk.type === 'chest') continue;
      if (dist2(pk.x, pk.y, x, y) > STACK_R2) continue;
      pk.value = (pk.value || 1) + value;
      pk.age = Math.min(pk.age, 1.2);
      pk.z = Math.max(pk.z, 6);
      pk.vz = Math.max(pk.vz, 140);
      return pk;
    }
    this.ensurePickupSlot();
    const a = Math.random() * TAU, sp = rand(55, 140);
    this.pickups.push(new Pickup(type, x + rand(-6, 6), y + rand(-6, 6), Math.cos(a) * sp, Math.sin(a) * sp * 0.7, value));
    return this.pickups[this.pickups.length - 1];
  }

  ensurePickupSlot() {
    if (this.pickups.length < MAX_PICKUPS) return;
    // Prefer merging the oldest resource/xp into a nearby peer before auto-collecting.
    const old = this.pickups.shift();
    if (!old || old.collected) return;
    if (!old.isPowerup && old.type !== 'chest') {
      for (let i = 0; i < this.pickups.length; i++) {
        const pk = this.pickups[i];
        if (pk.dead || pk.collected || pk.type !== old.type) continue;
        pk.value = (pk.value || 1) + (old.value || 1);
        return;
      }
    }
    old.collected = true;
    if (old.type === 'xp') this.gainXp(old.value);
    else if (RES_LABEL[old.type]) {
      this.res[old.type] += old.value || 1;
      if (old.type === 'gold') this.counters.gold += old.value || 1;
      this.resVersion++;
    }
  }

  /** Merge settled same-type pickups that landed close together. */
  stackNearbyPickups() {
    const list = this.pickups;
    const R2 = 52 * 52;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead || a.collected || a.isPowerup || a.type === 'chest') continue;
      if (a.z > 4) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead || b.collected || b.type !== a.type) continue;
        if (b.z > 4) continue;
        if (dist2(a.x, a.y, b.x, b.y) > R2) continue;
        a.value = (a.value || 1) + (b.value || 1);
        a.x = (a.x + b.x) * 0.5;
        a.y = (a.y + b.y) * 0.5;
        b.dead = true;
        b.collected = true;
      }
    }
  }

  collectPickup(pk) {
    if (pk.collected) return;
    pk.collected = true;
    pk.dead = true;
    if (POWERUPS[pk.type]) {
      this.activatePowerup(pk.type);
      return;
    }
    if (pk.type === 'xp') {
      this.gainXp(pk.value);
      this.fx.sparkle(this.player.x, this.player.y, '#7ee0ff');
      Sound.play('xp');
      return;
    }
    this.res[pk.type] += pk.value || 1;
    if (pk.type === 'gold') this.counters.gold += pk.value || 1;
    this.resVersion++;
    this.addCollectText(pk.type, pk.value || 1);
    this.fx.sparkle(this.player.x, this.player.y, RES_COLOR[pk.type]);
    if (pk.type === 'gold') Sound.play('gold');
    else Sound.play('pickup', pk.type === 'meat' ? 0.8 : rand(1, 1.15));
  }

  spawnPowerup(x, y, type) {
    if (this.pickups.length >= MAX_PICKUPS) return;
    const a = Math.random() * TAU, sp = rand(80, 170);
    this.pickups.push(new Pickup(type, x + rand(-4, 4), y + rand(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp * 0.7));
  }

  /** Chance rises with stars / bosses; swarms rarely drop. Nuke is very rare. */
  rollPowerupDrop(a) {
    if (this.nuking) return;
    let chance = 0.07;
    if (a.boss) chance = 0.55;
    else if (a.swarm) chance = 0.018;
    else if (a.big || a.raider) chance = 0.14;
    chance += (a.stars || 0) * 0.025;
    if (Math.random() > chance) return;
    let total = 0;
    for (const id of POWERUP_IDS) total += POWERUPS[id].weight;
    let r = Math.random() * total;
    let pick = 'haste';
    for (const id of POWERUP_IDS) {
      r -= POWERUPS[id].weight;
      if (r <= 0) { pick = id; break; }
    }
    this.spawnPowerup(a.x, a.y, pick);
  }

  activatePowerup(type) {
    const def = POWERUPS[type];
    if (!def) return;
    const p = this.player;
    this.fx.ring(p.x, p.y, def.color, 18, 220, 0.55);
    this.fx.sparkle(p.x, p.y, def.color);
    this.addText(p.x, p.y - 70, def.label + '!', def.color, 22, { life: 1.3, vy: -40 });
    Sound.play('upgrade');

    if (type === 'magnet') {
      this.vacuumPickups();
      this.ui.banner(def.name, def.desc, def.color);
      return;
    }
    if (type === 'nuke') {
      this.triggerNuke();
      return;
    }
    this.buffs[type] = Math.max(this.buffs[type] || 0, def.duration);
    this.ui.banner(def.name, def.desc + ' · ' + def.duration + 's', def.color);
  }

  /** Pull every resource / XP shard on the map into the player. */
  vacuumPickups(style) {
    const p = this.player;
    const ring = (style && style.ring) || 'rgba(255,107,107,0.9)';
    const label = (style && style.label) || '#ff6b6b';
    let n = 0;
    for (const pk of this.pickups) {
      if (pk.collected || pk.dead || POWERUPS[pk.type]) continue;
      pk.magnet = true;
      pk.speed = 2200;
      pk.age = Math.max(pk.age, 0.35);
      n++;
    }
    this.fx.ring(p.x, p.y, ring, 40, 520, 0.7);
    this.addShake(0.2);
    if (n) this.addText(p.x, p.y - 90, n + ' drops inbound', label, 16, { life: 1.1 });
  }

  /** Wipe every tree and non-boss beast. Bosses survive. Vacuums all drops. */
  triggerNuke() {
    const p = this.player;
    this.nuking = true;
    this.ui.banner('Cataclysm!', 'Forest and beasts scoured — loot rushes in. Bosses endure.', '#ffe066');
    this.addShake(0.85);
    this.fx.ring(p.x, p.y, 'rgba(255,224,102,0.95)', 60, 900, 1.1);
    Sound.play('boom');

    let beasts = 0, trees = 0;
    for (const a of this.animals) {
      if (a.dead || a.boss) continue;
      a.damage(a.maxHp + 9999, this, p.x, p.y, 0.2);
      beasts++;
    }
    for (const t of this.world.trees) {
      if (!t.isHittable()) continue;
      t.damage(t.maxHp + 9999, this, p.x, p.y);
      trees++;
    }
    this.nuking = false;
    this.vacuumPickups({ ring: 'rgba(255,224,102,0.9)', label: '#ffe066' });
    this.addText(p.x, p.y - 96, trees + ' trees · ' + beasts + ' beasts', '#ffe066', 18, { life: 1.6, vy: -30 });
  }

  spawnXp(amount, x, y) {
    this.spawnOrStack('xp', Math.max(1, Math.round(amount)), x, y);
  }

  canAfford(cost) {
    for (const k in cost) if (this.res[k] < cost[k]) return false;
    return true;
  }

  atCamp() { return this.player.alive && this.base.contains(this.player.x, this.player.y, 30); }

  /** Returns a reason string if the upgrade can't be bought right now, else null. */
  upgradeBlocker(def) {
    const lvl = this.levels[def.id];
    if (lvl >= def.max) return 'Maxed';
    if (def.kind === 'base' && !this.atCamp()) return 'Return to camp to build';
    if (def.requires && !def.requires(this.levels)) return def.reqText;
    if (!this.canAfford(upgradeCost(def, lvl))) return 'Not enough resources';
    return null;
  }

  buyUpgrade(id) {
    if (this.state !== 'playing' && this.state !== 'paused') return false;
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const blocker = this.upgradeBlocker(def);
    if (blocker) {
      Sound.play('deny');
      if (blocker !== 'Maxed') this.addText(this.player.x, this.player.y - 64, blocker, '#ff9f8a', 14, { life: 0.9 });
      return false;
    }
    const lvl = this.levels[id];
    const cost = upgradeCost(def, lvl);
    for (const k in cost) this.res[k] -= cost[k];
    this.levels[id] = lvl + 1;
    this.stats = computeStats(this.levels, this.metaBonuses());
    this.base.apply(this.levels, this.stats);
    if (id === 'blacksmith') {
      this.shop.setSmithLuck(this.stats.smithLuck || 0);
      if (!this.shop.built) this.shop.onBuilt(this.stats.forgeLevel, this.stats.smithLuck);
      else this.shop.restock(this.stats.forgeLevel);
    }
    this.syncPlayerStats();
    this.counters.upgrades++;
    this.resVersion++;

    const p = this.player;
    this.addText(p.x, p.y - 74, def.name + ' ' + (lvl + 1) + '!', '#9ef08a', 22, { life: 1.3, vy: -36 });
    if (def.kind === 'base') {
      const b = this.base;
      this.fx.ring(b.x, b.y, 'rgba(255,224,138,0.9)', 30, 380, 0.7);
      this.fx.dust(b.x, b.y, 10);
      Sound.play('build');
    } else {
      this.fx.ring(p.x, p.y, 'rgba(158,240,138,0.9)', 12, 220, 0.5);
      this.fx.ring(p.x, p.y, 'rgba(255,255,255,0.8)', 6, 160, 0.4);
    }
    for (let i = 0; i < 10; i++) this.fx.sparkle(p.x + rand(-20, 20), p.y, '#d6ffb8');
    this.addShake(0.15);
    Sound.play('upgrade');
    this.ui.flashUpgrade(id);
    if (id === 'blacksmith' && lvl === 0) this.offerTutorial('smith');
    return true;
  }

  gainXp(n) {
    this.xp += n * (this.ps.xpGain || 1);
    let need = xpNeeded(this.level);
    while (this.xp >= need) {
      this.xp -= need;
      this.level++;
      need = xpNeeded(this.level);
      this.onLevelUp();
    }
  }

  onLevelUp() {
    const p = this.player;
    this.syncPlayerStats();
    this.addText(p.x, p.y - 90, 'LEVEL ' + this.level + '!', '#ffd23f', 26, { life: 1.6, vy: -30 });
    this.addText(p.x, p.y - 112, '+10 Max HP', '#9ef08a', 14, { life: 1.2, vy: -24 });
    this.fx.ring(p.x, p.y, 'rgba(255,210,63,0.95)', 10, 260, 0.6);
    for (let i = 0; i < 14; i++) this.fx.sparkle(p.x + rand(-26, 26), p.y, '#ffe680');
    Sound.play('levelup');
    this.levelQueue++;
    if (this.state === 'playing' || this.state === 'choosing') this.offerCards();
  }

  offerCards() {
    if (this.levelQueue <= 0) {
      this.cards = [];
      if (this.state === 'choosing') {
        this.state = 'playing';
        this.lastTs = null;
      }
      this.ui.showCards(null);
      return;
    }
    this.state = 'choosing';
    this.input.reset();
    this.cards = this.arsenal.cardOptions(5, this.banished);
    this.ui.showCards(this.cards, this.level);
  }

  rerollCards() {
    if (this.state !== 'choosing' || this.rerollsLeft <= 0) return;
    this.rerollsLeft--;
    this.cards = this.arsenal.cardOptions(5, this.banished);
    this.ui.showCards(this.cards, this.level);
    Sound.play('click');
  }

  banishCard(i) {
    if (this.state !== 'choosing' || this.banishesLeft <= 0) return;
    const card = this.cards[i];
    if (!card) return;
    this.banishesLeft--;
    this.banished.add(cardKey(card));
    this.cards = this.arsenal.cardOptions(5, this.banished);
    this.ui.showCards(this.cards, this.level);
    Sound.play('click');
  }

  pickCard(i) {
    const card = this.cards[i];
    if (!card || this.state !== 'choosing') return;
    if (card.kind === 'bonus') {
      if (card.id === 'gold') {
        const g = 8 + this.level * 2;
        this.res.gold += g; this.counters.gold += g; this.resVersion++;
        this.addText(this.player.x, this.player.y - 70, '+' + g + ' Gold', '#ffe066', 20, { life: 1.2 });
      } else {
        this.player.hp = this.player.maxHp;
        this.addText(this.player.x, this.player.y - 70, 'Fully healed', '#9ef08a', 20, { life: 1.2 });
      }
    } else {
      this.arsenal.apply(card);
      this.syncPlayerStats();
      this.arsenal.syncAxes();
    }
    this.fx.ring(this.player.x, this.player.y, 'rgba(158,240,138,0.9)', 12, 220, 0.5);
    Sound.play('upgrade');
    this.levelQueue--;
    this.offerCards();
  }

  // -------------------------------------------------------------------------
  // Events from entities
  // -------------------------------------------------------------------------

  onTreeChopped(tree) {
    this.counters.trees++;
    const tm = this.threat().m;
    const threatLoot = 1 + tm * 0.1;
    const wood = Math.max(1, Math.round((tree.wood + (Math.random() < 0.35 ? 1 : 0)) * threatLoot));
    this.spawnDrops('wood', wood, tree.x, tree.y);
    const goldChance = (tree.size >= 1.2 ? 0.6 : 0.1) * (1 + tm * 0.04);
    if (Math.random() < Math.min(0.85, goldChance)) {
      this.spawnDrops('gold', Math.max(1, Math.round(threatLoot)), tree.x, tree.y);
    }
    if (Math.random() < 0.1 + Math.min(0.15, tm * 0.01)) {
      this.spawnXp(Math.max(1, Math.round((2 + tree.size * 2) * (1 + tm * 0.08))), tree.x, tree.y);
    }
    if (!this.nuking) {
      this.fx.woodChips(tree.x, tree.y - 14, this.player.x, this.player.y, 10);
      this.addShake(0.22);
      Sound.play('treeFall');
    }
  }

  onAnimalKilled(a) {
    const sp = a.sp;
    this.counters.kills++;
    if (a.boss) this.counters.bosses++;
    const tm = this.threat().m;
    const stars = a.stars || 0;
    const lootM = (a.lootMult || (1 + stars * 0.4)) * (this.ps.lootMult || 1);
    // Threat scales loot & XP; veterancy multiplies further via lootM / xpMult.
    const threatLoot = 1 + tm * 0.14;
    const threatXp = 1 + tm * 0.12;

    let meat = (a.boss ? 4 : 0) + (a.big ? 2 : 0)
      + sp.meat[0] + Math.floor(Math.random() * (sp.meat[1] - sp.meat[0] + 1));
    meat = Math.round(meat * lootM * threatLoot);
    if (stars >= 3) meat += stars - 2;
    if (meat > 0) this.spawnDrops('meat', meat, a.x, a.y);

    const goldChance = Math.min(1, (a.boss ? 1 : sp.goldChance)
      * (1 + stars * 0.15) * (1 + tm * 0.05));
    let gold = Math.random() < goldChance ? sp.gold : 0;
    if (a.big) gold += 2;
    if (a.boss) gold += 6 + this.dayNumber();
    if (a.raider) gold += 1;
    if (gold > 0) {
      gold = Math.round(gold * lootM * threatLoot);
      gold += Math.floor(stars * 0.75) + Math.floor(tm * 0.35);
      this.spawnDrops('gold', Math.max(1, gold), a.x, a.y);
    }

    const xp = Math.round(sp.xp * (a.big ? 2.3 : 1) * (a.boss ? 8 : 1) * (a.swarm ? 0.7 : 1)
      * (a.xpMult || 1) * threatXp * (a.element ? 1.15 : 1)
      * (a.trueBoss ? 1.35 : 1) * (this.ps.lootMult || 1));
    this.spawnXp(Math.max(1, xp), a.x, a.y);
    this.rollPowerupDrop(a);
    if (!this.nuking) {
      this.fx.deathBurst(a.x, a.y - a.bodyOff, sp.color, a.boss ? 22 : isBearish(a.species) ? 18 : 12);
      this.addShake(a.boss ? 0.7 : a.big || isBearish(a.species) ? 0.4 : 0.26);
      Sound.play(a.boss ? 'roar' : 'boarDie');
    }
    this.tryDayBossFromKill(a);
  }

  onOreBroken(rock) {
    const tm = this.threat().m;
    const gold = Math.max(1, Math.round((3 + Math.floor(Math.random() * 3)) * (1 + tm * 0.12)));
    this.spawnDrops('gold', gold, rock.x, rock.y);
    this.fx.rockChips(rock.x, rock.y - 8, 12);
    this.fx.sparks(rock.x, rock.y - 10, 12, '#ffe082');
    this.addShake(0.25);
    Sound.play('treeFall');
  }

  onCampHit(core, dmg) {
    this.addText(core.x + rand(-30, 30), core.y - 110, '-' + dmg, '#ff7b5a', 18, { life: 0.8 });
    if (this.campAlertCd <= 0) {
      this.campAlertCd = 10;
      this.ui.banner('The camp is under attack!', 'Defend the cabin or the run is over.', '#ff6b6b');
      Sound.play('horn');
    }
  }

  onCampDestroyed() {
    if (this.state !== 'playing') return;
    const c = this.base.core;
    this.fx.deathBurst(c.x, c.y - 40, '#9a6232', 24);
    this.fx.dust(c.x, c.y, 20);
    this.addShake(0.8);
    Sound.play('death');
    this.gameOverReason = 'camp';
    this.state = 'dying';
    this.deathTime = this.time;
    this.deathTimer = 2;
    this.input.reset();
  }

  onWallDestroyed(w) {
    this.addText(w.x, w.y - 40, 'Wall broken!', '#ffb36b', 16, { life: 1.1 });
    this.fx.woodChips(w.x, w.y - 10, w.x, w.y + 30, 10);
    this.addShake(0.2);
    Sound.play('treeFall');
  }

  onPlayerHurt(amount) {
    const p = this.player;
    this.addText(p.x, p.y - 50, '-' + amount, '#ff5a5f', 20, { life: 0.9, vx: rand(-20, 20) });
    this.hurtFlash = 0.6;
    this.addShake(0.45);
    this.fx.hitPuff(p.x, p.y - 18, 8);
    Sound.play('hurt');
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    const p = this.player;
    this.gameOverReason = 'player';
    this.state = 'dying';
    this.deathTime = this.time;
    this.deathTimer = 1.6;
    this.input.reset();
    this.fx.deathBurst(p.x, p.y - 14, '#d64534', 14);
    this.addShake(0.7);
    Sound.play('death');
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  render() {
    const ctx = this.ctx, dpr = this.dpr, z = this.zoom;
    const vw = this.viewW, vh = this.viewH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1b3014';
    ctx.fillRect(0, 0, vw, vh);

    this.refreshViewBounds(true);
    const x0 = this.view.x0, y0 = this.view.y0, x1 = this.view.x1, y1 = this.view.y1;
    const s = dpr * z;
    const worldTransform = () => ctx.setTransform(s, 0, 0, s, Math.round(-x0 * s), Math.round(-y0 * s));
    worldTransform();

    this.world.drawGround(ctx, x0, y0, x1, y1, this.groundScale);
    this.base.drawGround(ctx, this.view);
    this.arsenal.drawGround(ctx);
    for (const h of this.hazards) {
      if (!this.inView(h.x, h.y, 80)) continue;
      h.draw(ctx, this);
    }
    for (const a of this.animals) {
      if (a.dead || !a.drawAbilityGround) continue;
      if (!this.inView(a.x, a.y, 120)) continue;
      a.drawAbilityGround(ctx, this);
    }

    // Collect visible drawables and depth-sort by ground Y.
    const vis = this._vis, q = this._q;
    vis.length = 0;
    q.length = 0;
    this.world.staticGrid.queryRect(x0 - 90, y0 - 60, x1 + 90, y1 + 220, q);
    for (let i = 0; i < q.length; i++) vis.push(q[i]);
    q.length = 0;
    this.world.bushGrid.queryRect(x0 - 40, y0 - 40, x1 + 40, y1 + 50, q);
    for (let i = 0; i < q.length; i++) vis.push(q[i]);
    this.base.collectVisible(vis, x0, y0, x1, y1);
    for (const a of this.animals) {
      if (a.x > x0 - 60 && a.x < x1 + 60 && a.y > y0 - 30 && a.y < y1 + 90) vis.push(a);
    }
    for (const pk of this.pickups) {
      if (pk.x > x0 - 20 && pk.x < x1 + 20 && pk.y > y0 - 20 && pk.y < y1 + 40) vis.push(pk);
    }
    for (const shot of this.enemyShots) {
      if (shot.x > x0 - 30 && shot.x < x1 + 30 && shot.y > y0 - 30 && shot.y < y1 + 40) vis.push(shot);
    }
    vis.push(this.player);
    this.arsenal.collectVisible(vis, x0, y0, x1, y1);
    vis.sort((a, b) => a.y - b.y);

    for (let i = 0; i < vis.length; i++) {
      const o = vis[i];
      if (o.drawShadow) o.drawShadow(ctx);
    }
    this.arsenal.drawTrails(ctx);
    for (let i = 0; i < vis.length; i++) vis[i].draw(ctx, this);
    for (const ar of this.arrows) {
      if (!this.inView(ar.x, ar.y, 40)) continue;
      ar.draw(ctx);
    }
    this.arsenal.drawAbove(ctx);

    this.particles.draw(ctx, x0 - 20, y0 - 20, x1 + 20, y1 + 60);

    // Night: darkness with light cut-outs, then glowing eyes and text on top.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawLighting(ctx, x0, y0);
    worldTransform();
    if (this.darkLevel > 0.25) {
      for (const a of this.animals) {
        if (a.x > x0 - 30 && a.x < x1 + 30 && a.y > y0 && a.y < y1 + 60) a.drawEyeGlow(ctx, this);
      }
    }
    this.drawTexts(ctx);

    // Screen-space overlays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, vw, vh);
    const p = this.player;
    const lowHp = p.alive && p.hp / p.maxHp < 0.3 ? (0.35 + Math.sin(this.time * 6) * 0.15) : 0;
    const hurt = Math.max(this.hurtFlash, lowHp);
    if (hurt > 0) {
      ctx.globalAlpha = clamp(hurt, 0, 1);
      ctx.fillStyle = this.hurtGradient;
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }
    this.drawIndicators(ctx, x0, y0);
    this.drawJoystick(ctx);
  }

  drawLighting(ctx, x0, y0) {
    const p = this.phase();
    const vw = this.viewW, vh = this.viewH;
    // warm tint around dusk and dawn
    const dusk = p >= PHASE_DUSK - 0.05 && p < PHASE_NIGHT ? 1 - Math.abs(p - (PHASE_DUSK + 0.02)) / 0.07 : 0;
    const dawn = p >= PHASE_DAWN ? 1 - Math.abs(p - (PHASE_DAWN + 0.025)) / 0.03 : 0;
    const tint = clamp(Math.max(dusk, dawn), 0, 1);
    if (tint > 0) {
      ctx.fillStyle = 'rgba(255,120,40,' + (0.16 * tint).toFixed(3) + ')';
      ctx.fillRect(0, 0, vw, vh);
    }
    const dark = this.darkLevel;
    if (dark < 0.01) return;

    const lights = this._lights;
    lights.length = 0;
    if (this.player.alive) lights.push({ x: this.player.x, y: this.player.y - 15, r: 200, a: 1, warm: false });
    this.base.collectLights(lights, this);

    const lc = this.lightCanvas, l = this.lightCtx;
    const W = lc.width, H = lc.height;
    const k = this.zoom * LIGHT_SCALE;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, W, H);
    l.fillStyle = 'rgba(8,12,40,' + dark.toFixed(3) + ')';
    l.fillRect(0, 0, W, H);
    l.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const sx = (L.x - x0) * k, sy = (L.y - y0) * k, r = L.r * k;
      if (sx + r < 0 || sy + r < 0 || sx - r > W || sy - r > H) continue;
      const g = l.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(0,0,0,' + L.a + ')');
      g.addColorStop(0.55, 'rgba(0,0,0,' + (L.a * 0.65) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.drawImage(lc, 0, 0, vw, vh);

    // warm additive glow around fires
    ctx.globalCompositeOperation = 'lighter';
    const z = this.zoom;
    for (const L of lights) {
      if (!L.warm) continue;
      const sx = (L.x - x0) * z, sy = (L.y - y0) * z, r = L.r * z * 0.6;
      if (sx + r < 0 || sy + r < 0 || sx - r > vw || sy - r > vh) continue;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(255,140,50,' + (0.22 * dark).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Arrows on the screen edge pointing at the camp and at off-screen raiders. */
  drawIndicators(ctx, x0, y0) {
    if (this.state === 'gameover') return;
    const z = this.zoom, vw = this.viewW, vh = this.viewH;
    const left = 26, right = vw - 26, top = vw < 900 ? 150 : 96, bottom = vh - 30;
    const marker = (wx, wy, color, size, label) => {
      const sx = (wx - x0) * z, sy = (wy - y0) * z;
      if (sx > left && sx < right && sy > top && sy < bottom) return;
      const cx = vw / 2, cy = vh / 2;
      const dx = sx - cx, dy = sy - cy;
      let t = 1;
      if (dx > 0) t = Math.min(t, (right - cx) / dx);
      if (dx < 0) t = Math.min(t, (left - cx) / dx);
      if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
      if (dy < 0) t = Math.min(t, (top - cy) / dy);
      const ex = cx + dx * t, ey = cy + dy * t;
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(size, 0); ctx.lineTo(-size * 0.7, -size * 0.75); ctx.lineTo(-size * 0.35, 0); ctx.lineTo(-size * 0.7, size * 0.75);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,5,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      if (label) {
        ctx.font = '900 12px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lx = ex - Math.cos(ang) * 26, ly = ey - Math.sin(ang) * 22;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(20,10,5,0.9)';
        ctx.strokeText(label, lx, ly);
        ctx.fillStyle = color;
        ctx.fillText(label, lx, ly);
      }
    };
    let shown = 0;
    for (const a of this.animals) {
      if (a.dead) continue;
      if (a.trueBoss) { marker(a.x, a.y, '#ff4d6d', 14, 'BOSS'); continue; }
      if (a.boss) { marker(a.x, a.y, '#c46bff', 12, 'MINI'); continue; }
      if (a.raider) { marker(a.x, a.y, '#ff5a4d', 9, null); if (++shown >= 14) break; }
    }
    const core = this.base.core;
    const dist = Math.round(Math.hypot(this.player.x - core.x, this.player.y - core.y) / 10);
    marker(core.x, core.y - 40, '#ffd23f', 13, 'Camp ' + dist + 'm');
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const v = this.view;
    for (const t of this.texts) {
      if (t.x < v.x0 - 40 || t.x > v.x1 + 40 || t.y < v.y0 - 40 || t.y > v.y1 + 40) continue;
      const k = t.age / t.life;
      const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const pop = t.age < 0.15 ? 0.5 + 0.5 * easeOutBack(t.age / 0.15) : 1;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(t.x, t.y);
      ctx.scale(pop, pop);
      ctx.font = '900 ' + t.size + 'px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(30,15,5,0.9)';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }

  drawJoystick(ctx) {
    const j = this.input.joy;
    if (!j.active || this.state !== 'playing') return;
    const dx = j.x - j.ox, dy = j.y - j.oy;
    const d = Math.hypot(dx, dy);
    const k = d > 55 ? 55 / d : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ellipse(ctx, j.ox, j.oy, 55, 55);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ellipse(ctx, j.ox + dx * k, j.oy + dy * k, 22, 22);
    ctx.fill();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
