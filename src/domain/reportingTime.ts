export interface CalendarDate { year: number; month: number; day: number }
export interface CalendarMonth { year: number; month: number }
export interface ReportingRange { startInclusive: Date; endExclusive: Date }
export interface ReportingDayRange extends ReportingRange { label: string }

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let value = formatters.get(zone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(zone, value);
  }
  return value;
}

export function assertValidTimeZone(zone: string): string {
  try {
    formatter(zone).format(new Date(0));
    return zone;
  } catch {
    throw new Error(`REPORTING_TIMEZONE must be a valid IANA timezone: ${zone}`);
  }
}

function parts(instant: Date, zone: string) {
  const values: Record<string, number> = {};
  for (const part of formatter(zone).formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

function calendarDateFromInstant(instant: Date, zone: string): CalendarDate {
  const value = parts(instant, zone);
  return { year: value.year, month: value.month, day: value.day };
}

function addCalendarDays(value: CalendarDate, days: number): CalendarDate {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function isRealCalendarDate(value: CalendarDate): boolean {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day));
  return date.getUTCFullYear() === value.year && date.getUTCMonth() + 1 === value.month && date.getUTCDate() === value.day;
}

function localMidnight(value: CalendarDate, zone: string): Date {
  assertValidTimeZone(zone);
  if (!isRealCalendarDate(value)) throw new Error('date must be a valid date');
  const target = Date.UTC(value.year, value.month - 1, value.day);
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const local = parts(new Date(candidate), zone);
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const next = candidate + (target - represented);
    if (next === candidate) break;
    candidate = next;
  }
  const result = new Date(candidate);
  const actual = parts(result, zone);
  if (actual.year !== value.year || actual.month !== value.month || actual.day !== value.day || actual.hour !== 0) {
    throw new Error(`Unable to resolve reporting day in ${zone}`);
  }
  return result;
}

export function formatReportingDate(instant: Date, zone: string): string {
  const value = calendarDateFromInstant(instant, zone);
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

export function getReportingDayRange(value: CalendarDate, zone: string): ReportingRange {
  return { startInclusive: localMidnight(value, zone), endExclusive: localMidnight(addCalendarDays(value, 1), zone) };
}

export function getReportingMonthRange(value: CalendarMonth, zone: string): ReportingRange {
  if (!Number.isInteger(value.year) || !Number.isInteger(value.month) || value.month < 1 || value.month > 12) {
    throw new Error('month must be a valid calendar month');
  }
  const next = value.month === 12 ? { year: value.year + 1, month: 1 } : { year: value.year, month: value.month + 1 };
  return {
    startInclusive: localMidnight({ ...value, day: 1 }, zone),
    endExclusive: localMidnight({ ...next, day: 1 }, zone),
  };
}

export function getPreviousReportingMonthRange(value: CalendarMonth, zone: string): ReportingRange {
  const previous = value.month === 1 ? { year: value.year - 1, month: 12 } : { year: value.year, month: value.month - 1 };
  return getReportingMonthRange(previous, zone);
}

export function getRollingDayRanges(now: Date, days: number, zone: string): ReportingDayRange[] {
  if (!Number.isInteger(days) || days <= 0) throw new Error('days must be a positive integer');
  const today = calendarDateFromInstant(now, zone);
  return Array.from({ length: days }, (_, index) => {
    const date = addCalendarDays(today, index - days + 1);
    return { ...getReportingDayRange(date, zone), label: formatCalendarDate(date) };
  });
}

function formatCalendarDate(value: CalendarDate): string {
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

export function parseBusinessDate(value: string | undefined, zone: string, now = new Date()): Date {
  if (value === undefined) return new Date(now.getTime());
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return localMidnight({ year: Number(dateOnly[1]), month: Number(dateOnly[2]), day: Number(dateOnly[3]) }, zone);
  }
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error('date timestamp must include an explicit offset');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error('date must be a valid date');
  return parsed;
}
