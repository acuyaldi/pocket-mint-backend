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
//# sourceMappingURL=prismaErrors.js.map