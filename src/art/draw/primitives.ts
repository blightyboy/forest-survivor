/** Shared canvas helpers matching legacy utils.js / entities.js. */

export const OUTLINE = '#2a1b12';

export type Ctx = CanvasRenderingContext2D;

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Legacy entities.js drawHpBar — centered at (x, y). */
export function drawHpBar(ctx: Ctx, x: number, y: number, w: number, frac: number, color: string) {
  const f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(20,12,8,0.75)';
  roundRectPath(ctx, x - w / 2 - 1.5, y - 1.5, w + 3, 7, 3.5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRectPath(ctx, x - w / 2, y, Math.max(2, w * f), 4, 2);
  ctx.fill();
}

export function polygonPath(
  ctx: Ctx,
  pts: { x: number; y: number }[],
  ox = 0,
  oy = 0,
  scale = 1,
) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(ox + pts[0].x * scale, oy + pts[0].y * scale);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(ox + pts[i].x * scale, oy + pts[i].y * scale);
  }
  ctx.closePath();
}

export function strokeLimb(
  ctx: Ctx,
  x1: number, y1: number, x2: number, y2: number,
  w: number, color: string,
) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function makeBlob(
  rng: { range: (a: number, b: number) => number },
  radius: number,
  count: number,
  jitter: number,
  squashY = 1,
) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const j = 1 + rng.range(-jitter, jitter);
    pts.push({
      x: Math.cos(a) * radius * j,
      y: Math.sin(a) * radius * j * squashY,
    });
  }
  return pts;
}

export function createCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return [el, ctx];
}
