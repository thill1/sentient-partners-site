/**
 * Distant aircraft over the Golden Gate artwork, in its 1536 × 1024
 * coordinates. Routes stay in the sky behind the bridge and never pass over
 * or behind a tower or its beacons; long quiet spells leave the sky empty.
 */
export type AircraftKind = "airliner" | "jet" | "light";

export interface Flight {
  kind: AircraftKind;
  x0: number;
  y0: number;
  /** Artwork pixels a second. */
  vx: number;
  vy: number;
  /** Wingspan in artwork pixels, and its change a second (closing or receding). */
  span: number;
  growth: number;
  born: number;
  life: number;
  /** Seconds to emerge from and recede into the haze. */
  fade: number;
  /** Offsets the light timing so aircraft never flash in step. */
  phase: number;
  landingLight: boolean;
}

/** Each tower with its beacons and a margin: [left, top, right, bottom]. */
export const TOWERS: [number, number, number, number][] = [
  [1020, 70, 1200, 1024],
  [540, 160, 640, 1024],
];

export function clearOfTowers(x: number, y: number, margin = 24) {
  return TOWERS.every(
    ([left, top, right, bottom]) =>
      x < left - margin ||
      x > right + margin ||
      y < top - margin ||
      y > bottom + margin,
  );
}

export function flightAt(flight: Flight, now: number) {
  const age = now - flight.born;
  const ease = (t: number) => t * t * (3 - 2 * t);
  const alpha = ease(
    Math.max(
      0,
      Math.min(1, age / flight.fade, (flight.life - age) / flight.fade),
    ),
  );
  return {
    x: flight.x0 + flight.vx * age,
    y: flight.y0 + flight.vy * age,
    span: flight.span + flight.growth * age,
    alpha,
  };
}

/**
 * The clear stretches of sky either side of each tower, with the Marin
 * headland for light aircraft. Jets (a little higher) and airliners (low
 * over the skyline) keep to the sky spans.
 */
const SKY_SPANS: [number, number][] = [
  [-30, 505],
  [675, 985],
  [1235, 1566],
];
const HEADLAND: [number, number] = [-30, 505];
/** Where the skyline meets the sky. */
const SKY_FLOOR = 198;

/** The part of the artwork on screen and clear of the navigation. */
export interface SkyView {
  left: number;
  right: number;
  top: number;
}
export const FULL_VIEW: SkyView = { left: 0, right: 1536, top: 118 };

export function planFlight(
  rand: () => number,
  now: number,
  view: SkyView = FULL_VIEW,
): Flight | null {
  const within = ([left, right]: [number, number]): [number, number] => [
    Math.max(left, view.left - 40),
    Math.min(right, view.right + 40),
  ];
  const spans = SKY_SPANS.map(within).filter(([l, r]) => r - l >= 140);
  const headland = within(HEADLAND);
  const top = Math.max(view.top, 118);
  const sky = SKY_FLOOR - top;
  const choose = (list: [number, number][]) =>
    list[Math.floor(rand() * list.length)];
  for (let attempt = 0; attempt < 12; attempt++) {
    const pick = rand();
    const dir = rand() < 0.5 ? -1 : 1;
    // A route of up to `most` pixels somewhere along a span.
    const route = (
      [left, right]: [number, number],
      least: number,
      most: number,
    ) => {
      const length = Math.min(right - left, least + rand() * (most - least));
      const offset = rand() * (right - left - length);
      return { x0: dir > 0 ? left + offset : right - offset, length };
    };
    let flight: Flight;
    if (pick < 0.35 && spans.length && sky >= 24) {
      const { x0, length } = route(choose(spans), 260, 560);
      const speed = 7 + rand() * 4;
      flight = {
        kind: "jet",
        x0,
        y0: top + 4 + rand() * sky * 0.4,
        vx: dir * speed,
        vy: (rand() - 0.5) * 0.2,
        span: 9 + rand() * 3,
        growth: 0,
        born: now,
        life: length / speed,
        fade: 4,
        phase: rand(),
        landingLight: false,
      };
    } else if (pick < 0.85 && spans.length && sky >= 14) {
      const { x0, length } = route(choose(spans), 200, 500);
      const speed = 4 + rand() * 3;
      const life = length / speed;
      // Mostly letting down toward SFO; the odd one climbing out. The drift
      // over the whole route stays inside the band.
      const descending = rand() < 0.75;
      const y0 = top + sky * (0.3 + rand() * 0.55);
      const room = descending ? SKY_FLOOR + 4 - y0 : y0 - top;
      flight = {
        kind: "airliner",
        x0,
        y0,
        vx: dir * speed,
        vy: (descending ? 1 : -1) * Math.min(0.04 + rand() * 0.12, room / life),
        span: 14 + rand() * 4,
        growth: (rand() - 0.5) * 0.025,
        born: now,
        life,
        fade: 6,
        phase: rand(),
        landingLight: descending && rand() < 0.6,
      };
    } else if (headland[1] - headland[0] >= 140) {
      const { x0, length } = route(headland, 180, 440);
      const speed = 3 + rand() * 2;
      flight = {
        kind: "light",
        x0,
        y0: 228 + rand() * 60,
        vx: dir * speed,
        vy: (rand() - 0.5) * 0.15,
        span: 9 + rand() * 2,
        growth: 0,
        born: now,
        life: length / speed,
        fade: 5,
        phase: rand(),
        landingLight: false,
      };
    } else continue;
    let clear = true;
    for (let t = 0; t <= flight.life && clear; t += 0.5) {
      const { x, y } = flightAt(flight, now + t);
      clear = clearOfTowers(x, y, 30) && (flight.kind === "light" || y >= top);
    }
    if (clear) return flight;
  }
  return null;
}

/** Seconds until the next flight: usually a short wait, sometimes a long empty sky. */
export function nextGap(rand: () => number) {
  return rand() < 0.3 ? 45 + rand() * 60 : 8 + rand() * 22;
}
