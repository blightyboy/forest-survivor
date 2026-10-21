'use strict';

const BASE_HALF = 400;          // centre to palisade (square yard)
const WALL_HALF = 372;
const SEGS_PER_SIDE = 8;
const WALL_SOLID_R = 48;
const MILL_INTERVAL = 10;
const TOWER_INSET = 48;

function drawStakes(ctx, w) {
  ctx.strokeStyle = 'rgba(255,236,170,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(-w / 2, -w * 0.35, w, w * 0.7);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(122,82,44,0.7)';
  for (const [sx, sy] of [[-w / 2, -w * 0.35], [w / 2, -w * 0.35], [-w / 2, w * 0.35], [w / 2, w * 0.35]]) {
    ctx.fillRect(sx - 2, sy - 8, 4, 9);
  }
}

function drawLevelBadge(ctx, x, y, level) {
  if (!(level > 0)) return;
  const text = 'Lv ' + level;
  ctx.save();
  ctx.font = 'bold 10px Trebuchet MS, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.ceil(ctx.measureText(text).width) + 10;
  const h = 15;
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 7);
  ctx.fillStyle = 'rgba(30, 21, 12, 0.88)';
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffe78a';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

// ===========================================================================
// Structures
// ===========================================================================

class CampCore {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'core';
    this.x = x; this.y = y;
    this.solidR = 44;
    this.maxHp = 300;
    this.hp = 300;
    this.level = 0;
    this.alive = true;
    this.flash = 0;
  }

  isSolid() { return true; }
  isHittable() { return false; }

  takeHit(dmg, game) {
    if (!this.alive) return;
    this.hp -= dmg;
    this.flash = 0.12;
    game.fx.woodChips(this.x, this.y - 30, this.x, this.y + 40, 4);
    game.onCampHit(this, dmg);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      game.onCampDestroyed();
    }
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(ctx, this.x + 10, this.y + 2, 64, 16);
    ctx.fill();
  }

  draw(ctx, game) {
    const s = 1 + this.level * 0.035;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    if (!this.alive) {
      ctx.fillStyle = '#3a2a1c';
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i - 3) * 0.3);
        roundRectPath(ctx, -40 + i * 12, -8, 34, 7, 3);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    const f = this.flash > 0;
    if (this.level >= 3) {
      roundRectPath(ctx, -49, -9, 98, 11, 3);
      ctx.fillStyle = f ? '#fff' : '#8a9096';
      ctx.fill(); ctx.stroke();
    }
    // log walls
    roundRectPath(ctx, -42, -54, 84, 50, 3);
    ctx.fillStyle = f ? '#fff' : '#9a6232';
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,30,10,0.45)';
    ctx.lineWidth = 1.5;
    for (let yy = -46; yy < -6; yy += 8) {
      ctx.beginPath(); ctx.moveTo(-41, yy); ctx.lineTo(41, yy); ctx.stroke();
    }
    ctx.fillStyle = f ? '#fff' : '#dcae74';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    for (let yy = -50; yy < -6; yy += 8) {
      for (const xx of [-43, 43]) { ellipse(ctx, xx, yy, 3.6, 3.6); ctx.fill(); ctx.stroke(); }
    }
    // door
    ctx.lineWidth = 2;
    roundRectPath(ctx, -10, -31, 20, 27, 4);
    ctx.fillStyle = '#4a2c14'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e9c46a';
    ellipse(ctx, 5, -17, 1.6, 1.6); ctx.fill();
    // windows (glow at night)
    const glow = game.darkLevel > 0.3;
    for (const wx of [-34, 20]) {
      ctx.fillStyle = glow ? '#ffd27a' : '#8cc2e0';
      ctx.fillRect(wx, -42, 14, 12);
      ctx.strokeRect(wx, -42, 14, 12);
      ctx.beginPath(); ctx.moveTo(wx + 7, -42); ctx.lineTo(wx + 7, -30); ctx.moveTo(wx, -36); ctx.lineTo(wx + 14, -36); ctx.stroke();
    }
    // chimney
    ctx.fillStyle = f ? '#fff' : '#7d858b';
    ctx.fillRect(22, -88, 11, 22);
    ctx.strokeRect(22, -88, 11, 22);
    // roof
    ctx.beginPath();
    ctx.moveTo(-55, -50); ctx.lineTo(0, -94); ctx.lineTo(55, -50);
    ctx.closePath();
    ctx.fillStyle = f ? '#fff' : '#a8432e';
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -94); ctx.lineTo(55, -50); ctx.lineTo(0, -50);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,15,5,0.5)';
    ctx.lineWidth = 1.3;
    for (let k = 1; k < 4; k++) {
      const yy = -50 - k * 11, hw = 55 * (1 - (k * 11) / 44);
      ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy); ctx.stroke();
    }
    // flag
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-50, -50); ctx.lineTo(-50, -122); ctx.stroke();
    const wave = Math.sin(game.time * 4) * 3;
    ctx.beginPath();
    ctx.moveTo(-50, -122);
    ctx.quadraticCurveTo(-36, -122 + wave, -22, -114 + wave);
    ctx.quadraticCurveTo(-36, -108 - wave, -50, -106);
    ctx.closePath();
    ctx.fillStyle = this.level >= 5 ? '#ffd23f' : '#e5484d';
    ctx.fill();
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    if (this.hp < this.maxHp) {
      drawHpBar(ctx, this.x, this.y - 140 * s, 80, this.hp / this.maxHp, '#ffcf4a');
    }
    drawLevelBadge(ctx, this.x, this.y - (this.hp < this.maxHp ? 152 : 132) * s, this.level);
  }
}

