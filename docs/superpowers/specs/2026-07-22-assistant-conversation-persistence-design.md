# Assistant Conversation Persistence Design

**Phase:** 21.3 — Conversation Persistence and Durable Execution History  
**Status:** Approved for implementation  
**Date:** 2026-07-22

## Scope

Phase 21.3 adds provider-neutral, user-owned conversation persistence to the existing deterministic Assistant endpoint. It persists canonical messages, request turns, and minimized tool-execution history; adds bounded retrieval and archive APIs; and preserves the existing `analytics.monthly-spending-summary` execution path.

This phase does not add an LLM provider, natural-language intent selection, prompt storage, financial drafts or writes, frontend chat, streaming, deletion, automatic retention jobs, or a generic event framework.

## Invariants

- Finance-domain tables remain the only source of current financial truth.
- Assistant records are historical snapshots and audit evidence, not authoritative balances, budgets, transactions, or goals.
- Ownership comes only from authenticated backend context. Callers cannot provide an owner ID.
- Stored messages and execution records are provider-neutral and contain no hidden reasoning.
- Registry, policy evaluator, tool contracts, handlers, and renderers remain free of Prisma calls.
- Conversation persistence is used only by Assistant routes and cannot become a dependency of unrelated finance endpoints.
- Every persisted `USER` message has non-empty `content`, but execute requests need not provide `message`.

## Chosen Architecture

The HTTP controller delegates to an `AssistantApplicationService`. This application service coordinates conversation persistence, deterministic intent resolution, tool execution, rendering, and lifecycle finalization. A separately injectable `AssistantConversationService` owns Prisma access, ownership checks, transactions, pagination, archival, and mapping database records to safe canonical DTOs.

The existing Tool Registry stays passive. The executor accepts a small execution-observer interface from the application layer. The observer records tool state transitions through the conversation service without making the executor or registry depend on Prisma. The observer is optional so executor unit tests and future non-persistent callers remain possible.

Two short database transactions surround tool execution:

1. Resolve or create an owned active conversation, create a `PENDING` turn, and persist its user message.
2. After execution, persist the terminal tool state, assistant message, and terminal turn state.

The finance read occurs outside a database transaction. Initial ownership or persistence failure prevents tool invocation.

## Prisma Model

### `AssistantConversation`

- `id`: cuid primary key.
- `userId`: owner foreign key to `User`, cascading only when the owning user is deleted.
- `status`: `ACTIVE | ARCHIVED | EXPIRED`.
- `locale`: normalized locale, default `id-ID`.
- `createdAt`, `updatedAt`, `lastActivityAt`, `archivedAt`.
- Relations to turns, messages, and tool executions.
- Indexes on `(userId, lastActivityAt, id)` and `(userId, status, lastActivityAt)`.

There is no title, schema version, expiration timestamp, or draft foreign key because Phase 21.3 has no concrete consumer for them.

### `AssistantTurn`

- `id`: cuid primary key.
- `conversationId`: parent conversation.
- `correlationId`: server-generated request correlation ID.
- `status`: `PENDING | RUNNING | SUCCEEDED | FAILED | REJECTED | CLARIFICATION_REQUIRED`.
- `intent`: requested canonical intent, length-bounded before persistence.
- `locale`, `safeErrorCode`, `startedAt`, `finishedAt`, `createdAt`, `updatedAt`.
- Relations to messages and tool executions.
- Unique correlation ID and indexes supporting conversation history and status/recovery inspection.

An explicit turn is required because it groups one request lifecycle, its messages, and zero or more tool executions without overloading message fields.

### `AssistantMessage`

- `id`: cuid primary key.
- `conversationId` and `turnId`.
- `role`: `USER | ASSISTANT | SYSTEM`.
- `source`: `USER_PROVIDED | CANONICAL_FALLBACK | SAFE_REQUEST_SUMMARY | DETERMINISTIC_RENDERER | SAFE_ERROR`.
- `content`: canonical plain text.
- `createdAt`.
- Index on `(conversationId, createdAt, id)` for stable ordered pagination.

No HTML, provider roles, tool-call payloads, chain-of-thought, or unrestricted metadata is stored. `SYSTEM` is reserved by the schema but is not written in this phase.

### `AssistantToolExecution`

