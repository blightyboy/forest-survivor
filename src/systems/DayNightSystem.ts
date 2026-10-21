import {
  DAY_LENGTH,
  CLOCK_OFFSET,
  PHASE_DUSK,
  PHASE_NIGHT,
  PHASE_DAWN,
  NIGHT_DARKNESS,
} from '../data/constants';
import { clamp } from '../core/math';

export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';

export class DayNightSystem {
  /** Seconds elapsed in the current run (game time). */
  runTime = 0;
  /** 0..1 position within the current day cycle. */
  clock = 0;
  dayNumber = 1;
  phase: DayPhase = 'day';
  darkness = 0;

  get isNight() {
    return this.phase === 'night' || this.phase === 'dusk';
  }

  update(dt: number) {
    const prevPhase = this.phase;
    const prevDay = this.dayNumber;
    this.runTime += dt;
    const cycle = ((this.runTime + CLOCK_OFFSET) % DAY_LENGTH) / DAY_LENGTH;
    this.clock = cycle;
    this.dayNumber = 1 + Math.floor((this.runTime + CLOCK_OFFSET) / DAY_LENGTH);

    if (cycle < PHASE_DUSK) this.phase = 'day';
    else if (cycle < PHASE_NIGHT) this.phase = 'dusk';
    else if (cycle < PHASE_DAWN) this.phase = 'night';
    else this.phase = 'dawn';

    let dark = 0;
    if (this.phase === 'dusk') {
      const t = (cycle - PHASE_DUSK) / (PHASE_NIGHT - PHASE_DUSK);
      dark = t * NIGHT_DARKNESS;
    } else if (this.phase === 'night') {
      dark = NIGHT_DARKNESS;
    } else if (this.phase === 'dawn') {
      const t = (cycle - PHASE_DAWN) / (1 - PHASE_DAWN);
      dark = (1 - t) * NIGHT_DARKNESS;
    }
    this.darkness = clamp(dark, 0, NIGHT_DARKNESS);
    const wasNightLike = prevPhase === 'night' || prevPhase === 'dusk';
    const nowDayLike = this.phase === 'day' || this.phase === 'dawn';
    const leftNight = wasNightLike && nowDayLike && this.dayNumber === prevDay;
    return {
      newDay: this.dayNumber > prevDay,
      enteredNight: this.phase === 'night' && cycle < PHASE_NIGHT + 0.02,
      leftNight,
      dawn: this.phase === 'dawn',
    };
  }

  formatClock() {
    const hours = Math.floor(this.clock * 24);
    const mins = Math.floor((this.clock * 24 - hours) * 60);
    return `Day ${this.dayNumber} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
