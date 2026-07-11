"use strict";
// ============================================================
// Financial balance-effect domain
// ------------------------------------------------------------
// Single source of truth for how a transaction moves money between
// wallets. Create, update, delete, and reconciliation all derive their
// deltas from here so the create-time effect and its reversal can never
// disagree (Invariant 2 — exact reversal; Invariant 4 — transfer symmetry).
//
// This module is pure domain logic:
//   - no HTTP, no Express, no auth
//   - no Prisma client instantiation; `applyBalanceDeltas` operates on an
//     already-open transaction client passed in by the caller (Invariant 1).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeBalanceEffect = computeBalanceEffect;
exports.reverseBalanceEffect = reverseBalanceEffect;
exports.applyBalanceDeltas = applyBalanceDeltas;
exports.reconcileWalletBalances = reconcileWalletBalances;
const client_1 = require("../generated/prisma/client");
const ZERO = new client_1.Prisma.Decimal(0);
/**
 * Core delta calculator. In `strict` mode a TRANSFER without a destination
 * throws (controllers must never half-apply a transfer). In non-strict mode
 * (reconciliation over historical data) a destination-less transfer applies
 * only the source side so legacy rows don't abort a whole audit.
 */
function balanceDeltas(input, strict) {
    const { type, walletId } = input;
    // Installments short-circuit the type switch: the wallet was debited by the
    // full grandTotal regardless of the stored monthly `amount`.
    if (input.isInstallment) {
        const grand = input.installmentGrandTotal ?? null;
        if (grand === null) {
            if (strict)
                throw new Error('installment balance effect requires installmentGrandTotal');
            // Fall back to the stored amount so reconciliation still produces a value.
            return [{ walletId, amount: input.amount.negated() }];
        }
        return [{ walletId, amount: grand.negated() }];
    }
    switch (type) {
        case 'INCOME':
            return [{ walletId, amount: input.amount }];
        case 'EXPENSE':
            return [{ walletId, amount: input.amount.negated() }];
        case 'TRANSFER': {
            const deltas = [{ walletId, amount: input.amount.negated() }];
            if (input.toWalletId) {
                deltas.push({ walletId: input.toWalletId, amount: input.amount });
            }
            else if (strict) {
                throw new Error('TRANSFER balance effect requires toWalletId');
            }
            return deltas;
        }
        default: {
            // Exhaustiveness guard: adding a TransactionType without handling it here
            // is a compile error, and an unexpected runtime value throws.
            const never = type;
            throw new Error(`Unsupported transaction type: ${String(never)}`);
        }
    }
}
/** Deltas to apply when a transaction is created. Strict: transfers need a destination. */
function computeBalanceEffect(input) {
    return balanceDeltas(input, true);
}
/** Deltas to undo a persisted transaction's effect — the exact negation of create. */
function reverseBalanceEffect(input) {
    return computeBalanceEffect(input).map((d) => ({ walletId: d.walletId, amount: d.amount.negated() }));
}
/**
 * Apply signed deltas to wallet balances using atomic DB increments
 * (Invariant 6 — no read-modify-write race). MUST be called inside an
 * existing `$transaction` so all wallet writes commit or roll back together.
 */
async function applyBalanceDeltas(txClient, deltas) {
    for (const delta of deltas) {
        if (delta.amount.isZero())
            continue;
        await txClient.wallet.update({
            where: { id: delta.walletId },
            data: { balance: { increment: delta.amount } },
        });
    }
}
/**
 * Recompute each wallet's expected balance from its opening balance plus the
 * signed effect of every transaction, then report the drift versus the stored
 * running total. Pure and deterministic; never mutates anything.
 *
 * `grandTotalByInstallment` supplies the full debt for installment expenses.
 */
function reconcileWalletBalances(wallets, transactions, grandTotalByInstallment = new Map()) {
    const expected = new Map();
    for (const w of wallets)
        expected.set(w.id, w.initialBalance);
    const add = (walletId, amount) => {
        if (!expected.has(walletId))
            return; // ignore effects on unknown wallets
        expected.set(walletId, expected.get(walletId).plus(amount));
    };
    for (const tx of transactions) {
        const grand = tx.isInstallment && tx.installmentId
            ? grandTotalByInstallment.get(tx.installmentId) ?? null
            : null;
        const deltas = balanceDeltas({
            type: tx.type,
            amount: tx.amount,
            walletId: tx.walletId,
            toWalletId: tx.toWalletId,
            isInstallment: tx.isInstallment,
            installmentGrandTotal: grand,
        }, false);
        for (const d of deltas)
            add(d.walletId, d.amount);
    }
    return wallets.map((w) => {
        const exp = expected.get(w.id) ?? ZERO;
        return { walletId: w.id, stored: w.balance, expected: exp, drift: w.balance.minus(exp) };
    });
}
//# sourceMappingURL=transactionBalance.js.map