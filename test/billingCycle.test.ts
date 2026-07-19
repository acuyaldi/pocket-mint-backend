import { describe, expect, it } from 'vitest';
import {
  addBillingMonth,
  calculateFirstDueDate,
  clampDay,
  nextMonthlyOccurrence,
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

describe('nextMonthlyOccurrence', () => {
  it('returns the start date itself when it has not happened yet', () => {
    expect(nextMonthlyOccurrence('2026-08-15', null, '2026-07-19')).toBe('2026-08-15');
  });

  it('returns this month occurrence when still upcoming', () => {
    expect(nextMonthlyOccurrence('2026-01-15', null, '2026-07-10')).toBe('2026-07-15');
  });

  it('rolls to next month once this month day has passed', () => {
    expect(nextMonthlyOccurrence('2026-01-15', null, '2026-07-20')).toBe('2026-08-15');
  });

  it('clamps to the last day of short months', () => {
    expect(nextMonthlyOccurrence('2026-01-31', null, '2026-02-15')).toBe('2026-02-28');
  });

  it('returns null once past the recurrence end date', () => {
    expect(nextMonthlyOccurrence('2026-01-15', '2026-06-15', '2026-07-01')).toBe(null);
  });

  it('returns null when the end date is before the first occurrence', () => {
    expect(nextMonthlyOccurrence('2026-08-15', '2026-08-01', '2026-07-19')).toBe(null);
  });
});
