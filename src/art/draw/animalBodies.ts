/* Auto-generated from legacy/js/animals.js — do not edit by hand.
 * Run: node scripts/gen-animal-bodies.mjs
 */
// @ts-nocheck
import { ellipse, OUTLINE, roundRectPath, type Ctx } from './primitives';
import { animalFamily, ANIMAL_VARIANTS } from '../../data/animals';
import { clamp } from '../../core/math';

export type AnimalDrawView = {
  species: string;
  variant: string;
  walkTime: number;
  moving: boolean;
  facing: number;
  scale: number;
  big?: boolean;
  boss?: boolean;
  flash: number;
  /** Local art-space size (unscaled SPECIES values — ctx.scale applies entity scale). */
  height?: number;
  radius?: number;
  bodyOff?: number;
  sp: {
    color: string;
    shade?: string;
    belly?: string;
    eye: [number, number];
    height: number;
    bodyOff?: number;
    radius?: number;
  };
};

export function legs(ctx, xs, top, w, color, a, len) {
  for (let i = 0; i < xs.length; i++) {
    const ph = Math.sin(a.walkTime + (i % 2) * Math.PI) * (a.moving ? 3 : 0);
    ctx.fillStyle = color;
    roundRectPath(ctx, xs[i] - w / 2 + ph * 0.5, top, w, len - Math.max(0, ph) * 0.6, 1.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  }
}

export function drawCrown(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 3); ctx.lineTo(x - 6.5, y - 3.5); ctx.lineTo(x - 3, y - 0.5); ctx.lineTo(x, y - 6);
  ctx.lineTo(x + 3, y - 0.5); ctx.lineTo(x + 6.5, y - 3.5); ctx.lineTo(x + 6, y + 3);
  ctx.closePath();
  ctx.fillStyle = '#ffd23f'; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = '#e5484d';
  ellipse(ctx, x, y + 0.5, 1.3, 1.3); ctx.fill();
}

/** Local art-space body metrics (Phaser draws under ctx.scale — use unscaled SPECIES sizes). */
function localBodyMetrics(a) {
  const bodyOff = a.sp?.bodyOff ?? a.bodyOff ?? 10;
  const h = a.sp?.height ?? a.height ?? 32;
  const r = Math.max(10, a.sp?.radius ?? a.radius ?? 14);
  return { bodyOff, h, r };
}

/** Soft hit highlight in local animal space — keeps the skin readable under DPS. */
export function drawHitFlash(ctx, a) {
  const t = clamp(a.flash / 0.1, 0, 1);
  if (t <= 0) return;
  const { bodyOff, r } = localBodyMetrics(a);
  // Radius-based — SPECIES height includes antlers/necks and blew this up on deer.
  const cy = -Math.max(10, bodyOff * 0.9);
  const rx = r * 1.2;
  const ry = r * 0.78;
  ctx.save();
  ctx.globalAlpha = 0.12 + t * 0.22;
  ctx.fillStyle = '#fff6e8';
  ellipse(ctx, 2, cy, rx, ry);
  ctx.fill();
  ctx.globalAlpha = 0.08 + t * 0.14;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ellipse(ctx, 2, cy, rx * 1.05, ry * 1.05);
  ctx.stroke();
  ctx.restore();
}

/**
 * Subtle torso tint ring for variants (local animal space).
 * Sized from collision radius only — never SPECIES height (deer height is antlers,
 * which used to paint a giant circle over the sprite).
 */
export function drawVariantRim(ctx, a, vDef) {
  const { bodyOff, r } = localBodyMetrics(a);
  const cy = -Math.max(10, bodyOff * 0.9);
  const rx = r * 1.12;
  const ry = r * 0.7;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = vDef.rim;
  ctx.lineWidth = Math.max(1.1, Math.min(2, r * 0.09));
  ellipse(ctx, 2, cy, rx, ry);
  ctx.stroke();
  ctx.restore();
}

/**
 * Crimson back / shoulder spikes for demonic variants (local animal space).
 * Layout is normalized to body metrics so rats and bears both get spikes on the
 * back — legacy used a fixed boar-sized fan that towered over small pests.
 */
