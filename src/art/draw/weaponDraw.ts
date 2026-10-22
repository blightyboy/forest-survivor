import { ellipse, OUTLINE, roundRectPath, type Ctx } from './primitives';
import type { WeaponDrawStyle } from '../../data/weapons';
import type { ElementId } from '../../data/constants';
import { ELEMENT_WEAPON_STYLE } from '../../data/weapons';

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

/**
 * Side-view guard dog (feet near y≈10). Uses weapon style for elemental uniques:
 * metal = coat, wood = ear/snout shade, accent = eye / collar.
 */
export function drawGuardDog(
  ctx: Ctx,
  style?: WeaponDrawStyle | null,
  opts: { walk?: number; flash?: boolean } = {},
) {
  const walk = opts.walk || 0;
  const flash = !!opts.flash;
  const unique = !!style?.unique;
  // Element kits always carry a trail — use their coat even before unique awaken.
  const infused = !!(style?.trail);
  const coat = flash ? '#fff' : infused && style?.metal ? style.metal : '#c4a574';
  const shade = flash ? '#fff' : infused && style?.wood ? style.wood : '#8a6840';
  const accent = flash ? '#fff' : infused && style?.accent ? style.accent : '#2a1b12';
  const belly = flash ? '#fff' : infused ? shade : '#d4b890';
  const leg = Math.sin(walk) * 2.8;
  const tail = Math.sin(walk * 2) * 2.2;
  const bob = Math.sin(walk) * 1.2;

  ctx.save();
  ctx.translate(0, bob);
  // Unique gets full glow; infused still shows a faint elemental halo so the outdoor
  // dog reads as the HUD skin even before awaken.
  if (unique) {
    drawUniqueGlow(ctx, 2, -2, 20, style);
  } else if (infused && style?.trail) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = style.trail;
    ellipse(ctx, 2, -2, 16, 11);
    ctx.fill();
    ctx.restore();
  }

  // Tail
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, -1);
  ctx.quadraticCurveTo(-17, -9 + tail, -15, -2 + tail * 0.4);
  ctx.stroke();
  ctx.strokeStyle = coat;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -1);
  ctx.quadraticCurveTo(-16.5, -8.5 + tail, -14.5, -2 + tail * 0.4);
  ctx.stroke();

  // Hind / fore legs
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.4;
  const legs: [number, number, number][] = [
    [-7, 3, 9 + leg],
    [-3, 3.5, 9 - leg * 0.85],
    [5, 3, 9 - leg],
    [9, 3.5, 9 + leg * 0.7],
  ];
  for (const [lx, ly, ly2] of legs) {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + (lx < 0 ? -1.2 : 1.2), ly2);
    ctx.stroke();
  }
  // Paws
  ctx.fillStyle = shade;
  for (const [lx, , ly2] of legs) {
    ellipse(ctx, lx + (lx < 0 ? -1.2 : 1.2), ly2 + 0.6, 2.1, 1.1);
    ctx.fill();
  }

  // Body
  ctx.fillStyle = coat;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ellipse(ctx, 0, 0, 12, 7.2);
  ctx.fill();
  ctx.stroke();
  // Belly
  ctx.fillStyle = belly;
  ellipse(ctx, 1, 2.2, 7.5, 3.4);
  ctx.fill();

  // Chest fluff
  ctx.fillStyle = coat;
  ellipse(ctx, 8, 1, 4.5, 4);
  ctx.fill();
  ctx.stroke();

  // Neck / head
  ellipse(ctx, 13, -3.2, 7, 5.8);
  ctx.fill();
  ctx.stroke();

  // Snout
  ctx.fillStyle = shade;
  ellipse(ctx, 18.5, -1.6, 4.2, 2.8);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // Nose
  ctx.fillStyle = accent;
  ellipse(ctx, 21.2, -2.2, 1.35, 1.05);
  ctx.fill();

  // Ear (pointed)
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(9.5, -6);
  ctx.lineTo(11.5, -14.5);
  ctx.lineTo(14.5, -5.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // Inner ear
  ctx.fillStyle = infused && style?.accent ? style.accent : '#e8c8a0';
  ctx.beginPath();
  ctx.moveTo(11, -7);
  ctx.lineTo(12, -12);
  ctx.lineTo(13.2, -6.8);
  ctx.closePath();
  ctx.fill();

  // Second ear (rear, smaller)
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(7.5, -5.5);
  ctx.lineTo(8.2, -11);
  ctx.lineTo(10.5, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();

  // Eye
  ctx.fillStyle = accent;
  ellipse(ctx, 15.2, -4.6, 1.45, 1.45);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 15.55, -5, 0.45, 0.45);
  ctx.fill();

  // Collar (elemental accent band)
  ctx.strokeStyle = infused && style?.accent ? style.accent : '#6b4022';
  ctx.lineWidth = unique ? 2.2 : infused ? 1.9 : 1.6;
  ctx.beginPath();
  ctx.ellipse(10.5, -0.2, 4.2, 3.2, 0, -0.3, Math.PI + 0.2);
  ctx.stroke();
  if (unique) {
    ctx.fillStyle = style?.accent || '#ffe066';
    ellipse(ctx, 10.5, 2.6, 1.4, 1.4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

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

/** Soft radial fill used by flame-ring variants (local origin at canvas center). */
function ringGlow(
  ctx: Ctx,
  r: number,
  inner: string,
  mid: string,
  edge: string,
) {
  const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, edge);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

/**
 * Flame Ring / aura — distinct silhouette per element (drawn at canvas center).
 * `r` is outer radius in canvas px (~28 for 64² bake).
 */
export function drawAuraRing(
  ctx: Ctx,
  element: ElementId | null | undefined,
  opts: { unique?: boolean; style?: WeaponDrawStyle | null } = {},
) {
  const el = element || null;
  const kit = el ? ELEMENT_WEAPON_STYLE[el] : null;
  const metal = opts.style?.metal || kit?.metal || '#ffb347';
  const accent = opts.style?.accent || kit?.accent || '#ffe066';
  const wood = opts.style?.wood || kit?.wood || '#8a2d0b';
  const trail = opts.style?.trail || kit?.trail || '#ff6a3d';
  const unique = !!opts.unique;
  const r = unique ? 30 : 28;

  ctx.save();
  if (unique && (opts.style?.glow || kit?.glow)) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = opts.style?.glow || kit!.glow;
    ellipse(ctx, 0, 0, r + 6, r + 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (!el || el === 'fire') {
    ringGlow(ctx, r, 'rgba(255,180,60,0)', 'rgba(255,140,30,0.18)', 'rgba(255,106,61,0.55)');
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.stroke();
    // Flame tongues
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * (r - 4);
      const y = Math.sin(a) * (r - 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(-4, -6, 0, -14);
      ctx.quadraticCurveTo(4, -6, 0, 2);
      ctx.fillStyle = i % 2 ? accent : trail;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  } else if (el === 'water') {
    ringGlow(ctx, r, 'rgba(154,212,255,0)', 'rgba(77,184,255,0.16)', 'rgba(77,184,255,0.5)');
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const a = t * Math.PI * 2;
      const wave = Math.sin(t * Math.PI * 6) * 2.4;
      const x = Math.cos(a) * (r - 2 + wave);
      const y = Math.sin(a) * (r - 2 + wave);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      ellipse(ctx, Math.cos(a) * (r * 0.55), Math.sin(a) * (r * 0.55), 3.2, 4.5);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else if (el === 'nature') {
    ringGlow(ctx, r, 'rgba(143,217,138,0)', 'rgba(109,212,106,0.14)', 'rgba(109,212,106,0.48)');
    ctx.strokeStyle = wood;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.save();
      ctx.translate(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(-5, -4, 0, -12);
      ctx.quadraticCurveTo(5, -4, 0, 2);
      ctx.fillStyle = i % 2 ? metal : accent;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  } else if (el === 'earth') {
    ringGlow(ctx, r, 'rgba(212,184,120,0)', 'rgba(196,163,90,0.14)', 'rgba(196,163,90,0.48)');
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const x = Math.cos(a) * (r - 4);
      const y = Math.sin(a) * (r - 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      roundRectPath(ctx, -5, -4, 10, 8, 1.5);
      ctx.fillStyle = i % 2 ? metal : wood;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  } else if (el === 'light') {
    ringGlow(ctx, r, 'rgba(255,243,160,0.15)', 'rgba(255,230,109,0.2)', 'rgba(255,230,109,0.45)');
    ctx.strokeStyle = metal;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = i % 2 ? accent : trail;
      ctx.lineWidth = i % 2 ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
      ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
      ctx.stroke();
    }
    ellipse(ctx, 0, 0, 5, 5);
    ctx.fillStyle = accent;
    ctx.fill();
  } else {
    // darkness
    ringGlow(ctx, r, 'rgba(184,154,232,0)', 'rgba(155,123,222,0.18)', 'rgba(80,40,120,0.55)');
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0.15, Math.PI * 1.7);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8));
      ctx.quadraticCurveTo(
        Math.cos(a + 0.3) * (r + 2),
        Math.sin(a + 0.3) * (r + 2),
        Math.cos(a + 0.55) * (r - 6),
        Math.sin(a + 0.55) * (r - 6),
      );
      ctx.strokeStyle = i % 2 ? accent : trail;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Caltrop Ring / spikes — post shape changes with element (canvas center).
 * `r` is ring radius (~48 for 128² bake).
 */
export function drawSpikesRing(
  ctx: Ctx,
  element: ElementId | null | undefined,
  opts: { unique?: boolean; style?: WeaponDrawStyle | null; count?: number } = {},
) {
  const el = element || null;
  const kit = el ? ELEMENT_WEAPON_STYLE[el] : null;
  const metal = opts.style?.metal || kit?.metal || '#c08850';
  const wood = opts.style?.wood || kit?.wood || '#9a6232';
  const accent = opts.style?.accent || kit?.accent || '#c08850';
  const trail = opts.style?.trail || kit?.trail || '#c08850';
  const unique = !!opts.unique;
  const n = opts.count ?? (unique ? 16 : 14);
  const r = unique ? 50 : 48;

  ctx.save();
  if (unique && (opts.style?.glow || kit?.glow)) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = opts.style?.glow || kit!.glow;
    ellipse(ctx, 0, 0, r + 10, r + 8);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.92;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);

    if (!el) {
      // Default wooden stakes
      roundRectPath(ctx, -3.5, -16, 7, 16, 1.5);
      ctx.fillStyle = wood;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3.5, -16);
      ctx.lineTo(0, -24);
      ctx.lineTo(3.5, -16);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.stroke();
    } else if (el === 'fire') {
      roundRectPath(ctx, -3.2, -15, 6.4, 15, 1.2);
      ctx.fillStyle = wood;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -15);
      ctx.quadraticCurveTo(-2, -26, 0, -30);
      ctx.quadraticCurveTo(2, -26, 4, -15);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? accent : trail;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (el === 'water') {
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-4.5, -8);
      ctx.lineTo(-2, -22);
      ctx.lineTo(0, -28);
      ctx.lineTo(2, -22);
      ctx.lineTo(4.5, -8);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = accent;
      ellipse(ctx, 0, -12, 1.6, 3);
      ctx.fill();
    } else if (el === 'nature') {
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-2.5, -10);
      ctx.lineTo(-5, -18);
      ctx.lineTo(0, -26);
      ctx.lineTo(5, -18);
      ctx.lineTo(2.5, -10);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -20);
      ctx.stroke();
    } else if (el === 'earth') {
      roundRectPath(ctx, -4.5, -14, 9, 14, 1);
      ctx.fillStyle = wood;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, -14);
      ctx.lineTo(-2, -22);
      ctx.lineTo(0, -18);
      ctx.lineTo(2, -24);
      ctx.lineTo(5, -14);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ellipse(ctx, 0, -6, 2, 1.4);
      ctx.fill();
    } else if (el === 'light') {
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-3.5, -12);
      ctx.lineTo(0, -28);
      ctx.lineTo(3.5, -12);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -22);
      ctx.stroke();
    } else {
      // darkness — hooked umbral spikes
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-3.5, -10);
      ctx.lineTo(-1, -20);
      ctx.quadraticCurveTo(4, -26, 1, -30);
      ctx.lineTo(3, -16);
      ctx.lineTo(3.5, -8);
      ctx.closePath();
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-1, -12);
      ctx.quadraticCurveTo(3, -20, 0, -26);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