class Campfire {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'campfire';
    this.x = x; this.y = y;
    this.solidR = 16;
    this.level = 0;
  }

  isSolid() { return true; }
  isHittable() { return false; }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, this.x, this.y + 1, 24, 9);
    ctx.fill();
  }

  draw(ctx, game) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    // Back rocks (negative Y / farther) under the fire, front rocks over it.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      if (Math.sin(a) >= 0) continue;
      ellipse(ctx, Math.cos(a) * 18, Math.sin(a) * 8 - 2, 5, 3.6);
      ctx.fillStyle = '#8b9196'; ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#6b4022';
    for (const r of [-0.4, 0.4]) {
      ctx.save(); ctx.rotate(r);
      roundRectPath(ctx, -15, -6, 30, 6, 3); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const t = game.time;
    const size = 1 + this.level * 0.08;
    const layers = [['#e8452c', 12, 28], ['#f7931e', 8.5, 21], ['#ffe066', 5, 12]];
    layers.forEach((L, k) => {
      const fl = 1 + Math.sin(t * 17 + k * 2.1) * 0.13 + Math.sin(t * 29 + k) * 0.06;
      const w = L[1] * size, h = L[2] * size * fl;
      ctx.beginPath();
      ctx.moveTo(-w, -5);
      ctx.quadraticCurveTo(-w * 1.05, -h * 0.55, Math.sin(t * 9 + k) * 2, -h - 4);
      ctx.quadraticCurveTo(w * 1.05, -h * 0.55, w, -5);
      ctx.quadraticCurveTo(0, 1, -w, -5);
      ctx.fillStyle = L[0];
      ctx.fill();
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      if (Math.sin(a) < 0) continue;
      ellipse(ctx, Math.cos(a) * 18, Math.sin(a) * 8 - 2, 5, 3.6);
      ctx.fillStyle = '#9aa0a5'; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    drawLevelBadge(ctx, this.x, this.y - 44 - this.level * 2, this.level);
  }
}

class Tower {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'tower';
    this.x = x; this.y = y;
    this.solidR = 18;
    this.built = false;
    this.buildT = 1;
    this.cooldown = rand(0, 0.5);
    this.aim = 1;
    this.recoil = 0;
  }

  isSolid() { return this.built; }
  isHittable() { return false; }

  drawShadow(ctx) {
    if (!this.built) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x + 10, this.y + 2, 28, 9);
    ctx.fill();
  }

  draw(ctx, game) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.built) {
      drawStakes(ctx, 34);
      ctx.restore();
      return;
    }
    const g = easeOutBack(clamp(this.buildT, 0, 1));
    ctx.scale(1, g);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    strokeLimb(ctx, -15, 0, -11, -58, 4.5, '#6b4022');
    strokeLimb(ctx, 15, 0, 11, -58, 4.5, '#6b4022');
    ctx.strokeStyle = '#5a3519';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-13, -8); ctx.lineTo(12, -42); ctx.moveTo(13, -8); ctx.lineTo(-12, -42);
    ctx.stroke();
    // platform + railing
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -22, -66, 44, 10, 2);
    ctx.fillStyle = '#9a6232'; ctx.fill(); ctx.stroke();
    // archer
    const ax = this.aim * 2;
    ctx.fillStyle = '#f5c9a0';
    ellipse(ctx, ax, -77, 5.5, 5.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(ax, -78, 6.2, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a5a2e';
    ctx.lineWidth = 1.8;
    const bowA = this.aim > 0 ? 0 : Math.PI;
    ctx.beginPath();
    ctx.arc(ax + this.aim * 6, -74, 7, bowA - 1.2, bowA + 1.2);
    ctx.stroke();
    ctx.fillStyle = '#9a6232';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    for (const px of [-20, -7, 7, 20]) { ctx.fillRect(px - 1.5, -76, 3, 10); }
    ctx.fillRect(-22, -77, 44, 3);
    ctx.strokeRect(-22, -77, 44, 3);
    // roof
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, -86); ctx.lineTo(0, -108); ctx.lineTo(26, -86);
    ctx.closePath();
    ctx.fillStyle = '#a8432e'; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -108); ctx.lineTo(26, -86); ctx.lineTo(0, -86);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    ctx.strokeStyle = '#6b4022'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-20, -86); ctx.lineTo(-20, -77); ctx.moveTo(20, -86); ctx.lineTo(20, -77); ctx.stroke();
    // torch
    const fl = 1 + Math.sin(game.time * 20 + this.x) * 0.15;
    ctx.fillStyle = '#f7931e';
    ellipse(ctx, 24, -72 - 4 * fl, 3, 5 * fl); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ellipse(ctx, 24, -71 - 3 * fl, 1.6, 3 * fl); ctx.fill();
    ctx.restore();
  }
}