export function drawDemonicSpikes(ctx, a) {
  const { bodyOff, h, r } = localBodyMetrics(a);
  // Upper back line — sits just above the torso ellipse used by the rim.
  const backY = -bodyOff - h * 0.12;
  const span = Math.max(9, r * 0.95);
  const rise = Math.max(7, h * 0.38);
  const halfW = Math.max(1.2, r * 0.12);
  const tipR = Math.max(0.7, r * 0.07);
  // Normalized [baseX, baseYBias, tipX, tipY] — tipY -1 = full rise above back.
  const spikes = [
    [-0.85, 0.12, -1.0, -0.72],
    [-0.45, 0.02, -0.5, -0.92],
    [0.0, -0.04, 0.05, -1.0],
    [0.42, 0.02, 0.55, -0.88],
    [0.82, 0.12, 1.0, -0.68],
    [1.15, 0.28, 1.4, -0.32],
  ];
  ctx.lineJoin = 'round';
  for (const [bxn, byn, txn, tyn] of spikes) {
    const bx = bxn * span;
    const by = backY + byn * rise * 0.2;
    const tx = txn * span;
    const ty = backY + tyn * rise;
    ctx.beginPath();
    ctx.moveTo(bx - halfW, by);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + halfW, by);
    ctx.closePath();
    ctx.fillStyle = '#5a0a0a';
    ctx.fill();
    ctx.strokeStyle = '#1a0000';
    ctx.lineWidth = Math.max(0.8, r * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#ff3a2a';
    ellipse(ctx, tx, ty, tipR, tipR);
    ctx.fill();
  }
}

/** Hollow green eyes for necromantic / undead variants (scaled to species eye). */
export function drawNecroEyes(ctx, a) {
  const e = a.sp.eye || [16, -16];
  const { r } = localBodyMetrics(a);
  const er = Math.max(2.2, Math.min(3.6, r * 0.22));
  ctx.fillStyle = 'rgba(40, 80, 50, 0.55)';
  ellipse(ctx, e[0], e[1], er, er * 0.88);
  ctx.fill();
  ctx.fillStyle = '#7dffb0';
  ellipse(ctx, e[0], e[1], er * 0.5, er * 0.44);
  ctx.fill();
  ctx.fillStyle = '#0a1a10';
  ellipse(ctx, e[0] + er * 0.1, e[1], er * 0.22, er * 0.28);
  ctx.fill();
}

/** Tiny glyph above the HP bar for non-basic variants. */
export function drawVariantMark(ctx, x, y, variant) {
  const v = ANIMAL_VARIANTS[variant];
  if (!v || !v.bar) return;
  ctx.save();
  ctx.translate(x, y);
  if (variant === 'demonic') {
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(3.5, 3);
    ctx.lineTo(-3.5, 3);
    ctx.closePath();
    ctx.fillStyle = v.bar;
    ctx.fill();
    ctx.strokeStyle = '#4a0808';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else if (variant === 'necromantic') {
    ctx.strokeStyle = v.bar;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(3, 3);
    ctx.moveTo(3, -3);
    ctx.lineTo(-3, 3);
    ctx.stroke();
    ctx.fillStyle = v.bar;
    ellipse(ctx, 0, 0, 1.4, 1.4);
    ctx.fill();
  } else if (variant === 'dire') {
    ctx.fillStyle = v.bar;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSquirrel(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#d97b3c' : '#b5652b';
  const light = flash ? '#fff' : '#f0c896';
  const dark = flash ? '#fff' : '#7a3f17';
  // bushy tail curling up behind
  ctx.save();
  ctx.translate(-6, -8);
  ctx.rotate(-0.2 + Math.sin(a.walkTime * 0.9) * 0.14);
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.bezierCurveTo(-13, -1, -16, -21, -5, -26);
  ctx.bezierCurveTo(3, -29, 7, -20, 1, -15);
  ctx.bezierCurveTo(-3, -11, 3, -5, 5, -2);
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, -7, -19, 2.6, 4); ctx.fill();
  ctx.restore();
  legs(ctx, [-4, 4], -5, 3, dark, a, 5);
  ellipse(ctx, 0, -9, 8, 6.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, 2, -6.5, 4.5, 3.2); ctx.fill();
  ellipse(ctx, 7, -15, 5.5, 5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4.5, -18.5); ctx.lineTo(5.5, -24); ctx.lineTo(8.5, -19.5); ctx.closePath();
  ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 9, -15.5, 1.3, 1.5); ctx.fill();
  ctx.fillStyle = dark;
  ellipse(ctx, 12.2, -14, 1.1, 0.9); ctx.fill();
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(10.5, -12.6, 1.4, 2);
  }
}

