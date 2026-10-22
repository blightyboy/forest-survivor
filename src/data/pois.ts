/** World points of interest — one-shot interactables; reshuffled every dawn. */

export const POI_KINDS = ['den', 'wagon', 'shrine', 'vein'] as const;
export type PoiKind = (typeof POI_KINDS)[number];

export type PoiDef = {
  kind: PoiKind;
  name: string;
  hint: string;
  color: string;
  /** Texture key baked in bakeTextures. */
  tex: string;
};

export const POI_DEFS: Record<PoiKind, PoiDef> = {
  den: {
    kind: 'den',
    name: 'Beast Den',
    hint: 'Elite pack nearby',
    color: '#ff7a5c',
    tex: 'poi_den',
  },
  wagon: {
    kind: 'wagon',
    name: 'Supply Wagon',
    hint: 'Wood, meat, gold',
    color: '#ffe08a',
    tex: 'poi_wagon',
  },
  shrine: {
    kind: 'shrine',
    name: 'Forest Shrine',
    hint: 'Blessing of the woods',
    color: '#a8e6ff',
    tex: 'poi_shrine',
  },
  vein: {
    kind: 'vein',
    name: 'Rich Vein',
    hint: 'Gold chunks',
    color: '#ffd54a',
    tex: 'poi_vein',
  },
};

export type WorldPoi = {
  id: number;
  kind: PoiKind;
  x: number;
  y: number;
  used: boolean;
};

/** Interact / prompt radius in world pixels (camp-scale landmarks). */
export const POI_INTERACT_R = 110;
/** Show the E prompt when this close (slightly larger than interact). */
export const POI_PROMPT_R = 140;
