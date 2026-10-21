'use strict';

const OUTLINE = '#2a1b12';
const AXE_HEIGHT = 16;          // visual float height of axes above their ground hit point
const AXE_HIT_RADIUS = 16;
const PICKUP_LIFETIME = 120;
const TREE_FALL_TIME = 0.75;

function strokeLimb(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + 3;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function drawHpBar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = 'rgba(20,12,8,0.75)';
  roundRectPath(ctx, x - w / 2 - 1.5, y - 1.5, w + 3, 7, 3.5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRectPath(ctx, x - w / 2, y, Math.max(2, w * clamp(frac, 0, 1)), 4, 2);
  ctx.fill();
}

// ===========================================================================
// Player
// ===========================================================================

class Player {
  constructor(x, y) {
    this.type = 'player';
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = 13;
    this.maxHp = 100; this.hp = 100;
    this.facing = 1;
    this.walkTime = 0;
    this.moveAmount = 0;
    this.flash = 0;
    this.invuln = 0;
    this.lastDamageTime = -99;
    this.alive = true;
    this.deathT = 0;
    this.dashCd = 0;
    this.dashCdMax = 1.35;
    this.dashT = 0;
    this.dashMax = 1;
    this.dashCharges = 1;
    this.poisonT = 0;
    this.poisonDps = 0;
    this.poisonAcc = 0;
    this.statusSlow = 0;
    this.statusSlowT = 0;
  }

  applyPoison(dps, duration) {
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonT = Math.max(this.poisonT, duration);
  }

  applySlow(amount, duration) {
    this.statusSlow = clamp(Math.max(this.statusSlow, amount), 0, 0.7);
    this.statusSlowT = Math.max(this.statusSlowT, duration);
  }

  setDashCharges(max) {
    const m = Math.max(1, max | 0);
    if (m > this.dashMax) this.dashCharges += m - this.dashMax;
    this.dashMax = m;
    this.dashCharges = clamp(this.dashCharges, 0, this.dashMax);
  }

  tryDash(game) {
    if (!this.alive || this.dashCharges <= 0 || this.dashT > 0) return false;
    const m = game.input.getMove();
    let dx = m.x, dy = m.y;
    if (Math.hypot(dx, dy) < 0.15) {
      dx = this.facing;
      dy = 0;
    } else {
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
    }
    const power = 1040;
    this.vx = dx * power;
    this.vy = dy * power;
    this.dashT = 0.22;
    this.dashCharges--;
    if (this.dashCharges < this.dashMax && this.dashCd <= 0) this.dashCd = this.dashCdMax;
    this.invuln = Math.max(this.invuln, 0.22);
    if (Math.abs(dx) > 0.1) this.facing = dx > 0 ? 1 : -1;
    for (let i = 0; i < 8; i++) {
      game.particles.spawn({
        x: this.x - dx * rand(4, 18), y: this.y - dy * rand(2, 10), z: rand(4, 16),
        vx: -dx * rand(40, 120) + rand(-30, 30), vy: -dy * rand(20, 60), vz: rand(20, 60),
        g: 80, life: rand(0.2, 0.4), size: rand(2, 4), color: 'rgba(255,240,200,0.75)', drag: 3,
      });
    }
    game.fx.dust(this.x, this.y, 5);
    Sound.play('throw', 1.4);
    return true;
  }

  update(dt, game) {
    let mx = 0, my = 0;
    if (this.alive) {
      const m = game.input.getMove();
      mx = m.x; my = m.y;
    }
    if (this.dashCd > 0) {
      this.dashCd -= dt;
      if (this.dashCd <= 0) {
        this.dashCd = 0;
        if (this.dashCharges < this.dashMax) {
          this.dashCharges++;
          if (this.dashCharges < this.dashMax) this.dashCd = this.dashCdMax;
        }
      }
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      game.world.moveEntity(this, this.vx * dt, this.vy * dt, this.radius);
      this.vx *= Math.exp(-3 * dt);
      this.vy *= Math.exp(-3 * dt);
      if (Math.random() < dt * 40) {
        game.particles.spawn({
          x: this.x + rand(-4, 4), y: this.y + rand(-2, 2), z: rand(6, 18),
          vx: rand(-20, 20), vy: rand(-10, 10), vz: rand(10, 40), g: 40,
          life: 0.25, size: rand(2, 3.5), color: 'rgba(200,220,255,0.55)', drag: 2,
        });
      }
    } else {
      let speed = game.ps.moveSpeed * (game.buffs && game.buffs.haste > 0 ? 1.65 : 1);
      if (this.statusSlowT > 0) speed *= (1 - this.statusSlow);
      this.vx = damp(this.vx, mx * speed, 14, dt);
      this.vy = damp(this.vy, my * speed, 14, dt);
      game.world.moveEntity(this, this.vx * dt, this.vy * dt, this.radius);
    }

    if (this.statusSlowT > 0) {
      this.statusSlowT -= dt;
      if (this.statusSlowT <= 0) { this.statusSlowT = 0; this.statusSlow = 0; }
    }
    if (this.poisonT > 0 && this.alive) {
      this.poisonT -= dt;
      this.poisonAcc += this.poisonDps * dt;
      if (this.poisonAcc >= 1) {
        const dmg = Math.floor(this.poisonAcc);
        this.poisonAcc -= dmg;
        this.hp = Math.max(0, this.hp - dmg);
        this.flash = 0.1;
        if (Math.random() < 0.4) {
          game.addText(this.x + rand(-8, 8), this.y - 36, String(dmg), '#6dd46a', 12, { life: 0.5, vy: -22 });
        }
        game.particles.spawn({
          x: this.x + rand(-6, 6), y: this.y, z: rand(8, 20),
          vx: rand(-10, 10), vy: 0, vz: rand(20, 50), g: -10,
          life: 0.4, size: rand(1.5, 3), color: '#6dd46a', drag: 1,
        });
        if (this.hp <= 0) this.die(game);
      }
      if (this.poisonT <= 0) { this.poisonT = 0; this.poisonDps = 0; this.poisonAcc = 0; }
    }

    const sp = Math.hypot(this.vx, this.vy);
    this.moveAmount = clamp(sp / 150, 0, 1);
    if (sp > 12) this.walkTime += dt * (7 + sp / 45);
    if (!game.faceNearest) {
      game.lockTarget = null;
      if (sp > 12) {
        if (Math.abs(mx) > 0.08) this.facing = mx > 0 ? 1 : -1;
        else if (Math.abs(this.vx) > 25) this.facing = this.vx > 0 ? 1 : -1;
      }
    }
    // Aim-lock facing is applied in Game.update after animals move (fresh positions).
    if (this.flash > 0) this.flash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (!this.alive) this.deathT += dt;
  }

  /**
   * Face / lock the nearest fightable beast. Called after animals update so
   * positions are current (the spatial grid is still being rebuilt at player.update time).
   */
  faceClosestEnemy(game) {
    const range = 560;
    const range2 = range * range;
    let best = null, bestD2 = range2;
    const cur = game.lockTarget;
    // Mild stickiness so the lock doesn't flicker between two equal targets.
    if (cur && !cur.dead && !cur.passive && !cur.remove) {
      const d2 = dist2(cur.x, cur.y, this.x, this.y);
      if (d2 <= range2 * 1.2) {
        best = cur;
        bestD2 = d2 * 0.85;
      }
    }
    const animals = game.animals;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      if (a.dead || a.passive || a.remove) continue;
      const d2 = dist2(a.x, a.y, this.x, this.y);
      if (d2 < bestD2) { bestD2 = d2; best = a; }
    }
    game.lockTarget = best;
    if (best) {
      const dx = best.x - this.x;
      if (dx > 1) this.facing = 1;
      else if (dx < -1) this.facing = -1;
    }
  }

  /** Returns true if damage was applied. Armor reduces every hit but never below 1. */
  takeDamage(amount, game, fromX, fromY, fromElement) {
    if (!this.alive || this.invuln > 0) return false;
    let resist = game.ps.armor || 0;
    if (fromElement && game.ps.resist && game.ps.resist[fromElement]) {
      resist += game.ps.resist[fromElement];
    }
    const dmg = Math.max(1, Math.round(amount * (1 - Math.min(0.7, resist))));
    this.hp -= dmg;
    this.flash = 0.15;
    this.invuln = 0.6;
    this.lastDamageTime = game.time;
    const dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d) * 300;
    this.vy += (dy / d) * 300;
    game.onPlayerHurt(dmg);
    if (game.ps.thorns > 0) {
      const thorns = game.ps.thorns;
      for (const a of game.animals) {
        if (a.dead || a.passive) continue;
        if (dist2(a.x, a.y, this.x, this.y) > 80 * 80) continue;
        game.hitAnimal(a, thorns, this.x, this.y, 0.35, true, null, { flat: true, noProc: true });
      }
    }
    if (this.hp <= 0) this.die(game);
    return true;
  }

  die(game) {
    if (!this.alive) return;
    this.hp = 0;
    this.alive = false;
    this.deathT = 0;
    game.onPlayerDeath();
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(ctx, this.x, this.y + 1, 14, 5.5);
    ctx.fill();
  }

  /** Drawn facing +x; the whole figure is mirrored for -x so head and body always agree. */
  draw(ctx) {
    const flash = this.flash > 0;
    const col = (c) => (flash ? '#ffffff' : c);
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.alive) {
      const t = Math.min(this.deathT * 2.5, 1);
      ctx.rotate(-this.facing * easeOutCubic(t) * Math.PI * 0.48);
    } else if (this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }
    ctx.scale(this.facing, 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const m = this.moveAmount;
    const ph = this.walkTime;
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

    const boot = (x, y) => {
      roundRectPath(ctx, x - 3.5, y - 4, 9.5, 5, 2.2);
      ctx.fillStyle = leather; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = col('#2a1b12');
      ctx.fillRect(x - 3.5, y, 9.5, 1.6);
    };

    // back leg, back arm
    strokeLimb(ctx, -3, -14, -3 - swing, -4 + liftB, 5.5, denimBack);
    boot(-3 - swing, -1 + liftB);
    strokeLimb(ctx, -3.5, -28 + by, -5 - swing * 0.9, -18 + by, 5, plaidBack);
    ctx.fillStyle = skin;
    ellipse(ctx, -5 - swing * 0.9, -17 + by, 3, 3); ctx.fill();
    // front leg
    strokeLimb(ctx, 2, -14, 2 + swing, -4 + liftA, 5.5, denim);
    boot(2 + swing, -1 + liftA);

    // torso: buffalo-check flannel
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
    // jeans waist + belt with buckle at the front
    ctx.fillStyle = denim;
    ctx.fillRect(-9, -15 + by, 18, 3);
    ctx.fillStyle = col('#4a2c17');
    ctx.fillRect(-9, -16 + by, 18, 2.5);
    ctx.fillStyle = col('#e9c46a');
    ctx.fillRect(4, -16.5 + by, 3.5, 3.5);
    // suspenders
    ctx.strokeStyle = col('#3a2414');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(4, -31 + by); ctx.lineTo(5, -16 + by);
    ctx.moveTo(-4.5, -31 + by); ctx.lineTo(-3.5, -16 + by);
    ctx.stroke();

    // front arm: flannel sleeve rolled to the elbow, bare forearm
    const hx = 5 + swing * 0.9, hy2 = -18 + by;
    strokeLimb(ctx, 2.5, -28 + by, (2.5 + hx) / 2 + 0.5, -23 + by, 5, plaid);
    strokeLimb(ctx, (2.5 + hx) / 2 + 0.5, -23 + by, hx, hy2, 4.2, skin);
    ctx.fillStyle = skin;
    ellipse(ctx, hx, hy2 + 0.5, 3, 3); ctx.fill();

    // Side-profile head looking +x (same way the body walks). Skin/eye/nose stay on
    // the +x side so the beard cannot be read as the back of the head.
    const hy = -41 + by;
    ctx.save();
    ctx.translate(1.6, hy);
    ctx.fillStyle = skin;
    ctx.fillRect(-2.2, 7, 5, 7);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2.2, 8); ctx.lineTo(-2.2, 14.2);
    ctx.moveTo(2.8, 8); ctx.lineTo(2.8, 14.2); ctx.stroke();
    // skull — face toward +x
    ctx.fillStyle = skin;
    ellipse(ctx, 1.2, 0.2, 8.6, 9.1); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    // ear on the back (-x)
    ctx.fillStyle = skin;
    ellipse(ctx, -6.6, 1.6, 2.4, 3.1); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = col('#e0a87a');
    ellipse(ctx, -6.6, 1.6, 1.1, 1.6); ctx.fill();
    // chin-strap beard under the jaw, not over the face
    ctx.beginPath();
    ctx.moveTo(-3.2, 5.5);
    ctx.quadraticCurveTo(-2.2, 12.4, 3.4, 13.2);
    ctx.quadraticCurveTo(8.6, 12.2, 8.2, 6.4);
    ctx.quadraticCurveTo(5.4, 8.4, 2.2, 8);
    ctx.quadraticCurveTo(-1, 7.4, -3.2, 5.5);
    ctx.closePath();
    ctx.fillStyle = beard; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
    // sideburn at the back only
    ctx.beginPath();
    ctx.moveTo(-5.4, 1.2);
    ctx.quadraticCurveTo(-6.2, 6.2, -2.8, 7.2);
    ctx.quadraticCurveTo(-2.2, 3.4, -5.4, 1.2);
    ctx.closePath();
    ctx.fillStyle = beard; ctx.fill();
    // nose pointing +x (in front of the face)
    ctx.fillStyle = col('#e39f7c');
    ctx.beginPath();
    ctx.moveTo(7.6, -1.6);
    ctx.quadraticCurveTo(13.4, 0.2, 12.6, 2.4);
    ctx.quadraticCurveTo(10.2, 3.2, 7.8, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
    // mustache under the nose
    ctx.fillStyle = beardDark;
    ellipse(ctx, 7.2, 3.6, 3.2, 1.35); ctx.fill();
    // mouth
    ctx.strokeStyle = col('#a45a3a'); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(5.6, 5.4); ctx.quadraticCurveTo(7.6, 6.4, 9.2, 5.2); ctx.stroke();
    // eye on the front of the face, looking +x
    ctx.fillStyle = flash ? '#ffffff' : '#f6f0e6';
    ellipse(ctx, 5.2, -2.2, 2.4, 2.6); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.15; ctx.stroke();
    ctx.fillStyle = flash ? '#ffffff' : '#1a1a1a';
    ellipse(ctx, 6.15, -2.2, 1.25, 1.6); ctx.fill();
    if (!flash) {
      ctx.fillStyle = '#fff';
      ellipse(ctx, 6.55, -2.85, 0.5, 0.5); ctx.fill();
    }
    ctx.strokeStyle = beardDark; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(2.8, -5); ctx.lineTo(8.2, -4.4); ctx.stroke();
    // beanie
    ctx.fillStyle = col('#3d4148');
    ctx.beginPath();
    ctx.moveTo(-8.4, -2);
    ctx.quadraticCurveTo(-7.2, -14.6, 1.2, -15.2);
    ctx.quadraticCurveTo(10.2, -14, 10.4, -2.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    if (!flash) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.2;
      for (const kx of [-4.2, 0.2, 4.4]) {
        ctx.beginPath(); ctx.moveTo(kx, -3.2); ctx.lineTo(kx + 1.1, -13); ctx.stroke();
      }
    }
    roundRectPath(ctx, -8.8, -4.6, 20, 4.7, 2);
    ctx.fillStyle = col('#c8312b'); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = col('#f1ece0');
    ellipse(ctx, -0.6, -15.6, 3.3, 3.1); ctx.fill();
    ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();

    ctx.restore();

    if (this.alive) this.drawStatusBars(ctx);
  }

  drawStatusBars(ctx) {
    const w = 28, h = 4;
    const x = this.x - w / 2;
    const hpY = this.y + 1;
    const dashY = this.y + 10;
    const hpFrac = this.hp / this.maxHp;
    const hpColor = hpFrac > 0.35 ? '#7ed957' : '#e85d4c';
    drawHpBar(ctx, this.x, hpY, w, hpFrac, hpColor);

    const charges = this.dashMax;
    const gap = 1.5;
    const segW = (w - gap * (charges - 1)) / charges;
    for (let i = 0; i < charges; i++) {
      const sx = x + i * (segW + gap);
      const filled = i < this.dashCharges;
      const recharging = !filled && i === this.dashCharges && this.dashCd > 0;
      const frac = filled ? 1 : recharging ? clamp(1 - this.dashCd / this.dashCdMax, 0, 1) : 0;
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
}

// ===========================================================================
// Axe
// ===========================================================================

function drawAxe(ctx, x, y, rot, s, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.translate(-3, 2);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  // handle
  roundRectPath(ctx, -2.3, -15, 4.6, 31, 2.2);
  ctx.fillStyle = flash ? '#fff' : '#9a6232';
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = flash ? '#fff' : '#5d3a1a';
  ctx.fillRect(-2.3, 8, 4.6, 2);
  ctx.fillRect(-2.3, 12, 4.6, 2);
  // poll
  ctx.beginPath();
  ctx.moveTo(-1, -16); ctx.lineTo(-5.5, -15); ctx.lineTo(-5.5, -9); ctx.lineTo(-1, -8);
  ctx.closePath();
  ctx.fillStyle = flash ? '#fff' : '#7f8a92';
  ctx.fill(); ctx.stroke();
  // blade
  ctx.beginPath();
  ctx.moveTo(1, -16);
  ctx.lineTo(10, -23);
  ctx.quadraticCurveTo(17, -13, 11, -2);
  ctx.lineTo(1, -8);
  ctx.closePath();
  ctx.fillStyle = flash ? '#fff' : '#c3ced6';
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10.4, -20.5);
  ctx.quadraticCurveTo(15.6, -13, 10.8, -4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

class AxeSprite {
  constructor(id) {
    this.type = 'axe';
    this.id = id;
    this.x = 0; this.y = 0;
    this.angle = 0;
    this.spin = 0;
    this.flash = 0;
  }
  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(ctx, this.x, this.y + 2, 11, 4);
    ctx.fill();
  }
  draw(ctx) {
    drawAxe(ctx, this.x, this.y - AXE_HEIGHT, this.spin, 1.2, this.flash > 0);
  }
}

// ===========================================================================
// Trees
// ===========================================================================

const OAK_PALETTES = [
  ['#2b6a2e', '#3f8f3a', '#68b852'],
  ['#285e33', '#388646', '#5bae5f'],
  ['#3b6f24', '#579a32', '#86c44c'],
];
const PINE_PALETTES = [
  ['#1d5538', '#2d7a4d', '#48a067'],
  ['#225637', '#317a48', '#55a35e'],
];

class Tree {
  constructor(x, y, rng, kind, size, indestructible = false) {
    this.type = 'tree';
    this.x = x; this.y = y;
    this.kind = kind;
    this.size = size;
    this.indestructible = indestructible;
    this.maxHp = Math.round(12 + 18 * size * size);
    this.hp = this.maxHp;
    this.wood = size < 0.95 ? 2 : size < 1.2 ? 3 : 5;
    this.solidR = 10 * size;
    this.hitR = 20 * size;
    this.state = 'alive';
    this.shake = 0;
    this.flash = 0;
    this.fallT = 0;
    this.fallDir = 1;
    this.regrow = 0;
    this.growT = 1;
    this.fade = 1;
    this.hitLog = new Map();

    const s = size;
    if (kind === 'pine') {
      this.palette = rng.pick(PINE_PALETTES);
      this.trunkH = 16 * s;
      this.trunkW = 11 * s;
      this.tiers = [];
      for (let i = 0; i < 3; i++) {
        const w = (32 - i * 7) * s;
        const baseY = -this.trunkH - i * 19 * s + 4 * s;
        this.tiers.push({ w, baseY, apexY: baseY - (34 - i * 2) * s, ax: rng.range(-2, 2) * s });
      }
      this.canopyTop = this.tiers[2].apexY;
      this.canopyW = 32 * s;
    } else {
      this.palette = rng.pick(OAK_PALETTES);
      this.trunkH = 26 * s;
      this.trunkW = 13 * s;
      const top = -this.trunkH - 8 * s;
      const defs = [[-8, -32, 17], [9, -30, 17], [-15, -6, 19], [15, -6, 19], [0, -15, 24]];
      this.blobs = defs.map((d) => {
        const r = d[2] * s * rng.range(0.92, 1.08);
        return {
          x: d[0] * s, y: top + d[1] * s, r,
          pts: makeBlob(rng, r, 8, 0.12),
          mid: makeBlob(rng, r * 0.8, 7, 0.12),
          hl: makeBlob(rng, r * 0.45, 6, 0.18),
        };
      });
      this.blobs.sort((a, b) => a.y - b.y);
      this.canopyTop = top - 50 * s;
      this.canopyW = 36 * s;
    }
  }

  isSolid() { return this.state === 'alive' || this.state === 'growing'; }
  isHittable() { return this.state === 'alive' && !this.indestructible; }

  damage(amount, game, hx, hy) {
    this.hp -= amount;
    this.shake = 0.3;
    this.flash = 0.07;
    if (!game.nuking) {
      game.fx.woodChips(this.x, this.y - 12 * this.size, hx, hy, 6);
      game.fx.leaves(this.x, this.y + this.canopyTop * 0.6, this.canopyW, 2, this.palette);
      Sound.play('chop', rand(0.9, 1.15));
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'falling';
      this.fallT = 0;
      this.fallDir = hx < this.x ? 1 : -1;
      game.onTreeChopped(this);
    }
  }

  update(dt, game) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.flash > 0) this.flash -= dt;
    if (this.state === 'falling') {
      this.fallT += dt;
      if (this.fallT >= TREE_FALL_TIME) {
        this.state = 'stump';
        this.regrow = rand(35, 55);
        const lx = this.x + this.fallDir * (-this.canopyTop) * 0.6;
        game.fx.leaves(lx, this.y - 10, this.canopyW, 14, this.palette);
        game.fx.dust(lx, this.y, 8);
      }
    } else if (this.state === 'stump') {
      this.regrow -= dt;
      if (this.regrow <= 0) {
        const p = game.player;
        if (dist2(p.x, p.y, this.x, this.y) > 150 * 150) {
          this.state = 'growing';
          this.growT = 0;
          this.hp = this.maxHp;
          this.hitLog.clear();
        } else {
          this.regrow = 2;
        }
      }
    } else if (this.state === 'growing') {
      this.growT += dt / 1.1;
      if (this.growT >= 1) { this.growT = 1; this.state = 'alive'; }
    }
  }

  drawShadow(ctx) {
    if (this.state === 'stump') return;
    const s = this.size * (this.state === 'growing' ? clamp(this.growT, 0, 1) : 1);
    const a = this.state === 'falling' ? 0.22 * (1 - this.fallT / TREE_FALL_TIME) : 0.22;
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ellipse(ctx, this.x + 9 * s, this.y + 1, 32 * s, 11 * s);
    ctx.fill();
  }

  drawStump(ctx) {
    const tw = this.trunkW;
    ctx.fillStyle = '#6b4022';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -tw / 2, -7, tw, 8, 3);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dcae74';
    ellipse(ctx, 0, -7, tw / 2, tw / 4.5);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a8703c';
    ctx.lineWidth = 1;
    ellipse(ctx, 0, -7, tw / 4, tw / 9);
    ctx.stroke();
  }

  drawTrunk(ctx) {
    const tw = this.trunkW, th = this.trunkH;
    // roots
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#6b4022';
    ctx.beginPath();
    ctx.moveTo(-tw * 0.9, 1); ctx.lineTo(-tw * 0.3, -6); ctx.lineTo(tw * 0.3, -6); ctx.lineTo(tw * 0.9, 1);
    ctx.closePath();
    ctx.fill();
    roundRectPath(ctx, -tw / 2, -th - 6, tw, th + 6, 3);
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#7d4b27';
    ctx.fill();
    ctx.fillStyle = 'rgba(40,20,5,0.35)';
    ctx.fillRect(tw * 0.12, -th - 4, tw * 0.38, th + 3);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -tw / 2, -th - 6, tw, th + 6, 3);
    ctx.stroke();
  }

  drawCanopy(ctx) {
    const pal = this.palette;
    const flash = this.flash > 0;
    if (this.kind === 'pine') {
      for (const t of this.tiers) {
        ctx.beginPath();
        ctx.moveTo(-t.w, t.baseY);
        ctx.lineTo(t.ax, t.apexY);
        ctx.lineTo(t.w, t.baseY);
        ctx.lineTo(0, t.baseY + 5 * this.size);
        ctx.closePath();
        ctx.fillStyle = flash ? '#fff' : pal[0];
        ctx.strokeStyle = '#123322';
        ctx.lineWidth = 2.5;
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-t.w, t.baseY);
        ctx.lineTo(t.ax, t.apexY);
        ctx.lineTo(0, t.baseY + 5 * this.size);
        ctx.closePath();
        ctx.fillStyle = flash ? '#fff' : pal[1];
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(t.ax, t.apexY);
        ctx.lineTo(-t.w * 0.45, t.baseY - (t.baseY - t.apexY) * 0.35);
        ctx.lineTo(t.ax - t.w * 0.08, t.baseY - (t.baseY - t.apexY) * 0.25);
        ctx.closePath();
        ctx.fillStyle = flash ? '#fff' : pal[2];
        ctx.fill();
      }
      return;
    }
    // oak: outline pass, base pass, mid pass, highlight pass
    ctx.strokeStyle = '#173a1b';
    ctx.lineWidth = 5;
    for (const b of this.blobs) { polygonPath(ctx, b.pts, b.x, b.y); ctx.stroke(); }
    ctx.fillStyle = flash ? '#fff' : pal[0];
    for (const b of this.blobs) { polygonPath(ctx, b.pts, b.x, b.y); ctx.fill(); }
    ctx.fillStyle = flash ? '#fff' : pal[1];
    for (const b of this.blobs) { polygonPath(ctx, b.mid, b.x - b.r * 0.08, b.y - b.r * 0.14); ctx.fill(); }
    ctx.fillStyle = flash ? '#fff' : pal[2];
    for (const b of this.blobs) { polygonPath(ctx, b.hl, b.x - b.r * 0.28, b.y - b.r * 0.34); ctx.fill(); }
  }

  draw(ctx, game) {
    const p = game.player;
    const behind = p.y < this.y - 6 && p.y > this.y + this.canopyTop - 6 &&
      Math.abs(p.x - this.x) < this.canopyW + 4 && this.state !== 'stump';
    this.fade = damp(this.fade, behind ? 0.42 : 1, 12, game.frameDt);

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'stump') {
      this.drawStump(ctx);
      ctx.restore();
      return;
    }
    if (this.state === 'falling') {
      this.drawStump(ctx);
      const t = this.fallT / TREE_FALL_TIME;
      ctx.globalAlpha = 1 - clamp((t - 0.7) / 0.3, 0, 1);
      ctx.rotate(easeInQuad(t) * Math.PI * 0.5 * this.fallDir);
    } else if (this.state === 'growing') {
      const g = easeOutBack(clamp(this.growT, 0, 1));
      ctx.scale(g, g);
    }

    if (this.shake > 0) {
      const sh = Math.sin(game.time * 55) * this.shake;
      ctx.rotate(sh * 0.06);
      ctx.translate(sh * 6 * this.size, 0);
    }

    this.drawTrunk(ctx);
    if (this.fade < 0.99) ctx.globalAlpha *= this.fade;
    this.drawCanopy(ctx);
    ctx.restore();

    if (this.state === 'alive' && this.hp < this.maxHp) {
      drawHpBar(ctx, this.x, this.y + this.canopyTop - 10, 34, this.hp / this.maxHp, '#7ed957');
    }
  }
}