export function drawRat(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#8a6a58' : '#6a5548';
  const belly = flash ? '#fff' : '#b8a090';
  const dark = flash ? '#fff' : '#3e322c';
  const pink = flash ? '#fff' : '#e8a090';
  // long naked tail trailing behind
  ctx.save();
  ctx.translate(-6, -5);
  ctx.rotate(0.35 + Math.sin(a.walkTime * 1.1) * 0.18);
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.quadraticCurveTo(-8, 4, -16, 1);
  ctx.quadraticCurveTo(-22, -1, -26, -4);
  ctx.strokeStyle = pink;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
  legs(ctx, [-3.5, 4], -4, 2.6, dark, a, 4.5);
  // low elongated body
  ellipse(ctx, 1, -7, 9.5, 5.2);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = belly;
  ellipse(ctx, 2.5, -5.2, 5.5, 2.8); ctx.fill();
  // head + pointed snout
  ellipse(ctx, 10, -10, 5.2, 4.4);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13.5, -10);
  ctx.lineTo(18.5, -8.5);
  ctx.lineTo(13.8, -7);
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = pink;
  ellipse(ctx, 17.8, -8.4, 1.4, 1.0); ctx.fill();
  // round ears
  ellipse(ctx, 8.2, -14.2, 2.4, 2.6);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = pink;
  ellipse(ctx, 8.4, -14, 1.2, 1.3); ctx.fill();
  ellipse(ctx, 11.2, -13.8, 2.1, 2.3);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = pink;
  ellipse(ctx, 11.4, -13.6, 1.0, 1.1); ctx.fill();
  // eye + whiskers
  ctx.fillStyle = '#111';
  ellipse(ctx, 12, -11.5, 1.2, 1.35); ctx.fill();
  if (!flash) {
    ctx.strokeStyle = 'rgba(40,28,22,0.55)';
    ctx.lineWidth = 0.7;
    for (const dy of [-1.2, 0, 1.2]) {
      ctx.beginPath();
      ctx.moveTo(15.5, -8.8 + dy * 0.2);
      ctx.lineTo(20.5, -8.2 + dy);
      ctx.stroke();
    }
  }
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(14.2, -7.2, 1.5, 2.1);
  }
}

export function drawRaccoon(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#a07c7c' : '#8a8d92';
  const dark = flash ? '#fff' : '#35373b';
  const light = flash ? '#fff' : '#dcdee1';
  // ringed tail
  ctx.save();
  ctx.translate(-11, -12);
  ctx.rotate(0.45 + Math.sin(a.walkTime * 0.8) * 0.12);
  ellipse(ctx, -8, 0, 10, 4.2);
  ctx.fillStyle = body; ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = dark;
  for (const rx of [-15, -10, -5]) ctx.fillRect(rx, -5, 2.6, 10);
  ctx.restore();
  ellipse(ctx, -8, 0, 10, 4.2);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  legs(ctx, [-8, -3, 5, 9], -8, 3.4, dark, a, 8);
  ellipse(ctx, 0, -13, 13, 8);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, 1, -9.5, 8, 3); ctx.fill();
  // ears
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
  for (const ex of [8.5, 12.5]) {
    ctx.beginPath(); ctx.moveTo(ex - 1.5, -20); ctx.lineTo(ex, -25.5); ctx.lineTo(ex + 2, -20.5); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.stroke();
  }
  ellipse(ctx, 12, -16, 7, 6);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.6; ctx.stroke();
  // bandit mask
  ctx.fillStyle = dark;
  ellipse(ctx, 13.5, -16.8, 5.5, 2.6); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 14.5, -16.8, 1.3, 1.3); ctx.fill();
  // snout
  ctx.beginPath();
  ctx.moveTo(16, -18); ctx.lineTo(21.5, -14.5); ctx.lineTo(16, -12.5);
  ctx.closePath();
  ctx.fillStyle = light; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 21.3, -14.6, 1.3, 1.1); ctx.fill();
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(17.5, -12.8, 1.4, 2.2);
  }
}


