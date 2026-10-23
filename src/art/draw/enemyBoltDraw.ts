import { ellipse, OUTLINE, roundRectPath, type Ctx } from './primitives';

export type EnemyBoltKind = 'bolt' | 'wool' | 'log' | 'rock';

export type EnemyBoltDrawOpts = {
  kind: EnemyBoltKind | string;
  color?: string;
  r: number;
  /** Flight angle — used for logs so the long axis points along the path. */
  ang?: number;
  /** Spin rotation (radians). */
  rot?: number;
};

/** Visual scale so ranged shots read clearly at gameplay distances. */
export const ENEMY_BOLT_VISUAL = 1.7;

/** Bright outer rim + dark outline so projectiles pop on forest greens. */
function strokeOutlier(ctx: Ctx, lineWidth: number) {
  const lw = Math.max(2.4, lineWidth);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = lw + 3.2;
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Legacy `EnemyBolt.draw` — local origin at projectile center (body drawn ~10px above feet). */
export function drawEnemyBolt(ctx: Ctx, opts: EnemyBoltDrawOpts) {
  const r = opts.r * ENEMY_BOLT_VISUAL;
  const color = opts.color || '#4db8ff';
  const kind = opts.kind || 'bolt';
  const rot = opts.rot || 0;
  const ang = opts.ang || 0;

  // Soft ground shadow (legacy drawShadow, inlined under the raised body).
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 0, 14, r * 1.05, r * 0.42);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -10);
  if (kind === 'wool') {
    ctx.rotate(rot);
    ctx.fillStyle = color || '#f4f0e8';
    ellipse(ctx, 0, 0, r, r * 0.9);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ellipse(ctx, -3, -3, r * 0.45, r * 0.4);
    ctx.fill();
    ellipse(ctx, 4, -1, r * 0.35, r * 0.32);
    ctx.fill();
    ellipse(ctx, 0, 4, r * 0.38, r * 0.3);
    ctx.fill();
    ellipse(ctx, 0, 0, r, r * 0.9);
    strokeOutlier(ctx, 2.2);
  } else if (kind === 'log') {
    ctx.rotate(ang + rot);
    const L = r * 2.4;
    // Thick trunk silhouette — was too skinny at gameplay distances.
    const W = r * 1.7;
    roundRectPath(ctx, -L / 2, -W / 2, L, W, 5);
    ctx.fillStyle = color || '#8a5a2a';
    ctx.fill();
    strokeOutlier(ctx, 2.4);
    ctx.fillStyle = '#c48a4a';
    ellipse(ctx, -L / 2 + 1, 0, W * 0.42, W * 0.42);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ellipse(ctx, L / 2 - 1, 0, W * 0.42, W * 0.42);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,8,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-L * 0.2, -W * 0.15);
    ctx.lineTo(L * 0.25, -W * 0.1);
    ctx.stroke();
  } else if (kind === 'rock') {
    ctx.rotate(rot);
    ctx.fillStyle = color || '#9a9088';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.15);
    ctx.lineTo(-r * 0.35, -r * 0.85);
    ctx.lineTo(r * 0.55, -r * 0.65);
    ctx.lineTo(r * 0.95, r * 0.25);
    ctx.lineTo(0.1 * r, r * 0.9);
    ctx.closePath();
    ctx.fill();
    strokeOutlier(ctx, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ellipse(ctx, -r * 0.2, -r * 0.25, r * 0.28, r * 0.2);
    ctx.fill();
  } else {
    // Energy bolt — solid core + bright halo + dark/light outline ring.
    const outer = r + 5;
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, outer);
    halo.addColorStop(0, '#ffffff');
    halo.addColorStop(0.35, color);
    halo.addColorStop(0.75, color);
    halo.addColorStop(1, 'rgba(30,80,160,0)');
    ctx.fillStyle = halo;
    ellipse(ctx, 0, 0, outer, outer);
    ctx.fill();
    ctx.fillStyle = color;
    ellipse(ctx, 0, 0, r * 0.78, r * 0.78);
    ctx.fill();
    ctx.fillStyle = '#eaf8ff';
    ellipse(ctx, -r * 0.18, -r * 0.18, r * 0.42, r * 0.42);
    ctx.fill();
    ellipse(ctx, 0, 0, r * 0.92, r * 0.92);
    strokeOutlier(ctx, 2.6);
  }
  ctx.restore();
}

/** Canvas size that fits scaled bolt art + outline + shadow for a given radius. */
export function enemyBoltCanvasSize(r: number, kind: string) {
  const vr = r * ENEMY_BOLT_VISUAL;
  const pad = kind === 'log' ? vr * 3.8 + 32 : vr * 3.0 + 30;
  const s = Math.ceil(pad * 2);
  return Math.max(64, s);
}
