"use strict";
// ============================================================
// Prisma known-error → domain-error translation (Phase 37.2)
// ------------------------------------------------------------
// Several services independently re-implement the same three-line try/catch
// to translate a Prisma TOCTOU race — P2025 ("record to update/delete not
// found", thrown when a row a prior `findFirst` saw has since been deleted
// by a concurrent request) or a losing concurrent insert (P2002, unique
// constraint) — into that domain's own typed operational error (see
// forwardError.ts: isOperational/statusCode/code), instead of letting the
// raw Prisma error reach the client as an unexpected 500. wallet.service.ts
// and walletAlias.service.ts both hand-wrote this pattern; this file is that
// pattern extracted once so new call sites don't re-copy it by hand.
//
// Duck-typed on `.code`, matching every existing call site in this repo
// (e.g. wallet.service.ts), rather than
// `instanceof Prisma.PrismaClientKnownRequestError`.
//
// Deliberately does NOT introduce a new error class or hierarchy — the
// caller supplies a factory that constructs its own existing domain error.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPrismaErrorTranslation = withPrismaErrorTranslation;
exports.withPrismaErrorSwallowed = withPrismaErrorSwallowed;
function prismaCodeOf(err) {
    return typeof err === 'object' && err !== null ? err.code : undefined;
}
/**
 * Run `fn`, translating specific Prisma error codes into the caller's own
 * typed operational error. An error that is already operational (thrown by
 * a guard earlier in the same call) passes through unchanged; so does any
 * Prisma error code absent from `mapping`, and any non-Prisma error. This
 * never swallows an error it wasn't explicitly told to translate.
 */
async function withPrismaErrorTranslation(fn, mapping) {
    try {
        return await fn();
    }
    catch (err) {
        if (err instanceof Error && err.isOperational === true) {
            throw err;
        }
        const code = prismaCodeOf(err);
        if (code === 'P2025' || code === 'P2002') {
            const factory = mapping[code];
            if (factory)
                throw factory();
        }
        throw err;
    }
}
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
async function withPrismaErrorSwallowed(fn, swallow) {
    try {
        return await fn();
    }
    catch (err) {
        if (err instanceof Error && err.isOperational === true) {
            throw err;
        }
        if (prismaCodeOf(err) === 'P2025' && swallow.P2025) {
            swallow.P2025(err);
            return undefined;
        }
        throw err;
    }
}
//# sourceMappingURL=prismaErrors.js.map