export function drawBoar(ctx, a, flash, windup, angry) {
  const dire = a.species === 'dire_boar';
  const body = flash ? '#ffffff' : windup ? (dire ? '#6a3020' : '#a8492d')
    : a.big ? '#5a3925' : (a.sp.color || '#7d4b2c');
  const dark = flash ? '#ffffff' : a.big ? '#2f1d12' : (a.sp.shade || (dire ? '#1e120c' : '#3e2516'));
  legs(ctx, [-11, -5, 7, 12], -10, 4.6, flash ? '#fff' : (dire ? '#1a1008' : '#3a2214'), a, 10);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-17, -17); ctx.quadraticCurveTo(-24, -22, -21, -14); ctx.stroke();
  ellipse(ctx, 0, -15, 19, 11);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  if (!flash) { ctx.fillStyle = 'rgba(255,220,180,0.18)'; ellipse(ctx, 1, -10.5, 13, 4.5); ctx.fill(); }
  if (dire && !flash) {
    ctx.fillStyle = 'rgba(180,40,30,0.35)';
    ellipse(ctx, -2, -18, 10, 3.5); ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-14, -21);
  const spikes = [[-11, -29], [-7, -24], [-3, -31], [1, -25], [5, -31], [8, -25], [12, -28], [14, -19]];
  for (const pt of spikes) ctx.lineTo(pt[0], pt[1]);
  ctx.quadraticCurveTo(0, -24, -14, -21);
  ctx.fillStyle = dark; ctx.fill();
  // Snout drawn under the head so the skull sits on top in z-order.
  ellipse(ctx, 26, -12, 4.2, 4.4);
  ctx.fillStyle = flash ? '#fff' : '#e3a089'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // Head covers the snout base
  ellipse(ctx, 15, -14, 10, 8.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  // Tip + nostrils redrawn in front of the head
  ellipse(ctx, 26.5, -12, 3.2, 3.6);
  ctx.fillStyle = flash ? '#fff' : '#e3a089'; ctx.fill();
  ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = '#6b3a2a';
  ellipse(ctx, 27.6, -13.4, 0.85, 1.1); ctx.fill();
  ellipse(ctx, 27.6, -10.6, 0.85, 1.1); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9.5, -19.5); ctx.lineTo(12.5, -28); ctx.lineTo(17, -20.5);
  ctx.closePath();
  ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
  const tl = a.big ? 1.4 : 1;
  ctx.beginPath();
  ctx.moveTo(19, -7);
  ctx.quadraticCurveTo(24, -8, 23.5 + (tl - 1) * 3, -15 - (tl - 1) * 6);
  ctx.lineTo(21.5, -8.6);
  ctx.closePath();
  ctx.fillStyle = '#fffbe8'; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 17.5, -16, 1.8, 1.9); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 18, -16.6, 0.6, 0.6); ctx.fill();
  if (angry) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(14, -20.5); ctx.lineTo(20.5, -18); ctx.stroke();
  }
}

export function drawWolf(ctx, a, flash, windup, angry) {
  const dire = a.species === 'dire_wolf';
  const body = flash ? '#fff' : windup ? (dire ? '#6a4048' : '#9a6a6a') : (a.sp.color || '#7d8590');
  const dark = flash ? '#fff' : (a.sp.shade || (dire ? '#1c222c' : '#545b64'));
  const light = flash ? '#fff' : (a.sp.belly || (dire ? '#6a7484' : '#bcc3ca'));
  legs(ctx, [-10, -5, 7, 11], -12, 3.6, flash ? '#fff' : (dire ? '#2a3038' : '#4b5159'), a, 12);
  // bushy tail
  ctx.save();
  ctx.translate(-14, -17);
  ctx.rotate(0.55 + Math.sin(a.walkTime * 0.8) * 0.15);
  ellipse(ctx, -9, 0, 11, 4.2);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, -17, 0, 3.5, 2.6); ctx.fill();
  ctx.restore();
  // body
  ellipse(ctx, 0, -17, 16, 8.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = light;
  ellipse(ctx, 1, -12.5, 11, 3.4); ctx.fill();
  ctx.fillStyle = dark;
  ellipse(ctx, -2, -22.5, 12, 3); ctx.fill();
  // neck ruff + head
  ellipse(ctx, 11, -20, 6.5, 7);
  ctx.fillStyle = body; ctx.fill();
  ellipse(ctx, 15, -21, 7, 6);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  // snout
  ctx.beginPath();
  ctx.moveTo(18, -23.5); ctx.lineTo(28, -19.5); ctx.lineTo(27, -16); ctx.lineTo(17, -16.5);
  ctx.closePath();
  ctx.fillStyle = light; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 27.6, -18.8, 1.7, 1.5); ctx.fill();
  if (angry) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(21, -16.4); ctx.lineTo(22, -13.8); ctx.lineTo(23, -16.4); ctx.closePath(); ctx.fill();
  }
  // ears
  ctx.fillStyle = dark;
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(10.5, -24.5); ctx.lineTo(12, -32); ctx.lineTo(15, -25.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, -25.5); ctx.lineTo(16.5, -31.5); ctx.lineTo(18, -24.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  // eye
  ctx.fillStyle = dire ? '#ff6a3d' : '#ffd23f';
  ellipse(ctx, 16.5, -21.5, 1.8, 1.5); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 16.9, -21.5, 0.8, 1.1); ctx.fill();
}

