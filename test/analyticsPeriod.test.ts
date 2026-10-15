import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_PERIODS,
  MAX_CUSTOM_RANGE_DAYS,
  generateTrendBuckets,
  resolveAnalyticsPeriod,
  resolveTrendGranularity,
} from '../src/domain/analyticsPeriod';

const ZONE = 'Asia/Jakarta';
const NOW = new Date('2026-07-15T10:00:00.000Z'); // 2026-07-15 17:00 Jakarta

describe('resolveAnalyticsPeriod', () => {
  it('defaults to current-month when period is omitted', () => {
    const resolved = resolveAnalyticsPeriod({}, ZONE, NOW);
    expect(resolved.period).toBe('current-month');
    expect(resolved.range.startInclusive.toISOString()).toBe('2026-06-30T17:00:00.000Z');
    expect(resolved.range.endExclusive.toISOString()).toBe('2026-07-31T17:00:00.000Z');
  });

  it('rejects an unknown period', () => {
    expect(() => resolveAnalyticsPeriod({ period: 'last-week' }, ZONE, NOW)).toThrow(/Invalid period/);
  });

  it('resolves current-month with previous-month as its comparison baseline', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'current-month' }, ZONE, NOW);
    expect(resolved.previousRange.startInclusive.toISOString()).toBe('2026-05-31T17:00:00.000Z');
    expect(resolved.previousRange.endExclusive.toISOString()).toBe('2026-06-30T17:00:00.000Z');
    expect(resolved.previousRange.endExclusive).toEqual(new Date('2026-06-30T17:00:00.000Z'));
    // Never overlaps the current range.
    expect(resolved.previousRange.endExclusive.getTime()).toBe(resolved.range.startInclusive.getTime());
  });

  it('resolves previous-month with two-months-back as its comparison baseline', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'previous-month' }, ZONE, NOW);
    expect(resolved.range.startInclusive.toISOString()).toBe('2026-05-31T17:00:00.000Z');
    expect(resolved.range.endExclusive.toISOString()).toBe('2026-06-30T17:00:00.000Z');
    expect(resolved.previousRange.startInclusive.toISOString()).toBe('2026-04-30T17:00:00.000Z');
    expect(resolved.previousRange.endExclusive.toISOString()).toBe('2026-05-31T17:00:00.000Z');
  });

  it('resolves last-3-months as May-Jul inclusive, previous as Feb-Apr', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'last-3-months' }, ZONE, NOW);
    expect(resolved.range.startInclusive.toISOString()).toBe('2026-04-30T17:00:00.000Z'); // May 1 Jakarta
    expect(resolved.range.endExclusive.toISOString()).toBe('2026-07-31T17:00:00.000Z'); // end of Jul
    expect(resolved.previousRange.startInclusive.toISOString()).toBe('2026-01-31T17:00:00.000Z'); // Feb 1 Jakarta
    expect(resolved.previousRange.endExclusive.toISOString()).toBe('2026-04-30T17:00:00.000Z'); // end of Apr == start of May
  });

  it('resolves last-6-months spanning a year boundary correctly', () => {
    const jan = new Date('2026-01-15T10:00:00.000Z');
    const resolved = resolveAnalyticsPeriod({ period: 'last-6-months' }, ZONE, jan);
    // Aug 2025 - Jan 2026
    expect(resolved.range.startInclusive.toISOString()).toBe('2025-07-31T17:00:00.000Z');
    expect(resolved.range.endExclusive.toISOString()).toBe('2026-01-31T17:00:00.000Z');
  });

  it('resolves current-year and previous-year', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'current-year' }, ZONE, NOW);
    expect(resolved.range.startInclusive.toISOString()).toBe('2025-12-31T17:00:00.000Z'); // Jan 1 2026 Jakarta
    expect(resolved.range.endExclusive.toISOString()).toBe('2026-12-31T17:00:00.000Z'); // Jan 1 2027 Jakarta
    expect(resolved.previousRange.startInclusive.toISOString()).toBe('2024-12-31T17:00:00.000Z');
    expect(resolved.previousRange.endExclusive.toISOString()).toBe('2025-12-31T17:00:00.000Z');
  });

  describe('custom', () => {
    it('resolves an inclusive start/end date range, half-open at the end boundary', () => {
      const resolved = resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-07-01', endDate: '2026-07-10' }, ZONE, NOW);
      expect(resolved.range.startInclusive.toISOString()).toBe('2026-06-30T17:00:00.000Z');
      expect(resolved.range.endExclusive.toISOString()).toBe('2026-07-10T17:00:00.000Z'); // start of Jul 11 Jakarta
    });

    it('computes an equal-duration immediately preceding comparison range', () => {
      const resolved = resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-07-01', endDate: '2026-07-10' }, ZONE, NOW);
      const durationMs = resolved.range.endExclusive.getTime() - resolved.range.startInclusive.getTime();
      const prevDuration = resolved.previousRange.endExclusive.getTime() - resolved.previousRange.startInclusive.getTime();
      expect(prevDuration).toBe(durationMs);
      expect(resolved.previousRange.endExclusive.getTime()).toBe(resolved.range.startInclusive.getTime());
    });

    it('rejects a missing startDate or endDate', () => {
      expect(() => resolveAnalyticsPeriod({ period: 'custom', endDate: '2026-07-10' }, ZONE, NOW)).toThrow(/required/);
      expect(() => resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-07-01' }, ZONE, NOW)).toThrow(/required/);
    });

    it('rejects startDate after endDate', () => {
      expect(() =>
        resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-07-10', endDate: '2026-07-01' }, ZONE, NOW)
      ).toThrow(/startDate must not be after endDate/);
    });

    it('accepts startDate === endDate (a single-day range)', () => {
      const resolved = resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-07-10', endDate: '2026-07-10' }, ZONE, NOW);
      expect(resolved.range.endExclusive.getTime() - resolved.range.startInclusive.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('rejects a malformed date', () => {
      expect(() => resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-07', endDate: '2026-07-10' }, ZONE, NOW)).toThrow(
        /YYYY-MM-DD/
      );
      expect(() => resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-02-30', endDate: '2026-07-10' }, ZONE, NOW)).toThrow();
    });

    it(`rejects a custom range exceeding ${MAX_CUSTOM_RANGE_DAYS} days`, () => {
      expect(() =>
        resolveAnalyticsPeriod({ period: 'custom', startDate: '2020-01-01', endDate: '2026-07-10' }, ZONE, NOW)
      ).toThrow(new RegExp(`${MAX_CUSTOM_RANGE_DAYS} days`));
    });
  });

  it('exposes every documented period key', () => {
    expect(ANALYTICS_PERIODS).toEqual(['current-month', 'previous-month', 'last-3-months', 'last-6-months', 'current-year', 'custom']);
  });
});

describe('resolveTrendGranularity', () => {
  it('buckets daily for a period <= 62 days', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'current-month' }, ZONE, NOW); // 31 days
    expect(resolveTrendGranularity(resolved.range)).toBe('day');
  });

  it('buckets monthly for a period > 62 days', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'last-3-months' }, ZONE, NOW);
    expect(resolveTrendGranularity(resolved.range)).toBe('month');
  });
});

