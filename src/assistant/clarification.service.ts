// ============================================================
// Clarification Engine — aggregate service
// ------------------------------------------------------------
// Persisted clarification lifecycle. No provider dependency.
// Token-based deterministic selection (no NL interpretation).
// All mutations are atomic (Prisma transactions).
// ============================================================

import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { formatReportingDate } from '../domain/reportingTime';
import { AssistantError } from './errors';
import type {
  AssistantStateProjection,
  CancelClarificationInput,
  CanonicalContext,
  ClarificationAdvanceResult,
  ClarificationCreationProjection,
  ClarificationProjection,
  ConsumeGuidedFieldsInput,
  ConsumeGuidedFieldsResult,
  CreateGuidedFieldsClarificationInput,
  CreateClarificationInput,
  GuidedClarificationProjection,
  SafeClarificationOption,
  SelectClarificationInput,
  SelectClarificationResult,
  TerminalClarification,
  TransferWalletClarification,
} from './clarification.types';
import type { EntityType } from './entity-resolution';
import { CLARIFICATION_EXPIRED_TERMINAL_CODE as EXPIRED_TERMINAL_CODE, effectiveClarificationStatus, effectiveDraftStatus } from './effective-status';

const TOKEN_BYTES = 32;
const TOKEN_PREFIX = 'clarify_';
export const CLARIFICATION_TTL_MS = 15 * 60 * 1000;

export type TransactionClient = Prisma.TransactionClient;
export interface TransactionOption { readonly transaction?: TransactionClient }

/**
 * Database-backed current time — never the application process clock.
 * Rendered as an explicit UTC ISO-8601 string (not a raw `timestamptz`
 * value) so parsing never depends on the driver's or process's local
 * timezone, which may differ from the database session's.
 */
async function dbNow(client: Pick<PrismaClient, '$queryRaw'> | TransactionClient): Promise<Date> {
  const rows = await client.$queryRaw<{ now: string }[]>(
    Prisma.sql`SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "now"`,
  );
  return new Date(rows[0]!.now);
}

function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('base64url');
}

function assertValidTokenDigest(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length !== 64 || !/^[0-9a-f]{64}$/.test(raw)) {
    throw AssistantError.invalidRequest('clarification token digest is invalid');
  }
  return raw;
}

/**
 * Parse a user-presented token into its digest.
 * The raw token is never persisted — only the digest is stored and compared.
 */
function tokenToDigest(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length < TOKEN_PREFIX.length + 16) {
    throw AssistantError.invalidInput('clarification.select', 'token is invalid');
  }
  return digestToken(raw);
}

/** Token data returned at creation time (raw token for the user, digest for storage). */
interface TokenPair {
  readonly raw: string;
  readonly digest: string;
}

const KNOWN_ENTITY_TYPES = new Set(['wallet', 'merchant', 'category', 'transaction_fields']);

/** Validates a raw (plain-`String`-column) entityType before it is cast and surfaced to a caller — never trust the column value outright. */
function safeEntityType(value: string): EntityType | undefined {
  return KNOWN_ENTITY_TYPES.has(value) ? (value as EntityType) : undefined;
}

/**
 * Structural validity of a persisted trustedContext blob. Guards against a
 * corrupted/malformed JSON payload before it's trusted for continuation.
 */
function isValidTrustedContext(value: unknown): value is CanonicalContext {
  if (typeof value !== 'object' || value === null) return false;
  const ctx = value as Record<string, unknown>;
  return ctx.version === 1 &&
    ctx.operation === 'transaction.create' &&
    (ctx.type === 'INCOME' || ctx.type === 'EXPENSE' || ctx.type === 'TRANSFER') &&
    typeof ctx.amount === 'string' &&
    (ctx.date === undefined || typeof ctx.date === 'string');
}

/** Maps a non-PENDING terminal status to its specific bounded error. */
/**
 * Projects the TRANSFER wallet role of a clarification's trusted context
 * (Phase 38). Only `pendingWalletRole` and the already-resolved source label
 * are read — the label is skipped when it is just the raw id (direct-id path).
 */
