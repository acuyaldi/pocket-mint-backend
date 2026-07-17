import { describe, it, expect } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { auditWalletBalances, type AuditTransaction } from '../src/domain/reconciliation';

const D = (n: number | string) => new Prisma.Decimal(n);
const wallet = (id: string, initial: number | string, bal: number | string, extra: object = {}) => ({
  id,
  initialBalance: D(initial),
  balance: D(bal),
  ...extra,
});
const one = (report: ReturnType<typeof auditWalletBalances>) => report.wallets[0];

describe('auditWalletBalances — classification', () => {
  it('CLEAN / HIGH when the ledger matches (Decimal precision preserved)', () => {
    // 0.1 + 0.2 = 0.3 exactly under Decimal; a float ledger would drift here.
    const txs: AuditTransaction[] = [{ type: 'INCOME', amount: D('0.20'), walletId: 'w1' }];
    const r = one(auditWalletBalances([wallet('w1', '0.10', '0.30')], txs));
    expect(r.drift.toString()).toBe('0');
    expect(r.classification).toBe('CLEAN');
    expect(r.confidence).toBe('HIGH');
  });

  it('LIKELY_INITIAL_BALANCE_MISSING / MEDIUM when initialBalance is zero and drift exists', () => {
    const r = one(auditWalletBalances([wallet('w1', 0, 500)], []));
    expect(r.drift.toString()).toBe('500');
    expect(r.classification).toBe('LIKELY_INITIAL_BALANCE_MISSING');
    expect(r.confidence).toBe('MEDIUM');
  });

  it('LEGACY_TRANSFER_UNRESOLVED / LOW and never guesses the destination', () => {
    const txs: AuditTransaction[] = [
      { type: 'TRANSFER', amount: D(40), walletId: 'w1', toWalletId: null, id: 'tx-legacy', date: new Date('2026-01-01') },
    ];
    const report = auditWalletBalances([wallet('w1', 100, 100)], txs);
    const r = one(report);
    expect(r.classification).toBe('LEGACY_TRANSFER_UNRESOLVED');
    expect(r.confidence).toBe('LOW');
    expect(r.legacyTransferCount).toBe(1);
    // Only the source side was applied; no phantom destination credit was invented.
    expect(r.expected.toString()).toBe('60');
    expect(report.legacyTransfers).toHaveLength(1);
    expect(report.legacyTransfers[0]).toMatchObject({ id: 'tx-legacy', walletId: 'w1', amount: '40' });
    // The report exposes no destination field at all — it is genuinely unknown.
    expect(report.legacyTransfers[0]).not.toHaveProperty('toWalletId');
  });

  it('MANUAL_BALANCE_OVERRIDE_SUSPECTED / LOW only with an external override signal', () => {
    const r = one(
      auditWalletBalances([wallet('w1', 100, 999)], [], new Map(), {
        manualOverrideWalletIds: new Set(['w1']),
      })
    );
    expect(r.classification).toBe('MANUAL_BALANCE_OVERRIDE_SUSPECTED');
    expect(r.confidence).toBe('LOW');
  });

  it('UNCLASSIFIED_DRIFT / LOW when drift has a known initial balance but no other signal', () => {
    const r = one(auditWalletBalances([wallet('w1', 100, 999)], []));
    expect(r.classification).toBe('UNCLASSIFIED_DRIFT');
    expect(r.confidence).toBe('LOW');
  });

  it('flags predatesFix when a cutoff and createdAt are available; null otherwise', () => {
    const cutoff = new Date('2026-07-11T00:00:00Z');
    const withDates = auditWalletBalances(
      [
        wallet('old', 0, 0, { createdAt: new Date('2026-01-01') }),
        wallet('new', 0, 0, { createdAt: new Date('2026-08-01') }),
      ],
      [],
      new Map(),
      { fixDeployedAt: cutoff }
    );
    expect(withDates.wallets.find((w) => w.walletId === 'old')!.predatesFix).toBe(true);
    expect(withDates.wallets.find((w) => w.walletId === 'new')!.predatesFix).toBe(false);

    // No cutoff → unknown, reported as null (never assumed).
    const noCutoff = one(auditWalletBalances([wallet('w1', 0, 0, { createdAt: new Date() })], []));
    expect(noCutoff.predatesFix).toBeNull();
  });

  it('reports hasDrift across the whole set', () => {
    const report = auditWalletBalances([wallet('w1', 100, 80), wallet('w2', 0, 500)], [
      { type: 'EXPENSE', amount: D(20), walletId: 'w1' },
    ]);
    expect(report.hasDrift).toBe(true); // w2 drifts
  });
});
