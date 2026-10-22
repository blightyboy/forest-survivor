import Phaser from 'phaser';
import { createCanvas, type Ctx } from './primitives';

let canvasSpriteUid = 1;

/**
 * Phaser Image backed by a mutable canvas texture — for runtime-drawn entities
 * (player, animals, weapon FX). Call `redraw` then `refresh` each visual update.
 *
 * Always uses a unique texture key so scene restart never removes a texture
 * still referenced by a previous-run Image (glTexture null crash).
 */
export class CanvasSprite {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: Ctx;
  readonly key: string;
  readonly image: Phaser.GameObjects.Image;
  readonly w: number;
  readonly h: number;
  private scene: Phaser.Scene;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    w: number,
    h: number,
    keyPrefix: string,
    originX = 0.5,
    originY = 1,
  ) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    // Unique key every time — never reuse `rt_player` etc. across runs.
    this.key = `${keyPrefix}_${canvasSpriteUid++}`;
    const [el, ctx] = createCanvas(w, h);
    this.canvas = el;
    this.ctx = ctx;
    scene.textures.addCanvas(this.key, el);
    this.image = scene.add.image(0, 0, this.key).setOrigin(originX, originY);
    layer.add(this.image);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /**
   * Draw with local origin at feet.
   * Leaves `feetPad` px below feet for status bars (HP / dash).
   */
  withFeetOrigin(fn: (ctx: Ctx) => void, feetPad = 18) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.w / 2, this.h - feetPad);
    fn(ctx);
    ctx.restore();
  }

  /** Draw with local origin at canvas center (projectiles, FX). */
  withCenterOrigin(fn: (ctx: Ctx) => void) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    fn(ctx);
    ctx.restore();
  }

  refresh() {
    if (this.dead) return;
    const tex = this.scene.textures.get(this.key);
    if (tex && 'refresh' in tex && typeof (tex as Phaser.Textures.CanvasTexture).refresh === 'function') {
      (tex as Phaser.Textures.CanvasTexture).refresh();
    }
  }

  setPosition(x: number, y: number, depth?: number) {
    if (this.dead || !this.image.active) return;
    this.image.setPosition(x, y);
    if (depth != null) this.image.setDepth(depth);
  }

  setVisible(v: boolean) {
    if (this.dead || !this.image.active) return;
    this.image.setVisible(v);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    if (this.image && this.image.scene) this.image.destroy();
    if (this.scene.textures?.exists(this.key)) {
      this.scene.textures.remove(this.key);
    }
  }
}
