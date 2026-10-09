/**
 * Shared camera and depth maths for the live fog (liveFog.ts shader) and the
 * layers that must agree with it. The shader mirrors these exactly.
 */
export type Vec3 = [number, number, number];
export interface CameraPose { p: Vec3; r: Vec3; u: Vec3; f: Vec3 }

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Viewing ray through a point in normalised device coordinates (x right, y up). */
export function cameraRay(pose: CameraPose, tanX: number, tanY: number, ndcX: number, ndcY: number): Vec3 {
  const d: Vec3 = [
    pose.f[0] + pose.r[0] * ndcX * tanX + pose.u[0] * ndcY * tanY,
    pose.f[1] + pose.r[1] * ndcX * tanX + pose.u[1] * ndcY * tanY,
    pose.f[2] + pose.r[2] * ndcX * tanX + pose.u[2] * ndcY * tanY,
  ];
  const length = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / length, d[1] / length, d[2] / length];
}

/** Where a world point lands, as the traffic layers project it. */
export function projectToNdc(pose: CameraPose, tanX: number, tanY: number, point: Vec3): [number, number] | null {
  const v = sub(point, pose.p);
  const z = dot(v, pose.f);
  if (z <= 1) return null;
  return [dot(v, pose.r) / (z * tanX), dot(v, pose.u) / (z * tanY)];
}

const NEAR = Math.log(5), FAR = Math.log(60000);

/** Encode a ray distance as film/export_depth.py does (24 bits, log, 5 m-60 km). */
export function encodeDepth(distance: number): [number, number, number] {
  const n = Math.min(0.99999, Math.max(0, (Math.log(Math.max(distance, 5)) - NEAR) / (FAR - NEAR)));
  const a = Math.floor(n * 255); const rem = n * 255 - a;
  const b = Math.floor(rem * 255); const rem2 = rem * 255 - b;
  return [a, b, Math.floor(rem2 * 255)];
}

/** Decode a depth pixel (0-255 channels) to metres along the ray; white is sky. */
export function decodeDepth(r: number, g: number, b: number): number {
  const n = r / 255 + g / 255 / 255 + b / 255 / 65025;
  return n > 0.9999 ? Infinity : Math.exp(NEAR + (FAR - NEAR) * n);
}

/**
 * The fog's clock: wall time since the film started, frozen for reduced
 * motion. Deliberately takes no scroll input, so scrolling (forward or back)
 * moves only the camera and never the wind.
 */
export function fogClock(frameTime: number, started: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : Math.max(0, (frameTime - started) / 1000);
}