- `id`, `conversationId`, and `turnId`.
- `toolId`, `capability`, `riskLevel`, and `policyDecision` snapshots.
- `status`: `PENDING | RUNNING | SUCCEEDED | FAILED | TIMED_OUT | DENIED`.
- `correlationId`, `startedAt`, `completedAt`, `durationMs`, `safeErrorCode`.
- `redactedInput` and `outputSummary` as nullable JSON.
- `idempotencyKey` remains nullable and unused until a future write flow.
- Indexes on turn, conversation chronology, and correlation ID.

No tool-contract version is added because current contracts expose no version.

Deleting a conversation cascades only through Assistant records. Phase 21.3 exposes no conversation deletion endpoint. No relationship points from Assistant records into finance-domain records.

## Canonical Request and Message Rules

```ts
interface AssistantCanonicalRequest {
  message?: string;
  intent: string;
  arguments: unknown;
  conversationId?: string;
  locale?: string;
}
```

- A non-string `message` is rejected as malformed input.
- Empty or whitespace-only `message` is treated as absent.
- A provided message is trimmed and limited to 100,000 characters. This complements the existing default 100 KB `express.json()` whole-body limit.
- A valid provided message is stored as `USER_PROVIDED` but never controls tool selection.
- Execution always uses canonical `intent` and validated `arguments`.
- A fallback message is generated only after the allow-listed intent and tool arguments both validate successfully. For the current tool it is `analytics.monthly-spending-summary(month=YYYY-MM)` and is stored as `CANONICAL_FALLBACK`.
- Fallback generation consumes validated input, never raw arguments.
- Unsupported intents or malformed arguments receive the constant safe summary `Permintaan Assistant tidak dapat diproses.` with source `SAFE_REQUEST_SUMMARY`. Raw argument JSON is not persisted.
- A conflicting human message does not change or override canonical intent or arguments.

## Validation Order

To guarantee both safe failure persistence and safe fallback construction:

1. Authenticate and structurally validate the outer request.
2. Resolve/create the conversation and verify it is active.
3. Resolve the allow-listed intent and validate tool input without executing the handler.
4. Select the user message: trimmed provided content, validated canonical fallback, or constant safe failure summary.
5. Persist the turn and user message.
6. Mark the turn `RUNNING`, create the tool execution, and execute the tool.

Unsupported intent and malformed arguments are persisted as `REJECTED` turns with safe user and assistant messages and no tool handler invocation. When the intent resolves but tool input validation fails, a denied/failed execution record may be stored only with metadata already safely known; it never contains raw arguments.

## Lifecycle

Successful path:

```text
PENDING → RUNNING → SUCCEEDED
```

Handled validation or policy rejection:

```text
PENDING → REJECTED
```

Handled execution or persistence-finalization failure:

```text
PENDING → RUNNING → FAILED
```

Clarification status exists for the canonical lifecycle but is not produced by the single deterministic Phase 21.3 intent.

Tool records use `PENDING → RUNNING → SUCCEEDED`, or a terminal `FAILED`, `TIMED_OUT`, or `DENIED`. A timeout states only that the Assistant stopped waiting; it does not claim cancellation.

## Redaction and Minimization

The ToolContract audit boundary supplies safe persistence representations. A shared helper first validates input, then applies `auditRedact`; it never serializes request objects, authentication data, errors, headers, or unknown raw payloads.

For `analytics.monthly-spending-summary`:

- persisted input: `{ "month": "YYYY-MM" }`;
- persisted output summary: `{ "month": "YYYY-MM", "transactionCount": number, "categoryCount": number }`.

Totals and category amounts remain in the canonical HTTP response and deterministic assistant message, but are not duplicated in tool JSON. The message is explicitly a historical snapshot of what the user saw, not current financial truth. Logs retain identifiers, status, duration, and safe error codes, not full message content or financial output.

## Conversation Resolution and Ownership

- Missing `conversationId`: create an active conversation for the authenticated user.
- Existing owned active ID: continue it and update last activity.
- Unknown or cross-user ID: return the same `ASSISTANT_CONVERSATION_NOT_FOUND` response and create no turn or execution.
- Archived or expired owned conversation: return `ASSISTANT_CONVERSATION_NOT_CONTINUABLE`; do not append or reactivate it.
- Ownership is enforced inside `AssistantConversationService` with compound `id + userId` predicates, never solely in controllers.
- Concurrent requests may create separate turns. Stable `(createdAt, id)` ordering prevents ambiguous retrieval; no conversational-context inference exists yet, so serialization locks are unnecessary.

