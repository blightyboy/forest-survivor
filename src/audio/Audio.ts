/**
 * Port of legacy/js/audio.js — tiny Web Audio synth.
 * Nothing is created until `unlock()` runs from a user gesture.
 *
 * Master gain = SFX only. Music uses a separate bus (see Music.ts).
 */

export type SfxName =
  | 'chop'
  | 'treeFall'
  | 'hit'
  | 'boarDie'
  | 'grunt'
  | 'ore'
  | 'pickup'
  | 'gold'
  | 'upgrade'
  | 'buy'
  | 'levelup'
  | 'hurt'
  | 'eat'
  | 'deny'
  | 'death'
  | 'click'
  | 'horn'
  | 'raid'
  | 'howl'
  | 'growl'
  | 'roar'
  | 'bow'
  | 'build'
  | 'throw'
  | 'boom'
  | 'chitter'
  | 'xp';

type ToneOpts = {
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  delay?: number;
};

type NoiseOpts = {
  vol?: number;
  freq?: number;
  q?: number;
  filter?: BiquadFilterType;
  delay?: number;
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;
  sfxMuted = false;
  volume = 0.32;
  private lastPlayed: Record<string, number> = Object.create(null);

  /** Shared Web Audio context (Music unlocks against this). */
  getContext() {
    return this.ctx;
  }

  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted || this.sfxMuted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // Lazy import avoids circular init: Music → Audio → Music.
    void import('./Music').then(({ Music }) => Music.unlock());
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m || this.sfxMuted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
    void import('./Music').then(({ Music }) => Music.setMuted(m));
  }

  setSfxMuted(m: boolean) {
    this.sfxMuted = m;
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  /** SFX master volume 0–1 (legacy Sound volume). */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.master && this.ctx && !this.muted && !this.sfxMuted) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  private tone(freq: number, dur: number, opts: ToneOpts = {}) {
    const c = this.ctx!;
    const t = c.currentTime + (opts.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    const vol = opts.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private noise(dur: number, opts: NoiseOpts = {}) {
    const c = this.ctx!;
    const t = c.currentTime + (opts.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf!;
    const filter = c.createBiquadFilter();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.value = opts.freq ?? 1200;
    filter.Q.value = opts.q ?? 1;
    const g = c.createGain();
    const vol = opts.vol ?? 0.2;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.03);
  }

  /**
   * Schedule start time for a voice. Same-frame / rapid repeats stagger by
   * `minGap` instead of being dropped (axe hitting several trees at once).
   */
  private scheduleVoice(name: string, minGap = 0.028): number | null {
    if (!this.ctx || this.muted || this.sfxMuted || this.ctx.state !== 'running') return null;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed[name];
    let delay = 0;
    if (last !== undefined && now < last + minGap) {
      delay = last + minGap - now;
      if (delay > 0.18) return null;
    }
    this.lastPlayed[name] = now + delay;
    return delay;
  }

  play(name: SfxName | string, pitch = 1) {
    // 'buy' / 'raid' are aliases used by the Phaser port.
    const id = name === 'buy' ? 'upgrade' : name === 'raid' ? 'horn' : name;
    const delay = this.scheduleVoice(id);
    if (delay == null) return;

    switch (id) {
      case 'chop':
        this.noise(0.07, { vol: 0.35, freq: 1100 * pitch, q: 1.5, delay });
        this.tone(190 * pitch, 0.09, { type: 'triangle', vol: 0.28, slide: 95 * pitch, delay });
        break;
      case 'treeFall':
        this.noise(0.4, { vol: 0.3, freq: 500, filter: 'lowpass', delay });
        this.tone(120, 0.35, { type: 'triangle', vol: 0.3, slide: 45, delay });
        break;
      case 'hit':
        this.tone(240 * pitch, 0.1, { type: 'square', vol: 0.09, slide: 110, delay });
        this.noise(0.06, { vol: 0.22, freq: 1800, delay });
        break;
      case 'boarDie':
        this.tone(320 * pitch, 0.3, { type: 'sawtooth', vol: 0.1, slide: 70, delay });
        this.noise(0.22, { vol: 0.2, freq: 600, delay });
        break;
      case 'grunt':
        this.tone(130 * pitch, 0.2, { type: 'sawtooth', vol: 0.07, slide: 85, delay });
        break;
      case 'ore':
        this.tone(950 * pitch, 0.08, { type: 'square', vol: 0.06, slide: 700, delay });
        this.noise(0.05, { vol: 0.2, freq: 3200, q: 2, delay });
        break;
      case 'pickup':
        this.tone(620 * pitch, 0.08, { type: 'sine', vol: 0.16, slide: 940 * pitch, delay });
        break;
      case 'gold':
        this.tone(1250, 0.06, { type: 'square', vol: 0.05, delay });
        this.tone(1680, 0.12, { type: 'square', vol: 0.05, delay: delay + 0.05 });
        break;
      case 'upgrade':
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: delay + i * 0.06 }),
        );
        break;
      case 'levelup':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone(f, 0.2, { type: 'triangle', vol: 0.16, delay: delay + i * 0.07 }),
        );
        break;
      case 'hurt':
        this.tone(220, 0.25, { type: 'sawtooth', vol: 0.16, slide: 70, delay });
        this.noise(0.12, { vol: 0.25, freq: 500, delay });
        break;
      case 'eat':
        this.noise(0.08, { vol: 0.25, freq: 1600, q: 3, delay });
        this.noise(0.08, { vol: 0.25, freq: 1300, q: 3, delay: delay + 0.11 });
        this.tone(500, 0.12, { type: 'sine', vol: 0.12, slide: 800, delay: delay + 0.2 });
        break;
      case 'deny':
        this.tone(170, 0.14, { type: 'square', vol: 0.08, slide: 120, delay });
        break;
      case 'death':
        this.tone(330, 1.0, { type: 'sawtooth', vol: 0.18, slide: 40, delay });
        this.noise(0.6, { vol: 0.2, freq: 300, filter: 'lowpass', delay });
        break;
      case 'click':
        this.tone(800, 0.04, { type: 'sine', vol: 0.08, delay });
        break;
      case 'horn':
        this.tone(147, 0.9, { type: 'sawtooth', vol: 0.09, slide: 140, delay });
        this.tone(220, 0.9, { type: 'sawtooth', vol: 0.06, slide: 210, delay });
        break;
      case 'howl':
        this.tone(420 * pitch, 0.5, { type: 'sine', vol: 0.12, slide: 760 * pitch, delay });
        this.tone(760 * pitch, 0.9, { type: 'sine', vol: 0.1, slide: 380 * pitch, delay: delay + 0.5 });
        break;
      case 'growl':
        this.tone(95, 0.3, { type: 'sawtooth', vol: 0.08, slide: 70, delay });
        this.noise(0.25, { vol: 0.1, freq: 300, filter: 'lowpass', delay });
        break;
      case 'roar':
        this.tone(110 * pitch, 0.5, { type: 'sawtooth', vol: 0.12, slide: 55, delay });
        this.noise(0.45, { vol: 0.2 * pitch, freq: 350, filter: 'lowpass', delay });
        break;
      case 'bow':
        this.noise(0.06, { vol: 0.12, freq: 2600 * pitch, q: 2, delay });
        this.tone(520 * pitch, 0.06, { type: 'triangle', vol: 0.05, slide: 300 * pitch, delay });
        break;
      case 'build':
        for (let i = 0; i < 3; i++) {
          this.noise(0.05, { vol: 0.3, freq: 900, q: 2, delay: delay + i * 0.12 });
          this.tone(260, 0.06, { type: 'square', vol: 0.06, slide: 180, delay: delay + i * 0.12 });
        }
        break;
      case 'throw':
        this.noise(0.05, { vol: 0.16, freq: 1800 * pitch, q: 1.4, delay });
        this.tone(380 * pitch, 0.08, { type: 'triangle', vol: 0.08, slide: 220 * pitch, delay });
        break;
      case 'boom': {
        const deep = pitch < 1;
        this.noise(deep ? 0.42 : 0.28, {
          vol: deep ? 0.4 : 0.32,
          freq: deep ? 220 : 280,
          filter: 'lowpass',
          delay,
        });
        this.tone(
          (deep ? 70 : 90) * pitch,
          deep ? 0.4 : 0.28,
          { type: 'sawtooth', vol: deep ? 0.18 : 0.14, slide: deep ? 28 : 40, delay },
        );
        if (deep) {
          this.tone(48, 0.35, { type: 'sine', vol: 0.12, slide: 22, delay });
          this.noise(0.18, { vol: 0.14, freq: 900, filter: 'bandpass', delay: delay + 0.04 });
        }
        break;
      }
      case 'chitter':
        this.tone(780, 0.07, { type: 'square', vol: 0.05, slide: 1100, delay });
        this.tone(920, 0.08, { type: 'square', vol: 0.04, slide: 600, delay: delay + 0.06 });
        this.tone(1100, 0.06, { type: 'square', vol: 0.04, slide: 700, delay: delay + 0.12 });
        break;
      case 'xp':
        this.tone(880 * pitch, 0.07, { type: 'sine', vol: 0.1, slide: 1400 * pitch, delay });
        break;
      default:
        this.tone(440 * pitch, 0.06, { type: 'sine', vol: 0.08, delay });
        break;
    }
  }

  /** Typed alias used throughout systems. */
  playSfx(name: SfxName, pitch = 1) {
    this.play(name, pitch);
  }
}

export const Audio = new AudioManager();
