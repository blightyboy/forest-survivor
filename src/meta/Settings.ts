import { COACH_IDS } from '../data/tutorials';
import { normalizeMutatorIds, type MutatorId } from '../data/mutators';
import { normalizeWinGoal, type WinGoalId } from '../data/winGoals';

const SETTINGS_STORAGE_KEY = 'forestSurvivor_settings_v1';

export const TUTORIAL_IDS = COACH_IDS;
export type TutorialId = (typeof TUTORIAL_IDS)[number];

export type DisplayMode = 'windowed' | 'borderless' | 'fullscreen';

type SettingsData = {
  displayMode: DisplayMode;
  width: number;
  height: number;
  vsync: boolean;
  musicVolume: number;
  sfxVolume: number;
  uiScale: number;
  fontScale: number;
  shakeScale: number;
  /**
   * Relative camera zoom vs the default view (1 = 100%).
   * Absolute Phaser factor is `zoomScale * ZOOM_VIEW_BASE`.
   */
  zoomScale: number;
  /** True once zoomScale is stored as relative (1 = default). Legacy saves omitted this. */
  zoomRelative?: boolean;
  tutorialsEnabled: boolean;
  tutorialsSeen: Record<string, boolean>;
  /** Active run mutators (menu toggles). */
  mutators: MutatorId[];
  /** Optional win milestone for the next run. */
  winGoal: WinGoalId;
};

/**
 * Absolute camera multiplier that equals 100% in Options.
 * (Previously this was the default/max slider value of 0.6.)
 */
export const ZOOM_VIEW_BASE = 0.6;
/** Relative zoom: 1 = default view; below zooms out, above zooms in. */
export const ZOOM_SCALE_DEFAULT = 1;
export const ZOOM_SCALE_MIN = 0.5;
export const ZOOM_SCALE_MAX = 1.5;

const DEFAULTS: SettingsData = {
  displayMode: 'windowed',
  width: 1280,
  height: 720,
  vsync: true,
  musicVolume: 0.55,
  sfxVolume: 1,
  uiScale: 1,
  fontScale: 1,
  shakeScale: 1,
  zoomScale: ZOOM_SCALE_DEFAULT,
  tutorialsEnabled: true,
  tutorialsSeen: {},
  mutators: [],
  winGoal: 'none',
};

