/** Above this UNSPECIFIED share, per-field clarification rates are not trustworthy. */
export declare const UNSPECIFIED_SHARE_WARNING = 0.3;
export interface CaptureEventRow {
    readonly occurredAt: Date;
    readonly eventType: string;
    readonly source: string;
    readonly phaseMarker: string;
    readonly correlationKey: string;
    readonly fields: readonly string[];
    readonly origin: string | null;
}
export declare const INSUFFICIENT_DATA = "INSUFFICIENT DATA";
/** A ratio, or INSUFFICIENT_DATA when its denominator is below minSamples. */
export type Rate = {
    readonly value: number | typeof INSUFFICIENT_DATA;
    readonly numerator: number;
    readonly denominator: number;
};
export interface CaptureReportGroup {
    readonly source: string;
    readonly phaseMarker: string;
    /** Messages that entered capture: a direct draft or a first-step clarification. */
    readonly captureStarts: number;
    /** Metric 1 — clarification per field, rate over capture starts. */
    readonly clarificationByField: Record<string, Rate>;
    readonly clarificationsRequested: number;
    /** CLARIFICATION_REQUESTED with no RESOLVED/CANCELLED, older than the clarification TTL (Phase 38.1). */
    readonly clarificationsAbandonedPastTtl: number;
    /** UNSPECIFIED over all clarification field tags (Phase 38.1). */
    readonly unspecifiedFieldShare: Rate;
    readonly draftsCreated: number;
    /** Metric 4 — direct draft vs after clarification. */
    readonly directDraftRate: Rate;
    readonly outcomes: {
        readonly confirmed: number;
        readonly cancelled: number;
        readonly expired: number;
        readonly abandonedPastTtl: number;
        readonly failed: number;
        readonly open: number;
    };
    /** Metric 3 — cancelled over drafts created. */
    readonly cancelRate: Rate;
    /** Metric 2 — drafts edited before confirm, over drafts confirmed (edits are only recorded at confirm). */
    readonly editRate: Rate;
    readonly editedByField: Record<string, number>;
}
export interface CaptureReportOptions {
    readonly from: Date;
    readonly to: Date;
    readonly now: Date;
    readonly minSamples: number;
}
export declare function computeCaptureReport(rows: readonly CaptureEventRow[], options: CaptureReportOptions): CaptureReportGroup[];
