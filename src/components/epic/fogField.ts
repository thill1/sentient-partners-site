/**
 * The live fog's density field on the CPU, term for term the same as the
 * shader in liveFog.ts, so boats, cars and aircraft can be faded by exactly
 * the fog that is drawn between them and the camera (no GPU readback).
 */
import type { Vec3 } from './fogCamera';

export const NOISE_SIZE = 256;
export const NOISE_SEED = 20261009;

/** Periodic value-noise fBm, four independent channels, tileable (RGBA bytes). */
export function noiseTexture(size = NOISE_SIZE, seed = NOISE_SEED) {
  const data = new Uint8Array(size * size * 4);
  let s = seed >>> 0 || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const channels = [[4, 5], [3, 3], [16, 4], [6, 3]];
  channels.forEach(([base, octaves], c) => {
    const field = new Float32Array(size * size);
    let amplitude = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
      const cells = base << o;
      const lattice = Array.from({ length: cells * cells }, rand);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const fx = (x / size) * cells, fy = (y / size) * cells;
          const ix = Math.floor(fx), iy = Math.floor(fy);
          const tx = fx - ix, ty = fy - iy;
          const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
          const at = (i: number, j: number) => lattice[((j % cells) * cells) + (i % cells)];
          const v = (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
          field[y * size + x] += v * amplitude;
        }
      }
      total += amplitude;
      amplitude *= 0.5;
    }
    for (let i = 0; i < field.length; i++) data[i * 4 + c] = Math.round((field[i] / total) * 255);
  });
  return data;
}

const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class FogField {
  private data = noiseTexture();
  constructor(public wind: [number, number], public seed: number) {}

  /** GL LINEAR + REPEAT sampling of one channel at texture coordinate (u, v). */
  private tex(u: number, v: number, c: number) {
    const n = NOISE_SIZE;
    const x = u * n - 0.5, y = v * n - 0.5;
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const at = (i: number, j: number) => this.data[((((j % n) + n) % n) * n + (((i % n) + n) % n)) * 4 + c] / 255;
    return (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) + (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy;
  }

  /** Mirrors density() in liveFog.ts. */
  density(p: Vec3, time: number, t = 0) {
    const s = this.seed;
    const qx = p[0] - this.wind[0] * time, qy = p[1] - this.wind[1] * time;
    const wx = this.tex(qx / 9100 + s, qy / 9100 + s, 3) - 0.5;
    const wy = this.tex(qx / 8300 + 0.37 + s, qy / 8300 + 0.37 + s, 3) - 0.5;
    const x = qx + wx * 1100 + time * 0.6, y = qy + wy * 1100 - time * 0.4;
    const bank = this.tex(x / 6200 + s * 0.71, y / 6200 + s * 0.71, 0) * 0.7 + this.tex(x / 2350 + 0.19, y / 2350 + 0.19, 0) * 0.3;
    const open = this.tex(x / 7900 + s * 1.3 + 0.53, y / 7900 + s * 1.3 + 0.53, 1) * 0.6 + this.tex(x / 2100 + s * 0.9 + 0.29, y / 2100 + s * 0.9 + 0.29, 1) * 0.4;
    const detail = this.tex(x / 760 + p[2] / 640 + 0.11, y / 760 - p[2] / 910 + 0.11, 2);
    const near = 1 - smoothstep(1500, 6000, t);
    const fine = 0.5 + (detail - 0.5) * near;
    const dome = this.tex(x / 1300 + 0.47, y / 1300 + 0.47, 3);
    const top = 160 + 34 * bank + 26 * (dome - 0.5) + 14 * (fine - 0.5);
    const base = 104 + 18 * open;
    const upper = smoothstep(base, base + 28, p[2]) * (1 - smoothstep(top - 38, top, p[2]));
    const cover = smoothstep(0.18, 0.42, bank * 0.82 + fine * 0.18) * smoothstep(0.14, 0.32, open);
    let d = upper * cover * (0.62 + 0.38 * fine);
    const lowCover = smoothstep(0.44, 0.7, this.tex(x / 3300 + 0.61, y / 3300 + 0.61, 0));
    d += smoothstep(4, 16, p[2]) * (1 - smoothstep(40, 56, p[2])) * lowCover * 0.85;
    const strand = smoothstep(0.58, 0.82, this.tex(x / 1450 + p[2] / 520 + 0.83, y / 1450 + p[2] / 770 + 0.83, 2));
    d += smoothstep(260, 330, p[2]) * (1 - smoothstep(620, 860, p[2])) * strand * 0.12 * (1 - smoothstep(600, 1800, t));
    return d;
  }

  /** Mirrors the shader's extinction coefficient for a density at height z. */
  static sigma(d: number, z: number) { return d * (z < 60 ? 0.018 : z > 250 ? 0.006 : 0.024); }

  /** How much of `point` shows through the fog from `from` (1 = clear). */
  transmittance(from: Vec3, point: Vec3, time: number, steps = 24) {
    const dx = point[0] - from[0], dy = point[1] - from[1], dz = point[2] - from[2];
    const length = Math.hypot(dx, dy, dz);
    const dt = length / steps;
    let optical = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const p: Vec3 = [from[0] + dx * t, from[1] + dy * t, from[2] + dz * t];
      if (p[2] > 900 || p[2] < 0) continue;
      optical += FogField.sigma(this.density(p, time, length * t), p[2]) * dt;
    }
    return Math.exp(-optical);
  }
}
