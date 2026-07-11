// ============================================================
// Read-only balance repair PLANNING
// ------------------------------------------------------------
// Turns drifted audit records (see reconciliation.ts) into repair PROPOSALS.
// This is planning only: it makes no database calls, mutates nothing, and has
// no auto-apply path. A proposal is auto-apply eligible ONLY at HIGH confidence,
// which a drifted wallet reaches solely when it has no unresolved legacy
// transfers AND its initial balance is independently verified. Everything else
// is downgraded and flagged for manual investigation.
//
// A future write-mode repair script is intentionally OUT OF SCOPE here.
// ============================================================

import type { WalletAudit, Confidence, DriftClassification } from './reconciliation';

export interface RepairProposal {
  walletId: string;
  name: string | null;
  classification: DriftClassification;
  currentBalance: string;
  expectedBalance: string;
  /** expected − current: the signed change a repair would apply to the stored balance. */
  difference: string;
  confidence: Confidence;
  reason: string;
  /** True whenever confidence is LOW — no automatic recommendation is made. */
  requiresManualInvestigation: boolean;
  /** True ONLY at HIGH confidence. LOW/MEDIUM proposals must never be auto-applied. */
  autoApplyEligible: boolean;
}

export interface RepairPlanOptions {
  /** Wallets whose initial balance an operator has independently verified. */
  verifiedInitialBalanceWalletIds?: ReadonlySet<string>;
}

/**
 * Build repair proposals from audit records. CLEAN wallets are omitted. Pure and
 * read-only — the caller decides whether, when, and how to act on a proposal.
 */
export function buildRepairPlan(audits: WalletAudit[], options: RepairPlanOptions = {}): RepairProposal[] {
  const verified = options.verifiedInitialBalanceWalletIds;
  const proposals: RepairProposal[] = [];

  for (const a of audits) {
    if (a.classification === 'CLEAN') continue;

    let confidence: Confidence = a.confidence;
    let reason = a.reason;

    // The ledger-derived expected balance is authoritative only when there are
    // no unresolved transfers AND the opening balance is independently verified.
    // Legacy transfers alone keep confidence LOW regardless of verification.
    if (a.legacyTransferCount === 0 && verified?.has(a.walletId)) {
      confidence = 'HIGH';
      reason =
        'No unresolved transfers and the initial balance is independently verified, so the ledger-derived expected balance is authoritative.';
    }

    proposals.push({
      walletId: a.walletId,
      name: a.name,
      classification: a.classification,
      currentBalance: a.stored.toString(),
      expectedBalance: a.expected.toString(),
      difference: a.expected.minus(a.stored).toString(),
      confidence,
      reason,
      requiresManualInvestigation: confidence === 'LOW',
      autoApplyEligible: confidence === 'HIGH',
    });
  }

  return proposals;
}
