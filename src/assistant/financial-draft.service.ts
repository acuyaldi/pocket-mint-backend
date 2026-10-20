import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { formatReportingDate, parseBusinessDate } from '../domain/reportingTime';
import { TransactionConcurrencyError, TransactionError } from '../services/transaction.errors';
import { TRANSFER_SOURCE_TYPES, type TransactionService } from '../services/transaction.service';
import { isTransactionTimeout, withPrismaErrorSwallowed, withPrismaErrorTranslation } from '../utils/prismaErrors';
import { lockConversation } from './conversation.service';
import { logEvent } from '../utils/logger';
import { AssistantError } from './errors';
import { effectiveDraftStatus } from './effective-status';
import { ASSISTANT_FINANCIAL_DRAFT_TTL_MS, renderTransactionDraftPreview, validateIdempotencyKey } from './financial-draft';
import type { TransactionCreateInput } from './tools';
import type { AssistantCaptureField } from '../generated/prisma/client';
import type { CaptureEventEmitter } from './capture-events';

const CONFIRM_INTENT = 'transaction.create.confirm';
const CANCEL_INTENT = 'transaction.create.cancel';
/**
 * Interactive-transaction budget for confirm() only — the Prisma default
 * (timeout 5000) is too tight for ~16 round-trips to a far pooler (Jakarta →
 * ap-southeast-2 ≈ 250–350 ms each). Every other transaction keeps the default.
 */
export const CONFIRM_TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;
type DraftReadyTransactionInput = TransactionCreateInput & { walletId: string; categoryId?: string; date: string };

/** Fields the user may override when confirming a draft. All optional — missing fields use the draft's original values. */
export interface DraftConfirmOverride {
  amount?: number;
  walletId?: string;
  /** Destination wallet override — TRANSFER drafts only. */
  toWalletId?: string;
  categoryId?: string;
  description?: string;
  /** YYYY-MM-DD in the user's reporting timezone. */
  date?: string;
}

/**
 * Row shape needed by `confirm()` to merge overrides — a subset of the full
 * `AssistantFinancialDraft` row.
 */
export interface DraftRowForValidation {
  transactionType: string;
  amount: Prisma.Decimal;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  transactionDate: Date;
  description: string | null;
}

function preview(input: DraftReadyTransactionInput & {
  walletDisplayLabel?: string;
  toWalletDisplayLabel?: string;
  merchantDisplayLabel?: string;
}, categoryName?: string) {
  return {
    type: input.type,
    amount: input.amount,
    ...(input.walletDisplayLabel === undefined
      ? { walletId: input.walletId }
      : { wallet: input.walletDisplayLabel }),
    // TRANSFER never carries a category — only INCOME/EXPENSE do.
    ...(input.type === 'TRANSFER' ? {} : { categoryId: input.categoryId, category: categoryName }),
    ...(input.type === 'TRANSFER'
      ? (input.toWalletDisplayLabel === undefined
        ? { toWalletId: input.toWalletId }
        : { toWallet: input.toWalletDisplayLabel })
      : {}),
    ...(input.merchantDisplayLabel === undefined
      ? {}
      : { merchant: input.merchantDisplayLabel }),
    date: input.date,
    // Raw ISO (YYYY-MM-DD) business date, additive alongside `date` — only the
    // authenticated draft owner ever sees this preview, so it is safe to expose
    // for faithful edit-mode prefill without a second lookup.
    transactionDate: input.date,
    ...(input.description === undefined ? {} : { description: input.description }),
  };
}

/**
 * Archived-conversation guard (Phase 38.1) for confirm()/cancel() — the Web
 * routes and the Telegram buttons both land here. Row-locks the draft's
 * conversation for the rest of the caller's transaction: FOR NO KEY UPDATE
 * conflicts with a concurrent archive/restore (UPDATE) and delete, so the
 * status read here cannot change before this transaction commits — a confirm
 * either commits while the conversation is ACTIVE or is rejected — but it
 * does not block the FK inserts of turns/messages. Rejection writes nothing:
 * the draft stays PENDING_CONFIRMATION and becomes confirmable again once the
 * conversation is restored (until its TTL).
 */