describe('generateTrendBuckets', () => {
  it('generates one contiguous, gap-free daily bucket per day for a full month', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'current-month' }, ZONE, NOW);
    const buckets = generateTrendBuckets(resolved.range, 'day', ZONE);
    expect(buckets).toHaveLength(31);
    expect(buckets[0].start).toEqual(resolved.range.startInclusive);
    expect(buckets[buckets.length - 1].end).toEqual(resolved.range.endExclusive);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].start.getTime()).toBe(buckets[i - 1].end.getTime()); // no gaps, no overlaps
    }
  });

  it('generates one contiguous monthly bucket per month for last-3-months', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'last-3-months' }, ZONE, NOW);
    const buckets = generateTrendBuckets(resolved.range, 'month', ZONE);
    expect(buckets).toHaveLength(3);
    expect(buckets[0].start).toEqual(resolved.range.startInclusive);
    expect(buckets[buckets.length - 1].end).toEqual(resolved.range.endExclusive);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].start.getTime()).toBe(buckets[i - 1].end.getTime());
    }
  });

  it('clips the first/last bucket to a custom range starting/ending mid-month', () => {
    const resolved = resolveAnalyticsPeriod({ period: 'custom', startDate: '2026-01-15', endDate: '2026-04-10' }, ZONE, NOW);
    const buckets = generateTrendBuckets(resolved.range, 'month', ZONE);
    expect(buckets[0].start).toEqual(resolved.range.startInclusive);
    expect(buckets[buckets.length - 1].end).toEqual(resolved.range.endExclusive);
  });

  it('returns an empty array for a zero-length range', () => {
    const range = { startInclusive: new Date('2026-01-01T00:00:00Z'), endExclusive: new Date('2026-01-01T00:00:00Z') };
    expect(generateTrendBuckets(range, 'day', ZONE)).toEqual([]);
  });
});
