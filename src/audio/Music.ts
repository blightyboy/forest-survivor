/**
 * Looping medieval tavern themes (Web Audio sequencer).
 * Port of legacy/js/music.js — priority: boss > miniboss > game; menu bed off-run.
 */
// @ts-nocheck
import { Audio } from './Audio';

/**
 * Looping medieval tavern MIDI-style themes (Web Audio sequencer).
 * Priority while in a run: boss > miniboss > game. Menu is its own bed.
 */

function midiHz(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

/** Pack a voice track: each entry is [beat, midi, durationBeats, velocity?]. */
function packNotes(rows) {
  return rows.map((r) => ({
    beat: r[0],
    note: r[1],
    dur: r[2],
    vel: r[3] != null ? r[3] : 0.7,
  }));
}

/**
 * Four seamless loops in D Dorian / A minor tavern modes.
 * Lengths are exact bar counts so the wrap has no gap.
 */
const MUSIC_TRACKS = {
  menu: {
    bpm: 92,
    beats: 16,
    voices: {
      // Soft lute arpeggio bed
      lute: {
        type: 'triangle',
        gain: 0.055,
        notes: packNotes([
          [0, 62, 1], [1, 65, 1], [2, 69, 1], [3, 72, 1],
          [4, 74, 1], [5, 72, 1], [6, 69, 1], [7, 65, 1],
          [8, 62, 1], [9, 67, 1], [10, 71, 1], [11, 74, 1],
          [12, 72, 1], [13, 69, 1], [14, 67, 1], [15, 65, 1],
        ]),
      },
      // Warm drone fifths
      drone: {
        type: 'sine',
        gain: 0.035,
        notes: packNotes([
          [0, 50, 8, 0.55], [0, 57, 8, 0.4],
          [8, 50, 8, 0.55], [8, 55, 8, 0.4],
        ]),
      },
      // Light flute melody
      flute: {
        type: 'sine',
        gain: 0.045,
        notes: packNotes([
          [0, 74, 2], [2, 72, 1], [3, 69, 1],
          [4, 71, 2], [6, 72, 2],
          [8, 74, 1.5], [9.5, 76, 0.5], [10, 74, 1], [11, 72, 1],
          [12, 69, 2], [14, 67, 1], [15, 65, 1],
        ]),
      },
    },
  },

  game: {
    bpm: 108,
    beats: 16,
    voices: {
      lute: {
        type: 'triangle',
        gain: 0.05,
        notes: packNotes([
          [0, 57, 0.5], [0.5, 60, 0.5], [1, 64, 0.5], [1.5, 67, 0.5],
          [2, 69, 0.5], [2.5, 67, 0.5], [3, 64, 0.5], [3.5, 60, 0.5],
          [4, 57, 0.5], [4.5, 62, 0.5], [5, 65, 0.5], [5.5, 69, 0.5],
          [6, 67, 0.5], [6.5, 65, 0.5], [7, 62, 0.5], [7.5, 60, 0.5],
          [8, 55, 0.5], [8.5, 59, 0.5], [9, 62, 0.5], [9.5, 67, 0.5],
          [10, 69, 0.5], [10.5, 67, 0.5], [11, 62, 0.5], [11.5, 59, 0.5],
          [12, 57, 0.5], [12.5, 60, 0.5], [13, 64, 0.5], [13.5, 69, 0.5],
          [14, 67, 1], [15, 64, 1],
        ]),
      },
      bass: {
        type: 'triangle',
        gain: 0.07,
        notes: packNotes([
          [0, 38, 2], [2, 38, 1], [3, 45, 1],
          [4, 40, 2], [6, 40, 1], [7, 47, 1],
          [8, 43, 2], [10, 43, 1], [11, 50, 1],
          [12, 38, 2], [14, 36, 1], [15, 38, 1],
        ]),
      },
      melody: {
        type: 'square',
        gain: 0.028,
        notes: packNotes([
          [0, 69, 1], [1, 71, 1], [2, 72, 2],
          [4, 74, 1], [5, 72, 1], [6, 71, 1], [7, 69, 1],
          [8, 67, 2], [10, 69, 1], [11, 71, 1],
          [12, 72, 2], [14, 69, 2],
        ]),
      },
    },
  },

  miniboss: {
    bpm: 126,
    beats: 16,
    voices: {
      lute: {
        type: 'triangle',
        gain: 0.045,
        notes: packNotes([
          [0, 57, 0.5], [0.5, 60, 0.5], [1, 63, 0.5], [1.5, 67, 0.5],
          [2, 60, 0.5], [2.5, 63, 0.5], [3, 67, 0.5], [3.5, 70, 0.5],
          [4, 58, 0.5], [4.5, 62, 0.5], [5, 65, 0.5], [5.5, 68, 0.5],
          [6, 62, 0.5], [6.5, 65, 0.5], [7, 68, 0.5], [7.5, 72, 0.5],
          [8, 57, 0.5], [8.5, 60, 0.5], [9, 63, 0.5], [9.5, 67, 0.5],
          [10, 63, 0.5], [10.5, 67, 0.5], [11, 70, 0.5], [11.5, 75, 0.5],
          [12, 58, 0.5], [12.5, 62, 0.5], [13, 65, 0.5], [13.5, 70, 0.5],
          [14, 68, 0.5], [14.5, 65, 0.5], [15, 62, 0.5], [15.5, 58, 0.5],
        ]),
      },
      bass: {
        type: 'sawtooth',
        gain: 0.045,
        notes: packNotes([
          [0, 33, 1], [1, 33, 1], [2, 40, 1], [3, 33, 1],
          [4, 34, 1], [5, 34, 1], [6, 41, 1], [7, 34, 1],
          [8, 33, 1], [9, 40, 1], [10, 33, 1], [11, 36, 1],
          [12, 34, 1], [13, 41, 1], [14, 34, 1], [15, 31, 1],
        ]),
      },
      horns: {
        type: 'square',
        gain: 0.032,
        notes: packNotes([
          [0, 63, 2], [2, 65, 1], [3, 67, 1],
          [4, 68, 2], [6, 67, 1], [7, 65, 1],
          [8, 63, 1], [9, 67, 1], [10, 70, 2],
          [12, 68, 2], [14, 65, 1], [15, 63, 1],
        ]),
      },
    },
  },

  boss: {
    bpm: 138,
    beats: 16,
    voices: {
      drums: {
        type: 'triangle',
        gain: 0.08,
        notes: packNotes([
          [0, 36, 0.4, 1], [1, 36, 0.25, 0.7], [1.5, 36, 0.25, 0.55],
          [2, 36, 0.4, 1], [3, 31, 0.5, 0.85],
          [4, 36, 0.4, 1], [5, 36, 0.25, 0.7], [5.5, 36, 0.25, 0.55],
          [6, 36, 0.4, 1], [7, 34, 0.5, 0.85],
          [8, 36, 0.4, 1], [9, 36, 0.25, 0.7], [9.5, 36, 0.25, 0.55],
          [10, 36, 0.4, 1], [11, 31, 0.5, 0.85],
          [12, 36, 0.35, 1], [12.5, 36, 0.25, 0.7], [13, 34, 0.35, 0.9],
          [14, 36, 0.4, 1], [15, 28, 0.6, 1],
        ]),
      },
      bass: {
        type: 'sawtooth',
        gain: 0.055,
        notes: packNotes([
          [0, 28, 2], [2, 28, 1], [3, 31, 1],
          [4, 33, 2], [6, 33, 1], [7, 31, 1],
          [8, 28, 2], [10, 26, 1], [11, 28, 1],
          [12, 31, 2], [14, 33, 1], [15, 28, 1],
        ]),
      },
      brass: {
        type: 'square',
        gain: 0.038,
        notes: packNotes([
          [0, 52, 2], [2, 55, 1], [3, 57, 1],
          [4, 58, 2], [6, 57, 1], [7, 55, 1],
          [8, 52, 1], [9, 55, 1], [10, 58, 1], [11, 60, 1],
          [12, 58, 1], [13, 55, 1], [14, 52, 2],
        ]),
      },
      lead: {
        type: 'sawtooth',
        gain: 0.03,
        notes: packNotes([
          [0, 64, 1], [1, 67, 1], [2, 70, 2],
          [4, 69, 1], [5, 67, 1], [6, 64, 1], [7, 62, 1],
          [8, 64, 2], [10, 67, 1], [11, 70, 1],
          [12, 72, 1.5], [13.5, 70, 0.5], [14, 67, 1], [15, 64, 1],
        ]),
      },
    },
  },
};

export const Music = {
  ready: false,
  gain: null,
  filter: null,
  volume: 0.55,
  trackId: null,
  wanted: null,
  nextStepTime: 0,
  step: 0,
  timer: null,

  unlock() {
    // Sound.unlock() (user gesture) creates the shared AudioContext first.
    if (!Audio.getContext() || this.ready) return;
    const c = Audio.getContext();
    this.gain = c.createGain();
    this.gain.gain.value = Audio.muted ? 0 : this.volume;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 4200;
    this.filter.Q.value = 0.7;
    this.gain.connect(this.filter);
    this.filter.connect(c.destination);
    this.ready = true;
    this.nextStepTime = c.currentTime + 0.08;
    this.step = 0;
    this._armTimer();
  },

  setMuted(m) {
    if (!this.gain || !Audio.getContext()) return;
    this.gain.gain.setTargetAtTime(m ? 0 : this.volume, Audio.getContext().currentTime, 0.05);
  },

  /** Music master volume 0–1 (respects global mute). */
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (!this.gain || !Audio.getContext()) return;
    this.gain.gain.setTargetAtTime(Audio.muted ? 0 : this.volume, Audio.getContext().currentTime, 0.05);
  },

  _armTimer() {
    if (this.timer != null) return;
    this.timer = setInterval(() => this._tick(), 25);
  },

  /**
   * Choose theme from game state. Priority: boss > miniboss > game.
   * Phaser: pass `{ state: 'menu'|'gameover'|'playing', animals }`.
   */
  sync(game: {
    state: string;
    animals?: { dead?: boolean; boss?: boolean; trueBoss?: boolean }[];
    activeBoss?: { dead?: boolean; trueBoss?: boolean } | null;
  }) {
    this.unlock();
    if (!this.ready) return;
    let id = 'menu';
    const st = game.state;
    if (st === 'menu' || st === 'gameover') {
      id = 'menu';
    } else {
      let trueBoss = false;
      let anyBoss = false;
      if (game.activeBoss && !game.activeBoss.dead) {
        trueBoss = !!game.activeBoss.trueBoss;
        anyBoss = true;
      }
      const list = game.animals || [];
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.dead || !a.boss) continue;
        anyBoss = true;
        if (a.trueBoss) trueBoss = true;
      }
      if (trueBoss) id = 'boss';
      else if (anyBoss) id = 'miniboss';
      else id = 'game';
    }
    this.wanted = id;
    if (this.trackId !== id) this._switch(id);
  },

  _switch(id) {
    const c = Audio.getContext();
    if (!c || !MUSIC_TRACKS[id]) return;
    // Soft duck then resume so transitions aren't harsh; loops themselves stay seamless.
    const now = c.currentTime;
    const g = this.gain.gain;
    g.cancelScheduledValues(now);
    const cur = Audio.muted ? 0 : this.volume;
    g.setValueAtTime(Math.max(0.0001, g.value || cur), now);
    g.linearRampToValueAtTime(0.0001, now + 0.28);
    g.linearRampToValueAtTime(cur, now + 0.55);
    this.trackId = id;
    this.step = 0;
    this.nextStepTime = now + 0.3;
  },

  _tick() {
    if (!this.ready || !Audio.getContext() || !this.trackId) return;
    if (Audio.getContext().state !== 'running') return;
    const track = MUSIC_TRACKS[this.trackId];
    if (!track) return;
    const c = Audio.getContext();
    const secPerBeat = 60 / track.bpm;
    const secPerStep = secPerBeat * 0.25;
    const steps = track.beats * 4;
    const horizon = c.currentTime + 0.12;
    while (this.nextStepTime < horizon) {
      this._scheduleStep(track, this.step, this.nextStepTime, secPerBeat);
      this.step++;
      if (this.step >= steps) this.step = 0;
      this.nextStepTime += secPerStep;
    }
  },

  _scheduleStep(track, step, time, secPerBeat) {
    const beat = step * 0.25;
    const eps = 0.001;
    for (const name in track.voices) {
      const voice = track.voices[name];
      for (let i = 0; i < voice.notes.length; i++) {
        const n = voice.notes[i];
        if (Math.abs(n.beat - beat) > eps) continue;
        this._note(voice.type, n.note, time, n.dur * secPerBeat, voice.gain * n.vel);
      }
    }
  },

  _note(type, midi, t, dur, vol) {
    const c = Audio.getContext();
    if (!c || !this.gain || vol < 0.001) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    const f = midiHz(midi);
    osc.frequency.setValueAtTime(f, t);
    // Tiny pitch settle for lute-ish feel
    if (type === 'triangle') {
      osc.frequency.setValueAtTime(f * 1.01, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.04, dur * 0.2));
    }
    const peak = Math.max(0.0001, vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.7, t + Math.max(0.04, dur * 0.45));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  },
};

