import { formatNum, formatTime, BUILD_VERSION } from '../core/math';
import {
  xpNeeded,
  UPGRADES,
  threatAt,
  ELEMENTS,
  ELEMENT_INFUSE,
  POWERUPS,
  WEAPON_MAX,
  ELEMENT_IDS,
  computeStats,
  upgradeCost,
  START_GRACE,
  STAR_MAX,
  STAR_TIER_SIZE,
  STAR_HP,
  STAR_DMG,
  STAR_SPEED,
  STAR_XP,
  STAR_LOOT,
} from '../data/constants';
import { ITEM_SLOTS, SLOT_LABELS, type GearItem } from '../data/shop';
import { WEAPON_DEFS, UNIQUE_NAMES, uniqueWeaponName } from '../data/weapons';
import { PASSIVE_DEFS, BONUS_DEFS, ELEMENT_PASSIVES, type LevelUpCard } from '../data/passives';
import { SPECIES, AGGRO_RANGE_MULT, BOSS_NAMES, ANIMAL_VARIANTS, VARIANT_IDS } from '../data/animals';
import { META_UPGRADES, meta as metaProgress, type MetaProgress, type MetaUpgradeId } from '../meta/Meta';
import { settings, type DisplayMode } from '../meta/Settings';
import { Audio } from '../audio/Audio';
import { ICONS, icon } from './icons';
import type { RunPlayer } from '../run/RunTypes';
import type { CampSystem } from '../systems/CampSystem';
import type { DayNightSystem } from '../systems/DayNightSystem';
import type { ArsenalSystem } from '../systems/ArsenalSystem';
import {
  BOSS_ABILITY,
  ELEMENT_ABILITY_POOLS,
  type BossAbilityId,
} from '../systems/EnemyAbilities';
import { COACH_STEPS } from '../data/tutorials';
import type { UpdateInfo } from '../types/global';

const RES_ORDER = ['wood', 'meat', 'gold'] as const;

const ELEMENT_ICON: Record<string, string> = {
  fire: 'ember',
  water: 'tide',
  nature: 'bloom',
  earth: 'quake',
  light: 'radiance',
  darkness: 'umbra',
};

/** Survives DomUI rebuilds when switching Menu ↔ Run. */
const updateState: {
  phase: null | 'ask' | 'downloading' | 'ready';
  info: UpdateInfo | null;
  wired: boolean;
  host: DomUI | null;
} = { phase: null, info: null, wired: false, host: null };

export class DomUI {
  root: HTMLElement;
  hudEl: HTMLElement;
  pauseEl: HTMLElement;
  cardsEl: HTMLElement;
  shopEl: HTMLElement;
  /** Right-side camp build / smith panel (always present in-run). */
  campPanelEl: HTMLElement;
  metaEl: HTMLElement;
  gameOverEl: HTMLElement;
  menuEl: HTMLElement;
  tipEl: HTMLElement;
  updateEl: HTMLElement;
  confirmEl: HTMLElement;
  tutorialEl: HTMLElement;
  loadoutEl: HTMLElement;
  onTutorialDismiss?: () => void;
  /** World-space coach targets (e.g. player dash bar) as viewport CSS pixels. */
  onCoachWorldRect?: (key: string) => { x: number; y: number; w: number; h: number } | null;
  /** Legacy #gearHud — bottom-left equipment slot strip. */
  gearHudEl: HTMLElement;
  /** Legacy #buildWatermark — in-run build version. */
  watermarkEl: HTMLElement;
  optionsEl: HTMLElement;
  tipPopEl: HTMLElement;
  bannerEl: HTMLElement;
  /** Top-center event strip (grace timer, etc.) — same slot as banners. */
  eventHudEl: HTMLElement;
  /** Full-screen red flash when camp / palisade is hit. */
  campHurtEl: HTMLElement;
  bossHudEl: HTMLElement;
  buffHudEl: HTMLElement;
  private campHurtTimer: ReturnType<typeof setTimeout> | null = null;
  private lastGearHudKey = '';
  private campSmithTab = false;
  private campPanelOpen = true;
  private campPanelCache = '';
  private campBuilt = false;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fpsDisplay = 60;
  private lastLoadoutKey = '';
  private lastBuffKey = '';
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private optionsFrom: 'menu' | 'pause' = 'menu';
  /** Draft options edited in the form; committed only via Apply changes. */
  private optionsDraft: {
    displayMode: DisplayMode;
    width: number;
    height: number;
    vsync: boolean;
    musicVolume: number;
    sfxVolume: number;
    uiScale: number;
    fontScale: number;
    shakeScale: number;
    zoomScale: number;
    tutorialsEnabled: boolean;
  } = {
    displayMode: 'windowed',
    width: 1280,
    height: 720,
    vsync: true,
    musicVolume: 0.55,
    sfxVolume: 1,
    uiScale: 1,
    fontScale: 1,
    shakeScale: 1,
    zoomScale: 0.6,
    tutorialsEnabled: true,
  };
  private tipArsenal: ArsenalSystem | null = null;
  private tipPlayer: RunPlayer | null = null;
  private glossaryTab: 'beasts' | 'cards' | 'buildings' | 'world' = 'beasts';
  private menuMuted = false;
  private menuView: 'home' | 'meta' | 'glossary' = 'home';
  private menuMetaRef: MetaProgress = metaProgress;
  private confirmAction: (() => void) | null = null;
  private tutorialFitBound = false;
  private coachTargetKey: string | null = null;
  private onTutorialResize = () => {
    if (this.isTutorialOpen()) this.layoutCoach();
  };

  onCardPick?: (card: LevelUpCard) => void;
  onCardBanish?: (card: LevelUpCard) => void;
  onCardReroll?: () => void;
  onResume?: () => void;
  onQuitRun?: () => void;
  onMenuPlay?: () => void;
  onMenuMeta?: () => void;
  onMenuMute?: () => void;
  onMenuOptions?: () => void;
  onMenuQuit?: () => void;
  onUpgradeCamp?: (id: string) => void;
  onBuyShop?: (index: number) => void;
  onPauseToggle?: () => void;
  onMuteToggle?: () => void;
  onRestartRun?: () => void;
  onSmithReroll?: () => void;

  constructor() {
    const root = document.getElementById('dom-ui');
    if (!root) throw new Error('#dom-ui not found');
    this.root = root;
    root.innerHTML = '';
    this.hudEl = this.mk('div', 'fs-hud');
    this.pauseEl = this.mk('div', 'fs-overlay hidden interactive');
    this.cardsEl = this.mk('div', 'fs-overlay hidden interactive');
    this.shopEl = this.mk('div', 'fs-overlay hidden interactive');
    this.campPanelEl = this.mk('aside', 'fs-camp-side interactive collapsed hidden');
    this.metaEl = this.mk('div', 'fs-overlay hidden interactive');
    this.gameOverEl = this.mk('div', 'fs-overlay hidden interactive');
    this.menuEl = this.mk('div', 'fs-overlay interactive');
    this.updateEl = this.mk('div', 'fs-overlay update-overlay hidden interactive');
    this.confirmEl = this.mk('div', 'fs-overlay confirm-overlay hidden interactive');
    this.tutorialEl = this.mk('div', 'fs-overlay tutorial-overlay hidden interactive');
    this.tipEl = this.mk('div', 'fs-tip');
    this.tipEl.setAttribute('data-coach', 'controls');
    this.loadoutEl = this.mk('div', 'fs-loadout interactive');
    this.loadoutEl.setAttribute('data-coach', 'loadout');
    this.gearHudEl = this.mk('div', 'fs-gear-hud interactive');
    this.watermarkEl = this.mk('div', 'fs-build-watermark hidden');
    this.watermarkEl.setAttribute('aria-hidden', 'true');
    this.watermarkEl.textContent = BUILD_VERSION;
    this.tipPopEl = this.mk('div', 'fs-tip-pop hidden');
    this.optionsEl = this.mk('div', 'fs-overlay options-overlay hidden interactive');
    this.bannerEl = this.mk('div', 'fs-banner hidden');
    this.eventHudEl = this.mk('div', 'fs-event-hud hidden');
    this.campHurtEl = this.mk('div', 'fs-camp-hurt');
    this.bossHudEl = this.mk('div', 'fs-boss-hud hidden');
    this.buffHudEl = this.mk('div', 'fs-buff-hud');
    root.append(
      this.hudEl,
      this.buffHudEl,
      this.gearHudEl,
      this.loadoutEl,
      this.watermarkEl,
      this.tipPopEl,
      this.campPanelEl,
      this.bannerEl,
      this.eventHudEl,
      this.campHurtEl,
      this.bossHudEl,
      this.pauseEl,
      this.cardsEl,
      this.shopEl,
      this.metaEl,
      this.gameOverEl,
      this.menuEl,
      this.optionsEl,
      this.updateEl,
      this.tutorialEl,
      this.confirmEl,
      this.tipEl,
    );
    this.buildHud();
    this.buildCampPanel();
    this.buildUpdateShell();
    this.buildConfirmShell();
    this.buildTutorialShell();
    this.buildOptionsShell();
    updateState.host = this;
    this.wireUpdateApi();
    if (updateState.phase === 'ask' && updateState.info) this.showUpdateAvailable(updateState.info);
    else if (updateState.phase === 'ready' && updateState.info) this.showUpdateReady(updateState.info);
    else if (updateState.phase === 'downloading') this.showUpdateProgress({ percent: 0 });
    this.showMainMenu();
  }

  private mk(tag: string, cls: string) {
    const el = document.createElement(tag);
    el.className = cls;
    return el;
  }

  private buildHud() {
    this.hudEl.innerHTML = `
      <div class="fs-hud-left">
        <div class="fs-panel fs-status" data-coach="status">
          <div class="fs-level-badge" id="hud-lvl" title="Player level" data-coach="xp">1</div>
          <div class="fs-status-bars" data-coach="xp">
            <div class="fs-bar-row">
              <span class="fs-ico" title="Health">${ICONS.heart}</span>
              <div class="fs-track" id="hud-hp-bar"><span style="width:100%"></span><em id="hud-hp-text">100/100</em></div>
            </div>
            <div class="fs-bar-row">
              <span class="fs-ico" title="Camp health">${ICONS.house}</span>
              <div class="fs-track camp" id="hud-camp-bar"><span style="width:100%"></span><em id="hud-camp-text">300/300</em></div>
            </div>
            <div class="fs-xp" id="hud-xp-bar" title="Experience"><span style="width:0%"></span></div>
          </div>
        </div>
      </div>
      <div class="fs-panel fs-resources" data-coach="resources">
        <div class="fs-res" title="Wood"><span class="fs-ico">${ICONS.wood}</span><strong id="hud-wood">0</strong></div>
        <div class="fs-res" title="Meat"><span class="fs-ico">${ICONS.meat}</span><strong id="hud-meat">0</strong></div>
        <div class="fs-res" title="Gold"><span class="fs-ico">${ICONS.gold}</span><strong id="hud-gold">0</strong></div>
      </div>
      <div class="fs-panel fs-time" title="Day / night cycle" data-coach="time">
        <div class="fs-clock-top">
          <span class="fs-ico fs-clock-ico" id="hud-phase-ico">${ICONS.sun}</span>
          <b id="hud-day">Day 1</b>
          <span id="hud-threat" data-coach="threat">Threat x1.0</span>
        </div>
        <div class="fs-daybar"><span id="hud-dayfill" style="width:20%"></span></div>
        <div class="fs-clock-sub" id="hud-clock">05:00 · Day</div>
      </div>
      <div class="fs-panel fs-fps-panel" title="Run time and FPS">
        <span id="hud-run-timer">0:00</span>
        <span class="fs-fps-sep">·</span>
        <span id="hud-fps">60</span> FPS
      </div>
      <div class="fs-panel fs-hud-btns interactive">
        <button type="button" class="fs-btn icon" id="btn-camp-toggle" data-coach="campBtn" title="Camp upgrades (U / B)">${ICONS.up}</button>
        <button type="button" class="fs-btn icon" id="btn-pause" title="Pause (P / Esc)">${ICONS.pause}</button>
        <button type="button" class="fs-btn icon" id="btn-restart" title="Restart run">${ICONS.restart}</button>
        <button type="button" class="fs-btn icon" id="btn-mute" title="Mute (M)">${ICONS.sound}</button>
      </div>
    `;
    this.hudEl.querySelector('#btn-camp-toggle')?.addEventListener('click', () => this.toggleCampPanel());
    this.hudEl.querySelector('#btn-pause')?.addEventListener('click', () => this.onPauseToggle?.());
    this.hudEl.querySelector('#btn-restart')?.addEventListener('click', () => this.requestRestart());
    this.hudEl.querySelector('#btn-mute')?.addEventListener('click', () => {
      this.onMuteToggle?.();
      this.refreshMuteBtn();
    });
    this.refreshMuteBtn();
    // Buffs live under the HP/XP panel so they clear it at any UI scale.
    this.hudEl.querySelector('.fs-hud-left')?.appendChild(this.buffHudEl);
    this.bossHudEl.innerHTML = `
      <div class="fs-boss-name" id="boss-name">Boss</div>
      <div class="fs-boss-track"><div class="fs-boss-fill" id="boss-fill"></div></div>
      <div class="fs-boss-sub" id="boss-sub"></div>
    `;
    this.bannerEl.innerHTML = `
      <div class="fs-banner-title" id="banner-title"></div>
      <div class="fs-banner-sub" id="banner-sub"></div>
    `;
    this.eventHudEl.innerHTML = `
      <div class="fs-event-title" id="event-title">Grace</div>
      <div class="fs-event-sub" id="event-sub">Wildlife is peaceful</div>
      <div class="fs-event-timer" id="event-timer">0:30</div>
    `;
  }

  refreshMuteBtn() {
    const btn = this.hudEl.querySelector('#btn-mute');
    if (btn) btn.innerHTML = Audio.muted ? ICONS.mute : ICONS.sound;
  }

  /** Red edge vignette when the cabin or a palisade takes a hit. */
  flashCampHurt() {
    const el = this.campHurtEl;
    el.classList.remove('flash');
    // Restart CSS animation.
    void el.offsetWidth;
    el.classList.add('flash');
    if (this.campHurtTimer) clearTimeout(this.campHurtTimer);
    this.campHurtTimer = setTimeout(() => {
      el.classList.remove('flash');
      this.campHurtTimer = null;
    }, 380);
  }

