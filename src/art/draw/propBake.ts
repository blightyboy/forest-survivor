import { RNG } from '../../core/math';
import { ellipse, makeBlob, OUTLINE, polygonPath, type Ctx } from './primitives';

/** Legacy Rock.draw — feet at origin. */
export function drawRockBaked(ctx: Ctx, ore: boolean, size: number, seed: number) {
  const rng = new RNG(seed);
  const r = 15 * size;
  const height = 11 * size;
  const side = makeBlob(rng, r, 7, 0.14, 0.62);
  const top = makeBlob(rng, r * 0.8, 6, 0.14, 0.55);
  const hl = makeBlob(rng, r * 0.38, 5, 0.2, 0.5);
  const nuggets: { x: number; y: number; s: number }[] = [];
  if (ore) {
    for (let i = 0; i < 5; i++) {
      nuggets.push({
        x: rng.range(-0.55, 0.55) * r,
        y: -height + rng.range(-0.3, 0.3) * r * 0.5 + (i % 2 ? 4 : -1),
        s: rng.range(2.5, 4) * size,
      });
    }
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 4, 2, r * 1.1, r * 0.45);
  ctx.fill();

  const c = ore ? ['#5f564c', '#8d8274', '#b3a998'] : ['#5c646b', '#8b949b', '#b4bcc2'];
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  polygonPath(ctx, side, 0, -height * 0.35);
  ctx.fillStyle = c[0];
  ctx.fill();
  ctx.stroke();
  polygonPath(ctx, top, -r * 0.06, -height);
  ctx.fillStyle = c[1];
  ctx.fill();
  polygonPath(ctx, hl, -r * 0.3, -height - r * 0.12);
  ctx.fillStyle = c[2];
  ctx.fill();

  if (ore) {
    for (const n of nuggets) {
      ctx.beginPath();
      ctx.moveTo(n.x, n.y - n.s);
      ctx.lineTo(n.x + n.s, n.y);
      ctx.lineTo(n.x, n.y + n.s * 0.8);
      ctx.lineTo(n.x - n.s, n.y);
      ctx.closePath();
      ctx.fillStyle = '#ffd54a';
      ctx.fill();
      ctx.strokeStyle = '#9a6b00';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Legacy Bush.draw — feet at origin. */
export function drawBushBaked(ctx: Ctx, size: number, seed: number) {
  const rng = new RNG(seed);
  const circles: { x: number; y: number; r: number }[] = [];
  const n = rng.int(3, 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + Math.PI;
    circles.push({
      x: Math.cos(a) * 8 * size + rng.range(-2, 2),
      y: -9 * size + Math.sin(a) * 5 * size + rng.range(-2, 1),
      r: rng.range(8, 11) * size,
    });
  }
  circles.push({ x: 0, y: -14 * size, r: 10 * size });
  const berries = rng.chance(0.3)
    ? circles.slice(0, 3).map((c) => ({
        x: c.x + rng.range(-3, 3),
        y: c.y + rng.range(-2, 3),
      }))
    : null;
  const palette = rng.chance(0.5)
    ? ['#2f6f2c', '#4c9a3a', '#78c04e']
    : ['#2a6436', '#3f8b4b', '#69b45f'];

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ellipse(ctx, 3, 1, 15 * size, 5 * size);
  ctx.fill();

  ctx.strokeStyle = '#173a1b';
  ctx.lineWidth = 4;
  for (const c of circles) {
    ellipse(ctx, c.x, c.y, c.r, c.r * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = palette[0];
  for (const c of circles) {
    ellipse(ctx, c.x, c.y, c.r, c.r * 0.85);
    ctx.fill();
  }
  ctx.fillStyle = palette[1];
  for (const c of circles) {
    ellipse(ctx, c.x - c.r * 0.12, c.y - c.r * 0.15, c.r * 0.75, c.r * 0.6);
    ctx.fill();
  }
  ctx.fillStyle = palette[2];
  for (const c of circles) {
    ellipse(ctx, c.x - c.r * 0.3, c.y - c.r * 0.35, c.r * 0.3, c.r * 0.22);
    ctx.fill();
  }
  if (berries) {
    for (const b of berries) {
      ctx.fillStyle = '#d6303a';
      ellipse(ctx, b.x, b.y, 2.4, 2.4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ellipse(ctx, b.x - 0.8, b.y - 0.8, 0.8, 0.8);
      ctx.fill();
    }
  }
  ctx.restore();
}
