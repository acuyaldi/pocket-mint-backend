// ============================================================
// Analytics v2 period resolution
// ------------------------------------------------------------
// Pure period-shape resolution for the Analytics v2 API, built entirely on
// top of reportingTime.ts's half-open, DST-safe reporting-calendar
// primitives. No I/O, no Express — the analytics services map a validated
// `period` query param (+ optional custom bounds) into a
// ResolvedAnalyticsPeriod here, then query the database with the returned
// range. "Previous period" is always an immediately preceding, equal-duration
// range, so overview comparisons are apples-to-apples regardless of period
// shape (PD-style decision, documented per case below).
// ============================================================

import {
  type CalendarDate,
  type CalendarMonth,
  type ReportingRange,
  formatReportingDate,
  getReportingDayRange,
  getReportingMonthRange,
  getReportingMonthsRange,
  getReportingYearRange,
  shiftCalendarMonth,
} from './reportingTime';

export type AnalyticsPeriod =
  | 'current-month'
  | 'previous-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'current-year'
  | 'custom';

export const ANALYTICS_PERIODS: readonly AnalyticsPeriod[] = [
  'current-month',
  'previous-month',
  'last-3-months',
  'last-6-months',
  'current-year',
  'custom',
];

/** Custom ranges beyond this many days are rejected (400) — an unbounded scan is not a "period". */
export const MAX_CUSTOM_RANGE_DAYS = 400;

export interface AnalyticsPeriodInput {
  period?: string;
  /** `YYYY-MM-DD`, required (with `endDate`) when `period === 'custom'`. Inclusive. */
  startDate?: string;
  /** `YYYY-MM-DD`, required (with `startDate`) when `period === 'custom'`. Inclusive. */
  endDate?: string;
}

export interface ResolvedAnalyticsPeriod {
  period: AnalyticsPeriod;
  range: ReportingRange;
  /** Immediately preceding range of equal duration — the comparison baseline. */
  previousRange: ReportingRange;
}

function currentReportingMonth(now: Date, zone: string): CalendarMonth {
  const [year, month] = formatReportingDate(now, zone).split('-').map(Number);
  return { year, month };
}

/** Parse a strict `YYYY-MM-DD` calendar date. Real-date validity is checked by `getReportingDayRange`. */
function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('date must be in YYYY-MM-DD format');
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** The immediately preceding range of equal wall-clock duration (custom ranges only — arbitrary bounds, no calendar meaning). */
function equalLengthPreviousRange(range: ReportingRange): ReportingRange {
  const durationMs = range.endExclusive.getTime() - range.startInclusive.getTime();
  return { startInclusive: new Date(range.startInclusive.getTime() - durationMs), endExclusive: range.startInclusive };
}

/**
 * Resolve a `period` query param (+ optional custom bounds) into a half-open
 * reporting range and its comparison baseline. Throws a plain `Error` (safe,
 * user-facing message) on an unknown period, a missing/malformed custom bound,
 * an inverted custom range, or a custom range exceeding `MAX_CUSTOM_RANGE_DAYS`
 * — callers (analytics services) translate this into a typed 400
 * `AnalyticsError`; this module stays free of HTTP/service concerns.
 */
