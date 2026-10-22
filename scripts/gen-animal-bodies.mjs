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
code += convert(variantRim)
  .replace(
    /const bodyOff = a\.sp\.bodyOff \|\| a\.bodyOff \|\| 10;\r?\n  const h = a\.height \|\| 32;\r?\n  const r = Math\.max\(10, a\.radius \|\| 14\);/,
    'const { bodyOff, h, r } = localBodyMetrics(a);',
  );
code += convert(demonic);
code += convert(necro);
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
