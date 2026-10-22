import Phaser from 'phaser';
import { clamp } from '../core/math';
import { SPECIES } from '../data/animals';
import type { AnimalEntity } from './AnimalSystem';

export type LightSource = {
  x: number;
  y: number;
  r: number;
  intensity?: number;
  /** Warm campfire / torch glow (legacy warm cookie). */
  warm?: boolean;
};

/**
 * Legacy-style night lighting on a zoom-1 overlay camera.
 *
 * Darkness + destination-out cookies are drawn on a Canvas 2D buffer (same as
 * legacy), then shown as a scrollFactor-0 image. This avoids Phaser RenderTexture
 * `isSpriteTexture` Y-flips and zoom/worldView mismatches that placed cut-outs
 * on the wrong side of the screen.
 */
export class LightingSystem {
  private scene: Phaser.Scene;
  /** All lighting display objects — main camera ignores this container. */
  readonly layer: Phaser.GameObjects.Container;
  private overlayCam: Phaser.Cameras.Scene2D.Camera;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nightImage: Phaser.GameObjects.Image;
  private duskTint: Phaser.GameObjects.Rectangle;
  private warmPool: Phaser.GameObjects.Image[] = [];
  private cookie: HTMLCanvasElement | null = null;
  private readonly textureKey = '__fs_night_light';
  private _w = 800;
  private _h = 600;
  private bound = false;