export function transferWalletClarification(ctx: Partial<CanonicalContext> | null | undefined): TransferWalletClarification | undefined {
  if (ctx?.type !== 'TRANSFER' || !ctx.pendingWalletRole) return undefined;
  if (ctx.pendingWalletRole === 'wallet') return { field: 'SOURCE_WALLET' };
  const label = ctx.wallet?.displayLabel;
  return { field: 'DESTINATION_WALLET', ...(label && label !== ctx.wallet?.internalId ? { sourceWalletLabel: label } : {}) };
}

function withTransfer(ctx: Partial<CanonicalContext> | null | undefined): { transfer?: TransferWalletClarification } {
  const transfer = transferWalletClarification(ctx);
  return transfer ? { transfer } : {};
}

function terminalStatusError(status: string, terminalCode?: string | null): AssistantError {
  if (status === 'CONSUMED') return AssistantError.clarificationAlreadyConsumed();
  if (status === 'CANCELLED') return AssistantError.clarificationCancelled();
  if (status === 'STALE') return terminalCode === EXPIRED_TERMINAL_CODE ? AssistantError.clarificationExpired() : AssistantError.clarificationStale();
  return AssistantError.clarificationNotFound();
}

type ClarificationRequestClient = Pick<PrismaClient, 'clarificationRequest'> | TransactionClient;

/**
 * Idempotent terminalization to STALE (restart required) — guarded by
 * status='PENDING'. If a concurrent transition already won the race, this
 * reports the actual winning terminal status instead of asserting the
 * caller's intended one.
 */
async function terminalizeOrReportActual(
  client: ClarificationRequestClient,
  requestId: string,
  terminalCode: string,
  onWin: () => AssistantError,
): Promise<never> {
  const claimed = await client.clarificationRequest.updateMany({
    where: { id: requestId, status: 'PENDING' },
    data: { status: 'STALE', terminalCode, restartRequired: true },
  });
  if (claimed.count === 1) throw onWin();
  const current = await client.clarificationRequest.findUniqueOrThrow({ where: { id: requestId } });
  throw terminalStatusError(current.status, current.terminalCode);
}