// ===========================================================================
// Rocks (plain rocks are obstacles, ore rocks are harvestable for gold)
// ===========================================================================

class Rock {
  constructor(x, y, rng, ore, size) {
    this.type = 'rock';
    this.x = x; this.y = y;
    this.ore = ore;
    this.size = size;
    this.r = 15 * size;
    this.solidR = this.r * 0.85;
    this.hitR = this.r + 3;
    this.height = 11 * size;
    this.side = makeBlob(rng, this.r, 7, 0.14, 0.62);
    this.top = makeBlob(rng, this.r * 0.8, 6, 0.14, 0.55);
    this.hl = makeBlob(rng, this.r * 0.38, 5, 0.2, 0.5);
    this.nuggets = [];
    if (ore) {
      for (let i = 0; i < 5; i++) {
        this.nuggets.push({
          x: rng.range(-0.55, 0.55) * this.r,
          y: -this.height + rng.range(-0.3, 0.3) * this.r * 0.5 + (i % 2 ? 4 : -1),
          s: rng.range(2.5, 4) * size,
        });
      }
    }
    this.maxHp = ore ? Math.round(60 + 30 * size) : 0;
    this.hp = this.maxHp;
    this.state = 'alive';
    this.regrow = 0;
    this.shake = 0;
    this.flash = 0;
    this.hitLog = new Map();
  }

