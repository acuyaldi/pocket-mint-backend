import { Prisma, type AssistantChannel, type ChannelDeliveryStatus, type PrismaClient } from '../generated/prisma/client';
import { AssistantError } from './errors';
import { assertAssistantMessageLength } from './persistence';
import { validateIdempotencyKey } from './financial-draft';
import { withPrismaErrorTranslation, withPrismaErrorSwallowed } from '../utils/prismaErrors';
import { logEvent } from '../utils/logger';

/**
 * Phase 37.4 — a concurrent `deleteOwnedConversation` cascade-deletes this
 * conversation's turns/messages/tool-executions mid-flight. Unlike group 1's
 * CRUD (archive/restore/delete, Phase 37.2, which answers "404 if gone"),
 * these are internal bookkeeping writes at the end of processing a request
 * that may already have produced its real result elsewhere — throwing here
 * would turn an otherwise-successful response into an error over an
 * unrelated concurrent delete. Decision (docs/assistant-stuck-states.md):
 * no-op, never throw, structured warn log with ids only, never message
 * content. `stage` names the call site so these are easy to tell apart in
 * logs.
 */
function logConversationRaceSkip(stage: string, ids: { conversationId?: string; turnId?: string }): void {
  logEvent('warn', { event: 'assistant.conversation_race_skip', stage, ...ids });
}

/**
 * Global lock order (Phase 38.2, docs/assistant-stuck-states.md): a
 * transaction that writes more than one Assistant row locks the CONVERSATION
 * row first, before any clarification / draft / turn / execution row.
 * deleteOwnedConversation locks the conversation (FOR UPDATE) and then
 * cascades into those children, so the opposite order deadlocks against it.
 * FOR NO KEY UPDATE blocks a concurrent delete/archive/restore until commit
 * but not the FK inserts of turns/messages. Returns the status, or undefined
 * when the conversation is already gone.
 */
export async function lockConversation(tx: Prisma.TransactionClient, conversationId: string): Promise<string | undefined> {
  const rows = await tx.$queryRaw<{ status: string }[]>(
    Prisma.sql`SELECT status::text AS "status" FROM assistant_conversations WHERE id = ${conversationId} FOR NO KEY UPDATE`,
  );
  return rows[0]?.status;
}

import type { AssistantDeliveryStatus, BeginTurnInput, BeginTurnResult, ConversationMessageDto, ConversationSummaryDto, FinalizeToolInput, FinalizeWithoutToolInput, Page } from './conversation.types';

/** Fixed, deterministic display order — also dedupes since each channel appears at most once. */
const CHANNEL_ORDER: AssistantChannel[] = ['WEB', 'TELEGRAM'];
const sourceChannelsOf = (channels: readonly AssistantChannel[]): AssistantChannel[] =>
  CHANNEL_ORDER.filter((channel) => channels.includes(channel));

/** Phase 31 — maps the internal delivery lifecycle to the safe, user-facing status. A retry still in backoff reads as still-in-progress, not failed, since it may yet succeed. Exported for direct unit testing of the mapping. */
export const DELIVERY_STATUS_MAP: Record<ChannelDeliveryStatus, AssistantDeliveryStatus> = {
  PENDING: 'PENDING',
  SENDING: 'PROCESSING',
  SENT: 'DELIVERED',
  FAILED_RETRYABLE: 'PROCESSING',
  FAILED_TERMINAL: 'FAILED',
};

/**
 * Phase 32 — turn-level delivery status. `NOT_APPLICABLE` for a WEB turn (no
 * channel delivery to report); the mapped status for a TELEGRAM turn whose
 * `ChannelOutboundDelivery` row is still retained; `UNKNOWN` for a TELEGRAM
 * turn whose row is no longer retained (retention-purged, or the rare
 * pre-delivery-row race) — an explicit historical-unknown value, distinct
 * from a pre-Phase-31 backend where the field is absent entirely. Never
 * guesses success or failure for data that no longer exists. Exported for
 * direct unit testing.
 */
export function resolveDeliveryStatus(
  channel: AssistantChannel,
  mappedStatus: AssistantDeliveryStatus | undefined,
): AssistantDeliveryStatus {
  if (channel !== 'TELEGRAM') return 'NOT_APPLICABLE';
  return mappedStatus ?? 'UNKNOWN';
}

