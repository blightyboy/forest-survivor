import fs from 'fs';

const s = fs.readFileSync('legacy/js/animals.js', 'utf8');

const deerStart = s.indexOf('function drawDeer');
const afterDeer = s.indexOf('\nfunction ', deerStart + 10);
const end = afterDeer > 0 ? afterDeer : s.length;

const slice = (from, toMarker) => {
  const a = s.indexOf(from);
  const b = s.indexOf(toMarker, a + 1);
  return s.slice(a, b > 0 ? b : end);
};

const legs = slice('function legs(', 'function drawBoar');
const crown = slice('function drawCrown', 'function drawHitFlash');
const hitFlash = slice('function drawHitFlash', 'function drawVariantRim');
const variantRim = slice('function drawVariantRim', 'function drawDemonicSpikes');
const demonic = slice('function drawDemonicSpikes', 'function drawNecroEyes');
const necro = slice('function drawNecroEyes', 'function drawVariantMark');
const mark = slice('function drawVariantMark', 'function drawSquirrel');
const bodies = s.slice(s.indexOf('function drawSquirrel'), end);

function convert(fnSrc) {
  return fnSrc.replace(/function\s+(\w+)/g, 'export function $1');
}

let code = `/* Auto-generated from legacy/js/animals.js — do not edit by hand.
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

/** Local art-space body metrics (Phaser draws under ctx.scale — use unscaled SPECIES sizes). */
function localBodyMetrics(a) {
  const bodyOff = a.sp?.bodyOff ?? a.bodyOff ?? 10;
  const h = a.sp?.height ?? a.height ?? 32;
  const r = Math.max(10, a.sp?.radius ?? a.radius ?? 14);
  return { bodyOff, h, r };
}

`;

// legs is also embedded near drawBoar in some extracts — include once.
code += convert(legs);
code += convert(crown);
// Hit-flash / rim: prefer SPECIES local metrics (legacy Animal has scaled height/radius on `this`).
code += convert(hitFlash)
  .replace(
    /const bodyOff = a\.sp\.bodyOff \|\| a\.bodyOff \|\| 10;\r?\n  const h = a\.height \|\| 32;\r?\n  const r = Math\.max\(10, a\.radius \|\| 14\);/,
    'const { bodyOff, h, r } = localBodyMetrics(a);',
  );
// Variant overlays are sized to SPECIES metrics (legacy used a fixed boar layout).
void variantRim;
void demonic;
void necro;
code += `
/** Outline hint for variants (local animal space — sized to each species). */
export function drawVariantRim(ctx, a, vDef) {
  const { bodyOff, h, r } = localBodyMetrics(a);
  ctx.strokeStyle = vDef.rim;
  ctx.lineWidth = Math.max(1.2, Math.min(2.4, r * 0.12));
  ellipse(ctx, 2, -bodyOff - h * 0.18, r * 1.05, h * 0.36);
  ctx.stroke();
}

/**
 * Crimson back / shoulder spikes for demonic variants (local animal space).
 * Normalized to body metrics so every species gets spikes on the back.
 */
export function drawDemonicSpikes(ctx, a) {
  const { bodyOff, h, r } = localBodyMetrics(a);
  const backY = -bodyOff - h * 0.12;
  const span = Math.max(9, r * 0.95);
  const rise = Math.max(7, h * 0.38);
  const halfW = Math.max(1.2, r * 0.12);
  const tipR = Math.max(0.7, r * 0.07);
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

/** Hollow green eyes for necromantic / undead variants (scaled to species). */
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
`;
code += convert(mark);
// Strip duplicate legs() if present in bodies chunk (legacy defines it just before drawBoar).
const bodiesClean = bodies.replace(/\r?\nfunction legs\([^)]*\)\s*\{[\s\S]*?\r?\n\}\r?\n(?=\r?\nfunction drawBoar)/, '\n');
code += convert(bodiesClean);

code += `
export function drawAnimalBody(ctx: Ctx, a: AnimalDrawView, windup: boolean, angry: boolean) {
  const flash = a.flash > 0;
  const vDef = ANIMAL_VARIANTS[a.variant as keyof typeof ANIMAL_VARIANTS];
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
  if (vDef && (vDef as { rim?: boolean }).rim) drawVariantRim(ctx, a as never, vDef as never);
  if (a.variant === 'necromantic') drawNecroEyes(ctx, a as never);
  if (a.boss) drawCrown(ctx, a.sp.eye[0] - 3, a.sp.eye[1] - 11);
  if (flash) drawHitFlash(ctx, a as never);
}
`;

fs.mkdirSync('src/art/draw', { recursive: true });
fs.writeFileSync('src/art/draw/animalBodies.ts', code);
console.log('wrote src/art/draw/animalBodies.ts', code.length, 'chars');
