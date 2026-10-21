import Phaser from 'phaser';
import './ui/overlay.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { RunScene } from './scenes/RunScene';

const MAX_W = 1920;
const MAX_H = 1080;

function cappedSize() {
  const w = Math.min(window.innerWidth, MAX_W);
  const h = Math.min(window.innerHeight, MAX_H);
  return { width: w, height: h };
}

const { width, height } = cappedSize();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-root',
  backgroundColor: '#1b3014',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width,
    height,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [BootScene, MenuScene, RunScene],
});

window.addEventListener('resize', () => {
  const s = cappedSize();
  game.scale.resize(s.width, s.height);
});

export default game;
