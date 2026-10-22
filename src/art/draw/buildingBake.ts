import { ellipse, OUTLINE, roundRectPath, strokeLimb, type Ctx } from './primitives';

/** Legacy CampCore.draw (alive, no flash) — feet at origin. */
export function drawCampBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 10, 2, 64, 16);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;

  roundRectPath(ctx, -42, -54, 84, 50, 3);
  ctx.fillStyle = '#9a6232';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,30,10,0.45)';
  ctx.lineWidth = 1.5;
  for (let yy = -46; yy < -6; yy += 8) {
    ctx.beginPath();
    ctx.moveTo(-41, yy);
    ctx.lineTo(41, yy);
    ctx.stroke();
  }
  ctx.fillStyle = '#dcae74';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  for (let yy = -50; yy < -6; yy += 8) {
    for (const xx of [-43, 43]) {
      ellipse(ctx, xx, yy, 3.6, 3.6);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.lineWidth = 2;
  roundRectPath(ctx, -10, -31, 20, 27, 4);
  ctx.fillStyle = '#4a2c14';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e9c46a';
  ellipse(ctx, 5, -17, 1.6, 1.6);
  ctx.fill();
  for (const wx of [-34, 20]) {
    ctx.fillStyle = '#8cc2e0';
    ctx.fillRect(wx, -42, 14, 12);
    ctx.strokeRect(wx, -42, 14, 12);
    ctx.beginPath();
    ctx.moveTo(wx + 7, -42);
    ctx.lineTo(wx + 7, -30);
    ctx.moveTo(wx, -36);
    ctx.lineTo(wx + 14, -36);
    ctx.stroke();
  }
  ctx.fillStyle = '#7d858b';
  ctx.fillRect(22, -88, 11, 22);
  ctx.strokeRect(22, -88, 11, 22);
  ctx.beginPath();
  ctx.moveTo(-55, -50);
  ctx.lineTo(0, -94);
  ctx.lineTo(55, -50);
  ctx.closePath();
  ctx.fillStyle = '#a8432e';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -94);
  ctx.lineTo(55, -50);
  ctx.lineTo(0, -50);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,15,5,0.5)';
  ctx.lineWidth = 1.3;
  for (let k = 1; k < 4; k++) {
    const yy = -50 - k * 11;
    const hw = 55 * (1 - (k * 11) / 44);
    ctx.beginPath();
    ctx.moveTo(-hw, yy);
    ctx.lineTo(hw, yy);
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-50, -50);
  ctx.lineTo(-50, -122);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-50, -122);
  ctx.quadraticCurveTo(-36, -122, -22, -114);
  ctx.quadraticCurveTo(-36, -108, -50, -106);
  ctx.closePath();
  ctx.fillStyle = '#e5484d';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** Legacy Campfire.draw (mid flame pose). */
export function drawCampfireBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, 0, 1, 24, 9);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.sin(a) >= 0) continue;
    ellipse(ctx, Math.cos(a) * 18, Math.sin(a) * 8 - 2, 5, 3.6);
    ctx.fillStyle = '#8b9196';
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#6b4022';
  for (const r of [-0.4, 0.4]) {
    ctx.save();
    ctx.rotate(r);
    roundRectPath(ctx, -15, -6, 30, 6, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  const layers: [string, number, number][] = [
    ['#e8452c', 12, 28],
    ['#f7931e', 8.5, 21],
    ['#ffe066', 5, 12],
  ];
  layers.forEach((L) => {
    const w = L[1];
    const h = L[2];
    ctx.beginPath();
    ctx.moveTo(-w, -5);
    ctx.quadraticCurveTo(-w * 1.05, -h * 0.55, 0, -h - 4);
    ctx.quadraticCurveTo(w * 1.05, -h * 0.55, w, -5);
    ctx.quadraticCurveTo(0, 1, -w, -5);
    ctx.fillStyle = L[0];
    ctx.fill();
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.sin(a) < 0) continue;
    ellipse(ctx, Math.cos(a) * 18, Math.sin(a) * 8 - 2, 5, 3.6);
    ctx.fillStyle = '#9aa0a5';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Legacy Tower.draw (built). */
export function drawTowerBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 10, 2, 28, 9);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  strokeLimb(ctx, -15, 0, -11, -58, 4.5, '#6b4022');
  strokeLimb(ctx, 15, 0, 11, -58, 4.5, '#6b4022');
  ctx.strokeStyle = '#5a3519';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-13, -8);
  ctx.lineTo(12, -42);
  ctx.moveTo(13, -8);
  ctx.lineTo(-12, -42);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -22, -66, 44, 10, 2);
  ctx.fillStyle = '#9a6232';
  ctx.fill();
  ctx.stroke();
  const ax = 2;
  ctx.fillStyle = '#f5c9a0';
  ellipse(ctx, ax, -77, 5.5, 5.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(ax, -78, 6.2, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(ax + 6, -74, 7, -1.2, 1.2);
  ctx.stroke();
  ctx.fillStyle = '#9a6232';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  for (const px of [-20, -7, 7, 20]) ctx.fillRect(px - 1.5, -76, 3, 10);
  ctx.fillRect(-22, -77, 44, 3);
  ctx.strokeRect(-22, -77, 44, 3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, -86);
  ctx.lineTo(0, -108);
  ctx.lineTo(26, -86);
  ctx.closePath();
  ctx.fillStyle = '#a8432e';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -108);
  ctx.lineTo(26, -86);
  ctx.lineTo(0, -86);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ctx.strokeStyle = '#6b4022';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-20, -86);
  ctx.lineTo(-20, -77);
  ctx.moveTo(20, -86);
  ctx.lineTo(20, -77);
  ctx.stroke();
  ctx.fillStyle = '#f7931e';
  ellipse(ctx, 24, -76, 3, 5);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ellipse(ctx, 24, -74, 1.6, 3);
  ctx.fill();
  ctx.restore();
}

