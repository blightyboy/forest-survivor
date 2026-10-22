import { ellipse, OUTLINE, roundRectPath, type Ctx } from './primitives';
import type { WeaponDrawStyle } from '../../data/weapons';

/** Runtime draw helpers for weapon projectiles (local origin at center). */

/** Soft elemental glow behind a unique projectile (legacy drawUniqueGlow). */
export function drawUniqueGlow(ctx: Ctx, x: number, y: number, r: number, style: WeaponDrawStyle | null | undefined) {
  if (!style || !style.unique || !style.glow) return;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = style.glow;
  ellipse(ctx, x, y, r, r * 0.7);
  ctx.fill();
  ctx.restore();
}

export function drawHammer(ctx: Ctx, metal = '#6a7076', wood = '#8a5a2e') {
  ctx.save();
  roundRectPath(ctx, -11, -7, 22, 12, 2);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  roundRectPath(ctx, -3, 4, 6, 16, 1.5);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawKnife(ctx: Ctx, metal = '#dfe7ec', wood = '#8a5a2e') {
  ctx.save();
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-2, -3.5);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-2, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  roundRectPath(ctx, -12, -2, 7, 4, 1);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Legacy `drawAxe` — full handle + blade. Orbiting axes use scale 1.2 (×1.12 if unique). */
export function drawAxeHead(
  ctx: Ctx,
  scale = 1.2,
  opts?: { metal?: string; wood?: string; accent?: string; unique?: boolean },
) {
  const metal = opts?.metal ?? '#c3ced6';
  const wood = opts?.wood ?? '#9a6232';
  const accent = opts?.accent ?? '#ffffff';
  const unique = !!opts?.unique;
  const darkWood = unique ? wood : '#5d3a1a';
  const poll = unique ? metal : '#7f8a92';
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-3, 2);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  // handle
  roundRectPath(ctx, -2.3, -15, 4.6, 31, 2.2);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = darkWood;
  ctx.fillRect(-2.3, 8, 4.6, 2);
  ctx.fillRect(-2.3, 12, 4.6, 2);
  // poll
  ctx.beginPath();
  ctx.moveTo(-1, -16);
  ctx.lineTo(-5.5, -15);
  ctx.lineTo(-5.5, -9);
  ctx.lineTo(-1, -8);
  ctx.closePath();
  ctx.fillStyle = poll;
  ctx.fill();
  ctx.stroke();
  // blade
  ctx.beginPath();
  ctx.moveTo(1, -16);
  ctx.lineTo(10, -23);
  ctx.quadraticCurveTo(17, -13, 11, -2);
  ctx.lineTo(1, -8);
  ctx.closePath();
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10.4, -20.5);
  ctx.quadraticCurveTo(15.6, -13, 10.8, -4);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  if (unique) {
    ctx.beginPath();
    ctx.moveTo(4, -18);
    ctx.lineTo(12, -26);
    ctx.lineTo(8, -14);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Legacy `Arrow.draw` — tower archer bolt (local origin at shaft mid, tip +x). */
export function drawTowerArrow(ctx: Ctx) {
  ctx.save();
  ctx.strokeStyle = '#6b4022';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.fillStyle = '#c3ced6';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(2, -3);
  ctx.lineTo(2, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f1f1f1';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-18, -3.5);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-18, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Legacy `Pike.draw` — shaft + tip scaled by `len` (local origin at grip). */
export function drawPikeThrust(
  ctx: Ctx,
  len: number,
  opts?: { metal?: string; wood?: string },
) {
  const metal = opts?.metal ?? '#c3ced6';
  const wood = opts?.wood ?? '#9a6232';
  ctx.save();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(len * 0.55, 0);
  ctx.stroke();
  ctx.strokeStyle = wood;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(len * 0.55, 0);
  ctx.stroke();
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(len * 0.55, 0);
  ctx.lineTo(len * 0.55 - 10, -5);
  ctx.lineTo(len * 0.72, 0);
  ctx.lineTo(len * 0.55 - 10, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();
}

export function drawSawDisc(ctx: Ctx, r = 14, metal = '#c3ced6') {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const rr = i % 2 ? r * 0.8 : r;
    const a = (i / 28) * Math.PI * 2;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ellipse(ctx, 0, 0, r * 0.2, r * 0.2);
  ctx.fillStyle = '#5d6b75';
  ctx.fill();
  ctx.restore();
}
