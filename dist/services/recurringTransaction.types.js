"use strict";
// ============================================================
// Recurring transaction template service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the recurring transaction template service.
// The controller maps HTTP requests into these; the service returns typed
// domain records. Mirrors transaction.types.ts's shape and narrow-Prisma-slice
// DI pattern.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECURRING_TRANSACTION_INCLUDE = void 0;
exports.RECURRING_TRANSACTION_INCLUDE = {
    wallet: { select: { id: true, name: true, type: true } },
    category: { select: { id: true, name: true, type: true } },
};
//# sourceMappingURL=recurringTransaction.types.js.map