/** Legacy wall post (wood stake). */
export function drawWallPostBaked(ctx: Ctx, stone = false) {
  const H = stone ? 34 : 30;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ellipse(ctx, 4, 2, 10, 4);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  roundRectPath(ctx, -6, -H, 12, H, 2.5);
  ctx.fillStyle = stone ? '#8f979d' : '#9a6232';
  ctx.fill();
  ctx.stroke();
  if (stone) {
    ctx.fillStyle = '#b3bbc1';
    ctx.fillRect(-6, -H - 3, 5, 4);
    ctx.fillRect(1, -H - 3, 5, 4);
  } else {
    ctx.beginPath();
    ctx.moveTo(-6, -H);
    ctx.lineTo(0, -H - 8);
    ctx.lineTo(6, -H);
    ctx.closePath();
    ctx.fillStyle = '#c08850';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5d6b75';
    ctx.fillRect(-6, -H * 0.55, 12, 3);
  }
  ctx.restore();
}

/** Legacy Mill.draw (blade at rest angle). */
export function drawMillBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 6, 2, 46, 11);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  for (const [lx, ly] of [[-40, -6], [-31, -6], [-35.5, -14]] as const) {
    roundRectPath(ctx, lx - 14, ly - 4, 14, 8, 4);
    ctx.fillStyle = '#9c6a3c';
    ctx.fill();
    ctx.stroke();
    ellipse(ctx, lx, ly, 3.5, 4);
    ctx.fillStyle = '#e8bb80';
    ctx.fill();
    ctx.stroke();
  }
  roundRectPath(ctx, -24, -36, 54, 36, 2);
  ctx.fillStyle = '#8d5a2e';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(-14, -26, 30, 26);
  ctx.beginPath();
  ctx.moveTo(-32, -32);
  ctx.lineTo(-22, -54);
  ctx.lineTo(28, -54);
  ctx.lineTo(38, -32);
  ctx.closePath();
  ctx.fillStyle = '#7a6a55';
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(1, -14);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 9 : 11.5;
    const a = (i / 24) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#c3ced6';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#5d6b75';
  ellipse(ctx, 0, 0, 2.5, 2.5);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Legacy GoldMine.draw. */
export function drawMineBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 6, 2, 40, 11);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.fillStyle = '#5a5f66';
  ctx.beginPath();
  ctx.moveTo(-26, 2);
  ctx.lineTo(-14, -16);
  ctx.lineTo(10, -16);
  ctx.lineTo(22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a2d32';
  ctx.fillRect(-10, -16, 16, 18);
  ctx.strokeRect(-10, -16, 16, 18);
  strokeLimb(ctx, -22, 0, -6, -46, 4, '#6b4022');
  strokeLimb(ctx, 18, 0, 8, -46, 4, '#6b4022');
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -12, -50, 26, 8, 2);
  ctx.fillStyle = '#8d5a2e';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#5a3519';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(1, -42);
  ctx.lineTo(1, -18);
  ctx.stroke();
  ctx.fillStyle = '#f5c242';
  ellipse(ctx, 20, -4, 7, 4);
  ctx.fill();
  ellipse(ctx, 26, -2, 5, 3.2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ellipse(ctx, 20, -4, 7, 4);
  ctx.stroke();
  ctx.restore();
}

/** Legacy Butcher.draw. */
export function drawButcherBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 6, 2, 38, 10);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -22, -32, 44, 32, 2);
  ctx.fillStyle = '#a07048';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(-12, -22, 24, 22);
  ctx.beginPath();
  ctx.moveTo(-28, -28);
  ctx.lineTo(0, -50);
  ctx.lineTo(28, -28);
  ctx.closePath();
  ctx.fillStyle = '#8a3a2a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c4553e';
  ellipse(ctx, -14, -18, 4, 6);
  ctx.fill();
  ellipse(ctx, 14, -18, 4, 6);
  ctx.fill();
  ctx.strokeRect(-18, -24, 8, 12);
  ctx.strokeRect(10, -24, 8, 12);
  roundRectPath(ctx, -10, -8, 20, 6, 2);
  ctx.fillStyle = '#d8c4a0';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Legacy Blacksmith.draw. */
export function drawBlacksmithBaked(ctx: Ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 6, 2, 42, 11);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -26, -34, 52, 34, 2);
  ctx.fillStyle = '#6a6f76';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a2d32';
  ctx.fillRect(-12, -24, 24, 24);
  ctx.beginPath();
  ctx.moveTo(-32, -30);
  ctx.lineTo(0, -54);
  ctx.lineTo(32, -30);
  ctx.closePath();
  ctx.fillStyle = '#8a3a2a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a3e44';
  roundRectPath(ctx, -14, -10, 28, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-6, -2, 12, 8);
  ctx.strokeRect(-6, -2, 12, 8);
  ctx.fillStyle = 'rgba(255,140,50,0.45)';
  ellipse(ctx, 16, -18, 7, 5);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ellipse(ctx, 16, -18, 3.5, 2.5);
  ctx.fill();
  ctx.strokeStyle = '#6b4022';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-18, -28);
  ctx.lineTo(-6, -16);
  ctx.stroke();
  ctx.fillStyle = '#c3ced6';
  roundRectPath(ctx, -22, -32, 10, 6, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