class Mill {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'mill';
    this.x = x; this.y = y;
    this.solidR = 30;
    this.built = false;
    this.level = 0;
    this.buildT = 1;
  }

  isSolid() { return this.built; }
  isHittable() { return false; }

  drawShadow(ctx) {
    if (!this.built) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x + 6, this.y + 2, 46, 11);
    ctx.fill();
  }

  draw(ctx, game) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.built) {
      drawStakes(ctx, 56);
      ctx.restore();
      return;
    }
    const g = easeOutBack(clamp(this.buildT, 0, 1));
    ctx.scale(1, g);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    // log pile
    for (const [lx, ly] of [[-40, -6], [-31, -6], [-35.5, -14]]) {
      roundRectPath(ctx, lx - 14, ly - 4, 14, 8, 4);
      ctx.fillStyle = '#9c6a3c'; ctx.fill(); ctx.stroke();
      ellipse(ctx, lx, ly, 3.5, 4);
      ctx.fillStyle = '#e8bb80'; ctx.fill(); ctx.stroke();
    }
    // shed
    roundRectPath(ctx, -24, -36, 54, 36, 2);
    ctx.fillStyle = '#8d5a2e'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(-14, -26, 30, 26);
    ctx.beginPath();
    ctx.moveTo(-32, -32); ctx.lineTo(-22, -54); ctx.lineTo(28, -54); ctx.lineTo(38, -32);
    ctx.closePath();
    ctx.fillStyle = '#7a6a55'; ctx.fill(); ctx.stroke();
    // spinning saw blade
    const spin = game.time * 8;
    ctx.save();
    ctx.translate(1, -14);
    ctx.rotate(spin);
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? 9 : 11.5;
      const a = (i / 24) * TAU;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#c3ced6'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#5d6b75';
    ellipse(ctx, 0, 0, 2.5, 2.5); ctx.fill();
    ctx.restore();
    ctx.restore();
    drawLevelBadge(ctx, this.x, this.y - 68, this.level);
  }
}

