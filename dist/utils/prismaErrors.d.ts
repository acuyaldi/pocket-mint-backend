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
 * Run `fn`, SWALLOWING (never throwing) a P2025 instead of translating it
 * into a thrown error — for call sites where the correct response to a lost
 * TOCTOU race is "there is nothing meaningful left to do here, carry on"
 * rather than failing an otherwise-successful request (Phase 37.4; see
 * docs/assistant-stuck-states.md). `onSwallow` is a required, synchronous
 * side effect (e.g. a structured warn log) so a swallowed race is never
 * silent — it just never fails the caller. Resolves to `undefined` when
 * swallowed. Same safety rules as `withPrismaErrorTranslation`: an
 * already-operational error and any other code/error always propagate
 * unchanged.
 *
 * Deliberately P2025-only (security review, Phase 37.4): P2025 on an
 * update/delete is a "soft" Prisma-level decision (the statement matched
 * zero rows — no Postgres-level error, nothing else is poisoned), so
 * swallowing it can never hide a different failure. P2002 (a genuine unique
 * constraint violation) is excluded on purpose — it means a concurrent
 * write already happened, and silently treating that as "nothing to do"
 * without reading back what that write actually was risks exactly the kind
 * of idempotency/replay bypass `withPrismaErrorTranslation` and each
 * caller's own explicit recovery logic (e.g. conversation.service.ts's
 * `beginTurn`) exist to prevent. A call site that genuinely needs to react
 * to a concurrent insert must use `withPrismaErrorTranslation` (or its own
 * explicit read-and-verify, as `beginTurn` does) instead.
 *
 * Only ever apply this to a SINGLE, idempotent bookkeeping statement whose
 * surrounding transaction this function itself opened and controls (e.g.
 * `db.$transaction(work)`, not a transaction the caller supplied via
 * `options.transaction`) — swallowing inside a caller-managed transaction
 * would let this statement silently no-op while every OTHER write already
 * made in that same ambient transaction still commits, since this helper
 * has no way to signal the caller to roll back. Every current caller in
 * this codebase already follows this (see conversation.service.ts's
 * `finalize`/`finalizeWithoutTool`, which explicitly skip the swallow
 * entirely when `options.transaction` is supplied).
 */
export declare function withPrismaErrorSwallowed<T>(fn: () => Promise<T>, swallow: Partial<Record<'P2025', (err: unknown) => void>>): Promise<T | undefined>;
export {};
