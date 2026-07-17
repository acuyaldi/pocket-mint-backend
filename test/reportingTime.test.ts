import { describe, expect, it } from 'vitest';
import {
  assertValidTimeZone,
  formatReportingDate,
  getReportingDayRange,
  getReportingMonthRange,
  getRollingDayRanges,
  parseBusinessDate,
} from '../src/domain/reportingTime';

describe('reporting time', () => {
  it('maps an Asia/Jakarta reporting day to a half-open UTC range', () => {
    const range = getReportingDayRange({ year: 2026, month: 7, day: 11 }, 'Asia/Jakarta');
    expect(range.startInclusive.toISOString()).toBe('2026-07-10T17:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-07-11T17:00:00.000Z');
  });

  it('handles leap-year month and year rollover', () => {
    expect(getReportingMonthRange({ year: 2024, month: 2 }, 'UTC').endExclusive.toISOString())
      .toBe('2024-03-01T00:00:00.000Z');
    expect(getReportingMonthRange({ year: 2026, month: 12 }, 'UTC').endExclusive.toISOString())
      .toBe('2027-01-01T00:00:00.000Z');
  });

  it('is DST-safe for spring-forward and fall-back days', () => {
    const spring = getReportingDayRange({ year: 2026, month: 3, day: 8 }, 'America/New_York');
    const fall = getReportingDayRange({ year: 2026, month: 11, day: 1 }, 'America/New_York');
    expect(spring.endExclusive.getTime() - spring.startInclusive.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(fall.endExclusive.getTime() - fall.startInclusive.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it('rejects invalid IANA timezones', () => {
    expect(() => assertValidTimeZone('Mars/Olympus')).toThrow(/REPORTING_TIMEZONE/);
  });

  it('builds seven adjacent reporting days oldest first including today', () => {
    const days = getRollingDayRanges(new Date('2026-07-11T10:00:00.000Z'), 7, 'Asia/Jakarta');
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.label)).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08',
      '2026-07-09', '2026-07-10', '2026-07-11',
    ]);
    expect(days[0].endExclusive).toEqual(days[1].startInclusive);
  });

  it('parses date-only input as reporting-local midnight', () => {
    expect(parseBusinessDate('2026-07-11', 'Asia/Jakarta').toISOString())
      .toBe('2026-07-10T17:00:00.000Z');
  });

  it('preserves a full timestamp instant and rejects ambiguous or invalid dates', () => {
    expect(parseBusinessDate('2026-07-11T00:00:00+07:00', 'Asia/Jakarta').toISOString())
      .toBe('2026-07-10T17:00:00.000Z');
    expect(() => parseBusinessDate('2026-02-30', 'Asia/Jakarta')).toThrow(/valid date/);
    expect(() => parseBusinessDate('2026-07-11T10:00:00', 'Asia/Jakarta')).toThrow(/offset/);
  });

  it('formats labels in the reporting timezone rather than UTC', () => {
    expect(formatReportingDate(new Date('2026-07-10T18:00:00Z'), 'Asia/Jakarta')).toBe('2026-07-11');
  });
});
