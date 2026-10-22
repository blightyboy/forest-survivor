/** Density-driven biome bands — spawn tables and ground tint. */

export type BiomeId = 'clearing' | 'woods' | 'pine';

export type BiomeDef = {
  id: BiomeId;
  name: string;
  /** Density lower bound (inclusive). */
  minD: number;
  /** Density upper bound (exclusive, except pine = open). */
  maxD: number;
};

export const BIOMES: BiomeDef[] = [
  { id: 'clearing', name: 'Clearing', minD: 0, maxD: 0.42 },
  { id: 'woods', name: 'Mixed woods', minD: 0.42, maxD: 0.55 },
  { id: 'pine', name: 'Dense pine', minD: 0.55, maxD: 2 },
];

export function biomeFromDensity(d: number): BiomeId {
  if (d < 0.42) return 'clearing';
  if (d < 0.55) return 'woods';
  return 'pine';
}

/** Ambient weight multipliers by biome (keys = species id). */
export const BIOME_SPAWN_WEIGHTS: Record<BiomeId, Partial<Record<string, number>>> = {
  clearing: {
    deer: 1.8,
    sheep: 1.6,
    fox: 1.2,
    rat: 0.7,
    boar: 0.85,
    wolf: 0.55,
    bear: 0.35,
    beaver: 0.9,
  },
  woods: {
    deer: 1,
    fox: 1.1,
    boar: 1.15,
    wolf: 1.05,
    sheep: 1,
    beaver: 1.1,
    rat: 1,
    bear: 0.9,
  },
  pine: {
    wolf: 1.55,
    bear: 1.45,
    boar: 1.2,
    deer: 0.55,
    sheep: 0.45,
    fox: 0.7,
    rat: 0.9,
    beaver: 0.65,
  },
};
