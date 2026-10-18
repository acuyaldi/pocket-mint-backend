type TranslatablePrismaCode = 'P2025' | 'P2002';
/**
 * Run `fn`, translating specific Prisma error codes into the caller's own
 * typed operational error. An error that is already operational (thrown by
 * a guard earlier in the same call) passes through unchanged; so does any
 * Prisma error code absent from `mapping`, and any non-Prisma error. This
 * never swallows an error it wasn't explicitly told to translate.
 */
export declare function withPrismaErrorTranslation<T>(fn: () => Promise<T>, mapping: Partial<Record<TranslatablePrismaCode, () => Error>>): Promise<T>;
/**
 * Run `fn`, SWALLOWING (never throwing) a specific Prisma error code instead
 * of translating it into a thrown error — for call sites where the correct
 * response to a lost TOCTOU race is "there is nothing meaningful left to do
 * here, carry on" rather than failing an otherwise-successful request
 * (Phase 37.4; see docs/assistant-stuck-states.md). `onSwallow` is a
 * required, synchronous side effect (e.g. a structured warn log) so a
 * swallowed race is never silent — it just never fails the caller. Resolves
 * to `undefined` when swallowed. Same safety rules as
 * `withPrismaErrorTranslation`: an already-operational error and any
 * unmapped code/error always propagate unchanged.
 */
export declare function withPrismaErrorSwallowed<T>(fn: () => Promise<T>, swallow: Partial<Record<TranslatablePrismaCode, (err: unknown) => void>>): Promise<T | undefined>;
export {};
