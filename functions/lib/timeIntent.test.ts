import { describe, expect, it } from 'vitest';
import { resolveTimeIntent } from './timeIntent';

describe('resolveTimeIntent', () => {
  it('detects a current-time request for Tokyo', () => {
    const result = resolveTimeIntent('What time is it in Tokyo right now?');
    expect(result?.kind).toBe('current_time');
    expect(result?.targetTimeZone).toBe('Asia/Tokyo');
  });

  it('detects a conversion request', () => {
    const result = resolveTimeIntent('If it is 3 PM in Tokyo, what time is it in Madrid?');
    expect(result?.kind).toBe('conversion');
  });
});
