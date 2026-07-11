import { Prisma } from '../generated/prisma/client';
/** Currency precision: 2 dp, matching the `Decimal(15, 2)` money columns. */
export declare const MONEY_SCALE = 2;
/** Half-up rounding at the money scale (conventional for consumer finance). */
export declare const MONEY_ROUNDING: 4;
/** Round a Decimal to the currency scale with the fixed money rounding mode. */
export declare function toMoney(value: Prisma.Decimal): Prisma.Decimal;
export interface InstallmentPlanInput {
    /** Principal being financed (the transaction amount). Must be > 0. */
    principal: Prisma.Decimal;
    /** Flat interest, percent per month (e.g. 2.95 = 2.95%/month). 0–100. */
    interestRatePctPerMonth: Prisma.Decimal;
    /** Term length in months. Must be a positive integer. */
    months: number;
}
export interface InstallmentPlan {
    /** Principal, at money scale. */
    totalAmount: Prisma.Decimal;
    /** principal × (rate/100) × months, at money scale. */
    totalInterest: Prisma.Decimal;
    /** totalAmount + totalInterest — the amount locked on the wallet. */
    grandTotal: Prisma.Decimal;
    /** round(grandTotal / months) — the recurring displayed installment. */
    monthlyAmount: Prisma.Decimal;
    /** Last term's payment; absorbs the rounding remainder so the schedule
     *  (monthlyAmount × (months − 1) + finalMonthlyAmount) equals grandTotal exactly. */
    finalMonthlyAmount: Prisma.Decimal;
}
/**
 * Compute an installment plan entirely in Decimal. Throws on invalid input
 * (non-positive principal, out-of-range rate, non-positive/non-integer term)
 * so the caller fails before any mutation.
 */
export declare function computeInstallmentPlan(input: InstallmentPlanInput): InstallmentPlan;
//# sourceMappingURL=installment.d.ts.map