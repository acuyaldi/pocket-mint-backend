"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidTimeZone = assertValidTimeZone;
exports.formatReportingDate = formatReportingDate;
exports.getReportingDayRange = getReportingDayRange;
exports.getReportingMonthRange = getReportingMonthRange;
exports.getPreviousReportingMonthRange = getPreviousReportingMonthRange;
exports.getRollingDayRanges = getRollingDayRanges;
exports.parseBusinessDate = parseBusinessDate;
exports.parseReportingAnchor = parseReportingAnchor;
const formatters = new Map();
function formatter(zone) {
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
function assertValidTimeZone(zone) {
    try {
        formatter(zone).format(new Date(0));
        return zone;
    }
    catch {
        throw new Error(`REPORTING_TIMEZONE must be a valid IANA timezone: ${zone}`);
    }
}
function parts(instant, zone) {
    const values = {};
    for (const part of formatter(zone).formatToParts(instant)) {
        if (part.type !== 'literal')
            values[part.type] = Number(part.value);
    }
    return values;
}
function calendarDateFromInstant(instant, zone) {
    const value = parts(instant, zone);
    return { year: value.year, month: value.month, day: value.day };
}
function addCalendarDays(value, days) {
    const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
function isRealCalendarDate(value) {
    const date = new Date(Date.UTC(value.year, value.month - 1, value.day));
    return date.getUTCFullYear() === value.year && date.getUTCMonth() + 1 === value.month && date.getUTCDate() === value.day;
}
function localMidnight(value, zone) {
    assertValidTimeZone(zone);
    if (!isRealCalendarDate(value))
        throw new Error('date must be a valid date');
    const target = Date.UTC(value.year, value.month - 1, value.day);
    let candidate = target;
    for (let i = 0; i < 4; i++) {
        const local = parts(new Date(candidate), zone);
        const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
        const next = candidate + (target - represented);
        if (next === candidate)
            break;
        candidate = next;
    }
    const result = new Date(candidate);
    const actual = parts(result, zone);
    if (actual.year !== value.year || actual.month !== value.month || actual.day !== value.day || actual.hour !== 0) {
        throw new Error(`Unable to resolve reporting day in ${zone}`);
    }
    return result;
}
function formatReportingDate(instant, zone) {
    const value = calendarDateFromInstant(instant, zone);
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}
function getReportingDayRange(value, zone) {
    return { startInclusive: localMidnight(value, zone), endExclusive: localMidnight(addCalendarDays(value, 1), zone) };
}
function getReportingMonthRange(value, zone) {
    if (!Number.isInteger(value.year) || !Number.isInteger(value.month) || value.month < 1 || value.month > 12) {
        throw new Error('month must be a valid calendar month');
    }
    const next = value.month === 12 ? { year: value.year + 1, month: 1 } : { year: value.year, month: value.month + 1 };
    return {
        startInclusive: localMidnight({ ...value, day: 1 }, zone),
        endExclusive: localMidnight({ ...next, day: 1 }, zone),
    };
}
function getPreviousReportingMonthRange(value, zone) {
    const previous = value.month === 1 ? { year: value.year - 1, month: 12 } : { year: value.year, month: value.month - 1 };
    return getReportingMonthRange(previous, zone);
}
function getRollingDayRanges(now, days, zone) {
    if (!Number.isInteger(days) || days <= 0)
        throw new Error('days must be a positive integer');
    const today = calendarDateFromInstant(now, zone);
    return Array.from({ length: days }, (_, index) => {
        const date = addCalendarDays(today, index - days + 1);
        return { ...getReportingDayRange(date, zone), label: formatCalendarDate(date) };
    });
}
function formatCalendarDate(value) {
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}
function parseBusinessDate(value, zone, now = new Date()) {
    if (value === undefined)
        return new Date(now.getTime());
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
        return localMidnight({ year: Number(dateOnly[1]), month: Number(dateOnly[2]), day: Number(dateOnly[3]) }, zone);
    }
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
        throw new Error('date timestamp must include an explicit offset');
    }
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime()))
        throw new Error('date must be a valid date');
    return parsed;
}
/**
 * Reporting/export-scoped parser for a `YYYY-MM` anchor month (e.g. the
 * Analytics-page export's `anchor` query param). Deliberately separate from
 * `parseBusinessDate`, which is shared by unrelated domains (transactions,
 * recurring, installments, saving goals, the reminder engine) and must not
 * silently accept month-only input.
 */
function parseReportingAnchor(value, zone, now = new Date()) {
    if (value === undefined)
        return new Date(now.getTime());
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match)
        throw new Error('anchor must be in YYYY-MM format');
    const month = Number(match[2]);
    if (month < 1 || month > 12)
        throw new Error('anchor must be a valid calendar month');
    return localMidnight({ year: Number(match[1]), month, day: 1 }, zone);
}
//# sourceMappingURL=reportingTime.js.map