import Phaser from 'phaser';
import type { AnimalEntity } from './AnimalSystem';

/** Screen-edge arrows toward camp / bosses / raiders (legacy drawIndicators). */
export class EdgeIndicatorSystem {
  private gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private scene: Phaser.Scene;
  /** Exposed so lighting overlay can own this (zoom-1 screen space). */
  get display() {
    return this.gfx;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(9000);
  }

  private labelAt(i: number, x: number, y: number, text: string, color: string) {
    let t = this.labels[i];
    if (!t) {
      t = this.scene.add
        .text(x, y, text, {
          fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color,
          stroke: '#140a05',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(9001);
      this.labels[i] = t;
    } else {
      t.setPosition(x, y).setText(text).setColor(color).setVisible(true);
    }
    return t;
  }

  update(
    cam: Phaser.Cameras.Scene2D.Camera,
    campX: number,
    campY: number,
    _playerX: number,
    _playerY: number,
    animals: AnimalEntity[],
  ) {
    const g = this.gfx;
    g.clear();
    for (const t of this.labels) t.setVisible(false);
    const vw = cam.width;
    const vh = cam.height;
    const left = 26;
    const right = vw - 26;
    const top = vw < 900 ? 150 : 96;
    const bottom = vh - 30;
    const cx = vw / 2;
    const cy = vh / 2;
    let labelI = 0;

    const marker = (wx: number, wy: number, color: number, size: number, label?: string) => {
      const sx = (wx - cam.worldView.x) * cam.zoom;
      const sy = (wy - cam.worldView.y) * cam.zoom;
      if (sx > left && sx < right && sy > top && sy < bottom) return;
      const dx = sx - cx;
      const dy = sy - cy;
      let t = 1;
      if (dx > 0) t = Math.min(t, (right - cx) / dx);
      if (dx < 0) t = Math.min(t, (left - cx) / dx);
      if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
      if (dy < 0) t = Math.min(t, (top - cy) / dy);
      const ex = cx + dx * t;
      const ey = cy + dy * t;
      const ang = Math.atan2(dy, dx);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const tipX = ex + cos * size;
      const tipY = ey + sin * size;
      const bx = ex - cos * size * 0.7;
      const by = ey - sin * size * 0.7;
      const px = -sin;
      const py = cos;
      g.fillStyle(color, 1);
      g.lineStyle(2, 0x140a05, 0.9);
      g.beginPath();
      g.moveTo(tipX, tipY);
      g.lineTo(bx + px * size * 0.75, by + py * size * 0.75);
      g.lineTo(ex - cos * size * 0.35, ey - sin * size * 0.35);
      g.lineTo(bx - px * size * 0.75, by - py * size * 0.75);
      g.closePath();
      g.fillPath();
      g.strokePath();
      if (label) {
        const hex = '#' + color.toString(16).padStart(6, '0');
        this.labelAt(labelI++, tipX - cos * (size + 12), tipY - sin * (size + 12), label, hex);
      }
    };

    let shown = 0;
    for (const a of animals) {
      if (a.dead) continue;
      if (a.trueBoss) {
        marker(a.x, a.y, 0xff4d6d, 14, a.displayName || 'Boss');
        continue;
      }
      if (a.boss) {
        marker(a.x, a.y, 0xc46bff, 12, a.displayName || 'Boss');
        continue;
      }
      if (a.raider) {
        marker(a.x, a.y, 0xff5a4d, 9);
        if (++shown >= 14) break;
      }
    }
    marker(campX, campY - 40, 0xffd23f, 13, 'Camp');
  }

  destroy() {
    this.gfx.destroy();
    for (const t of this.labels) t.destroy();
    this.labels.length = 0;
  }
}
