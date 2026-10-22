import Phaser from 'phaser';
import { DomUI } from '../ui/DomUI';
import { meta } from '../meta/Meta';
import { Audio } from '../audio/Audio';
import { Music } from '../audio/Music';
import { settings } from '../meta/Settings';

export class MenuScene extends Phaser.Scene {
  ui!: DomUI;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.ui = new DomUI();
    this.wireMenu();
    Audio.unlock();
    Music.setVolume(settings.musicVolume);
    Music.sync({ state: 'menu' });
  }

  update() {
    Music.sync({ state: 'menu' });
  }

  wireMenu() {
    const ui = this.ui;
    ui.onMenuPlay = () => {
      Audio.unlock();
      ui.hideMainMenu();
      ui.hideMeta();
      ui.hideGameOver();
      this.scene.start('RunScene', { continue: false });
    };
    ui.onMenuContinue = () => {
      Audio.unlock();
      ui.hideMainMenu();
      ui.hideMeta();
      ui.hideGameOver();
      this.scene.start('RunScene', { continue: true });
    };
    ui.onMenuMeta = () => {
      ui.showMetaMenu(meta);
    };
    ui.onMenuQuit = () => {
      if (window.forestSave?.quit) window.forestSave.quit();
      else window.close();
    };
    ui.showMainMenu(Audio.muted);
  }
}
