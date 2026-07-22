export declare class RuleError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational = true;
    constructor(message: string, statusCode: number, code: string);
}
//# sourceMappingURL=rule.errors.d.ts.map