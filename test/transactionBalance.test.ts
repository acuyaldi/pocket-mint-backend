import { describe, it, expect } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import {
  computeBalanceEffect,
  reverseBalanceEffect,
  reconcileWalletBalances,
  type BalanceEffectInput,
  type LedgerTransaction,
} from '../src/domain/transactionBalance';

const D = (n: number | string) => new Prisma.Decimal(n);
/** Sum a wallet's signed deltas as a plain number for terse assertions. */
const net = (deltas: { walletId: string; amount: Prisma.Decimal }[], walletId: string) =>
  deltas
    .filter((d) => d.walletId === walletId)
    .reduce((acc, d) => acc.plus(d.amount), D(0))
    .toNumber();

describe('computeBalanceEffect', () => {
  it('INCOME credits the wallet', () => {
    const e = computeBalanceEffect({ type: 'INCOME', amount: D(100), walletId: 'w1' });
    expect(e).toHaveLength(1);
    expect(net(e, 'w1')).toBe(100);
  });

  it('EXPENSE debits the wallet', () => {
    const e = computeBalanceEffect({ type: 'EXPENSE', amount: D(100), walletId: 'w1' });
    expect(net(e, 'w1')).toBe(-100);
  });

  it('TRANSFER debits source, credits destination, net zero across the pair', () => {
    const e = computeBalanceEffect({ type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: 'dst' });
    expect(net(e, 'src')).toBe(-100);
    expect(net(e, 'dst')).toBe(100);
    expect(net(e, 'src') + net(e, 'dst')).toBe(0);
  });

  it('installment debits the FULL grandTotal, not the stored monthly amount', () => {
    const e = computeBalanceEffect({
      type: 'EXPENSE',
      amount: D(50), // monthly
      walletId: 'w1',
      isInstallment: true,
      installmentGrandTotal: D(600),
    });
    expect(net(e, 'w1')).toBe(-600);
  });

  it('throws for a TRANSFER without a destination (strict)', () => {
    expect(() => computeBalanceEffect({ type: 'TRANSFER', amount: D(1), walletId: 'src' })).toThrow();
  });

  it('throws for an installment without grandTotal (strict)', () => {
    expect(() =>
      computeBalanceEffect({ type: 'EXPENSE', amount: D(1), walletId: 'w1', isInstallment: true })
    ).toThrow();
  });

  it('throws for an unsupported transaction type', () => {
    expect(() =>
      computeBalanceEffect({ type: 'GIFT' as unknown as BalanceEffectInput['type'], amount: D(1), walletId: 'w1' })
    ).toThrow(/Unsupported transaction type/);
  });
});

describe('reverseBalanceEffect', () => {
  const cases: BalanceEffectInput[] = [
    { type: 'INCOME', amount: D(100), walletId: 'w1' },
    { type: 'EXPENSE', amount: D(100), walletId: 'w1' },
    { type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: 'dst' },
    { type: 'EXPENSE', amount: D(50), walletId: 'w1', isInstallment: true, installmentGrandTotal: D(600) },
  ];

  it('is the exact negation of the create effect (apply then reverse = 0)', () => {
    for (const input of cases) {
      const forward = computeBalanceEffect(input);
      const backward = reverseBalanceEffect(input);
      const combined = [...forward, ...backward];
      const walletIds = new Set(combined.map((d) => d.walletId));
      for (const id of walletIds) {
        expect(net(combined, id)).toBe(0);
      }
    }
  });
});

describe('decimal correctness', () => {
  it('does not accumulate binary floating-point error', () => {
    // 0.1 + 0.2 !== 0.3 in float; Decimal keeps it exact.
    const e = computeBalanceEffect({ type: 'TRANSFER', amount: D('0.30'), walletId: 'src', toWalletId: 'dst' });
    const src = e.find((d) => d.walletId === 'src')!.amount;
    const dst = e.find((d) => d.walletId === 'dst')!.amount;
    expect(src.plus(dst).toString()).toBe('0');
    expect(dst.toString()).toBe('0.3');
  });
});

describe('reconcileWalletBalances', () => {
  it('reports zero drift for a consistent ledger', () => {
    const wallets = [{ id: 'w1', initialBalance: D(100), balance: D(80) }];
    const txs: LedgerTransaction[] = [{ type: 'EXPENSE', amount: D(20), walletId: 'w1' }];
    const [r] = reconcileWalletBalances(wallets, txs);
    expect(r.expected.toString()).toBe('80');
    expect(r.drift.toString()).toBe('0');
  });

  it('reports the exact drift when a stored balance is corrupted', () => {
    const wallets = [{ id: 'w1', initialBalance: D(100), balance: D(75) }]; // should be 80
    const txs: LedgerTransaction[] = [{ type: 'EXPENSE', amount: D(20), walletId: 'w1' }];
    const [r] = reconcileWalletBalances(wallets, txs);
    expect(r.drift.toString()).toBe('-5');
  });

  it('keeps the aggregate balance unchanged across a transfer', () => {
    const wallets = [
      { id: 'w1', initialBalance: D(100), balance: D(60) },
      { id: 'w2', initialBalance: D(50), balance: D(90) },
    ];
    const txs: LedgerTransaction[] = [{ type: 'TRANSFER', amount: D(40), walletId: 'w1', toWalletId: 'w2' }];
    const results = reconcileWalletBalances(wallets, txs);
    const expectedTotal = results.reduce((a, r) => a.plus(r.expected), D(0));
    const initialTotal = wallets.reduce((a, w) => a.plus(w.initialBalance), D(0));
    expect(expectedTotal.toString()).toBe(initialTotal.toString()); // transfers move, never create/destroy value
    for (const r of results) expect(r.drift.toString()).toBe('0');
  });

  it('uses installment grandTotal when supplied, and falls back to amount when missing', () => {
    const wallets = [{ id: 'w1', initialBalance: D(0), balance: D(-600) }];
    const txs: LedgerTransaction[] = [
      { type: 'EXPENSE', amount: D(50), walletId: 'w1', isInstallment: true, installmentId: 'i1' },
    ];
    const withMap = reconcileWalletBalances(wallets, txs, new Map([['i1', D(600)]]));
    expect(withMap[0].drift.toString()).toBe('0'); // -600 expected matches stored

    const withoutMap = reconcileWalletBalances(wallets, txs); // legacy: no grandTotal
    expect(withoutMap[0].expected.toString()).toBe('-50'); // fallback to monthly amount
    expect(withoutMap[0].drift.toString()).toBe('-550');
  });
});