class WallSegment {
  constructor(x, y, angle) {
    this.type = 'structure';
    this.kind = 'wall';
    this.angle = angle;
    this.x = x; this.y = y;
    this.solidR = WALL_SOLID_R;
    this.maxHp = 100;
    this.hp = 100;
    this.alive = true;
    this.level = 1;
    this.flash = 0;
    this.buildT = 0;
    this.showLevel = false;
    const tx = -Math.sin(this.angle), ty = Math.cos(this.angle);
    this.posts = [-26, -13, 0, 13, 26]
      .map((o) => ({ x: tx * o, y: ty * o }))
      .sort((a, b) => a.y - b.y);
  }

  takeHit(dmg, game) {
    if (!this.alive) return;
    this.hp -= dmg;
    this.flash = 0.12;
    game.fx.woodChips(this.x, this.y - 12, this.x + Math.cos(this.angle) * 60, this.y + Math.sin(this.angle) * 60, 4);
    Sound.play('chop', 0.7);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      game.onWallDestroyed(this);
    }
  }

  drawShadow(ctx) {
    if (!this.alive) return;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(ctx, this.x + 4, this.y + 2, 32, 9);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.8;
    if (!this.alive) {
      ctx.fillStyle = '#5e4128';
      for (let i = 0; i < 3; i++) {
        const p = this.posts[i + 1];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(this.angle + i);
        roundRectPath(ctx, -12, -3, 24, 6, 3);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    const g = easeOutBack(clamp(this.buildT, 0, 1));
    const stone = this.level >= 5;
    const H = (stone ? 34 : 28 + this.level) * g;
    const f = this.flash > 0;
    const col = f ? '#fff' : stone ? '#8f979d' : '#9a6232';
    const top = f ? '#fff' : stone ? '#b3bbc1' : '#c08850';
    for (const p of this.posts) {
      roundRectPath(ctx, p.x - 6, p.y - H, 12, H, 2.5);
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      if (stone) {
        ctx.fillStyle = top;
        ctx.fillRect(p.x - 6, p.y - H - 3, 5, 4);
        ctx.fillRect(p.x + 1, p.y - H - 3, 5, 4);
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y - H); ctx.lineTo(p.x, p.y - H - 8); ctx.lineTo(p.x + 6, p.y - H);
        ctx.closePath();
        ctx.fillStyle = top; ctx.fill(); ctx.stroke();
      }
      if (this.level >= 3 && !stone) {
        ctx.fillStyle = '#5d6b75';
        ctx.fillRect(p.x - 6, p.y - H * 0.55, 12, 3);
      }
      if (this.hp < this.maxHp * 0.5) {
        ctx.strokeStyle = 'rgba(30,15,5,0.8)';
        ctx.beginPath(); ctx.moveTo(p.x - 3, p.y - H * 0.8); ctx.lineTo(p.x + 1, p.y - H * 0.6); ctx.lineTo(p.x - 2, p.y - H * 0.4); ctx.stroke();
        ctx.strokeStyle = OUTLINE;
      }
    }
    ctx.restore();
    if (this.hp < this.maxHp) drawHpBar(ctx, this.x, this.y - H - 18, 34, this.hp / this.maxHp, '#ffcf4a');
    if (this.showLevel && this.alive) {
      drawLevelBadge(ctx, this.x, this.y - H - (this.hp < this.maxHp ? 34 : 18), this.level);
    }
  }
}

// ===========================================================================
// Projectiles
// ===========================================================================

