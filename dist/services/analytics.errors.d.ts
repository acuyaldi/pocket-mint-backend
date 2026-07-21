export declare class AnalyticsError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational = true;
    constructor(message: string, statusCode: number, code: string);
}
//# sourceMappingURL=analytics.errors.d.ts.map