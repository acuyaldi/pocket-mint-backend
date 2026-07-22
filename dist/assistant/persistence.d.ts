import type { Prisma } from '../generated/prisma/client';
export declare const ASSISTANT_MESSAGE_MAX_LENGTH = 100000;
export declare function normalizeProvidedMessage(value: unknown): string | undefined;
export declare function safeRejectedUserMessage(): string;
export declare function monthlySummaryFallback(input: {
    month: string;
}): string;
export declare function monthlySummaryInputForAudit(input: {
    month: string;
}): Prisma.InputJsonObject;
export declare function monthlySummaryOutputForAudit(output: {
    month: string;
    transactionCount: number;
    topCategories: unknown[];
}): Prisma.InputJsonObject;
//# sourceMappingURL=persistence.d.ts.map