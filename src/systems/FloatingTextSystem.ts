import Phaser from 'phaser';
import { settings } from '../meta/Settings';

type Floater = {
  text: Phaser.GameObjects.Text;
  life: number;
  age: number;
  vx: number;
  vy: number;
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
    const text = this.layer.scene.add
      .text(x, y, msg, {
        fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
        fontSize: `${settings.textPx(size)}px`,
        fontStyle: '900',
        color,
        stroke: 'rgba(30,15,5,0.9)',
        strokeThickness: Math.max(3, settings.textPx(4)),
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
      const pop = t.age < 0.15 ? 0.5 + 0.5 * Math.min(1, t.age / 0.15) : 1;
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
