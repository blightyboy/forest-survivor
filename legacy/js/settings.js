'use strict';

/**
 * Player options (display, music, accessibility, tutorials). Persisted in the
 * same save file / localStorage as meta progress so settings survive between runs.
 */
const SETTINGS_STORAGE_KEY = 'forestSurvivor_settings_v1';

const TUTORIAL_IDS = ['enemy', 'build', 'smith', 'firstNight'];

const DEFAULT_SETTINGS = {
  displayMode: 'windowed', // windowed | borderless | fullscreen
  width: 1280,
  height: 720,
  musicVolume: 0.55, // 0–1
  uiScale: 1,        // 0.8–1.5
  fontScale: 1,      // 0.85–1.6
  shakeScale: 1,    // 0–1 camera shake intensity
  tutorialsEnabled: true,
  tutorialsSeen: {},
};

function clampScale(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function emptyTutorialsSeen() {
  const o = {};
  for (const id of TUTORIAL_IDS) o[id] = false;
  return o;
}

function allTutorialsSeen() {
  const o = {};
  for (const id of TUTORIAL_IDS) o[id] = true;
  return o;
}

const Settings = {
  displayMode: DEFAULT_SETTINGS.displayMode,
  width: DEFAULT_SETTINGS.width,
  height: DEFAULT_SETTINGS.height,
  musicVolume: DEFAULT_SETTINGS.musicVolume,
  uiScale: DEFAULT_SETTINGS.uiScale,
  fontScale: DEFAULT_SETTINGS.fontScale,
  shakeScale: DEFAULT_SETTINGS.shakeScale,
  tutorialsEnabled: DEFAULT_SETTINGS.tutorialsEnabled,
  tutorialsSeen: emptyTutorialsSeen(),
  /** Where options was opened from: 'menu' | 'pause' */
  returnTo: 'menu',

  toJSON() {
    return {
      displayMode: this.displayMode,
      width: this.width | 0,
      height: this.height | 0,
      musicVolume: this.musicVolume,
      uiScale: this.uiScale,
      fontScale: this.fontScale,
      shakeScale: this.shakeScale,
      tutorialsEnabled: !!this.tutorialsEnabled,
      tutorialsSeen: Object.assign({}, this.tutorialsSeen),
    };
  },

  load() {
    let data = null;
    try {
      if (typeof window !== 'undefined' && window.jungleSave) {
        const file = window.jungleSave.load();
        if (file && file.settings && typeof file.settings === 'object') data = file.settings;
      }
    } catch (_) { /* ignore */ }
    if (!data) {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) data = JSON.parse(raw);
      } catch (_) { /* ignore */ }
    }
    if (!data || typeof data !== 'object') return;
    if (data.displayMode === 'windowed' || data.displayMode === 'borderless' || data.displayMode === 'fullscreen') {
      this.displayMode = data.displayMode;
    }
    if (data.width > 0) this.width = data.width | 0;
    if (data.height > 0) this.height = data.height | 0;
    if (typeof data.musicVolume === 'number') {
      this.musicVolume = Math.max(0, Math.min(1, data.musicVolume));
    }
    if (data.uiScale != null) this.uiScale = clampScale(data.uiScale, 0.8, 1.5, 1);
    if (data.fontScale != null) this.fontScale = clampScale(data.fontScale, 0.85, 1.6, 1);
    if (data.shakeScale != null) this.shakeScale = clampScale(data.shakeScale, 0, 1, 1);

    if (data.tutorialsEnabled != null || data.tutorialsSeen) {
      this.tutorialsEnabled = data.tutorialsEnabled !== false;
      const seen = emptyTutorialsSeen();
      if (data.tutorialsSeen && typeof data.tutorialsSeen === 'object') {
        for (const id of TUTORIAL_IDS) seen[id] = !!data.tutorialsSeen[id];
      }
      this.tutorialsSeen = seen;
    } else {
      // Pre-tutorial save: don't force popups on returning players.
      this.tutorialsEnabled = false;
      this.tutorialsSeen = allTutorialsSeen();
    }
  },

  save() {
    const payload = this.toJSON();
    try {
      if (typeof window !== 'undefined' && window.jungleSave) {
        const existing = window.jungleSave.load() || {};
        window.jungleSave.save(Object.assign({}, existing, { settings: payload }));
      }
    } catch (_) { /* fall through */ }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* quota */ }
  },

  /** Apply loaded / current settings to Music, a11y CSS, and Electron window. */
  apply() {
    if (typeof Music !== 'undefined' && Music.setVolume) {
      Music.setVolume(this.musicVolume);
    }
    this.applyAccessibility();
    this.applyDisplay();
  },

  applyAccessibility() {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', String(this.uiScale));
    root.style.setProperty('--font-scale', String(this.fontScale));
  },

  applyDisplay() {
    if (typeof window !== 'undefined' && window.jungleDisplay && window.jungleDisplay.available) {
      try {
        window.jungleDisplay.apply({
          mode: this.displayMode,
          width: this.width,
          height: this.height,
        });
        return;
      } catch (_) { /* fall through to browser fullscreen */ }
    }
    const root = document.documentElement;
    if (this.displayMode === 'fullscreen') {
      if (!document.fullscreenElement && root.requestFullscreen) {
        root.requestFullscreen().catch(() => {});
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  },

  setDisplayMode(mode) {
    if (mode !== 'windowed' && mode !== 'borderless' && mode !== 'fullscreen') return;
    this.displayMode = mode;
    this.applyDisplay();
    this.save();
  },

  setResolution(width, height) {
    this.width = Math.max(640, width | 0);
    this.height = Math.max(480, height | 0);
    if (this.displayMode === 'windowed') this.applyDisplay();
    this.save();
  },

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, Number(v) || 0));
    if (typeof Music !== 'undefined' && Music.setVolume) {
      Music.setVolume(this.musicVolume);
    }
    this.save();
  },

  setUiScale(v) {
    this.uiScale = clampScale(v, 0.8, 1.5, 1);
    this.applyAccessibility();
    this.save();
  },

  setFontScale(v) {
    this.fontScale = clampScale(v, 0.85, 1.6, 1);
    this.applyAccessibility();
    this.save();
  },

  setShakeScale(v) {
    this.shakeScale = clampScale(v, 0, 1, 1);
    this.save();
  },

  shouldShowTutorial(id) {
    if (!this.tutorialsEnabled) return false;
    if (TUTORIAL_IDS.indexOf(id) < 0) return false;
    return !this.tutorialsSeen[id];
  },

  markTutorialSeen(id) {
    if (TUTORIAL_IDS.indexOf(id) < 0) return;
    this.tutorialsSeen[id] = true;
    this.save();
  },

  /**
   * Options toggle. Turning ON resets all tips so they play again.
   * Turning OFF stops further popups (progress kept).
   */
  setTutorialsEnabled(on) {
    this.tutorialsEnabled = !!on;
    if (this.tutorialsEnabled) this.tutorialsSeen = emptyTutorialsSeen();
    this.save();
  },

  resolutions() {
    if (typeof window !== 'undefined' && window.jungleDisplay && window.jungleDisplay.available) {
      try {
        const list = window.jungleDisplay.list();
        if (list && list.resolutions && list.resolutions.length) return list.resolutions;
      } catch (_) { /* ignore */ }
    }
    return [
      { width: 1280, height: 720, label: '1280 × 720' },
      { width: 1600, height: 900, label: '1600 × 900' },
      { width: 1920, height: 1080, label: '1920 × 1080' },
    ];
  },
};