async function assertConversationActive(tx: Prisma.TransactionClient, conversationId: string): Promise<void> {
  const status = await lockConversation(tx, conversationId);
  if (!status) throw AssistantError.draftNotFound();
  if (status !== 'ACTIVE') throw AssistantError.conversationArchived();
}

export function createAssistantFinancialDraftService(
  db: PrismaClient,
  transactions: TransactionService,
  deps?: (() => {
    inferCategoryId?: (userId: string, type: 'INCOME' | 'EXPENSE', hint: string | undefined, tx?: Prisma.TransactionClient) => Promise<string | undefined>;
  }) | {
    inferCategoryId?: (userId: string, type: 'INCOME' | 'EXPENSE', hint: string | undefined, tx?: Prisma.TransactionClient) => Promise<string | undefined>;
  },
  clock: () => Date = () => new Date(),
  captureEvents?: CaptureEventEmitter,
) {
  const emit: CaptureEventEmitter = captureEvents ?? (async () => undefined);

  async function prepare(input: DraftReadyTransactionInput & { walletDisplayLabel?: string; toWalletDisplayLabel?: string; merchantDisplayLabel?: string; userId: string; conversationId: string; turnId: string; executionId: string; now?: Date; transaction?: Prisma.TransactionClient }) {
    const client = input.transaction ?? db;
    const isTransfer = input.type === 'TRANSFER';
    const wallet = await client.wallet.findFirst({ where: { id: input.walletId, userId: input.userId }, select: { id: true, type: true } });
    if (!wallet) throw AssistantError.draftNotFound();

    let category: { id: string; name: string } | null = null;
    let toWallet: { id: string } | null = null;
    if (isTransfer) {
      if (input.categoryId) throw AssistantError.invalidInput('transaction.create', 'TRANSFER does not accept a category');
      if (!input.toWalletId) throw AssistantError.draftNotFound();
      if (input.toWalletId === input.walletId) throw AssistantError.invalidInput('transaction.create', 'Wallet asal dan tujuan tidak boleh sama');
      if (!TRANSFER_SOURCE_TYPES.includes(wallet.type)) {
        throw AssistantError.invalidInput('transaction.create', 'Sumber transfer harus Kas, Bank, atau E-Wallet');
      }
      toWallet = await client.wallet.findFirst({ where: { id: input.toWalletId, userId: input.userId }, select: { id: true } });
      if (!toWallet) throw AssistantError.draftNotFound();
    } else {
      if (!input.categoryId) throw AssistantError.draftNotFound();
      category = await client.category.findFirst({
        where: { id: input.categoryId, userId: input.userId, type: input.type as 'INCOME' | 'EXPENSE' },
        select: { id: true, name: true },
      });
      if (!category) throw AssistantError.draftNotFound();
    }

    const now = input.now ?? new Date();
    // P2003: the conversation (or its turn/execution) was deleted after the
    // turn began (Phase 38.2) — a typed 404, not a draft-preparation 500.
    const row = await withPrismaErrorTranslation(() => client.assistantFinancialDraft.create({ data: {
      userId: input.userId, conversationId: input.conversationId, originatingTurnId: input.turnId,
      originatingExecutionId: input.executionId, operation: 'transaction.create', transactionType: input.type,
      amount: new Prisma.Decimal(input.amount), walletId: input.walletId,
      toWalletId: isTransfer ? input.toWalletId : null,
      categoryId: isTransfer ? null : input.categoryId,
      transactionDate: parseBusinessDate(input.date, reportingConfig.timezone), description: input.description ?? null,
      expiresAt: new Date(now.getTime() + ASSISTANT_FINANCIAL_DRAFT_TTL_MS),
    }}), { P2003: () => AssistantError.conversationNotFound() });
    return {
      draftId: row.id,
      status: row.status,
      expiresAt: row.expiresAt,
      preview: preview(input, category?.name),
      confirmationRequired: true,
      renderedText: renderTransactionDraftPreview(
        input,
        input.walletDisplayLabel,
        category?.name,
        input.merchantDisplayLabel,
        input.toWalletDisplayLabel,
      ),
    };
  }

  async function confirm(userId: string, draftId: string, keyValue: unknown, correlationId: string, overrides?: DraftConfirmOverride) {
    const key = validateIdempotencyKey(keyValue);
    // Resolve deps lazily — supports deferred wiring to break the circular dependency with application service.
    const resolvedDeps = typeof deps === 'function' ? deps() : deps;
    // Filled inside the transaction, emitted only after it commits (Phase 35.1).
    let editedFields: AssistantCaptureField[] = [];
    try {
      const result = await db.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${draftId}, 0))::text AS "lock"`);
        const existingKey = await tx.assistantIdempotencyRecord.findUnique({ where: { userId_key: { userId, key } } });
        if (existingKey && existingKey.draftId !== draftId) throw AssistantError.idempotencyConflict();
        let draft = await tx.assistantFinancialDraft.findFirst({ where: { id: draftId, userId } });
        if (!draft) throw AssistantError.draftNotFound();
        if (draft.status === 'COMMITTED' && draft.transactionId) {
          return { ...committedResult(draft), idempotencyOutcome: 'replay' as const };
        }
        const now = clock();
        // A terminal draft keeps answering with its own status (below); only a
        // still-actionable one is held back by an archived conversation.
        if (draft.status === 'PENDING_CONFIRMATION') await assertConversationActive(tx, draft.conversationId);
        if (effectiveDraftStatus(draft, now) !== draft.status) {
          // Lazy EXPIRED transition (Phase 37.3). Race-safe against a
          // concurrent confirm/cancel on the SAME draft: both acquired the
          // advisory lock above, serializing them — only the first to reach
          // here performs this write, the second re-reads a status that is
          // already non-PENDING_CONFIRMATION and falls into the generic
          // conflict guard below. Race-safe against a concurrent
          // deleteOwnedConversation (which cascade-deletes this draft): that
          // is a DIFFERENT transaction the advisory lock does not cover, so
          // this write can lose a real TOCTOU and throw Prisma P2025 —
          // translated into the same typed 404 `owned()`-style lookups use,
          // never an unhandled 500 (same helper as Phase 37.2).
          draft = await withPrismaErrorTranslation(
            // `draftId` (the function parameter) is the same row — `draft.id`
            // would re-narrow to possibly-null inside this closure.
            () => tx.assistantFinancialDraft.update({ where: { id: draftId }, data: { status: 'EXPIRED' } }),
            { P2025: () => AssistantError.draftNotFound() },
          );
          return { error: AssistantError.draftConflict('EXPIRED') } as const;
        }
        // Everything else (COMMITTED, CANCELLED, EXPIRED, FAILED) is terminal
        // from confirm()'s point of view: no status reachable here ever
        // transitions back to PENDING_CONFIRMATION, so this single allowlist
        // check ("must still be PENDING_CONFIRMATION") is the one place an
        // illegal confirm-from-a-terminal-state is rejected. FAILED
        // specifically is never auto-replayed — there is no code path
        // anywhere that re-attempts the underlying transaction for a FAILED
        // draft; `draftConflict('FAILED')` here is the terminal, explicit
        // answer, and the caller's only legal recovery is starting a new
        // draft from a fresh message (see docs/assistant-stuck-states.md).
        if (draft.status !== 'PENDING_CONFIRMATION') throw AssistantError.draftConflict(draft.status);

        // ---- Merge overrides with immutable draft values (override wins, draft is fallback) ----
        // Type itself is never overridable — DraftConfirmOverride has no `type`
        // field, so a confirmed transaction's type always equals the draft's.
        const effectiveType = draft.transactionType as 'INCOME' | 'EXPENSE' | 'TRANSFER';
        const isTransfer = effectiveType === 'TRANSFER';
        const effectiveAmount = overrides?.amount !== undefined ? new Prisma.Decimal(overrides.amount) : draft.amount;
        const effectiveWalletId = overrides?.walletId ?? draft.walletId;
        const effectiveToWalletId = overrides?.toWalletId ?? draft.toWalletId ?? undefined;
        const effectiveDate = overrides?.date ?? formatReportingDate(draft.transactionDate, reportingConfig.timezone);
        const descriptionChanged = overrides?.description !== undefined && overrides.description !== (draft.description ?? undefined);
        const effectiveDescription = overrides?.description !== undefined ? overrides.description : (draft.description ?? undefined);

        if (overrides?.toWalletId !== undefined && !isTransfer) {
          throw AssistantError.invalidInput('transaction.create.confirm', 'toWalletId override is only valid for a TRANSFER draft');
        }
        if (overrides?.categoryId !== undefined && isTransfer) {
          throw AssistantError.invalidInput('transaction.create.confirm', 'categoryId override is not valid for a TRANSFER draft');
        }

        // ---- Re-run deterministic validation only for caller-supplied overrides ----
        // The draft's own walletId/categoryId were already validated at prepare()
        // time; re-checking them here would intercept a since-changed domain state
        // (e.g. a deleted or retyped category) with a generic 404 and skip the
        // FAILED-lifecycle recording that transactions.createTransaction() below
        // already produces for that case. Only an explicit override — untrusted
        // input like prepare()'s — needs this ownership/type gate up front.
        // 1. Validate source wallet ownership (and, for TRANSFER, source type) only when overridden
        if (overrides?.walletId !== undefined) {
          const wallet = await tx.wallet.findFirst({ where: { id: effectiveWalletId, userId }, select: { id: true, type: true } });
          if (!wallet) throw AssistantError.draftNotFound();
          if (isTransfer && !TRANSFER_SOURCE_TYPES.includes(wallet.type)) {
            throw AssistantError.invalidInput('transaction.create.confirm', 'Sumber transfer harus Kas, Bank, atau E-Wallet');
          }
        }

        // 1b. Validate destination wallet ownership only when overridden
        if (isTransfer && overrides?.toWalletId !== undefined) {
          const toWallet = await tx.wallet.findFirst({ where: { id: effectiveToWalletId, userId }, select: { id: true } });
          if (!toWallet) throw AssistantError.draftNotFound();
        }

        // 1c. Same-wallet rejection — re-checked whenever either side changed via override
        if (isTransfer && (overrides?.walletId !== undefined || overrides?.toWalletId !== undefined) && effectiveWalletId === effectiveToWalletId) {
          throw AssistantError.invalidInput('transaction.create.confirm', 'Wallet asal dan tujuan tidak boleh sama');
        }

        // 2. Determine effective category (rule priority: explicit user choice > backend inference > draft proposal). TRANSFER never has one.
        let effectiveCategoryId: string | undefined;
        if (isTransfer) {
          effectiveCategoryId = undefined;
        } else if (overrides?.categoryId !== undefined) {
          const category = await tx.category.findFirst({
            where: { id: overrides.categoryId, userId, type: effectiveType },
            select: { id: true },
          });
          if (!category) throw AssistantError.draftNotFound();
          effectiveCategoryId = overrides.categoryId;
        } else if (descriptionChanged && resolvedDeps?.inferCategoryId) {
          const inferred = await resolvedDeps.inferCategoryId(userId, effectiveType, effectiveDescription, tx);
          effectiveCategoryId = inferred ?? draft.categoryId ?? undefined;
        } else {
          effectiveCategoryId = draft.categoryId ?? undefined;
        }

        // 3. Parse and validate date
        const parsedDate = parseBusinessDate(effectiveDate, reportingConfig.timezone);

        // Capture-event bookkeeping only (Phase 35.1): which overrides actually
        // changed a draft value. Read-only — never feeds the transaction below.
        editedFields = [
          ...(overrides?.amount !== undefined && !effectiveAmount.equals(draft.amount) ? ['AMOUNT' as const] : []),
          ...(overrides?.walletId !== undefined && effectiveWalletId !== draft.walletId ? [isTransfer ? 'SOURCE_WALLET' as const : 'WALLET' as const] : []),
          ...(overrides?.toWalletId !== undefined && effectiveToWalletId !== draft.toWalletId ? ['DESTINATION_WALLET' as const] : []),
          ...(overrides?.categoryId !== undefined && effectiveCategoryId !== draft.categoryId ? ['CATEGORY' as const] : []),
          ...(descriptionChanged ? ['DESCRIPTION' as const] : []),
          ...(overrides?.date !== undefined && overrides.date !== formatReportingDate(draft.transactionDate, reportingConfig.timezone) ? ['DATE' as const] : []),
        ];

        // ---- Build canonical transaction input ----
        // Turn and execution rows are written once, already in their final
        // SUCCEEDED state: a RUNNING → SUCCEEDED update pair inside this same
        // transaction was never visible outside it (any failure rolls the
        // rows back), so it only cost two extra round-trips.
        const turn = await tx.assistantTurn.create({ data: { conversationId: draft.conversationId, correlationId, intent: CONFIRM_INTENT, locale: 'id-ID', status: 'SUCCEEDED', finishedAt: now } });
        await tx.assistantMessage.create({ data: { conversationId: draft.conversationId, turnId: turn.id, role: 'USER', source: 'CANONICAL_FALLBACK', content: `Konfirmasi draft transaksi ${draft.id}.` } });
        const executionStartedAt = new Date();

        const created = await transactions.createTransaction({
          userId,
          type: effectiveType,
          amount: effectiveAmount,
          walletId: effectiveWalletId,
          ...(isTransfer ? { toWalletId: effectiveToWalletId } : { categoryId: effectiveCategoryId }),
          date: parsedDate.toISOString(),
          description: effectiveDescription,
        }, { transaction: tx, relations: false });

        const claimed = await tx.assistantFinancialDraft.updateMany({ where: { id: draft.id, userId, status: 'PENDING_CONFIRMATION', transactionId: null }, data: { status: 'COMMITTED', committedAt: now, transactionId: created.id } });
        if (claimed.count !== 1) throw AssistantError.draftConflict('TERMINAL');
        // One write instead of create-then-update. A same-key race on another
        // draft still loses here with P2002 and rolls back (handled below).
        if (existingKey) await tx.assistantIdempotencyRecord.update({ where: { userId_key: { userId, key } }, data: { transactionId: created.id } });
        else await tx.assistantIdempotencyRecord.create({ data: { userId, draftId, operation: CONFIRM_INTENT, key, transactionId: created.id } });

        // No ASSISTANT chat bubble for confirm — the UI shows a toast instead.
        await tx.assistantToolExecution.create({ data: { conversationId: draft.conversationId, turnId: turn.id, toolId: CONFIRM_INTENT, capability: 'transaction.create', riskLevel: 'HIGH', policyDecision: 'EXPLICITLY_CONFIRMED', status: 'SUCCEEDED', correlationId, startedAt: executionStartedAt, completedAt: now, idempotencyKey: key, redactedInput: { draftId: draft.id }, outputSummary: { draftId: draft.id, transactionId: created.id, status: 'COMMITTED' } } });
        // Phase 37.4 — a concurrent deleteOwnedConversation can cascade-delete
        // the conversation between the draft-claim above and this touch. The
        // draft is already COMMITTED and the transaction already created in
        // THIS SAME transaction — losing a real financial commit over this
        // last bookkeeping write would be far worse than skipping it, so
        // no-op + log instead of throwing (same decision as the turn-finalize
        // family in conversation.service.ts).
        await withPrismaErrorSwallowed(
          () => tx.assistantConversation.update({ where: { id: draft.conversationId }, data: { lastActivityAt: now } }),
          { P2025: () => logEvent('warn', { event: 'assistant.conversation_race_skip', stage: 'financialDraft.confirm.commit', conversationId: draft.conversationId, draftId: draft.id }) },
        );
        return { draftId: draft.id, status: 'COMMITTED' as const, transactionId: created.id, conversationId: draft.conversationId, turnId: turn.id, idempotencyOutcome: 'new' as const };
      }, CONFIRM_TRANSACTION_OPTIONS);
      if ('error' in result) {
        // Only reachable after the lazy EXPIRED transition committed above.
        await emit({ type: 'DRAFT_EXPIRED', entityId: draftId });
        throw result.error;
      }
      if (result.idempotencyOutcome === 'new') {
        if (editedFields.length > 0) await emit({ type: 'DRAFT_EDITED', entityId: draftId, fields: editedFields });
        await emit({ type: 'DRAFT_CONFIRMED', entityId: draftId });
      }
      return result;
    } catch (error) {
      if (error instanceof AssistantError) throw error;
      // Rolled back, draft still PENDING_CONFIRMATION: never FAILED. Retrying
      // with the same Idempotency-Key is safe either way — it commits once or
      // replays the committed result.
      if (isTransactionTimeout(error, 'financialDraft.confirm')) throw AssistantError.transactionTimeout();
      if ((error as { code?: string }).code === 'P2002') {
        const existingKey = await db.assistantIdempotencyRecord.findUnique({ where: { userId_key: { userId, key } }, select: { draftId: true } });
        if (existingKey && existingKey.draftId !== draftId) throw AssistantError.idempotencyConflict();
      }
      if (error instanceof TransactionConcurrencyError) {
        // Phase 37.4 — a transient concurrency race inside createTransaction
        // (the wallet/category vanished between this confirm's own ownership
        // checks and the write), NOT a genuine business failure. The whole
        // confirm $transaction already rolled back, so the draft is
        // untouched — still PENDING_CONFIRMATION. Deliberately rethrown
        // as-is, before the TransactionError branch below, so it is never
        // swept into FAILED: the user can edit the draft (Phase 34) to point
        // at a different wallet/category and retry confirm.
        throw error;
      }
      if (error instanceof TransactionError) {
        // FAILED is a terminal, one-way transition (Phase 37.3): nothing in
        // this codebase ever moves a draft OUT of FAILED, and nothing ever
        // auto-replays the underlying transaction attempt for it — see the
        // comment on the PENDING_CONFIRMATION guard above. Guarded on the
        // draft still being PENDING_CONFIRMATION (a no-op if it already
        // raced to some other terminal state), and the write itself is
        // translated against the same conversation-delete TOCTOU as the
        // EXPIRED transition above, for the same reason.
        const failed = await db.$transaction(async (tx) => {
          const draft = await tx.assistantFinancialDraft.findFirst({ where: { id: draftId, userId, status: 'PENDING_CONFIRMATION' } });
          if (!draft) return false;
          const now = new Date();
          const turn = await tx.assistantTurn.create({ data: { conversationId: draft.conversationId, correlationId, intent: CONFIRM_INTENT, locale: 'id-ID', status: 'FAILED', safeErrorCode: error.code, finishedAt: now } });
          await tx.assistantMessage.create({ data: { conversationId: draft.conversationId, turnId: turn.id, role: 'USER', source: 'CANONICAL_FALLBACK', content: `Konfirmasi draft transaksi ${draft.id}.` } });
          await tx.assistantToolExecution.create({ data: { conversationId: draft.conversationId, turnId: turn.id, toolId: CONFIRM_INTENT, capability: 'transaction.create', riskLevel: 'HIGH', policyDecision: 'EXPLICITLY_CONFIRMED', status: 'FAILED', correlationId, completedAt: now, safeErrorCode: error.code, idempotencyKey: key, redactedInput: { draftId }, outputSummary: { draftId, status: 'FAILED' } } });
          await withPrismaErrorTranslation(
            () => tx.assistantFinancialDraft.update({ where: { id: draft.id }, data: { status: 'FAILED', failedAt: now } }),
            { P2025: () => AssistantError.draftNotFound() },
          );
          await withPrismaErrorSwallowed(
            () => tx.assistantConversation.update({ where: { id: draft.conversationId }, data: { lastActivityAt: now } }),
            { P2025: () => logEvent('warn', { event: 'assistant.conversation_race_skip', stage: 'financialDraft.confirm.failed', conversationId: draft.conversationId, draftId: draft.id }) },
          );
          return true;
        }, CONFIRM_TRANSACTION_OPTIONS).catch((recordError: unknown) => {
          // FAILED was not recorded, so the draft is still PENDING — same retryable answer.
          throw isTransactionTimeout(recordError, 'financialDraft.confirm.failed') ? AssistantError.transactionTimeout() : recordError;
        });
        if (failed) await emit({ type: 'DRAFT_FAILED', entityId: draftId });
        throw error;
      }
      throw error;
    }
  }

  async function cancel(userId: string, draftId: string, correlationId: string) {
    const result = await cancelInTransaction(userId, draftId, correlationId);
    // A fresh cancel carries turnId; a repeated cancel-of-cancelled does not.
    if (result.status === 'EXPIRED') await emit({ type: 'DRAFT_EXPIRED', entityId: draftId });
    else if ('turnId' in result) await emit({ type: 'DRAFT_CANCELLED', entityId: draftId });
    return result;
  }

  async function cancelInTransaction(userId: string, draftId: string, correlationId: string) {
    return db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${draftId}, 0))::text AS "lock"`);
      let draft = await tx.assistantFinancialDraft.findFirst({ where: { id: draftId, userId } });
      if (!draft) throw AssistantError.draftNotFound();
      if (draft.status === 'CANCELLED') return cancelledResult(draft);
      const now = clock();
      if (draft.status === 'PENDING_CONFIRMATION') await assertConversationActive(tx, draft.conversationId);
      if (effectiveDraftStatus(draft, now) !== draft.status) {
        // Same lazy EXPIRED transition and race-safety rationale as confirm()
        // (Phase 37.3) — serialized against a concurrent confirm()/cancel()
        // on this draft by the shared advisory lock above; translated
        // against a concurrent deleteOwnedConversation's cascade delete,
        // which the lock does not cover.
        draft = await withPrismaErrorTranslation(
          // `draftId` (the function parameter) is the same row — `draft.id`
          // would re-narrow to possibly-null inside this closure.
          () => tx.assistantFinancialDraft.update({ where: { id: draftId }, data: { status: 'EXPIRED' } }),
          { P2025: () => AssistantError.draftNotFound() },
        );
        return { draftId: draft.id, status: 'EXPIRED' as const, conversationId: draft.conversationId };
      }
      // See confirm()'s identical guard for why this single allowlist check
      // is also where cancel() rejects every terminal state, FAILED included.
      if (draft.status !== 'PENDING_CONFIRMATION') throw AssistantError.draftConflict(draft.status);
      const turn = await tx.assistantTurn.create({ data: { conversationId: draft.conversationId, correlationId, intent: CANCEL_INTENT, locale: 'id-ID', status: 'SUCCEEDED', finishedAt: now } });
      await tx.assistantMessage.create({ data: { conversationId: draft.conversationId, turnId: turn.id, role: 'USER', source: 'CANONICAL_FALLBACK', content: `Batalkan draft transaksi ${draft.id}.` } });
      await tx.assistantToolExecution.create({ data: { conversationId: draft.conversationId, turnId: turn.id, toolId: CANCEL_INTENT, capability: 'transaction.create', riskLevel: 'HIGH', policyDecision: 'CANCEL', status: 'SUCCEEDED', correlationId, completedAt: now, redactedInput: { draftId: draft.id }, outputSummary: { draftId: draft.id, status: 'CANCELLED' } } });
      draft = await tx.assistantFinancialDraft.update({ where: { id: draft.id }, data: { status: 'CANCELLED', cancelledAt: now } });
      // Same no-op-and-log decision as confirm()'s conversation touch above.
      await withPrismaErrorSwallowed(
        () => tx.assistantConversation.update({ where: { id: draft.conversationId }, data: { lastActivityAt: now } }),
        { P2025: () => logEvent('warn', { event: 'assistant.conversation_race_skip', stage: 'financialDraft.cancel', conversationId: draft.conversationId, draftId: draft.id }) },
      );
      return cancelledResult(draft, turn.id);
    });
  }

  return { prepare, confirm, cancel };
}

function committedResult(draft: { id: string; transactionId: string | null; conversationId: string }) {
  return { draftId: draft.id, status: 'COMMITTED' as const, transactionId: draft.transactionId!, conversationId: draft.conversationId };
}
function cancelledResult(draft: { id: string; conversationId: string }, turnId?: string) {
  return { draftId: draft.id, status: 'CANCELLED' as const, conversationId: draft.conversationId, ...(turnId ? { turnId } : {}) };
}

export type AssistantFinancialDraftService = ReturnType<typeof createAssistantFinancialDraftService>;
