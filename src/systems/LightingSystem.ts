import Phaser from 'phaser';
import { clamp } from '../core/math';

export class LightingSystem {
  private scene: Phaser.Scene;
  private depth: number;
  private darkLayer: Phaser.GameObjects.Rectangle;
  private lightPool: Phaser.GameObjects.Image[] = [];
  private _w = 800;
  private _h = 600;

  constructor(scene: Phaser.Scene, depth = 100) {
    this.scene = scene;
    this.depth = depth;
    this.darkLayer = scene.add
      .rectangle(0, 0, 800, 600, 0x020408, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);
  }

  resize(w: number, h: number) {
    this._w = w;
    this._h = h;
    this.darkLayer.setSize(w, h);
    this.darkLayer.setPosition(0, 0);
  }

  /** Cap effective DPR for light scale (avoid huge cookies on retina). */
  private dprScale() {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return clamp(1 / Math.max(1, dpr * 0.5), 0.55, 1);
  }

  update(
    darkness: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    sources: { x: number; y: number; r: number; intensity?: number }[],
  ) {
    const w = this._w;
    const h = this._h;
    const dpr = this.dprScale();

    if (darkness <= 0.02) {
      this.darkLayer.setAlpha(0);
      for (const l of this.lightPool) l.setVisible(false);
      return;
    }

    this.darkLayer.setAlpha(clamp(darkness * 0.92, 0, 0.88));

    while (this.lightPool.length < sources.length) {
      const img = this.scene.add
        .image(0, 0, 'light_cookie')
        .setScrollFactor(0)
        .setDepth(this.depth + 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.lightPool.push(img);
    }

    const cam = camera;
    for (let i = 0; i < this.lightPool.length; i++) {
      const light = this.lightPool[i];
      if (i >= sources.length) {
        light.setVisible(false);
        continue;
      }
      const src = sources[i];
      const screenX = src.x - cam.scrollX + w * 0.5;
      const screenY = src.y - cam.scrollY + h * 0.5;
      const scale = ((src.r * 2.2) / 64) * cam.zoom * dpr * (src.intensity ?? 1);
      light
        .setVisible(true)
        .setPosition(screenX, screenY)
        .setScale(scale)
        .setAlpha(clamp(0.35 + (1 - darkness) * 0.5, 0.25, 0.95));
    }
  }

  destroy() {
    this.darkLayer.destroy();
    for (const l of this.lightPool) l.destroy();
    this.lightPool.length = 0;
  }
}
