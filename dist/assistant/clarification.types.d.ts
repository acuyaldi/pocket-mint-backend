import type { EntityType } from './entity-resolution';
export type ClarificationLifecycleStatus = 'PENDING' | 'CONSUMED' | 'CANCELLED' | 'STALE';
/**
 * Canonical trusted context v1.
 * Created ONLY from already-validated TransactionCreateToolInput.
 * Never copies provider fields, confidence, evidence, or metadata.
 */
export interface CanonicalContext {
    readonly version: 1;
    readonly operation: 'transaction.create';
    readonly type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    readonly amount: string;
    readonly date?: string;
    readonly description?: string;
    readonly wallet?: {
        readonly internalId: string;
        readonly displayLabel: string;
    };
    /** Destination wallet — TRANSFER only. Never present for INCOME/EXPENSE. */
    readonly toWallet?: {
        readonly internalId: string;
        readonly displayLabel: string;
    };
    readonly merchant?: {
        readonly internalId: string;
        readonly displayLabel: string;
    };
    readonly category?: {
        readonly internalId: string;
        readonly displayLabel: string;
        readonly categoryType: string;
    };
    /**
     * Additive role discriminator for an open `entityType: 'wallet'`
     * clarification on a TRANSFER draft — which slot the answer fills.
     * Undefined (or 'wallet') for INCOME/EXPENSE and for the TRANSFER source;
     * 'toWallet' for the TRANSFER destination. Never overwrites the other slot.
     */
    readonly pendingWalletRole?: 'wallet' | 'toWallet';
    readonly resumeAt: string;
    /** Optional reference fields preserved through the chain. */
    readonly merchantReference?: string;
    readonly categoryReference?: string;
    readonly toWalletReference?: string;
}
export interface ClarificationOptionToken {
    /** One-time token presented by the user to select this option. */
    readonly token: string;
    /** Human-readable label. */
    readonly label: string;
    /** Optional type discriminator (e.g. "BANK", "E_WALLET"). */
    readonly discriminator?: string;
}
/** Safe projection of a single clarification option — no token, no internal ID. */
export interface SafeClarificationOption {
    readonly label: string;
    readonly discriminator?: string;
}
/**
 * Which TRANSFER wallet slot an open wallet clarification fills (Phase 38) —
 * same closed values as the capture taxonomy's AssistantCaptureField, derived
 * from `pendingWalletRole`. `sourceWalletLabel` is the user's own already
 * chosen source wallet, so the destination question can show it first.
 */
export interface TransferWalletClarification {
    readonly field: 'SOURCE_WALLET' | 'DESTINATION_WALLET';
    readonly sourceWalletLabel?: string;
}
/** Creation response — carries newly issued one-time tokens. */
export interface ClarificationCreationProjection {
    readonly clarificationId: string;
    readonly entityType: EntityType;
    readonly prompt: string;
    readonly options: readonly ClarificationOptionToken[];
    readonly expiresAt: string;
    /** Present only for a TRANSFER wallet clarification. */
    readonly transfer?: TransferWalletClarification;
}
export type GuidedClarificationField = {
    readonly field: 'date';
    readonly required: true;
    readonly input: {
        readonly type: 'date';
        readonly min?: string;
        readonly max?: string;
    };
} | {
    readonly field: 'category';
    readonly required: true;
    readonly input: {
        readonly type: 'text';
        readonly placeholder?: string;
    };
};
export interface GuidedClarificationProjection {
    readonly kind: 'guided';
    readonly clarificationId: string;
    readonly fields: readonly GuidedClarificationField[];
    readonly expiresAt: string;
}
/** Safe public projection of a clarification request — no tokens. */
export interface ClarificationProjection {
    readonly clarificationId: string;
    readonly entityType: EntityType;
    readonly prompt: string;
    readonly options: readonly SafeClarificationOption[];
    readonly expiresAt: string;
    /** Present only for a TRANSFER wallet clarification. */
    readonly transfer?: TransferWalletClarification;
}
/** Safe terminal clarification summary. */
export interface TerminalClarification {
    readonly clarificationId: string;
    readonly entityType: EntityType;
    readonly status: ClarificationLifecycleStatus;
    readonly terminalCode?: string;
    readonly restartRequired: boolean;
    /** Raw status column (Phase 38.1). Differs from `status` only for a past-TTL row lazy expiry hasn't written yet (`PENDING`). */
    readonly recordedStatus: ClarificationLifecycleStatus;
    /** Turn that asked this clarification (Phase 38.1). */
    readonly originatingTurnId: string;
}
/** Safe draft metadata for the conversation state projection. */
export interface SafeDraftMetadata {
    readonly draftId: string;
    readonly status: string;
    readonly preview: Record<string, unknown>;
}
/**
 * The conversation's most recent draft, when it is effectively terminal without
 * being committed (Phase 38.1). `status` is the effective status; `recordedStatus`
 * is the column, which still reads `PENDING_CONFIRMATION` for a draft that
 * expired untouched.
 */
