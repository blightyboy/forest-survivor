/** Meta achievements — one-shot credit rewards unlocked across runs. */

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
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'Kill your first beast.',
    credits: 8,
  },
  {
    id: 'bestiary_5',
    name: 'Trail Scout',
    desc: 'Discover 5 species in the codex.',
    credits: 15,
  },
  {
    id: 'bestiary_12',
    name: 'Forest Chronicler',
    desc: 'Discover 12 species in the codex.',
    credits: 35,
  },
  {
    id: 'true_boss',
    name: 'Boss Hunter',
    desc: 'Slay a true night boss.',
    credits: 25,
  },
  {
    id: 'raid_3',
    name: 'Night Watch',
    desc: 'Survive 3 night raids in a single run.',
    credits: 12,
  },
  {
    id: 'raid_6',
    name: 'Siege Breaker',
    desc: 'Survive 6 night raids in a single run.',
    credits: 28,
  },
  {
    id: 'win_easy',
    name: 'Dawnwarden',
    desc: 'Clear the Easy win goal (6 nights).',
    credits: 20,
  },
  {
    id: 'win_medium',
    name: 'Nightbreaker',
    desc: 'Clear the Medium win goal (12 nights).',
    credits: 40,
  },
  {
    id: 'win_hard',
    name: 'Forest Sovereign',
    desc: 'Clear the Hard win goal (18 nights).',
    credits: 70,
  },
  {
    id: 'full_kit',
    name: 'Fully Armed',
    desc: 'Equip 5 weapons at once during a run.',
    credits: 18,
  },
];

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>;

/** Credits granted the first time a species is added to the codex. */
export const CODEX_SPECIES_CREDITS = 5;
/** Credits granted the first time a true-boss move is logged. */
export const CODEX_BOSS_MOVE_CREDITS = 3;
