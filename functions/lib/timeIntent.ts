import {
  convertTimeBetweenZones,
  formatCurrentTimeForLocation,
  resolveLocationTimeZone,
} from '../../src/lib/timezone';

export interface CurrentTimeIntent {
  kind: 'current_time';
  targetLocation: string;
  targetTimeZone: string;
}

export interface ConversionIntent {
  kind: 'conversion';
  sourceLocation: string;
  sourceTime: string;
  sourceTimeZone: string;
  targetLocation: string;
  targetTimeZone: string;
}

export type TimeIntent = ConversionIntent | CurrentTimeIntent;

function capitalizeLocation(location: string): string {
  return location
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseCurrentTimeIntent(message: string): CurrentTimeIntent | null {
  const match = message.match(/(?:what time is it in|current time in|time in)\s+(.+?)(?:\s+right now)?\??$/i);

  if (!match?.[1]) {
    return null;
  }

  const targetLocation = capitalizeLocation(match[1]);
  const targetTimeZone = resolveLocationTimeZone(targetLocation);

  if (!targetTimeZone) {
    return null;
  }

  return {
    kind: 'current_time',
    targetLocation,
    targetTimeZone,
  };
}

function parseConversionIntent(message: string): ConversionIntent | null {
  const match = message.match(
    /if\s+(?:it is|it's)\s+(.+?)\s+in\s+(.+?),\s*what time is it in\s+(.+?)\??$/i
  );

  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }

  const sourceTime = match[1].trim();
  const sourceLocation = capitalizeLocation(match[2]);
  const targetLocation = capitalizeLocation(match[3]);
  const sourceTimeZone = resolveLocationTimeZone(sourceLocation);
  const targetTimeZone = resolveLocationTimeZone(targetLocation);

  if (!sourceTimeZone || !targetTimeZone) {
    return null;
  }

  return {
    kind: 'conversion',
    sourceLocation,
    sourceTime,
    sourceTimeZone,
    targetLocation,
    targetTimeZone,
  };
}

export function resolveTimeIntent(message: string): TimeIntent | null {
  return parseConversionIntent(message) ?? parseCurrentTimeIntent(message);
}

export function formatTimeIntentResponse(intent: TimeIntent): string {
  switch (intent.kind) {
    case 'current_time': {
      const result = formatCurrentTimeForLocation(intent.targetLocation);
      return `It is currently ${result.formattedTime} in ${intent.targetLocation} (${result.timeZone}).`;
    }
    case 'conversion': {
      const result = convertTimeBetweenZones(
        intent.sourceTime,
        intent.sourceTimeZone,
        intent.targetTimeZone
      );
      return `${intent.sourceTime} in ${intent.sourceLocation} is ${result.targetTime} in ${intent.targetLocation}.`;
    }
    default: {
      const exhaustiveCheck: never = intent;
      return exhaustiveCheck;
    }
  }
}