class GoldMine {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'mine';
    this.x = x; this.y = y;
    this.solidR = 28;
    this.built = false;
    this.level = 0;
    this.buildT = 1;
  }

  isSolid() { return this.built; }
  isHittable() { return false; }

  drawShadow(ctx) {
    if (!this.built) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x + 6, this.y + 2, 40, 11);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.built) {
      drawStakes(ctx, 52);
      ctx.restore();
      return;
    }
    const g = easeOutBack(clamp(this.buildT, 0, 1));
    ctx.scale(1, g);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#5a5f66';
    ctx.beginPath();
    ctx.moveTo(-26, 2); ctx.lineTo(-14, -16); ctx.lineTo(10, -16); ctx.lineTo(22, 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2d32';
    ctx.fillRect(-10, -16, 16, 18);
    ctx.strokeRect(-10, -16, 16, 18);
    strokeLimb(ctx, -22, 0, -6, -46, 4, '#6b4022');
    strokeLimb(ctx, 18, 0, 8, -46, 4, '#6b4022');
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    roundRectPath(ctx, -12, -50, 26, 8, 2);
    ctx.fillStyle = '#8d5a2e'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5a3519'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(1, -42); ctx.lineTo(1, -18); ctx.stroke();
    ctx.fillStyle = '#f5c242';
    ellipse(ctx, 20, -4, 7, 4); ctx.fill();
    ellipse(ctx, 26, -2, 5, 3.2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3;
    ellipse(ctx, 20, -4, 7, 4); ctx.stroke();
    ctx.restore();
    drawLevelBadge(ctx, this.x, this.y - 64, this.level);
  }
}

class Butcher {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'butcher';
    this.x = x; this.y = y;
    this.solidR = 26;
    this.built = false;
    this.level = 0;
    this.buildT = 1;
  }

  isSolid() { return this.built; }
  isHittable() { return false; }

  drawShadow(ctx) {
    if (!this.built) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x + 6, this.y + 2, 38, 10);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.built) {
      drawStakes(ctx, 48);
      ctx.restore();
      return;
    }
    const g = easeOutBack(clamp(this.buildT, 0, 1));
    ctx.scale(1, g);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -22, -32, 44, 32, 2);
    ctx.fillStyle = '#a07048'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(-12, -22, 24, 22);
    ctx.beginPath();
    ctx.moveTo(-28, -28); ctx.lineTo(0, -50); ctx.lineTo(28, -28);
    ctx.closePath();
    ctx.fillStyle = '#8a3a2a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c4553e';
    ellipse(ctx, -14, -18, 4, 6); ctx.fill();
    ellipse(ctx, 14, -18, 4, 6); ctx.fill();
    ctx.strokeRect(-14 - 4, -18 - 6, 8, 12);
    ctx.strokeRect(10, -24, 8, 12);
    roundRectPath(ctx, -10, -8, 20, 6, 2);
    ctx.fillStyle = '#d8c4a0'; ctx.fill(); ctx.stroke();
    ctx.restore();
    drawLevelBadge(ctx, this.x, this.y - 64, this.level);
  }
}

class Blacksmith {
  constructor(x, y) {
    this.type = 'structure';
    this.kind = 'blacksmith';
    this.x = x; this.y = y;
    this.solidR = 28;
    this.built = false;
    this.level = 0;
    this.buildT = 1;
  }

  isSolid() { return this.built; }
  isHittable() { return false; }

  drawShadow(ctx) {
    if (!this.built) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x + 6, this.y + 2, 42, 11);
    ctx.fill();
  }

  draw(ctx, game) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.built) {
      drawStakes(ctx, 52);
      ctx.restore();
      return;
    }
    const g = easeOutBack(clamp(this.buildT, 0, 1));
    ctx.scale(1, g);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -26, -34, 52, 34, 2);
    ctx.fillStyle = '#6a6f76'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2d32';
    ctx.fillRect(-12, -24, 24, 24);
    ctx.beginPath();
    ctx.moveTo(-32, -30); ctx.lineTo(0, -54); ctx.lineTo(32, -30);
    ctx.closePath();
    ctx.fillStyle = '#8a3a2a'; ctx.fill(); ctx.stroke();
    // anvil
    ctx.fillStyle = '#3a3e44';
    roundRectPath(ctx, -14, -10, 28, 8, 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(-6, -2, 12, 8);
    ctx.strokeRect(-6, -2, 12, 8);
    // forge glow
    const pulse = 0.7 + Math.sin(game.time * 9) * 0.2;
    ctx.fillStyle = 'rgba(255,140,50,' + (0.45 * pulse) + ')';
    ellipse(ctx, 16, -18, 7, 5); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ellipse(ctx, 16, -18, 3.5, 2.5); ctx.fill();
    // hammer
    ctx.strokeStyle = '#6b4022';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-18, -28); ctx.lineTo(-6, -16); ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    roundRectPath(ctx, -22, -32, 10, 6, 1.5); ctx.fill(); ctx.stroke();
    ctx.restore();
    drawLevelBadge(ctx, this.x, this.y - 68, this.level);
  }
}

