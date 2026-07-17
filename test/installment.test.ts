import { describe, it, expect } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { computeInstallmentPlan } from '../src/domain/installment';

const D = (n: number | string) => new Prisma.Decimal(n);

describe('computeInstallmentPlan — Decimal-safe arithmetic', () => {
  it('keeps interest at the 2-dp currency scale instead of rounding to whole units', () => {
    // Old code did Math.round(100 * 0.015 * 1) = 2; the column is Decimal(15,2).
    const plan = computeInstallmentPlan({ principal: D(100), interestRatePctPerMonth: D('1.5'), months: 1 });
    expect(plan.totalInterest.toString()).toBe('1.5');
    expect(plan.grandTotal.toString()).toBe('101.5');
  });

  it('does not accumulate binary floating-point error (0.1 + 0.2 case)', () => {
    // principal chosen so a naive float path (0.1 * 3) would drift; Decimal stays exact.
    const plan = computeInstallmentPlan({ principal: D('0.10'), interestRatePctPerMonth: D(100), months: 2 });
    // interest = 0.10 * 100/100 * 2 = 0.20 exactly
    expect(plan.totalInterest.toString()).toBe('0.2');
    expect(plan.grandTotal.toString()).toBe('0.3'); // 0.10 + 0.20, not 0.30000000000000004
  });

  it('divides a repeating decimal (100000 / 3) with an explicit rounding rule', () => {
    const plan = computeInstallmentPlan({ principal: D(100000), interestRatePctPerMonth: D(0), months: 3 });
    expect(plan.grandTotal.toString()).toBe('100000');
    expect(plan.monthlyAmount.toString()).toBe('33333.33'); // round-half-up at 2 dp
    expect(plan.finalMonthlyAmount.toString()).toBe('33333.34'); // absorbs the remainder
  });

  it('makes the schedule sum back to grandTotal exactly (remainder policy)', () => {
    const cases = [
      { principal: D(100000), rate: D('2.95'), months: 12 },
      { principal: D(100000), rate: D(0), months: 3 },
      { principal: D('1234567.89'), rate: D('3.5'), months: 6 },
      { principal: D(500), rate: D('1.1'), months: 3 },
    ];
    for (const c of cases) {
      const p = computeInstallmentPlan({ principal: c.principal, interestRatePctPerMonth: c.rate, months: c.months });
      const scheduleSum = p.monthlyAmount.times(c.months - 1).plus(p.finalMonthlyAmount);
      expect(scheduleSum.toString()).toBe(p.grandTotal.toString());
      // grandTotal is exactly principal + interest
      expect(p.grandTotal.toString()).toBe(p.totalAmount.plus(p.totalInterest).toString());
    }
  });

  it('is deterministic for the same input', () => {
    const args = { principal: D('99999.99'), interestRatePctPerMonth: D('2.6'), months: 6 };
    const a = computeInstallmentPlan(args);
    const b = computeInstallmentPlan(args);
    expect(a).toEqual(b);
  });

  it('rejects a non-positive principal', () => {
    expect(() => computeInstallmentPlan({ principal: D(0), interestRatePctPerMonth: D(1), months: 3 })).toThrow();
    expect(() => computeInstallmentPlan({ principal: D(-1), interestRatePctPerMonth: D(1), months: 3 })).toThrow();
  });

  it('rejects an out-of-range interest rate', () => {
    expect(() => computeInstallmentPlan({ principal: D(100), interestRatePctPerMonth: D(-1), months: 3 })).toThrow();
    expect(() => computeInstallmentPlan({ principal: D(100), interestRatePctPerMonth: D('100.01'), months: 3 })).toThrow();
  });

  it('rejects a non-positive or non-integer term', () => {
    expect(() => computeInstallmentPlan({ principal: D(100), interestRatePctPerMonth: D(1), months: 0 })).toThrow();
    expect(() => computeInstallmentPlan({ principal: D(100), interestRatePctPerMonth: D(1), months: 2.5 })).toThrow();
  });
});
