'use strict';

/**
 * Tiny Web Audio synth. Nothing is created until `unlock()` runs from a user
 * gesture, so browsers never block or warn about autoplay.
 */
const Sound = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  volume: 0.32,
  lastPlayed: Object.create(null),

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.02);
  },

  tone(freq, dur, opts = {}) {
    const c = this.ctx;
    const t = c.currentTime + (opts.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    const vol = opts.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  },

  noise(dur, opts = {}) {
    const c = this.ctx;
    const t = c.currentTime + (opts.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = c.createBiquadFilter();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.value = opts.freq || 1200;
    filter.Q.value = opts.q || 1;
    const g = c.createGain();
    const vol = opts.vol || 0.2;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.03);
  },

  play(name, pitch = 1) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed[name];
    if (last !== undefined && now - last < 0.035) return;
    this.lastPlayed[name] = now;

    switch (name) {
      case 'chop':
        this.noise(0.07, { vol: 0.35, freq: 1100 * pitch, q: 1.5 });
        this.tone(190 * pitch, 0.09, { type: 'triangle', vol: 0.28, slide: 95 * pitch });
        break;
      case 'treeFall':
        this.noise(0.4, { vol: 0.3, freq: 500, filter: 'lowpass' });
        this.tone(120, 0.35, { type: 'triangle', vol: 0.3, slide: 45 });
        break;
      case 'hit':
        this.tone(240 * pitch, 0.1, { type: 'square', vol: 0.09, slide: 110 });
        this.noise(0.06, { vol: 0.22, freq: 1800 });
        break;
      case 'boarDie':
        this.tone(320, 0.3, { type: 'sawtooth', vol: 0.1, slide: 70 });
        this.noise(0.22, { vol: 0.2, freq: 600 });
        break;
      case 'grunt':
        this.tone(130, 0.2, { type: 'sawtooth', vol: 0.07, slide: 85 });
        break;
      case 'ore':
        this.tone(950 * pitch, 0.08, { type: 'square', vol: 0.06, slide: 700 });
        this.noise(0.05, { vol: 0.2, freq: 3200, q: 2 });
        break;
      case 'pickup':
        this.tone(620 * pitch, 0.08, { type: 'sine', vol: 0.16, slide: 940 * pitch });
        break;
      case 'gold':
        this.tone(1250, 0.06, { type: 'square', vol: 0.05 });
        this.tone(1680, 0.12, { type: 'square', vol: 0.05, delay: 0.05 });
        break;
      case 'upgrade':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.06 }));
        break;
      case 'levelup':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.16, delay: i * 0.07 }));
        break;
      case 'hurt':
        this.tone(220, 0.25, { type: 'sawtooth', vol: 0.16, slide: 70 });
        this.noise(0.12, { vol: 0.25, freq: 500 });
        break;
      case 'eat':
        this.noise(0.08, { vol: 0.25, freq: 1600, q: 3 });
        this.noise(0.08, { vol: 0.25, freq: 1300, q: 3, delay: 0.11 });
        this.tone(500, 0.12, { type: 'sine', vol: 0.12, slide: 800, delay: 0.2 });
        break;
      case 'deny':
        this.tone(170, 0.14, { type: 'square', vol: 0.08, slide: 120 });
        break;
      case 'death':
        this.tone(330, 1.0, { type: 'sawtooth', vol: 0.18, slide: 40 });
        this.noise(0.6, { vol: 0.2, freq: 300, filter: 'lowpass' });
        break;
      case 'click':
        this.tone(800, 0.04, { type: 'sine', vol: 0.08 });
        break;
      case 'horn':
        this.tone(147, 0.9, { type: 'sawtooth', vol: 0.09, slide: 140 });
        this.tone(220, 0.9, { type: 'sawtooth', vol: 0.06, slide: 210 });
        break;
      case 'howl':
        this.tone(420, 0.5, { type: 'sine', vol: 0.12, slide: 760 });
        this.tone(760, 0.9, { type: 'sine', vol: 0.1, slide: 380, delay: 0.5 });
        break;
      case 'growl':
        this.tone(95, 0.3, { type: 'sawtooth', vol: 0.08, slide: 70 });
        this.noise(0.25, { vol: 0.1, freq: 300, filter: 'lowpass' });
        break;
      case 'roar':
        this.tone(110, 0.5, { type: 'sawtooth', vol: 0.12, slide: 55 });
        this.noise(0.45, { vol: 0.2, freq: 350, filter: 'lowpass' });
        break;
      case 'bow':
        this.noise(0.06, { vol: 0.12, freq: 2600, q: 2 });
        this.tone(520, 0.06, { type: 'triangle', vol: 0.05, slide: 300 });
        break;
      case 'build':
        for (let i = 0; i < 3; i++) {
          this.noise(0.05, { vol: 0.3, freq: 900, q: 2, delay: i * 0.12 });
          this.tone(260, 0.06, { type: 'square', vol: 0.06, slide: 180, delay: i * 0.12 });
        }
        break;
      case 'throw':
        this.noise(0.05, { vol: 0.16, freq: 1800 * pitch, q: 1.4 });
        this.tone(380 * pitch, 0.08, { type: 'triangle', vol: 0.08, slide: 220 * pitch });
        break;
      case 'boom': {
        const deep = pitch < 1;
        this.noise(deep ? 0.42 : 0.28, { vol: deep ? 0.4 : 0.32, freq: deep ? 220 : 280, filter: 'lowpass' });
        this.tone((deep ? 70 : 90) * pitch, deep ? 0.4 : 0.28, { type: 'sawtooth', vol: deep ? 0.18 : 0.14, slide: deep ? 28 : 40 });
        if (deep) {
          this.tone(48, 0.35, { type: 'sine', vol: 0.12, slide: 22 });
          this.noise(0.18, { vol: 0.14, freq: 900, filter: 'bandpass', delay: 0.04 });
        }
        break;
      }
      case 'chitter':
        this.tone(780, 0.07, { type: 'square', vol: 0.05, slide: 1100 });
        this.tone(920, 0.08, { type: 'square', vol: 0.04, slide: 600, delay: 0.06 });
        this.tone(1100, 0.06, { type: 'square', vol: 0.04, slide: 700, delay: 0.12 });
        break;
      case 'xp':
        this.tone(880 * pitch, 0.07, { type: 'sine', vol: 0.1, slide: 1400 * pitch });
        break;
    }
  },
};
