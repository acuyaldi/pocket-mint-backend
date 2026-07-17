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
//# sourceMappingURL=reportingTime.d.ts.map