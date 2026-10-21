import Phaser from 'phaser';
import { DomUI } from '../ui/DomUI';
import { meta } from '../meta/Meta';
import { Audio } from '../audio/Audio';

export class MenuScene extends Phaser.Scene {
  ui!: DomUI;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.ui = new DomUI();
    this.wireMenu();
  }

  wireMenu() {
    const ui = this.ui;
    ui.onMenuPlay = () => {
      Audio.unlock();
      ui.hideMainMenu();
      ui.hideMeta();
      ui.hideGameOver();
      this.scene.start('RunScene');
    };
    ui.onMenuMeta = () => {
      ui.showMetaMenu(meta, () => ui.showMainMenu(Audio.muted));
    };
    ui.onMenuMute = () => {
      Audio.setMuted(!Audio.muted);
      ui.showMainMenu(Audio.muted);
    };
    ui.onMenuQuit = () => {
      if (window.jungleSave?.quit) window.jungleSave.quit();
      else window.close();
    };
    ui.showMainMenu(Audio.muted);
    ui.setTip('WASD move · Shift/Space dash · Esc pause · B camp shop');
  }
}
