/** Artistic traffic simulation, not a live traffic feed. All hours are Pacific. */

// Share of peak lane volume for each hour, shaped on the bridge's published
// daily pattern: weekday commute peaks, a busy weekend middle of the day.
const WEEKDAY = [
  0.08, 0.05, 0.04, 0.04, 0.08, 0.25, 0.6, 0.95, 1, 0.8, 0.6, 0.6, 0.62, 0.62,
  0.65, 0.8, 0.95, 1, 0.85, 0.6, 0.45, 0.35, 0.25, 0.14,
];
const WEEKEND = [
  0.15, 0.1, 0.06, 0.05, 0.05, 0.1, 0.2, 0.32, 0.45, 0.6, 0.72, 0.8, 0.85,
  0.85, 0.85, 0.82, 0.78, 0.7, 0.6, 0.5, 0.4, 0.33, 0.26, 0.2,
];
/** Vehicles an hour in one lane at the busiest hour. */
const PEAK_FLOW = 1450;
/** 45 mph, the posted limit. */
export const SPEED_LIMIT = 20.1;
/** Metres of deck between where traffic appears and where it leaves the frame. */
export const ROAD_LENGTH = 1700;

export type TrafficPeriod = "rush" | "day" | "night";
export interface TrafficProfile {
  period: TrafficPeriod;
  /** Share of peak volume, 0-1. */
  level: number;
  /** Extra share toward the city (positive, mornings) or Marin (negative, evenings). */
  cityBias: number;
}

export function trafficProfile(date = new Date()): TrafficProfile {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = (Number(part("hour")) % 24) + Number(part("minute")) / 60;
  const weekday = !["Sat", "Sun"].includes(part("weekday"));
  const table = weekday ? WEEKDAY : WEEKEND;
  const base = Math.floor(hour);
  const level =
    table[base] + (table[(base + 1) % 24] - table[base]) * (hour - base);
  const peak = (start: number, end: number) =>
    Math.max(0, Math.min(1, (hour - start) * 2, (end - hour) * 2));
  const morning = weekday ? peak(6.5, 9.5) : 0;
  const evening = weekday ? peak(15.5, 19) : 0;
  return {
    period: morning + evening > 0 ? "rush" : level < 0.2 ? "night" : "day",
    level,
    cityBias: 0.25 * (morning - evening),
  };
}

/** Vehicles an hour for one lane; direction -1 travels toward the city. */
export function laneFlow(profile: TrafficProfile, direction: 1 | -1) {
  return (
    PEAK_FLOW *
    profile.level *
    (1 + (direction < 0 ? profile.cityBias : -profile.cityBias))
  );
}

export type VehicleKind =
  | "compact"
  | "sedan"
  | "suv"
  | "pickup"
  | "van"
  | "box"
  | "bus"
  | "semi";
/** Length, breadth and height in artwork pixels at the nearest point of the deck. */
export const vehicleSizes: Record<VehicleKind, [number, number, number]> = {
  compact: [13, 4.4, 2.5],
  sedan: [15, 4.8, 2.7],
  suv: [16, 5.5, 3.6],
  pickup: [18, 5.4, 3.1],
  van: [17, 5.6, 4.6],
  box: [26, 6, 6],
  bus: [38, 6.2, 6.6],
  semi: [52, 6.2, 6.4],
};
const PIXELS_PER_METRE = 15 / 4.8;
const MIX: [VehicleKind, number][] = [
  ["compact", 15],
  ["sedan", 34],
  ["suv", 22],
  ["pickup", 10],
  ["van", 7],
  ["box", 6],
  ["bus", 2.5],
  ["semi", 3.5],
];
const HEAVY = new Set<VehicleKind>(["box", "bus", "semi"]);

export interface Vehicle {
  kind: VehicleKind;
  color: string;
  /** Metres travelled from where this lane's traffic enters. */
  s: number;
  v: number;
  /** Preferred cruising speed (m/s). */
  v0: number;
  length: number;
  /** Seconds left in a brief lift-off or brake, which seeds natural slowdowns. */
  hesitate: number;
  phase: number;
}
export interface Lane {
  direction: 1 | -1;
  /** Leader first. */
  cars: Vehicle[];
  /** Seconds until the next vehicle wants to enter. */
  arrival: number;
}

const PAINT = [
  "#d9d8d2", "#d9d8d2", "#c4c5bf", "#8d969b", "#1d2124", "#1d2124",
  "#454a4c", "#4f606c", "#2c3d5c", "#8d4941", "#776d65", "#c2b49b",
];