export interface TerminalDraftMetadata {
    readonly draftId: string;
    readonly status: 'EXPIRED' | 'FAILED' | 'CANCELLED';
    readonly recordedStatus: string;
    readonly originatingTurnId: string;
}
/**
 * A turn still `RUNNING` on this conversation (Phase 27) — lets the client
 * disable duplicate submission and show a "still processing" state after a
 * dropped connection, instead of guessing from a stale local view.
 */
export interface ActiveTurnMetadata {
    readonly turnId: string;
    readonly intent: string;
    readonly startedAt: string;
}
/** Bounded assistantState projection exposed to the client. */
export interface AssistantStateProjection {
    readonly activeClarification?: ClarificationProjection;
    readonly pendingDraft?: SafeDraftMetadata;
    readonly latestTerminalClarification?: TerminalClarification;
    readonly latestTerminalDraft?: TerminalDraftMetadata;
    readonly activeTurn?: ActiveTurnMetadata;
}
export interface CreateClarificationInput {
    readonly userId: string;
    readonly conversationId: string;
    readonly turnId: string;
    readonly executionId: string;
    readonly entityType: EntityType;
    readonly parentClarificationId?: string;
    readonly trustedContext: CanonicalContext;
    readonly prompt: string;
    readonly options: readonly {
        readonly displayLabel: string;
        readonly discriminator?: string;
        readonly candidateId: string;
    }[];
}
export interface CreateGuidedFieldsClarificationInput {
    readonly userId: string;
    readonly conversationId: string;
    readonly turnId: string;
    readonly executionId: string;
    readonly entityType: 'transaction_fields';
    readonly parentClarificationId?: string;
    readonly trustedContext: CanonicalContext;
    readonly prompt: string;
    readonly fields: readonly GuidedClarificationField[];
}
export interface SelectClarificationInput {
    readonly userId: string;
    readonly conversationId: string;
    readonly token: string;
    readonly correlationId: string;
    /** When provided (HTTP route scoping), the request must match this id exactly. */
    readonly clarificationId?: string;
}
export interface ConsumeGuidedFieldsInput {
    readonly userId: string;
    readonly conversationId: string;
    readonly clarificationId: string;
    readonly correlationId: string;
}
export interface SelectClarificationResult {
    readonly clarificationId: string;
    readonly entityType: EntityType;
    readonly status: 'CONSUMED';
    readonly selectedCandidateId: string;
    readonly selectedDisplayLabel: string;
    readonly trustedContext: CanonicalContext;
    readonly previousTrustedContext: CanonicalContext;
    readonly parentId?: string;
}
export interface ConsumeGuidedFieldsResult {
    readonly clarificationId: string;
    readonly entityType: 'transaction_fields';
    readonly status: 'CONSUMED';
    readonly trustedContext: CanonicalContext;
}
export interface CancelClarificationInput {
    readonly userId: string;
    readonly clarificationId: string;
    readonly reason: string;
    /** When provided (HTTP route scoping), the request must match this id exactly. */
    readonly conversationId?: string;
}
/** Result after a successful selection that advances the sequential flow. */
export interface ClarificationAdvanceResult {
    readonly kind: 'next_clarification' | 'draft_ready';
    readonly consumedClarificationId: string;
    /** Present if another clarification is needed. */
    readonly nextClarification?: ClarificationProjection;
    /** Present when all clarifications are resolved. */
    readonly draftPreview?: SafeDraftMetadata;
}
