import Phaser from 'phaser';
import { settings } from '../meta/Settings';

type Floater = {
  text: Phaser.GameObjects.Text;
  life: number;
  age: number;
  vx: number;
  vy: number;
  /** Extra scale-pop for damage floats. */
  pop?: boolean;
};

const MAX = 80;

/** World-space floating combat / loot labels (legacy addText). */
export class FloatingTextSystem {
  private list: Floater[] = [];
  private layer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.layer = layer;
  }

  spawn(
    x: number,
    y: number,
    msg: string,
    color = '#ffffff',
    size = 16,
    opts: { life?: number; vx?: number; vy?: number } = {},
  ) {
    if (this.list.length >= MAX) {
      const old = this.list.shift();
      old?.text.destroy();
    }
    const isDamage = msg.startsWith('-');
    const text = this.layer.scene.add
      .text(x, y, msg, {
        fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
        fontSize: `${settings.textPx(size)}px`,
        fontStyle: '900',
        color,
        stroke: isDamage ? 'rgba(20,4,4,0.95)' : 'rgba(30,15,5,0.9)',
        strokeThickness: Math.max(isDamage ? 5 : 3, settings.textPx(isDamage ? 5 : 4)),
      })
      .setOrigin(0.5)
      .setDepth(Math.floor(y) + 40);
    this.layer.add(text);
    this.list.push({
      text,
      life: opts.life ?? 0.8,
      age: 0,
      vx: opts.vx ?? 0,
      vy: opts.vy ?? -28,
      pop: isDamage,
    });
  }

  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.age += dt;
      t.text.x += t.vx * dt;
      t.text.y += t.vy * dt;
      const k = t.age / t.life;
      const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      let pop = 1;
      if (t.pop) {
        // Stronger scale-pop so damage floats separate from world clutter.
        if (t.age < 0.08) pop = 0.35 + 0.9 * (t.age / 0.08);
        else if (t.age < 0.18) pop = 1.25 - 0.25 * ((t.age - 0.08) / 0.1);
        else pop = 1;
      } else if (t.age < 0.15) {
        pop = 0.5 + 0.5 * Math.min(1, t.age / 0.15);
      }
      t.text.setAlpha(Math.max(0, alpha));
      t.text.setScale(pop);
      t.text.setDepth(Math.floor(t.text.y) + 40);
      if (t.age >= t.life) {
        t.text.destroy();
        this.list.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const t of this.list) t.text.destroy();
    this.list.length = 0;
  }
}
