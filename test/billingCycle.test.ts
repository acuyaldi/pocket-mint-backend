import { describe, expect, it } from 'vitest';
import {
  addBillingMonth,
  calculateFirstDueDate,
  clampDay,
} from '../src/domain/billingCycle';

describe('billing cycle calendar', () => {
  it('uses the next billing month on or before cutoff', () => {
    expect(
      calculateFirstDueDate({
        transactionDate: '2026-07-10',
        cutoffDay: 20,
        paymentDueDay: 5,
        timeZone: 'Asia/Jakarta',
      }),
    ).toBe('2026-08-05');

    expect(
      calculateFirstDueDate({
        transactionDate: '2026-07-20',
        cutoffDay: 20,
        paymentDueDay: 5,
        timeZone: 'Asia/Jakarta',
      }),
    ).toBe('2026-08-05');
  });

  it('skips one additional month after cutoff', () => {
    expect(
      calculateFirstDueDate({
        transactionDate: '2026-07-21',
        cutoffDay: 20,
        paymentDueDay: 5,
        timeZone: 'Asia/Jakarta',
      }),
    ).toBe('2026-09-05');
  });

  it('clamps configured days to the last day of short months', () => {
    expect(clampDay(2026, 1, 31)).toBe('2026-02-28');
    expect(clampDay(2028, 1, 31)).toBe('2028-02-29');
    expect(addBillingMonth('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('rolls December into the next year', () => {
    expect(addBillingMonth('2026-12-31', 1)).toBe('2027-01-31');
    expect(
      calculateFirstDueDate({
        transactionDate: '2026-12-25',
        cutoffDay: 20,
        paymentDueDay: 31,
        timeZone: 'Asia/Jakarta',
      }),
    ).toBe('2027-02-28');
  });

  it('rejects invalid calendar inputs', () => {
    expect(() => addBillingMonth('2026-02-30', 1)).toThrow('Tanggal tidak valid');
    expect(() =>
      calculateFirstDueDate({
        transactionDate: '2026-07-10',
        cutoffDay: 0,
        paymentDueDay: 5,
        timeZone: 'Asia/Jakarta',
      }),
    ).toThrow('cutoffDay harus antara 1 dan 31');
  });
});
