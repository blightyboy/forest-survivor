import Phaser from 'phaser';
import { SPECIES, animalFamily, type SpeciesId } from '../data/animals';
import { bakeGroundTileCanvas } from './ground';
import { drawTreeBaked } from './draw/treeBake';
import { drawBushBaked, drawRockBaked } from './draw/propBake';
import {
  drawBlacksmithBaked,
  drawButcherBaked,
  drawCampBaked,
  drawCampfireBaked,
  drawMillBaked,
  drawMineBaked,
  drawTowerBaked,
  drawWallPostBaked,
} from './draw/buildingBake';
import { drawAuraRing, drawSpikesRing } from './draw/weaponDraw';
import { ELEMENT_IDS, type ElementId } from '../data/constants';
import { weaponDrawStyle } from '../data/weapons';

const OUTLINE = '#2a1b12';

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return [el, ctx];
}

function register(scene: Phaser.Scene, key: string, el: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, el);
  // WebGL needs an explicit upload after canvas draws.
  if (tex && typeof (tex as Phaser.Textures.CanvasTexture).refresh === 'function') {
    (tex as Phaser.Textures.CanvasTexture).refresh();
  }
}

function ellipsePath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

function fillStroke(ctx: Ctx, fill: string, lw = 2) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawShadow(ctx: Ctx, cx: number, footY: number, rx: number, ry: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipsePath(ctx, cx, footY + 2, rx, ry);
  ctx.fill();
}

