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

import { Prisma } from '../generated/prisma/client';
import {
  reconcileWalletBalances,
  type LedgerTransaction,
  type WalletReconciliation,
} from './transactionBalance';

export type DriftClassification =
  | 'CLEAN'
  | 'LIKELY_INITIAL_BALANCE_MISSING'
  | 'LEGACY_TRANSFER_UNRESOLVED'
  | 'MANUAL_BALANCE_OVERRIDE_SUSPECTED'
  | 'UNCLASSIFIED_DRIFT';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** A ledger row with the extra fields needed to list legacy transfers. */
export interface AuditTransaction extends LedgerTransaction {
  id?: string | null;
  date?: Date | null;
  createdAt?: Date | null;
}

export interface AuditWalletSnapshot {
  id: string;
  name?: string | null;
  initialBalance: Prisma.Decimal;
  balance: Prisma.Decimal;
  /** When known, used to decide whether the wallet predates the Sprint 2A fix. */
  createdAt?: Date | null;
}

export interface AuditOptions {
  /**
   * Deploy timestamp of the toWalletId/initialBalance fix. When set, wallets
   * created before it are flagged `predatesFix`. Omitted → `predatesFix` is null.
   */
  fixDeployedAt?: Date;
  /**
   * Wallets whose `initialBalance` has been independently verified by an
   * operator. Only these can reach HIGH repair confidence; we never assume it.
   */
  verifiedInitialBalanceWalletIds?: ReadonlySet<string>;
  /**
   * Wallets an external audit trail marks as manually overridden. There is no
   * in-data signal for this, so it defaults to empty — we never fabricate one.
   */
  manualOverrideWalletIds?: ReadonlySet<string>;
}

/** A destination-less transfer surfaced for manual investigation. */
export interface LegacyTransfer {
  id: string | null;
  walletId: string;
  amount: string;
  date: string | null;
  createdAt: string | null;
}

export interface WalletAudit {
  walletId: string;
  name: string | null;
  stored: Prisma.Decimal;
  initialBalance: Prisma.Decimal;
  /** expected − initialBalance: the net effect the ledger accounts for. */
  ledgerEffect: Prisma.Decimal;
  expected: Prisma.Decimal;
  drift: Prisma.Decimal;
  /** Destination-less transfers whose SOURCE is this wallet (definitely affected). */
  legacyTransferCount: number;
  /** True/false when `fixDeployedAt` is known and `createdAt` present; else null. */
  predatesFix: boolean | null;
  classification: DriftClassification;
  confidence: Confidence;
  reason: string;
}

export interface AuditReport {
  wallets: WalletAudit[];
  legacyTransfers: LegacyTransfer[];
  /** True when any wallet is non-CLEAN (drives a non-zero script exit code). */
  hasDrift: boolean;
}

function classify(
  drift: Prisma.Decimal,
  evidence: { hasLegacyTransfer: boolean; initialBalanceZero: boolean; suspectedManualOverride: boolean }
): { classification: DriftClassification; confidence: Confidence; reason: string } {
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
export function auditWalletBalances(
  wallets: AuditWalletSnapshot[],
  transactions: AuditTransaction[],
  grandTotalByInstallment: Map<string, Prisma.Decimal> = new Map(),
  options: AuditOptions = {}
): AuditReport {
  const reconciliations: WalletReconciliation[] = reconcileWalletBalances(
    wallets.map((w) => ({ id: w.id, initialBalance: w.initialBalance, balance: w.balance })),
    transactions,
    grandTotalByInstallment
  );
  const byWallet = new Map(reconciliations.map((r) => [r.walletId, r]));

  // Count legacy transfers per source wallet, and collect them for reporting.
  const legacyCountByWallet = new Map<string, number>();
  const legacyTransfers: LegacyTransfer[] = [];
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

  const audited: WalletAudit[] = wallets.map((w) => {
    const rec = byWallet.get(w.id)!;
    const legacyTransferCount = legacyCountByWallet.get(w.id) ?? 0;
    const predatesFix =
      options.fixDeployedAt && w.createdAt ? w.createdAt.getTime() < options.fixDeployedAt.getTime() : null;

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
