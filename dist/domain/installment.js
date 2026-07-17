"use strict";
// ============================================================
// Installment plan arithmetic (Decimal-safe)
// ------------------------------------------------------------
// Deterministic, floating-point-free computation of an installment plan
// from a principal, a flat monthly interest rate, and a term. Every value
// is a Prisma.Decimal and every rounding step is explicit — the create
// controller must never do money math with JS `number` / `Math.round`.
//
// Rounding policy
// ---------------
//   - Scale: 2 decimal places (MONEY_SCALE), matching every `Decimal(15, 2)`
//     money column in the schema. That IS the project's currency precision;
//     we round to it rather than to whole units.
//   - Mode: ROUND_HALF_UP — the conventional consumer-finance rounding
//     (0.005 rounds away from zero to 0.01).
//
// Remainder policy
// ----------------
// The model stores a single `monthlyAmount`, but `grandTotal` is the source
// of truth (the wallet is locked for the full grandTotal at create time).
// `monthlyAmount = round(grandTotal / months)` can leave a sub-cent remainder,
// so `monthlyAmount × months` may differ from `grandTotal` by a few cents.
// `finalMonthlyAmount` absorbs that remainder
// (`grandTotal − monthlyAmount × (months − 1)`) so the payment schedule sums to
// `grandTotal` exactly. It is derived from stored fields — no schema change.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONEY_ROUNDING = exports.MONEY_SCALE = void 0;
exports.toMoney = toMoney;
exports.computeFinalMonthlyAmount = computeFinalMonthlyAmount;
exports.computeInstallmentPlan = computeInstallmentPlan;
const client_1 = require("../generated/prisma/client");
/** Currency precision: 2 dp, matching the `Decimal(15, 2)` money columns. */
exports.MONEY_SCALE = 2;
/** Half-up rounding at the money scale (conventional for consumer finance). */
exports.MONEY_ROUNDING = client_1.Prisma.Decimal.ROUND_HALF_UP;
/** Round a Decimal to the currency scale with the fixed money rounding mode. */
function toMoney(value) {
    return value.toDecimalPlaces(exports.MONEY_SCALE, exports.MONEY_ROUNDING);
}
const HUNDRED = new client_1.Prisma.Decimal(100);
/**
 * The last term's payment: whatever cents the rounded `monthlyAmount` left
 * behind, so `monthlyAmount × (months − 1) + finalMonthlyAmount` sums back to
 * `grandTotal` exactly. Single source of truth — both `computeInstallmentPlan`
 * and the payment service call this instead of re-deriving the formula.
 */
function computeFinalMonthlyAmount(grandTotal, monthlyAmount, months) {
    return toMoney(grandTotal.minus(monthlyAmount.times(months - 1)));
}
/**
 * Compute an installment plan entirely in Decimal. Throws on invalid input
 * (non-positive principal, out-of-range rate, non-positive/non-integer term)
 * so the caller fails before any mutation.
 */
function computeInstallmentPlan(input) {
    const { principal, interestRatePctPerMonth, months } = input;
    if (!Number.isInteger(months) || months <= 0) {
        throw new Error('installment months must be a positive integer');
    }
    if (principal.lessThanOrEqualTo(0)) {
        throw new Error('installment principal must be greater than zero');
    }
    if (interestRatePctPerMonth.lessThan(0) || interestRatePctPerMonth.greaterThan(100)) {
        throw new Error('installment interest rate must be between 0 and 100');
    }
    const monthsDec = new client_1.Prisma.Decimal(months);
    const totalAmount = toMoney(principal);
    // principal × (rate / 100) × months — all Decimal, rounded once at the end.
    const totalInterest = toMoney(principal.times(interestRatePctPerMonth).div(HUNDRED).times(monthsDec));
    const grandTotal = toMoney(totalAmount.plus(totalInterest));
    const monthlyAmount = toMoney(grandTotal.div(monthsDec));
    const finalMonthlyAmount = computeFinalMonthlyAmount(grandTotal, monthlyAmount, months);
    return { totalAmount, totalInterest, grandTotal, monthlyAmount, finalMonthlyAmount };
}
//# sourceMappingURL=installment.js.map