class Arrow {
  constructor(x, y, z, target, dmg) {
    this.x = x; this.y = y; this.z = z;
    this.target = target;
    this.dmg = dmg;
    this.speed = 720;
    this.life = 1.4;
    this.dead = false;
    const dx = target.x - x, dy = target.y - target.bodyOff - y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * this.speed;
    this.vy = (dy / d) * this.speed;
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const t = this.target;
    if (t && !t.dead) {
      const dx = t.x - this.x, dy = t.y - t.bodyOff - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < t.radius + 6 + this.speed * dt) {
        this.dead = true;
        t.damage(this.dmg, game, this.x, this.y, 0.3);
        game.addText(t.x + rand(-8, 8), t.y - t.height, String(this.dmg), '#9fd8ff', 13, { vx: rand(-20, 20), life: 0.6 });
        return;
      }
      this.vx = (dx / d) * this.speed;
      this.vy = (dy / d) * this.speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z = Math.max(10, this.z - 90 * dt);
  }

  draw(ctx) {
    const a = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    ctx.rotate(a);
    ctx.strokeStyle = '#6b4022';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(4, 0); ctx.stroke();
    ctx.fillStyle = '#c3ced6';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f1f1f1';
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-18, -3.5); ctx.lineTo(-11, 0); ctx.lineTo(-18, 3.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// ===========================================================================
// Base controller
// ===========================================================================

class Base {
  constructor(x, y, world) {
    this.x = x; this.y = y;
    this.core = new CampCore(x, y - 40);
    this.campfire = new Campfire(x, y + 70);
    const c = WALL_HALF - TOWER_INSET;
    // 8 posts: 4 corners + 4 mid-sides of the square yard
    this.towers = [
      new Tower(x - c, y - c), new Tower(x + c, y - c),
      new Tower(x - c, y + c), new Tower(x + c, y + c),
      new Tower(x, y - c), new Tower(x, y + c),
      new Tower(x - c, y), new Tower(x + c, y),
    ];
    this.mill = new Mill(x - 210, y + 160);
    this.mine = new GoldMine(x + 210, y + 160);
    this.butcher = new Butcher(x + 200, y - 30);
    this.blacksmith = new Blacksmith(x - 200, y - 30);
    this.walls = [];
    this.incomeTimer = MILL_INTERVAL;
    this.healFx = 0;
    for (const s of [this.core, this.campfire, this.mill, this.mine, this.butcher, this.blacksmith, ...this.towers]) {
      world.staticGrid.insert(s);
    }
  }

  contains(x, y, pad = 0) {
    const h = BASE_HALF + pad;
    return Math.abs(x - this.x) <= h && Math.abs(y - this.y) <= h;
  }

  makeWalls() {
    const walls = [];
    const h = WALL_HALF, n = SEGS_PER_SIDE;
    const sides = [
      { x0: -h, y0: -h, x1: h, y1: -h, ang: -Math.PI / 2 },
      { x0: h, y0: -h, x1: h, y1: h, ang: 0 },
      { x0: h, y0: h, x1: -h, y1: h, ang: Math.PI / 2 },
      { x0: -h, y0: h, x1: -h, y1: -h, ang: Math.PI },
    ];
    for (const s of sides) {
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        walls.push(new WallSegment(
          this.x + lerp(s.x0, s.x1, t),
          this.y + lerp(s.y0, s.y1, t),
          s.ang
        ));
      }
    }
    // North-side middle segment carries the shared palisade level badge.
    if (walls.length) walls[Math.floor(n / 2)].showLevel = true;
    return walls;
  }

  /** Applies purchased camp levels. Upgrading walls or the camp also repairs them. */
  apply(levels, stats) {
    const core = this.core;
    if (core.alive) {
      const diff = stats.campHp - core.maxHp;
      core.maxHp = stats.campHp;
      core.hp = Math.min(core.maxHp, core.hp + Math.max(0, diff));
    }
    core.level = levels.camp;
    this.campfire.level = levels.campfire;

    if (stats.wallHp > 0) {
      if (!this.walls.length) this.walls = this.makeWalls();
      for (const w of this.walls) {
        if (w.level !== levels.walls || !w.alive) w.buildT = w.alive ? 1 : 0;
        w.level = levels.walls;
        w.maxHp = stats.wallHp;
        w.hp = w.maxHp;
        w.alive = true;
      }
    }
    this.towers.forEach((t, i) => {
      const should = i < stats.towerCount;
      if (should && !t.built) { t.built = true; t.buildT = 0; }
    });
    const build = (b, lvl) => {
      if (lvl > 0 && !b.built) { b.built = true; b.buildT = 0; }
      b.level = lvl;
    };
    build(this.mill, levels.mill);
    build(this.mine, levels.mine);
    build(this.butcher, levels.butcher);
    build(this.blacksmith, levels.blacksmith);
  }

  onDawn() {
    const core = this.core;
    if (core.alive) core.hp = core.maxHp;
    for (const w of this.walls) {
      if (!w.alive) w.buildT = 0;
      w.alive = true;
      w.hp = w.maxHp;
    }
  }

  /** Pushes an animal out of standing wall segments; returns the wall it touched. */
  collideWalls(e, r) {
    if (!this.walls.length) return null;
    const cheb = Math.max(Math.abs(e.x - this.x), Math.abs(e.y - this.y));
    if (Math.abs(cheb - WALL_HALF) > r + WALL_SOLID_R + 6) return null;
    let touched = null;
    for (const w of this.walls) {
      if (!w.alive) continue;
      const rr = r + w.solidR;
      let ox = e.x - w.x, oy = e.y - w.y;
      const d2 = ox * ox + oy * oy;
      if (d2 >= rr * rr) continue;
      let dd = Math.sqrt(d2);
      if (dd < 0.001) { ox = Math.cos(w.angle); oy = Math.sin(w.angle); dd = 1; }
      e.x += (ox / dd) * (rr - dd);
      e.y += (oy / dd) * (rr - dd);
      touched = w;
    }
    return touched;
  }

  update(dt, game) {
    const s = game.stats;
    if (this.core.flash > 0) this.core.flash -= dt;
    for (const w of this.walls) {
      if (w.flash > 0) w.flash -= dt;
      if (w.buildT < 1) w.buildT = Math.min(1, w.buildT + dt * 2.5);
    }
    for (const b of [this.mill, this.mine, this.butcher, this.blacksmith]) {
      if (b.buildT < 1) b.buildT = Math.min(1, b.buildT + dt * 2);
    }

    const range = s.towerRange;
    const range2 = range * range;
    const maxTargets = s.towerTargets || 1;
    const q = game._q;
    for (const t of this.towers) {
      if (!t.built) continue;
      if (t.buildT < 1) { t.buildT = Math.min(1, t.buildT + dt * 2); continue; }
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const hits = [];
      q.length = 0;
      game.animalGrid.query(t.x, t.y, range, q);
      for (let i = 0; i < q.length; i++) {
        const a = q[i];
        if (!a.isThreat()) continue;
        const d2 = dist2(a.x, a.y, t.x, t.y);
        if (d2 >= range2) continue;
        a._towerD2 = d2;
        if (hits.length < maxTargets) {
          hits.push(a);
          hits.sort((p, qq) => p._towerD2 - qq._towerD2);
        } else if (d2 < hits[hits.length - 1]._towerD2) {
          hits[hits.length - 1] = a;
          hits.sort((p, qq) => p._towerD2 - qq._towerD2);
        }
      }
      if (hits.length) {
        t.cooldown = 1 / s.fireRate;
        t.aim = hits[0].x > t.x ? 1 : -1;
        for (const target of hits) game.spawnArrow(t, target);
      } else {
        t.cooldown = 0.2;
      }
    }

    const p = game.player;
    if (p.alive && this.contains(p.x, p.y) && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + s.healRate * dt);
      this.healFx -= dt;
      if (this.healFx <= 0) {
        this.healFx = 0.35;
        game.fx.sparkle(p.x, p.y, '#9ef08a');
      }
    }
    if (game.inView(this.campfire.x, this.campfire.y, 120) && Math.random() < dt * 6) {
      game.particles.spawn({
        x: this.campfire.x + rand(-6, 6), y: this.campfire.y, z: 20, vx: rand(-10, 10), vy: 0, vz: rand(30, 60),
        g: -10, life: rand(0.6, 1.2), size: rand(1, 2), color: '#ffb347', drag: 0.5,
      });
    }

    this.incomeTimer -= dt;
    if (this.incomeTimer <= 0) {
      this.incomeTimer = MILL_INTERVAL;
      this.pay(game, this.core.x, this.core.y - 80, s.campWood, s.campMeat, s.campGold);
      if (this.mill.built) this.pay(game, this.mill.x, this.mill.y - 70, s.millWood, 0, 0);
      if (this.mine.built) this.pay(game, this.mine.x, this.mine.y - 70, 0, 0, s.mineGold);
      if (this.butcher.built) this.pay(game, this.butcher.x, this.butcher.y - 70, 0, s.butcherMeat, 0);
    }
  }