export function createClarificationService(db: PrismaClient) {

  // ---- Create ---------------------------------------------------------------

  async function create(
    input: CreateClarificationInput,
    options: TransactionOption = {},
  ): Promise<ClarificationCreationProjection> {
    if (input.options.length === 0) {
      throw AssistantError.invalidInput('clarification.create', 'at least one option is required');
    }
    if (input.options.some((opt) => !opt.candidateId?.trim())) {
      throw AssistantError.invalidInput('clarification.create', 'every option must have a non-empty candidateId');
    }
    const tokens: TokenPair[] = input.options.map(() => ({
      raw: generateToken(),
      digest: '', // filled after generation
    }));
    // Fill digests
    for (const t of tokens) {
      (t as { digest: string }).digest = digestToken(t.raw);
    }

    const work = async (tx: TransactionClient) => {
      // A fresh 15-minute expiry from database time — every clarification
      // (parent or child) gets its own; a parent's expiry is never extended.
      const expiresAt = new Date((await dbNow(tx)).getTime() + CLARIFICATION_TTL_MS);
      const request = await tx.clarificationRequest.create({
        data: {
          userId: input.userId,
          conversationId: input.conversationId,
          originatingTurnId: input.turnId,
          executionId: input.executionId,
          ...(input.parentClarificationId ? { parentId: input.parentClarificationId } : {}),
          entityType: input.entityType,
          status: 'PENDING',
          trustedContext: input.trustedContext as unknown as Prisma.InputJsonValue,
          prompt: input.prompt,
          expiresAt,
        },
      });
      await tx.clarificationOption.createMany({
        data: input.options.map((opt, i) => ({
          requestId: request.id,
          tokenDigest: tokens[i]!.digest,
          displayLabel: opt.displayLabel,
          discriminator: opt.discriminator ?? null,
          candidateId: opt.candidateId,
        })),
      });
      return request;
    };

    const row = options.transaction ? await work(options.transaction) : await db.$transaction(work);

    return {
      clarificationId: row.id,
      entityType: row.entityType as EntityType,
      prompt: row.prompt,
      options: input.options.map((opt, i) => ({
        token: tokens[i]!.raw,
        label: opt.displayLabel,
        ...(opt.discriminator ? { discriminator: opt.discriminator } : {}),
      })),
      expiresAt: row.expiresAt.toISOString(),
      ...withTransfer(input.trustedContext),
    };
  }

  async function createGuidedFields(
    input: CreateGuidedFieldsClarificationInput,
    options: TransactionOption = {},
  ): Promise<GuidedClarificationProjection> {
    if (input.fields.length === 0) {
      throw AssistantError.invalidInput('clarification.create', 'at least one guided field is required');
    }

    const work = async (tx: TransactionClient) => {
      const expiresAt = new Date((await dbNow(tx)).getTime() + CLARIFICATION_TTL_MS);
      return tx.clarificationRequest.create({
        data: {
          userId: input.userId,
          conversationId: input.conversationId,
          originatingTurnId: input.turnId,
          executionId: input.executionId,
          ...(input.parentClarificationId ? { parentId: input.parentClarificationId } : {}),
          entityType: input.entityType,
          status: 'PENDING',
          trustedContext: input.trustedContext as unknown as Prisma.InputJsonValue,
          prompt: input.prompt,
          expiresAt,
        },
      });
    };

    const row = options.transaction ? await work(options.transaction) : await db.$transaction(work);

    return {
      kind: 'guided',
      clarificationId: row.id,
      fields: input.fields,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  // ---- Select ----------------------------------------------------------------

  async function select(
    input: SelectClarificationInput,
    options: TransactionOption = {},
  ): Promise<SelectClarificationResult> {
    // Token digest is pure hashing — no DB lookup, no information disclosed
    // about any specific request — so validating its shape up front is safe.
    const tokenDigest = tokenToDigest(input.token);
    assertValidTokenDigest(tokenDigest);

    // Plain (unlocked) read — a non-PENDING match must produce a specific
    // terminal error rather than being indistinguishable from "not found".
    // The fields read here (options, trustedContext, entityType, parentId)
    // are immutable after creation, so they stay valid through the claim below.
    const request = await db.clarificationRequest.findFirst({
      where: {
        conversationId: input.conversationId,
        userId: input.userId,
        ...(input.clarificationId ? { id: input.clarificationId } : {}),
      },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) {
      throw AssistantError.clarificationNotFound();
    }
    // A previously-terminalized row (including a prior expiry) reports its
    // actual terminal outcome deterministically — repeat calls never re-derive it.
    if (request.status !== 'PENDING') {
      throw terminalStatusError(request.status, request.terminalCode);
    }

    // Lifecycle (expiry) is resolved from database time BEFORE the token is
    // ever matched against stored digests — an expired request never reveals
    // whether the supplied token would otherwise have been valid.
    const now = await dbNow(db);
    if (effectiveClarificationStatus(request, now).status !== 'PENDING') {
      // Must commit even though the caller receives an error — runs outside
      // (not nested inside) the claim below, same as the other terminalizations.
      await terminalizeOrReportActual(db, request.id, EXPIRED_TERMINAL_CODE, () => AssistantError.clarificationExpired());
    }

    // These terminalizations must also commit even though the caller receives
    // an error, so they run outside (not nested inside) the claim transaction.
    if (!isValidTrustedContext(request.trustedContext)) {
      await terminalizeOrReportActual(db, request.id, 'context_invalid', () => AssistantError.clarificationContextInvalid());
    }
    if (!KNOWN_ENTITY_TYPES.has(request.entityType)) {
      await terminalizeOrReportActual(db, request.id, 'continuation_invalid', () => AssistantError.clarificationContinuationInvalid());
    }

    const matched = request.options.find((o) => o.tokenDigest === tokenDigest);
    if (!matched) {
      throw AssistantError.clarificationInvalidOption();
    }

    // Atomic claim: only succeeds if the row is still PENDING at commit time.
    // Under a concurrent same-token race, exactly one caller wins this single
    // UPDATE; the loser observes count === 0 and reports the winner's outcome.
    // Runs against the caller-supplied transaction (when provided) so this
    // claim commits or rolls back together with whatever downstream work
    // (child clarification / draft creation, Assistant lifecycle persistence)
    // the caller performs in that same transaction.
    const client = options.transaction ?? db;
    const claimed = await client.clarificationRequest.updateMany({
      where: { id: request.id, status: 'PENDING' },
      data: { status: 'CONSUMED', consumedAt: now },
    });
    if (claimed.count !== 1) {
      const current = await client.clarificationRequest.findUniqueOrThrow({ where: { id: request.id } });
      throw terminalStatusError(current.status, current.terminalCode);
    }

    const trustedContext = request.trustedContext as unknown as CanonicalContext;
    return {
      clarificationId: request.id,
      entityType: request.entityType as EntityType,
      status: 'CONSUMED' as const,
      selectedCandidateId: matched.candidateId,
      selectedDisplayLabel: matched.displayLabel,
      trustedContext,
      previousTrustedContext: trustedContext,
      ...(request.parentId ? { parentId: request.parentId } : {}),
    };
  }

  async function consumeGuidedFields(
    input: ConsumeGuidedFieldsInput,
    options: TransactionOption = {},
  ): Promise<ConsumeGuidedFieldsResult> {
    const request = await db.clarificationRequest.findFirst({
      where: {
        id: input.clarificationId,
        conversationId: input.conversationId,
        userId: input.userId,
      },
    });

    if (!request) throw AssistantError.clarificationNotFound();
    if (request.status !== 'PENDING') {
      throw terminalStatusError(request.status, request.terminalCode);
    }

    const now = await dbNow(db);
    if (effectiveClarificationStatus(request, now).status !== 'PENDING') {
      await terminalizeOrReportActual(db, request.id, EXPIRED_TERMINAL_CODE, () => AssistantError.clarificationExpired());
    }
    if (!isValidTrustedContext(request.trustedContext)) {
      await terminalizeOrReportActual(db, request.id, 'context_invalid', () => AssistantError.clarificationContextInvalid());
    }
    if (request.entityType !== 'transaction_fields') {
      await terminalizeOrReportActual(db, request.id, 'continuation_invalid', () => AssistantError.clarificationContinuationInvalid());
    }

    const client = options.transaction ?? db;
    const claimed = await client.clarificationRequest.updateMany({
      where: { id: request.id, status: 'PENDING' },
      data: { status: 'CONSUMED', consumedAt: now },
    });
    if (claimed.count !== 1) {
      const current = await client.clarificationRequest.findUniqueOrThrow({ where: { id: request.id } });
      throw terminalStatusError(current.status, current.terminalCode);
    }

    return {
      clarificationId: request.id,
      entityType: 'transaction_fields',
      status: 'CONSUMED',
      trustedContext: request.trustedContext as unknown as CanonicalContext,
    };
  }

  // ---- Cancel ----------------------------------------------------------------

  async function cancel(input: CancelClarificationInput, options: TransactionOption = {}): Promise<{ entityType?: EntityType }> {
    // Plain (unlocked) read, same rationale as select(): a non-PENDING match
    // must produce its specific terminal outcome, not be folded into the
    // claim transaction below.
    const request = await db.clarificationRequest.findFirst({
      where: {
        id: input.clarificationId,
        userId: input.userId,
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      },
    });
    if (!request) {
      throw AssistantError.clarificationNotFound();
    }
    // Repeated cancellation is idempotent and safe — already-cancelled is a
    // no-op success, not an error.
    if (request.status === 'CANCELLED') return { entityType: safeEntityType(request.entityType) };
    if (request.status !== 'PENDING') {
      throw terminalStatusError(request.status, request.terminalCode);
    }

    // Lifecycle (expiry) is resolved from database time before the
    // cancellation claim, and — like the other early terminalizations — must
    // commit even though the caller receives an error, so it runs against
    // `db` directly rather than the claim transaction below.
    const now = await dbNow(db);
    if (effectiveClarificationStatus(request, now).status !== 'PENDING') {
      await terminalizeOrReportActual(db, request.id, EXPIRED_TERMINAL_CODE, () => AssistantError.clarificationExpired());
    }

    // Atomic claim, same race-safety rationale as select().
    const client = options.transaction ?? db;
    const claimed = await client.clarificationRequest.updateMany({
      where: { id: request.id, status: 'PENDING' },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        terminalCode: input.reason || 'user_cancelled',
        restartRequired: true,
      },
    });
    if (claimed.count !== 1) {
      const current = await client.clarificationRequest.findUniqueOrThrow({ where: { id: request.id } });
      if (current.status === 'CANCELLED') return { entityType: safeEntityType(current.entityType) };
      throw terminalStatusError(current.status, current.terminalCode);
    }
    return { entityType: safeEntityType(request.entityType) };
  }

  // ---- State projection ------------------------------------------------------

  async function getAssistantState(
    userId: string,
    conversationId: string,
  ): Promise<AssistantStateProjection> {
    // Abandoned-PENDING visibility (Phase 37.3, normalized in 38.1): a PENDING
    // clarification or PENDING_CONFIRMATION draft only flips to its terminal
    // state (STALE / EXPIRED) lazily, the next time something acts on it —
    // there is deliberately no background sweep (docs/assistant-stuck-states.md).
    // So every status reported here is the EFFECTIVE status from
    // effective-status.ts — the same function the mutation paths use to decide
    // the lazy write — never the raw column, and nothing is written. Database
    // time, same as select/cancel/consumeGuidedFields.
    const now = await dbNow(db);
    const [pendingRequest, latestRequest, pendingDraft, latestDraft, runningTurn] = await Promise.all([
      db.clarificationRequest.findFirst({
        where: { conversationId, userId, status: 'PENDING' },
        include: { options: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.clarificationRequest.findFirst({
        where: { conversationId, userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, entityType: true, status: true, terminalCode: true, restartRequired: true, expiresAt: true, originatingTurnId: true },
      }),
      db.assistantFinancialDraft.findFirst({
        where: { conversationId, userId, status: 'PENDING_CONFIRMATION' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          operation: true,
          transactionType: true,
          amount: true,
          walletId: true,
          toWalletId: true,
          categoryId: true,
          transactionDate: true,
          description: true,
          expiresAt: true,
        },
      }),
      // Relevance rule for the terminal draft: only the conversation's most
      // recent draft — an older failure superseded by a later draft (committed
      // or not) is history, not a recovery state.
      db.assistantFinancialDraft.findFirst({
        where: { conversationId, userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, expiresAt: true, originatingTurnId: true },
      }),
      // Conversation ownership is already asserted by the caller (see
      // assistant.controller.ts's recoveryState) — assistantTurn has no
      // userId column of its own, so conversationId scoping is sufficient here.
      db.assistantTurn.findFirst({
        where: { conversationId, status: 'RUNNING' },
        orderBy: { startedAt: 'desc' },
        select: { id: true, intent: true, startedAt: true },
      }),
    ]);

    // TTL is a constant from creation, so the newest PENDING row is the last to
    // expire: if it is effectively expired, no older PENDING row is live either.
    const activeRequest = pendingRequest && effectiveClarificationStatus(pendingRequest, now).status === 'PENDING' ? pendingRequest : undefined;
    const liveDraft = pendingDraft && effectiveDraftStatus(pendingDraft, now) === 'PENDING_CONFIRMATION' ? pendingDraft : undefined;

    const activeClarification = activeRequest ? {
      clarificationId: activeRequest.id,
      entityType: activeRequest.entityType as EntityType,
      prompt: activeRequest.prompt,
      options: activeRequest.options.map((opt): SafeClarificationOption => ({
        label: opt.displayLabel,
        ...(opt.discriminator ? { discriminator: opt.discriminator } : {}),
      })),
      expiresAt: activeRequest.expiresAt.toISOString(),
      ...withTransfer(activeRequest.trustedContext as Partial<CanonicalContext> | null),
    } : undefined;

    const safeDraft = liveDraft ? {
      draftId: liveDraft.id,
      status: liveDraft.status,
      preview: {
        operation: liveDraft.operation,
        type: liveDraft.transactionType,
        amount: liveDraft.amount.toString(),
        walletId: liveDraft.walletId,
        ...(liveDraft.toWalletId ? { toWalletId: liveDraft.toWalletId } : {}),
        ...(liveDraft.categoryId ? { categoryId: liveDraft.categoryId } : {}),
        date: liveDraft.transactionDate.toISOString().slice(0, 10),
        // Reporting-timezone business date, additive alongside `date` (which is
        // a naive UTC slice and can be off by one day from the reporting
        // calendar date — see financial-draft.service.ts `prepare()`). Owner-only
        // projection, same boundary as `categoryId` above.
        transactionDate: formatReportingDate(liveDraft.transactionDate, reportingConfig.timezone),
        ...(liveDraft.description ? { description: liveDraft.description } : {}),
        expiresAt: liveDraft.expiresAt.toISOString(),
      },
    } : undefined;

    const clarificationEffective = latestRequest ? effectiveClarificationStatus(latestRequest, now) : undefined;
    const terminal = latestRequest && clarificationEffective && clarificationEffective.status !== 'PENDING' ? {
      clarificationId: latestRequest.id,
      entityType: latestRequest.entityType as EntityType,
      status: clarificationEffective.status,
      ...(clarificationEffective.terminalCode ? { terminalCode: clarificationEffective.terminalCode } : {}),
      // A lazily-expired row will get restartRequired=true when written.
      restartRequired: latestRequest.status === 'PENDING' ? true : latestRequest.restartRequired,
      recordedStatus: latestRequest.status,
      originatingTurnId: latestRequest.originatingTurnId,
    } : undefined;

    const draftEffective = latestDraft ? effectiveDraftStatus(latestDraft, now) : undefined;
    const terminalDraft = latestDraft && (draftEffective === 'EXPIRED' || draftEffective === 'FAILED' || draftEffective === 'CANCELLED') ? {
      draftId: latestDraft.id,
      status: draftEffective,
      recordedStatus: latestDraft.status,
      originatingTurnId: latestDraft.originatingTurnId,
    } : undefined;

    const activeTurn = runningTurn ? {
      turnId: runningTurn.id,
      intent: runningTurn.intent,
      startedAt: runningTurn.startedAt.toISOString(),
    } : undefined;

    return {
      ...(activeClarification ? { activeClarification } : {}),
      ...(safeDraft ? { pendingDraft: safeDraft } : {}),
      ...(terminal ? { latestTerminalClarification: terminal } : {}),
      ...(terminalDraft ? { latestTerminalDraft: terminalDraft } : {}),
      ...(activeTurn ? { activeTurn } : {}),
    };
  }

  // ---- Sequential continuation -----------------------------------------------

  /**
   * After a successful selection, determine the next step in the sequential
   * clarification chain: wallet → merchant → category → draft.
   *
   * Called by the application service after consuming a clarification.
   * The caller is responsible for entity resolution of the next ambiguity.
   */
  function buildConsumedResult(
    consumedClarificationId: string,
  ): Pick<ClarificationAdvanceResult, 'consumedClarificationId'> {
    return { consumedClarificationId };
  }

  /**
   * Runs `work` in a single interactive Prisma transaction and returns its
   * result. Callers (application service) use this to make the clarification
   * claim, any child clarification / draft creation, and Assistant lifecycle
   * persistence commit or roll back together. Reuses `existing` instead of
   * opening a nested transaction when the caller is already inside one.
   */
  function runInTransaction<T>(
    work: (tx: TransactionClient) => Promise<T>,
    existing?: TransactionClient,
  ): Promise<T> {
    return existing ? work(existing) : db.$transaction(work);
  }

  return {
    create,
    createGuidedFields,
    select,
    consumeGuidedFields,
    cancel,
    getAssistantState,
    buildConsumedResult,
    runInTransaction,
    // Exported for tests only
    _digestToken: digestToken,
    _generateToken: generateToken,
  };
}

export type ClarificationService = ReturnType<typeof createClarificationService>;
