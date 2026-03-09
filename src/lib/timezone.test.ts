import { describe, expect, it } from 'vitest';
import { formatCurrentTimeForLocation, convertTimeBetweenZones } from './timezone';

describe('timezone helpers', () => {
  it('formats the current time for Tokyo', () => {
    const result = formatCurrentTimeForLocation('Tokyo');
    expect(result.timeZone).toBe('Asia/Tokyo');
    expect(result.label).toContain('Tokyo');
  });

  it('converts time between New York and Tokyo', () => {
    const result = convertTimeBetweenZones('2:00 PM', 'America/New_York', 'Asia/Tokyo');
    expect(result.sourceTimeZone).toBe('America/New_York');
    expect(result.targetTimeZone).toBe('Asia/Tokyo');
  });
});
