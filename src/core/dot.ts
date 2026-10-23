/** Shared damage-over-time: ticks on an interval; one active dose per list (unique per type). */

export const DOT_INTERVAL = 3;

export type DotStack = {
  /** Damage dealt each tick. */
  tickDmg: number;
  /** Seconds remaining. */
  life: number;
  /** Seconds until the next tick. */
  nextTick: number;
};

/**
 * Apply a DoT dose. Each list is one type (burn / poison) — reapplying refreshes
 * duration and keeps the stronger tick; it never stacks with another type's list.
 */
export function applyDot(list: DotStack[], tickDmg: number, duration: number) {
  const dmg = Math.max(1, Math.round(tickDmg));
  const dur = Math.max(DOT_INTERVAL * 0.5, duration);
  if (!list.length || list[0].life <= 0) {
    list.length = 0;
    list.push({ tickDmg: dmg, life: dur, nextTick: DOT_INTERVAL });
    return;
  }
  const d = list[0];
  d.tickDmg = Math.max(d.tickDmg, dmg);
  d.life = Math.max(d.life, dur);
  list.length = 1;
}

/** Advance DoTs; returns total damage from ticks that fired this frame. */
export function tickDots(list: DotStack[], dt: number): number {
  let dealt = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.life -= dt;
    d.nextTick -= dt;
    while (d.nextTick <= 0) {
      dealt += d.tickDmg;
      d.nextTick += DOT_INTERVAL;
      if (d.life <= 0) break;
    }
    if (d.life <= 0) list.splice(i, 1);
  }
  return dealt;
}

/** Longest remaining DoT life (for HUD chips). */
export function maxDotLife(list: DotStack[]): number {
  let m = 0;
  for (const d of list) m = Math.max(m, d.life);
  return m;
}
