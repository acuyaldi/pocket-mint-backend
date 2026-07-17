"use strict";
// ============================================================
// Dashboard query service
// ------------------------------------------------------------
// Read-only service backing `GET /dashboard/summary`. It owns the ownership-scoped
// dashboard reads and result composition; it has no Express dependency and writes
// no HTTP responses, returning a typed Decimal result (serialization is the
// controller's job). It performs NO mutations and opens NO write transactions.
//
// Reuse: the arithmetic is the shared Decimal-safe `calculateNetWorth`
// (utils/financial) — the exact same product rule the wallet query service uses.
// We inject a narrow read Prisma `Pick` and call that pure helper directly rather
// than chaining to `walletQueryService`: it keeps dependency injection uniform
// with the sibling query services, is a single DB call, tests with a plain wallet
// fake, and avoids any service-to-service coupling. The reuse seam is the pure
// domain helper, not the sibling service.
//
// Dependency injection mirrors the other services: a narrow read-only Prisma
// `Pick` is passed to the factory; the default `dashboardQueryService` binds the
// shared singleton for production.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQueryService = void 0;
exports.createDashboardQueryService = createDashboardQueryService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const financial_1 = require("../utils/financial");
function createDashboardQueryService(db) {
    /**
     * Net-worth dashboard summary for the caller, ownership-scoped. Reads every
     * wallet the user owns (archived included, as before — no `isArchived` filter)
     * selecting only `type` + `balance`, and delegates the Decimal arithmetic to
     * `calculateNetWorth`. Product rule (PD-001): `totalAset` = asset balances,
     * `totalUtang` = |debt balances|, `netWorth` = totalAset − totalUtang (may be
     * negative). A user with no wallets yields Decimal zeros (a valid, zeroed
     * summary). Returns Decimals; the controller serializes at the response boundary.
     */
    async function getSummary(input) {
        const wallets = await db.wallet.findMany({
            where: { userId: input.userId },
            select: { type: true, balance: true },
        });
        return (0, financial_1.calculateNetWorth)(wallets);
    }
    return { getSummary };
}
/** Production instance bound to the shared Prisma singleton. */
exports.dashboardQueryService = createDashboardQueryService(prisma_1.default);
//# sourceMappingURL=dashboard-query.service.js.map