function clampScale(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function emptyTutorialsSeen() {
  const o: Record<string, boolean> = {};
  for (const id of TUTORIAL_IDS) o[id] = false;
  return o;
}

class SettingsManager implements SettingsData {
  displayMode: DisplayMode = DEFAULTS.displayMode;
  width = DEFAULTS.width;
  height = DEFAULTS.height;
  vsync = DEFAULTS.vsync;
  musicVolume = DEFAULTS.musicVolume;
  sfxVolume = DEFAULTS.sfxVolume;
  uiScale = DEFAULTS.uiScale;
  fontScale = DEFAULTS.fontScale;
  shakeScale = DEFAULTS.shakeScale;
  zoomScale = DEFAULTS.zoomScale;
  tutorialsEnabled = DEFAULTS.tutorialsEnabled;
  tutorialsSeen: Record<string, boolean> = emptyTutorialsSeen();
  mutators: MutatorId[] = [];
  winGoal: WinGoalId = 'none';
  returnTo: 'menu' | 'pause' = 'menu';

  toJSON(): SettingsData {
    return {
      displayMode: this.displayMode,
      width: this.width | 0,
      height: this.height | 0,
      vsync: !!this.vsync,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      uiScale: this.uiScale,
      fontScale: this.fontScale,
      shakeScale: this.shakeScale,
      zoomScale: this.zoomScale,
      zoomRelative: true,
      tutorialsEnabled: !!this.tutorialsEnabled,
      tutorialsSeen: { ...this.tutorialsSeen },
      mutators: [...this.mutators],
      winGoal: this.winGoal,
    };
  }

  load() {
    let data: Partial<SettingsData> | null = null;
    try {
      if (window.forestSave) {
        const file = window.forestSave.load();
        if (file && typeof file === 'object' && file.settings && typeof file.settings === 'object') {
          data = file.settings as Partial<SettingsData>;
        }
      }
    } catch { /* ignore */ }
    if (!data) {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) data = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    if (!data) return;
    if (data.displayMode === 'windowed' || data.displayMode === 'borderless' || data.displayMode === 'fullscreen') {
      this.displayMode = data.displayMode;
    }
    if (data.width && data.width > 0) this.width = data.width | 0;
    if (data.height && data.height > 0) this.height = data.height | 0;
    if (typeof data.vsync === 'boolean') this.vsync = data.vsync;
    if (typeof data.musicVolume === 'number') this.musicVolume = clampScale(data.musicVolume, 0, 1, 0.55);
    if (typeof data.sfxVolume === 'number') this.sfxVolume = clampScale(data.sfxVolume, 0, 1, 1);
    if (data.uiScale != null) this.uiScale = clampScale(data.uiScale, 0.8, 1.5, 1);
    if (data.fontScale != null) this.fontScale = clampScale(data.fontScale, 0.85, 1.6, 1);
    if (data.shakeScale != null) this.shakeScale = clampScale(data.shakeScale, 0, 1, 1);
    if (data.zoomScale != null) {
      let z = Number(data.zoomScale);
      // Legacy absolute 0.3–0.6 → relative (old 0.6 becomes 1.0 / 100%).
      if (!data.zoomRelative && Number.isFinite(z)) z = z / ZOOM_VIEW_BASE;
      this.zoomScale = clampScale(z, ZOOM_SCALE_MIN, ZOOM_SCALE_MAX, ZOOM_SCALE_DEFAULT);
    }
    if (data.tutorialsEnabled != null || data.tutorialsSeen) {
      this.tutorialsEnabled = data.tutorialsEnabled !== false;
      const seen = emptyTutorialsSeen();
      if (data.tutorialsSeen && typeof data.tutorialsSeen === 'object') {
        for (const id of TUTORIAL_IDS) seen[id] = !!data.tutorialsSeen[id];
      }
      this.tutorialsSeen = seen;
    }
    if (data.mutators) this.mutators = normalizeMutatorIds(data.mutators);
    if (data.winGoal) this.winGoal = normalizeWinGoal(data.winGoal);
  }

  save() {
    const payload = this.toJSON();
    try {
      if (window.forestSave) {
        const existing = window.forestSave.load() || {};
        window.forestSave.save({ ...existing, settings: payload });
      }
    } catch { /* ignore */ }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  apply() {
    this.applyAccessibility();
    this.applyDisplay();
    window.__forestApplyZoom?.(this.zoomScale);
    // Separate music / SFX buses (legacy Settings.apply → Music.setVolume).
    void import('../audio/Music').then(({ Music }) => Music.setVolume(this.musicVolume));
    void import('../audio/Audio').then(({ Audio }) => {
      Audio.setVolume(0.12 + this.sfxVolume * 0.4);
      Audio.setSfxMuted(this.sfxVolume <= 0.001);
    });
  }

  /** True when coach tips are On (each run re-shows them; per-run dedupe is in RunScene). */
  shouldShowTutorial(id: string) {
    if (!this.tutorialsEnabled) return false;
    return (TUTORIAL_IDS as readonly string[]).includes(id);
  }

  /** Legacy no-op for save shape; progress is no longer persisted across runs. */
  markTutorialSeen(_id: string) {
    /* intentionally empty — tips replay every run while enabled */
  }

  applyAccessibility() {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', String(this.uiScale));
    root.style.setProperty('--font-scale', String(this.fontScale));
  }

  /** Phaser / canvas text size in CSS pixels after Options font × UI scale. */
  textPx(base: number) {
    return Math.max(1, Math.round(base * this.fontScale * this.uiScale));
  }

  applyDisplay() {
    if (window.forestDisplay?.available) {
      try {
        window.forestDisplay.apply({
          mode: this.displayMode,
          width: this.width,
          height: this.height,
        });
        return;
      } catch { /* fall through */ }
    }
    const root = document.documentElement;
    if (this.displayMode === 'fullscreen') {
      if (!document.fullscreenElement && root.requestFullscreen) {
        root.requestFullscreen().catch(() => {});
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * Commit draft values from the Options form (Apply changes).
   * Display / accessibility are applied only here — not on every control tweak.
   */
  commit(draft: {
    displayMode?: DisplayMode;
    width?: number;
    height?: number;
    vsync?: boolean;
    musicVolume?: number;
    sfxVolume?: number;
    uiScale?: number;
    fontScale?: number;
    shakeScale?: number;
    zoomScale?: number;
    tutorialsEnabled?: boolean;
  }) {
    const prevTutorials = this.tutorialsEnabled;
    const prevMode = this.displayMode;
    const prevW = this.width;
    const prevH = this.height;
    const prevVsync = this.vsync;
    const prevZoom = this.zoomScale;

    if (draft.displayMode === 'windowed' || draft.displayMode === 'borderless' || draft.displayMode === 'fullscreen') {
      this.displayMode = draft.displayMode;
    }
    if (draft.width && draft.width > 0) this.width = Math.max(640, draft.width | 0);
    if (draft.height && draft.height > 0) this.height = Math.max(480, draft.height | 0);
    if (typeof draft.vsync === 'boolean') this.vsync = draft.vsync;
    if (typeof draft.musicVolume === 'number') this.musicVolume = clampScale(draft.musicVolume, 0, 1, 0.55);
    if (typeof draft.sfxVolume === 'number') this.sfxVolume = clampScale(draft.sfxVolume, 0, 1, 1);
    if (draft.uiScale != null) this.uiScale = clampScale(draft.uiScale, 0.8, 1.5, 1);
    if (draft.fontScale != null) this.fontScale = clampScale(draft.fontScale, 0.85, 1.6, 1);
    if (draft.shakeScale != null) this.shakeScale = clampScale(draft.shakeScale, 0, 1, 1);
    if (draft.zoomScale != null) {
      this.zoomScale = clampScale(draft.zoomScale, ZOOM_SCALE_MIN, ZOOM_SCALE_MAX, ZOOM_SCALE_DEFAULT);
    }
    if (typeof draft.tutorialsEnabled === 'boolean') {
      this.tutorialsEnabled = draft.tutorialsEnabled;
      // Turning tutorials On resets tip progress (same as legacy Options).
      if (this.tutorialsEnabled && !prevTutorials) {
        this.tutorialsSeen = emptyTutorialsSeen();
      }
    }

    const displayChanged =
      this.displayMode !== prevMode ||
      this.width !== prevW ||
      this.height !== prevH;
    const vsyncChanged = this.vsync !== prevVsync;
    const zoomChanged = Math.abs(this.zoomScale - prevZoom) > 1e-6;

    // Do NOT re-apply window bounds when only zoom/audio/UI changed — that was
    // resizing the window and changing the adaptive zoom base mid-run.
    this.applyAccessibility();
    if (displayChanged) this.applyDisplay();
    this.save();
    if (vsyncChanged) window.__forestApplyVsync?.(this.vsync);
    // Only touch the camera when zoom or display actually changed — a no-op
    // Apply was recalculating zoom from a drifted buffer size and jumping the view.
    if (zoomChanged || displayChanged) {
      window.__forestApplyZoom?.(this.zoomScale);
      if (displayChanged) {
        // Buffer resize lags the OS window; re-fit zoom after Phaser catches up.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.__forestApplyZoom?.(this.zoomScale));
        });
      }
    }
  }

  setZoomScale(v: number) {
    this.zoomScale = clampScale(v, ZOOM_SCALE_MIN, ZOOM_SCALE_MAX, ZOOM_SCALE_DEFAULT);
    this.save();
    window.__forestApplyZoom?.(this.zoomScale);
  }

  setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode;
    this.applyDisplay();
    this.save();
  }

  setResolution(width: number, height: number) {
    this.width = Math.max(640, width | 0);
    this.height = Math.max(480, height | 0);
    this.applyDisplay();
    this.save();
  }

  setMusicVolume(v: number) {
    this.musicVolume = clampScale(v, 0, 1, 0.55);
    this.save();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = clampScale(v, 0, 1, 1);
    this.save();
  }

  setUiScale(v: number) {
    this.uiScale = clampScale(v, 0.8, 1.5, 1);
    this.applyAccessibility();
    this.save();
  }

  setFontScale(v: number) {
    this.fontScale = clampScale(v, 0.85, 1.6, 1);
    this.applyAccessibility();
    this.save();
  }

  setShakeScale(v: number) {
    this.shakeScale = clampScale(v, 0, 1, 1);
    this.save();
  }

  setVsync(on: boolean) {
    this.vsync = !!on;
    this.save();
    // Phaser game registers this from main.ts (avoids circular imports).
    window.__forestApplyVsync?.(this.vsync);
  }

  setTutorialsEnabled(on: boolean) {
    this.tutorialsEnabled = !!on;
    if (this.tutorialsEnabled) this.tutorialsSeen = emptyTutorialsSeen();
    this.save();
  }

  toggleMutator(id: MutatorId) {
    const i = this.mutators.indexOf(id);
    if (i >= 0) this.mutators.splice(i, 1);
    else this.mutators.push(id);
    this.mutators = normalizeMutatorIds(this.mutators);
    this.save();
  }

  setMutators(ids: MutatorId[]) {
    this.mutators = normalizeMutatorIds(ids);
    this.save();
  }

  setWinGoal(id: WinGoalId) {
    this.winGoal = normalizeWinGoal(id);
    this.save();
  }

  resolutions(): { width: number; height: number; label?: string }[] {
    if (window.forestDisplay?.available) {
      try {
        const list = window.forestDisplay.list();
        if (list?.resolutions?.length) return list.resolutions;
      } catch { /* ignore */ }
    }
    return [
      { width: 1280, height: 720, label: '1280 × 720' },
      { width: 1366, height: 768, label: '1366 × 768' },
      { width: 1600, height: 900, label: '1600 × 900' },
      { width: 1920, height: 1080, label: '1920 × 1080' },
      { width: 2560, height: 1440, label: '2560 × 1440' },
      { width: 3840, height: 2160, label: '3840 × 2160 (4K)' },
    ];
  }
}

export const settings = new SettingsManager();
settings.load();
settings.apply();
