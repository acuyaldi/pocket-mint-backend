"use strict";
// ============================================================
// Read-only wallet balance reconciliation & audit
// ------------------------------------------------------------
// Recomputes each wallet's expected balance from the transaction ledger
// (opening balance + Σ effects), classifies any drift, lists legacy
// (destination-less) transfers, and can emit a read-only repair PLAN.
// DIAGNOSTIC ONLY — it issues no create/update/delete; it never mutates data.
//
//   npx ts-node src/scripts/reconcile.ts <userId>            # drift table
//   npx ts-node src/scripts/reconcile.ts <userId> --audit    # classified audit
//   npx ts-node src/scripts/reconcile.ts <userId> --plan     # repair proposals
//   # add --json to any mode for machine-readable output
//   # or, after build:  node dist/scripts/reconcile.js <userId> --audit
//
// Exit code: 2 when any drift/unclassified state is found, 0 when clean,
// 1 on usage/error — so CI can gate on it without ever writing.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const reconciliation_1 = require("../domain/reconciliation");
const repairPlan_1 = require("../domain/repairPlan");
async function main() {
    const args = process.argv.slice(2);
    const asJson = args.includes('--json');
    const mode = args.includes('--plan')
        ? 'plan'
        : args.includes('--audit')
            ? 'audit'
            : 'drift';
    const userId = args.find((a) => !a.startsWith('--'));
    if (!userId) {
        console.error('Usage: reconcile <userId> [--audit | --plan] [--json]');
        return 1;
    }
    // Read-only fetch. Only findMany is used anywhere in this script.
    const [wallets, transactions, installments] = await Promise.all([
        prisma_1.default.wallet.findMany({
            where: { userId },
            select: { id: true, name: true, initialBalance: true, balance: true, createdAt: true },
        }),
        prisma_1.default.transaction.findMany({
            where: { userId },
            select: {
                id: true,
                type: true,
                amount: true,
                walletId: true,
                toWalletId: true,
                isInstallment: true,
                installmentId: true,
                date: true,
                createdAt: true,
            },
        }),
        prisma_1.default.installment.findMany({
            where: { userId },
            select: { id: true, grandTotal: true },
        }),
    ]);
    const grandTotalByInstallment = new Map(installments.map((i) => [i.id, i.grandTotal]));
    const report = (0, reconciliation_1.auditWalletBalances)(wallets.map((w) => ({
        id: w.id,
        name: w.name,
        initialBalance: w.initialBalance,
        balance: w.balance,
        createdAt: w.createdAt,
    })), transactions, grandTotalByInstallment
    // No verified-initial-balance / manual-override hints are passed from the CLI:
    // those require an operator's out-of-band confirmation, kept out of the audit.
    );
    if (mode === 'plan') {
        // Without verified initial balances, nothing is auto-apply eligible — by design.
        const plan = (0, repairPlan_1.buildRepairPlan)(report.wallets);
        if (asJson) {
            console.log(JSON.stringify(plan, null, 2));
        }
        else {
            console.log(`Repair plan for user ${userId} — ${plan.length} proposal(s). READ-ONLY: nothing is applied.`);
            for (const p of plan) {
                console.log(`  [${p.confidence}] ${p.name ?? p.walletId} (${p.classification}): ` +
                    `current=${p.currentBalance} expected=${p.expectedBalance} diff=${p.difference}` +
                    `${p.autoApplyEligible ? '' : ' — manual review required'}`);
                console.log(`         reason: ${p.reason}`);
            }
            console.log('No balances were changed. Review each proposal before any separate, authorized repair.');
        }
        return report.hasDrift ? 2 : 0;
    }
    if (mode === 'audit') {
        if (asJson) {
            console.log(JSON.stringify({
                wallets: report.wallets.map((w) => ({
                    walletId: w.walletId,
                    name: w.name,
                    stored: w.stored.toString(),
                    initialBalance: w.initialBalance.toString(),
                    ledgerEffect: w.ledgerEffect.toString(),
                    expected: w.expected.toString(),
                    drift: w.drift.toString(),
                    legacyTransferCount: w.legacyTransferCount,
                    predatesFix: w.predatesFix,
                    classification: w.classification,
                    confidence: w.confidence,
                    reason: w.reason,
                })),
                legacyTransfers: report.legacyTransfers,
            }, null, 2));
        }
        else {
            console.log(`Audit for user ${userId} — ${wallets.length} wallet(s), ${transactions.length} transaction(s)`);
            for (const w of report.wallets) {
                console.log(`  [${w.classification}/${w.confidence}] ${w.name ?? w.walletId}: ` +
                    `stored=${w.stored.toString()} expected=${w.expected.toString()} drift=${w.drift.toString()}` +
                    `${w.legacyTransferCount ? ` legacyTransfers=${w.legacyTransferCount}` : ''}`);
                console.log(`       ${w.reason}`);
            }
            if (report.legacyTransfers.length > 0) {
                console.log(`Legacy transfers (no recorded destination) — investigate manually, never auto-repair:`);
                for (const t of report.legacyTransfers) {
                    console.log(`  tx=${t.id ?? '?'} sourceWallet=${t.walletId} amount=${t.amount} date=${t.date ?? '?'}`);
                }
            }
        }
        return report.hasDrift ? 2 : 0;
    }
    // Default: compact drift table (backward-compatible with the Sprint 2A script).
    const drifted = report.wallets.filter((w) => !w.drift.isZero());
    if (asJson) {
        console.log(JSON.stringify(report.wallets.map((w) => ({
            walletId: w.walletId,
            name: w.name,
            stored: w.stored.toString(),
            expected: w.expected.toString(),
            drift: w.drift.toString(),
        })), null, 2));
    }
    else {
        console.log(`Reconciliation for user ${userId} — ${wallets.length} wallet(s), ${transactions.length} transaction(s)`);
        for (const w of report.wallets) {
            const flag = w.drift.isZero() ? 'OK  ' : 'DRIFT';
            console.log(`  [${flag}] ${w.name ?? w.walletId}: stored=${w.stored.toString()} expected=${w.expected.toString()} drift=${w.drift.toString()}`);
        }
        console.log(drifted.length === 0
            ? 'No drift detected.'
            : `${drifted.length} wallet(s) drifted — run with --audit to classify, --plan to see repair proposals.`);
    }
    return report.hasDrift ? 2 : 0;
}
main()
    .then((code) => prisma_1.default.$disconnect().then(() => process.exit(code)))
    .catch(async (err) => {
    console.error('reconcile failed:', err instanceof Error ? err.message : String(err));
    await prisma_1.default.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=reconcile.js.map