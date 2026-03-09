const LOCATION_TIME_ZONES: Record<string, string> = {
  tokyo: 'Asia/Tokyo',
  'new york': 'America/New_York',
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

function resolveTimeZone(location: string): string {
  const normalizedLocation = location.trim().toLowerCase();

  return LOCATION_TIME_ZONES[normalizedLocation] ?? 'UTC';
}

export function formatCurrentTimeForLocation(location: string): CurrentTimeResult {
  const timeZone = resolveTimeZone(location);
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
  return {
    sourceTime: time,
    sourceTimeZone,
    targetTime: time,
    targetTimeZone,
  };
}
