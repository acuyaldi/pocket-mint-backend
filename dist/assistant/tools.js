"use strict";
// ============================================================
// Assistant Core — registered tool definitions
// ------------------------------------------------------------
// Each export is a ToolContract that can be registered with the
// ToolRegistry. These are provider-neutral definitions — the
// provider adapter generates vendor-specific schemas from them.
//
// Phase 21.1 defines only the contract shapes; execution handlers
// are wired in Phase 21.2.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlySpendingSummary = void 0;
const errors_1 = require("./errors");
// ---- Validation helpers ----------------------------------------------------
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
function validateMonthInput(input) {
    if (typeof input !== 'object' || input === null) {
        throw errors_1.AssistantError.invalidInput('analytics.monthly-spending-summary', 'Input must be a non-null object');
    }
    const obj = input;
    if (typeof obj.month !== 'string' || !MONTH_RE.test(obj.month)) {
        throw errors_1.AssistantError.invalidInput('analytics.monthly-spending-summary', 'month must be a string in YYYY-MM format (e.g. "2026-01")');
    }
    return { month: obj.month };
}
function validateMonthlySpendingOutput(output) {
    // TypeScript types alone don't validate model-produced input at runtime
    // (§23 of the ADR). This is a minimal structural check; it is compatible
    // with adopting JSON Schema or Zod later without changing the contract.
    if (typeof output !== 'object' || output === null) {
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'Output must be a non-null object');
    }
    const o = output;
    if (typeof o.month !== 'string')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'month must be a string');
    if (typeof o.totalIncome !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalIncome must be a number');
    if (!Number.isFinite(o.totalIncome))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalIncome must be a finite number');
    if (typeof o.totalExpense !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalExpense must be a number');
    if (!Number.isFinite(o.totalExpense))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalExpense must be a finite number');
    if (typeof o.netSavings !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'netSavings must be a number');
    if (!Number.isFinite(o.netSavings))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'netSavings must be a finite number');
    if (typeof o.transactionCount !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'transactionCount must be a number');
    if (!Number.isInteger(o.transactionCount) || o.transactionCount < 0)
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'transactionCount must be a non-negative integer');
    if (!Array.isArray(o.topCategories))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'topCategories must be an array');
    return o;
}
// ---- Tool contract ---------------------------------------------------------
/**
 * First read-only vertical-slice tool (§7 of the Phase 21.1 brief):
 *
 * Returns a structured summary of the authenticated user's spending
 * for a requested Jakarta calendar month.
 *
 * - Risk: LOW (read-only analytics)
 * - Confirmation: NONE
 * - Idempotency: NOT_REQUIRED (read is naturally idempotent)
 * - Timeout: 10 seconds
 */
exports.monthlySpendingSummary = {
    id: 'analytics.monthly-spending-summary',
    description: "Return a structured summary of the user's spending for a Jakarta calendar month (YYYY-MM). Includes total income, total expense, net savings, transaction count, and the top expense categories with percentages.",
    capability: 'analytics.read',
    riskLevel: 'LOW',
    confirmationPolicy: 'NONE',
    idempotencyPolicy: 'NOT_REQUIRED',
    timeoutMs: 10000,
    enabled: true,
    validateInput: validateMonthInput,
    validateOutput: validateMonthlySpendingOutput,
};
//# sourceMappingURL=tools.js.map