import Phaser from 'phaser';
import { clamp, rand, TAU } from '../core/math';
import { ELEMENTS, type ElementId } from '../data/constants';

type Particle = {
  gfx: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  z: number;
  grow?: number;
  baseSize?: number;
};

type Ring = {
  gfx: Phaser.GameObjects.Arc;
  life: number;
  maxLife: number;
  r0: number;
  r1: number;
};

/** Lightweight particle / ring FX (legacy Effects subset). */
export class FxSystem {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private layer: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.layer = layer;
  }

  hitPuff(x: number, y: number, n = 6) {
    for (let i = 0; i < n; i++) {
      this.spawnDot(x, y, '#ffffff', rand(2, 4), rand(-80, 80), rand(-120, -20), 0.35);
    }
  }

  woodChips(x: number, y: number, towardX: number, towardY: number, n = 8) {
    const ang = Math.atan2(y - towardY, x - towardX);
    for (let i = 0; i < n; i++) {
      const a = ang + rand(-0.8, 0.8);
      const sp = rand(60, 180);
      this.spawnRect(x, y, '#c68642', rand(3, 6), Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.55);
    }
  }

  rockChips(x: number, y: number, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 140);
      this.spawnRect(x, y, '#9aa3aa', rand(2, 5), Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.5);
    }
  }

  sparks(x: number, y: number, n = 10, color = '#ffe066') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(80, 220);
      this.spawnDot(x, y, color, rand(1.5, 3.5), Math.cos(a) * sp, Math.sin(a) * sp - 60, 0.45);
    }
  }

  sparkle(x: number, y: number, color = '#9ef08a') {
    for (let i = 0; i < 6; i++) {
      this.spawnDot(x + rand(-14, 14), y + rand(-8, 8), color, rand(2, 3.5), rand(-20, 20), rand(-60, -10), 0.55);
    }
  }

  dust(x: number, y: number, n = 8) {
    for (let i = 0; i < n; i++) {
      this.spawnDot(x + rand(-20, 20), y, 'rgba(180,150,100,0.7)', rand(3, 7), rand(-30, 30), rand(-40, -5), 0.7);
    }
  }

  deathBurst(x: number, y: number, color: string, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      const sp = rand(70, 200);
      this.spawnDot(x, y, color, rand(2.5, 5), Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.65);
    }
    this.ring(x, y, color, 8, 70, 0.4);
  }

  /**
   * Kill pop: soft smoke poof + brief blood splatters so deaths read clearly.
   * `scale` ~1 for normal beasts, higher for big/boss kills.
   */
  deathPoof(x: number, y: number, scale = 1) {
    const s = clamp(scale, 0.7, 2.2);
    // Expanding dust / smoke poof.
    this.ring(x, y, 'rgba(210,190,160,0.85)', 6 * s, 48 * s, 0.32);
    this.ring(x, y, 'rgba(120,90,70,0.45)', 4 * s, 36 * s, 0.28);
    for (let i = 0; i < Math.round(10 * s); i++) {
      const a = Math.random() * TAU;
      const sp = rand(30, 110) * s;
      const smoke =
        Math.random() < 0.4
          ? 'rgba(200,180,150,0.75)'
          : Math.random() < 0.5
            ? 'rgba(160,140,120,0.7)'
            : 'rgba(90,70,55,0.65)';
      this.spawnDot(
        x + Math.cos(a) * rand(0, 8) * s,
        y + Math.sin(a) * rand(0, 6) * s,
        smoke,
        rand(3.5, 7.5) * s,
        Math.cos(a) * sp,
        Math.sin(a) * sp * 0.55 - rand(20, 70),
        rand(0.35, 0.55),
        6,
      );
    }
    // Brief blood splatters (arcs + droplets).
    const bloodN = Math.round(8 * s);
    for (let i = 0; i < bloodN; i++) {
      const a = Math.random() * TAU;
      const sp = rand(60, 200) * s;
      const col = Math.random() < 0.35 ? '#8a1518' : Math.random() < 0.5 ? '#c4553e' : '#e5383b';
      if (Math.random() < 0.4) {
        this.spawnRect(
          x,
          y,
          col,
          rand(2, 4.5) * s,
          Math.cos(a) * sp,
          Math.sin(a) * sp * 0.65 - rand(30, 90),
          rand(0.28, 0.45),
        );
      } else {
        this.spawnDot(
          x,
          y,
          col,
          rand(1.8, 4) * s,
          Math.cos(a) * sp,
          Math.sin(a) * sp * 0.7 - rand(40, 110),
          rand(0.3, 0.5),
        );
      }
    }
  }

  ring(x: number, y: number, color: string, r0: number, r1: number, life = 0.45) {
    const col = this.parseColor(color);
    const gfx = this.scene.add
      .circle(x, y, r0, col, 0)
      .setStrokeStyle(3, col, 0.9)
      .setDepth(Math.floor(y) + 30);
    this.layer.add(gfx);
    this.rings.push({ gfx, life, maxLife: life, r0, r1 });
  }

  /**
   * Legacy Effects.explosion — dynamite blast: shock rings, fire, smoke, debris.
   */
  explosion(x: number, y: number, r = 100) {
    const scale = clamp(r / 100, 0.85, 1.8);
    this.ring(x, y, 'rgba(255,240,180,0.95)', r * 0.25, r * 2.4, 0.45);
    this.ring(x, y, 'rgba(255,120,40,0.8)', r * 0.15, r * 1.9, 0.38);
    this.ring(x, y, 'rgba(255,60,20,0.55)', r * 0.08, r * 1.4, 0.3);

    for (let i = 0; i < Math.round(28 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(140, 420) * scale;
      const col = Math.random() < 0.45 ? '#fff6c8' : Math.random() < 0.5 ? '#ffb347' : '#ff6a3d';
      this.spawnDot(x, y, col, rand(2, 4.5) * scale, Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - rand(40, 140), 0.55);
    }
    for (let i = 0; i < Math.round(18 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(40, 160) * scale;
      const col = Math.random() < 0.35 ? '#ffe066' : Math.random() < 0.5 ? '#ff8a3d' : '#e5484d';
      this.spawnDot(
        x + Math.cos(a) * rand(0, r * 0.35),
        y + Math.sin(a) * rand(0, r * 0.25) - 8,
        col,
        rand(4, 9) * scale,
        Math.cos(a) * sp * 0.4,
        Math.sin(a) * sp * 0.25 - rand(60, 160),
        0.7,
        10,
      );
    }
    for (let i = 0; i < Math.round(14 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(30, 110) * scale;
      const col = Math.random() < 0.5 ? 'rgba(60,40,30,0.55)' : 'rgba(90,70,55,0.45)';
      this.spawnDot(
        x + Math.cos(a) * rand(0, r * 0.4),
        y + Math.sin(a) * rand(0, r * 0.3) - 6,
        col,
        rand(6, 12) * scale,
        Math.cos(a) * sp,
        Math.sin(a) * sp * 0.5 - rand(20, 60),
        1.0,
        18,
      );
    }
    for (let i = 0; i < Math.round(12 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(90, 260) * scale;
      this.spawnRect(
        x,
        y + 6,
        Math.random() < 0.5 ? '#6b7278' : '#8a5a2e',
        rand(2, 4) * scale,
        Math.cos(a) * sp,
        Math.sin(a) * sp * 0.6 - rand(50, 120),
        0.7,
      );
    }
    for (let i = 0; i < Math.round(8 * scale); i++) {
      this.spawnDot(
        x + rand(-10, 10) * scale,
        y - rand(4, 20),
        '#fff8d0',
        rand(3, 6) * scale,
        rand(-40, 40),
        rand(-80, -20),
        0.35,
      );
    }
    this.dust(x, y, Math.round(16 * scale));
  }

  /**
   * Motion / skill trail — themed particles left behind moving weapons, bolts, and charges.
   * Call every few frames (or with a small accumulator) while the source moves.
   */
  trail(
    x: number,
    y: number,
    opts: {
      element?: ElementId | null;
      color?: string;
      /** 0–1 density / size scale. */
      strength?: number;
      /** Inherit a bit of the projectile's velocity. */
      vx?: number;
      vy?: number;
      /** Extra particles for unique / boss effects. */
      rich?: boolean;
    } = {},
  ) {
    const el = opts.element || null;
    const strength = clamp(opts.strength ?? 0.7, 0.15, 1.5);
    const rich = !!opts.rich;
    const n = rich ? 2 + (Math.random() < 0.55 ? 1 : 0) : 1 + (Math.random() < strength ? 1 : 0);
    const dragVx = (opts.vx || 0) * -0.08;
    const dragVy = (opts.vy || 0) * -0.08;
    const palette = this.trailPalette(el, opts.color);

    for (let i = 0; i < n; i++) {
      const col = palette[i % palette.length];
      const ox = rand(-3, 3) * strength;
      const oy = rand(-3, 3) * strength;
      if (el === 'fire') {
        this.spawnDot(
          x + ox,
          y + oy,
          col,
          rand(1.6, 3.4) * strength,
          dragVx + rand(-18, 18),
          dragVy + rand(-70, -20),
          rand(0.18, 0.38),
          rich ? 4 : 0,
        );
      } else if (el === 'water') {
        this.spawnDot(
          x + ox,
          y + oy,
          col,
          rand(1.2, 2.8) * strength,
          dragVx + rand(-25, 25),
          dragVy + rand(10, 40),
          rand(0.22, 0.42),
        );
      } else if (el === 'nature') {
        this.spawnRect(
          x + ox,
          y + oy,
          col,
          rand(2, 4) * strength,
          dragVx + rand(-30, 30),
          dragVy + rand(-10, 35),
          rand(0.28, 0.5),
        );
      } else if (el === 'earth') {
        this.spawnRect(
          x + ox,
          y + oy,
          col,
          rand(1.5, 3.2) * strength,
          dragVx + rand(-20, 20),
          dragVy + rand(-15, 20),
          rand(0.25, 0.45),
        );
      } else if (el === 'light') {
        this.spawnDot(
          x + ox,
          y + oy,
          col,
          rand(1.8, 3.6) * strength,
          dragVx + rand(-35, 35),
          dragVy + rand(-40, 10),
          rand(0.16, 0.32),
        );
      } else if (el === 'darkness') {
        this.spawnDot(
          x + ox,
          y + oy,
          col,
          rand(2.2, 4.5) * strength,
          dragVx + rand(-22, 22),
          dragVy + rand(-25, 15),
          rand(0.28, 0.5),
          rich ? 6 : 3,
        );
      } else {
        // Neutral / non-elemental: soft pale streak.
        this.spawnDot(
          x + ox,
          y + oy,
          col,
          rand(1.2, 2.6) * strength,
          dragVx + rand(-15, 15),
          dragVy + rand(-20, 10),
          rand(0.14, 0.3),
        );
      }
    }
  }

  /** Secondary accents for gradient-style elemental trails. */
  private trailPalette(element: ElementId | null, fallback?: string): string[] {
    if (element === 'fire') return ['#ff6a3d', '#ffb347', '#ffe066', '#ff3d1a'];
    if (element === 'water') return ['#4db8ff', '#9ad4ff', '#e8f7ff', '#2a8fd4'];
    if (element === 'nature') return ['#6dd46a', '#9ef08a', '#3d8a3a', '#d4ffc8'];
    if (element === 'earth') return ['#c4a35a', '#d4b878', '#8a6a3a', '#f0e0b0'];
    if (element === 'light') return ['#ffe66d', '#fff8c8', '#ffffff', '#ffd23f'];
    if (element === 'darkness') return ['#9b7bde', '#c4a8ff', '#5a3a8a', 'rgba(155,123,222,0.7)'];
    if (fallback) return [fallback, '#ffffff', fallback];
    return ['#e8e0d0', '#ffffff', '#c8c0b0'];
  }

  /** Legacy Effects.elementHit — themed burst by attack element. */
  elementHit(x: number, y: number, element: ElementId, aff = 1, scale = 1) {
    const el = ELEMENTS[element];
    if (!el) return;
    const n = Math.round((aff > 1 ? 10 : aff < 1 ? 4 : 7) * scale);
    const col = el.color;
    if (element === 'fire') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = rand(50, 180) * (aff > 1 ? 1.25 : 1);
        this.spawnDot(
          x,
          y,
          Math.random() < 0.5 ? col : '#ffb347',
          rand(2, 4) * scale,
          Math.cos(a) * sp,
          Math.sin(a) * sp * 0.5 - rand(20, 60),
          0.4,
        );
      }
    } else if (element === 'water') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = rand(40, 140);
        this.spawnDot(
          x,
          y,
          Math.random() < 0.4 ? '#e8f7ff' : col,
          rand(1.5, 3) * scale,
          Math.cos(a) * sp,
          Math.sin(a) * sp - rand(10, 40),
          0.45,
        );
      }
    } else if (element === 'nature') {
      for (let i = 0; i < n; i++) {
        const palette = [col, '#9ef08a', '#3d8a3a'];
        this.spawnRect(
          x + rand(-12, 12),
          y + rand(-8, 8),
          palette[i % 3],
          rand(3, 5) * scale,
          rand(-40, 40),
          rand(10, 50),
          0.9,
        );
      }
    } else if (element === 'earth') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = rand(60, 160);
        this.spawnRect(
          x,
          y,
          Math.random() < 0.5 ? col : '#8a6a3a',
          rand(2, 4) * scale,
          Math.cos(a) * sp,
          Math.sin(a) * sp * 0.6 - rand(40, 80),
          0.55,
        );
      }
    } else if (element === 'light') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = rand(70, 200);
        this.spawnDot(
          x,
          y,
          Math.random() < 0.5 ? col : '#fff8c8',
          rand(2.5, 5) * scale,
          Math.cos(a) * sp,
          Math.sin(a) * sp - rand(10, 40),
          0.35,
        );
      }
      if (aff > 1) this.ring(x, y, el.glow, 6, 40, 0.25);
    } else if (element === 'darkness') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = rand(30, 110);
        this.spawnDot(
          x,
          y,
          aff > 1 ? '#ffffff' : el.glow,
          rand(3, 6) * scale,
          Math.cos(a) * sp,
          Math.sin(a) * sp - rand(5, 25),
          0.5,
          8,
        );
      }
    } else {
      this.sparks(x, y, n, col);
    }
  }

  private spawnDot(
    x: number,
    y: number,
    color: string,
    size: number,
    vx: number,
    vy: number,
    life: number,
    grow = 0,
  ) {
    const col = this.parseColor(color);
    const alpha = color.includes('rgba') ? 0.7 : 0.95;
    const gfx = this.scene.add.circle(x, y, size, col, alpha).setDepth(Math.floor(y) + 25);
    this.layer.add(gfx);
    this.particles.push({
      gfx, life, maxLife: life, vx, vy, vz: rand(40, 120), z: 0, grow, baseSize: size,
    });
  }

  private spawnRect(x: number, y: number, color: string, size: number, vx: number, vy: number, life: number) {
    const col = this.parseColor(color);
    const gfx = this.scene.add
      .rectangle(x, y, size, size * 0.6, col, 0.95)
      .setRotation(rand(0, Math.PI))
      .setDepth(Math.floor(y) + 25);
    this.layer.add(gfx);
    this.particles.push({ gfx, life, maxLife: life, vx, vy, vz: rand(30, 90), z: 0 });
  }

  private parseColor(c: string): number {
    if (c.startsWith('#')) return parseInt(c.slice(1), 16);
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (m) return (Number(m[1]) << 16) | (Number(m[2]) << 8) | Number(m[3]);
    return 0xffffff;
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vx *= Math.exp(-2 * dt);
      p.vy *= Math.exp(-1.2 * dt);
      p.z += p.vz * dt;
      p.vz -= 420 * dt;
      if (p.z < 0) {
        p.z = 0;
        p.vz *= -0.25;
      }
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt - p.vz * dt * 0.02;
      const a = Math.max(0, p.life / p.maxLife);
      p.gfx.setAlpha(a);
      if (p.grow && p.baseSize && 'setRadius' in p.gfx) {
        const t = 1 - a;
        (p.gfx as Phaser.GameObjects.Arc).setRadius(Math.max(1, p.baseSize + p.grow * t));
      }
      if (p.life <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const t = 1 - r.life / r.maxLife;
      const rad = r.r0 + (r.r1 - r.r0) * t;
      r.gfx.setRadius(Math.max(1, rad));
      r.gfx.setAlpha(Math.max(0, 1 - t));
      if (r.life <= 0) {
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const p of this.particles) p.gfx.destroy();
    for (const r of this.rings) r.gfx.destroy();
    this.particles.length = 0;
    this.rings.length = 0;
  }
}
