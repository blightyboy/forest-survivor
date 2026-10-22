import { RAID_DISTANCE, compassName } from '../data/constants';
import { clamp, rand, TAU } from '../core/math';
import type { AnimalSystem } from './AnimalSystem';
import type { SpeciesId } from '../data/animals';

type QueueSpec = { species: SpeciesId; big?: boolean };

/**
 * Daytime assault waves that march on the camp (legacy updateAssaultWaves).
 * Held during night raids.
 */
export class AssaultSystem {
  index = 0;
  timer = 18;
  spawnT = 0;
  angle = 0;
  queue: QueueSpec[] = [];
  alive = 0;

  update(
    dt: number,
    animals: AnimalSystem,
    campX: number,
    campY: number,
    worldW: number,
    worldH: number,
    threatM: number,
    threatHp: number,
    isNight: boolean,
    raidActive: boolean,
    onBanner: (title: string, sub: string, color: string) => void,
  ) {
    if (isNight || raidActive) {
      this.queue.length = 0;
      this.timer = Math.max(this.timer, 22);
      return;
    }

    // Count daytime assault siegers only (not leftover night raiders).
    this.alive = animals.animals.filter((a) => !a.dead && a.assault && !a.boss).length;

    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT > 0) return;
      this.spawnT = 0.28;
      const spec = this.queue.pop();
      if (spec) this.spawnMember(spec, animals, campX, campY, worldW, worldH, threatM);
      return;
    }

    if (this.alive >= 18) {
      this.timer = Math.max(this.timer, 8);
      return;
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    this.startWave(threatM, threatHp, onBanner);
  }

  private startWave(
    threatM: number,
    threatHp: number,
    onBanner: (title: string, sub: string, color: string) => void,
  ) {
    this.index++;
    const m = threatM;
    const size = Math.min(22, Math.round(3 + m * 1.35 + Math.pow(Math.max(0, m - 1), 1.2) * 0.45));
    const pool = this.speciesPool(m);
    const queue: QueueSpec[] = [];
    for (let i = 0; i < size; i++) {
      const species = pool[Math.floor(Math.random() * pool.length)];
      const big = species === 'boar' && m >= 2.5 && Math.random() < clamp(0.1 + m * 0.04, 0.1, 0.4);
      queue.push({ species, big });
    }
    this.angle = Math.random() * TAU;
    this.queue = queue;
    this.spawnT = 0;
    this.timer = Math.max(28, 72 - m * 5.5 + rand(-4, 6));
    const dir = compassName(this.angle);
    onBanner(
      `Assault wave ${this.index}!`,
      `${size} beasts advance from the ${dir} · Threat x${threatHp.toFixed(1)}`,
      '#ff9a6b',
    );
  }

  private speciesPool(m: number): SpeciesId[] {
    const pool: SpeciesId[] = ['boar', 'rat'];
    if (m >= 0.8) pool.push('boar', 'wolf', 'rat');
    if (m >= 1.6) pool.push('sheep', 'beaver', 'rat');
    if (m >= 2.5) pool.push('deer', 'fox', 'dire_boar');
    if (m >= 3.5) pool.push('wolf', 'raccoon', 'duck', 'rat');
    if (m >= 4.5) pool.push('dire_wolf', 'bear', 'beaver', 'sheep');
    if (m >= 6) pool.push('dire_bear', 'dire_boar', 'dire_wolf');
    if (m >= 8) pool.push('dire_bear', 'bear', 'dire_wolf');
    return pool;
  }

  private spawnMember(
    spec: QueueSpec,
    animals: AnimalSystem,
    campX: number,
    campY: number,
    worldW: number,
    worldH: number,
    threatM: number,
  ) {
    const dist = RAID_DISTANCE * rand(0.72, 0.92);
    const ox = clamp(campX + Math.cos(this.angle) * dist, 260, worldW - 260);
    const oy = clamp(campY + Math.sin(this.angle) * dist, 260, worldH - 260);
    const bonus = 1 + 0.06 * this.index;
    // Legacy: try several offsets, reject camp yard (spawnInBase).
    for (let i = 0; i < 16; i++) {
      const x = ox + rand(-140, 140);
      const y = oy + rand(-140, 140);
      if (x < 80 || y < 80 || x > worldW - 80 || y > worldH - 80) continue;
      if (animals.spawnBlocked(x, y)) continue;
      animals.spawn(spec.species, x, y, {
        raider: true,
        assault: true,
        big: spec.big,
        threatM,
        mult: {
          hp: (1 + 0.4 * threatM) * bonus * Math.pow(1.09, threatM),
          dmg: (1 + 0.16 * threatM) * Math.pow(1.035, threatM) * (0.92 + Math.min(0.2, threatM * 0.02)),
          speed: Math.min(1.5, 1 + 0.02 * threatM),
        },
      });
      return;
    }
  }
}
