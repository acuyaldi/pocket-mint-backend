// ============================================================
// Read-only wallet balance reconciliation
// ------------------------------------------------------------
// Recomputes each wallet's expected balance from the transaction ledger
// (opening balance + Σ effects) and reports any drift versus the stored
// running total. DIAGNOSTIC ONLY — it never writes to the database.
//
//   npx ts-node src/scripts/reconcile.ts <userId>
//   # or, after build:  node dist/scripts/reconcile.js <userId>
//
// A `--json` flag emits machine-readable output. Exit code is 2 when any
// drift is found, 0 when clean, 1 on usage/error — so CI can gate on it
// without ever mutating data.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { reconcileWalletBalances, type LedgerTransaction } from '../domain/transactionBalance';

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const userId = args.find((a) => !a.startsWith('--'));

  if (!userId) {
    console.error('Usage: reconcile <userId> [--json]');
    return 1;
  }

  const [wallets, transactions, installments] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId },
      select: { id: true, name: true, initialBalance: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: {
        type: true,
        amount: true,
        walletId: true,
        toWalletId: true,
        isInstallment: true,
        installmentId: true,
      },
    }),
    prisma.installment.findMany({
      where: { userId },
      select: { id: true, grandTotal: true },
    }),
  ]);

  const grandTotalByInstallment = new Map<string, Prisma.Decimal>(
    installments.map((i) => [i.id, i.grandTotal])
  );

  const results = reconcileWalletBalances(
    wallets.map((w) => ({ id: w.id, initialBalance: w.initialBalance, balance: w.balance })),
    transactions as LedgerTransaction[],
    grandTotalByInstallment
  );

  const nameById = new Map(wallets.map((w) => [w.id, w.name]));
  const drifted = results.filter((r) => !r.drift.isZero());

  if (asJson) {
    console.log(
      JSON.stringify(
        results.map((r) => ({
          walletId: r.walletId,
          name: nameById.get(r.walletId) ?? null,
          stored: r.stored.toString(),
          expected: r.expected.toString(),
          drift: r.drift.toString(),
        })),
        null,
        2
      )
    );
  } else {
    console.log(`Reconciliation for user ${userId} — ${wallets.length} wallet(s), ${transactions.length} transaction(s)`);
    for (const r of results) {
      const flag = r.drift.isZero() ? 'OK  ' : 'DRIFT';
      console.log(
        `  [${flag}] ${nameById.get(r.walletId) ?? r.walletId}: stored=${r.stored.toString()} expected=${r.expected.toString()} drift=${r.drift.toString()}`
      );
    }
    console.log(drifted.length === 0 ? 'No drift detected.' : `${drifted.length} wallet(s) drifted — investigate before applying any repair.`);
  }

  return drifted.length > 0 ? 2 : 0;
}

main()
  .then((code) => prisma.$disconnect().then(() => process.exit(code)))
  .catch(async (err) => {
    console.error('reconcile failed:', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect();
    process.exit(1);
  });