export function resolveAnalyticsPeriod(input: AnalyticsPeriodInput, zone: string, now = new Date()): ResolvedAnalyticsPeriod {
  const period = (input.period ?? 'current-month') as AnalyticsPeriod;
  if (!ANALYTICS_PERIODS.includes(period)) {
    throw new Error(`Invalid period. Allowed: ${ANALYTICS_PERIODS.join(', ')}`);
  }

  const current = currentReportingMonth(now, zone);

  switch (period) {
    case 'current-month':
      return {
        period,
        range: getReportingMonthRange(current, zone),
        previousRange: getReportingMonthRange(shiftCalendarMonth(current, -1), zone),
      };

    case 'previous-month':
      return {
        period,
        range: getReportingMonthRange(shiftCalendarMonth(current, -1), zone),
        previousRange: getReportingMonthRange(shiftCalendarMonth(current, -2), zone),
      };

    case 'last-3-months':
      return {
        period,
        range: getReportingMonthsRange(current, 3, zone),
        previousRange: getReportingMonthsRange(shiftCalendarMonth(current, -3), 3, zone),
      };

    case 'last-6-months':
      return {
        period,
        range: getReportingMonthsRange(current, 6, zone),
        previousRange: getReportingMonthsRange(shiftCalendarMonth(current, -6), 6, zone),
      };

    case 'current-year':
      return {
        period,
        range: getReportingYearRange(current.year, zone),
        previousRange: getReportingYearRange(current.year - 1, zone),
      };

    case 'custom': {
      if (!input.startDate || !input.endDate) {
        throw new Error('startDate and endDate are required for period=custom');
      }
      const startDay = getReportingDayRange(parseCalendarDate(input.startDate), zone);
      const endDay = getReportingDayRange(parseCalendarDate(input.endDate), zone);
      if (startDay.startInclusive.getTime() > endDay.startInclusive.getTime()) {
        throw new Error('startDate must not be after endDate');
      }
      const range: ReportingRange = { startInclusive: startDay.startInclusive, endExclusive: endDay.endExclusive };
      const spanDays = Math.round((range.endExclusive.getTime() - range.startInclusive.getTime()) / 86_400_000);
      if (spanDays > MAX_CUSTOM_RANGE_DAYS) {
        throw new Error(`custom range must not exceed ${MAX_CUSTOM_RANGE_DAYS} days`);
      }
      return { period, range, previousRange: equalLengthPreviousRange(range) };
    }
  }
}

// ---------------- trend bucketing ----------------

export type TrendGranularity = 'day' | 'month';

/**
 * <=62 days (~2 months) buckets daily; longer periods bucket monthly. A daily
 * bucket over e.g. 6 months (~180 points) is unreadable in a trend chart and
 * expensive to zero-fill for little UX value, so we switch to monthly once a
 * period is longer than about two months.
 */
const DAILY_BUCKET_MAX_DAYS = 62;

export function resolveTrendGranularity(range: ReportingRange): TrendGranularity {
  const days = Math.round((range.endExclusive.getTime() - range.startInclusive.getTime()) / 86_400_000);
  return days <= DAILY_BUCKET_MAX_DAYS ? 'day' : 'month';
}

export interface TrendBucket {
  start: Date;
  end: Date;
}

function toCalendarDate(instant: Date, zone: string): CalendarDate {
  const [year, month, day] = formatReportingDate(instant, zone).split('-').map(Number);
  return { year, month, day };
}

function toCalendarMonth(instant: Date, zone: string): CalendarMonth {
  const { year, month } = toCalendarDate(instant, zone);
  return { year, month };
}

/** Clip a bucket to the requested range so a boundary bucket's `start`/`end` never falls outside it (matters for custom ranges starting/ending mid-month). */
function clip(bucket: TrendBucket, range: ReportingRange): TrendBucket {
  return {
    start: bucket.start.getTime() < range.startInclusive.getTime() ? range.startInclusive : bucket.start,
    end: bucket.end.getTime() > range.endExclusive.getTime() ? range.endExclusive : bucket.end,
  };
}

/**
 * Generate contiguous, zero-gap buckets covering `range` at the given
 * granularity — the caller (analytics-trends.service.ts) fills each bucket's
 * income/expense from a single query, so every bucket must exist up front
 * (a period with no transactions still returns a full zero-filled series).
 */
export function generateTrendBuckets(range: ReportingRange, granularity: TrendGranularity, zone: string): TrendBucket[] {
  const buckets: TrendBucket[] = [];
  if (range.startInclusive.getTime() >= range.endExclusive.getTime()) return buckets;

  if (granularity === 'day') {
    let cursor = toCalendarDate(range.startInclusive, zone);
    for (let guard = 0; guard < 10_000; guard++) {
      const dayRange = getReportingDayRange(cursor, zone);
      if (dayRange.startInclusive.getTime() >= range.endExclusive.getTime()) break;
      buckets.push(clip({ start: dayRange.startInclusive, end: dayRange.endExclusive }, range));
      cursor = toCalendarDate(dayRange.endExclusive, zone);
    }
  } else {
    let cursor = toCalendarMonth(range.startInclusive, zone);
    for (let guard = 0; guard < 1_000; guard++) {
      const monthRange = getReportingMonthRange(cursor, zone);
      if (monthRange.startInclusive.getTime() >= range.endExclusive.getTime()) break;
      buckets.push(clip({ start: monthRange.startInclusive, end: monthRange.endExclusive }, range));
      cursor = toCalendarMonth(monthRange.endExclusive, zone);
    }
  }
  return buckets;
}
