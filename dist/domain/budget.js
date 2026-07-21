"use strict";
// ============================================================
// Budget usage calculation (PD-009, Approved — Phase A domain foundation)
// ------------------------------------------------------------
// Pure, Decimal-exact calculation of one Budget's usage for a resolved
// reporting period. No Prisma, no I/O — callers (budget-query.service.ts)
// supply the already-aggregated `spent` figure; this module only derives
// remaining, percentUsed, and status from it, so the formulas live in exactly
// one place (budgeting-calculation-spec.md §§3-5) and no consumer can
// reimplement them independently.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeBudgetUsage = computeBudgetUsage;
const client_1 = require("../generated/prisma/client");
const HUNDRED = new client_1.Prisma.Decimal(100);
const APPROACHING_THRESHOLD = new client_1.Prisma.Decimal(75);
/**
 * Derive a Budget's usage from its definition (`amount`, `isArchived`) and its
 * already-aggregated `spent` figure for one reporting period. Status is
 * evaluated in the order ARCHIVED, EXCEEDED (>100), REACHED (==100),
 * APPROACHING (>=75), else HEALTHY (PD-009 Decision E) — never rounded before
 * comparison, so a spend of 749,999/1,000,000 never rounds up to a false
 * APPROACHING boundary.
 */
function computeBudgetUsage(amount, spent, isArchived) {
    const remaining = amount.minus(spent);
    if (isArchived) {
        return {
            spent,
            remaining,
            percentUsed: amount.greaterThan(0) ? spent.dividedBy(amount).times(HUNDRED) : null,
            status: 'ARCHIVED',
        };
    }
    // Defensive only: Budget creation/update rejects amount <= 0 (PD-009 Data
    // Model), so this branch should be unreachable in practice. A spend against
    // a zero-or-negative limit is treated as EXCEEDED once any spend exists,
    // HEALTHY at zero spend, rather than dividing by zero.
    if (!amount.greaterThan(0)) {
        return { spent, remaining, percentUsed: null, status: spent.greaterThan(0) ? 'EXCEEDED' : 'HEALTHY' };
    }
    const percentUsed = spent.dividedBy(amount).times(HUNDRED);
    let status;
    if (percentUsed.greaterThan(HUNDRED))
        status = 'EXCEEDED';
    else if (percentUsed.equals(HUNDRED))
        status = 'REACHED';
    else if (percentUsed.greaterThanOrEqualTo(APPROACHING_THRESHOLD))
        status = 'APPROACHING';
    else
        status = 'HEALTHY';
    return { spent, remaining, percentUsed, status };
}
//# sourceMappingURL=budget.js.map