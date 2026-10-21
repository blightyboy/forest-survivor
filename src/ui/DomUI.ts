import { formatNum } from '../core/math';
import { BUILD_VERSION } from '../core/math';
import { xpNeeded, UPGRADES, RES_LABEL } from '../data/constants';
import { WEAPON_DEFS } from '../data/weapons';
import { PASSIVE_DEFS, BONUS_DEFS, type LevelUpCard } from '../data/passives';
import { ELEMENTS } from '../data/constants';
import { META_UPGRADES, type MetaProgress, type MetaUpgradeId } from '../meta/Meta';
import type { RunPlayer } from '../run/RunTypes';
import type { CampSystem } from '../systems/CampSystem';
import type { DayNightSystem } from '../systems/DayNightSystem';
import type { ArsenalSystem } from '../systems/ArsenalSystem';

export class DomUI {
  root: HTMLElement;
  hudEl: HTMLElement;
  pauseEl: HTMLElement;
  cardsEl: HTMLElement;
  shopEl: HTMLElement;
  metaEl: HTMLElement;
  gameOverEl: HTMLElement;
  menuEl: HTMLElement;
  tipEl: HTMLElement;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fpsDisplay = 60;

  onCardPick?: (card: LevelUpCard) => void;
  onCardBanish?: (card: LevelUpCard) => void;
  onCardReroll?: () => void;
  onResume?: () => void;
  onQuitRun?: () => void;
  onMenuPlay?: () => void;
  onMenuMeta?: () => void;
  onMenuMute?: () => void;
  onMenuQuit?: () => void;
  onUpgradeCamp?: (id: string) => void;
  onBuyShop?: (index: number) => void;

  constructor() {
    const root = document.getElementById('dom-ui');
    if (!root) throw new Error('#dom-ui not found');
    this.root = root;
    root.innerHTML = '';
    this.hudEl = this.mk('div', 'fs-hud');
    this.pauseEl = this.mk('div', 'fs-overlay hidden interactive');
    this.cardsEl = this.mk('div', 'fs-overlay hidden interactive');
    this.shopEl = this.mk('div', 'fs-overlay hidden interactive');
    this.metaEl = this.mk('div', 'fs-overlay hidden interactive');
    this.gameOverEl = this.mk('div', 'fs-overlay hidden interactive');
    this.menuEl = this.mk('div', 'fs-overlay interactive');
    this.tipEl = this.mk('div', 'fs-tip');
    root.append(this.hudEl, this.pauseEl, this.cardsEl, this.shopEl, this.metaEl, this.gameOverEl, this.menuEl, this.tipEl);
    this.buildHud();
    this.showMainMenu();
  }

  private mk(tag: string, cls: string) {
    const el = document.createElement(tag);
    el.className = cls;
    return el;
  }

  private buildHud() {
    this.hudEl.innerHTML = `
      <div class="fs-panel">
        <div>HP <strong id="hud-hp-text">100/100</strong></div>
        <div class="fs-bar" id="hud-hp-bar"><span style="width:100%"></span></div>
        <div style="margin-top:6px">Lv <strong id="hud-lvl">1</strong> · XP <span id="hud-xp">0</span></div>
        <div class="fs-bar" id="hud-xp-bar"><span style="width:0%"></span></div>
      </div>
      <div class="fs-panel fs-resources">
        <div>🪵<strong id="hud-wood">0</strong></div>
        <div>🥩<strong id="hud-meat">0</strong></div>
        <div>🪙<strong id="hud-gold">0</strong></div>
      </div>
      <div class="fs-panel fs-time">
        <div id="hud-clock">Day 1</div>
        <div class="fs-fps" id="hud-fps">60 FPS</div>
      </div>
    `;
  }

