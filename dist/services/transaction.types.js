"use strict";
// ============================================================
// Transaction service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the transaction service. The controller maps
// HTTP requests into these; the service returns typed domain records. No `any`,
// no raw request objects, and a narrow Prisma dependency so tests can inject a
// fake without a DI framework or a repository layer.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSACTION_INCLUDE = void 0;
/**
 * Relations every mutation returns — the shape the controller's existing
 * serializer already expects. Kept here so the service and its result type
 * stay in sync.
 */
exports.TRANSACTION_INCLUDE = {
    wallet: { select: { id: true, name: true, type: true } },
    category: { select: { id: true, name: true, type: true } },
};
//# sourceMappingURL=transaction.types.js.map