import { describe, it, expect } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { auditWalletBalances, type AuditTransaction } from '../src/domain/reconciliation';
import { buildRepairPlan } from '../src/domain/repairPlan';

const D = (n: number | string) => new Prisma.Decimal(n);
const wallet = (id: string, initial: number | string, bal: number | string) => ({
  id,
  initialBalance: D(initial),
  balance: D(bal),
});

describe('buildRepairPlan — read-only planning', () => {
  it('omits clean wallets', () => {
    const report = auditWalletBalances([wallet('w1', 100, 80)], [
      { type: 'EXPENSE', amount: D(20), walletId: 'w1' },
    ]);
    expect(buildRepairPlan(report.wallets)).toHaveLength(0);
  });

  it('gives a deterministic HIGH proposal only when initial balance is verified and no legacy transfers', () => {
    // Known initial balance, no legacy transfer, verified by an operator → trustworthy expected.
    const report = auditWalletBalances([wallet('w1', 100, 999)], []); // UNCLASSIFIED drift of 899
    const [p] = buildRepairPlan(report.wallets, { verifiedInitialBalanceWalletIds: new Set(['w1']) });

    expect(p.confidence).toBe('HIGH');
    expect(p.autoApplyEligible).toBe(true);
    expect(p.requiresManualInvestigation).toBe(false);
    expect(p.currentBalance).toBe('999');
    expect(p.expectedBalance).toBe('100');
    expect(p.difference).toBe('-899'); // expected − current
  });

  it('never auto-repairs a legacy-transfer drift, even if the wallet is "verified"', () => {
    const txs: AuditTransaction[] = [{ type: 'TRANSFER', amount: D(40), walletId: 'w1', toWalletId: null }];
    const report = auditWalletBalances([wallet('w1', 100, 100)], txs);
    const [p] = buildRepairPlan(report.wallets, { verifiedInitialBalanceWalletIds: new Set(['w1']) });

    expect(p.confidence).toBe('LOW');
    expect(p.autoApplyEligible).toBe(false);
    expect(p.requiresManualInvestigation).toBe(true);
  });

  it('proposes a MEDIUM, non-auto-apply fix for a likely-missing initial balance', () => {
    const report = auditWalletBalances([wallet('w1', 0, 500)], []);
    const [p] = buildRepairPlan(report.wallets); // no verification passed

    expect(p.classification).toBe('LIKELY_INITIAL_BALANCE_MISSING');
    expect(p.confidence).toBe('MEDIUM');
    expect(p.autoApplyEligible).toBe(false);
    expect(p.requiresManualInvestigation).toBe(false);
  });

  it('emits only balance/label fields — no user profile or secrets', () => {
    const report = auditWalletBalances([wallet('w1', 100, 999)], []);
    const plan = buildRepairPlan(report.wallets);
    const keys = Object.keys(plan[0]).sort();
    expect(keys).toEqual(
      [
        'autoApplyEligible',
        'classification',
        'confidence',
        'currentBalance',
        'difference',
        'expectedBalance',
        'name',
        'reason',
        'requiresManualInvestigation',
        'walletId',
      ].sort()
    );
    const json = JSON.stringify(plan);
    expect(json).not.toMatch(/userId|email|password|token/i);
  });
});
