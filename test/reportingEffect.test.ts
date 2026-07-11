import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { getAggregateCashFlowEffect, getWalletReportingEffect } from '../src/domain/reportingEffect';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { calculateNetWorth, classifyWalletForNetWorth } from '../src/utils/financial';

const D = (value: string | number) => new Prisma.Decimal(value);
const tx = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER', extra = {}) => ({
  type, amount: D('10.25'), walletId: 'source', toWalletId: null, isInstallment: false, installment: null, ...extra,
});

describe('wallet reporting effects', () => {
  it('applies income and expense from the source perspective', () => {
    expect(getWalletReportingEffect(tx('INCOME'), 'source').toString()).toBe('10.25');
    expect(getWalletReportingEffect(tx('EXPENSE'), 'source').toString()).toBe('-10.25');
  });

  it('applies both known transfer perspectives and aggregate zero', () => {
    const transfer = tx('TRANSFER', { toWalletId: 'destination' });
    expect(getWalletReportingEffect(transfer, 'source').toString()).toBe('-10.25');
    expect(getWalletReportingEffect(transfer, 'destination').toString()).toBe('10.25');
    expect(getAggregateCashFlowEffect(transfer).toString()).toBe('0');
  });

  it('never invents a legacy transfer destination', () => {
    const legacy = tx('TRANSFER');
    expect(getWalletReportingEffect(legacy, 'source').toString()).toBe('-10.25');
    expect(getWalletReportingEffect(legacy, 'unknown').toString()).toBe('0');
  });

  it('uses installment grandTotal as the actual wallet effect', () => {
    const installment = tx('EXPENSE', { isInstallment: true, installment: { grandTotal: D('123.45') } });
    expect(getWalletReportingEffect(installment, 'source').toString()).toBe('-123.45');
  });

  it('preserves decimal cents', () => {
    const first = getWalletReportingEffect({ ...tx('INCOME'), amount: D('0.10') }, 'source');
    const second = getWalletReportingEffect({ ...tx('INCOME'), amount: D('0.20') }, 'source');
    expect(first.plus(second).toString()).toBe('0.3');
  });
});

describe('net worth classification', () => {
  it('classifies every wallet type explicitly', () => {
    expect(['CASH', 'BANK', 'E_WALLET'].map(classifyWalletForNetWorth)).toEqual(['ASSET', 'ASSET', 'ASSET']);
    expect(['CREDIT_CARD', 'LOAN_PAYLATER'].map(classifyWalletForNetWorth)).toEqual(['DEBT', 'DEBT']);
  });

  it('retains the product rule that net worth equals assets', () => {
    const result = calculateNetWorth([
      { type: 'BANK', balance: D('100.10') },
      { type: 'CREDIT_CARD', balance: D('-20.05') },
    ]);
    expect(result.totalAset.toString()).toBe('100.1');
    expect(result.totalUtang.toString()).toBe('20.05');
    expect(result.netWorth.toString()).toBe('100.1');
  });
});