/** Outcome of claiming a request-level Idempotency-Key for /assistant/messages or /assistant/execute. */
export type IdempotencyClaim =
  | { outcome: 'new' }
  | { outcome: 'in_progress' }
  | { outcome: 'replay'; httpStatus: number; response: unknown };

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const pageArgs = (page?: number, limit?: number) => {
  const p = Number.isInteger(page) && page! > 0 ? page! : 1;
  const l = Number.isInteger(limit) && limit! > 0 ? Math.min(limit!, MAX_LIMIT) : DEFAULT_LIMIT;
  return { page: p, limit: l, skip: (p - 1) * l };
};

export function createAssistantConversationService(db: PrismaClient) {
  async function owned(userId: string, id: string) {
    const conversation = await db.assistantConversation.findFirst({ where: { id, userId } });
    if (!conversation) throw AssistantError.conversationNotFound();
    return conversation;
  }

  async function assertContinuable(userId: string, id: string): Promise<void> {
    const conversation = await owned(userId, id);
    if (conversation.status !== 'ACTIVE') throw AssistantError.conversationNotContinuable();
  }

  async function establishConversation(userId: string, conversationId: string | undefined, locale: string): Promise<string> {
    if (conversationId) {
      await assertContinuable(userId, conversationId);
      return conversationId;
    }
    const created = await db.assistantConversation.create({ data: { userId, locale } });
    return created.id;
  }

  /**
   * Wraps a finalize-family `work` this service runs in its OWN transaction:
   * conversation lock first (lock order above), and a conversation already
   * deleted means there is nothing left to finalize — the same no-op as a
   * swallowed P2025. A caller-supplied transaction is expected to have taken
   * the lock itself (application.service.ts's clarification continuation).
   */
  function lockedOrSkip(stage: string, ids: { conversationId: string; turnId: string }, work: (tx: Prisma.TransactionClient) => Promise<void>) {
    return async (tx: Prisma.TransactionClient): Promise<void> => {
      if (await lockConversation(tx, ids.conversationId) === undefined) {
        logConversationRaceSkip(stage, { conversationId: ids.conversationId, turnId: ids.turnId });
        return;
      }
      await work(tx);
    };
  }

  async function beginTurn(input: BeginTurnInput): Promise<BeginTurnResult> {
    assertAssistantMessageLength(input.content);
    try {
      // P2003: a concurrent deleteOwnedConversation removed the conversation
      // between the read below and the turn/message insert (Phase 38.2).
      return await withPrismaErrorTranslation(() => db.$transaction(async (tx) => {
        let conversationId = input.conversationId;
        if (conversationId) {
          const conversation = await tx.assistantConversation.findFirst({ where: { id: conversationId, userId: input.userId } });
          if (!conversation) throw AssistantError.conversationNotFound();
          if (conversation.status === 'ARCHIVED') throw AssistantError.conversationArchived();
          if (conversation.status !== 'ACTIVE') throw AssistantError.conversationNotContinuable();
        } else {
          const created = await tx.assistantConversation.create({ data: { userId: input.userId, locale: input.locale } });
          conversationId = created.id;
        }
        const now = new Date();
        // Phase 37.4 — `correlationId` is unique; a retried call with the
        // SAME correlationId (e.g. an upstream retry) races this create.
        // Unlike a P2025 (zero rows on an UPDATE, a "soft" Prisma-level
        // decision), a unique-constraint violation is a genuine Postgres
        // error that poisons the current transaction — no further query
        // can run on `tx` until it rolls back. So P2002 here is left to
        // propagate and abort this $transaction entirely; the
        // read-and-return-existing recovery (consistent with Phase 27's
        // idempotency-key replay semantics) happens in the outer catch
        // below, against the plain `db` connection, after rollback.
        const turn = await tx.assistantTurn.create({ data: {
          conversationId, correlationId: input.correlationId, intent: input.intent.slice(0, 255), locale: input.locale,
        }});
        await tx.assistantMessage.create({ data: {
          conversationId, turnId: turn.id, role: 'USER', source: input.source, content: input.content,
        }});
        await withPrismaErrorSwallowed(
          () => tx.assistantConversation.update({ where: { id: conversationId! }, data: { lastActivityAt: now, locale: input.locale } }),
          { P2025: () => logConversationRaceSkip('beginTurn', { conversationId, turnId: turn.id }) },
        );
        return { conversationId, turnId: turn.id };
      }), { P2003: () => AssistantError.conversationNotFound() });
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err;
      // The transaction above already rolled back (Postgres aborts on a
      // real constraint violation) — safe to query fresh now. Only a
      // replay of the SAME logical request is granted: the existing turn
      // must belong to the exact conversationId the caller asked for. A
      // caller that asked for a brand-new conversation (no conversationId)
      // has nothing to verify ownership against, so that case is always a
      // genuine conflict, never guessed into a replay.
      if (!input.conversationId) throw AssistantError.idempotencyConflict();
      const existing = await db.assistantTurn.findUnique({ where: { correlationId: input.correlationId } });
      if (!existing || existing.conversationId !== input.conversationId) throw AssistantError.idempotencyConflict();
      return { conversationId: existing.conversationId, turnId: existing.id };
    }
  }

  async function markTurnRunning(turnId: string): Promise<void> {
    await withPrismaErrorSwallowed(
      () => db.assistantTurn.update({ where: { id: turnId }, data: { status: 'RUNNING' } }),
      { P2025: () => logConversationRaceSkip('markTurnRunning', { turnId }) },
    );
  }

  async function beginToolExecution(input: {
    conversationId: string; turnId: string; correlationId: string; toolId: string; capability: string;
    riskLevel: string; policyDecision: string; redactedInput?: Prisma.InputJsonValue;
  }): Promise<string> {
    // P2003: the conversation/turn was deleted after beginTurn (Phase 38.2).
    const row = await withPrismaErrorTranslation(
      () => db.assistantToolExecution.create({ data: { ...input, status: 'RUNNING' } }),
      { P2003: () => AssistantError.conversationNotFound() },
    );
    return row.id;
  }

  async function finalize(input: FinalizeToolInput, options: { transaction?: Prisma.TransactionClient } = {}): Promise<void> {
    assertAssistantMessageLength(input.assistantContent);
    const work = async (tx: Prisma.TransactionClient) => {
      const now = new Date();
      await tx.assistantToolExecution.update({ where: { id: input.executionId }, data: {
        status: input.status, completedAt: now, durationMs: input.durationMs, safeErrorCode: input.safeErrorCode,
        outputSummary: input.outputSummary,
      }});
      // Skip the ASSISTANT message when content is empty — the Transaction Review
      // workspace replaces chat bubbles for draft creation (Phase 2). All other
      // callers pass non-empty content and are unaffected.
      if (input.assistantContent.length > 0) {
        await tx.assistantMessage.create({ data: {
          conversationId: input.conversationId, turnId: input.turnId, role: 'ASSISTANT',
          source: input.assistantSource, content: input.assistantContent,
        }});
      }
      await tx.assistantTurn.update({ where: { id: input.turnId }, data: {
        status: input.turnStatus, safeErrorCode: input.safeErrorCode, finishedAt: now,
      }});
      await tx.assistantConversation.update({ where: { id: input.conversationId }, data: { lastActivityAt: now } });
    };
    // Phase 37.4 — a concurrent deleteOwnedConversation can cascade-delete
    // the turn/tool-execution/conversation rows this writes to, at any
    // point during `work`. No-op, never throw (see logConversationRaceSkip
    // above) — but ONLY when this function opened and controls the
    // transaction itself: a throw from `db.$transaction(work)`'s own
    // callback is guaranteed to roll back everything `work` did, so
    // swallowing the rejection afterward is safe (nothing partial survives).
    // When the caller supplied its OWN transaction (`options.transaction`),
    // this function is just one participant in an ambient transaction it
    // does not control the commit/rollback of — swallowing here would let
    // this write silently no-op while every other write already made in
    // that same transaction still commits. No current caller in this
    // codebase passes `options.transaction` to finalize(), but this must
    // stay correct if one ever does: let it propagate so the caller's own
    // transaction aborts instead (security review, Phase 37.4).
    if (options.transaction) {
      await work(options.transaction);
      return;
    }
    await withPrismaErrorSwallowed(
      () => db.$transaction(lockedOrSkip('finalize', input, work)),
      { P2025: () => logConversationRaceSkip('finalize', { conversationId: input.conversationId, turnId: input.turnId }) },
    );
  }

  async function finalizeRejected(input: BeginTurnResult & { content: string; safeErrorCode: string }): Promise<void> {
    assertAssistantMessageLength(input.content);
    // Same race-shape and no-op decision as finalize() above.
    await withPrismaErrorSwallowed(
      () => db.$transaction(lockedOrSkip('finalizeRejected', input, async (tx) => {
        const now = new Date();
        await tx.assistantMessage.create({ data: { conversationId: input.conversationId, turnId: input.turnId, role: 'ASSISTANT', source: 'SAFE_ERROR', content: input.content } });
        await tx.assistantTurn.update({ where: { id: input.turnId }, data: { status: 'REJECTED', safeErrorCode: input.safeErrorCode, finishedAt: now } });
        await tx.assistantConversation.update({ where: { id: input.conversationId }, data: { lastActivityAt: now } });
      })),
      { P2025: () => logConversationRaceSkip('finalizeRejected', { conversationId: input.conversationId, turnId: input.turnId }) },
    );
  }

  async function finalizeWithoutTool(input: FinalizeWithoutToolInput, options: { transaction?: Prisma.TransactionClient } = {}): Promise<void> {
    assertAssistantMessageLength(input.assistantContent);
    const work = async (tx: Prisma.TransactionClient) => {
      const now = new Date();
      await tx.assistantMessage.create({ data: {
        conversationId: input.conversationId,
        turnId: input.turnId,
        role: 'ASSISTANT',
        source: input.assistantSource,
        content: input.assistantContent,
      } });
      await tx.assistantTurn.update({ where: { id: input.turnId }, data: {
        status: input.turnStatus,
        safeErrorCode: input.safeErrorCode,
        finishedAt: now,
      } });
      await tx.assistantConversation.update({ where: { id: input.conversationId }, data: { lastActivityAt: now } });
    };
    // Same race-shape, and the same options.transaction carve-out, as
    // finalize() above (security review, Phase 37.4).
    if (options.transaction) {
      await work(options.transaction);
      return;
    }
    await withPrismaErrorSwallowed(
      () => db.$transaction(lockedOrSkip('finalizeWithoutTool', input, work)),
      { P2025: () => logConversationRaceSkip('finalizeWithoutTool', { conversationId: input.conversationId, turnId: input.turnId }) },
    );
  }

  async function listOwnedConversations(userId: string, page?: number, limit?: number): Promise<Page<ConversationSummaryDto>> {
    const p = pageArgs(page, limit);
    const where = { userId };
    const [rows, total] = await Promise.all([
      db.assistantConversation.findMany({ where, orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.limit,
        include: { messages: { where: { role: { in: ['USER', 'ASSISTANT'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 } } }),
      db.assistantConversation.count({ where }),
    ]);
    // The first USER message is the original request that started the conversation — used as
    // the display title, distinct from `lastMessage` (latest message, any role) used for preview
    // search. `distinct` on an indexed (conversationId, createdAt, id)-ordered scan keeps this to
    // one extra bounded query instead of N+1.
    const titleRows = rows.length
      ? await db.assistantMessage.findMany({
          where: { conversationId: { in: rows.map((row) => row.id) }, role: 'USER' },
          orderBy: [{ conversationId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          distinct: ['conversationId'],
          select: { conversationId: true, content: true },
        })
      : [];
    const titleByConversationId = new Map(titleRows.map((row) => [row.conversationId, row.content]));
    const channelRows = rows.length
      ? await db.assistantTurn.groupBy({ by: ['conversationId', 'channel'], where: { conversationId: { in: rows.map((row) => row.id) } } })
      : [];
    const channelsByConversationId = new Map<string, AssistantChannel[]>();
    for (const row of channelRows) {
      channelsByConversationId.set(row.conversationId, [...(channelsByConversationId.get(row.conversationId) ?? []), row.channel]);
    }
    return { items: rows.map((row) => ({
      id: row.id, status: row.status, locale: row.locale, createdAt: row.createdAt,
      updatedAt: row.updatedAt, lastActivityAt: row.lastActivityAt,
      title: titleByConversationId.get(row.id)?.slice(0, 160),
      lastMessage: row.messages[0]?.content.slice(0, 160),
      sourceChannels: sourceChannelsOf(channelsByConversationId.get(row.id) ?? []),
    })), page: p.page, limit: p.limit, total, hasMore: p.skip + rows.length < total };
  }

  async function getOwnedConversation(userId: string, id: string, page?: number, limit?: number) {
    const conversation = await owned(userId, id);
    const p = pageArgs(page, limit);
    const where = { conversationId: id };
    const [messages, total, turns] = await Promise.all([
      db.assistantMessage.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: p.skip, take: p.limit }),
      db.assistantMessage.count({ where }),
      db.assistantTurn.findMany({ where: { conversationId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: {
        id: true, correlationId: true, status: true, intent: true, safeErrorCode: true, startedAt: true, finishedAt: true, channel: true,
        toolExecutions: { orderBy: [{ startedAt: 'asc' }, { id: 'asc' }], select: {
          id: true, toolId: true, capability: true, riskLevel: true, policyDecision: true, status: true,
          correlationId: true, startedAt: true, completedAt: true, durationMs: true, safeErrorCode: true,
        } },
      } }),
    ]);

    // Phase 31 — one additional bounded query (by turn id, same cost profile as
    // the toolExecutions select above), aggregating only already-existing
    // ChannelOutboundDelivery rows. Never selects renderedText, replyMarkup,
    // providerMessageId, or destinationChatId.
    const telegramTurnIds = turns.filter((turn) => turn.channel === 'TELEGRAM').map((turn) => turn.id);
    const deliveryStatusByTurnId = new Map<string, AssistantDeliveryStatus>();
    if (telegramTurnIds.length) {
      const jobs = await db.channelInboundJob.findMany({
        where: { assistantTurnId: { in: telegramTurnIds } },
        select: { assistantTurnId: true, deliveries: { where: { kind: 'SEND_MESSAGE' }, select: { status: true } } },
      });
      for (const job of jobs) {
        const status = job.deliveries[0]?.status;
        if (job.assistantTurnId && status) deliveryStatusByTurnId.set(job.assistantTurnId, DELIVERY_STATUS_MAP[status]);
      }
    }

    return {
      conversation: {
        id: conversation.id, status: conversation.status, locale: conversation.locale, createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt, lastActivityAt: conversation.lastActivityAt,
        sourceChannels: sourceChannelsOf(turns.map((turn) => turn.channel)),
      },
      messages: { items: messages as ConversationMessageDto[], page: p.page, limit: p.limit, total, hasMore: p.skip + messages.length < total },
      turns: turns.map((turn) => ({
        ...turn,
        deliveryStatus: resolveDeliveryStatus(turn.channel, deliveryStatusByTurnId.get(turn.id)),
      })),
    };
  }

  async function archiveOwnedConversation(userId: string, id: string) {
    const conversation = await owned(userId, id);
    if (conversation.status === 'ARCHIVED') return { id, status: conversation.status, archivedAt: conversation.archivedAt };
    if (conversation.status === 'EXPIRED') throw AssistantError.conversationNotContinuable();
    // A concurrent deleteOwnedConversation can remove this row between the
    // `owned()` check above and this write (Phase 37.2) — translate the
    // resulting Prisma P2025 into the same typed 404 `owned()` already
    // throws for an ordinary missing conversation, instead of an unhandled 500.
    const updated = await withPrismaErrorTranslation(
      () => db.assistantConversation.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date() } }),
      { P2025: () => AssistantError.conversationNotFound() },
    );
    return { id: updated.id, status: updated.status, archivedAt: updated.archivedAt };
  }

  async function restoreOwnedConversation(userId: string, id: string) {
    const conversation = await owned(userId, id);
    if (conversation.status === 'ACTIVE') return { id, status: conversation.status, archivedAt: conversation.archivedAt };
    if (conversation.status === 'EXPIRED') throw AssistantError.conversationNotContinuable();
    // Same concurrent-delete TOCTOU as archiveOwnedConversation (Phase 37.2).
    const updated = await withPrismaErrorTranslation(
      () => db.assistantConversation.update({ where: { id }, data: { status: 'ACTIVE', archivedAt: null } }),
      { P2025: () => AssistantError.conversationNotFound() },
    );
    return { id: updated.id, status: updated.status, archivedAt: updated.archivedAt };
  }

  /**
   * Permanent delete — distinct from archive. Schema-declared cascades remove only the
   * conversation's own Assistant rows (messages, turns, tool executions, financial drafts,
   * provider executions, idempotency records, clarification requests). `Transaction` has no
   * relation to `AssistantConversation` at all — it's only referenced *from*
   * `AssistantFinancialDraft.transactionId` / `AssistantIdempotencyRecord.transactionId`
   * (both `onDelete: Restrict`, which guards the Transaction against deletion while
   * referenced, not the reverse), so cascading away a conversation's drafts and idempotency
   * records never touches the transactions they reference. `ChannelConnection.conversationId`
   * is the one real `onDelete: SetNull`: the channel link survives, pointing at nothing.
   * Matches "deleting Assistant history never cascades to a transaction"
   * (docs/api/assistant-conversations.md).
   */
  async function deleteOwnedConversation(userId: string, id: string): Promise<{ id: string }> {
    await owned(userId, id);
    // A concurrent/retried delete of the same conversation can pass the
    // `owned()` check above and then hit Prisma P2025 on the delete itself
    // (the row is already gone) — translate that into the same typed 404
    // instead of propagating a raw Prisma error as an unexpected 500
    // (Phase 37.2, mirrors walletAlias.service.ts's remove()).
    await withPrismaErrorTranslation(
      () => db.assistantConversation.delete({ where: { id } }),
      { P2025: () => AssistantError.conversationNotFound() },
    );
    return { id };
  }

  /**
   * Insert-first-wins claim on a Web-originated request's Idempotency-Key — the same
   * concurrency pattern as the Telegram channel guard (assistantOperationGuard.ts),
   * not financial-draft.service.ts's whole-request advisory lock: /messages and
   * /execute can hold an outbound LLM call open for seconds, so nothing here may
   * hold a DB lock across the actual work. A `RUNNING` row is claimed synchronously
   * before that work starts; `resolveIdempotencyKey` fills in the outcome after.
   * An unresolved `RUNNING` row (e.g. a process crash mid-request) stays in progress
   * indefinitely — the same fail-closed gap the channel guard's `ambiguous` outcome
   * already accepts; recovery/dead-letter handling is out of scope for this phase.
   */
  async function claimIdempotencyKey(userId: string, keyValue: string, operation: string): Promise<IdempotencyClaim> {
    const key = validateIdempotencyKey(keyValue);
    try {
      await db.assistantIdempotencyRecord.create({ data: { userId, key, operation, status: 'RUNNING' } });
      return { outcome: 'new' };
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const existing = await db.assistantIdempotencyRecord.findUniqueOrThrow({ where: { userId_key: { userId, key } } });
      if (existing.operation !== operation) throw AssistantError.idempotencyConflict();
      if (existing.status === 'RUNNING') return { outcome: 'in_progress' };
      return { outcome: 'replay', httpStatus: existing.responseStatus ?? 200, response: existing.responseBody };
    }
  }

  /** Terminal outcome for a key claimed via `claimIdempotencyKey`. Never throws — a logging-only failure here must not mask the real response. */
  async function resolveIdempotencyKey(userId: string, keyValue: string, result: { httpStatus: number; response: unknown; turnId?: string }): Promise<void> {
    const key = validateIdempotencyKey(keyValue);
    await db.assistantIdempotencyRecord.update({
      where: { userId_key: { userId, key } },
      data: {
        status: 'COMPLETED',
        responseStatus: result.httpStatus,
        responseBody: result.response as Prisma.InputJsonValue,
        ...(result.turnId ? { turnId: result.turnId } : {}),
      },
    }).catch(() => undefined);
  }

  /**
   * Releases a key claimed via `claimIdempotencyKey` when the underlying operation threw
   * before producing a terminal result to resolve (e.g. `assertContinuable` rejecting an
   * already-archived conversation before any turn exists) — otherwise that key would stay
   * `RUNNING` forever even though the process didn't crash. Only removes a still-`RUNNING`
   * row, so it can never clobber a terminal row written by a concurrent request. Never
   * throws — the caller is already rethrowing the real error.
   */
  async function releaseIdempotencyKey(userId: string, keyValue: string): Promise<void> {
    const key = validateIdempotencyKey(keyValue);
    await db.assistantIdempotencyRecord.deleteMany({ where: { userId, key, status: 'RUNNING' } }).catch(() => undefined);
  }

  return { assertContinuable, assertOwned: owned, establishConversation, beginTurn, markTurnRunning, beginToolExecution, finalize, finalizeRejected, finalizeWithoutTool, listOwnedConversations, getOwnedConversation, archiveOwnedConversation, restoreOwnedConversation, deleteOwnedConversation, claimIdempotencyKey, resolveIdempotencyKey, releaseIdempotencyKey };
}

export type AssistantConversationService = ReturnType<typeof createAssistantConversationService>;
