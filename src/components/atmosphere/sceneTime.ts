/** Time of day at the Golden Gate, which chooses one of four hero scenes. All clocks are Pacific. */
export type Scene = "sunrise" | "day" | "sunset" | "night";

export const sceneLabels: Record<Scene, string> = {
  sunrise: "Sunrise",
  day: "Daytime",
  sunset: "Sunset",
  night: "Nighttime",
};

const isScene = (value: unknown): value is Scene =>
  typeof value === "string" && value in sceneLabels;

const LATITUDE = 37.8199;
const WEST_LONGITUDE = 122.4783;
const MINUTE = 60000;
const rad = Math.PI / 180;

function pacificDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return [part("year"), part("month"), part("day")] as const;
}

/** Sunrise and sunset for the Pacific calendar day containing `date` (the standard sunrise equation). */
export function solarEvents(date: Date) {
  const [year, month, day] = pacificDate(date);
  const julian = Date.UTC(year, month - 1, day, 12) / 86400000 + 2440587.5;
  const n = Math.round(julian - 2451545);
  const meanSolarNoon = n + WEST_LONGITUDE / 360;
  const anomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const center =
    1.9148 * Math.sin(anomaly * rad) +
    0.02 * Math.sin(2 * anomaly * rad) +
    0.0003 * Math.sin(3 * anomaly * rad);
  const longitude = (anomaly + center + 180 + 102.9372) % 360;
  const transit =
    2451545 +
    meanSolarNoon +
    0.0053 * Math.sin(anomaly * rad) -
    0.0069 * Math.sin(2 * longitude * rad);
  const declination = Math.asin(
    Math.sin(longitude * rad) * Math.sin(23.4397 * rad),
  );
  const hourAngle =
    Math.acos(
      (Math.sin(-0.833 * rad) -
        Math.sin(LATITUDE * rad) * Math.sin(declination)) /
        (Math.cos(LATITUDE * rad) * Math.cos(declination)),
    ) / rad;
  const toTime = (j: number) => (j - 2440587.5) * 86400000;
  return {
    sunrise: toTime(transit - hourAngle / 360),
    sunset: toTime(transit + hourAngle / 360),
  };
}

/** Golden hours bracket each event: sunrise and sunset each own about two hours. */
export function sceneAt(date: Date): Scene {
  const { sunrise, sunset } = solarEvents(date);
  const t = date.getTime();
  if (t >= sunrise - 50 * MINUTE && t < sunrise + 70 * MINUTE) return "sunrise";
  if (t >= sunrise + 70 * MINUTE && t < sunset - 70 * MINUTE) return "day";
  if (t >= sunset - 70 * MINUTE && t < sunset + 50 * MINUTE) return "sunset";
  return "night";
}

/** `?scene=night` previews a scene at any hour. */
export function sceneOverride(search: string): Scene | null {
  const value = new URLSearchParams(search).get("scene");
  return isScene(value) ? value : null;
}

export function pacificClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(part("hour")) % 12;
  const minute = Number(part("minute"));
  const second = Number(part("second"));
  return {
    hour,
    minute,
    second,
    time: `${hour || 12}:${part("minute")}`,
    meridiem: part("dayPeriod").toUpperCase(),
    zone: part("timeZoneName"),
  };
}

/** The scene the page is showing, set on <html> by the hero clock (and first by index.html). */
export function activeScene(): Scene {
  const value =
    typeof document === "undefined"
      ? undefined
      : document.documentElement.dataset.scene;
  return isScene(value) ? value : "sunset";
}

/** How lit the world is in each scene, 0-1. Canvases ease toward these. */
export interface Lighting {
  /** Headlight strength, and the share of vehicles with them on. */
  headlights: number;
  litShare: number;
  deckLamps: number;
  planeLights: number;
  stars: number;
  city: number;
}

export const sceneLighting: Record<Scene, Lighting> = {
  night: {
    headlights: 1,
    litShare: 1,
    deckLamps: 1,
    planeLights: 1,
    stars: 1,
    city: 1,
  },
  sunset: {
    headlights: 0.85,
    litShare: 0.65,
    deckLamps: 0.75,
    planeLights: 0.85,
    stars: 0.18,
    city: 0.55,
  },
  sunrise: {
    headlights: 0.6,
    litShare: 0.35,
    deckLamps: 0.3,
    planeLights: 0.7,
    stars: 0.1,
    city: 0.3,
  },
  day: {
    headlights: 0,
    litShare: 0,
    deckLamps: 0,
    planeLights: 0.3,
    stars: 0,
    city: 0,
  },
};

/** Moves `current` toward the active scene's lighting, about two seconds for a full change. */
export function easeLighting(current: Lighting, seconds: number): Lighting {
  const target = sceneLighting[activeScene()];
  const step = Math.min(1, seconds * 1.6);
  const next = { ...current };
  for (const key of Object.keys(target) as (keyof Lighting)[])
    next[key] += (target[key] - current[key]) * step;
  return next;
}
