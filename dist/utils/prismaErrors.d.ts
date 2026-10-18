type TranslatablePrismaCode = 'P2025' | 'P2002';
/**
 * Run `fn`, translating specific Prisma error codes into the caller's own
 * typed operational error. An error that is already operational (thrown by
 * a guard earlier in the same call) passes through unchanged; so does any
 * Prisma error code absent from `mapping`, and any non-Prisma error. This
 * never swallows an error it wasn't explicitly told to translate.
 */
export declare function withPrismaErrorTranslation<T>(fn: () => Promise<T>, mapping: Partial<Record<TranslatablePrismaCode, () => Error>>): Promise<T>;
export {};
