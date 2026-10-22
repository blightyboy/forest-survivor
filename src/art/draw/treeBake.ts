import { makeBlob, OUTLINE, polygonPath, roundRectPath, type Ctx } from './primitives';

const OAK_PALETTES = [
  ['#2b6a2e', '#3f8f3a', '#68b852'],
  ['#285e33', '#388646', '#5bae5f'],
  ['#3b6f24', '#579a32', '#86c44c'],
];
const PINE_PALETTES = [
  ['#1d5538', '#2d7a4d', '#48a067'],
  ['#225637', '#317a48', '#55a35e'],
];

function rngFrom(seed: number) {
  let s = seed >>> 0 || 1;
  return {
    next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    },
    range(a: number, b: number) {
      return a + this.next() * (b - a);
    },
    pick<T>(arr: T[]) {
      return arr[(this.next() * arr.length) | 0];
    },
  };
}

/** Legacy-style oak / pine baked at feet origin (bottom-center). */
export function drawTreeBaked(
  ctx: Ctx,
  kind: 'oak' | 'pine',
  size: number,
  seed = 1,
) {
  const rng = rngFrom(seed);
  const s = size;
  ctx.save();
  ctx.lineJoin = 'round';

  // Shadow is drawn separately so it doesn't rotate with the falling trunk.

  if (kind === 'pine') {
    const pal = rng.pick(PINE_PALETTES);
    const trunkH = 16 * s;
    const trunkW = 11 * s;
    drawTrunk(ctx, trunkW, trunkH);
    const tiers = [];
    for (let i = 0; i < 3; i++) {
      const w = (32 - i * 7) * s;
      const baseY = -trunkH - i * 19 * s + 4 * s;
      tiers.push({ w, baseY, apexY: baseY - (34 - i * 2) * s, ax: rng.range(-2, 2) * s });
    }
    for (const t of tiers) {
      ctx.beginPath();
      ctx.moveTo(-t.w, t.baseY);
      ctx.lineTo(t.ax, t.apexY);
      ctx.lineTo(t.w, t.baseY);
      ctx.lineTo(0, t.baseY + 5 * s);
      ctx.closePath();
      ctx.fillStyle = pal[0];
      ctx.strokeStyle = '#123322';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-t.w, t.baseY);
      ctx.lineTo(t.ax, t.apexY);
      ctx.lineTo(0, t.baseY + 5 * s);
      ctx.closePath();
      ctx.fillStyle = pal[1];
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(t.ax, t.apexY);
      ctx.lineTo(-t.w * 0.45, t.baseY - (t.baseY - t.apexY) * 0.35);
      ctx.lineTo(t.ax - t.w * 0.08, t.baseY - (t.baseY - t.apexY) * 0.25);
      ctx.closePath();
      ctx.fillStyle = pal[2];
      ctx.fill();
    }
  } else {
    const pal = rng.pick(OAK_PALETTES);
    const trunkH = 26 * s;
    const trunkW = 13 * s;
    drawTrunk(ctx, trunkW, trunkH);
    const top = -trunkH - 8 * s;
    const defs: [number, number, number][] = [
      [-8, -32, 17], [9, -30, 17], [-15, -6, 19], [15, -6, 19], [0, -15, 24],
    ];
    const blobs = defs.map((d) => {
      const r = d[2] * s * rng.range(0.92, 1.08);
      return {
        x: d[0] * s,
        y: top + d[1] * s,
        r,
        pts: makeBlob(rng, r, 8, 0.12),
        mid: makeBlob(rng, r * 0.8, 7, 0.12),
        hl: makeBlob(rng, r * 0.45, 6, 0.18),
      };
    });
    blobs.sort((a, b) => a.y - b.y);
    ctx.strokeStyle = '#173a1b';
    ctx.lineWidth = 5;
    for (const b of blobs) {
      polygonPath(ctx, b.pts, b.x, b.y);
      ctx.stroke();
    }
    ctx.fillStyle = pal[0];
    for (const b of blobs) {
      polygonPath(ctx, b.pts, b.x, b.y);
      ctx.fill();
    }
    ctx.fillStyle = pal[1];
    for (const b of blobs) {
      polygonPath(ctx, b.mid, b.x - b.r * 0.08, b.y - b.r * 0.14);
      ctx.fill();
    }
    ctx.fillStyle = pal[2];
    for (const b of blobs) {
      polygonPath(ctx, b.hl, b.x - b.r * 0.28, b.y - b.r * 0.34);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTrunk(ctx: Ctx, tw: number, th: number) {
  ctx.fillStyle = '#6b4022';
  ctx.beginPath();
  ctx.moveTo(-tw * 0.9, 1);
  ctx.lineTo(-tw * 0.3, -6);
  ctx.lineTo(tw * 0.3, -6);
  ctx.lineTo(tw * 0.9, 1);
  ctx.closePath();
  ctx.fill();
  roundRectPath(ctx, -tw / 2, -th - 6, tw, th + 6, 3);
  ctx.fillStyle = '#7d4b27';
  ctx.fill();
  ctx.fillStyle = 'rgba(40,20,5,0.35)';
  ctx.fillRect(tw * 0.12, -th - 4, tw * 0.38, th + 3);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -tw / 2, -th - 6, tw, th + 6, 3);
  ctx.stroke();
}