## HTTP API

All routes use existing authentication:

- `POST /api/v1/assistant/execute`
- `GET /api/v1/assistant/conversations?page=&limit=`
- `GET /api/v1/assistant/conversations/:conversationId?page=&limit=`
- `POST /api/v1/assistant/conversations/:conversationId/archive`

Execute responses include `conversationId`, `turnId`, `correlationId`, canonical status, rendered plain text or safe error, and successful structured data. Failures after turn creation return the safe conversation and turn IDs.

List pagination defaults to 20 and caps at 100. Ordering is `lastActivityAt DESC, id DESC`. It returns IDs, status, locale, timestamps, and an optional last user-visible message snippet only.

Conversation detail uses bounded message pagination with stable `createdAt ASC, id ASC` ordering. It returns canonical messages containing `id`, `turnId`, `role`, `content`, optional `source`, and `createdAt`, plus safe turn/execution summaries. It omits owner IDs, stored redaction JSON, provider metadata, stack traces, and internal database fields.

Archive is ownership-scoped and idempotent. Repeating it returns the already archived representation.

## Failure and Crash Windows

- Failure before initial persistence: no finance tool is invoked and no records are promised.
- Validation or policy rejection after conversation resolution: safe messages and a terminal `REJECTED` turn are persisted.
- Tool failure: the tool record and turn become terminal; a safe assistant error message is appended.
- Tool success followed by final persistence failure: no success response is returned. The application logs the correlation ID and attempts a separate best-effort recovery update that marks the execution/turn `FAILED` with `ASSISTANT_FINALIZATION_FAILED`. It never records a false success.
- Process crash after the finance read but before finalization can leave `RUNNING` records. Because the current tool is read-only, no mutation ambiguity exists. A recovery worker is deferred; audit inspection can identify stale running rows by timestamps.
- Duplicate client retries create separate turns. Correlation IDs are server generated and are not idempotency keys. Request deduplication is deferred until a documented client request-key contract exists.

## Retention

Conversations can be archived but are not automatically expired or deleted. Timestamps and `EXPIRED` status support a future approved policy. No hard-coded retention duration, cleanup cron, or permanent deletion endpoint is introduced. Archival changes only Assistant state and never finance data.

## Security and Privacy

- User message content is untrusted plain text and is never backend-rendered as HTML.
- No raw request, JWT, authorization header, Prisma error, stack trace, provider payload, secret, or user ID inside tool arguments is persisted.
- Cross-user and unknown IDs are intentionally indistinguishable.
- Archived conversations cannot execute tools.
- Correlation IDs are audit identifiers, not authorization credentials.
- Database-platform encryption controls remain unchanged; custom application cryptography is deferred.

## Testing Strategy

Unit tests cover request/message normalization, validated fallback generation, safe summaries, redaction/minimization, orchestration transitions, prevention of handler calls after initial failures, timeout mapping, and controller DTO boundaries.

Disposable PostgreSQL integration tests cover ownership isolation, ordered messages, turn and execution transitions, archive behavior, stable pagination, last activity, execute continuation, rejected turns, safe failures, retrieval field omission, and transactional consistency. The integration runner must execute these tests with both `DATABASE_URL` and `TEST_DATABASE_URL` pointing to the disposable database and must not silently skip them.

HTTP smoke tests use disposable data only and cover create/execute, continue, list, retrieve, archive, post-archive rejection, and cross-user denial.

## Documentation

The Assistant Core ADR will record the final relational model, ownership boundary, canonical message source, lifecycle, redaction/minimization, crash window, archive-only retention decision, and provider-neutral invariant. The roadmap will mark 21.3 complete only after all implementation gates pass and 21.4 as next. Backend API documentation will explicitly state that execution remains intent-first and has no LLM integration.

## Deferred Work

Phase 21.4 owns financial drafts, confirmation, idempotency keys, and `transaction.create`. Provider adapters, natural-language resolution, provider metadata, token accounting, semantic memory, preference memory, automatic retention, deletion, stale-turn recovery workers, streaming, queues, and frontend chat remain deferred.

