export declare class BudgetError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational = true;
    constructor(message: string, statusCode: number, code: string);
}
//# sourceMappingURL=budget.errors.d.ts.map