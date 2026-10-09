import { describe, expect, it } from 'vitest';
import { followTarget } from './scrollEasing';

describe('scroll camera easing', () => {
  it('follows the same distance at 30, 60, and 120 Hz over equal time', () => {
    const positions = [30, 60, 120].map((fps) => {
      const frameMs = 1000 / fps;
      let position = 0;
      for (let frame = 0; frame < fps; frame++) position = followTarget(position, 1, frameMs, 230);
      return position;
    });

    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(0.000001);
    expect(positions[1]).toBeCloseTo(1 - Math.exp(-1000 / 230), 6);
  });

  it('bounds a delayed frame and does not snap the camera to its target', () => {
    expect(followTarget(0, 1, 1000, 230)).toBeCloseTo(1 - Math.exp(-100 / 230), 8);
  });

  it('preserves the Main Street response at 60 Hz', () => {
    expect(followTarget(0, 1, 1000 / 60, 175)).toBeCloseTo(0.09, 2);
  });
});