function bakePlayer(scene: Phaser.Scene) {
  const w = 56;
  const h = 64;
  const footY = h - 4;
  const cx = w / 2;
  const [el, ctx] = canvas(w, h);

  drawShadow(ctx, cx, footY, 14, 5.5);

  const skin = '#f2c29a';
  const shirt = '#c8312b';
  const shirtDark = '#9c2420';
  const pants = '#3e5f95';
  const boot = '#4a2c17';

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;

  // back leg
  roundRectPath(ctx, cx - 7, footY - 14, 5, 14, 2);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();
  roundRectPath(ctx, cx - 8, footY - 5, 7, 5, 2);
  ctx.fillStyle = boot;
  ctx.fill();
  ctx.stroke();

  // front leg
  roundRectPath(ctx, cx + 1, footY - 14, 5, 14, 2);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();
  roundRectPath(ctx, cx, footY - 5, 7, 5, 2);
  ctx.fillStyle = boot;
  ctx.fill();
  ctx.stroke();

  // torso
  roundRectPath(ctx, cx - 10, footY - 36, 20, 22, 5);
  ctx.fillStyle = shirt;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shirtDark;
  ctx.fillRect(cx - 9, footY - 34, 8, 18);
  ctx.fillRect(cx + 1, footY - 28, 8, 12);

  // head
  ellipsePath(ctx, cx + 2, footY - 44, 8, 9);
  ctx.fillStyle = skin;
  fillStroke(ctx, skin, 2);
  ellipsePath(ctx, cx - 5, footY - 42, 2.2, 3);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ellipsePath(ctx, cx + 5, footY - 45, 1.6, 1.8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ellipsePath(ctx, cx + 5.4, footY - 45.6, 0.5, 0.5);
  ctx.fill();

  // front arm
  roundRectPath(ctx, cx + 8, footY - 32, 4, 14, 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // axe on back
  ctx.save();
  ctx.translate(cx - 12, footY - 30);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#6b4022';
  roundRectPath(ctx, -2, -2, 4, 18, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8bcc0';
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(10, 2);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  register(scene, 'player', el);
}

function bakeCamp(scene: Phaser.Scene) {
  const [el, ctx] = canvas(140, 150);
  ctx.translate(70, 140);
  drawCampBaked(ctx);
  register(scene, 'camp', el);
}

function bakeTower(scene: Phaser.Scene) {
  const [el, ctx] = canvas(72, 130);
  ctx.translate(36, 124);
  drawTowerBaked(ctx);
  register(scene, 'tower', el);
}

function bakeWall(scene: Phaser.Scene) {
  {
    const [el, ctx] = canvas(56, 24);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, 2, 4, 52, 16, 3);
    ctx.fillStyle = '#7d5a3a';
    ctx.fill();
    ctx.stroke();
    register(scene, 'wall', el);
  }
  {
    const [el, ctx] = canvas(28, 52);
    ctx.translate(14, 48);
    drawWallPostBaked(ctx, false);
    register(scene, 'wall_post', el);
  }
  {
    const [el, ctx] = canvas(28, 52);
    ctx.translate(14, 48);
    drawWallPostBaked(ctx, true);
    register(scene, 'wall_post_stone', el);
  }
}

function bakeBuildings(scene: Phaser.Scene) {
  {
    // Stones + shadow sit ~10px below the foot origin; keep headroom for the flame.
    const [el, ctx] = canvas(64, 66);
    ctx.translate(32, 54);
    drawCampfireBaked(ctx);
    register(scene, 'bld_campfire', el);
  }
  {
    const [el, ctx] = canvas(110, 80);
    ctx.translate(55, 72);
    drawMillBaked(ctx);
    register(scene, 'bld_mill', el);
  }
  {
    const [el, ctx] = canvas(80, 72);
    ctx.translate(40, 66);
    drawMineBaked(ctx);
    register(scene, 'bld_mine', el);
  }
  {
    const [el, ctx] = canvas(72, 68);
    ctx.translate(36, 62);
    drawButcherBaked(ctx);
    register(scene, 'bld_butcher', el);
  }
  {
    const [el, ctx] = canvas(80, 72);
    ctx.translate(40, 66);
    drawBlacksmithBaked(ctx);
    register(scene, 'bld_blacksmith', el);
  }
}

function bakePickups(scene: Phaser.Scene) {
  const bake = (key: string, draw: (ctx: Ctx, cx: number, cy: number) => void, size = 32) => {
    const [el, ctx] = canvas(size, size);
    draw(ctx, size / 2, size / 2);
    register(scene, key, el);
  };

  // Legacy entities.js Pickup.draw — wood / meat / gold / xp
  bake('pickup_wood', (ctx, cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    roundRectPath(ctx, -11, -4.5, 20, 9, 4);
    ctx.fillStyle = '#9c6a3c';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = '#6e4524';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -1.5);
    ctx.lineTo(3, -1.5);
    ctx.moveTo(-5, 1.8);
    ctx.lineTo(5, 1.8);
    ctx.stroke();
    ellipsePath(ctx, 9, 0, 3.5, 4.5);
    ctx.fillStyle = '#e8bb80';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = '#b07a42';
    ctx.lineWidth = 0.9;
    ellipsePath(ctx, 9, 0, 1.6, 2.2);
    ctx.stroke();
    ctx.restore();
  });

  bake('pickup_meat', (ctx, cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.5);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(11, 0);
    ctx.stroke();
    ctx.strokeStyle = '#f4ecd8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(11, 0);
    ctx.stroke();
    ctx.fillStyle = '#f4ecd8';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ellipsePath(ctx, 12, -2.2, 2.4, 2.4);
    ctx.fill();
    ctx.stroke();
    ellipsePath(ctx, 12, 2.2, 2.4, 2.4);
    ctx.fill();
    ctx.stroke();
    ellipsePath(ctx, -3, 0, 9, 7);
    ctx.fillStyle = '#c4553e';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#e07a5f';
    ellipsePath(ctx, -5, -2.2, 4.5, 2.6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipsePath(ctx, -6, -3, 1.6, 1);
    ctx.fill();
    ctx.restore();
  });

  bake('pickup_gold', (ctx, cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    ellipsePath(ctx, 0, 0, 7, 7);
    ctx.fillStyle = '#f5c242';
    ctx.fill();
    ctx.strokeStyle = '#8a5d00';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ellipsePath(ctx, 0, 0, 4.5, 4.5);
    ctx.strokeStyle = '#c9901a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#fff4c2';
    ellipsePath(ctx, -2, -2.5, 1.6, 1.2);
    ctx.fill();
    ctx.restore();
  });

  bake('pickup_xp', (ctx, cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-5.5, 0);
    ctx.closePath();
    ctx.fillStyle = '#7ee0ff';
    ctx.fill();
    ctx.strokeStyle = '#1a5a78';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3.2, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-3.2, 0);
    ctx.closePath();
    ctx.fillStyle = '#e8fbff';
    ctx.fill();
    ctx.restore();
  });

  // Healing heart drop (Crimson Charm).
  bake('pickup_heart', (ctx, cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(255,90,122,0.3)';
    ellipsePath(ctx, 0, 0, 13, 13);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-10, 1, -6, -8, 0, -3);
    ctx.bezierCurveTo(6, -8, 10, 1, 0, 7);
    ctx.closePath();
    ctx.fillStyle = '#ff5a7a';
    ctx.fill();
    ctx.strokeStyle = '#5a1214';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffb3b5';
    ellipsePath(ctx, -3.2, -2.5, 2.2, 1.5);
    ctx.fill();
    ctx.restore();
  }, 36);

  // Legacy entities.js powerup icons (glow + dark plate + glyph).
  const powerColors: Record<string, string> = {
    magnet: '#ff6b6b',
    fury: '#ff8a3d',
    vital: '#9ef08a',
    haste: '#7fd3ff',
    hearts: '#ff5a7a',
    nuke: '#ffe066',
  };
  for (const [id, c] of Object.entries(powerColors)) {
    bake(`pickup_${id}`, (ctx, cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.28;
      ellipsePath(ctx, 0, 0, 14, 14);
      ctx.fill();
      ctx.globalAlpha = 1;
      roundRectPath(ctx, -9, -9, 18, 18, 5);
      ctx.fillStyle = '#1a1208';
      ctx.fill();
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      if (id === 'magnet') {
        ctx.fillRect(-5, -6, 3.5, 8);
        ctx.fillRect(1.5, -6, 3.5, 8);
        ctx.beginPath();
        ctx.arc(0, 2, 7, 0.15, Math.PI - 0.15);
        ctx.lineWidth = 3.2;
        ctx.stroke();
      } else if (id === 'fury') {
        ctx.beginPath();
        ctx.moveTo(-1, -7);
        ctx.lineTo(4, -1);
        ctx.lineTo(0, -1);
        ctx.lineTo(2, 7);
        ctx.lineTo(-5, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'vital') {
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(-9, 0, -5, -7, 0, -3);
        ctx.bezierCurveTo(5, -7, 9, 0, 0, 6);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'haste') {
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(2, -5);
        ctx.lineTo(-1, 0);
        ctx.lineTo(6, 0);
        ctx.lineTo(-2, 7);
        ctx.lineTo(1, 1);
        ctx.lineTo(-6, 1);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'hearts') {
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(-9, 0, -5, -7, 0, -3);
        ctx.bezierCurveTo(5, -7, 9, 0, 0, 6);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'nuke') {
        ellipsePath(ctx, 0, 0, 6.5, 6.5);
        ctx.fill();
        ctx.fillStyle = '#fff4c2';
        ellipsePath(ctx, 0, 0, 3.2, 3.2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
          ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
          ctx.stroke();
        }
      }
      ctx.restore();
    }, 40);
  }
}