  pay(game, x, y, wood, meat, gold) {
    const bits = [];
    if (wood) { game.res.wood += wood; bits.push('+' + wood + ' Wood'); }
    if (meat) { game.res.meat += meat; bits.push('+' + meat + ' Meat'); }
    if (gold) { game.res.gold += gold; game.counters.gold += gold; bits.push('+' + gold + ' Gold'); }
    if (!bits.length) return;
    game.resVersion++;
    game.addText(x, y, bits.join('  '), gold ? '#ffe066' : meat ? '#ff9f8a' : '#ffd9a0', 15, { life: 1.4, vy: -25 });
  }

  drawGround(ctx, view) {
    if (view) {
      const pad = BASE_HALF + 24;
      if (this.x + pad < view.x0 || this.x - pad > view.x1 ||
          this.y + pad < view.y0 || this.y - pad > view.y1) return;
    }
    const h = WALL_HALF - 8;
    ctx.fillStyle = 'rgba(150,118,72,0.28)';
    roundRectPath(ctx, this.x - h, this.y - h, h * 2, h * 2, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(176,140,90,0.22)';
    roundRectPath(ctx, this.x - 140, this.y - 110, 280, 240, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,170,0.32)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    roundRectPath(ctx, this.x - BASE_HALF, this.y - BASE_HALF, BASE_HALF * 2, BASE_HALF * 2, 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Wall segments are not in the static grid (the player walks through them). */
  collectVisible(out, x0, y0, x1, y1) {
    for (const w of this.walls) {
      if (w.x > x0 - 50 && w.x < x1 + 50 && w.y > y0 - 20 && w.y < y1 + 60) out.push(w);
    }
  }

  collectLights(out, game) {
    const fl = 1 + Math.sin(game.time * 13) * 0.04 + Math.sin(game.time * 23) * 0.03;
    out.push({ x: this.campfire.x, y: this.campfire.y - 10, r: game.stats.lightR * fl, a: 1, warm: true });
    if (this.core.alive) out.push({ x: this.core.x, y: this.core.y - 30, r: 140, a: 0.8, warm: true });
    for (const t of this.towers) if (t.built) out.push({ x: t.x + 24, y: t.y - 60, r: 130, a: 0.85, warm: true });
  }
}
