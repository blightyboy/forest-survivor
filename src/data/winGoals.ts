/** Optional finish-line goals — survive N nights + gauntlet for badge + bonus credits. */

export const WIN_GOAL_IDS = ['none', 'easy', 'medium', 'hard'] as const;
export type WinGoalId = (typeof WIN_GOAL_IDS)[number];

export type WinGoalDef = {
  id: WinGoalId;
  name: string;
  /** Survive this many nights to win (0 = endless). */
  nights: number;
  desc: string;
  color: string;
  /** Flat bonus credits on victory (on top of normal run payout). */
  creditBonus: number;
  badge: string;
};

export const WIN_GOALS: WinGoalDef[] = [
  {
    id: 'none',
    name: 'Endless',
    nights: 0,
    desc: 'No finish line — survive as long as you can',
    color: '#c8b8a0',
    creditBonus: 0,
    badge: '',
  },
  {
    id: 'easy',
    name: 'Easy',
    nights: 6,
    desc: 'Survive 6 nights · final gauntlet',
    color: '#9ef08a',
    creditBonus: 90,
    badge: 'Dawnwarden',
  },
  {
    id: 'medium',
    name: 'Medium',
    nights: 12,
    desc: 'Survive 12 nights · final gauntlet',
    color: '#ffe08a',
    creditBonus: 220,
    badge: 'Nightbreaker',
  },
  {
    id: 'hard',
    name: 'Hard',
    nights: 18,
    desc: 'Survive 18 nights · final gauntlet',
    color: '#ff7a5c',
    creditBonus: 480,
    badge: 'Forest Sovereign',
  },
];

export const WIN_GOAL_BY_ID: Record<WinGoalId, WinGoalDef> = Object.fromEntries(
  WIN_GOALS.map((g) => [g.id, g]),
) as Record<WinGoalId, WinGoalDef>;

export function normalizeWinGoal(raw: unknown): WinGoalId {
  if (typeof raw === 'string' && (WIN_GOAL_IDS as readonly string[]).includes(raw)) {
    return raw as WinGoalId;
  }
  return 'none';
}

export function winGoalNights(id: WinGoalId): number {
  return WIN_GOAL_BY_ID[id]?.nights || 0;
}