export function drawBear(ctx, a, flash, windup, angry) {
  const dire = a.species === 'dire_bear';
  const body = flash ? '#fff' : windup ? (dire ? '#5a2818' : '#8a3f22') : (a.sp.color || '#6b4527');
  const dark = flash ? '#fff' : (a.sp.shade || (dire ? '#1a100c' : '#4a2e18'));
  const muzzle = flash ? '#fff' : (dire ? '#8a6a48' : '#c69c6d');
  if (windup) {
    ctx.translate(-14, 0);
    ctx.rotate(-0.22);
    ctx.translate(14, 0);
  }
  legs(ctx, [-15, -7, 9, 16], -13, 7.5, flash ? '#fff' : (dire ? '#1e140e' : '#3e2614'), a, 13);
  // body + hump
  ellipse(ctx, 0, -21, 24, 15);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.stroke();
  ellipse(ctx, -5, -31, 13, 7);
  ctx.fillStyle = body; ctx.fill();
  if (!flash) {
    ctx.fillStyle = 'rgba(255,220,180,0.13)';
    ellipse(ctx, 2, -14, 16, 5); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ellipse(ctx, -8, -33, 9, 3); ctx.fill();
  }
  // head
  ellipse(ctx, 20, -25, 11, 10);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  // ears
  for (const ex of [14, 23]) {
    ellipse(ctx, ex, -34.5, 4.2, 4.2);
    ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
    ellipse(ctx, ex, -34.5, 2, 2);
    ctx.fillStyle = dark; ctx.fill();
  }
  // muzzle
  ellipse(ctx, 29, -21.5, 6.5, 5);
  ctx.fillStyle = muzzle; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#1a0f08';
  ellipse(ctx, 34, -23, 2.6, 2); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 22.5, -27, 1.9, 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 23, -27.6, 0.6, 0.6); ctx.fill();
  if (angry) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(19, -31); ctx.lineTo(26, -29); ctx.stroke();
  }
  if (windup && !flash) {
    ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(18 + i * 2.5, -4); ctx.lineTo(20 + i * 2.5, 0); ctx.stroke();
    }
  }
}

export function drawFox(ctx, a, flash) {
  const body = flash ? '#fff' : '#d4783a';
  const dark = flash ? '#fff' : '#8a3a18';
  const cream = flash ? '#fff' : '#f2e6d4';
  legs(ctx, [-8, -3, 6, 10], -10, 3.2, flash ? '#fff' : '#9a4a22', a, 10);
  // bushy tail
  ctx.save();
  ctx.translate(-12, -14);
  ctx.rotate(0.5 + Math.sin(a.walkTime * 0.9) * 0.14);
  ellipse(ctx, -10, 0, 12, 4.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = cream;
  ellipse(ctx, -19, 0, 3.5, 2.8); ctx.fill();
  ctx.restore();
  ellipse(ctx, 0, -14, 13, 7.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = cream;
  ellipse(ctx, 1, -10, 8, 3); ctx.fill();
  // head
  ellipse(ctx, 12, -17, 7, 6);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.6; ctx.stroke();
  // ears
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(9.5, -28); ctx.lineTo(12.5, -21); ctx.closePath();
  ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -21); ctx.lineTo(14.5, -28.5); ctx.lineTo(16, -20.5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark;
  ellipse(ctx, 9.8, -24.5, 1.2, 1.8); ctx.fill();
  ellipse(ctx, 14.2, -24.8, 1.2, 1.8); ctx.fill();
  // snout
  ctx.beginPath();
  ctx.moveTo(15, -18); ctx.lineTo(22, -15); ctx.lineTo(15, -13);
  ctx.closePath();
  ctx.fillStyle = cream; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 21.5, -15, 1.2, 1); ctx.fill();
  ellipse(ctx, 14, -18, 1.4, 1.5); ctx.fill();
}

export function drawDuck(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#6a9a4a' : '#4a7a3a';
  const breast = flash ? '#fff' : '#c8a060';
  const beak = flash ? '#fff' : '#e8a020';
  legs(ctx, [-3, 4], -4, 2.4, flash ? '#fff' : '#e8a020', a, 5);
  // body
  ellipse(ctx, 0, -10, 11, 7);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = breast;
  ellipse(ctx, 3, -7, 6, 3.5); ctx.fill();
  // wing
  ctx.beginPath();
  ctx.moveTo(-2, -12); ctx.quadraticCurveTo(-8, -16, -4, -8); ctx.quadraticCurveTo(0, -10, -2, -12);
  ctx.fillStyle = flash ? '#fff' : '#3a5a2a'; ctx.fill();
  // head
  ellipse(ctx, 10, -14, 5.5, 5);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // beak
  ctx.beginPath();
  ctx.moveTo(14, -14); ctx.lineTo(20, -13); ctx.lineTo(14, -11.5);
  ctx.closePath();
  ctx.fillStyle = beak; ctx.fill();
  ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = '#111';
  ellipse(ctx, 12, -14.5, 1.2, 1.3); ctx.fill();
  if (windup) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(15.5, -11.2, 1.2, 1.8);
  }
}