  showMainMenu(muted = false) {
    const updateBadge = window.jungleUpdate?.pending
      ? '<span class="fs-badge">Update available</span>'
      : '';
    this.menuEl.classList.remove('hidden');
    this.menuEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h1>Forest Survivor</h1>
        <p>Chop, hunt, and fortify your camp through endless forest nights.</p>
        <p style="font-size:12px">v${BUILD_VERSION} ${updateBadge}</p>
        <button class="fs-btn primary" id="btn-play">Play</button>
        <button class="fs-btn" id="btn-meta">Meta</button>
        <button class="fs-btn" id="btn-mute">${muted ? 'Unmute' : 'Mute'}</button>
        <button class="fs-btn danger" id="btn-quit">Quit</button>
      </div>
    `;
    this.menuEl.querySelector('#btn-play')?.addEventListener('click', () => this.onMenuPlay?.());
    this.menuEl.querySelector('#btn-meta')?.addEventListener('click', () => this.onMenuMeta?.());
    this.menuEl.querySelector('#btn-mute')?.addEventListener('click', () => this.onMenuMute?.());
    this.menuEl.querySelector('#btn-quit')?.addEventListener('click', () => this.onMenuQuit?.());
  }

  hideMainMenu() {
    this.menuEl.classList.add('hidden');
  }

  showMetaMenu(meta: MetaProgress, onBack: () => void) {
    this.metaEl.classList.remove('hidden');
    const rows = META_UPGRADES.map((u) => {
      const lv = meta.levels[u.id] || 0;
      const cost = meta.costOf(u.id);
      const maxed = lv >= u.max;
      return `
        <div class="fs-meta-row">
          <div><strong>${u.name}</strong> (${lv}/${u.max})<br><small>${u.desc}</small></div>
          <button class="fs-btn" data-id="${u.id}" ${!meta.canBuy(u.id) ? 'disabled' : ''}>
            ${maxed ? 'MAX' : cost + ' cr'}
          </button>
        </div>`;
    }).join('');
    this.metaEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h2>Meta Upgrades</h2>
        <p>Credits: <strong>${formatNum(meta.credits)}</strong> · Runs: ${meta.runs} · Best day: ${meta.bestDay}</p>
        ${rows}
        <button class="fs-btn" id="meta-back">Back</button>
      </div>
    `;
    this.metaEl.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        if (meta.buy(id as MetaUpgradeId)) this.showMetaMenu(meta, onBack);
      });
    });
    this.metaEl.querySelector('#meta-back')?.addEventListener('click', () => {
      this.metaEl.classList.add('hidden');
      onBack();
    });
  }

  hideMeta() {
    this.metaEl.classList.add('hidden');
  }

  updateHud(player: RunPlayer, day: DayNightSystem, camp: CampSystem, dt: number) {
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fpsDisplay = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
    const hpT = document.getElementById('hud-hp-text');
    const hpBar = document.querySelector('#hud-hp-bar span') as HTMLElement;
    const hpWrap = document.getElementById('hud-hp-bar');
    if (hpT) hpT.textContent = `${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)}`;
    const hpFrac = player.maxHp > 0 ? player.hp / player.maxHp : 0;
    if (hpBar) hpBar.style.width = `${hpFrac * 100}%`;
    if (hpWrap) hpWrap.classList.toggle('hp-low', hpFrac < 0.3);

    const lvl = document.getElementById('hud-lvl');
    const xpT = document.getElementById('hud-xp');
    const xpBar = document.querySelector('#hud-xp-bar span') as HTMLElement;
    if (lvl) lvl.textContent = String(player.level);
    const need = xpNeeded(player.level);
    if (xpT) xpT.textContent = `${Math.floor(player.xp)}/${need}`;
    if (xpBar) xpBar.style.width = `${(player.xp / need) * 100}%`;

    const setRes = (id: string, v: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNum(v);
    };
    setRes('hud-wood', player.wood);
    setRes('hud-meat', player.meat);
    setRes('hud-gold', player.gold);

    const clock = document.getElementById('hud-clock');
    if (clock) clock.textContent = day.formatClock() + (day.isNight ? ' 🌙' : ' ☀');
    const fps = document.getElementById('hud-fps');
    if (fps) fps.textContent = `${this.fpsDisplay} FPS · Camp ${Math.ceil(camp.hp)}/${camp.maxHp}`;
  }

  showPause(player: RunPlayer, arsenal: ArsenalSystem, onResume: () => void) {
    this.pauseEl.classList.remove('hidden');
    const weapons = arsenal.weaponOrder
      .map((id) => `${WEAPON_DEFS[id as keyof typeof WEAPON_DEFS]?.name || id} Lv${arsenal.weapons[id]}`)
      .join(', ') || 'None';
    const passives = Object.keys(arsenal.passives)
      .filter((k) => arsenal.passives[k])
      .map((k) => `${PASSIVE_DEFS[k]?.name || k} ${arsenal.passives[k]}`)
      .join(', ') || 'None';
    this.pauseEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h2>Paused</h2>
        <p><strong>Weapons:</strong> ${weapons}</p>
        <p><strong>Passives:</strong> ${passives}</p>
        <p>HP ${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)} · Kills ${player.kills}</p>
        <button class="fs-btn primary" id="pause-resume">Resume (Esc)</button>
        <button class="fs-btn danger" id="pause-quit">Abandon Run</button>
      </div>
    `;
    this.pauseEl.querySelector('#pause-resume')?.addEventListener('click', onResume);
    this.pauseEl.querySelector('#pause-quit')?.addEventListener('click', () => this.onQuitRun?.());
  }

  hidePause() {
    this.pauseEl.classList.add('hidden');
  }

  showLevelUpCards(cards: LevelUpCard[], rerolls: number, banishes: number) {
    this.cardsEl.classList.remove('hidden');
    const cardHtml = cards
      .map((c, i) => {
        const label = this.cardLabel(c);
        return `<button class="fs-card" data-i="${i}"><div class="title">${label.title}</div><div class="desc">${label.desc}</div></button>`;
      })
      .join('');
    this.cardsEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h2>Level Up!</h2>
        <p>Choose an upgrade</p>
        <div class="fs-cards">${cardHtml}</div>
        <button class="fs-btn" id="card-reroll" ${rerolls <= 0 ? 'disabled' : ''}>Reroll (${rerolls})</button>
        <p style="font-size:11px">Banishes remaining: ${banishes}</p>
      </div>
    `;
    this.cardsEl.querySelectorAll('.fs-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt((btn as HTMLElement).dataset.i!, 10);
        this.onCardPick?.(cards[i]);
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const i = parseInt((btn as HTMLElement).dataset.i!, 10);
        this.onCardBanish?.(cards[i]);
      });
    });
    this.cardsEl.querySelector('#card-reroll')?.addEventListener('click', () => this.onCardReroll?.());
  }

  hideLevelUp() {
    this.cardsEl.classList.add('hidden');
  }

  cardLabel(c: LevelUpCard) {
    if (c.kind === 'weapon') {
      const def = WEAPON_DEFS[c.id as keyof typeof WEAPON_DEFS];
      return { title: `${def?.name || c.id} → Lv ${c.level}`, desc: def?.text[c.level - 1] || 'Upgrade weapon' };
    }
    if (c.kind === 'passive') {
      const p = PASSIVE_DEFS[c.id];
      return { title: `${p?.name || c.id} Lv ${c.level}`, desc: p?.desc || '' };
    }
    if (c.kind === 'element') {
      const el = c.element && ELEMENTS[c.element];
      return { title: `${el?.name || c.element} infusion`, desc: `Infuse ${WEAPON_DEFS[c.id as keyof typeof WEAPON_DEFS]?.name || c.id}` };
    }
    const b = BONUS_DEFS[c.id];
    return { title: b?.name || c.id, desc: b?.desc || '' };
  }

  showGameOver(stats: { day: number; level: number; kills: number; credits: number }, onMenu: () => void) {
    this.gameOverEl.classList.remove('hidden');
    this.gameOverEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h2>Run Over</h2>
        <p>Survived to day <strong>${stats.day}</strong> · Level <strong>${stats.level}</strong> · <strong>${stats.kills}</strong> kills</p>
        <p>Earned <strong>${stats.credits}</strong> meta credits</p>
        <button class="fs-btn primary" id="go-menu">Main Menu</button>
      </div>
    `;
    this.gameOverEl.querySelector('#go-menu')?.addEventListener('click', onMenu);
  }

  hideGameOver() {
    this.gameOverEl.classList.add('hidden');
  }

  showCampShop(camp: CampSystem, player: RunPlayer) {
    this.shopEl.classList.remove('hidden');
    const upgrades = UPGRADES.slice(0, 6)
      .map((u) => {
        const cost = camp.upgradeCost(u.id);
        const costStr = Object.entries(cost)
          .map(([k, v]) => `${v} ${RES_LABEL[k] || k}`)
          .join(', ');
        return `<button class="fs-btn" data-up="${u.id}">${u.name} (${costStr || '—'})</button>`;
      })
      .join('');
    const items = camp.shopStock
      .map((it, i) => `<button class="fs-btn" data-shop="${i}">${it.name} — ${it.price.gold || 0}g</button>`)
      .join('');
    this.shopEl.innerHTML = `
      <div class="fs-panel fs-modal interactive">
        <h2>Camp (B)</h2>
        <p>Wood ${player.wood} · Meat ${player.meat} · Gold ${player.gold}</p>
        <h3>Upgrades</h3>${upgrades}
        <h3>Blacksmith</h3>${items || '<p>No forge or empty stock</p>'}
        <button class="fs-btn" id="shop-close">Close</button>
      </div>
    `;
    this.shopEl.querySelectorAll('[data-up]').forEach((b) => {
      b.addEventListener('click', () => this.onUpgradeCamp?.((b as HTMLElement).dataset.up!));
    });
    this.shopEl.querySelectorAll('[data-shop]').forEach((b) => {
      b.addEventListener('click', () => this.onBuyShop?.(parseInt((b as HTMLElement).dataset.shop!, 10)));
    });
    this.shopEl.querySelector('#shop-close')?.addEventListener('click', () => this.hideCampShop());
  }

  hideCampShop() {
    this.shopEl.classList.add('hidden');
  }

  setTip(text: string) {
    this.tipEl.textContent = text;
  }

  isModalOpen() {
    return !this.pauseEl.classList.contains('hidden')
      || !this.cardsEl.classList.contains('hidden')
      || !this.shopEl.classList.contains('hidden')
      || !this.gameOverEl.classList.contains('hidden');
  }
}
