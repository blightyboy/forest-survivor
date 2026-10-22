/**
 * Mid-run checkpoint — merges into forestSave / localStorage beside meta+settings.
 * Restores seed, day clock, player economy, arsenal, camp levels, POIs, mutators.
 */

const RUN_KEY = 'activeRun';

export type RunSnapshot = {
  v: 1;
  savedAt: number;
  worldSeed: number;
  runTime: number;
  dayNumber: number;
  graceLeft: number;
  mutators: string[];
  winGoal: string;
  assaultIndex: number;
  assaultTimer: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    wood: number;
    meat: number;
    gold: number;
    treesChopped: number;
    woodCollected: number;
    meatCollected: number;
    goldCollected: number;
    campUpgrades: number;
    kills: number;
    bosses: number;
    raidsSurvived: number;
    rerollsLeft: number;
    banishesLeft: number;
    equipment: Record<string, unknown>;
  };
  arsenal: {
    weapons: Record<string, number>;
    weaponOrder: string[];
    weaponElements: Record<string, string | null>;
    weaponUnique: Record<string, boolean>;
    passives: Record<string, number>;
    usedElements: Record<string, boolean>;
    banished: string[];
  };
  camp: {
    levels: Record<string, number>;
    hp: number;
    maxHp: number;
    wallHps: number[];
  };
  /** @deprecated Prefer `pois` — kept so older continues still mark used IDs. */
  poisUsed: number[];
  /** Current dawn layout (kind/pos/used). When present, replaces world-gen POIs. */
  pois?: { id: number; kind: string; x: number; y: number; used: boolean }[];
};

function readBlob(): Record<string, unknown> {
  if (typeof window !== 'undefined' && window.forestSave) {
    try {
      const file = window.forestSave.load();
      if (file && typeof file === 'object') return file as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  try {
    const raw = localStorage.getItem('forestSurvivor_meta_v1');
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

function writeBlob(data: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.forestSave) {
    try {
      window.forestSave.save(data);
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.setItem('forestSurvivor_meta_v1', JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function hasActiveRun(): boolean {
  const snap = loadRunSnapshot();
  return !!snap && snap.v === 1;
}

export function loadRunSnapshot(): RunSnapshot | null {
  try {
    const blob = readBlob();
    const run = blob[RUN_KEY];
    if (!run || typeof run !== 'object') return null;
    const s = run as RunSnapshot;
    if (s.v !== 1 || !s.worldSeed) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveRunSnapshot(snap: RunSnapshot) {
  const blob = readBlob();
  blob[RUN_KEY] = snap;
  writeBlob(blob);
}

export function clearRunSnapshot() {
  const blob = readBlob();
  delete blob[RUN_KEY];
  writeBlob(blob);
}
