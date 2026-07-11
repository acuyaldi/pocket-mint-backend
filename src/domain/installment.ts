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

import { Prisma } from '../generated/prisma/client';

/** Currency precision: 2 dp, matching the `Decimal(15, 2)` money columns. */
export const MONEY_SCALE = 2;
/** Half-up rounding at the money scale (conventional for consumer finance). */
export const MONEY_ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

/** Round a Decimal to the currency scale with the fixed money rounding mode. */
export function toMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

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

const HUNDRED = new Prisma.Decimal(100);

/**
 * Compute an installment plan entirely in Decimal. Throws on invalid input
 * (non-positive principal, out-of-range rate, non-positive/non-integer term)
 * so the caller fails before any mutation.
 */
export function computeInstallmentPlan(input: InstallmentPlanInput): InstallmentPlan {
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

  const monthsDec = new Prisma.Decimal(months);

  const totalAmount = toMoney(principal);
  // principal × (rate / 100) × months — all Decimal, rounded once at the end.
  const totalInterest = toMoney(principal.times(interestRatePctPerMonth).div(HUNDRED).times(monthsDec));
  const grandTotal = toMoney(totalAmount.plus(totalInterest));
  const monthlyAmount = toMoney(grandTotal.div(monthsDec));
  // Final term takes whatever cents the rounded monthly amount left behind.
  const finalMonthlyAmount = toMoney(grandTotal.minus(monthlyAmount.times(months - 1)));

  return { totalAmount, totalInterest, grandTotal, monthlyAmount, finalMonthlyAmount };
}