export function drawSheep(ctx, a, flash, windup) {
  const wool = flash ? '#fff' : windup ? '#fff6e8' : '#efe8dc';
  const skin = flash ? '#fff' : '#d8a090';
  const dark = flash ? '#fff' : '#6a5040';
  legs(ctx, [-9, -3, 5, 10], -10, 3.4, flash ? '#fff' : '#5a4030', a, 10);
  // fluffy body
  ellipse(ctx, 0, -16, 16, 11);
  ctx.fillStyle = wool; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  if (!flash) {
    ctx.fillStyle = '#fff';
    ellipse(ctx, -6, -20, 5, 4.5); ctx.fill();
    ellipse(ctx, 4, -22, 5.5, 4); ctx.fill();
    ellipse(ctx, 8, -14, 4.5, 4); ctx.fill();
    ellipse(ctx, -8, -12, 4, 3.5); ctx.fill();
  }
  // head
  ellipse(ctx, 14, -18, 7, 6);
  ctx.fillStyle = skin; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  // ears
  ctx.fillStyle = skin;
  ellipse(ctx, 10, -24, 2.4, 3.2); ctx.fill();
  ellipse(ctx, 17, -23.5, 2.4, 3.2); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 16, -18.5, 1.3, 1.4); ctx.fill();
  ctx.fillStyle = dark;
  ellipse(ctx, 20, -16.5, 1.6, 1.2); ctx.fill();
  if (windup) {
    // wool ball in mouth
    ctx.fillStyle = '#f7f2ea';
    ellipse(ctx, 21, -14, 3.5, 3.2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.stroke();
  }
}