export function newVehicle(rand: () => number, s = 0): Vehicle {
  let pick = rand() * 100;
  let kind: VehicleKind = "sedan";
  for (const [k, share] of MIX) {
    if ((pick -= share) < 0) {
      kind = k;
      break;
    }
  }
  const heavy = HEAVY.has(kind);
  const v0 = SPEED_LIMIT * (heavy ? 0.86 + rand() * 0.1 : 0.9 + rand() * 0.22);
  return {
    kind,
    color:
      kind === "bus"
        ? "#e4e1d8"
        : kind === "box" || kind === "semi"
          ? rand() < 0.7 ? "#e1ddd1" : PAINT[Math.floor(rand() * PAINT.length)]
          : PAINT[Math.floor(rand() * PAINT.length)],
    s,
    v: v0,
    v0,
    length: vehicleSizes[kind][0] / PIXELS_PER_METRE,
    hesitate: 0,
    phase: rand() * 100,
  };
}

/** Intelligent Driver Model acceleration toward a leader `gap` metres ahead. */
export function acceleration(car: Vehicle, gap: number, leaderSpeed: number) {
  const heavy = HEAVY.has(car.kind);
  const a = heavy ? 0.7 : 1.3,
    b = 2,
    s0 = 2.4,
    T = heavy ? 1.8 : 1.35;
  const wanted = car.hesitate > 0 ? car.v0 * 0.62 : car.v0;
  const free = 1 - (car.v / wanted) ** 4;
  if (!Number.isFinite(gap)) return a * free;
  const dv = car.v - leaderSpeed;
  const desired = s0 + Math.max(0, car.v * T + (car.v * dv) / (2 * Math.sqrt(a * b)));
  return a * (free - (desired / Math.max(0.5, gap)) ** 2);
}

function headway(rand: () => number, flow: number) {
  const mean = 3600 / Math.max(30, flow);
  const minimum = Math.min(1.4, mean * 0.5);
  return minimum - Math.log(1 - rand()) * (mean - minimum);
}

/** Advance one lane by dt seconds. */
export function stepLane(
  lane: Lane,
  dt: number,
  profile: TrafficProfile,
  rand: () => number = Math.random,
) {
  const cars = lane.cars;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i],
      leader = cars[i - 1];
    if (car.hesitate > 0) car.hesitate -= dt;
    // Drivers occasionally lift off or tap the brakes, more often when close
    // behind someone; in dense traffic that becomes a travelling slowdown.
    else if (rand() < dt * (leader && leader.s - car.s < 45 ? 0.012 : 0.003))
      car.hesitate = 1.5 + rand() * 2.5;
    const gap = leader ? leader.s - leader.length - car.s : Infinity;
    const accel = acceleration(car, gap, leader ? leader.v : car.v0);
    car.v = Math.max(0, car.v + Math.max(-7, accel) * dt);
    car.s += car.v * dt;
    if (leader) car.s = Math.min(car.s, leader.s - leader.length - 0.8);
  }
  while (cars.length && cars[0].s - cars[0].length > ROAD_LENGTH) cars.shift();
  lane.arrival -= dt;
  if (lane.arrival <= 0) {
    const last = cars[cars.length - 1];
    const entering = newVehicle(rand);
    const room = last ? last.s - last.length : Infinity;
    if (room > 2.4 + entering.v0 * 1.1) {
      entering.v = last ? Math.min(entering.v0, last.v + 1) : entering.v0;
      cars.push(entering);
      lane.arrival = headway(rand, laneFlow(profile, lane.direction));
    }
  }
}

/** Position along the drawn road (0 far end, 1 nearest the camera). */
export function laneDistance(lane: Lane, car: Vehicle) {
  const t = car.s / ROAD_LENGTH;
  return lane.direction > 0 ? t : 1 - t;
}

export function roadPoint(distance: number) {
  // Project equal world distances into the common 1536 × 1024 artwork coordinates.
  const t = distance / (4 - 3 * distance),
    v = 1 - t;
  return {
    x:
      v ** 3 * 490 + 3 * v * v * t * 735 + 3 * v * t * t * 1040 + t ** 3 * 1400,
    y: v ** 3 * 325 + 3 * v * v * t * 389 + 3 * v * t * t * 554 + t ** 3 * 750,
    scale: 0.08 + t * 0.92,
    angle: Math.atan2(
      3 * v * v * 64 + 6 * v * t * 165 + 3 * t * t * 196,
      3 * v * v * 245 + 6 * v * t * 305 + 3 * t * t * 360,
    ),
  };
}
