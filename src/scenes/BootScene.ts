import Phaser from 'phaser';
import { SPECIES } from '../data/animals';

function hexColor(hex: string) {
  return parseInt(hex.replace('#', ''), 16);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.makeCircle('player', 28, 0xe8c4a0, 0x5c3d2e);
    this.makeTree('tree_oak', 0x4a8f3a, 0x6bb84f, 0x7d4b27);
    this.makeTree('tree_pine', 0x2d5a3d, 0x3d7a52, 0x5a3820, true);
    this.makeEllipse('rock', 36, 28, 0x8b949b, 0x5c646b);
    this.makeEllipse('rock_ore', 38, 30, 0xb3a998, 0xffd54a);
    this.makeEllipse('bush', 32, 22, 0x4c9a3a, 0x2f6f2c);

    this.makeCircle('pickup_wood', 14, 0xc68642, 0x8b5a2a);
    this.makeCircle('pickup_meat', 14, 0xe85d4a, 0x9a2e22);
    this.makeCircle('pickup_gold', 14, 0xffe066, 0xc9a227);
    this.makeCircle('pickup_xp', 14, 0x7fd3ff, 0x3d8fcc);
    for (const id of ['magnet', 'fury', 'vital', 'haste', 'nuke'] as const) {
      const c = { magnet: 0xff6b6b, fury: 0xff8a3d, vital: 0x9ef08a, haste: 0x7fd3ff, nuke: 0xffe066 }[id];
      this.makeCircle(`pickup_${id}`, 16, c, 0x222222);
    }

    this.makeAxe('axe', 0xc0c4c8, 0x8b4513);
    this.makeAxe('hatchet', 0xd4d8dc, 0x6b4022, 0.75);

    for (const id of Object.keys(SPECIES)) {
      const sp = SPECIES[id];
      const r = sp.radius;
      this.makeCircle(`animal_${id}`, r * 2 + 8, hexColor(sp.color), 0x1a1a1a, 0.35);
    }

    this.makeCircle('particle', 8, 0xffffff, undefined, 0.9);
    this.makeCircle('light_cookie', 64, 0xffffff, undefined, 0.22);

    this.makeRect('camp', 72, 56, 0x8b5a2a, 0x5c3a18);
    this.makeRect('wall', 48, 16, 0x7d5a3a, 0x4a3020);
    this.makeRect('tower', 40, 52, 0x6a5040, 0x3a2818);
    this.makeEllipse('fire_pool', 48, 32, 0xff6a3d, 0xffaa44);

    this.scene.start('MenuScene');
  }

  private tex(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeCircle(key: string, size: number, fill: number, stroke?: number, alpha = 1) {
    const r = size / 2;
    this.tex(key, size, size, (g) => {
      g.fillStyle(fill, alpha);
      if (stroke !== undefined) {
        g.lineStyle(2, stroke, 1);
        g.fillCircle(r, r, r - 1);
        g.strokeCircle(r, r, r - 1);
      } else {
        g.fillCircle(r, r, r);
      }
    });
  }

  private makeEllipse(key: string, w: number, h: number, fill: number, accent?: number) {
    this.tex(key, w, h, (g) => {
      g.fillStyle(fill, 1);
      g.fillEllipse(w / 2, h / 2 + 2, w * 0.45, h * 0.4);
      if (accent !== undefined) {
        g.fillStyle(accent, 0.85);
        g.fillEllipse(w / 2 - 4, h / 2 - 4, w * 0.2, h * 0.15);
      }
    });
  }

  private makeRect(key: string, w: number, h: number, fill: number, stroke: number) {
    this.tex(key, w, h, (g) => {
      g.fillStyle(fill, 1);
      g.lineStyle(2, stroke, 1);
      g.fillRoundedRect(2, 2, w - 4, h - 4, 4);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 4);
    });
  }

  private makeTree(key: string, dark: number, light: number, trunk: number, pine = false) {
    const w = 64;
    const h = 96;
    this.tex(key, w, h, (g) => {
      const cx = w / 2;
      g.fillStyle(trunk, 1);
      g.fillRoundedRect(cx - 6, h - 28, 12, 24, 2);
      if (pine) {
        g.fillStyle(dark, 1);
        g.fillTriangle(cx, 12, cx - 26, h - 30, cx + 26, h - 30);
        g.fillStyle(light, 1);
        g.fillTriangle(cx, 28, cx - 20, h - 22, cx + 20, h - 22);
      } else {
        g.fillStyle(dark, 1);
        g.fillCircle(cx - 10, h - 48, 18);
        g.fillCircle(cx + 12, h - 52, 20);
        g.fillCircle(cx, h - 58, 22);
        g.fillStyle(light, 1);
        g.fillCircle(cx - 6, h - 50, 12);
        g.fillCircle(cx + 8, h - 54, 14);
      }
    });
  }

  private makeAxe(key: string, metal: number, handle: number, scale = 1) {
    const w = Math.round(32 * scale);
    const h = Math.round(40 * scale);
    this.tex(key, w, h, (g) => {
      g.fillStyle(handle, 1);
      g.fillRect(w * 0.46, h * 0.35, w * 0.12, h * 0.55);
      g.fillStyle(metal, 1);
      g.fillTriangle(w * 0.5, h * 0.1, w * 0.92, h * 0.35, w * 0.5, h * 0.42);
      g.fillTriangle(w * 0.5, h * 0.1, w * 0.08, h * 0.35, w * 0.5, h * 0.42);
    });
  }
}
