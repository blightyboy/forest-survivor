/**
 * Spotlight coach steps — pause the run, highlight a HUD target, explain briefly.
 * Order is not fixed; each fires once when its trigger hits (see RunScene).
 */
export type CoachPrepare = 'camp' | 'smith' | null;

export type CoachStep = {
  id: string;
  title: string;
  /** Short body — keep to a few lines; spotlight cards are compact. */
  body: string;
  /** Vanilla (no camp) alternate copy — omits cabin / yard wording. */
  titleNoCamp?: string;
  bodyNoCamp?: string;
  /** data-coach attribute value on a HUD / panel element. */
  target?: string;
  prepare?: CoachPrepare;
};

export const COACH_STEPS: Record<string, CoachStep> = {
  controls: {
    id: 'controls',
    title: 'Moving around',
    body:
      '<p><b>WASD</b> or the stick to move. <b>Shift</b> or <b>Space</b> to dash — you have limited charges.</p>' +
      '<p><b>F</b> locks aim on the nearest foe. Weapons fire on their own — you steer and dodge.</p>',
    target: 'controls',
  },
  xp: {
    id: 'xp',
    title: 'Experience',
    body:
      '<p>Beasts drop <b>XP shards</b>. Fill this bar to level up and pick a new weapon, passive, or bonus.</p>' +
      '<p>Each level also raises your <b>max HP</b>.</p>',
    target: 'xp',
  },
  resources: {
    id: 'resources',
    title: 'Resources',
    body:
      '<p><b>Wood</b> from trees, <b>meat</b> from beasts, <b>gold</b> from ores and lucky kills.</p>' +
      '<p>Spend them at camp to build defenses, production, and gear.</p>',
    bodyNoCamp:
      '<p><b>Wood</b> from trees, <b>meat</b> from beasts, <b>gold</b> from ores and lucky kills.</p>' +
      '<p>In Vanilla, beasts and wagons drop <b>XP only</b> — stay alive and level up.</p>',
    target: 'resources',
  },
  enemy: {
    id: 'enemy',
    title: 'Know your beasts',
    body:
      '<p><b>Stars</b> = veterancy (tougher, better loot, more elemental moves). <b>Colored orbs</b> = elements.</p>' +
      '<p><b>Dire / Necro / Demonic</b> variants hit harder — necro splits on death, demonic leaves fire.</p>',
    /** World-space spotlight on the first beast the player hit (see DomUI.onCoachWorldRect). */
    target: 'hitBeast',
  },
  loadout: {
    id: 'loadout',
    title: 'Your arsenal',
    body:
      '<p>Weapons and passives live here. Hover a slot for stats.</p>' +
      '<p>Max a weapon and infuse an <b>element</b> to awaken a unique form.</p>',
    target: 'loadout',
  },
  build: {
    id: 'build',
    title: 'Fortify the camp',
    body:
      '<p>You can afford a upgrade. Open <b>Camp</b> (<b>U</b>) while standing in the yard.</p>' +
      '<p><b>Palisades</b> block raiders. <b>Towers</b> shoot for you. If the cabin falls, the run ends.</p>',
    target: 'campBtn',
    prepare: 'camp',
  },
  smith: {
    id: 'smith',
    title: 'Blacksmith',
    body:
      '<p>The forge is open — switch to the <b>Smith</b> tab at camp.</p>' +
      '<p>Each item fills one slot and <b>replaces</b> whatever was there. Hover shop rows to compare.</p>',
    target: 'smithTab',
    prepare: 'smith',
  },
  firstNight: {
    id: 'firstNight',
    title: 'Night is coming',
    body:
      '<p>Get back to camp before dark. Raiders march from the forest edge.</p>' +
      '<p>A <b>miniboss</b> leads most nights; every <b>3rd night</b> a true boss arrives.</p>',
    bodyNoCamp:
      '<p>Raiders hunt <b>you</b> from the forest edge after dark.</p>' +
      '<p>A <b>miniboss</b> leads most nights; every <b>3rd night</b> a true boss arrives.</p>',
    target: 'time',
  },
  threat: {
    id: 'threat',
    title: 'Rising threat',
    body:
      '<p>Threat climbs with time — beasts gain HP, damage, and veterancy stars.</p>' +
      '<p>Push farther for richer loot, or stay near camp when nights get ugly.</p>',
    bodyNoCamp:
      '<p>Threat climbs with time — beasts gain HP, damage, and veterancy stars.</p>' +
      '<p>Push farther for richer XP, or play safe when nights get ugly.</p>',
    target: 'threat',
  },
  levelup: {
    id: 'levelup',
    title: 'Level up!',
    body:
      '<p>Pick one card: a <b>weapon</b>, <b>passive</b>, <b>element</b>, or <b>bonus</b>.</p>' +
      '<p>You can <b>reroll</b> or <b>banish</b> options — both are limited per run.</p>',
    target: 'xp',
  },
  dash: {
    id: 'dash',
    title: 'Dash charges',
    body:
      '<p>The segments under your feet are <b>dash charges</b>. They refill over time.</p>' +
      '<p>Dash through packs and lunges — you are briefly invulnerable while lunging.</p>',
    /** World-space spotlight on the player's dash bar (see DomUI.onCoachWorldRect). */
    target: 'playerDash',
  },
};

export const COACH_IDS = Object.keys(COACH_STEPS) as (keyof typeof COACH_STEPS)[];
