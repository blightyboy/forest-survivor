/** Glossary icons baked from the same `drawAnimalBody` art used in-run. */
import { SPECIES } from '../data/animals';
import { drawAnimalBody } from '../art/draw/animalBodies';
import { createCanvas } from '../art/draw/primitives';

const cache = new Map<string, string>();

function fitScale(height: number, radius: number, size: number): number {
  const byH = size / (height * 1.2 + 10);
  const byR = size / (radius * 2.6 + 12);
  return Math.max(0.5, Math.min(1.4, Math.min(byH, byR)));
}

/** PNG data URL of a species (optional variant rim / spikes). Cached. */
export function animalIconDataUrl(
  speciesId: string,
  variant = 'basic',
  size = 72,
): string {
  const key = `${speciesId}|${variant}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sp = SPECIES[speciesId];
  if (!sp) return '';

  const [el, ctx] = createCanvas(size, size);
  const scale = fitScale(sp.height || 32, sp.radius || 14, size);
  ctx.save();
  ctx.translate(size / 2, size - 5);
  ctx.scale(scale, scale);
  drawAnimalBody(
    ctx,
    {
      species: speciesId,
      variant,
      walkTime: 0,
      moving: false,
      facing: 1,
      scale: 1,
      flash: 0,
      height: sp.height,
      radius: sp.radius,
      bodyOff: sp.bodyOff,
      sp: {
        color: sp.color,
        shade: sp.shade,
        belly: sp.belly,
        eye: sp.eye,
        height: sp.height,
        bodyOff: sp.bodyOff,
        radius: sp.radius,
      },
    },
    false,
    false,
  );
  ctx.restore();

  const url = el.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** `<img>` for glossary / HUD chips. Empty string if species unknown. */
export function animalIconHtml(
  speciesId: string,
  variant = 'basic',
  size = 72,
): string {
  const url = animalIconDataUrl(speciesId, variant, size);
  if (!url) return '';
  return `<img class="fs-glossary-animal" src="${url}" alt="" width="${size}" height="${size}" />`;
}
