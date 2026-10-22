import Phaser from 'phaser';
import './ui/overlay.css';
import { settings } from './meta/Settings';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { RunScene } from './scenes/RunScene';
import { deviceDpr } from './core/renderScale';

function bufferSize() {
  const dpr = deviceDpr();
  return {
    w: Math.max(1, Math.round(window.innerWidth * dpr)),
    h: Math.max(1, Math.round(window.innerHeight * dpr)),
    dpr,
  };
}

const initial = bufferSize();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-root',
  backgroundColor: '#1b3014',
  scale: {
    mode: Phaser.Scale.NONE,
    width: initial.w,
    height: initial.h,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    autoRound: true,
  },
  fps: {
    target: 60,
    // VSync on → rAF; off → uncapped timer loop (legacy-ish uncapped feel).
    forceSetTimeOut: !settings.vsync,
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scene: [BootScene, MenuScene, RunScene],
});

function applyCanvasCss(dpr: number) {
  const canvas = game.canvas;
  if (!canvas) return;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  canvas.style.imageRendering = dpr > 1.05 ? 'auto' : 'auto';
}

function resizeGame() {
  const { w, h, dpr } = bufferSize();
  game.scale.resize(w, h);
  applyCanvasCss(dpr);
  game.events.emit('dpr-resize', { width: w, height: h, dpr, cssW: window.innerWidth, cssH: window.innerHeight });
}

window.addEventListener('resize', () => resizeGame());
game.events.once('ready', () => {
  applyCanvasCss(deviceDpr());
  resizeGame();
});

/** Toggle Phaser loop vsync behavior from Options (rAF vs uncapped timer). */
export function applyVsync(on: boolean) {
  const loop = game.loop as Phaser.Core.TimeStep & { forceSetTimeOut: boolean };
  loop.forceSetTimeOut = !on;
  if (on) game.loop.targetFps = 60;
  else game.loop.targetFps = 0;
}

window.__forestApplyVsync = applyVsync;

/** Re-apply camera zoom when Options commits a new zoomScale (RunScene listens). */
window.__forestApplyZoom = () => {
  game.events.emit('zoom-settings');
};

export default game;