  constructor(scene: Phaser.Scene, depth = 100) {
    this.scene = scene;
    this.layer = scene.add.container(0, 0).setDepth(depth);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;

    if (scene.textures.exists(this.textureKey)) {
      scene.textures.remove(this.textureKey);
    }
    scene.textures.addCanvas(this.textureKey, this.canvas);

    this.nightImage = scene.add
      .image(0, 0, this.textureKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setVisible(false);
    this.layer.add(this.nightImage);

    this.duskTint = scene.add
      .rectangle(0, 0, 800, 600, 0xff7828, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0);
    this.layer.add(this.duskTint);

    // Overlay camera: zoom 1, only shows `layer`. Main ignores `layer`.
    this.overlayCam = scene.cameras.add(0, 0, 800, 600);
    this.overlayCam.setName('lighting');
    this.overlayCam.setZoom(1);
    this.overlayCam.setScroll(0, 0);
    this.overlayCam.setRoundPixels(true);
  }

  /**
   * Call once after world/fx layers exist.
   * Main camera draws the world; overlay draws only the light layer (+ HUD hooks).
   */
  bind(main: Phaser.Cameras.Scene2D.Camera, worldRoots: Phaser.GameObjects.GameObject[]) {
    if (this.bound) return;
    this.bound = true;
    main.ignore(this.layer);
    for (const root of worldRoots) {
      this.overlayCam.ignore(root);
    }
  }

  /**
   * Screen-space HUD (edge arrows, etc.): drawn by the zoom-1 overlay only,
   * so main camera zoom cannot stretch/offset them.
   */
  attachHud(main: Phaser.Cameras.Scene2D.Camera, obj: Phaser.GameObjects.GameObject) {
    main.ignore(obj);
  }

  resize(w: number, h: number) {
    this._w = Math.max(1, Math.round(w));
    this._h = Math.max(1, Math.round(h));
    const tex = this.scene.textures.get(this.textureKey) as Phaser.Textures.CanvasTexture;
    if (tex.width !== this._w || tex.height !== this._h) {
      tex.setSize(this._w, this._h);
      this.canvas = tex.getCanvas();
      this.ctx = tex.getContext();
    }
    this.nightImage.setDisplaySize(this._w, this._h);
    this.nightImage.setPosition(0, 0);
    this.duskTint.setSize(this._w, this._h);
    this.duskTint.setPosition(0, 0);
    this.overlayCam.setViewport(0, 0, this._w, this._h);
    this.overlayCam.setSize(this._w, this._h);
    this.overlayCam.setScroll(0, 0);
    this.overlayCam.setZoom(1);
  }

  private ensureCookie() {
    if (this.cookie) return this.cookie;
    const frame = this.scene.textures.getFrame('light_cookie');
    const src = frame?.source?.image as HTMLCanvasElement | HTMLImageElement | undefined;
    if (src) {
      this.cookie = src as HTMLCanvasElement;
      return this.cookie;
    }
    // Fallback soft circle if bake hasn't run.
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this.cookie = c;
    return c;
  }

  /**
   * World → overlay buffer pixels.
   * Phaser: midPoint = scroll + halfSize; visible world size = camSize / zoom.
   * Screen center of a world point at midPoint is (camW/2, camH/2).
   */
  private worldToScreen(mainCam: Phaser.Cameras.Scene2D.Camera, wx: number, wy: number) {
    const zoom = mainCam.zoom || 1;
    const midX = mainCam.scrollX + mainCam.width * 0.5;
    const midY = mainCam.scrollY + mainCam.height * 0.5;
    // Map into our buffer (matches main camera size after resize).
    const cx = this._w * 0.5;
    const cy = this._h * 0.5;
    const scaleX = this._w / Math.max(1, mainCam.width);
    const scaleY = this._h / Math.max(1, mainCam.height);
    return {
      x: (wx - midX) * zoom * scaleX + cx,
      y: (wy - midY) * zoom * scaleY + cy,
      zoom: zoom * scaleX,
    };
  }

  update(
    darkness: number,
    mainCam: Phaser.Cameras.Scene2D.Camera,
    sources: LightSource[],
    duskTint = 0,
  ) {
    this.duskTint.setAlpha(clamp(0.16 * duskTint, 0, 0.2));

    if (darkness <= 0.01) {
      this.nightImage.setVisible(false);
      for (const l of this.warmPool) l.setVisible(false);
      return;
    }

    const w = this._w;
    const h = this._h;
    const ctx = this.ctx;
    const cookie = this.ensureCookie();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(8,12,40,${clamp(darkness, 0, 1).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-out';
    for (const src of sources) {
      const a = src.intensity ?? 1;
      const { x: sx, y: sy, zoom } = this.worldToScreen(mainCam, src.x, src.y);
      const r = Math.max(1, src.r * zoom * a);
      if (sx + r < 0 || sy + r < 0 || sx - r > w || sy - r > h) continue;
      if (a < 0.999) ctx.globalAlpha = a;
      ctx.drawImage(cookie, sx - r, sy - r, r * 2, r * 2);
      if (a < 0.999) ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    this.nightImage.setVisible(true);

    const warmSources = sources.filter((s) => s.warm);
    while (this.warmPool.length < warmSources.length) {
      const img = this.scene.add
        .image(0, 0, 'warm_cookie')
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      this.layer.add(img);
      this.warmPool.push(img);
    }
    const warmA = 0.22 * darkness;
    for (let i = 0; i < this.warmPool.length; i++) {
      const light = this.warmPool[i];
      if (i >= warmSources.length) {
        light.setVisible(false);
        continue;
      }
      const src = warmSources[i];
      const { x: sx, y: sy, zoom } = this.worldToScreen(mainCam, src.x, src.y);
      const r = Math.max(1, src.r * zoom * 0.6 * (src.intensity ?? 1));
      light
        .setVisible(true)
        .setPosition(sx, sy)
        .setDisplaySize(r * 2, r * 2)
        .setAlpha(warmA);
    }

    (this.scene.textures.get(this.textureKey) as Phaser.Textures.CanvasTexture).refresh();
  }

  /**
   * Night eye glow on the darkness overlay.
   * Raiders / assault / bosses: red. Ambient night creatures: yellow.
   */
  drawEyeGlows(
    mainCam: Phaser.Cameras.Scene2D.Camera,
    animals: AnimalEntity[],
    runTime: number,
    darkness: number,
  ) {
    if (darkness <= 0.25 || !this.nightImage.visible) return;
    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    for (const a of animals) {
      if (a.dead || a.leaving) continue;
      const sp = SPECIES[a.species];
      if (!sp?.eye) continue;
      const wx = a.x + sp.eye[0] * a.facing * a.scale;
      const wy = a.y + sp.eye[1] * a.scale;
      const { x: sx, y: sy, zoom } = this.worldToScreen(mainCam, wx, wy);
      const rx = 6 * zoom;
      const ry = 5 * zoom;
      if (sx + rx < 0 || sy + ry < 0 || sx - rx > w || sy - ry > h) continue;

      const pulse = 0.75 + Math.sin(runTime * 5 + a.x) * 0.25;
      const raidEye = !!(a.raider || a.assault || a.boss || a.trueBoss);
      const glow = raidEye
        ? `rgba(255,70,50,${(0.35 * pulse).toFixed(3)})`
        : `rgba(255,220,80,${(0.3 * pulse).toFixed(3)})`;
      const core = raidEye ? '#ff6a4d' : '#ffe680';

      ctx.beginPath();
      ctx.ellipse(sx, sy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx, sy, Math.max(0.4, 1.8 * zoom), Math.max(0.4, 1.6 * zoom), 0, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
    }
    (this.scene.textures.get(this.textureKey) as Phaser.Textures.CanvasTexture).refresh();
  }

  destroy() {
    if (this.overlayCam && this.scene.cameras) {
      this.scene.cameras.remove(this.overlayCam, true);
    }
    this.layer.destroy(true);
    this.warmPool.length = 0;
    if (this.scene.textures.exists(this.textureKey)) {
      this.scene.textures.remove(this.textureKey);
    }
    this.bound = false;
  }
}
