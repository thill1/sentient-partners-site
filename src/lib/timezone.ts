export const LOCATION_TIME_ZONES: Record<string, string> = {
  tokyo: 'Asia/Tokyo',
  japan: 'Asia/Tokyo',
  madrid: 'Europe/Madrid',
  spain: 'Europe/Madrid',
  'new york': 'America/New_York',
  nyc: 'America/New_York',
  'new york city': 'America/New_York',
};

export interface CurrentTimeResult {
  formattedTime: string;
  label: string;
  timeZone: string;
}

export interface TimeConversionResult {
  sourceTime: string;
  sourceTimeZone: string;
  targetTime: string;
  targetTimeZone: string;
}

function normalizeLocation(location: string): string {
  return location.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function parseTimeZoneOffset(offsetLabel: string): number {
  if (offsetLabel === 'GMT' || offsetLabel === 'UTC') {
    return 0;
  }

  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || '0');
  const minutes = Number(match[3] || '0');

  return sign * (hours * 60 + minutes);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const offsetLabel = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')
    ?.value;

  return parseTimeZoneOffset(offsetLabel || 'GMT');
}

function getCurrentDatePartsInTimeZone(timeZone: string): {
  day: number;
  month: number;
  year: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value || '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value || '0'),
  };
}

function parseClockTime(time: string): { hours: number; minutes: number } {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);

  if (!match) {
    return { hours: 0, minutes: 0 };
  }

  const meridiem = match[3]?.toLowerCase();
  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');

  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

function buildDateForTimeInZone(time: string, timeZone: string): Date {
  const { year, month, day } = getCurrentDatePartsInTimeZone(timeZone);
  const { hours, minutes } = parseClockTime(time);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const firstOffset = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - firstOffset * 60_000);
  const correctedOffset = getTimeZoneOffsetMinutes(firstPass, timeZone);

  if (correctedOffset === firstOffset) {
    return firstPass;
  }

  return new Date(utcGuess.getTime() - correctedOffset * 60_000);
}

export function resolveLocationTimeZone(location: string): string | null {
  const normalizedLocation = normalizeLocation(location);

  return LOCATION_TIME_ZONES[normalizedLocation] ?? null;
}

export function formatCurrentTimeForLocation(location: string): CurrentTimeResult {
  const timeZone = resolveLocationTimeZone(location) ?? 'UTC';
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date());

  return {
    formattedTime,
    label: `Current time in ${location}`,
    timeZone,
  };
}

export function convertTimeBetweenZones(
  time: string,
  sourceTimeZone: string,
  targetTimeZone: string
): TimeConversionResult {
  const sourceDate = buildDateForTimeInZone(time, sourceTimeZone);
  const targetTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: targetTimeZone,
  }).format(sourceDate);

  return {
    sourceTime: time,
    sourceTimeZone,
    targetTime,
    targetTimeZone,
  };
}
