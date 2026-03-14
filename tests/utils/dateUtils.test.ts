import { describe, it, expect } from 'vitest';
import { addDaysToIso, localDateToIsoRangeWithTz } from '@/utils/dateUtils';

describe('dateUtils timezone helpers', () => {
  it('localDateToIsoRangeWithTz returns ISO range with offset', () => {
    const result = localDateToIsoRangeWithTz('2026-01-25', 'America/Los_Angeles');

    expect(result).toEqual({
      start: '2026-01-25T00:00:00.000-08:00',
      end: '2026-01-25T23:59:59.999-08:00',
    });
  });

  it('addDaysToIso preserves local date in offset zone', () => {
    const result = addDaysToIso('2026-01-25T23:59:59.999-08:00', 1);

    expect(result).toBe('2026-01-26T23:59:59.999-08:00');
  });
});
