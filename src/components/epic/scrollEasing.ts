/** Frame-rate-independent easing for the scroll-following camera and pointer parallax. */
export function followTarget(current: number, target: number, elapsedMs: number, timeConstantMs: number) {
  const elapsed = Math.max(0, Math.min(elapsedMs, 100));
  const follow = 1 - Math.exp(-elapsed / timeConstantMs);
  return current + (target - current) * follow;
}