export function drawBeaver(ctx, a, flash, windup) {
  const body = flash ? '#fff' : windup ? '#9a6038' : '#7a4a28';
  const dark = flash ? '#fff' : '#4a2a14';
  const belly = flash ? '#fff' : '#c49a68';
  legs(ctx, [-8, -2, 6, 10], -9, 3.6, dark, a, 9);
  // flat paddle tail
  ctx.save();
  ctx.translate(-12, -10);
  ctx.rotate(0.35 + Math.sin(a.walkTime * 0.7) * 0.08);
  ellipse(ctx, -8, 0, 11, 4.5);
  ctx.fillStyle = dark; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (const ox of [-12, -8, -4]) {
    ctx.beginPath(); ctx.moveTo(ox, -3); ctx.lineTo(ox - 1, 3); ctx.stroke();
  }
  ctx.restore();
  ellipse(ctx, 0, -14, 14, 9);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = belly;
  ellipse(ctx, 1, -10, 8, 3.5); ctx.fill();
  // head
  ellipse(ctx, 12, -16, 7.5, 6.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = 1.5; ctx.stroke();
  // buck teeth
  ctx.fillStyle = '#fff8d8';
  ctx.fillRect(17.5, -14.5, 2.2, 3.5);
  ctx.fillRect(20, -14.5, 2.2, 3.5);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.strokeRect(17.5, -14.5, 2.2, 3.5); ctx.strokeRect(20, -14.5, 2.2, 3.5);
  ctx.fillStyle = '#111';
  ellipse(ctx, 14.5, -17.5, 1.4, 1.5); ctx.fill();
  // ear
  ellipse(ctx, 8, -22, 2.5, 2.5);
  ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
  if (windup) {
    ctx.save();
    ctx.translate(22, -12);
    ctx.rotate(0.4);
    roundRectPath(ctx, -6, -2.5, 12, 5, 2);
    ctx.fillStyle = '#8a5a2a'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
}

export function drawDeer(ctx, a, flash) {
  const body = flash ? '#fff' : '#c08a52';
  const legC = flash ? '#fff' : '#8a5a34';
  legs(ctx, [-9, -4.5, 8, 12], -24, 3.2, legC, a, 24);
  ctx.fillStyle = '#2a1b12';
  for (const lx of [-9, -4.5, 8, 12]) ctx.fillRect(lx - 1.8, -2, 3.6, 2);
  // tail
  ctx.fillStyle = flash ? '#fff' : '#f6efe2';
  ellipse(ctx, -15.5, -30, 3, 4); ctx.fill();
  // body
  ellipse(ctx, 0, -28, 15.5, 8.5);
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  if (!flash) {
    ctx.fillStyle = '#f3e6d0';
    ellipse(ctx, 1.5, -23, 10, 3.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,225,0.75)';
    for (const [sx, sy] of [[-7, -32], [-2, -33.5], [3, -32.5], [-4.5, -29.5]]) { ellipse(ctx, sx, sy, 1.3, 1.1); ctx.fill(); }
  }
  // neck
  ctx.beginPath();
  ctx.moveTo(8, -32); ctx.lineTo(14, -45); ctx.lineTo(19.5, -43); ctx.lineTo(15, -27);
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  // antlers
  ctx.strokeStyle = flash ? '#fff' : '#efe1bd';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(15, -49); ctx.lineTo(12, -60); ctx.moveTo(13, -55); ctx.lineTo(8.5, -58); ctx.moveTo(12, -60); ctx.lineTo(14.5, -64);
  ctx.moveTo(17, -49); ctx.lineTo(19.5, -61); ctx.moveTo(18.5, -56); ctx.lineTo(23, -58.5); ctx.moveTo(19.5, -61); ctx.lineTo(18, -65);
  ctx.stroke();
  // ear + head
  ctx.save();
  ctx.translate(12.5, -48.5); ctx.rotate(-0.5);
  ellipse(ctx, 0, 0, 4.5, 2);
  ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(19, -46); ctx.rotate(0.25);
  ellipse(ctx, 0, 0, 7, 4.6);
  ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#1a1a1a';
  ellipse(ctx, 25.4, -44, 1.6, 1.4); ctx.fill();
  ellipse(ctx, 19.5, -46.5, 1.3, 1.5); ctx.fill();
}

export function drawAnimalBody(ctx: Ctx, a: AnimalDrawView, windup: boolean, angry: boolean) {
  const flash = a.flash > 0;
  const vDef = ANIMAL_VARIANTS[a.variant as keyof typeof ANIMAL_VARIANTS];
  // Rim under the body so it never paints over fur / antlers.
  if (vDef?.rim) drawVariantRim(ctx, a as never, vDef as never);
  if (a.variant === 'demonic') drawDemonicSpikes(ctx, a as never);
  switch (animalFamily(a.species)) {
    case 'wolf': drawWolf(ctx, a as never, flash, windup, angry); break;
    case 'bear': drawBear(ctx, a as never, flash, windup, angry); break;
    case 'deer': drawDeer(ctx, a as never, flash); break;
    case 'fox': drawFox(ctx, a as never, flash); break;
    case 'squirrel': drawSquirrel(ctx, a as never, flash, windup); break;
    case 'rat': drawRat(ctx, a as never, flash, windup); break;
    case 'raccoon': drawRaccoon(ctx, a as never, flash, windup); break;
    case 'duck': drawDuck(ctx, a as never, flash, windup); break;
    case 'sheep': drawSheep(ctx, a as never, flash, windup); break;
    case 'beaver': drawBeaver(ctx, a as never, flash, windup); break;
    default: drawBoar(ctx, a as never, flash, windup, angry);
  }
  if (a.variant === 'necromantic') drawNecroEyes(ctx, a as never);
  if (a.boss) drawCrown(ctx, a.sp.eye[0] - 3, a.sp.eye[1] - 11);
  if (flash) drawHitFlash(ctx, a as never);
}
