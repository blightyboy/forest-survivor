/** Selectable run modifiers — stackable toggles from the main menu. */

export const MUTATOR_IDS = ['savage', 'noGrace', 'glass', 'siege', 'scarcity'] as const;
export type MutatorId = (typeof MUTATOR_IDS)[number];

export type MutatorDef = {
  id: MutatorId;
  name: string;
  desc: string;
  color: string;
};

export const MUTATORS: MutatorDef[] = [
  {
    id: 'savage',
    name: 'Savage',
    desc: 'Threat ×1.35 · +25% credits',
    color: '#ff7a5c',
  },
  {
    id: 'noGrace',
    name: 'No Grace',
    desc: 'Opening calm skipped',
    color: '#c8b8a0',
  },
  {
    id: 'glass',
    name: 'Glass',
    desc: 'Max HP ×0.7 · damage ×1.15',
    color: '#7fd3ff',
  },
  {
    id: 'siege',
    name: 'Siege',
    desc: 'Faster, larger daytime assaults',
    color: '#ff9a6b',
  },
  {
    id: 'scarcity',
    name: 'Scarcity',
    desc: 'Loot ×0.7 · thinner smith stock',
    color: '#ffe08a',
  },
];

export const MUTATOR_BY_ID: Record<MutatorId, MutatorDef> = Object.fromEntries(
  MUTATORS.map((m) => [m.id, m]),
) as Record<MutatorId, MutatorDef>;

export type MutatorEffects = {
  ids: MutatorId[];
  threatMult: number;
  creditMult: number;
  graceSec: number;
  playerHpMult: number;
  playerDmgMult: number;
  siegeWaveMult: number;
  siegeTimerMult: number;
  lootMult: number;
  shopCountMult: number;
};

export function normalizeMutatorIds(raw: unknown): MutatorId[] {
  if (!Array.isArray(raw)) return [];
  const out: MutatorId[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    if ((MUTATOR_IDS as readonly string[]).includes(v) && !out.includes(v as MutatorId)) {
      out.push(v as MutatorId);
    }
  }
  return out;
}

export function computeMutatorEffects(ids: MutatorId[], baseGrace: number): MutatorEffects {
  const set = new Set(ids);
  return {
    ids,
    threatMult: set.has('savage') ? 1.35 : 1,
    creditMult: set.has('savage') ? 1.25 : 1,
    graceSec: set.has('noGrace') ? 0 : baseGrace,
    playerHpMult: set.has('glass') ? 0.7 : 1,
    playerDmgMult: set.has('glass') ? 1.15 : 1,
    siegeWaveMult: set.has('siege') ? 1.35 : 1,
    siegeTimerMult: set.has('siege') ? 0.65 : 1,
    lootMult: set.has('scarcity') ? 0.7 : 1,
    shopCountMult: set.has('scarcity') ? 0.65 : 1,
  };
}

export function mutatorLabelList(ids: MutatorId[]): string {
  if (!ids.length) return '';
  return ids.map((id) => MUTATOR_BY_ID[id]?.name || id).join(' · ');
}
