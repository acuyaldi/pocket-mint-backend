export interface CalendarDate {
    year: number;
    month: number;
    day: number;
}
export interface CalendarMonth {
    year: number;
    month: number;
}
export interface ReportingRange {
    startInclusive: Date;
    endExclusive: Date;
}
export interface ReportingDayRange extends ReportingRange {
    label: string;
}
export declare function assertValidTimeZone(zone: string): string;
export declare function formatReportingDate(instant: Date, zone: string): string;
export declare function getReportingDayRange(value: CalendarDate, zone: string): ReportingRange;
export declare function getReportingMonthRange(value: CalendarMonth, zone: string): ReportingRange;
export declare function getPreviousReportingMonthRange(value: CalendarMonth, zone: string): ReportingRange;
export declare function getRollingDayRanges(now: Date, days: number, zone: string): ReportingDayRange[];
export declare function parseBusinessDate(value: string | undefined, zone: string, now?: Date): Date;
/**
 * Reporting/export-scoped parser for a `YYYY-MM` anchor month (e.g. the
 * Analytics-page export's `anchor` query param). Deliberately separate from
 * `parseBusinessDate`, which is shared by unrelated domains (transactions,
 * recurring, installments, saving goals, the reminder engine) and must not
 * silently accept month-only input.
 */
export declare function parseReportingAnchor(value: string | undefined, zone: string, now?: Date): Date;
//# sourceMappingURL=reportingTime.d.ts.map