  /** Legacy-style center banner (day / raid / assault announcements). */
  banner(title: string, sub = '', color = '#ffe08a') {
    const titleEl = this.bannerEl.querySelector('#banner-title') as HTMLElement | null;
    const subEl = this.bannerEl.querySelector('#banner-sub') as HTMLElement | null;
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.style.color = color;
    }
    if (subEl) subEl.textContent = sub;
    this.bannerEl.classList.remove('hidden');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.add('hidden'), 4200);
  }

  /** Top-center event strip — start grace countdown (same slot as banners). */
  updateEventHud(graceLeft: number) {
    if (graceLeft > 0.05) {
      const secs = Math.ceil(graceLeft);
      const mm = Math.floor(secs / 60);
      const ss = secs % 60;
      const title = this.eventHudEl.querySelector('#event-title');
      const sub = this.eventHudEl.querySelector('#event-sub');
      const timer = this.eventHudEl.querySelector('#event-timer');
      if (title) title.textContent = 'Grace';
      if (sub) sub.textContent = 'Wildlife ignores you and the camp — until you strike';
      if (timer) timer.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
      this.eventHudEl.classList.remove('hidden');
    } else {
      this.eventHudEl.classList.add('hidden');
    }
  }

  updateBossHud(
    boss: {
      name: string;
      hp: number;
      maxHp: number;
      element?: string | null;
      bossMoves?: BossAbilityId[];
      sub?: string;
    } | null,
  ) {
    if (!boss || boss.hp <= 0) {
      this.bossHudEl.classList.add('hidden');
      return;
    }
    this.bossHudEl.classList.remove('hidden');
    const name = this.bossHudEl.querySelector('#boss-name');
    const fill = this.bossHudEl.querySelector('#boss-fill') as HTMLElement | null;
    const sub = this.bossHudEl.querySelector('#boss-sub');
    if (name) name.textContent = boss.name;
    if (fill) fill.style.width = `${Math.max(0, Math.min(1, boss.hp / boss.maxHp)) * 100}%`;
    if (sub) {
      if (boss.sub != null) {
        sub.textContent = boss.sub;
      } else {
        // Legacy: element + rolled boss modifiers under the HP bar.
        const bits: string[] = [];
        if (boss.element && ELEMENTS[boss.element]) bits.push(ELEMENTS[boss.element].name);
        if (boss.bossMoves?.length) {
          bits.push(
            boss.bossMoves
              .map((id) => BOSS_ABILITY[id]?.name || id)
              .filter(Boolean)
              .join(' · '),
          );
        }
        sub.textContent = bits.length
          ? bits.join('  —  ')
          : `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
      }
    }
  }

  updateBuffHud(player: RunPlayer) {
    const bits: string[] = [];
    const push = (id: string, left: number) => {
      const def = POWERUPS[id];
      if (!def || left <= 0) return;
      bits.push(
        `<div class="fs-buff" style="border-color:${def.color}" title="${def.name}: ${def.desc}">` +
          `<b style="color:${def.color}">${def.label}</b><span>${Math.ceil(left)}s</span></div>`,
      );
    };
    push('fury', player.buffFury);
    push('vital', player.buffVital);
    push('haste', player.buffHaste);
    push('hearts', player.buffHearts);
    // Debuff chips so poison / slow are obvious while ticking.
    if (player.poisons.length) {
      let maxLife = 0;
      for (const b of player.poisons) maxLife = Math.max(maxLife, b.life);
      bits.push(
        `<div class="fs-buff fs-debuff" style="border-color:#6dd46a" title="Poisoned — taking damage over time">` +
          `<b style="color:#6dd46a">Poison</b><span>${Math.ceil(maxLife)}s</span></div>`,
      );
    }
    if ((player.burnT || 0) > 0) {
      bits.push(
        `<div class="fs-buff fs-debuff" style="border-color:#ff8a3d" title="Burning — standing in a damage pool">` +
          `<b style="color:#ff8a3d">Burn</b><span>!</span></div>`,
      );
    }
    if (player.slowT > 0 && player.slow > 0.05) {
      bits.push(
        `<div class="fs-buff fs-debuff" style="border-color:#9b7bde" title="Slowed">` +
          `<b style="color:#9b7bde">Slow</b><span>${Math.ceil(player.slowT)}s</span></div>`,
      );
    }
    const key = bits.join('|');
    if (key === this.lastBuffKey) return;
    this.lastBuffKey = key;
    this.buffHudEl.innerHTML = bits.join('');
  }

  private buildCampPanel() {
    this.campPanelEl.innerHTML = `
      <header class="fs-camp-side-head">
        <h2>Camp</h2>
        <button type="button" class="fs-btn small" id="camp-side-close" title="Hide (U)">✕</button>
      </header>
      <div id="camp-side-note" class="fs-camp-note">Return to camp to build / buy</div>
      <div class="fs-camp-tabs">
        <button type="button" class="fs-camp-tab active" id="camp-tab-build" data-coach="buildTab">Build</button>
        <button type="button" class="fs-camp-tab" id="camp-tab-smith" data-coach="smithTab">Smith</button>
      </div>
      <div id="camp-side-list" class="fs-camp-side-list"></div>
      <div id="camp-side-smith" class="fs-camp-side-smith hidden"></div>
    `;
    this.campPanelEl.querySelector('#camp-side-close')?.addEventListener('click', () => this.setCampPanelOpen(false));
    this.campPanelEl.querySelector('#camp-tab-build')?.addEventListener('click', () => this.setCampSmithTab(false));
    this.campPanelEl.querySelector('#camp-tab-smith')?.addEventListener('click', () => this.setCampSmithTab(true));
    this.campBuilt = true;
  }

  setCampSmithTab(smith: boolean) {
    this.campSmithTab = smith;
    this.campPanelCache = '';
    this.campPanelEl.querySelector('#camp-tab-build')?.classList.toggle('active', !smith);
    this.campPanelEl.querySelector('#camp-tab-smith')?.classList.toggle('active', smith);
    this.campPanelEl.querySelector('#camp-side-list')?.classList.toggle('hidden', smith);
    this.campPanelEl.querySelector('#camp-side-smith')?.classList.toggle('hidden', !smith);
  }

  setCampPanelOpen(open: boolean) {
    this.campPanelOpen = open;
    this.campPanelEl.classList.toggle('collapsed', !open);
    this.hudEl.querySelector('#btn-camp-toggle')?.classList.toggle('active', open);
    if (open) this.campPanelCache = '';
  }

  toggleCampPanel(force?: boolean) {
    this.setCampPanelOpen(typeof force === 'boolean' ? force : !this.campPanelOpen);
  }

  showCampPanelForRun() {
    this.campPanelEl.classList.remove('hidden');
    this.setCampPanelOpen(true);
    this.setCampSmithTab(false);
  }

  hideCampPanel() {
    this.campPanelEl.classList.add('hidden');
    this.setCampPanelOpen(false);
    this.campPanelCache = '';
  }

  /** Force next refreshCampPanel to rebuild (after buy / reroll / build). */
  invalidateCampPanel() {
    this.campPanelCache = '';
  }

  /**
   * Refresh the right-side Build / Smith lists.
   * Safe to call every frame — rebuilds only when state changes.
   */
  refreshCampPanel(camp: CampSystem, player: RunPlayer, atCamp: boolean) {
    if (!this.campBuilt || this.campPanelEl.classList.contains('hidden') || !this.campPanelOpen) return;
    const levelsKey = Object.keys(camp.levels)
      .sort()
      .map((k) => `${k}:${camp.levels[k]}`)
      .join(',');
    const gearKey = ITEM_SLOTS.map((s) => player.equipment[s]?.id || '-').join(',');
    const cache = [
      atCamp ? 1 : 0,
      this.campSmithTab ? 1 : 0,
      player.wood | 0,
      player.meat | 0,
      player.gold | 0,
      levelsKey,
      camp.shopVersion,
      camp.smithRerolls,
      camp.stats.forgeLevel,
      gearKey,
      this.campSmithTab ? Math.floor(camp.shopRefreshIn) : 0,
    ].join(';');
    if (cache === this.campPanelCache) return;
    this.campPanelCache = cache;
    this.hideShopCompare();

    const note = this.campPanelEl.querySelector('#camp-side-note');
    if (note) {
      note.classList.toggle('ok', atCamp);
      note.textContent = atCamp
        ? (this.campSmithTab ? 'At camp: buy gear (replaces equipped)' : 'At camp: build away!')
        : 'Return to camp to build / buy';
    }

    if (!this.campSmithTab) {
      const list = this.campPanelEl.querySelector('#camp-side-list');
      if (!list) return;
      const s = camp.stats;
      list.innerHTML = UPGRADES.map((u, i) => {
        const lv = camp.levels[u.id] || 0;
        const maxed = lv >= u.max;
        const locked = !!(u.requires && !u.requires(camp.levels));
        const cost = camp.upgradeCost(u.id);
        const canPay = Object.entries(cost).every(([k, v]) => (player[k as 'wood' | 'meat' | 'gold'] || 0) >= v);
        const affordable = !maxed && !locked && canPay && atCamp;
        const costHtml = maxed
          ? '<span class="max">MAXED</span>'
          : Object.entries(cost)
              .map(([k, v]) => {
                const have = player[k as 'wood' | 'meat' | 'gold'] || 0;
                return `<span class="ci ${have >= v ? '' : 'lack'}">${icon(k)}${formatNum(v)}</span>`;
              })
              .join('');
        let valHtml: string;
        if (maxed) valHtml = `<span class="uv-cur">${u.value(s)}</span>`;
        else if (locked) valHtml = `<span class="req">${u.reqText || 'Locked'}</span>`;
        else valHtml = `<span class="uv-cur">${u.value(s)}</span>`;
        return `<div class="fs-upg-row ${maxed ? 'maxed' : ''} ${affordable ? 'affordable' : 'locked'}" data-up="${u.id}">
          <div class="fs-upg-ico">${icon(u.id, 'camp')}<kbd>${i + 1}</kbd></div>
          <div class="fs-upg-body">
            <div class="fs-upg-title"><span>${u.name}</span><span class="fs-upg-lv">${lv}/${u.max}</span></div>
            <div class="fs-upg-desc">${u.desc}</div>
            <div class="fs-upg-val">${valHtml}</div>
          </div>
          <button type="button" class="fs-upg-buy" data-up="${u.id}" ${affordable ? '' : 'disabled'}>${costHtml}</button>
        </div>`;
      }).join('');
      list.querySelectorAll('.fs-upg-buy[data-up]').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const id = (btn as HTMLElement).dataset.up!;
          this.onUpgradeCamp?.(id);
        });
      });
    } else {
      this.renderSmithPanel(camp, player, atCamp);
    }
  }

  private renderSmithPanel(camp: CampSystem, player: RunPlayer, atCamp: boolean) {
    const smith = this.campPanelEl.querySelector('#camp-side-smith');
    if (!smith) return;
    if (!camp.stats.forgeLevel) {
      smith.innerHTML = '<div class="fs-shop-empty">Build a Blacksmith to open the forge shop.</div>';
      return;
    }

    const left = Math.max(0, camp.shopRefreshIn);
    const mm = Math.floor(left / 60);
    const ss = Math.floor(left % 60);
    const rerollCost = camp.smithRerollCost();
    const canReroll = atCamp && player.gold >= rerollCost;

    const gearBits = ITEM_SLOTS.map((slot) => {
      const it = player.equipment[slot];
      const lab = SLOT_LABELS[slot] || slot;
      return `<div class="fs-gear-eq"><div class="fs-slot-lab">${icon(slot)}<span>${lab}</span></div>` +
        (it
          ? `<div class="fs-eq-name" style="color:${it.color}">${it.qualityName} ${it.name}</div><div class="fs-eq-desc">${it.desc || ''}</div>`
          : `<div class="fs-eq-name dim">Empty</div>`) +
        `</div>`;
    }).join('');

    const rows: string[] = [];
    if (!camp.shopStock.length) {
      rows.push('<div class="fs-shop-empty">Stock empty — wait for refresh.</div>');
    } else {
      camp.shopStock.forEach((item, i) => {
        if (!item) {
          rows.push('<div class="fs-shop-item sold">Sold</div>');
          return;
        }
        const afford = atCamp && camp.canAffordShop(item, player);
        const cost = RES_ORDER.filter((k) => item.price[k])
          .map((k) => {
            const need = item.price[k];
            const have = player[k] || 0;
            return `<span class="ci${have >= need ? '' : ' lack'}">${icon(k)}${formatNum(need)}</span>`;
          })
          .join('');
        const el = item.element && ELEMENTS[item.element];
        const elDot = el
          ? `<span class="el-dot" style="background:${el.color}"></span>`
          : '';
        rows.push(
          `<button type="button" class="fs-shop-item${afford ? ' afford' : ''}" data-shop="${i}">` +
            `<div class="si-top">${elDot}<b style="color:${item.color}">${item.qualityName}</b> ${item.name}` +
            `<span class="si-slot">${SLOT_LABELS[item.slot] || item.slot}</span></div>` +
            `<div class="si-desc">${item.desc || ''}</div>` +
            `<div class="si-cost">${cost}</div>` +
          `</button>`,
        );
      });
    }

    smith.innerHTML = `
      <div class="fs-gear-row">${gearBits}</div>
      <div class="fs-smith-refresh">
        <span>Stock refreshes in <b>${mm}:${String(ss).padStart(2, '0')}</b></span>
        <button type="button" class="fs-btn fs-smith-reroll" id="btn-smith-reroll" ${canReroll ? '' : 'disabled'}
          title="${!atCamp ? 'Return to camp to reroll' : canReroll ? `Reroll forge stock for ${rerollCost} gold (cost rises each time)` : `Need ${rerollCost} gold to reroll`}">
          ${rerollCost}g
        </button>
      </div>
      <div class="fs-shop-list">${rows.join('')}</div>`;

    smith.querySelectorAll('.fs-shop-item[data-shop]').forEach((btn) => {
      const el = btn as HTMLElement;
      const i = parseInt(el.dataset.shop!, 10);
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        this.hideShopCompare();
        this.onBuyShop?.(i);
        (ev.currentTarget as HTMLElement).blur();
      });
      el.addEventListener('pointerenter', () => this.showShopCompare(el, camp, player, i));
      el.addEventListener('pointerleave', () => {
        if (this.tipPopEl.dataset.shopTip === String(i)) this.hideShopCompare();
      });
    });
    smith.querySelector('#btn-smith-reroll')?.addEventListener('click', () => {
      this.hideShopCompare();
      this.onSmithReroll?.();
    });
  }

  private showShopCompare(anchor: HTMLElement, camp: CampSystem, player: RunPlayer, shopIndex: number) {
    const item = camp.shopStock[shopIndex];
    if (!item) {
      this.hideShopCompare();
      return;
    }
    const equipped = player.equipment[item.slot] || null;
    const slotLab = SLOT_LABELS[item.slot] || item.slot;
    const head = (it: GearItem | null, label: string) => {
      if (!it) {
        return `<div class="tip-compare-head"><div class="tip-compare-lab">${label}</div>` +
          `<div class="tip-compare-empty">Empty slot</div></div>`;
      }
      return `<div class="tip-compare-head"><div class="tip-compare-lab">${label}</div>` +
        `<div class="tip-compare-name"><b style="color:${it.color || '#c9a227'}">${it.qualityName}</b> ${it.name}</div></div>`;
    };
    this.tipPopEl.innerHTML =
      `<div class="tip-name">${slotLab}</div>` +
      `<div class="tip-tag">Hover compare · replaces on buy</div>` +
      `<div class="tip-compare-heads">` +
        head(equipped, 'Equipped') +
        `<div class="tip-compare-vs">VS</div>` +
        head(item, 'Shop') +
      `</div>` +
      this.gearCompareTable(equipped, item);
    this.tipPopEl.style.borderColor = item.color || '#c9a227';
    this.tipPopEl.classList.add('tip-compare');
    this.tipPopEl.classList.remove('hidden');
    this.tipPopEl.dataset.shopTip = String(shopIndex);
    const r = anchor.getBoundingClientRect();
    this.positionLoadoutTip(r.left - 12, r.top);
    // Prefer left of shop row; if clipped, flip to right.
    const tipW = this.tipPopEl.offsetWidth || 300;
    if (r.left - tipW - 12 < 8) this.positionLoadoutTip(r.right + 8, r.top);
    else this.positionLoadoutTip(r.left - tipW - 12, r.top);
  }

  private hideShopCompare() {
    if (!this.tipPopEl.classList.contains('tip-compare') && this.tipPopEl.dataset.shopTip == null) return;
    this.tipPopEl.classList.add('hidden');
    this.tipPopEl.classList.remove('tip-compare');
    this.tipPopEl.style.borderColor = '';
    delete this.tipPopEl.dataset.shopTip;
  }

  private gearCompareStatDefs() {
    return [
      { key: 'might', label: 'dmg', kind: 'pct' as const },
      { key: 'flatDmg', label: 'flat dmg', kind: 'flat' as const },
      { key: 'armor', label: 'armor', kind: 'pct' as const },
      { key: 'maxHp', label: 'HP', kind: 'flat0' as const },
      { key: 'crit', label: 'crit', kind: 'pct' as const },
      { key: 'move', label: 'move', kind: 'pct' as const },
      { key: 'regen', label: 'HP/s', kind: 'flat' as const },
      { key: 'magnet', label: 'magnet', kind: 'pct' as const },
      { key: 'area', label: 'area', kind: 'pct' as const },
      { key: 'haste', label: 'atk speed', kind: 'pct' as const },
      { key: 'lifesteal', label: 'lifesteal', kind: 'pct' as const },
      { key: 'thorns', label: 'thorns', kind: 'flat' as const },
      { key: 'xpGain', label: 'XP', kind: 'pct' as const },
      { key: 'elementPower', label: 'elem dmg', kind: 'pct' as const },
    ];
  }

  private formatGearCompareValue(kind: 'pct' | 'flat' | 'flat0', v: number) {
    if (v == null || !Number.isFinite(v) || Math.abs(v) < 1e-9) return '—';
    if (kind === 'pct') return (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    if (kind === 'flat0') return (v > 0 ? '+' : '') + Math.round(v);
    return (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
  }

  private formatGearCompareDelta(kind: 'pct' | 'flat' | 'flat0', d: number) {
    if (!Number.isFinite(d) || Math.abs(d) < 1e-9) return { cls: 'tip-delta-same', txt: '—' };
    if (kind === 'pct') {
      return { cls: d > 0 ? 'tip-delta-up' : 'tip-delta-down', txt: (d > 0 ? '+' : '') + Math.round(d * 100) + '%' };
    }
    if (kind === 'flat0') {
      return { cls: d > 0 ? 'tip-delta-up' : 'tip-delta-down', txt: (d > 0 ? '+' : '') + Math.round(d) };
    }
    return { cls: d > 0 ? 'tip-delta-up' : 'tip-delta-down', txt: (d > 0 ? '+' : '') + (Math.round(d * 10) / 10) };
  }

  private numericMod(mods: GearItem['mods'] | null | undefined, key: string): number {
    if (!mods) return 0;
    const v = (mods as Record<string, unknown>)[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }

  private gearCompareTable(oldIt: GearItem | null, newIt: GearItem) {
    const defs = this.gearCompareStatDefs();
    const rows: string[] = [];
    for (const def of defs) {
      const a = this.numericMod(oldIt?.mods, def.key);
      const b = this.numericMod(newIt.mods, def.key);
      if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) continue;
      const delta = this.formatGearCompareDelta(def.kind, b - a);
      rows.push(
        `<div class="tip-compare-row">` +
          `<span class="tip-compare-stat">${def.label}</span>` +
          `<span class="tip-compare-old">${this.formatGearCompareValue(def.kind, a)}</span>` +
          `<span class="tip-compare-arrow">→</span>` +
          `<span class="tip-compare-new">${this.formatGearCompareValue(def.kind, b)}</span>` +
          `<span class="${delta.cls}">${delta.txt}</span>` +
        `</div>`,
      );
    }

    const oldEl = oldIt?.element || null;
    const newEl = newIt.element || null;
    if (oldEl || newEl) {
      const oe = oldEl ? ELEMENTS[oldEl] : null;
      const ne = newEl ? ELEMENTS[newEl] : null;
      const same = oldEl === newEl;
      const deltaCls = same ? 'tip-delta-same' : (newEl ? 'tip-delta-up' : 'tip-delta-down');
      const deltaTxt = same ? '—' : (ne ? ne.name : 'none');
      rows.push(
        `<div class="tip-compare-row">` +
          `<span class="tip-compare-stat">element</span>` +
          `<span class="tip-compare-old"${oe ? ` style="color:${oe.color}"` : ''}>${oe ? oe.name : '—'}</span>` +
          `<span class="tip-compare-arrow">→</span>` +
          `<span class="tip-compare-new"${ne ? ` style="color:${ne.color}"` : ''}>${ne ? ne.name : '—'}</span>` +
          `<span class="${deltaCls}">${deltaTxt}</span>` +
        `</div>`,
      );
    }

    const oldRes = oldIt?.mods?.resist;
    const newRes = newIt.mods?.resist;
    const resistId = (newIt.element && newRes && newRes[newIt.element] != null)
      ? newIt.element
      : (oldIt?.element && oldRes && oldRes[oldIt.element] != null)
        ? oldIt.element
        : (newEl || oldEl);
    if (resistId && ((oldRes && oldRes[resistId] != null) || (newRes && newRes[resistId] != null))) {
      const a = (oldRes && typeof oldRes[resistId] === 'number') ? oldRes[resistId]! : 0;
      const b = (newRes && typeof newRes[resistId] === 'number') ? newRes[resistId]! : 0;
      if (Math.abs(a) >= 1e-9 || Math.abs(b) >= 1e-9) {
        const elName = ELEMENTS[resistId]?.name || resistId;
        const delta = this.formatGearCompareDelta('pct', b - a);
        rows.push(
          `<div class="tip-compare-row">` +
            `<span class="tip-compare-stat">resist ${elName}</span>` +
            `<span class="tip-compare-old">${this.formatGearCompareValue('pct', a)}</span>` +
            `<span class="tip-compare-arrow">→</span>` +
            `<span class="tip-compare-new">${this.formatGearCompareValue('pct', b)}</span>` +
            `<span class="${delta.cls}">${delta.txt}</span>` +
          `</div>`,
        );
      }
    }

    if (!rows.length) {
      return `<div class="tip-compare-delta"><span class="tip-delta-same">` +
        (oldIt ? 'Buying replaces the equipped item in this slot.' : 'No stat modifiers on this item.') +
        `</span></div>`;
    }
    return (
      `<div class="tip-compare-table">` +
        `<div class="tip-compare-row tip-compare-row-head">` +
          `<span class="tip-compare-stat">Stat</span>` +
          `<span class="tip-compare-old">Now</span>` +
          `<span class="tip-compare-arrow"></span>` +
          `<span class="tip-compare-new">Shop</span>` +
          `<span>Δ</span>` +
        `</div>` +
        rows.join('') +
      `</div>`
    );
  }

  showMainMenu(muted = false) {
    this.hideCampPanel();
    this.hideMeta();
    this.menuMuted = muted;
    this.setRunChromeVisible(false);
    this.menuEl.classList.remove('hidden');
    this.menuEl.classList.add('fs-menu-overlay');
    this.menuEl.innerHTML = `
      <div class="fs-menu-shell interactive">
        <div id="menu-home" class="fs-menu-view">
          <div class="fs-menu-brand">Forest Survivor</div>
          <p class="fs-menu-tagline">Chop, hunt, fortify — survive the forest nights.</p>
          <div class="fs-menu-credits" id="menu-credits-home">0 Credits</div>
          <div class="fs-menu-meta-row" id="menu-meta-stats"></div>
          <button id="btn-play" class="fs-btn big menu-cta" type="button">New Run</button>
          <button id="btn-meta" class="fs-btn big ghost menu-cta" type="button">Upgrade Character</button>
          <button id="btn-glossary" class="fs-btn big ghost menu-cta" type="button">Glossary</button>
          <button id="btn-options" class="fs-btn big ghost menu-cta" type="button">Options</button>
          <button id="btn-quit" class="fs-btn big ghost menu-cta" type="button">Exit Game</button>
        </div>
        <div id="menu-meta" class="fs-menu-view hidden">
          <header class="fs-menu-meta-head">
            <button id="btn-meta-back" class="fs-btn small" type="button" title="Back">←</button>
            <h2>Character Upgrades</h2>
            <div class="fs-menu-credits" id="menu-credits-meta">0 Credits</div>
          </header>
          <p class="fs-menu-meta-hint">Permanent bonuses for every run.</p>
          <div id="meta-stats" class="fs-meta-stats"></div>
          <div class="fs-meta-refund-row">
            <button id="btn-meta-refund" class="fs-btn ghost fs-meta-refund" type="button"
              title="Reset all upgrades and refund credits spent">
              Full Refund (<span id="meta-refund-amount">0</span> cr)
            </button>
          </div>
          <div id="meta-list" class="fs-meta-list"></div>
        </div>
        <div id="menu-glossary" class="fs-menu-view hidden">
          <header class="fs-menu-meta-head">
            <button type="button" class="fs-btn small" id="btn-glossary-back" title="Back">←</button>
            <h2>Glossary</h2>
            <div class="fs-menu-credits fs-glossary-count" id="glossary-count"></div>
          </header>
          <div class="fs-glossary-tabs" role="tablist">
            <button type="button" class="fs-glossary-tab active" data-glossary="beasts">Beasts</button>
            <button type="button" class="fs-glossary-tab" data-glossary="cards">Cards</button>
            <button type="button" class="fs-glossary-tab" data-glossary="buildings">Buildings</button>
            <button type="button" class="fs-glossary-tab" data-glossary="world">World</button>
          </div>
          <div id="glossary-list" class="fs-glossary-list"></div>
        </div>
        <div class="fs-menu-version-row">
          <button id="menu-version-btn" class="fs-menu-version" type="button" disabled title="Current version">
            <span id="menu-version-label"></span>
            <span id="menu-update-badge" class="fs-menu-update-badge hidden">Update available</span>
          </button>
        </div>
      </div>
    `;
    this.menuEl.querySelector('#btn-play')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.onMenuPlay?.();
    });
    this.menuEl.querySelector('#btn-meta')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.showMenuMeta();
    });
    this.menuEl.querySelector('#btn-meta-back')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.showMenuHome();
    });
    this.menuEl.querySelector('#btn-meta-refund')?.addEventListener('click', () => this.refundMetaUpgrades());
    this.menuEl.querySelector('#btn-glossary')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.showGlossary();
    });
    this.menuEl.querySelector('#btn-glossary-back')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.showMenuHome();
    });
    this.menuEl.querySelectorAll('.fs-glossary-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        Audio.playSfx('click');
        this.setGlossaryTab(
          ((tab as HTMLElement).dataset.glossary || 'beasts') as
            | 'beasts'
            | 'cards'
            | 'buildings'
            | 'world',
        );
      });
    });
    this.menuEl.querySelector('#btn-options')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.showOptions('menu');
    });
    this.menuEl.querySelector('#btn-quit')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.requestExitGame();
    });
    this.menuEl.querySelector('#menu-version-btn')?.addEventListener('click', () => this.requestMenuUpdate());
    this.refreshMenuCredits();
    this.refreshMenuVersion();
    if (this.menuView === 'meta') this.showMenuMeta();
    else if (this.menuView === 'glossary') this.showGlossary();
    else this.showMenuHome();
  }

  showMenuHome() {
    this.menuView = 'home';
    const home = this.menuEl.querySelector('#menu-home');
    const meta = this.menuEl.querySelector('#menu-meta');
    const glossary = this.menuEl.querySelector('#menu-glossary');
    const shell = this.menuEl.querySelector('.fs-menu-shell');
    home?.classList.remove('hidden');
    meta?.classList.add('hidden');
    glossary?.classList.add('hidden');
    shell?.classList.remove('glossary-open');
    this.refreshMenuCredits();
  }

  showMenuMeta(progress?: MetaProgress) {
    if (progress) this.menuMetaRef = progress;
    this.menuView = 'meta';
    if (this.menuEl.classList.contains('hidden') || !this.menuEl.querySelector('#menu-meta')) {
      this.showMainMenu(this.menuMuted);
      return;
    }
    const home = this.menuEl.querySelector('#menu-home');
    const meta = this.menuEl.querySelector('#menu-meta');
    const glossary = this.menuEl.querySelector('#menu-glossary');
    const shell = this.menuEl.querySelector('.fs-menu-shell');
    home?.classList.add('hidden');
    meta?.classList.remove('hidden');
    glossary?.classList.add('hidden');
    shell?.classList.remove('glossary-open');
    this.refreshMenuCredits();
    this.renderMetaPanel();
  }

  showGlossary() {
    this.menuView = 'glossary';
    const home = this.menuEl.querySelector('#menu-home');
    const meta = this.menuEl.querySelector('#menu-meta');
    const glossary = this.menuEl.querySelector('#menu-glossary');
    const shell = this.menuEl.querySelector('.fs-menu-shell');
    home?.classList.add('hidden');
    meta?.classList.add('hidden');
    glossary?.classList.remove('hidden');
    shell?.classList.add('glossary-open');
    this.setGlossaryTab(this.glossaryTab || 'beasts');
  }

  private refreshMenuCredits() {
    const m = this.menuMetaRef;
    const txt = `${formatNum(m.credits)} Credits`;
    const home = this.menuEl.querySelector('#menu-credits-home');
    const metaCred = this.menuEl.querySelector('#menu-credits-meta');
    if (home) home.textContent = txt;
    if (metaCred) metaCred.textContent = txt;
    const stats = this.menuEl.querySelector('#menu-meta-stats');
    if (stats) {
      stats.innerHTML =
        `<span>Runs ${m.runs}</span>` +
        `<span>Best day ${m.bestDay}</span>` +
        `<span>Earned ${formatNum(m.totalCreditsEarned)}</span>`;
    }
  }

  refreshMenuVersion() {
    const label = this.menuEl.querySelector('#menu-version-label');
    const btn = this.menuEl.querySelector('#menu-version-btn') as HTMLButtonElement | null;
    const badge = this.menuEl.querySelector('#menu-update-badge');
    if (!label || !btn) return;
    const cur = (updateState.info && updateState.info.currentVersion) || BUILD_VERSION;
    const hasUpdate = !!(updateState.info && updateState.info.version);
    const ready = updateState.phase === 'ready' && hasUpdate;
    const downloading = updateState.phase === 'downloading' && hasUpdate;
    label.textContent = 'v' + String(cur).replace(/^v/i, '');
    if (hasUpdate) {
      const next = String(updateState.info!.version).replace(/^v/i, '');
      btn.disabled = downloading;
      btn.classList.add('has-update');
      btn.title = ready
        ? `Version ${next} downloaded — click to install`
        : downloading
          ? `Downloading version ${next}…`
          : `Version ${next} available — click to update`;
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = ready ? 'Ready to install' : downloading ? 'Downloading…' : 'Update available';
      }
    } else {
      btn.disabled = true;
      btn.classList.remove('has-update');
      btn.title = 'Current version';
      if (badge) badge.classList.add('hidden');
    }
  }

  private requestMenuUpdate() {
    if (!updateState.info?.version) return;
    if (updateState.phase === 'downloading') return;
    if (updateState.phase === 'ready') {
      this.showUpdateReady(updateState.info);
      return;
    }
    const cur = updateState.info.currentVersion || BUILD_VERSION;
    const next = updateState.info.version;
    this.askConfirm({
      title: 'Update available',
      message:
        `Version ${next} is out (you have ${cur}). Download and install it now? The game will restart when the update finishes.`,
      confirmLabel: 'Update',
      onConfirm: () => this.showUpdateAvailable(updateState.info!, { startDownload: true }),
    });
  }

  /** Legacy UI.requestRestart */
  requestRestart() {
    this.askConfirm({
      title: 'Restart run?',
      message: 'Your current run will end. Credits are kept for progress already earned.',
      confirmLabel: 'Restart',
      onConfirm: () => this.onRestartRun?.(),
    });
  }

  /** Legacy UI.requestMainMenu */
  requestMainMenu() {
    this.askConfirm({
      title: 'Return to main menu?',
      message: 'Leave this run and go back to the main menu?',
      confirmLabel: 'Main Menu',
      onConfirm: () => this.onQuitRun?.(),
    });
  }

  /** Legacy UI.requestExitGame */
  requestExitGame() {
    this.askConfirm({
      title: 'Exit game?',
      message: 'Close Forest Survivor and return to your desktop?',
      confirmLabel: 'Exit',
      onConfirm: () => this.onMenuQuit?.(),
    });
  }

  isConfirmOpen() {
    return !this.confirmEl.classList.contains('hidden');
  }

  askConfirm(opts: {
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }) {
    this.confirmAction = opts.onConfirm || null;
    const title = this.confirmEl.querySelector('#confirm-title');
    const msg = this.confirmEl.querySelector('#confirm-message');
    const yes = this.confirmEl.querySelector('#btn-confirm-yes') as HTMLButtonElement | null;
    const no = this.confirmEl.querySelector('#btn-confirm-no') as HTMLButtonElement | null;
    if (title) title.textContent = opts.title || 'Are you sure?';
    if (msg) msg.textContent = opts.message || '';
    if (yes) yes.textContent = opts.confirmLabel || 'Yes';
    if (no) no.textContent = opts.cancelLabel || 'Cancel';
    this.confirmEl.classList.remove('hidden');
    Audio.playSfx('click');
  }

  acceptConfirm() {
    const fn = this.confirmAction;
    this.cancelConfirm();
    if (typeof fn === 'function') fn();
  }

  cancelConfirm() {
    this.confirmAction = null;
    this.confirmEl.classList.add('hidden');
  }

  setGlossaryTab(tab: 'beasts' | 'cards' | 'buildings' | 'world') {
    this.glossaryTab = tab || 'beasts';
    this.menuEl.querySelectorAll('.fs-glossary-tab').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.glossary === this.glossaryTab);
    });
    this.renderGlossary();
  }

  private glossaryStat(label: string, value: string | number) {
    return `<span class="fs-glossary-stat">${label} <b>${value}</b></span>`;
  }

  private glossarySwatch(color: string) {
    return `<div class="fs-glossary-swatch" style="background:${color || '#888'}"></div>`;
  }

  private glossaryIcon(id: string, fallback = '') {
    const svg = icon(id, fallback);
    return svg || this.glossarySwatch('#888');
  }

  private glossaryBeastCard(id: string) {
    const sp = SPECIES[id];
    if (!sp) return '';
    const tags: string[] = [];
    if (sp.ranged) tags.push('Ranged');
    if (sp.family) tags.push('Dire');
    const stats = [
      this.glossaryStat('HP', sp.hp),
      this.glossaryStat('Dmg', sp.dmg),
      this.glossaryStat('Speed', sp.chase || sp.flee || sp.wander),
      this.glossaryStat('Aggro', Math.round((sp.aggro || 0) * AGGRO_RANGE_MULT)),
      this.glossaryStat('XP', sp.xp),
      this.glossaryStat('Meat', `${sp.meat[0]}–${sp.meat[1]}`),
    ];
    if (sp.ranged) {
      stats.push(this.glossaryStat('Range', sp.range ?? '—'));
      stats.push(this.glossaryStat('Shot', sp.shotKind || 'bolt'));
    }
    if (sp.goldChance > 0) stats.push(this.glossaryStat('Gold', `${Math.round(sp.goldChance * 100)}%`));
    const boss = BOSS_NAMES[id as keyof typeof BOSS_NAMES];
    if (boss) stats.push(this.glossaryStat('Boss form', boss));
    const desc = sp.blurb
      ? sp.blurb
      : sp.ranged
        ? `Keeps distance and hurls ${
            sp.shotKind === 'log'
              ? 'wooden logs'
              : sp.shotKind === 'wool'
                ? 'wool'
                : sp.shotKind === 'rock'
                  ? (sp.shotCount || 1) > 1
                    ? `${sp.shotCount} rocks at once`
                    : 'rocks'
                  : 'projectiles'
          }.`
        : 'Melee beast of the forest.';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossarySwatch(sp.color)}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${sp.name}</span>
            ${tags.map((t) => `<span class="fs-glossary-tag">${t}</span>`).join('')}
          </div>
          <div class="fs-glossary-desc">${desc}</div>
          <div class="fs-glossary-stats">${stats.join('')}</div>
        </div>
      </div>`;
  }

  private glossaryWeaponCard(id: string) {
    const def = WEAPON_DEFS[id];
    if (!def) return '';
    const s1 = def.stats(1);
    const sm = def.stats(WEAPON_MAX);
    const fmt = (s: Record<string, number>) => {
      const bits: string[] = [];
      if (s.dmg != null) bits.push(`dmg ${s.dmg}`);
      if (s.count != null) bits.push(`×${s.count}`);
      if (s.radius != null) bits.push(`r ${Math.round(s.radius)}`);
      if (s.size != null) bits.push(`size ${Math.round(s.size)}`);
      if (s.range != null) bits.push(`rng ${Math.round(s.range)}`);
      if (s.dist != null) bits.push(`dist ${Math.round(s.dist)}`);
      if (s.cd != null) bits.push(`cd ${s.cd.toFixed(2)}s`);
      if (s.pierce != null) bits.push(`pierce ${s.pierce}`);
      return bits.join(' · ') || '—';
    };
    const uniques = UNIQUE_NAMES[id]
      ? ELEMENT_IDS.map((el) => {
          const nm = UNIQUE_NAMES[id][el];
          if (!nm) return '';
          const col = ELEMENTS[el]?.color || '#fff';
          return `<span class="fs-glossary-tag" style="border-color:${col};color:${col}">${nm}</span>`;
        }).join('')
      : '';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossaryIcon(id, 'weapon')}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">Max ${WEAPON_MAX}</span>
          </div>
          <div class="fs-glossary-desc">${def.text[0] || ''} At max level + infusion, awakens into a unique elemental form.</div>
          ${uniques ? `<div class="fs-glossary-unique-row">${uniques}</div>` : ''}
          <div class="fs-glossary-stats">
            ${this.glossaryStat('Lv1', fmt(s1))}
            ${this.glossaryStat(`Lv${WEAPON_MAX}`, fmt(sm))}
          </div>
        </div>
      </div>`;
  }

  private glossaryPassiveCard(id: string) {
    const def = PASSIVE_DEFS[id];
    if (!def) return '';
    const el = ELEMENT_PASSIVES[id];
    const elTag = el ? el.charAt(0).toUpperCase() + el.slice(1) : '';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossaryIcon(id)}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">Max ${def.max}</span>
            ${elTag ? `<span class="fs-glossary-tag">${elTag}</span>` : ''}
          </div>
          <div class="fs-glossary-desc">${def.desc}</div>
        </div>
      </div>`;
  }

  private glossaryBonusCard(id: string) {
    const def = BONUS_DEFS[id];
    if (!def) return '';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossaryIcon(id, 'gold')}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">Bonus</span>
          </div>
          <div class="fs-glossary-desc">${def.desc}</div>
        </div>
      </div>`;
  }

  private glossaryPowerupCard(id: string) {
    const def = POWERUPS[id];
    if (!def) return '';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossarySwatch(def.color)}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">${def.label}</span>
          </div>
          <div class="fs-glossary-desc">${def.desc}</div>
          <div class="fs-glossary-stats">
            ${this.glossaryStat('Duration', def.duration ? `${def.duration}s` : 'Instant')}
          </div>
        </div>
      </div>`;
  }

  private glossaryBuildingCard(def: (typeof UPGRADES)[number]) {
    const empty: Record<string, number> = {};
    const maxed: Record<string, number> = {};
    for (const u of UPGRADES) {
      empty[u.id] = 0;
      maxed[u.id] = u.max;
    }
    if (def.requires) {
      for (const u of UPGRADES) {
        if (u.id === 'towers') maxed.towers = Math.max(maxed.towers, 1);
      }
    }
    const at0 = computeStats(empty);
    const atMax = computeStats(maxed);
    const cost0 = upgradeCost(def, 0);
    const costBits = RES_ORDER.filter((k) => cost0[k]).map((k) => `${cost0[k]} ${k}`).join(', ');
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossaryIcon(def.id, 'camp')}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">Max ${def.max}</span>
          </div>
          <div class="fs-glossary-desc">${def.desc}${def.reqText ? ` (${def.reqText})` : ''}</div>
          <div class="fs-glossary-stats">
            ${this.glossaryStat('Base cost', costBits || '—')}
            ${this.glossaryStat('Lv0', def.value(at0))}
            ${this.glossaryStat('Max', def.value(atMax))}
          </div>
        </div>
      </div>`;
  }

  private glossaryVariantCard(id: string) {
    const v = ANIMAL_VARIANTS[id as keyof typeof ANIMAL_VARIANTS];
    if (!v) return '';
    const special =
      id === 'dire'
        ? 'Darker and bulkier. Pure stat boost — no death gimmick.'
        : id === 'necromantic'
          ? 'Undead tint. On death, splits into 3 weaker fragments with reduced loot.'
          : id === 'demonic'
            ? 'Crimson spiked look. On death, leaves a large fire pool that burns you.'
            : 'Standard forest wildlife — baseline stats.';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossarySwatch(v.bar || '#8a7a60')}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${v.name}</span>
            <span class="fs-glossary-tag">Variant</span>
          </div>
          <div class="fs-glossary-desc">${special}</div>
          <div class="fs-glossary-stats">
            ${this.glossaryStat('HP', `×${v.hp}`)}
            ${this.glossaryStat('Dmg', `×${v.dmg}`)}
            ${this.glossaryStat('Speed', `×${v.speed}`)}
            ${this.glossaryStat('XP', `×${v.xp}`)}
            ${this.glossaryStat('Loot', `×${v.loot}`)}
          </div>
        </div>
      </div>`;
  }

  private glossaryElementCard(el: string) {
    const def = ELEMENTS[el];
    if (!def) return '';
    const opp = ELEMENTS[def.opposite];
    const pool = ELEMENT_ABILITY_POOLS[el as keyof typeof ELEMENT_ABILITY_POOLS] || [];
    const moves = pool
      .map(
        (ab, i) =>
          `<div class="fs-glossary-ability">
            <b>${ab.name}</b>
            <span class="fs-glossary-tag">${i === 0 ? 'Core' : `★ unlock`}</span>
            <span class="fs-glossary-ability-desc">${ab.desc}</span>
            <span class="fs-glossary-stats">
              ${this.glossaryStat('CD', `${ab.cd}s`)}
              ${this.glossaryStat('Range', ab.range)}
            </span>
          </div>`,
      )
      .join('');
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossarySwatch(def.color)}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">Element</span>
          </div>
          <div class="fs-glossary-desc">
            Colored orb over the beast. Strong vs <b>${opp?.name || def.opposite}</b> (×1.55),
            resists its own element (×0.65). Elemental beasts telegraph special moves before striking.
          </div>
          <div class="fs-glossary-stats">
            ${this.glossaryStat('Opposite', opp?.name || def.opposite)}
            ${this.glossaryStat('Moves', pool.length)}
          </div>
          <div class="fs-glossary-ability-list">${moves}</div>
        </div>
      </div>`;
  }

  private glossaryBossAbilityCard(id: BossAbilityId) {
    const def = BOSS_ABILITY[id];
    if (!def) return '';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossarySwatch(def.color)}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${def.name}</span>
            <span class="fs-glossary-tag">Boss move</span>
          </div>
          <div class="fs-glossary-desc">${def.desc}</div>
          <div class="fs-glossary-stats">
            ${this.glossaryStat('CD', `${def.cd}s`)}
            ${this.glossaryStat('Tele', `${def.tele}s`)}
          </div>
        </div>
      </div>`;
  }

  private glossaryInfusionCard(el: string) {
    const inf = ELEMENT_INFUSE[el as keyof typeof ELEMENT_INFUSE];
    const def = ELEMENTS[el];
    if (!inf || !def) return '';
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossaryIcon(ELEMENT_ICON[el] || el, el)}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${inf.name}</span>
            <span class="fs-glossary-tag" style="border-color:${def.color};color:${def.color}">${def.name}</span>
          </div>
          <div class="fs-glossary-desc">${inf.effect} Applied when you infuse a maxed weapon with this element, unlocking its unique form.</div>
        </div>
      </div>`;
  }

  private glossarySimpleCard(opts: {
    name: string;
    tag: string;
    desc: string;
    color?: string;
    stats?: string;
  }) {
    return `
      <div class="fs-glossary-card">
        <div class="fs-glossary-icon">${this.glossarySwatch(opts.color || '#8a7a60')}</div>
        <div class="fs-glossary-body">
          <div class="fs-glossary-title">
            <span class="fs-glossary-name">${opts.name}</span>
            <span class="fs-glossary-tag">${opts.tag}</span>
          </div>
          <div class="fs-glossary-desc">${opts.desc}</div>
          ${opts.stats ? `<div class="fs-glossary-stats">${opts.stats}</div>` : ''}
        </div>
      </div>`;
  }

  renderGlossary() {
    const list = this.menuEl.querySelector('#glossary-list');
    const countEl = this.menuEl.querySelector('#glossary-count');
    if (!list) return;
    let html = '';
    let count = 0;
    if (this.glossaryTab === 'beasts') {
      const ids = Object.keys(SPECIES);
      const variants = VARIANT_IDS.map((id) => this.glossaryVariantCard(id)).join('');
      const elements = ELEMENT_IDS.map((el) => this.glossaryElementCard(el)).join('');
      const bossMoves = (Object.keys(BOSS_ABILITY) as BossAbilityId[])
        .map((id) => this.glossaryBossAbilityCard(id))
        .join('');
      const pct = (n: number) => `${Math.round(n * 100)}%`;
      count =
        ids.length +
        VARIANT_IDS.length +
        ELEMENT_IDS.length +
        Object.keys(BOSS_ABILITY).length;
      html =
        `<div class="fs-glossary-section">Variants</div>
         <p class="fs-glossary-blurb">Any beast can roll a variant. Multipliers stack with
         <b>veterancy stars</b> and <b>elements</b>. Look for the colored rim under their feet.</p>` +
        variants +
        `<div class="fs-glossary-section">Veterancy</div>
         <p class="fs-glossary-blurb">Stars above a beast mark veterancy (up to ${STAR_MAX}).
         Bronze (1–${STAR_TIER_SIZE}), silver (${STAR_TIER_SIZE + 1}–${STAR_TIER_SIZE * 2}),
         then gold. Each star raises HP (+${pct(STAR_HP)}), damage (+${pct(STAR_DMG)}),
         speed (+${pct(STAR_SPEED)}), XP (+${pct(STAR_XP)}), and loot (+${pct(STAR_LOOT)}).
         Higher stars also unlock <b>more elemental abilities</b>:
         0–2★ → 1 move · 3–6★ → 2 · 7–11★ → 3 · 12+★ → full pool (bosses +1).</p>` +
        `<div class="fs-glossary-section">Elements &amp; abilities</div>
         <p class="fs-glossary-blurb">Colored orbs mark elemental affinity. Elemental beasts
         telegraph specials before they hit. The first listed move is always available;
         extras unlock with stars.</p>` +
        elements +
        `<div class="fs-glossary-section">True-boss moves</div>
         <p class="fs-glossary-blurb">Every 3rd night a true boss leads the raid with two random
         signature moves from this pool of ten (shown on the boss HUD). Minibosses and day champions
         use elemental pools instead.</p>` +
        bossMoves +
        `<div class="fs-glossary-section">Species</div>` +
        ids.map((id) => this.glossaryBeastCard(id)).join('');
    } else if (this.glossaryTab === 'cards') {
      const weapons = Object.keys(WEAPON_DEFS);
      const passives = Object.keys(PASSIVE_DEFS);
      const bonuses = Object.keys(BONUS_DEFS);
      const powerups = Object.keys(POWERUPS);
      const infusions = ELEMENT_IDS.length;
      count = weapons.length + passives.length + bonuses.length + powerups.length + infusions;
      html =
        `<div class="fs-glossary-section">Weapons</div>` +
        weapons.map((id) => this.glossaryWeaponCard(id)).join('') +
        `<div class="fs-glossary-section">Element infusions</div>
         <p class="fs-glossary-blurb">Max a weapon, then take its infusion card to awaken a unique form.
         Infusion effects scale with your damage.</p>` +
        ELEMENT_IDS.map((el) => this.glossaryInfusionCard(el)).join('') +
        `<div class="fs-glossary-section">Passives</div>` +
        passives.map((id) => this.glossaryPassiveCard(id)).join('') +
        (bonuses.length
          ? `<div class="fs-glossary-section">Bonus cards</div>` +
            bonuses.map((id) => this.glossaryBonusCard(id)).join('')
          : '') +
        (powerups.length
          ? `<div class="fs-glossary-section">Power-ups</div>
             <p class="fs-glossary-blurb">Rare drops from slain beasts. Instant effects fire once;
             timed charms last for their duration. <b>Crimson Charm</b> makes kills drop hearts
             that heal 10% max HP. <b>Cataclysm</b> clears the forest (bosses endure) and pulls loot in.</p>` +
            powerups.map((id) => this.glossaryPowerupCard(id)).join('')
          : '');
    } else if (this.glossaryTab === 'world') {
      const worldCards = [
        this.glossarySimpleCard({
          name: 'Opening grace',
          tag: `${START_GRACE}s`,
          color: '#9ef08a',
          desc: `At run start, wildlife ignores you and the camp for ${START_GRACE}s unless you strike first (provoked beasts fight back). Daytime assault waves and boss spawns are held until grace ends.`,
          stats: this.glossaryStat('Duration', `${START_GRACE}s`),
        }),
        this.glossarySimpleCard({
          name: 'Day / night cycle',
          tag: 'Time',
          color: '#ffe08a',
          desc: 'Days stretch into dusk, then night. At dusk, raid fronts gather — get back to camp. Night brings raiders; dawn repairs the cabin and palisades if you survive.',
        }),
        this.glossarySimpleCard({
          name: 'Night raids',
          tag: 'Siege',
          color: '#ff6b6b',
          desc: 'Raiders march from the forest edge toward camp. Most nights a miniboss leads; every 3rd night a true boss arrives with signature moves. Survive until dawn for wood and gold.',
        }),
        this.glossarySimpleCard({
          name: 'Daytime assaults',
          tag: 'Wave',
          color: '#ff9a6b',
          desc: 'After grace, daytime assault waves periodically march on the camp. Held during night raids. Threat scales wave size and difficulty.',
        }),
        this.glossarySimpleCard({
          name: 'Day champions',
          tag: 'Boss',
          color: '#c4a35a',
          desc: 'Killing wildlife can awaken a daytime champion of that species — a tough day-boss that marches on the camp. Chance rises with stars, species, and day number. Disabled during grace.',
        }),
        this.glossarySimpleCard({
          name: 'Rising threat',
          tag: 'Scaling',
          color: '#ffd23f',
          desc: 'Threat climbs with run time. Beasts gain HP, damage, speed, and higher veterancy. Push farther for richer loot, or hug camp when nights get ugly.',
        }),
        this.glossarySimpleCard({
          name: 'Resources',
          tag: 'Gather',
          color: '#ffd9a0',
          desc: 'Wood from trees, meat from beasts, gold from ore veins and lucky kills. Spend them at camp to fortify, produce, and gear up at the blacksmith.',
        }),
        this.glossarySimpleCard({
          name: 'Status effects',
          tag: 'Combat',
          color: '#6dd46a',
          desc: 'Poison stacks DoT from nature attacks. Slow from gloom, vines, water spray, and similar. Burn pools (demonic deaths, fire trails, scorch) deal damage over time while you stand in them.',
        }),
        this.glossarySimpleCard({
          name: 'Coach tutorials',
          tag: 'Tips',
          color: '#7fd3ff',
          desc: 'While Tutorials are On in Options, coach tips spotlight HUD and world targets each run. After a run you can turn them off. Toggle anytime in Options.',
        }),
      ];
      count = worldCards.length;
      html =
        `<div class="fs-glossary-section">Run systems</div>
         <p class="fs-glossary-blurb">How a run flows — calm openings, sieges, scaling, and hazards.</p>` +
        worldCards.join('');
    } else {
      count = UPGRADES.length;
      html =
        `<div class="fs-glossary-section">Camp upgrades</div>
         <p class="fs-glossary-blurb">Build while standing in the camp yard (<b>U</b> / Camp panel).
         The blacksmith restocks gear; each smith item fills one slot and replaces what was there.</p>` +
        UPGRADES.map((def) => this.glossaryBuildingCard(def)).join('');
    }
    list.innerHTML = html;
    if (countEl) countEl.textContent = `${count} entries`;
  }

  private buildOptionsShell() {
    this.optionsEl.innerHTML = `
      <div class="fs-panel fs-options-panel interactive">
        <header class="fs-pause-head">
          <h2>Options</h2>
          <button class="fs-btn" id="opt-close">Back</button>
        </header>
        <div class="fs-options-body">
          <section class="fs-opt-sec">
            <h3>Display</h3>
            <div class="fs-opt-modes" role="group" aria-label="Display mode">
              <button type="button" class="fs-opt-mode" data-mode="windowed">Windowed</button>
              <button type="button" class="fs-opt-mode" data-mode="borderless">Borderless</button>
              <button type="button" class="fs-opt-mode" data-mode="fullscreen">Fullscreen</button>
            </div>
            <label class="fs-opt-label" for="opt-resolution">Resolution</label>
            <select id="opt-resolution" class="fs-opt-select"></select>
            <label class="fs-opt-check">
              <input id="opt-vsync" type="checkbox" />
              VSync (cap to display refresh)
            </label>
            <label class="fs-opt-label" for="opt-zoom">Camera zoom <span id="opt-zoom-pct">60%</span></label>
            <input id="opt-zoom" class="fs-opt-slider" type="range" min="30" max="60" step="5" />
            <p class="fs-opt-hint">60% = default view. Lower zooms out further (cannot zoom in past 60%).</p>
          </section>
          <section class="fs-opt-sec">
            <h3>Audio</h3>
            <label class="fs-opt-label" for="opt-music">Music volume <span id="opt-music-pct">55%</span></label>
            <input id="opt-music" class="fs-opt-slider" type="range" min="0" max="100" step="1" />
            <label class="fs-opt-label" for="opt-sfx">SFX volume <span id="opt-sfx-pct">100%</span></label>
            <input id="opt-sfx" class="fs-opt-slider" type="range" min="0" max="100" step="1" />
          </section>
          <section class="fs-opt-sec">
            <h3>Accessibility</h3>
            <label class="fs-opt-label" for="opt-ui">UI scale <span id="opt-ui-pct">100%</span></label>
            <input id="opt-ui" class="fs-opt-slider" type="range" min="80" max="150" step="5" />
            <label class="fs-opt-label" for="opt-font">Font scale <span id="opt-font-pct">100%</span></label>
            <input id="opt-font" class="fs-opt-slider" type="range" min="85" max="160" step="5" />
            <label class="fs-opt-label" for="opt-shake">Screen shake <span id="opt-shake-pct">100%</span></label>
            <input id="opt-shake" class="fs-opt-slider" type="range" min="0" max="100" step="5" />
          </section>
          <section class="fs-opt-sec">
            <h3>Tutorials</h3>
            <button type="button" class="fs-btn" id="opt-tutorials">On</button>
            <p class="fs-opt-hint">While On, coach tips play every run. After a run you can turn them off.</p>
          </section>
          <div class="fs-opt-actions">
            <button type="button" class="fs-btn big" id="opt-apply">Apply changes</button>
          </div>
        </div>
      </div>
    `;
    this.optionsEl.querySelector('#opt-close')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.hideOptions();
    });
    this.optionsEl.querySelector('#opt-apply')?.addEventListener('click', () => this.applyOptionsDraft());
    this.optionsEl.querySelectorAll('.fs-opt-mode').forEach((btn) => {
      btn.addEventListener('click', () => {
        Audio.playSfx('click');
        this.optionsDraft.displayMode = (btn as HTMLElement).dataset.mode as DisplayMode;
        this.paintOptionsForm();
      });
    });
    this.optionsEl.querySelector('#opt-resolution')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const [w, h] = val.split('x').map(Number);
      if (w && h) {
        this.optionsDraft.width = w;
        this.optionsDraft.height = h;
      }
    });
    this.optionsEl.querySelector('#opt-vsync')?.addEventListener('change', (e) => {
      this.optionsDraft.vsync = (e.target as HTMLInputElement).checked;
    });
    const bindRange = (
      id: string,
      pctId: string,
      key: 'musicVolume' | 'sfxVolume' | 'uiScale' | 'fontScale' | 'shakeScale' | 'zoomScale',
    ) => {
      const el = this.optionsEl.querySelector('#' + id) as HTMLInputElement | null;
      el?.addEventListener('input', () => {
        const v = Number(el.value) / 100;
        this.optionsDraft[key] = v;
        const pct = this.optionsEl.querySelector('#' + pctId);
        if (pct) pct.textContent = Math.round(v * 100) + '%';
      });
    };
    bindRange('opt-zoom', 'opt-zoom-pct', 'zoomScale');
    bindRange('opt-music', 'opt-music-pct', 'musicVolume');
    bindRange('opt-sfx', 'opt-sfx-pct', 'sfxVolume');
    bindRange('opt-ui', 'opt-ui-pct', 'uiScale');
    bindRange('opt-font', 'opt-font-pct', 'fontScale');
    bindRange('opt-shake', 'opt-shake-pct', 'shakeScale');
    this.optionsEl.querySelector('#opt-tutorials')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.optionsDraft.tutorialsEnabled = !this.optionsDraft.tutorialsEnabled;
      this.paintOptionsForm();
    });
  }

  private captureOptionsDraft() {
    this.optionsDraft = {
      displayMode: settings.displayMode,
      width: settings.width,
      height: settings.height,
      vsync: settings.vsync,
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      uiScale: settings.uiScale,
      fontScale: settings.fontScale,
      shakeScale: settings.shakeScale,
      zoomScale: settings.zoomScale,
      tutorialsEnabled: settings.tutorialsEnabled,
    };
  }

  private applyOptionsDraft() {
    Audio.playSfx('upgrade');
    settings.commit({ ...this.optionsDraft });
    // Music + SFX are separate buses (legacy Music.setVolume / Sound volume).
    void import('../audio/Music').then(({ Music }) => Music.setVolume(settings.musicVolume));
    Audio.setVolume(0.12 + settings.sfxVolume * 0.4);
    Audio.setSfxMuted(settings.sfxVolume <= 0.001);
    this.captureOptionsDraft();
    this.paintOptionsForm();
  }

  showOptions(from: 'menu' | 'pause' = 'menu') {
    this.optionsFrom = from;
    settings.returnTo = from;
    this.captureOptionsDraft();
    this.paintOptionsForm();
    this.optionsEl.classList.remove('hidden');
  }

  hideOptions() {
    this.optionsEl.classList.add('hidden');
  }

  isOptionsOpen() {
    return !this.optionsEl.classList.contains('hidden');
  }

  /** @deprecated use paintOptionsForm — kept for any external callers */
  syncOptionsForm() {
    this.captureOptionsDraft();
    this.paintOptionsForm();
  }

  private paintOptionsForm() {
    const d = this.optionsDraft;
    const mode = d.displayMode;
    this.optionsEl.querySelectorAll('.fs-opt-mode').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode);
    });
    const sel = this.optionsEl.querySelector('#opt-resolution') as HTMLSelectElement | null;
    if (sel) {
      const list = settings.resolutions();
      const cur = d.width + 'x' + d.height;
      let html = '';
      let hasCur = false;
      for (const r of list) {
        const key = r.width + 'x' + r.height;
        if (key === cur) hasCur = true;
        html += `<option value="${key}"${key === cur ? ' selected' : ''}>${r.label || key}</option>`;
      }
      if (!hasCur) {
        html = `<option value="${cur}" selected>${d.width} × ${d.height}</option>` + html;
      }
      sel.innerHTML = html;
      sel.disabled = mode !== 'windowed';
    }
    const vsync = this.optionsEl.querySelector('#opt-vsync') as HTMLInputElement | null;
    if (vsync) vsync.checked = d.vsync;
    const setRange = (id: string, pctId: string, value01: number) => {
      const el = this.optionsEl.querySelector('#' + id) as HTMLInputElement | null;
      const pct = this.optionsEl.querySelector('#' + pctId);
      const shown = Math.round(value01 * 100);
      if (el) el.value = String(shown);
      if (pct) pct.textContent = shown + '%';
    };
    setRange('opt-zoom', 'opt-zoom-pct', d.zoomScale);
    setRange('opt-music', 'opt-music-pct', d.musicVolume);
    setRange('opt-sfx', 'opt-sfx-pct', d.sfxVolume);
    setRange('opt-ui', 'opt-ui-pct', d.uiScale);
    setRange('opt-font', 'opt-font-pct', d.fontScale);
    setRange('opt-shake', 'opt-shake-pct', d.shakeScale);
    const tut = this.optionsEl.querySelector('#opt-tutorials') as HTMLButtonElement | null;
    if (tut) {
      const on = !!d.tutorialsEnabled;
      tut.classList.toggle('on', on);
      tut.textContent = on ? 'On' : 'Off';
      tut.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  private buildConfirmShell() {
    this.confirmEl.innerHTML = `
      <div class="fs-panel fs-modal fs-confirm-modal interactive">
        <h2 id="confirm-title">Are you sure?</h2>
        <p id="confirm-message">This cannot be undone.</p>
        <div class="fs-confirm-actions">
          <button class="fs-btn big" id="btn-confirm-yes" type="button">Yes</button>
          <button class="fs-btn big ghost" id="btn-confirm-no" type="button">Cancel</button>
        </div>
        <p class="small" style="font-size:0.75rem;margin-top:0.75rem">Enter to confirm · Esc to cancel</p>
      </div>
    `;
    this.confirmEl.querySelector('#btn-confirm-yes')?.addEventListener('click', () => this.acceptConfirm());
    this.confirmEl.querySelector('#btn-confirm-no')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.cancelConfirm();
    });
  }

  private buildTutorialShell() {
    this.tutorialEl.innerHTML = `
      <div class="fs-coach-dim" aria-hidden="true"></div>
      <div class="fs-coach-hole" id="coach-hole" aria-hidden="true"></div>
      <div class="fs-panel fs-coach-card interactive" id="coach-card">
        <div class="fs-coach-badge">Tutorial</div>
        <h2 id="tutorial-title">Tip</h2>
        <div id="tutorial-body" class="fs-tutorial-body"></div>
        <div class="fs-confirm-actions">
          <button class="fs-btn big" id="btn-tutorial-ok" type="button">Got it</button>
        </div>
        <p class="small">Enter or Esc · game is paused</p>
      </div>
    `;
    this.tutorialEl.querySelector('#btn-tutorial-ok')?.addEventListener('click', () => {
      Audio.playSfx('click');
      this.hideTutorial();
      this.onTutorialDismiss?.();
    });
    if (!this.tutorialFitBound) {
      this.tutorialFitBound = true;
      window.addEventListener('resize', this.onTutorialResize);
    }
  }

  isTutorialOpen() {
    return !this.tutorialEl.classList.contains('hidden');
  }

  /** Pause + spotlight a HUD element with a short coach card. */
  showTutorial(id: string) {
    const def = COACH_STEPS[id];
    if (!def) return;
    const title = this.tutorialEl.querySelector('#tutorial-title');
    const body = this.tutorialEl.querySelector('#tutorial-body');
    if (title) title.textContent = def.title;
    if (body) body.innerHTML = def.body;
    this.coachTargetKey = def.target || null;
    this.tutorialEl.classList.remove('hidden');
    this.tutorialEl.classList.toggle('fs-coach-notarget', !def.target);
    // Two frames: camp tab / panel layout settles, then measure the hole.
    requestAnimationFrame(() => requestAnimationFrame(() => this.layoutCoach()));
  }

  hideTutorial() {
    this.tutorialEl.classList.add('hidden');
    this.coachTargetKey = null;
    const hole = this.tutorialEl.querySelector('#coach-hole') as HTMLElement | null;
    if (hole) hole.style.cssText = '';
  }

  /** Position the spotlight hole + card relative to the highlighted element. */
  private layoutCoach() {
    if (this.tutorialEl.classList.contains('hidden')) return;
    const hole = this.tutorialEl.querySelector('#coach-hole') as HTMLElement | null;
    const card = this.tutorialEl.querySelector('#coach-card') as HTMLElement | null;
    if (!hole || !card) return;

    const key = this.coachTargetKey;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let r: { left: number; top: number; right: number; bottom: number; width: number; height: number } | null =
      null;
    if (key) {
      const world = this.onCoachWorldRect?.(key);
      if (world) {
        r = {
          left: world.x,
          top: world.y,
          width: world.w,
          height: world.h,
          right: world.x + world.w,
          bottom: world.y + world.h,
        };
      } else {
        const el = this.root.querySelector(`[data-coach="${key}"]`) as HTMLElement | null;
        if (el) {
          const b = el.getBoundingClientRect();
          r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
        }
      }
    }

    if (!r) {
      hole.classList.add('hidden');
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    hole.classList.remove('hidden');
    const hx = Math.max(4, r.left - pad);
    const hy = Math.max(4, r.top - pad);
    const hw = Math.min(vw - hx - 4, r.width + pad * 2);
    const hh = Math.min(vh - hy - 4, r.height + pad * 2);
    hole.style.left = `${hx}px`;
    hole.style.top = `${hy}px`;
    hole.style.width = `${Math.max(24, hw)}px`;
    hole.style.height = `${Math.max(24, hh)}px`;

    // Prefer below the target; flip above / to the side if needed.
    card.style.transform = '';
    const cardW = Math.min(340, vw - 24);
    card.style.width = `${cardW}px`;
    let left = r.left + r.width / 2 - cardW / 2;
    left = Math.max(12, Math.min(vw - cardW - 12, left));
    let top = r.bottom + 14;
    const ch = card.offsetHeight || 160;
    if (top + ch > vh - 12) top = Math.max(12, r.top - ch - 14);
    if (top + ch > vh - 12) top = Math.max(12, (vh - ch) / 2);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  private buildUpdateShell() {
    this.updateEl.innerHTML = `
      <div class="fs-panel fs-modal fs-update-modal interactive">
        <h2 id="update-title">Update available</h2>
        <p id="update-message">A newer version is ready to install.</p>
        <div id="update-progress-wrap" class="fs-update-progress hidden">
          <div class="fs-update-progress-bar"><span id="update-progress-fill"></span></div>
          <p id="update-progress-text" class="small" style="font-size:0.75rem;margin:0.5rem 0 0">Downloading…</p>
        </div>
        <div class="fs-update-actions">
          <button class="fs-btn big" id="btn-update-yes" type="button">Update now</button>
          <button class="fs-btn big ghost" id="btn-update-no" type="button">Later</button>
        </div>
        <p id="update-hint" class="small" style="font-size:0.75rem;margin-top:0.75rem">Enter to update · Esc to dismiss</p>
      </div>
    `;
    this.updateEl.querySelector('#btn-update-yes')?.addEventListener('click', () => this.acceptUpdate());
    this.updateEl.querySelector('#btn-update-no')?.addEventListener('click', () => this.dismissUpdate());
    if (!(window as unknown as { __fsUpdateKeys?: boolean }).__fsUpdateKeys) {
      (window as unknown as { __fsUpdateKeys?: boolean }).__fsUpdateKeys = true;
      window.addEventListener('keydown', (e) => {
        const host = updateState.host;
        if (!host) return;
        if (host.isConfirmOpen()) {
          if (e.key === 'Escape') {
            e.preventDefault();
            Audio.playSfx('click');
            host.cancelConfirm();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            host.acceptConfirm();
          }
          return;
        }
        if (host.isTutorialOpen()) {
          if (e.key === 'Escape' || e.key === 'Enter') {
            e.preventDefault();
            Audio.playSfx('click');
            host.hideTutorial();
            host.onTutorialDismiss?.();
          }
          return;
        }
        if (!host.optionsEl.classList.contains('hidden') && e.key === 'Escape') {
          e.preventDefault();
          host.hideOptions();
          return;
        }
        if (host.updateEl.classList.contains('hidden')) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          if (updateState.phase !== 'downloading') host.dismissUpdate();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          host.acceptUpdate();
        }
      });
    }
  }

  private wireUpdateApi() {
    if (updateState.wired) return;
    const api = window.forestUpdate;
    if (!api) return;
    updateState.wired = true;
    api.onAvailable?.((info) => updateState.host?.showUpdateAvailable(info));
    api.onProgress?.((p) => updateState.host?.showUpdateProgress(p));
    api.onReady?.((info) => updateState.host?.showUpdateReady(info));
    api.onError?.((err) => updateState.host?.showUpdateError(err));
  }

  showUpdateAvailable(info: UpdateInfo, opts?: { startDownload?: boolean }) {
    updateState.info = info;
    updateState.phase = 'ask';
    const cur = info.currentVersion || BUILD_VERSION;
    const next = info.version || '?';
    const title = this.updateEl.querySelector('#update-title');
    const msg = this.updateEl.querySelector('#update-message');
    const wrap = this.updateEl.querySelector('#update-progress-wrap');
    const yes = this.updateEl.querySelector('#btn-update-yes') as HTMLButtonElement | null;
    const no = this.updateEl.querySelector('#btn-update-no') as HTMLButtonElement | null;
    const hint = this.updateEl.querySelector('#update-hint');
    if (title) title.textContent = 'Update available';
    if (msg) {
      msg.textContent =
        'Version ' + next + ' is out (you have ' + cur + '). Download and install it from inside the game.';
    }
    wrap?.classList.add('hidden');
    if (yes) {
      yes.disabled = false;
      yes.textContent = 'Update now';
    }
    if (no) {
      no.disabled = false;
      no.classList.remove('hidden');
      no.textContent = 'Later';
    }
    if (hint) hint.textContent = 'Enter to update · Esc to dismiss';
    this.updateEl.classList.remove('hidden');
    this.refreshMenuIfVisible();
    if (opts?.startDownload) this.acceptUpdate();
  }

  showUpdateProgress(p: { percent?: number }) {
    updateState.phase = 'downloading';
    const pct = Math.max(0, Math.min(100, Number(p?.percent) || 0));
    const title = this.updateEl.querySelector('#update-title');
    const msg = this.updateEl.querySelector('#update-message');
    const wrap = this.updateEl.querySelector('#update-progress-wrap');
    const fill = this.updateEl.querySelector('#update-progress-fill') as HTMLElement | null;
    const text = this.updateEl.querySelector('#update-progress-text');
    const yes = this.updateEl.querySelector('#btn-update-yes') as HTMLButtonElement | null;
    const no = this.updateEl.querySelector('#btn-update-no') as HTMLButtonElement | null;
    const hint = this.updateEl.querySelector('#update-hint');
    wrap?.classList.remove('hidden');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    if (text) text.textContent = 'Downloading… ' + pct.toFixed(0) + '%';
    if (title) title.textContent = 'Downloading update';
    if (msg) msg.textContent = 'Please wait while the new version downloads.';
    if (yes) yes.disabled = true;
    if (no) no.disabled = true;
    if (hint) hint.textContent = 'Installing will restart the game';
    this.updateEl.classList.remove('hidden');
    this.refreshMenuIfVisible();
  }

  showUpdateReady(info: UpdateInfo) {
    updateState.info = { ...updateState.info, ...info };
    updateState.phase = 'ready';
    const ver = info.version || updateState.info?.version || '';
    const title = this.updateEl.querySelector('#update-title');
    const msg = this.updateEl.querySelector('#update-message');
    const wrap = this.updateEl.querySelector('#update-progress-wrap');
    const yes = this.updateEl.querySelector('#btn-update-yes') as HTMLButtonElement | null;
    const no = this.updateEl.querySelector('#btn-update-no') as HTMLButtonElement | null;
    const hint = this.updateEl.querySelector('#update-hint');
    if (title) title.textContent = 'Ready to install';
    if (msg) msg.textContent = 'Version ' + (ver || 'new') + ' downloaded. Restart now to finish updating.';
    wrap?.classList.add('hidden');
    if (yes) {
      yes.disabled = false;
      yes.textContent = 'Restart & install';
    }
    if (no) {
      no.disabled = false;
      no.classList.remove('hidden');
      no.textContent = 'Later';
    }
    if (hint) hint.textContent = 'Enter to restart · Esc to dismiss';
    this.updateEl.classList.remove('hidden');
    this.refreshMenuIfVisible();
  }

  showUpdateError(err: { message?: string }) {
    const msgText = (err && err.message) || 'Update failed';
    this.setTip('Update issue: ' + msgText.slice(0, 100));
    if (updateState.phase === 'downloading' || updateState.phase === 'ask') {
      updateState.phase = 'ask';
      const yes = this.updateEl.querySelector('#btn-update-yes') as HTMLButtonElement | null;
      const no = this.updateEl.querySelector('#btn-update-no') as HTMLButtonElement | null;
      const wrap = this.updateEl.querySelector('#update-progress-wrap');
      const title = this.updateEl.querySelector('#update-title');
      const msg = this.updateEl.querySelector('#update-message');
      const hint = this.updateEl.querySelector('#update-hint');
      if (yes) {
        yes.disabled = false;
        yes.textContent = 'Retry download';
      }
      if (no) no.disabled = false;
      wrap?.classList.add('hidden');
      if (title) title.textContent = 'Update available';
      if (msg) msg.textContent = 'Download failed. Check your connection and try again.';
      if (hint) hint.textContent = 'Enter to retry · Esc to dismiss';
    }
  }

  acceptUpdate() {
    const api = window.forestUpdate;
    if (!api) {
      this.dismissUpdate();
      return;
    }
    if (updateState.phase === 'ready') {
      api.install?.().catch(() => {});
      return;
    }
    if (updateState.phase === 'downloading') return;
    updateState.phase = 'downloading';
    this.showUpdateProgress({ percent: 0 });
    const yes = this.updateEl.querySelector('#btn-update-yes') as HTMLButtonElement | null;
    if (yes) yes.disabled = true;
    const title = this.updateEl.querySelector('#update-title');
    if (title) title.textContent = 'Starting update…';
    api.download?.()
      .then((res) => {
        if (res && res.ok === false) {
          this.showUpdateError({ message: res.error || 'Download failed' });
        }
      })
      .catch((err) => {
        this.showUpdateError({ message: String(err && err.message || err) });
      });
  }

  dismissUpdate() {
    if (updateState.info?.version) {
      updateState.phase = updateState.phase === 'ready' ? 'ready' : 'ask';
    } else {
      updateState.phase = null;
    }
    this.updateEl.classList.add('hidden');
    this.refreshMenuIfVisible();
  }

  private refreshMenuIfVisible() {
    if (this.menuEl.classList.contains('hidden')) return;
    this.refreshMenuVersion();
    this.refreshMenuCredits();
  }

  hideMainMenu() {
    this.menuEl.classList.add('hidden');
    this.setRunChromeVisible(true);
  }

  /** HUD / tips / loadout — hidden on the main menu, shown in-run. */
  private setRunChromeVisible(visible: boolean) {
    this.hudEl.classList.toggle('hidden', !visible);
    this.loadoutEl.classList.toggle('hidden', !visible);
    this.gearHudEl.classList.toggle('hidden', !visible);
    this.buffHudEl.classList.toggle('hidden', !visible);
    this.watermarkEl.classList.toggle('hidden', !visible);
    if (!visible) {
      this.tipEl.classList.add('hidden');
      this.tipEl.textContent = '';
      this.tipPopEl.classList.add('hidden');
      this.bossHudEl.classList.add('hidden');
      this.eventHudEl.classList.add('hidden');
      this.bannerEl.classList.add('hidden');
    }
  }

  /** Called when a run starts — show HUD camp panel. */
  beginRunHud() {
    this.hideMainMenu();
    this.hideMeta();
    this.hideGameOver();
    this.hidePause();
    this.hideLevelUp();
    this.hideCampShop();
    this.showCampPanelForRun();
    this.setTip('WASD move · Shift/Space dash · Esc/P pause · U build · B smith · F aim lock · M mute');
  }

  /** Opens the in-menu Character Upgrades view (legacy menuMeta). */
  showMetaMenu(progress: MetaProgress, _onBack?: () => void) {
    this.menuMetaRef = progress;
    if (this.menuEl.classList.contains('hidden')) this.showMainMenu(this.menuMuted);
    this.showMenuMeta(progress);
  }

  hideMeta() {
    this.metaEl.classList.add('hidden');
  }

  private renderMetaPanel() {
    this.renderMetaCharacterStats();
    this.renderMetaRefund();
    this.renderMetaList();
  }

  private renderMetaCharacterStats() {
    const el = this.menuEl.querySelector('#meta-stats');
    if (!el) return;
    const b = this.menuMetaRef.bonuses();
    const pct = (v: number) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    const mul = (v: number) => '×' + (1 + (v || 0)).toFixed(2);
    const bonus = (text: string, on: boolean) =>
      on ? `<span class="ms-bonus">${text}</span>` : '<span class="ms-flat">—</span>';
    const maxHp = 100 + (b.maxHp || 0);
    const regen = b.regen || 0;
    const move = Math.round(180 * (1 + (b.move || 0)));
    const magnet = Math.round(95 * (1 + (b.magnet || 0)));
    const might = Math.round((1 + (b.damagePct || 0)) * 100);
    const rows: [string, string, string][] = [
      ['Max HP', String(maxHp), bonus('+' + b.maxHp, b.maxHp > 0)],
      ['Regen', regen.toFixed(2) + '/s', bonus('+' + regen.toFixed(2), regen > 0)],
      ['Move speed', String(move), bonus(pct(b.move), b.move > 0)],
      ['Pickup range', String(magnet), bonus(pct(b.magnet), b.magnet > 0)],
      ['Damage', might + '%', bonus(pct(b.damagePct), b.damagePct > 0)],
      ['Flat damage', String(b.flatDamage || 0), bonus('+' + (b.flatDamage || 0), (b.flatDamage || 0) > 0)],
      ['Elemental dmg', Math.round((1 + (b.elemPct || 0)) * 100) + '%', bonus(pct(b.elemPct || 0), (b.elemPct || 0) > 0)],
      ['Elemental flat', (b.elemFlat || 0).toFixed(1), bonus('+' + (b.elemFlat || 0).toFixed(1), (b.elemFlat || 0) > 0)],
      ['Card rerolls', String(5 + (b.rerolls || 0)), bonus('+' + b.rerolls, (b.rerolls || 0) > 0)],
      ['Card banishes', String(5 + (b.banishes || 0)), bonus('+' + b.banishes, (b.banishes || 0) > 0)],
      ['Building income', mul(b.income), bonus(pct(b.income), (b.income || 0) > 0)],
      ['Wall HP', mul(b.wallHp), bonus(pct(b.wallHp), (b.wallHp || 0) > 0)],
      ['Tower damage', mul(b.towerDmg), bonus(pct(b.towerDmg), (b.towerDmg || 0) > 0)],
      ['Campfire heal', mul(b.campHeal), bonus(pct(b.campHeal), (b.campHeal || 0) > 0)],
      ['Smith quality', mul(b.smithLuck), bonus(pct(b.smithLuck), (b.smithLuck || 0) > 0)],
    ];
    el.innerHTML =
      '<div class="ms-title">Current stats</div>' +
      '<div class="ms-grid">' +
      rows
        .map(
          (r) =>
            `<div class="ms-row"><span class="ms-lab">${r[0]}</span>` +
            `<b class="ms-val">${r[1]}</b>${r[2]}</div>`,
        )
        .join('') +
      '</div>';
  }

  private renderMetaRefund() {
    const m = this.menuMetaRef;
    const spent = m.spentOnUpgrades();
    const amount = this.menuEl.querySelector('#meta-refund-amount');
    const btn = this.menuEl.querySelector('#btn-meta-refund') as HTMLButtonElement | null;
    if (amount) amount.textContent = formatNum(spent);
    if (btn) {
      btn.disabled = spent <= 0;
      btn.classList.toggle('locked', spent <= 0);
      btn.title = spent > 0
        ? `Reset all upgrades and refund ${formatNum(spent)} credits`
        : 'No upgrades to refund';
    }
  }

  private refundMetaUpgrades() {
    const m = this.menuMetaRef;
    const spent = m.spentOnUpgrades();
    if (spent <= 0) {
      Audio.playSfx('deny');
      return;
    }
    this.askConfirm({
      title: 'Refund upgrades?',
      message: `Refund all character upgrades for ${formatNum(spent)} credits? This resets every permanent upgrade.`,
      confirmLabel: 'Refund',
      onConfirm: () => {
        const refunded = m.refundAll();
        if (refunded > 0) {
          Audio.playSfx('upgrade');
          this.refreshMenuCredits();
          this.renderMetaPanel();
        } else {
          Audio.playSfx('deny');
        }
      },
    });
  }

  private renderMetaList() {
    const list = this.menuEl.querySelector('#meta-list');
    if (!list) return;
    const m = this.menuMetaRef;
    list.innerHTML = META_UPGRADES.map((u) => {
      const lv = m.levels[u.id] || 0;
      const maxed = lv >= u.max;
      const cost = maxed ? 0 : m.costOf(u.id);
      const afford = !maxed && m.canBuy(u.id);
      const ico = icon(u.id);
      return (
        `<div class="fs-meta-row${maxed ? ' maxed' : afford ? ' afford' : ''}">` +
          `<div><div class="mr-name">` +
            (ico
              ? `<span class="fs-meta-ico" style="width:18px;height:18px;vertical-align:-3px;display:inline-flex;margin-right:4px">${ico}</span>`
              : '') +
            `${u.name}</div>` +
          `<div class="mr-desc">${u.desc}</div>` +
          `<div class="mr-lv">Lv ${lv} / ${u.max}</div></div>` +
          `<button class="fs-meta-buy" type="button" data-meta="${u.id}"` +
            `${maxed || !afford ? ' disabled' : ''}>` +
            (maxed ? 'MAX' : cost + ' cr') +
          `</button></div>`
      );
    }).join('');
    list.querySelectorAll('.fs-meta-buy[data-meta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.meta as MetaUpgradeId;
        if (m.buy(id)) {
          Audio.playSfx('upgrade');
          this.refreshMenuCredits();
          this.renderMetaPanel();
        } else {
          Audio.playSfx('deny');
        }
        (btn as HTMLButtonElement).blur();
      });
    });
  }

  updateHud(player: RunPlayer, day: DayNightSystem, camp: CampSystem, arsenal: ArsenalSystem, dt: number) {
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fpsDisplay = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
    const hpT = document.getElementById('hud-hp-text');
    const hpBar = document.querySelector('#hud-hp-bar > span') as HTMLElement;
    const hpWrap = document.getElementById('hud-hp-bar');
    if (hpT) hpT.textContent = `${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)}`;
    const hpFrac = player.maxHp > 0 ? player.hp / player.maxHp : 0;
    if (hpBar) hpBar.style.width = `${hpFrac * 100}%`;
    if (hpWrap) hpWrap.classList.toggle('hp-low', hpFrac < 0.3);

    const campT = document.getElementById('hud-camp-text');
    const campBar = document.querySelector('#hud-camp-bar > span') as HTMLElement;
    if (campT) campT.textContent = `${Math.ceil(camp.hp)}/${Math.ceil(camp.maxHp)}`;
    const campFrac = camp.maxHp > 0 ? camp.hp / camp.maxHp : 0;
    if (campBar) campBar.style.width = `${campFrac * 100}%`;

    const lvl = document.getElementById('hud-lvl');
    const xpBar = document.querySelector('#hud-xp-bar > span') as HTMLElement;
    if (lvl) lvl.textContent = String(player.level);
    const need = xpNeeded(player.level);
    if (xpBar) xpBar.style.width = `${need > 0 ? (player.xp / need) * 100 : 0}%`;

    const setRes = (id: string, v: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNum(v);
    };
    setRes('hud-wood', player.wood);
    setRes('hud-meat', player.meat);
    setRes('hud-gold', player.gold);

    const threat = threatAt(day.runTime);
    const dayEl = document.getElementById('hud-day');
    if (dayEl) dayEl.textContent = `Day ${day.dayNumber}`;
    const threatEl = document.getElementById('hud-threat');
    if (threatEl) threatEl.textContent = `Threat x${threat.hp.toFixed(1)}`;
    const dayFill = document.getElementById('hud-dayfill');
    if (dayFill) dayFill.style.width = `${Math.max(0, Math.min(1, day.dayBarFrac())) * 100}%`;
    const clock = document.getElementById('hud-clock');
    if (clock) {
      const hours = Math.floor(day.clock * 24);
      const mins = Math.floor((day.clock * 24 - hours) * 60);
      const phase =
        day.phase === 'night' ? 'Night'
          : day.phase === 'dusk' ? 'Dusk'
            : day.phase === 'dawn' ? 'Dawn'
              : 'Day';
      clock.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} · ${phase}`;
    }
    const phaseIco = document.getElementById('hud-phase-ico');
    if (phaseIco) {
      const nightish = day.phase === 'night' || day.phase === 'dusk';
      phaseIco.innerHTML = nightish ? ICONS.moon : ICONS.sun;
    }
    const runTimer = document.getElementById('hud-run-timer');
    if (runTimer) runTimer.textContent = formatTime(day.runTime);
    const fps = document.getElementById('hud-fps');
    if (fps) fps.textContent = String(this.fpsDisplay);

    this.updateBuffHud(player);

    if (!this.menuEl.classList.contains('hidden')) {
      this.loadoutEl.classList.add('hidden');
      this.gearHudEl.classList.add('hidden');
      this.buffHudEl.classList.add('hidden');
    } else {
      this.loadoutEl.classList.remove('hidden');
      this.gearHudEl.classList.remove('hidden');
      this.buffHudEl.classList.remove('hidden');
      this.updateGearHud(player, arsenal);
      this.updateLoadout(player, arsenal);
    }
  }

  /** Legacy updateGearHud — always show every equipment slot (empty or filled). */
  updateGearHud(player: RunPlayer, arsenal: ArsenalSystem) {
    this.tipArsenal = arsenal;
    this.tipPlayer = player;
    const gearKey = ITEM_SLOTS.map((s) => player.equipment[s]?.id || '-').join(',');
    // Legacy: badge from gear attackElement (mainWeapon first), not weapon infusion.
    const atkEl = player.attackElement || '';
    const key = `${gearKey}:${atkEl}`;
    if (key === this.lastGearHudKey) return;
    this.lastGearHudKey = key;

    const bits: string[] = [];
    for (const slot of ITEM_SLOTS) {
      const it = player.equipment[slot];
      if (!it) {
        bits.push(
          `<div class="fs-gear-slot empty" data-tip-kind="gear" data-tip-id="${slot}">${icon(slot)}</div>`,
        );
      } else {
        const el =
          it.element && ELEMENTS[it.element] ? ELEMENTS[it.element].color : it.color;
        bits.push(
          `<div class="fs-gear-slot" data-tip-kind="gear" data-tip-id="${slot}" style="border-color:${el}">` +
            `${icon(slot)}<i style="background:${it.color}"></i></div>`,
        );
      }
    }
    if (atkEl && ELEMENTS[atkEl]) {
      const e = ELEMENTS[atkEl];
      bits.push(
        `<div class="fs-gear-elem" data-tip-kind="elem" data-tip-id="${e.id}" style="background:${e.color}">${e.name[0]}</div>`,
      );
    }
    this.gearHudEl.innerHTML = bits.join('');
    this.gearHudEl.querySelectorAll('[data-tip-kind]').forEach((node) => {
      const el = node as HTMLElement;
      el.addEventListener('pointerenter', () => this.showLoadoutTip(el));
      el.addEventListener('pointerleave', () => this.hideLoadoutTip());
      el.addEventListener('pointermove', (ev) => this.positionLoadoutTip(ev.clientX, ev.clientY));
    });
  }

  updateLoadout(player: RunPlayer, arsenal: ArsenalSystem) {
    this.tipArsenal = arsenal;
    this.tipPlayer = player;
    const elKey = arsenal.weaponOrder
      .map((id) => id + (arsenal.weapons[id] || 0) + (arsenal.weaponElements[id] || '') + (arsenal.isUnique(id) ? 'U' : ''))
      .join(',');
    const pKey = Object.keys(arsenal.passives).map((k) => k + arsenal.passives[k]).join(',');
    const gKey = Object.values(player.equipment || {})
      .map((it) => (it ? it.id : ''))
      .join(',');
    const key = elKey + '|' + pKey + '|' + gKey;
    if (key === this.lastLoadoutKey) return;
    this.lastLoadoutKey = key;

    const bits: string[] = [];
    for (const id of arsenal.weaponOrder) {
      const el = arsenal.weaponElements[id];
      const elDef = el ? ELEMENTS[el] : null;
      const unique = arsenal.isUnique(id);
      if (unique) arsenal.weaponUnique[id] = true;
      const border = elDef ? `style="border-color:${elDef.color}${unique ? `;box-shadow:0 0 8px ${elDef.color}` : ''}"` : '';
      bits.push(
        `<div class="fs-load ${unique ? 'unique' : ''}" data-tip-kind="weapon" data-tip-id="${id}" ${border}>` +
          `<span class="fs-load-ico">${icon(id, 'weapon')}</span>` +
          `<span>${unique ? '★' : arsenal.weapons[id]}</span>` +
          (elDef ? `<i class="fs-el-dot" style="background:${elDef.color}"></i>` : '') +
        `</div>`,
      );
    }
    for (const id of Object.keys(arsenal.passives)) {
      if (!arsenal.passives[id]) continue;
      bits.push(
        `<div class="fs-load pass" data-tip-kind="passive" data-tip-id="${id}">` +
          `<span class="fs-load-ico">${icon(id)}</span><span>${arsenal.passives[id]}</span>` +
        `</div>`,
      );
    }
    // Gear lives in gearHud (legacy); loadout is weapons + passives only.
    this.loadoutEl.innerHTML = bits.length
      ? bits.join('')
      : `<div class="fs-load empty"><span>Loadout</span></div>`;

    this.loadoutEl.querySelectorAll('.fs-load[data-tip-kind]').forEach((node) => {
      const el = node as HTMLElement;
      el.addEventListener('pointerenter', () => this.showLoadoutTip(el));
      el.addEventListener('pointerleave', () => this.hideLoadoutTip());
      el.addEventListener('pointermove', (e) => this.positionLoadoutTip(e.clientX, e.clientY));
    });
  }

  /** Legacy ui.formatWeaponStatRows */
  private formatWeaponStatRows(s: Record<string, number> | null | undefined, weaponId: string): [string, string][] {
    if (!s) return [];
    const rows: [string, string][] = [];
    const push = (label: string, value: string | null | undefined) => {
      if (value != null && value !== '') rows.push([label, value]);
    };
    push('Damage', s.dmg != null ? String(Math.round(s.dmg * 10) / 10) : null);
    push('Count', s.count != null ? '×' + s.count : null);
    push('Pierce', s.pierce != null ? String(s.pierce) : null);
    push('Range', s.range != null ? String(Math.round(s.range)) : null);
    push('Reach', s.len != null ? String(Math.round(s.len)) : null);
    push('Orbit', s.orbit != null ? String(Math.round(s.orbit)) : null);
    push('Radius', s.radius != null ? String(Math.round(s.radius)) : null);
    push('Size', s.size != null ? String(Math.round(s.size)) : null);
    push('Distance', s.dist != null ? String(Math.round(s.dist)) : null);
    push('Cone', s.cone != null ? Math.round(s.cone * 100) + '%' : null);
    if (s.speed != null) {
      if (weaponId === 'axe') push('Spin', (Math.round(s.speed * 100) / 100) + ' r/s');
      else push('Speed', String(Math.round(s.speed)));
    }
    push('Cooldown', s.cd != null ? s.cd.toFixed(2) + 's' : null);
    push('Tick', s.tick != null ? s.tick.toFixed(2) + 's' : null);
    push('Bite CD', s.biteCd != null ? s.biteCd.toFixed(2) + 's' : null);
    push('Duration', s.duration != null ? s.duration + 's' : null);
    push('Respawn', s.spawnCd != null ? s.spawnCd.toFixed(1) + 's' : null);
    return rows;
  }

  private tipStatsHtml(rows: [string, string][]) {
    if (!rows.length) return '';
    return (
      '<div class="tip-stats">' +
      rows.map(([lab, val]) => `<div class="tip-stat"><span>${lab}</span><b>${val}</b></div>`).join('') +
      '</div>'
    );
  }

  /** Legacy ui.tipContent — bottom-left loadout / gear / elem hover popups. */
  private showLoadoutTip(anchor: HTMLElement) {
    const kind = anchor.dataset.tipKind;
    const id = anchor.dataset.tipId || '';
    const arsenal = this.tipArsenal;
    const player = this.tipPlayer;
    if (!kind || !arsenal || !player) return;

    let name = '';
    let tag = '';
    let desc = '';
    let statsHtml = '';
    let extra = '';
    let color = '#c9a227';

    if (kind === 'weapon') {
      const def = WEAPON_DEFS[id as keyof typeof WEAPON_DEFS];
      if (!def) return;
      const lvl = arsenal.weapons[id] || 0;
      const el = arsenal.weaponElements[id];
      const elDef = el ? ELEMENTS[el] : null;
      const inf = el ? ELEMENT_INFUSE[el] : null;
      const unique = arsenal.isUnique(id);
      const st = arsenal.getWeaponStats(id);
      const rows = this.formatWeaponStatRows(st, id);
      const unlocks: string[] = [];
      for (let i = 1; i < lvl && i < def.text.length; i++) {
        unlocks.push(`<li>Lv${i + 1}: ${def.text[i]}</li>`);
      }
      const extras: string[] = [];
      if (unique) extras.push('Unique form — stronger stats & elemental look');
      if (elDef) extras.push(elDef.name + (inf ? ': ' + inf.effect : ''));
      if (lvl < WEAPON_MAX && def.text[lvl]) extras.push('Next: ' + def.text[lvl]);
      name = arsenal.displayName(id);
      tag = unique
        ? `Unique · Lv ${lvl} · ${elDef ? elDef.name : 'Element'}`
        : `Weapon · Lv ${lvl}${lvl >= WEAPON_MAX ? ' (MAX)' : ''}`;
      desc = def.text[0] || '';
      statsHtml = this.tipStatsHtml(rows);
      extra =
        (unlocks.length
          ? `<div class="tip-unlocks"><div class="tip-unlocks-lab">Upgrades</div><ul>${unlocks.join('')}</ul></div>`
          : '') + (extras.length ? extras.map((e) => `<div>${e}</div>`).join('') : '');
      color = elDef?.color || '#c98a12';
    } else if (kind === 'passive') {
      const def = PASSIVE_DEFS[id];
      if (!def) return;
      const lvl = arsenal.passives[id] || 0;
      name = def.name;
      tag = `Upgrade · Lv ${lvl} / ${def.max}`;
      desc = def.desc;
      extra = lvl < def.max ? 'Next stack: same bonus again' : 'Maxed';
      color = '#4a8ad4';
    } else if (kind === 'gear') {
      const lab = SLOT_LABELS[id as keyof typeof SLOT_LABELS] || id;
      const it = player.equipment[id as keyof typeof player.equipment];
      if (!it) {
        name = lab;
        tag = 'Empty slot';
        desc = 'Buy gear at the blacksmith while at camp.';
        color = '#888';
      } else {
        const elDef = it.element ? ELEMENTS[it.element] : null;
        name = `${it.qualityName} ${it.name}`;
        tag = lab + (elDef ? ' · ' + elDef.name : '');
        desc = it.desc || '';
        const modRows: [string, string][] = [];
        const mods = it.mods || {};
        for (const [k, v] of Object.entries(mods)) {
          if (typeof v === 'number' && v) modRows.push([k, String(v)]);
        }
        statsHtml = this.tipStatsHtml(modRows.slice(0, 8));
        extra = elDef ? elDef.name + ' element' : '';
        color = it.color || '#c9a227';
      }
    } else if (kind === 'elem') {
      const elDef = ELEMENTS[id];
      if (!elDef) return;
      const inf = ELEMENT_INFUSE[id as keyof typeof ELEMENT_INFUSE];
      name = elDef.name + ' Damage';
      tag = 'Active attack element';
      desc = inf?.effect || `Your attacks deal ${elDef.name} damage.`;
      color = elDef.color;
    } else {
      return;
    }

    this.tipPopEl.innerHTML =
      `<div class="tip-name">${name}</div>` +
      `<div class="tip-tag">${tag}</div>` +
      (desc ? `<p class="tip-desc">${desc}</p>` : '') +
      statsHtml +
      (extra ? `<div class="tip-extra">${extra}</div>` : '');
    this.tipPopEl.classList.remove('hidden', 'tip-compare');
    this.tipPopEl.style.borderColor = color;
    delete this.tipPopEl.dataset.shopTip;
    const r = anchor.getBoundingClientRect();
    this.positionLoadoutTip(r.right + 8, r.top);
  }

  private positionLoadoutTip(x: number, y: number) {
    if (this.tipPopEl.classList.contains('hidden')) return;
    const pad = 10;
    const w = this.tipPopEl.offsetWidth || 220;
    const h = this.tipPopEl.offsetHeight || 80;
    const left = Math.min(window.innerWidth - w - pad, Math.max(pad, x));
    const top = Math.min(window.innerHeight - h - pad, Math.max(pad, y));
    this.tipPopEl.style.left = left + 'px';
    this.tipPopEl.style.top = top + 'px';
  }

  private hideLoadoutTip() {
    this.hideShopCompare();
    this.tipPopEl.classList.add('hidden');
  }

  showPause(
    player: RunPlayer,
    arsenal: ArsenalSystem,
    onResume: () => void,
    extra?: { camp?: CampSystem; day?: DayNightSystem; runTime?: number },
  ) {
    this.pauseEl.classList.remove('hidden');
    const day = extra?.day;
    const camp = extra?.camp;
    const runTime = extra?.runTime || 0;
    const threat = day ? threatAt(day.runTime) : { hp: 1 };
    const pct = (v: number) => Math.round(v * 100) + '%';

    const runRows: [string, string][] = [
      ['Time', formatTime(runTime)],
      ['Day', String(day?.dayNumber || 1)],
      ['Phase', day?.isNight ? 'Night' : 'Day'],
      ['Threat', '×' + threat.hp.toFixed(1)],
      ['Level', String(player.level)],
      ['XP', `${Math.floor(player.xp)} / ${xpNeeded(player.level)}`],
      ['HP', `${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`],
      ['Wood', formatNum(player.wood)],
      ['Meat', formatNum(player.meat)],
      ['Gold', formatNum(player.gold)],
      ['Kills', String(player.kills)],
      ['Raids', String(player.raidsSurvived)],
      ['Bosses', String(player.bosses)],
      ['Dash charges', String(player.dashCharges)],
      ['Camp HP', camp ? `${Math.ceil(camp.hp)} / ${camp.maxHp}` : '—'],
    ];

    const combatRows: [string, string][] = [
      ['Damage', pct(player.damageMult)],
      ['Flat damage', String(Math.round((player.flatDamage || 0) * 10) / 10)],
      ['Crit', pct(player.crit || 0)],
      ['Move speed', String(Math.round(player.speed * player.moveMult))],
      ['Pickup range', String(Math.round(player.magnetR))],
      ['Armor', pct(player.armor || 0)],
      ['Regen', (player.regen || 0).toFixed(2) + ' HP/s'],
      ['Lifesteal', pct(player.gearLifesteal || 0)],
      ['Thorns', String(Math.round((player.thorns || 0) * 10) / 10)],
      ['XP gain', '×' + (1 + (player.gearXpGain || 0)).toFixed(2)],
      ['Area', '×' + ((1 + (arsenal.passives.area || 0) * 0.1) * (1 + (player.gearArea || 0))).toFixed(2)],
      ['Haste', '×' + (1 + (player.gearHaste || 0)).toFixed(2)],
    ];

    const weaponsHtml = arsenal.weaponOrder.length
      ? `<div class="fs-pause-cards">${arsenal.weaponOrder.map((id) => {
          const def = WEAPON_DEFS[id as keyof typeof WEAPON_DEFS];
          const lvl = arsenal.weapons[id] || 0;
          const el = arsenal.weaponElements[id];
          const elDef = el ? ELEMENTS[el] : null;
          const unique = arsenal.isUnique(id);
          const stats = arsenal.getWeaponStats(id);
          const disp = arsenal.displayName(id);
          const rows = stats
            ? Object.entries(stats)
                .filter(([, v]) => typeof v === 'number')
                .slice(0, 6)
                .map(([k, v]) => `<div class="fs-pause-stat"><span>${k}</span><b>${typeof v === 'number' ? (Number.isInteger(v) ? v : (v as number).toFixed(2)) : v}</b></div>`)
                .join('')
            : '';
          return `<article class="fs-pause-card">
            <div class="fs-pause-card-icon">${icon(id, 'weapon')}</div>
            <div class="fs-pause-card-name"${elDef ? ` style="color:${elDef.color}"` : ''}>${disp}</div>
            <div class="fs-pause-card-tag">${unique ? 'Unique · ' : ''}Lv ${lvl}${elDef ? ' · ' + elDef.name : ''}</div>
            <p class="fs-pause-card-desc">${unique ? `Awakened unique form of ${def?.name || id}.` : (def?.text[0] || '')}</p>
            <div class="fs-pause-stat-grid">${rows}</div>
          </article>`;
        }).join('')}</div>`
      : '<p class="fs-pause-empty">No weapons yet — level up to pick cards.</p>';

    const passIds = Object.keys(arsenal.passives).filter((id) => arsenal.passives[id] > 0);
    const passivesHtml = passIds.length
      ? `<div class="fs-pause-cards compact">${passIds.map((id) => {
          const def = PASSIVE_DEFS[id];
          return `<article class="fs-pause-card">
            <div class="fs-pause-card-icon">${icon(id)}</div>
            <div class="fs-pause-card-name">${def?.name || id}</div>
            <div class="fs-pause-card-tag">Lv ${arsenal.passives[id]} / ${def?.max || '?'}</div>
            <p class="fs-pause-card-desc">${def?.desc || ''}</p>
          </article>`;
        }).join('')}</div>`
      : '<p class="fs-pause-empty">No passive upgrades yet.</p>';

    const gearBits: string[] = [];
    for (const slot of Object.keys(player.equipment || {})) {
      const it = player.equipment[slot as keyof typeof player.equipment];
      if (!it) continue;
      gearBits.push(`<article class="fs-pause-card">
        <div class="fs-pause-card-icon">${icon(slot)}</div>
        <div class="fs-pause-card-name" style="color:${it.color}">${it.qualityName} ${it.name}</div>
        <div class="fs-pause-card-tag">${slot}</div>
      </article>`);
    }
    const gearHtml = gearBits.length
      ? `<div class="fs-pause-cards compact">${gearBits.join('')}</div>`
      : '<p class="fs-pause-empty">No gear equipped.</p>';

    const grid = (rows: [string, string][]) =>
      `<div class="fs-pause-stat-grid">${rows.map(([a, b]) => `<div class="fs-pause-stat"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;

    this.pauseEl.innerHTML = `
      <div class="fs-panel fs-pause-sheet interactive">
        <header class="fs-pause-head">
          <h2>Character Sheet</h2>
          <div>
            <button class="fs-btn" id="pause-options">Options</button>
            <button class="fs-btn primary" id="pause-resume">Resume (Esc)</button>
            <button class="fs-btn danger" id="pause-quit">Abandon Run</button>
          </div>
        </header>
        <div class="fs-pause-body">
          <section class="fs-pause-sec"><h3>Run</h3>${grid(runRows)}</section>
          <section class="fs-pause-sec"><h3>Combat</h3>${grid(combatRows)}</section>
          <section class="fs-pause-sec"><h3>Weapons</h3>${weaponsHtml}</section>
          <section class="fs-pause-sec"><h3>Passives</h3>${passivesHtml}</section>
          <section class="fs-pause-sec"><h3>Gear</h3>${gearHtml}</section>
        </div>
      </div>
    `;
    this.pauseEl.querySelector('#pause-options')?.addEventListener('click', () => this.showOptions('pause'));
    this.pauseEl.querySelector('#pause-resume')?.addEventListener('click', onResume);
    this.pauseEl.querySelector('#pause-quit')?.addEventListener('click', () => this.requestMainMenu());
  }

  hidePause() {
    this.pauseEl.classList.add('hidden');
  }

  showLevelUpCards(
    cards: LevelUpCard[],
    rerolls: number,
    banishes: number,
    arsenal?: ArsenalSystem,
    player?: RunPlayer,
  ) {
    if (arsenal) this.tipArsenal = arsenal;
    if (player) this.tipPlayer = player;
    this.cardsEl.classList.remove('hidden');
    const level = player?.level || 1;
    const canBanish = banishes > 0;
    const cardHtml = cards
      .map((c, i) => {
        const label = this.cardLabel(c);
        const kind = c.kind === 'weapon' ? 'weapon' : c.kind === 'passive' ? 'passive' : c.kind === 'element' ? 'element' : 'bonus';
        const border = label.color ? ` style="border-color:${label.color}"` : '';
        return (
          `<div class="fs-pick-wrap">` +
          `<button class="fs-pick-card kind-${kind}" data-i="${i}" type="button"${border}>` +
          `<kbd>${i + 1}</kbd>` +
          `<div class="fs-pick-icon">${label.icon || ''}</div>` +
          `<div class="title">${label.title}</div>` +
          (label.tag ? `<div class="tag">${label.tag}</div>` : '') +
          `<div class="desc">${label.desc}</div>` +
          `</button>` +
          `<button type="button" class="fs-banish-btn" data-banish="${i}" ` +
          `title="Banish this option for the rest of the run" ${canBanish ? '' : 'disabled'}>Banish</button>` +
          `</div>`
        );
      })
      .join('');
    this.cardsEl.innerHTML = `
      <div class="fs-card-wrap interactive">
        <h2>Level ${level} — pick an upgrade</h2>
        <p>Choose 1 of ${cards.length} — keys 1–${cards.length} · Banish removes a choice for the run</p>
        <div class="fs-card-row">${cardHtml}</div>
        <div class="fs-card-actions">
          <button class="fs-btn" id="card-reroll" ${rerolls <= 0 ? 'disabled' : ''}>` +
            `<span class="fs-btn-ico">${ICONS.rerolls}</span>Reroll (${rerolls})</button>
          <span class="fs-banish-left">` +
            `<span class="fs-btn-ico">${ICONS.banishes}</span>Banishes left: <b>${banishes}</b></span>
        </div>
      </div>
    `;
    const doBanish = (i: number) => {
      if (!cards[i]) return;
      if (banishes <= 0) {
        Audio.playSfx('deny');
        return;
      }
      Audio.playSfx('click');
      this.onCardBanish?.(cards[i]);
    };
    this.cardsEl.querySelectorAll('.fs-pick-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt((btn as HTMLElement).dataset.i!, 10);
        this.onCardPick?.(cards[i]);
      });
      // Legacy also allowed right-click as a shortcut.
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        doBanish(parseInt((btn as HTMLElement).dataset.i!, 10));
      });
    });
    this.cardsEl.querySelectorAll('.fs-banish-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        doBanish(parseInt((btn as HTMLElement).dataset.banish!, 10));
      });
    });
    this.cardsEl.querySelector('#card-reroll')?.addEventListener('click', () => {
      if (rerolls <= 0) {
        Audio.playSfx('deny');
        return;
      }
      Audio.playSfx('click');
      this.onCardReroll?.();
    });
  }

  hideLevelUp() {
    this.cardsEl.classList.add('hidden');
  }

  cardLabel(c: LevelUpCard): { title: string; desc: string; tag?: string; icon: string; color?: string } {
    const arsenal = this.tipArsenal;
    if (c.kind === 'weapon') {
      const def = WEAPON_DEFS[c.id as keyof typeof WEAPON_DEFS];
      const el = arsenal?.weaponElements[c.id];
      const willUnique = c.level >= WEAPON_MAX && !!el;
      const uniqName = willUnique && el ? uniqueWeaponName(c.id, el) : null;
      return {
        title: uniqName || def?.name || c.id,
        tag: willUnique ? 'UNIQUE' : `${c.level}/${WEAPON_MAX}`,
        desc: willUnique
          ? `Awakens as ${uniqName} — stronger stats & elemental look.`
          : def?.text[c.level - 1] || 'Upgrade weapon',
        icon: icon(c.id, 'weapon'),
        color: willUnique && el && ELEMENTS[el] ? ELEMENTS[el].color : undefined,
      };
    }
    if (c.kind === 'passive') {
      const p = PASSIVE_DEFS[c.id];
      return {
        title: p?.name || c.id,
        tag: `${c.level}/${p?.max || '?'}`,
        desc: p?.desc || '',
        icon: icon(c.id),
      };
    }
    if (c.kind === 'element' && c.element) {
      const el = ELEMENTS[c.element];
      const wpn = WEAPON_DEFS[c.id as keyof typeof WEAPON_DEFS];
      const inf = ELEMENT_INFUSE[c.element];
      const iconKey = ELEMENT_ICON[c.element] || 'ember';
      const atMax = (arsenal?.weapons[c.id] || 0) >= WEAPON_MAX;
      const uniqName = atMax ? uniqueWeaponName(c.id, c.element) : null;
      return {
        title: uniqName || inf?.name || `${el?.name || c.element} infusion`,
        tag: atMax
          ? `UNIQUE · ${wpn?.name || c.id} → ${el?.name || c.element}`
          : `1/1 · ${wpn?.name || c.id} → ${el?.name || c.element}`,
        desc: atMax
          ? `Unlocks ${uniqName}. ${inf?.effect || ''}`
          : inf?.effect || '',
        icon: icon(iconKey, 'ember'),
        color: el?.color,
      };
    }
    const b = BONUS_DEFS[c.id];
    return { title: b?.name || c.id, tag: 'Bonus', desc: b?.desc || '', icon: icon(c.id, 'gold') };
  }

  showGameOver(
    stats: {
      reason?: 'camp' | 'death';
      time?: number;
      day: number;
      level: number;
      kills: number;
      raids?: number;
      bosses?: number;
      trees?: number;
      wood?: number;
      meat?: number;
      gold?: number;
      campLevel?: number;
      campUpgrades?: number;
      credits: number;
      totalCredits?: number;
    },
    onMenu: () => void,
  ) {
    this.hideCampPanel();
    this.gameOverEl.classList.remove('hidden');
    const title = stats.reason === 'camp' ? 'Camp Destroyed!' : 'You Fainted!';
    const timeLabel =
      stats.time != null ? `${formatTime(stats.time)} (day ${stats.day})` : `Day ${stats.day}`;
    const rows: [string, string | number][] = [
      ['Survived', timeLabel],
      ['Level reached', stats.level],
      ['Animals defeated', stats.kills],
      ['Trees chopped', stats.trees || 0],
      ['Raids repelled', stats.raids || 0],
      ['Bosses slain', stats.bosses || 0],
      ['Wood collected', formatNum(stats.wood || 0)],
      ['Meat collected', formatNum(stats.meat || 0)],
      ['Gold collected', formatNum(stats.gold || 0)],
      ['Camp level', stats.campLevel || 0],
      ['Camp upgrades', stats.campUpgrades || 0],
    ];
    const wallet =
      stats.totalCredits != null
        ? ` · Wallet: ${formatNum(stats.totalCredits)}`
        : '';
    this.gameOverEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h2>${title}</h2>
        <div class="fs-go-stats">
          ${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}
        </div>
        <p class="fs-go-credits">+${formatNum(stats.credits)} Credits${wallet}</p>
        <button class="fs-btn primary" id="go-menu">Main Menu</button>
      </div>
    `;
    this.gameOverEl.querySelector('#go-menu')?.addEventListener('click', onMenu);
  }

  hideGameOver() {
    this.gameOverEl.classList.add('hidden');
  }

  /** Opens the right-side camp Build panel (legacy U key behavior). */
  showCampShop(_camp?: CampSystem, _player?: RunPlayer) {
    this.shopEl.classList.add('hidden');
    this.showCampPanelForRun();
    if (_camp && _player) {
      this.refreshCampPanel(_camp, _player, _camp.contains(_player.x, _player.y, 30));
    }
  }

  hideCampShop() {
    this.shopEl.classList.add('hidden');
    this.setCampPanelOpen(false);
  }

  /** True while the right-side camp panel is open (not collapsed). */
  isCampOpen() {
    return this.campPanelOpen && !this.campPanelEl.classList.contains('hidden');
  }

  setTip(text: string) {
    this.tipEl.textContent = text;
    const menuOpen = !this.menuEl.classList.contains('hidden');
    this.tipEl.classList.toggle('hidden', !text || menuOpen);
  }

  isModalOpen() {
    return !this.pauseEl.classList.contains('hidden')
      || !this.cardsEl.classList.contains('hidden')
      || !this.shopEl.classList.contains('hidden')
      || !this.gameOverEl.classList.contains('hidden')
      || !this.updateEl.classList.contains('hidden')
      || !this.confirmEl.classList.contains('hidden')
      || !this.optionsEl.classList.contains('hidden');
  }
}
