export type FlightVector = [number, number, number];

export interface FlightMotion {
  heading: number;
  turnRate: number;
  climb: number;
  speed: number;
}

/** Ground-relative displacement for a coordinated, constant-bank turn. */
export function flightDisplacement(flight: FlightMotion, age: number): FlightVector {
  if (age === 0) return [0, 0, 0];
  const end = flight.heading + flight.turnRate * age;
  if (Math.abs(flight.turnRate) < 1e-5) {
    return [flight.speed * age * Math.cos(flight.heading), flight.speed * age * Math.sin(flight.heading), flight.speed * flight.climb * age];
  }
  return [
    (flight.speed / flight.turnRate) * (Math.sin(end) - Math.sin(flight.heading)),
    (flight.speed / flight.turnRate) * (Math.cos(flight.heading) - Math.cos(end)),
    flight.speed * flight.climb * age,
  ];
}

export function flightDirection(flight: FlightMotion, age: number): FlightVector {
  const heading = flight.heading + flight.turnRate * age;
  const length = Math.hypot(Math.cos(heading), Math.sin(heading), flight.climb);
  return [Math.cos(heading) / length, Math.sin(heading) / length, flight.climb / length];
}

/**
 * Check two concurrently visible routes for an unsafe close pass. Sampling is
 * time-based so this also catches paths that cross between rendered frames.
 */
export function routesStaySeparated(
  a: FlightMotion & { start: FlightVector; born: number; life: number },
  b: FlightMotion & { start: FlightVector; born: number; life: number },
  now: number,
  minimumDistance: number,
  step = 0.5,
): boolean {
  const aAge = now - a.born;
  const bAge = now - b.born;
  const duration = Math.min(a.life - aAge, b.life - bAge);
  if (duration <= 0) return true;
  for (let seconds = 0; seconds <= duration; seconds += step) {
    const pa = flightDisplacement(a, aAge + seconds).map((v, i) => v + a.start[i]) as FlightVector;
    const pb = flightDisplacement(b, bAge + seconds).map((v, i) => v + b.start[i]) as FlightVector;
    if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) < minimumDistance) return false;
  }
  return true;
}

/** Bank required to hold the turn rate at this airspeed. */
export function flightBank(flight: Pick<FlightMotion, 'speed' | 'turnRate'>): number {
  // Heading is measured counterclockwise in the world plane; a left turn
  // therefore needs a left bank (negative in the sprite's screen rotation).
  return -Math.atan((flight.speed * flight.turnRate) / 9.81);
}

/** Aircraft local +Y follows velocity; bank rolls around that forward axis. */
export function flightBasis(flight: FlightMotion, age: number): { right: FlightVector; forward: FlightVector; up: FlightVector } {
  const forward = flightDirection(flight, age);
  const horizontal = Math.hypot(forward[0], forward[1]);
  const levelRight: FlightVector = [forward[1] / horizontal, -forward[0] / horizontal, 0];
  const levelUp: FlightVector = [levelRight[1] * forward[2], -levelRight[0] * forward[2], horizontal];
  const bank = flightBank(flight);
  const right = levelRight.map((value, i) => value * Math.cos(bank) - levelUp[i] * Math.sin(bank)) as FlightVector;
  const up = levelUp.map((value, i) => value * Math.cos(bank) + levelRight[i] * Math.sin(bank)) as FlightVector;
  return { right, forward, up };
}

/** Pick the nearest rendered view without blending two offset silhouettes. */
export function nearestSprite(angle: number, views: number): number {
  const wrapped = ((angle % views) + views) % views;
  return Math.round(wrapped) % views;
}

/** Pitch correction for a sprite rendered at a known camera-relative view. */
export function spritePitchRotation(pitch: number, azimuth: number, elevation: number): number {
  const forward: FlightVector = [0, Math.cos(pitch), Math.sin(pitch)];
  const right: FlightVector = [Math.cos(azimuth), Math.sin(azimuth), 0];
  const up: FlightVector = [-Math.sin(azimuth) * Math.sin(elevation), Math.cos(azimuth) * Math.sin(elevation), Math.cos(elevation)];
  const desired = Math.atan2(
    -(forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2]),
    forward[0] * right[0] + forward[1] * right[1] + forward[2] * right[2],
  );
  const source = Math.atan2(-Math.cos(azimuth) * Math.sin(elevation), Math.sin(azimuth));
  return Math.atan2(Math.sin(desired - source), Math.cos(desired - source));
}
