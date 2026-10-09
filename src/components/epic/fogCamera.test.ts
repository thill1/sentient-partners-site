import { describe, expect, it } from 'vitest';
import camera from '../../../public/film/camera.json';
import { cameraRay, decodeDepth, encodeDepth, fogClock, projectToNdc, type CameraPose, type Vec3 } from './fogCamera';

const tanX = Math.tan(camera.fov / 2);
const tanY = tanX / camera.aspect;
const poses: CameraPose[] = [camera.open as CameraPose, ...(camera.frames as CameraPose[]).filter((_, i) => i % 17 === 0), camera.city as CameraPose];

describe('live fog camera', () => {
  it('rebuilds the same ray the traffic layers project through, for every exported pose', () => {
    for (const pose of poses) {
      for (const point of [[0, 640, 120], [6440, -4455, 200], [-1500, 900, 10], [3000, -2000, 400]] as Vec3[]) {
        const ndc = projectToNdc(pose, tanX, tanY, point);
        if (!ndc) continue;
        const ray = cameraRay(pose, tanX, tanY, ndc[0], ndc[1]);
        const to = [point[0] - pose.p[0], point[1] - pose.p[1], point[2] - pose.p[2]];
        const len = Math.hypot(to[0], to[1], to[2]);
        const cosine = (ray[0] * to[0] + ray[1] * to[1] + ray[2] * to[2]) / len;
        expect(cosine).toBeGreaterThan(1 - 1e-9);
      }
    }
  });

  it('keeps ray distances through the depth encoding, and reads white as sky', () => {
    for (const metres of [5, 12, 67.6, 640, 2950, 11000, 59000]) {
      const [r, g, b] = encodeDepth(metres);
      expect(Math.abs(decodeDepth(r, g, b) - metres) / metres).toBeLessThan(0.001);
    }
    expect(decodeDepth(255, 255, 255)).toBe(Infinity);
  });

  it('runs the wind on wall time only: scroll position cannot move it, reduced motion stops it', () => {
    expect(fogClock(31000, 1000, false)).toBe(30);
    expect(fogClock(31000, 1000, false)).toBeGreaterThan(fogClock(21000, 1000, false));
    expect(fogClock(31000, 1000, true)).toBe(0);
    expect(fogClock.length).toBe(3); // no scroll argument exists to reverse it
  });
});
