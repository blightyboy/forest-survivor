import { clamp } from '../../core/math';
import { drawHpBar, ellipse, OUTLINE, roundRectPath, strokeLimb, type Ctx } from './primitives';

export type PlayerDrawState = {
  facing: number;
  walkTime: number;
  moveAmount: number;
  alive: boolean;
  flash: number;
  invuln: number;
  deathT?: number;
  hp?: number;
  maxHp?: number;
  dashCharges?: number;
  dashMax?: number;
  dashCd?: number;
  dashCdMax?: number;
};

/** Legacy Player.draw — local origin at feet, facing +x (caller mirrors via facing). */
export function drawPlayer(ctx: Ctx, p: PlayerDrawState) {
  const flash = p.flash > 0;
  const col = (c: string) => (flash ? '#ffffff' : c);
  ctx.save();
  if (!p.alive) {
    const t = Math.min((p.deathT || 0) * 2.5, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    ctx.rotate(-p.facing * ease * Math.PI * 0.48);
  } else if (p.invuln > 0 && Math.floor(p.invuln * 16) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }
  ctx.scale(p.facing, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const m = p.moveAmount;
  const ph = p.walkTime;
  const swing = Math.sin(ph) * 6 * m;
  const by = -Math.abs(Math.cos(ph)) * 2.2 * m;
  const liftA = -Math.max(0, Math.cos(ph)) * 3 * m;
  const liftB = -Math.max(0, -Math.cos(ph)) * 3 * m;
  const skin = col('#f2c29a');
  const plaid = col('#c8312b');
  const plaidBack = col('#9c2420');
  const denim = col('#3e5f95');
  const denimBack = col('#2e4a77');
  const leather = col('#6b4022');
  const beard = col('#8a4a1c');
  const beardDark = col('#6a3410');

  const boot = (x: number, y: number) => {
    roundRectPath(ctx, x - 3.5, y - 4, 9.5, 5, 2.2);
    ctx.fillStyle = leather;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = col('#2a1b12');
    ctx.fillRect(x - 3.5, y, 9.5, 1.6);
  };

  strokeLimb(ctx, -3, -14, -3 - swing, -4 + liftB, 5.5, denimBack);
  boot(-3 - swing, -1 + liftB);
  strokeLimb(ctx, -3.5, -28 + by, -5 - swing * 0.9, -18 + by, 5, plaidBack);
  ctx.fillStyle = skin;
  ellipse(ctx, -5 - swing * 0.9, -17 + by, 3, 3);
  ctx.fill();
  strokeLimb(ctx, 2, -14, 2 + swing, -4 + liftA, 5.5, denim);
  boot(2 + swing, -1 + liftA);

  roundRectPath(ctx, -9.5, -32 + by, 19, 21, 6);
  ctx.fillStyle = plaid;
  ctx.fill();
  if (!flash) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(25,6,6,0.42)';
    for (let x = -9; x < 10; x += 6) ctx.fillRect(x, -33 + by, 3, 23);
    for (let y = -31; y < -10; y += 6) ctx.fillRect(-10, y + by, 20, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-10, -32 + by, 20, 3);
    ctx.restore();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -9.5, -32 + by, 19, 21, 6);
  ctx.stroke();
  ctx.fillStyle = denim;
  ctx.fillRect(-9, -15 + by, 18, 3);
  ctx.fillStyle = col('#4a2c17');
  ctx.fillRect(-9, -16 + by, 18, 2.5);
  ctx.fillStyle = col('#e9c46a');
  ctx.fillRect(4, -16.5 + by, 3.5, 3.5);
  ctx.strokeStyle = col('#3a2414');
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(4, -31 + by);
  ctx.lineTo(5, -16 + by);
  ctx.moveTo(-4.5, -31 + by);
  ctx.lineTo(-3.5, -16 + by);
  ctx.stroke();

  const hx = 5 + swing * 0.9;
  const hy2 = -18 + by;
  strokeLimb(ctx, 2.5, -28 + by, (2.5 + hx) / 2 + 0.5, -23 + by, 5, plaid);
  strokeLimb(ctx, (2.5 + hx) / 2 + 0.5, -23 + by, hx, hy2, 4.2, skin);
  ctx.fillStyle = skin;
  ellipse(ctx, hx, hy2 + 0.5, 3, 3);
  ctx.fill();

  const hy = -41 + by;
  ctx.save();
  ctx.translate(1.6, hy);
  ctx.fillStyle = skin;
  ctx.fillRect(-2.2, 7, 5, 7);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2.2, 8);
  ctx.lineTo(-2.2, 14.2);
  ctx.moveTo(2.8, 8);
  ctx.lineTo(2.8, 14.2);
  ctx.stroke();
  ctx.fillStyle = skin;
  ellipse(ctx, 1.2, 0.2, 8.6, 9.1);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = skin;
  ellipse(ctx, -6.6, 1.6, 2.4, 3.1);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = col('#e0a87a');
  ellipse(ctx, -6.6, 1.6, 1.1, 1.6);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3.2, 5.5);
  ctx.quadraticCurveTo(-2.2, 12.4, 3.4, 13.2);
  ctx.quadraticCurveTo(8.6, 12.2, 8.2, 6.4);
  ctx.quadraticCurveTo(5.4, 8.4, 2.2, 8);
  ctx.quadraticCurveTo(-1, 7.4, -3.2, 5.5);
  ctx.closePath();
  ctx.fillStyle = beard;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5.4, 1.2);
  ctx.quadraticCurveTo(-6.2, 6.2, -2.8, 7.2);
  ctx.quadraticCurveTo(-2.2, 3.4, -5.4, 1.2);
  ctx.closePath();
  ctx.fillStyle = beard;
  ctx.fill();
  ctx.fillStyle = col('#e39f7c');
  ctx.beginPath();
  ctx.moveTo(7.6, -1.6);
  ctx.quadraticCurveTo(13.4, 0.2, 12.6, 2.4);
  ctx.quadraticCurveTo(10.2, 3.2, 7.8, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = beardDark;
  ellipse(ctx, 7.2, 3.6, 3.2, 1.35);
  ctx.fill();
  ctx.strokeStyle = col('#a45a3a');
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(5.6, 5.4);
  ctx.quadraticCurveTo(7.6, 6.4, 9.2, 5.2);
  ctx.stroke();
  ctx.fillStyle = flash ? '#ffffff' : '#f6f0e6';
  ellipse(ctx, 5.2, -2.2, 2.4, 2.6);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.fillStyle = flash ? '#ffffff' : '#1a1a1a';
  ellipse(ctx, 6.15, -2.2, 1.25, 1.6);
  ctx.fill();
  if (!flash) {
    ctx.fillStyle = '#fff';
    ellipse(ctx, 6.55, -2.85, 0.5, 0.5);
    ctx.fill();
  }
  ctx.strokeStyle = beardDark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(2.8, -5);
  ctx.lineTo(8.2, -4.4);
  ctx.stroke();
  ctx.fillStyle = col('#3d4148');
  ctx.beginPath();
  ctx.moveTo(-8.4, -2);
  ctx.quadraticCurveTo(-7.2, -14.6, 1.2, -15.2);
  ctx.quadraticCurveTo(10.2, -14, 10.4, -2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!flash) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.2;
    for (const kx of [-4.2, 0.2, 4.4]) {
      ctx.beginPath();
      ctx.moveTo(kx, -3.2);
      ctx.lineTo(kx + 1.1, -13);
      ctx.stroke();
    }
  }
  roundRectPath(ctx, -8.8, -4.6, 20, 4.7, 2);
  ctx.fillStyle = col('#c8312b');
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = col('#f1ece0');
  ellipse(ctx, -0.6, -15.6, 3.3, 3.1);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 1, 14, 5.5);
  ctx.fill();

  ctx.restore();

  if (p.alive) drawPlayerStatusBars(ctx, p);
}

