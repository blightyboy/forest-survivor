/** Meta achievements — credit rewards + permanent card/weapon unlocks. */

export type AchievementId =
  | 'first_blood'
  | 'bestiary_5'
  | 'bestiary_12'
  | 'true_boss'
  | 'raid_3'
  | 'raid_6'
  | 'win_easy'
  | 'win_medium'
  | 'win_hard'
  | 'full_kit';

export type AchievementDef = {
  id: AchievementId;
  name: string;
  desc: string;
  credits: number;
  unlockWeapons?: string[];
  unlockPassives?: string[];
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'Kill your first beast.',
    credits: 80,
    unlockWeapons: ['chainhook'],
  },
  {
    id: 'bestiary_5',
    name: 'Trail Scout',
    desc: 'Discover 5 species in the codex.',
    credits: 150,
    unlockWeapons: ['trap'],
  },
  {
    id: 'bestiary_12',
    name: 'Forest Chronicler',
    desc: 'Discover 12 species in the codex.',
    credits: 350,
    unlockWeapons: ['fishingpole'],
  },
  {
    id: 'true_boss',
    name: 'Boss Hunter',
    desc: 'Slay a true night boss.',
    credits: 250,
    unlockWeapons: ['stormflask'],
  },
  {
    id: 'raid_3',
    name: 'Night Watch',
    desc: 'Survive 3 night raids in a single run.',
    credits: 120,
    unlockWeapons: ['flashbomb'],
  },
  {
    id: 'raid_6',
    name: 'Siege Breaker',
    desc: 'Survive 6 night raids in a single run.',
    credits: 280,
    unlockWeapons: ['poisonflask'],
  },
  {
    id: 'win_easy',
    name: 'Dawnwarden',
    desc: 'Clear the Easy win goal (6 nights).',
    credits: 200,
    unlockPassives: ['greed'],
  },
  {
    id: 'win_medium',
    name: 'Nightbreaker',
    desc: 'Clear the Medium win goal (12 nights).',
    credits: 400,
    unlockPassives: ['devil'],
  },
  {
    id: 'win_hard',
    name: 'Forest Sovereign',
    desc: 'Clear the Hard win goal (18 nights).',
    credits: 700,
    unlockPassives: ['angel'],
  },
  {
    id: 'full_kit',
    name: 'Fully Armed',
    desc: 'Equip 5 weapons at once during a run.',
    credits: 180,
    unlockPassives: ['amount'],
  },
];

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>;

/** Credits granted the first time a species is added to the codex. */
export const CODEX_SPECIES_CREDITS = 5;
/** Credits granted the first time a true-boss move is logged. */
export const CODEX_BOSS_MOVE_CREDITS = 3;

/** Weapons gated behind achievements — everything else starts unlocked. */
export const GATED_WEAPONS = new Set(
  ACHIEVEMENTS.flatMap((a) => a.unlockWeapons || []),
);

/** Passives gated behind achievements — everything else starts unlocked. */
export const GATED_PASSIVES = new Set(
  ACHIEVEMENTS.flatMap((a) => a.unlockPassives || []),
);

export function unlockedWeaponsFromAchievements(achievements: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const id of achievements) {
    const def = ACHIEVEMENT_BY_ID[id as AchievementId];
    if (!def?.unlockWeapons) continue;
    for (const w of def.unlockWeapons) out.add(w);
  }
  return out;
}

export function unlockedPassivesFromAchievements(achievements: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const id of achievements) {
    const def = ACHIEVEMENT_BY_ID[id as AchievementId];
    if (!def?.unlockPassives) continue;
    for (const p of def.unlockPassives) out.add(p);
  }
  return out;
}

export function isWeaponUnlocked(weaponId: string, achievements: readonly string[]): boolean {
  if (!GATED_WEAPONS.has(weaponId)) return true;
  return unlockedWeaponsFromAchievements(achievements).has(weaponId);
}

export function isPassiveUnlocked(passiveId: string, achievements: readonly string[]): boolean {
  if (!GATED_PASSIVES.has(passiveId)) return true;
  return unlockedPassivesFromAchievements(achievements).has(passiveId);
}

/** Achievement that unlocks a gated weapon, if any. */
export function achievementUnlockingWeapon(weaponId: string): AchievementDef | null {
  for (const a of ACHIEVEMENTS) {
    if (a.unlockWeapons?.includes(weaponId)) return a;
  }
  return null;
}

/** Achievement that unlocks a gated passive, if any. */
export function achievementUnlockingPassive(passiveId: string): AchievementDef | null {
  for (const a of ACHIEVEMENTS) {
    if (a.unlockPassives?.includes(passiveId)) return a;
  }
  return null;
}

/** Human-readable unlock summary for banners / glossary. */
export function achievementUnlockLabel(def: AchievementDef): string {
  const bits: string[] = [];
  for (const id of def.unlockWeapons || []) bits.push(id);
  for (const id of def.unlockPassives || []) bits.push(id);
  return bits.join(', ');
}