  isSolid() { return this.state === 'alive'; }
  isHittable() { return this.ore && this.state === 'alive'; }

  damage(amount, game, hx, hy) {
    this.hp -= amount;
    this.shake = 0.2;
    this.flash = 0.07;
    game.fx.sparks(this.x, this.y - this.height, 6, '#ffe082');
    game.fx.rockChips(this.x, this.y - this.height * 0.6, 4);
    Sound.play('ore', rand(0.9, 1.2));
    if (Math.random() < 0.12) game.spawnDrops('gold', 1, this.x, this.y);
    if (this.hp <= 0) {
      this.state = 'rubble';
      this.regrow = rand(50, 75);
      game.onOreBroken(this);
    }
  }

  update(dt, game) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.flash > 0) this.flash -= dt;
    if (this.state === 'rubble') {
      this.regrow -= dt;
      if (this.regrow <= 0) {
        const p = game.player;
        if (dist2(p.x, p.y, this.x, this.y) > 160 * 160) {
          this.state = 'alive';
          this.hp = this.maxHp;
          this.hitLog.clear();
        } else {
          this.regrow = 2;
        }
      }
    }
  }

  drawShadow(ctx) {
    if (this.state !== 'alive') return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, this.x + 4, this.y + 2, this.r * 1.1, this.r * 0.45);
    ctx.fill();
  }

  draw(ctx, game) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.state === 'rubble') {
      ctx.fillStyle = '#7b736a';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, (i - 1.5) * this.r * 0.45, (i % 2) * 4 - 2, 4 * this.size, 2.6 * this.size);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (this.shake > 0) ctx.translate(Math.sin(game.time * 70) * this.shake * 6, 0);
    const flash = this.flash > 0;
    const c = this.ore ? ['#5f564c', '#8d8274', '#b3a998'] : ['#5c646b', '#8b949b', '#b4bcc2'];
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    polygonPath(ctx, this.side, 0, -this.height * 0.35);
    ctx.fillStyle = flash ? '#fff' : c[0];
    ctx.fill(); ctx.stroke();
    polygonPath(ctx, this.top, -this.r * 0.06, -this.height);
    ctx.fillStyle = flash ? '#fff' : c[1];
    ctx.fill();
    polygonPath(ctx, this.hl, -this.r * 0.3, -this.height - this.r * 0.12);
    ctx.fillStyle = flash ? '#fff' : c[2];
    ctx.fill();

    if (this.ore) {
      for (const n of this.nuggets) {
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
      const tw = (Math.sin(game.time * 3 + this.x) + 1) * 0.5;
      if (tw > 0.6) {
        const n = this.nuggets[0];
        const s = (tw - 0.6) * 18;
        ctx.strokeStyle = 'rgba(255,255,220,0.95)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(n.x - s, n.y - 2); ctx.lineTo(n.x + s, n.y - 2);
        ctx.moveTo(n.x, n.y - 2 - s); ctx.lineTo(n.x, n.y - 2 + s);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (this.ore && this.hp < this.maxHp) {
      drawHpBar(ctx, this.x, this.y - this.height - this.r - 6, 30, this.hp / this.maxHp, '#ffd54a');
    }
  }
}

// ===========================================================================
// Bushes (decorative, rustle when walked through)
// ===========================================================================

class Bush {
  constructor(x, y, rng, size) {
    this.type = 'bush';
    this.x = x; this.y = y;
    this.size = size;
    this.wobble = 0;
    this.circles = [];
    const n = rng.int(3, 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI + Math.PI;
      this.circles.push({
        x: Math.cos(a) * 8 * size + rng.range(-2, 2),
        y: -9 * size + Math.sin(a) * 5 * size + rng.range(-2, 1),
        r: rng.range(8, 11) * size,
      });
    }
    this.circles.push({ x: 0, y: -14 * size, r: 10 * size });
    this.berries = rng.chance(0.3) ? this.circles.slice(0, 3).map((c) => ({ x: c.x + rng.range(-3, 3), y: c.y + rng.range(-2, 3) })) : null;
    this.palette = rng.chance(0.5) ? ['#2f6f2c', '#4c9a3a', '#78c04e'] : ['#2a6436', '#3f8b4b', '#69b45f'];
  }

  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(ctx, this.x + 3, this.y + 1, 15 * this.size, 5 * this.size);
    ctx.fill();
  }

  draw(ctx, game) {
    if (this.wobble > 0) this.wobble = Math.max(0, this.wobble - game.frameDt * 1.8);
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.wobble > 0.01) {
      const w = Math.sin(game.time * 28) * this.wobble * 0.12;
      ctx.transform(1, 0, w, 1, 0, 0);
    }
    ctx.strokeStyle = '#173a1b';
    ctx.lineWidth = 4;
    for (const c of this.circles) { ellipse(ctx, c.x, c.y, c.r, c.r * 0.85); ctx.stroke(); }
    ctx.fillStyle = this.palette[0];
    for (const c of this.circles) { ellipse(ctx, c.x, c.y, c.r, c.r * 0.85); ctx.fill(); }
    ctx.fillStyle = this.palette[1];
    for (const c of this.circles) { ellipse(ctx, c.x - c.r * 0.12, c.y - c.r * 0.15, c.r * 0.75, c.r * 0.6); ctx.fill(); }
    ctx.fillStyle = this.palette[2];
    for (const c of this.circles) { ellipse(ctx, c.x - c.r * 0.3, c.y - c.r * 0.35, c.r * 0.3, c.r * 0.22); ctx.fill(); }
    if (this.berries) {
      for (const b of this.berries) {
        ctx.fillStyle = '#d6303a';
        ellipse(ctx, b.x, b.y, 2.4, 2.4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ellipse(ctx, b.x - 0.8, b.y - 0.8, 0.8, 0.8); ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ===========================================================================
// Pickups
// ===========================================================================

class Pickup {
  constructor(type, x, y, vx, vy, value = 1) {
    this.type = type;
    this.value = value;
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.z = 2;
    this.vz = rand(170, 270);
    this.age = 0;
    this.speed = 0;
    this.magnet = false;
    this.collected = false;
    this.dead = false;
    this.rot = rand(-0.5, 0.5);
    this.phase = Math.random() * TAU;
  }

  update(dt, game) {
    this.age += dt;
    if (this.z > 0 || this.vz > 0) {
      this.z += this.vz * dt;
      this.vz -= 900 * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = this.vz < -140 ? -this.vz * 0.35 : 0;
      }
    }
    const fr = Math.exp(-(this.z > 0 ? 1.5 : 6) * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= fr; this.vy *= fr;

    const p = game.player;
    if (p.alive && this.age > 0.3) {
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy);
      const pull = this.type === 'chest' ? 60
        : this.isPowerup ? game.ps.magnet * 1.15
        : this.type === 'xp' ? game.ps.magnet * 1.25
        : game.ps.magnet;
      if (!this.magnet && d < pull) this.magnet = true;
      if (this.magnet && d > 0.001) {
        this.speed = Math.min(this.speed + 1500 * dt, 1500);
        const step = Math.min(this.speed * dt, d);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
      if (d < p.radius + 10) game.collectPickup(this);
    }
    if (this.age > this.lifetime()) this.dead = true;
  }

  lifetime() {
    if (this.type === 'chest') return Infinity;
    if (this.isPowerup) return PICKUP_LIFETIME * 2.2;
    if (this.type === 'xp') return PICKUP_LIFETIME * 3;
    return PICKUP_LIFETIME;
  }

  get isPowerup() { return !!POWERUPS[this.type]; }

  /** Visual scale from stacked yield — bigger pile = higher quality drop. */
  qualityScale() {
    if (this.isPowerup || this.type === 'chest') return 1;
    const v = this.value || 1;
    return clamp(0.9 + Math.log2(1 + v) * 0.22, 0.9, 2.1);
  }

  drawShadow(ctx) {
    const q = this.qualityScale();
    const s = q / (1 + this.z * 0.02);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, this.x, this.y + 1, 9 * s, 3.5 * s);
    ctx.fill();
  }

  draw(ctx, game) {
    if (this.age > this.lifetime() - 8 && Math.floor(this.age * 6) % 2 === 0) return;
    const bob = this.z > 0 ? 0 : Math.sin(game.time * 4 + this.phase) * 1.5;
    const y = this.y - this.z - 7 + bob;
    const q = this.qualityScale();
    ctx.save();
    ctx.translate(this.x, y);
    ctx.scale(q, q);
    ctx.lineJoin = 'round';
    if (this.type === 'wood') {
      ctx.rotate(this.rot);
      roundRectPath(ctx, -11, -4.5, 20, 9, 4);
      ctx.fillStyle = '#9c6a3c'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = '#6e4524'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, -1.5); ctx.lineTo(3, -1.5); ctx.moveTo(-5, 1.8); ctx.lineTo(5, 1.8); ctx.stroke();
      ellipse(ctx, 9, 0, 3.5, 4.5);
      ctx.fillStyle = '#e8bb80'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = '#b07a42'; ctx.lineWidth = 0.9;
      ellipse(ctx, 9, 0, 1.6, 2.2); ctx.stroke();
    } else if (this.type === 'meat') {
      ctx.rotate(this.rot - 0.5);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(11, 0); ctx.stroke();
      ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(11, 0); ctx.stroke();
      ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3;
      ellipse(ctx, 12, -2.2, 2.4, 2.4); ctx.fill(); ctx.stroke();
      ellipse(ctx, 12, 2.2, 2.4, 2.4); ctx.fill(); ctx.stroke();
      ellipse(ctx, -3, 0, 9, 7);
      ctx.fillStyle = '#c4553e'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = '#e07a5f';
      ellipse(ctx, -5, -2.2, 4.5, 2.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ellipse(ctx, -6, -3, 1.6, 1); ctx.fill();
    } else if (this.type === 'xp') {
      ctx.rotate(game.time * 3 + this.phase);
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(5.5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5.5, 0);
      ctx.closePath();
      ctx.fillStyle = '#7ee0ff'; ctx.fill();
      ctx.strokeStyle = '#1a5a78'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(3.2, 0); ctx.lineTo(0, 5); ctx.lineTo(-3.2, 0);
      ctx.closePath();
      ctx.fillStyle = '#e8fbff'; ctx.fill();
    } else if (this.isPowerup) {
      const def = POWERUPS[this.type];
      const pulse = 1 + Math.sin(game.time * 8 + this.phase) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.28;
      ellipse(ctx, 0, 0, 14, 14); ctx.fill();
      ctx.globalAlpha = 1;
      roundRectPath(ctx, -9, -9, 18, 18, 5);
      ctx.fillStyle = '#1a1208'; ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = def.color;
      if (this.type === 'magnet') {
        ctx.fillRect(-5, -6, 3.5, 8); ctx.fillRect(1.5, -6, 3.5, 8);
        ctx.beginPath(); ctx.arc(0, 2, 7, 0.15, Math.PI - 0.15); ctx.lineWidth = 3.2;
        ctx.strokeStyle = def.color; ctx.stroke();
      } else if (this.type === 'fury') {
        ctx.beginPath();
        ctx.moveTo(-1, -7); ctx.lineTo(4, -1); ctx.lineTo(0, -1); ctx.lineTo(2, 7); ctx.lineTo(-5, 0); ctx.lineTo(0, 0);
        ctx.closePath(); ctx.fill();
      } else if (this.type === 'vital') {
        ctx.beginPath();
        ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, 0, -5, -7, 0, -3); ctx.bezierCurveTo(5, -7, 9, 0, 0, 6);
        ctx.closePath(); ctx.fill();
      } else if (this.type === 'haste') {
        ctx.beginPath();
        ctx.moveTo(-6, -5); ctx.lineTo(2, -5); ctx.lineTo(-1, 0); ctx.lineTo(6, 0); ctx.lineTo(-2, 7); ctx.lineTo(1, 1); ctx.lineTo(-6, 1);
        ctx.closePath(); ctx.fill();
      } else if (this.type === 'nuke') {
        ellipse(ctx, 0, 0, 6.5, 6.5); ctx.fill();
        ctx.fillStyle = '#fff4c2';
        ellipse(ctx, 0, 0, 3.2, 3.2); ctx.fill();
        ctx.strokeStyle = def.color; ctx.lineWidth = 1.6;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + game.time * 2;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke();
        }
      }
    } else {
      const sx = Math.max(0.2, Math.abs(Math.cos(game.time * 3 + this.phase)));
      ctx.scale(sx, 1);
      ellipse(ctx, 0, 0, 7, 7);
      ctx.fillStyle = '#f5c242'; ctx.fill();
      ctx.strokeStyle = '#8a5d00'; ctx.lineWidth = 1.6; ctx.stroke();
      ellipse(ctx, 0, 0, 4.5, 4.5);
      ctx.strokeStyle = '#c9901a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff4c2';
      ellipse(ctx, -2, -2.5, 1.6, 1.2); ctx.fill();
    }
    ctx.restore();
    const v = this.value || 1;
    if (v > 1 && !this.isPowerup && this.type !== 'chest') {
      const label = v >= 1000 ? formatNum(v) : String(v);
      ctx.save();
      ctx.translate(this.x, y - 12 * q);
      ctx.font = '900 ' + Math.round(10 + Math.min(4, q * 2)) + 'px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,12,6,0.85)';
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = this.type === 'xp' ? '#e8fbff'
        : this.type === 'gold' ? '#ffe066'
        : this.type === 'meat' ? '#ffb0a0'
        : '#ffd9a0';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
}

// ===========================================================================
// Particles
// ===========================================================================

class ParticleSystem {
  constructor(max) {
    this.list = [];
    this.max = max;
    this.cull = null; // { x0, y0, x1, y1 } — skip spawning off-camera
  }

  clear() { this.list.length = 0; }

  spawn(o) {
    if (this.list.length >= this.max) return;
    const c = this.cull;
    if (c) {
      const m = 100;
      if (o.x < c.x0 - m || o.x > c.x1 + m || o.y < c.y0 - m || o.y > c.y1 + m) return;
    }
    this.list.push({
      x: o.x, y: o.y, z: o.z || 0,
      vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      g: o.g === undefined ? 600 : o.g,
      life: o.life, maxLife: o.life,
      size: o.size || 3,
      grow: o.grow || 0,
      color: o.color || '#fff',
      shape: o.shape || 'circle',
      rot: o.rot || Math.random() * TAU,
      vr: o.vr || 0,
      drag: o.drag === undefined ? 2 : o.drag,
      bounce: !!o.bounce,
    });
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vz -= p.g * dt;
      p.z += p.vz * dt;
      if (p.z < 0) {
        if (p.bounce) { p.z = 0; p.vz = -p.vz * 0.3; p.vx *= 0.5; p.vy *= 0.5; p.vr *= 0.5; }
        else if (p.g > 0) { p.z = 0; p.vz = 0; }
      }
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
    }
  }

  draw(ctx, x0, y0, x1, y1) {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const a = clamp((p.life / p.maxLife) * 2, 0, 1);
      ctx.globalAlpha = a;
      const y = p.y - p.z;
      switch (p.shape) {
        case 'chip':
          ctx.save();
          ctx.translate(p.x, y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
          ctx.restore();
          break;
        case 'leaf':
          ctx.save();
          ctx.translate(p.x + Math.sin(p.rot * 2) * 3, y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ellipse(ctx, 0, 0, p.size, p.size * 0.5);
          ctx.fill();
          ctx.restore();
          break;
        case 'spark':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, y);
          ctx.lineTo(p.x - p.vx * 0.03, y - p.vy * 0.03 + p.vz * 0.03);
          ctx.stroke();
          break;
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * a;
          ellipse(ctx, p.x, y, p.size, p.size * 0.6);
          ctx.stroke();
          break;
        case 'star': {
          const s = p.size;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(p.x, y - s); ctx.lineTo(p.x + s * 0.3, y - s * 0.3);
          ctx.lineTo(p.x + s, y); ctx.lineTo(p.x + s * 0.3, y + s * 0.3);
          ctx.lineTo(p.x, y + s); ctx.lineTo(p.x - s * 0.3, y + s * 0.3);
          ctx.lineTo(p.x - s, y); ctx.lineTo(p.x - s * 0.3, y - s * 0.3);
          ctx.closePath();
          ctx.fill();
          break;
        }
        default:
          ctx.fillStyle = p.color;
          ellipse(ctx, p.x, y, p.size, p.size);
          ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Named particle recipes so gameplay code stays readable. */
class Effects {
  constructor(particles) { this.ps = particles; }

  woodChips(x, y, fromX, fromY, n) {
    const base = Math.atan2(y - fromY, x - fromX);
    for (let i = 0; i < n; i++) {
      const a = base + rand(-1.1, 1.1);
      const sp = rand(80, 200);
      this.ps.spawn({
        x, y: y + 12, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(120, 260),
        g: 700, life: rand(0.5, 0.9), size: rand(2, 3.5), shape: 'chip', bounce: true,
        color: Math.random() < 0.5 ? '#e0b07a' : '#9c6a3c', vr: rand(-15, 15), drag: 1.5,
      });
    }
  }

  leaves(x, y, spread, n, palette) {
    for (let i = 0; i < n; i++) {
      this.ps.spawn({
        x: x + rand(-spread, spread) * 0.8, y: y + rand(-10, 10), vx: rand(-40, 40), vy: rand(10, 50),
        g: 0, life: rand(0.7, 1.3), size: rand(3, 5), shape: 'leaf',
        color: palette[1 + (i % 2)], vr: rand(-6, 6), drag: 1.2,
      });
    }
  }

  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      this.ps.spawn({
        x, y, vx: Math.cos(a) * rand(40, 110), vy: Math.sin(a) * rand(20, 60), g: 0,
        life: rand(0.4, 0.7), size: rand(4, 7), grow: 14, color: 'rgba(214,196,160,0.7)', drag: 4,
      });
    }
  }

  hitPuff(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = rand(60, 170);
      this.ps.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0,
        life: rand(0.2, 0.35), size: rand(1.5, 2.5), shape: 'spark', color: '#fff3c4', drag: 5,
      });
    }
  }

  sparks(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = rand(80, 220);
      this.ps.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0,
        life: rand(0.2, 0.4), size: 2, shape: 'spark', color, drag: 4,
      });
    }
  }

  /** Burst themed to the attack element. `aff` > 1 = strong hit, < 1 = resisted. */
  elementHit(x, y, element, aff = 1, scale = 1) {
    const el = ELEMENTS[element];
    if (!el) return;
    const n = Math.round((aff > 1 ? 10 : aff < 1 ? 4 : 7) * scale);
    const col = el.color;
    const alt = aff > 1 ? '#ffffff' : el.glow;
    if (element === 'fire') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = rand(50, 180) * (aff > 1 ? 1.25 : 1);
        this.ps.spawn({
          x, y, z: rand(4, 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: rand(40, 120),
          g: -40, life: rand(0.25, 0.5), size: rand(2, 4) * scale, color: Math.random() < 0.5 ? col : '#ffb347', drag: 2.5,
        });
      }
    } else if (element === 'water') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = rand(40, 140);
        this.ps.spawn({
          x, y, z: rand(2, 12), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(30, 90),
          g: 500, life: rand(0.3, 0.55), size: rand(1.5, 3) * scale, color: Math.random() < 0.4 ? '#e8f7ff' : col,
          shape: 'circle', bounce: true, drag: 2,
        });
      }
    } else if (element === 'nature') {
      this.leaves(x, y - 4, 18 * scale, n, [col, '#9ef08a', '#3d8a3a']);
    } else if (element === 'earth') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = rand(60, 160);
        this.ps.spawn({
          x, y, z: 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(80, 160),
          g: 700, life: rand(0.35, 0.65), size: rand(2, 4) * scale, shape: 'chip', bounce: true,
          color: Math.random() < 0.5 ? col : '#8a6a3a', vr: rand(-10, 10), drag: 1.5,
        });
      }
    } else if (element === 'light') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = rand(70, 200);
        this.ps.spawn({
          x, y, z: rand(8, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(20, 80),
          g: 0, life: rand(0.25, 0.45), size: rand(2.5, 5) * scale, shape: 'star', color: Math.random() < 0.5 ? col : '#fff8c8', drag: 3,
        });
      }
      if (aff > 1) this.ring(x, y, el.glow, 6, 40, 0.25);
    } else if (element === 'darkness') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = rand(30, 110);
        this.ps.spawn({
          x, y, z: rand(2, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(10, 50),
          g: -20, life: rand(0.35, 0.6), size: rand(3, 6) * scale, grow: 8, color: alt, drag: 2,
        });
      }
    } else {
      this.sparks(x, y, n, col);
    }
  }

  rockChips(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      this.ps.spawn({
        x, y: y + 10, z: 10, vx: Math.cos(a) * rand(50, 140), vy: Math.sin(a) * rand(30, 80), vz: rand(100, 220),
        g: 700, life: rand(0.5, 0.8), size: rand(1.8, 3), shape: 'chip', bounce: true,
        color: Math.random() < 0.5 ? '#9aa2a8' : '#6b7278', vr: rand(-10, 10), drag: 1.5,
      });
    }
  }

  deathBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = rand(60, 200);
      this.ps.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(50, 200), z: 10,
        g: 500, life: rand(0.5, 0.9), size: rand(3, 5.5), color, drag: 2.5, bounce: true,
      });
    }
    for (let i = 0; i < 5; i++) {
      this.ps.spawn({
        x: x + rand(-14, 14), y: y - rand(10, 30), vx: rand(-30, 30), vy: rand(-60, -20), g: 0,
        life: rand(0.5, 0.9), size: rand(3, 5), shape: 'star', color: '#fff6b0', drag: 1,
      });
    }
    this.dust(x, y, 6);
  }

  ring(x, y, color, size = 10, grow = 160, life = 0.5) {
    this.ps.spawn({ x, y, g: 0, life, size, grow, shape: 'ring', color, drag: 0 });
  }

  sparkle(x, y, color) {
    this.ps.spawn({
      x: x + rand(-6, 6), y: y - rand(14, 26), vx: rand(-20, 20), vy: rand(-50, -20), g: 0,
      life: rand(0.3, 0.5), size: rand(2.5, 4), shape: 'star', color, drag: 2,
    });
  }

  /** Full dynamite-style blast: fireballs, sparks, smoke, debris, shock rings. */
  explosion(x, y, r = 100) {
    const scale = clamp(r / 100, 0.85, 1.8);
    // Expanding shock rings
    this.ring(x, y, 'rgba(255,240,180,0.95)', r * 0.25, r * 2.4, 0.45);
    this.ring(x, y, 'rgba(255,120,40,0.8)', r * 0.15, r * 1.9, 0.38);
    this.ring(x, y, 'rgba(255,60,20,0.55)', r * 0.08, r * 1.4, 0.3);
    // Hot sparks / shards
    for (let i = 0; i < Math.round(28 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(140, 420) * scale;
      this.ps.spawn({
        x, y, z: rand(8, 28),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(80, 280) * scale,
        g: 500, life: rand(0.35, 0.7), size: rand(2, 4.5) * scale,
        shape: 'spark', color: Math.random() < 0.45 ? '#fff6c8' : Math.random() < 0.5 ? '#ffb347' : '#ff6a3d',
        drag: 2.2,
      });
    }
    // Rising fire plumes
    for (let i = 0; i < Math.round(18 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(40, 160) * scale;
      this.ps.spawn({
        x: x + Math.cos(a) * rand(0, r * 0.35), y: y + Math.sin(a) * rand(0, r * 0.25),
        z: rand(4, 16), vx: Math.cos(a) * sp * 0.4, vy: Math.sin(a) * sp * 0.25, vz: rand(120, 320) * scale,
        g: -80, life: rand(0.4, 0.85), size: rand(4, 9) * scale, grow: 10,
        color: Math.random() < 0.35 ? '#ffe066' : Math.random() < 0.5 ? '#ff8a3d' : '#e5484d',
        drag: 1.6,
      });
    }
    // Smoke / ash
    for (let i = 0; i < Math.round(14 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(30, 110) * scale;
      this.ps.spawn({
        x: x + Math.cos(a) * rand(0, r * 0.4), y: y + Math.sin(a) * rand(0, r * 0.3),
        z: rand(10, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: rand(40, 120),
        g: -20, life: rand(0.7, 1.3), size: rand(6, 12) * scale, grow: 18,
        color: Math.random() < 0.5 ? 'rgba(60,40,30,0.55)' : 'rgba(90,70,55,0.45)', drag: 1.2,
      });
    }
    // Debris chips
    for (let i = 0; i < Math.round(12 * scale); i++) {
      const a = Math.random() * TAU;
      const sp = rand(90, 260) * scale;
      this.ps.spawn({
        x, y: y + 6, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(100, 240),
        g: 700, life: rand(0.5, 0.9), size: rand(2, 4) * scale, shape: 'chip', bounce: true,
        color: Math.random() < 0.5 ? '#6b7278' : '#8a5a2e', vr: rand(-14, 14), drag: 1.4,
      });
    }
    // White flash stars at core
    for (let i = 0; i < Math.round(8 * scale); i++) {
      this.ps.spawn({
        x: x + rand(-10, 10) * scale, y: y - rand(4, 20), vx: rand(-40, 40), vy: rand(-80, -20), g: 0,
        life: rand(0.25, 0.45), size: rand(3, 6) * scale, shape: 'star', color: '#fff8d0', drag: 2,
      });
    }
    this.dust(x, y, Math.round(16 * scale));
  }
}