/** Legacy Player.drawStatusBars — HP + dash segments under feet (local origin). */
export function drawPlayerStatusBars(ctx: Ctx, p: PlayerDrawState) {
  const maxHp = p.maxHp ?? 1;
  const hp = p.hp ?? maxHp;
  const w = 28;
  const h = 4;
  const x = -w / 2;
  const hpY = 1;
  const dashY = 10;
  const hpFrac = maxHp > 0 ? hp / maxHp : 0;
  const hpColor = hpFrac > 0.35 ? '#7ed957' : '#e85d4c';
  drawHpBar(ctx, 0, hpY, w, hpFrac, hpColor);

  const charges = Math.max(1, p.dashMax ?? 1);
  const dashCharges = p.dashCharges ?? charges;
  const dashCd = p.dashCd ?? 0;
  const dashCdMax = p.dashCdMax || 1.35;
  const gap = 1.5;
  const segW = (w - gap * (charges - 1)) / charges;
  for (let i = 0; i < charges; i++) {
    const sx = x + i * (segW + gap);
    const filled = i < dashCharges;
    const recharging = !filled && i === dashCharges && dashCd > 0;
    const frac = filled ? 1 : recharging ? clamp(1 - dashCd / dashCdMax, 0, 1) : 0;
    ctx.fillStyle = 'rgba(20,12,8,0.7)';
    roundRectPath(ctx, sx - 0.5, dashY - 1, segW + 1, h + 2, 2);
    ctx.fill();
    if (frac > 0.01) {
      ctx.fillStyle = filled ? '#7fd3ff' : '#5a9ec4';
      roundRectPath(ctx, sx, dashY, Math.max(1.5, segW * frac), h, 1.5);
      ctx.fill();
    }
    if (filled) {
      ctx.strokeStyle = 'rgba(180,230,255,0.55)';
      ctx.lineWidth = 1;
      roundRectPath(ctx, sx - 0.5, dashY - 1, segW + 1, h + 2, 2);
      ctx.stroke();
    }
  }
}