function bakeAxes(scene: Phaser.Scene) {
  const drawAxe = (scale: number) => {
    const w = Math.round(32 * scale);
    const h = Math.round(40 * scale);
    const [el, ctx] = canvas(w, h);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = scale < 1 ? '#6b4022' : '#8b4513';
    roundRectPath(ctx, w * 0.46, h * 0.35, w * 0.12, h * 0.55, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = scale < 1 ? '#d4d8dc' : '#c0c4c8';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.1);
    ctx.lineTo(w * 0.92, h * 0.35);
    ctx.lineTo(w * 0.5, h * 0.42);
    ctx.lineTo(w * 0.08, h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return el;
  };
  register(scene, 'axe', drawAxe(1));
  register(scene, 'hatchet', drawAxe(0.75));

  // Falling hammer (Hammerfall)
  {
    const [el, ctx] = canvas(28, 36);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    // head
    roundRectPath(ctx, 3, 4, 22, 12, 2);
    ctx.fillStyle = '#6a7076';
    ctx.fill();
    ctx.stroke();
    // handle
    roundRectPath(ctx, 11, 14, 6, 18, 1.5);
    ctx.fillStyle = '#8a5a2e';
    ctx.fill();
    ctx.stroke();
    register(scene, 'hammer', el);
  }

  // Longbow arrow (heavier / longer than crossbow bolt)
  {
    const [el, ctx] = canvas(36, 10);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#6b4022';
    roundRectPath(ctx, 4, 3, 22, 4, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    ctx.beginPath();
    ctx.moveTo(26, 5);
    ctx.lineTo(34, 1);
    ctx.lineTo(34, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.moveTo(4, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(2, 5);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();
    register(scene, 'arrow', el);
  }

  // Crossbow / longbow bolt
  {
    const [el, ctx] = canvas(28, 10);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#6b4022';
    roundRectPath(ctx, 2, 3, 18, 4, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    ctx.beginPath();
    ctx.moveTo(20, 5);
    ctx.lineTo(26, 1);
    ctx.lineTo(26, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    register(scene, 'bolt', el);
  }
  // Knife
  {
    const [el, ctx] = canvas(24, 12);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#8a5a2e';
    roundRectPath(ctx, 2, 4, 8, 4, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dfe7ec';
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.lineTo(22, 2);
    ctx.lineTo(22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    register(scene, 'knife', el);
  }
  // Pike
  {
    const [el, ctx] = canvas(40, 10);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#9a6232';
    roundRectPath(ctx, 2, 3, 26, 4, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    ctx.beginPath();
    ctx.moveTo(28, 5);
    ctx.lineTo(38, 1);
    ctx.lineTo(38, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    register(scene, 'pike', el);
  }
  // Saw disc
  {
    const [el, ctx] = canvas(28, 28);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ellipsePath(ctx, 14, 14, 12, 12);
    ctx.fillStyle = '#c3ced6';
    ctx.fill();
    ctx.stroke();
    ellipsePath(ctx, 14, 14, 3, 3);
    ctx.fillStyle = '#5d6b75';
    ctx.fill();
    register(scene, 'saw', el);
  }
  // Dynamite
  {
    const [el, ctx] = canvas(16, 28);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, 4, 6, 8, 18, 2);
    ctx.fillStyle = '#e5484d';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(4, 12, 8, 4);
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.quadraticCurveTo(14, 2, 14, 0);
    ctx.stroke();
    register(scene, 'dynamite', el);
  }
  // Guard dog (fallback bake — runtime dogs use drawGuardDog with infusion skins)
  {
    const [el, ctx] = canvas(56, 40);
    drawShadow(ctx, 28, 34, 16, 5);
    ctx.save();
    ctx.translate(28, 30);
    // Inline compact silhouette mirroring drawGuardDog neutrals.
    ctx.fillStyle = '#c4a574';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ellipsePath(ctx, 0, 0, 12, 7.2);
    ctx.fill();
    ctx.stroke();
    ellipsePath(ctx, 13, -3.2, 7, 5.8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a6840';
    ellipsePath(ctx, 18.5, -1.6, 4.2, 2.8);
    ctx.fill();
    ctx.fillStyle = '#2a1b12';
    ellipsePath(ctx, 15.2, -4.6, 1.45, 1.45);
    ctx.fill();
    ctx.restore();
    register(scene, 'dog', el);
  }
  // Flame Ring — base + per-element forms (infusion skins).
  {
    const bakeAura = (key: string, element: ElementId | null, unique = false) => {
      const [el, ctx] = canvas(72, 72);
      ctx.translate(36, 36);
      const st = weaponDrawStyle(element, unique);
      drawAuraRing(ctx, element, { unique, style: st });
      register(scene, key, el);
    };
    bakeAura('aura_ring', null);
    for (const id of ELEMENT_IDS) {
      bakeAura(`aura_ring_${id}`, id as ElementId);
      bakeAura(`aura_ring_${id}_u`, id as ElementId, true);
    }
  }

  // Caltrop Ring — wooden base + elemental spike forms.
  {
    const bakeSpikes = (key: string, element: ElementId | null, unique = false) => {
      const [el, ctx] = canvas(140, 140);
      ctx.translate(70, 70);
      const st = weaponDrawStyle(element, unique);
      drawSpikesRing(ctx, element, { unique, style: st });
      register(scene, key, el);
    };
    bakeSpikes('spikes_ring', null);
    for (const id of ELEMENT_IDS) {
      bakeSpikes(`spikes_ring_${id}`, id as ElementId);
      bakeSpikes(`spikes_ring_${id}_u`, id as ElementId, true);
    }
  }
}

function bakeTrees(scene: Phaser.Scene) {
  // Legacy-style oak / pine (static bake).
  {
    const [el, ctx] = canvas(120, 140);
    ctx.translate(60, 132);
    drawTreeBaked(ctx, 'oak', 1.05, 42);
    register(scene, 'tree_oak', el);
  }
  {
    const [el, ctx] = canvas(120, 140);
    ctx.translate(60, 132);
    drawTreeBaked(ctx, 'pine', 1.05, 77);
    register(scene, 'tree_pine', el);
  }
  // Stump after a tree falls (legacy drawStump).
  {
    const [el, ctx] = canvas(40, 28);
    const tw = 14;
    ctx.translate(20, 24);
    ctx.fillStyle = '#6b4022';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -tw / 2, -7, tw, 8, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dcae74';
    ellipsePath(ctx, 0, -7, tw / 2, tw / 4.5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#a8703c';
    ctx.lineWidth = 1;
    ellipsePath(ctx, 0, -7, tw / 4, tw / 9);
    ctx.stroke();
    register(scene, 'tree_stump', el);
  }
  // Ground shadow ellipse (legacy Tree.drawShadow) — not baked into the trunk.
  {
    const [el, ctx] = canvas(80, 32);
    ctx.fillStyle = '#000000';
    ellipsePath(ctx, 40, 16, 32, 11);
    ctx.fill();
    register(scene, 'tree_shadow', el);
  }
}

function bakePois(scene: Phaser.Scene) {
  // Camp-scale landmarks (~cabin footprint). Feet at bottom; plenty of shadow pad.
  // Den — cave mound with glowing eyes.
  {
    const [el, ctx] = canvas(148, 130);
    ctx.translate(74, 112);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ellipsePath(ctx, 4, 4, 52, 18);
    ctx.fill();
    ctx.fillStyle = '#3a322c';
    ctx.beginPath();
    ctx.moveTo(-48, 0);
    ctx.quadraticCurveTo(-54, -42, 0, -72);
    ctx.quadraticCurveTo(54, -42, 48, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#2a221c';
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.quadraticCurveTo(-30, -28, 0, -38);
    ctx.quadraticCurveTo(30, -28, 36, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ellipsePath(ctx, 0, -18, 22, 14);
    ctx.fill();
    ctx.fillStyle = '#ff5a5f';
    ellipsePath(ctx, -10, -24, 5.5, 4);
    ctx.fill();
    ellipsePath(ctx, 10, -24, 5.5, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd0a0';
    ellipsePath(ctx, -9, -25, 2, 1.5);
    ctx.fill();
    ellipsePath(ctx, 11, -25, 2, 1.5);
    ctx.fill();
    register(scene, 'poi_den', el);
  }
  // Wagon — supply cart.
  {
    const [el, ctx] = canvas(150, 120);
    ctx.translate(75, 102);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipsePath(ctx, 0, 4, 54, 16);
    ctx.fill();
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-42, -58, 84, 48);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.strokeRect(-42, -58, 84, 48);
    ctx.fillStyle = '#a07038';
    ctx.fillRect(-42, -58, 84, 10);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-18, -46, 36, 22);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(-18, -46, 36, 22);
    ctx.fillStyle = '#4a3a2a';
    ellipsePath(ctx, -30, -4, 14, 14);
    ctx.fill();
    ellipsePath(ctx, 30, -4, 14, 14);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-30, -4, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(30, -4, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -4);
    ctx.lineTo(-30, -18);
    ctx.moveTo(30, -4);
    ctx.lineTo(30, -18);
    ctx.stroke();
    register(scene, 'poi_wagon', el);
  }
  // Shrine — tall stone + glow.
  {
    const [el, ctx] = canvas(120, 150);
    ctx.translate(60, 132);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipsePath(ctx, 0, 4, 40, 14);
    ctx.fill();
    ctx.fillStyle = '#7a848c';
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-30, -78);
    ctx.lineTo(0, -108);
    ctx.lineTo(30, -78);
    ctx.lineTo(24, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#9aa4ac';
    ctx.beginPath();
    ctx.moveTo(-12, -40);
    ctx.lineTo(0, -92);
    ctx.lineTo(12, -40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(168,230,255,0.9)';
    ellipsePath(ctx, 0, -64, 14, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,250,255,0.85)';
    ellipsePath(ctx, 0, -64, 6, 6);
    ctx.fill();
    register(scene, 'poi_shrine', el);
  }
  // Vein — large ore mound.
  {
    const [el, ctx] = canvas(140, 110);
    ctx.translate(70, 94);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipsePath(ctx, 4, 4, 48, 16);
    ctx.fill();
    ctx.fillStyle = '#5c646b';
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(-30, -42);
    ctx.lineTo(4, -58);
    ctx.lineTo(40, -32);
    ctx.lineTo(36, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#8b949b';
    ctx.beginPath();
    ctx.moveTo(-16, -20);
    ctx.lineTo(0, -48);
    ctx.lineTo(18, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd54a';
    for (const [ox, oy, s] of [[-12, -30, 10], [10, -42, 12], [0, -18, 9], [22, -24, 8]] as const) {
      ctx.beginPath();
      ctx.moveTo(ox, oy - s);
      ctx.lineTo(ox + s * 0.75, oy);
      ctx.lineTo(ox, oy + s * 0.7);
      ctx.lineTo(ox - s * 0.75, oy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9a6b00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    register(scene, 'poi_vein', el);
  }
}

function bakeProps(scene: Phaser.Scene) {
  // Several seeded variants — sprites pick by rock.variant / bush.variant.
  // Shadow sits ~r*0.45 below the foot origin; keep room so bases aren't clipped.
  for (let i = 0; i < 6; i++) {
    const [el, ctx] = canvas(64, 58);
    ctx.translate(32, 44);
    drawRockBaked(ctx, false, 1, 1000 + i * 97);
    register(scene, i === 0 ? 'rock' : `rock_${i}`, el);
  }
  for (let i = 0; i < 6; i++) {
    const [el, ctx] = canvas(64, 58);
    ctx.translate(32, 44);
    drawRockBaked(ctx, true, 1.05, 2000 + i * 91);
    register(scene, i === 0 ? 'rock_ore' : `rock_ore_${i}`, el);
  }
  for (let i = 0; i < 5; i++) {
    const [el, ctx] = canvas(52, 48);
    ctx.translate(26, 40);
    drawBushBaked(ctx, 1, 3000 + i * 113);
    register(scene, i === 0 ? 'bush' : `bush_${i}`, el);
  }

  bakePois(scene);

  const [fireEl, f] = canvas(52, 36);
  ellipsePath(f, 26, 30, 22, 10);
  f.fillStyle = 'rgba(255,106,61,0.35)';
  f.fill();
  f.strokeStyle = OUTLINE;
  f.lineWidth = 2;
  f.stroke();
  f.fillStyle = '#ff6a3d';
  f.beginPath();
  f.moveTo(26, 8);
  f.quadraticCurveTo(34, 18, 30, 28);
  f.quadraticCurveTo(26, 22, 22, 28);
  f.quadraticCurveTo(18, 18, 26, 8);
  f.fill();
  f.stroke();
  f.fillStyle = '#ffaa44';
  f.beginPath();
  f.moveTo(26, 14);
  f.quadraticCurveTo(30, 20, 26, 24);
  f.quadraticCurveTo(22, 20, 26, 14);
  f.fill();
  register(scene, 'fire_pool', fireEl);
}

function bakeParticle(scene: Phaser.Scene) {
  const [el, ctx] = canvas(10, 10);
  ellipsePath(ctx, 5, 5, 4, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  register(scene, 'particle', el);
}

function bakeLightCookie(scene: Phaser.Scene) {
  const size = 128;
  // Punch-out cookie for destination-out / RenderTexture.erase (legacy lightCookie).
  {
    const [el, ctx] = canvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    register(scene, 'light_cookie', el);
  }
  // Warm additive glow (legacy warmCookie).
  {
    const [el, ctx] = canvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,180,60,0.85)');
    g.addColorStop(0.4, 'rgba(255,120,40,0.35)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    register(scene, 'warm_cookie', el);
  }
}

function bakeGround(scene: Phaser.Scene) {
  register(scene, 'ground_tile', bakeGroundTileCanvas());
}

function drawAnimalBody(
  ctx: Ctx,
  species: SpeciesId,
  footY: number,
  cx: number,
) {
  const sp = SPECIES[species];
  const family = animalFamily(species);
  const body = sp.color;
  const dark = sp.shade || '#3a2214';
  const light = sp.belly || 'rgba(255,255,255,0.25)';
  const r = sp.radius;

  drawShadow(ctx, cx, footY, r * 0.85, r * 0.32);

  ctx.save();
  ctx.translate(cx, footY);

  const leg = (x: number, w: number, h: number, c: string) => {
    roundRectPath(ctx, x, -h, w, h, 1.5);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };

  if (family === 'boar') {
    leg(-11, 4, 10, dark);
    leg(7, 4, 10, dark);
    ellipsePath(ctx, 0, -15, 19, 11);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 15, -14, 10, 8.5);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 26, -12, 4, 4);
    ctx.fillStyle = '#e3a089';
    fillStroke(ctx, '#e3a089', 1.5);
    ctx.beginPath();
    ctx.moveTo(19, -7);
    ctx.quadraticCurveTo(24, -8, 23, -15);
    ctx.lineTo(21, -8);
    ctx.closePath();
    ctx.fillStyle = '#fffbe8';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ellipsePath(ctx, 17, -16, 1.8, 1.9);
    ctx.fill();
  } else if (family === 'wolf') {
    leg(-10, 3.5, 12, dark);
    leg(7, 3.5, 12, dark);
    ctx.save();
    ctx.translate(-14, -17);
    ctx.rotate(0.55);
    ellipsePath(ctx, -9, 0, 11, 4.2);
    fillStroke(ctx, body, 1.6);
    ctx.restore();
    ellipsePath(ctx, 0, -17, 16, 8.5);
    fillStroke(ctx, body, 2);
    ctx.fillStyle = light as string;
    ellipsePath(ctx, 1, -12.5, 11, 3.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -23.5);
    ctx.lineTo(28, -19.5);
    ctx.lineTo(27, -16);
    ctx.lineTo(17, -16.5);
    ctx.closePath();
    ctx.fillStyle = typeof light === 'string' ? light : '#bcc3ca';
    fillStroke(ctx, typeof light === 'string' ? light : '#bcc3ca', 1.5);
    ellipsePath(ctx, 15, -21, 7, 6);
    fillStroke(ctx, body, 1.8);
    ctx.fillStyle = '#ffd23f';
    ellipsePath(ctx, 16.5, -21.5, 1.8, 1.5);
    ctx.fill();
  } else if (family === 'bear') {
    leg(-15, 7, 13, dark);
    leg(9, 7, 13, dark);
    ellipsePath(ctx, 0, -21, 24, 15);
    fillStroke(ctx, body, 2.2);
    ellipsePath(ctx, -5, -31, 13, 7);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 20, -25, 11, 10);
    fillStroke(ctx, body, 2);
    ctx.fillStyle = sp.belly || '#c69c6d';
    ellipsePath(ctx, 24, -22, 5, 4);
    ctx.fill();
    ctx.stroke();
    for (const ex of [14, 23]) {
      ellipsePath(ctx, ex, -34.5, 4.2, 4.2);
      fillStroke(ctx, dark, 1.5);
    }
  } else if (species === 'deer') {
    leg(-8, 3, 18, '#8a6040');
    leg(6, 3, 18, '#8a6040');
    ellipsePath(ctx, 0, -14, 14, 9);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 12, -18, 7, 6);
    fillStroke(ctx, body, 2);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -38);
    ctx.lineTo(10, -52);
    ctx.moveTo(12, -38);
    ctx.lineTo(16, -54);
    ctx.moveTo(14, -38);
    ctx.lineTo(18, -50);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ellipsePath(ctx, 14, -19, 1.6, 1.6);
    ctx.fill();
  } else if (species === 'fox') {
    leg(-7, 3, 11, dark);
    leg(5, 3, 11, dark);
    ellipsePath(ctx, 0, -12, 13, 8);
    fillStroke(ctx, body, 2);
    ctx.beginPath();
    ctx.moveTo(10, -14);
    ctx.lineTo(22, -12);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    fillStroke(ctx, '#fff', 1.5);
    ellipsePath(ctx, 14, -15, 6, 5.5);
    fillStroke(ctx, body, 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.lineTo(22, -24);
    ctx.lineTo(20, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ellipsePath(ctx, 16, -15, 1.5, 1.5);
    ctx.fill();
    ctx.save();
    ctx.translate(-12, -14);
    ctx.rotate(-0.4);
    ellipsePath(ctx, 0, 0, 10, 5);
    fillStroke(ctx, body, 1.5);
    ctx.restore();
  } else if (species === 'squirrel') {
    leg(-4, 2.5, 7, dark);
    leg(3, 2.5, 7, dark);
    ellipsePath(ctx, 0, -10, 9, 7);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 8, -12, 5, 5);
    fillStroke(ctx, body, 2);
    ctx.save();
    ctx.translate(-8, -12);
    ctx.rotate(0.8);
    ellipsePath(ctx, 0, 0, 12, 5);
    fillStroke(ctx, body, 1.5);
    ctx.restore();
  } else if (species === 'rat') {
    leg(-5, 2, 6, dark);
    leg(4, 2, 6, dark);
    ellipsePath(ctx, 0, -8, 10, 6);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 10, -9, 5, 4);
    fillStroke(ctx, body, 1.5);
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.quadraticCurveTo(-16, -6, -18, -2);
    ctx.stroke();
  } else if (species === 'raccoon') {
    leg(-6, 3, 9, '#4a4a4e');
    leg(5, 3, 9, '#4a4a4e');
    ellipsePath(ctx, 0, -12, 13, 8);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 12, -14, 7, 6.5);
    fillStroke(ctx, body, 2);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(10, -15, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ddd';
    ellipsePath(ctx, 14, -13, 2, 1.5);
    ctx.fill();
  } else if (species === 'duck') {
    leg(-4, 2, 8, '#c97820');
    leg(3, 2, 8, '#c97820');
    ellipsePath(ctx, 0, -10, 11, 7);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 10, -12, 6, 5);
    fillStroke(ctx, body, 2);
    ctx.fillStyle = '#e8a030';
    ctx.beginPath();
    ctx.moveTo(16, -11);
    ctx.lineTo(22, -10);
    ctx.lineTo(16, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (species === 'sheep') {
    leg(-6, 3, 10, '#bbb');
    leg(5, 3, 10, '#bbb');
    for (let i = 0; i < 5; i++) {
      const ox = -10 + i * 5;
      ellipsePath(ctx, ox, -14, 5, 5);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ellipsePath(ctx, 10, -16, 6, 6);
    fillStroke(ctx, '#333', 2);
    ctx.fillStyle = '#111';
    ellipsePath(ctx, 12, -16, 1.5, 1.5);
    ctx.fill();
  } else if (species === 'beaver') {
    leg(-6, 3, 9, dark);
    leg(5, 3, 9, dark);
    ellipsePath(ctx, 0, -12, 14, 9);
    fillStroke(ctx, body, 2);
    ellipsePath(ctx, 12, -14, 6, 5.5);
    fillStroke(ctx, body, 2);
    ctx.fillStyle = '#5a3820';
    roundRectPath(ctx, -18, -14, 8, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b4022';
    ellipsePath(ctx, 14, -10, 2, 1.5);
    ctx.fill();
  } else {
    ellipsePath(ctx, 0, -r * 0.6, r, r * 0.7);
    fillStroke(ctx, body, 2);
  }

  ctx.restore();
}

function bakeAnimal(scene: Phaser.Scene, species: SpeciesId) {
  const sp = SPECIES[species];
  const pad = 12;
  const w = Math.ceil(sp.radius * 2 + pad * 2 + 20);
  const h = Math.ceil((sp.height || 40) + pad + 16);
  const footY = h - pad;
  const cx = w / 2;
  const [el, ctx] = canvas(w, h);
  drawAnimalBody(ctx, species, footY, cx);
  register(scene, `animal_${species}`, el);
}

export function bakeAllTextures(scene: Phaser.Scene): void {
  bakeGround(scene);
  bakePlayer(scene);
  bakeCamp(scene);
  bakeTower(scene);
  bakeWall(scene);
  bakeBuildings(scene);
  bakePickups(scene);
  bakeAxes(scene);
  bakeTrees(scene);
  bakeProps(scene);
  bakeParticle(scene);
  bakeLightCookie(scene);
  for (const id of Object.keys(SPECIES) as SpeciesId[]) {
    bakeAnimal(scene, id);
  }
}
