export type TrafficVector = [number, number, number];

/** Time-based world-space motion shared by live cars and vessels. */
export interface TrafficMotion {
  heading: number;
  turnRate: number;
  speed: number;
  bobAmplitude: number;
  bobPeriod: number;
  bobPhase: number;
}

/** Keep traffic on a finite route and wrap it only after it clears both ends. */
export function lanePosition(start: number, speed: number, direction: -1 | 1, seconds: number, min: number, max: number): number {
  const span = max - min;
  if (!(span > 0)) return min;
  const travelled = (start - min + direction * speed * seconds) % span;
  return min + ((travelled + span) % span);
}

/** Stable phase for a vehicle slot; avoids reshuffling when a render resumes. */
export function laneStart(slot: number, count: number, min: number, max: number, jitter: number): number {
  const span = max - min;
  const unit = ((slot * 0.6180339887498949) % 1) * 2 - 1;
  return min + ((slot + 0.5) / count) * span + unit * jitter;
}

/** Integrate a constant-speed, constant-curvature ground or water route. */
export function trafficDisplacement(motion: TrafficMotion, seconds: number): TrafficVector {
  const { heading, turnRate, speed } = motion;
  const end = heading + turnRate * seconds;
  const horizontal: TrafficVector = Math.abs(turnRate) < 1e-5
    ? [speed * seconds * Math.cos(heading), speed * seconds * Math.sin(heading), 0]
    : [
      (speed / turnRate) * (Math.sin(end) - Math.sin(heading)),
      (speed / turnRate) * (Math.cos(heading) - Math.cos(end)),
      0,
    ];
  horizontal[2] = motion.bobAmplitude > 0 && motion.bobPeriod > 0
    ? motion.bobAmplitude * Math.sin((Math.PI * 2 * seconds) / motion.bobPeriod + motion.bobPhase)
    : 0;
  return horizontal;
}

export function trafficHeading(motion: TrafficMotion, seconds: number): number {
  return motion.heading + motion.turnRate * seconds;
}
