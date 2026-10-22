import Phaser from 'phaser';
import { bakeAllTextures } from '../art/bakeTextures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    bakeAllTextures(this);
    this.scene.start('MenuScene');
  }
}
