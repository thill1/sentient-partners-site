/**
 * The film's light follows the clock in San Francisco. A review can pin it
 * with ?time=day, ?time=sunset, ?time=night or ?time=14:30.
 */
export interface TimeOfDay {
  /** Weights for clear day, golden hour and night; they sum to 1. */
  phase: [number, number, number];
  /** Direction to the sun, or to the moon at night. */
  light: [number, number, number];
  /** The time shown on the clock, such as "7:42 PM". */
  clock: string;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ramp = (value: number, from: number, to: number) => clamp01((value - from) / (to - from));
const normalize = (v: [number, number, number]): [number, number, number] => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};

const SUN_DAY = normalize([0.42, 0.66, 0.62]);
const SUN_GOLD = normalize([0.4708, 0.0351, 0.8816]);
const MOON = normalize([0.36, 0.2, 0.91]);
const PINNED: Record<string, number> = { day: 12.5, sunset: 18.9, night: 22.5 };

const pacificParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});
const pacificClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });

function pinnedHour(): number | null {
  try {
    const value = new URLSearchParams(window.location.search).get('time');
    if (!value) return null;
    if (value in PINNED) return PINNED[value];
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    return match ? Number(match[1]) + Number(match[2]) / 60 : null;
  } catch {
    return null;
  }
}

function format(hour: number) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function timeOfDay(now = new Date()): TimeOfDay {
  const pinned = pinnedHour();
  let hour: number;
  let clock: string;
  if (pinned !== null) {
    hour = pinned;
    clock = format(pinned);
  } else {
    const parts = Object.fromEntries(pacificParts.formatToParts(now).map((part) => [part.type, part.value]));
    hour = Number(parts.hour) + Number(parts.minute) / 60;
    clock = pacificClock.format(now);
  }

  // Night until first light, golden hour around sunrise and sunset, clear day between.
  const night = 1 - ramp(hour, 5.2, 6.3) + ramp(hour, 19.7, 20.6);
  const day = ramp(hour, 7.0, 8.4) - ramp(hour, 16.6, 18.0);
  const n = clamp01(night);
  const d = clamp01(day) * (1 - n);
  const g = clamp01(1 - n - d);

  const lit = d + g || 1;
  const sun = normalize([
    (SUN_DAY[0] * d + SUN_GOLD[0] * g) / lit,
    (SUN_DAY[1] * d + SUN_GOLD[1] * g) / lit,
    (SUN_DAY[2] * d + SUN_GOLD[2] * g) / lit,
  ]);
  return { phase: [d, g, n], light: n > 0.5 ? MOON : sun, clock };
}
