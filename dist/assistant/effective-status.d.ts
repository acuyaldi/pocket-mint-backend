export declare const CLARIFICATION_EXPIRED_TERMINAL_CODE = "expired";
export declare function effectiveDraftStatus<S extends string>(draft: {
    readonly status: S;
    readonly expiresAt: Date;
}, now: Date): S | 'EXPIRED';
/** A past-TTL PENDING clarification is effectively `STALE` + `terminalCode: 'expired'` — exactly what its lazy write stores. */
export declare function effectiveClarificationStatus<S extends string>(request: {
    readonly status: S;
    readonly terminalCode: string | null;
    readonly expiresAt: Date;
}, now: Date): {
    status: S | 'STALE';
    terminalCode: string | null;
};
