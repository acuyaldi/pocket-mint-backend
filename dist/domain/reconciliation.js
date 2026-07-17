"use strict";
// ============================================================
// Wallet reconciliation audit — classification & confidence
// ------------------------------------------------------------
// Builds on `reconcileWalletBalances` (raw drift) to classify WHY a wallet
// drifts and how much to trust that conclusion. Pure and read-only: it reads
// snapshots and returns a report; it never touches the database.
//
// Classification is deterministic from the available evidence and deliberately
// conservative — a heuristic is never presented as certainty. In particular we
// never guess a legacy transfer's destination and never claim historical
// correctness when the evidence is incomplete.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditWalletBalances = auditWalletBalances;
const transactionBalance_1 = require("./transactionBalance");
function classify(drift, evidence) {
    if (drift.isZero()) {
        return { classification: 'CLEAN', confidence: 'HIGH', reason: 'Stored balance matches the ledger.' };
    }
    // A transfer with no recorded destination makes `expected` unreliable — the
    // credited side is unknown — so this dominates every other explanation.
    if (evidence.hasLegacyTransfer) {
        return {
            classification: 'LEGACY_TRANSFER_UNRESOLVED',
            confidence: 'LOW',
            reason: 'A transfer with no recorded destination touches this wallet; the expected balance cannot be computed reliably.',
        };
    }
    // Only set from an external audit trail — never inferred from the data alone.
    if (evidence.suspectedManualOverride) {
        return {
            classification: 'MANUAL_BALANCE_OVERRIDE_SUSPECTED',
            confidence: 'LOW',
            reason: 'External records flag this wallet as manually overridden; the stored balance may bypass the ledger.',
        };
    }
    // A zero opening balance on a drifted wallet most likely means the opening
    // value was folded into `balance` before initialBalance was captured.
    if (evidence.initialBalanceZero) {
        return {
            classification: 'LIKELY_INITIAL_BALANCE_MISSING',
            confidence: 'MEDIUM',
            reason: 'Initial balance is zero; the opening balance was likely folded into the stored balance and never captured.',
        };
    }
    return {
        classification: 'UNCLASSIFIED_DRIFT',
        confidence: 'LOW',
        reason: 'Stored balance disagrees with the ledger and no single cause could be determined.',
    };
}
/**
 * Produce a per-wallet audit plus a list of legacy (destination-less) transfers.
 * Read-only and deterministic.
 */
function auditWalletBalances(wallets, transactions, grandTotalByInstallment = new Map(), options = {}) {
    const reconciliations = (0, transactionBalance_1.reconcileWalletBalances)(wallets.map((w) => ({ id: w.id, initialBalance: w.initialBalance, balance: w.balance })), transactions, grandTotalByInstallment);
    const byWallet = new Map(reconciliations.map((r) => [r.walletId, r]));
    // Count legacy transfers per source wallet, and collect them for reporting.
    const legacyCountByWallet = new Map();
    const legacyTransfers = [];
    for (const tx of transactions) {
        if (tx.type === 'TRANSFER' && !tx.toWalletId) {
            legacyCountByWallet.set(tx.walletId, (legacyCountByWallet.get(tx.walletId) ?? 0) + 1);
            legacyTransfers.push({
                id: tx.id ?? null,
                walletId: tx.walletId,
                amount: tx.amount.toString(),
                date: tx.date ? tx.date.toISOString() : null,
                createdAt: tx.createdAt ? tx.createdAt.toISOString() : null,
            });
        }
    }
    const overrides = options.manualOverrideWalletIds;
    const audited = wallets.map((w) => {
        const rec = byWallet.get(w.id);
        const legacyTransferCount = legacyCountByWallet.get(w.id) ?? 0;
        const predatesFix = options.fixDeployedAt && w.createdAt ? w.createdAt.getTime() < options.fixDeployedAt.getTime() : null;
        const { classification, confidence, reason } = classify(rec.drift, {
            hasLegacyTransfer: legacyTransferCount > 0,
            initialBalanceZero: w.initialBalance.isZero(),
            suspectedManualOverride: overrides?.has(w.id) ?? false,
        });
        return {
            walletId: w.id,
            name: w.name ?? null,
            stored: rec.stored,
            initialBalance: w.initialBalance,
            ledgerEffect: rec.expected.minus(w.initialBalance),
            expected: rec.expected,
            drift: rec.drift,
            legacyTransferCount,
            predatesFix,
            classification,
            confidence,
            reason,
        };
    });
    return {
        wallets: audited,
        legacyTransfers,
        hasDrift: audited.some((a) => a.classification !== 'CLEAN'),
    };
}
//# sourceMappingURL=reconciliation.js.map