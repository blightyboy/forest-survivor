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

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setSfxMuted(m: boolean) {
    this.sfxMuted = m;
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

  private canPlay(name: string) {
    if (!this.ctx || this.muted || this.sfxMuted || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed[name];
    if (last !== undefined && now - last < 0.035) return false;
    this.lastPlayed[name] = now;
    return true;
  }

  play(name: string, pitch = 1) {
    if (!this.canPlay(name)) return;
    switch (name) {
      case 'chop':
        this.noise(0.07, { vol: 0.35, freq: 1100 * pitch, q: 1.5 });
        this.tone(190 * pitch, 0.09, { type: 'triangle', vol: 0.28, slide: 95 * pitch });
        break;
      case 'hit':
        this.tone(240 * pitch, 0.1, { type: 'square', vol: 0.09, slide: 110 });
        this.noise(0.06, { vol: 0.22, freq: 1800 });
        break;
      case 'levelup':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone(f, 0.2, { type: 'triangle', vol: 0.16, delay: i * 0.07 }),
        );
        break;
      case 'buy':
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.06 }),
        );
        break;
      case 'raid':
        this.tone(147, 0.9, { type: 'sawtooth', vol: 0.09, slide: 140 });
        this.tone(220, 0.9, { type: 'sawtooth', vol: 0.06, slide: 210 });
        break;
      default:
        this.tone(440 * pitch, 0.06, { type: 'sine', vol: 0.08 });
        break;
    }
  }

  playSfx(name: 'chop' | 'hit' | 'levelup' | 'buy' | 'raid', pitch = 1) {
    this.play(name, pitch);
  }
}

export const Audio = new AudioManager();
