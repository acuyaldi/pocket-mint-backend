# Assistant Conversations API

All endpoints are authenticated under `/api/v1/assistant`. Identity always comes from verified request context; clients cannot provide an owner ID. The canonical `/execute` API remains deterministic and intent-first. Phase 21.6 adds one explicitly configured natural-language provider path without changing that existing behavior.

## Natural-language messages

`POST /messages` accepts:

```json
{
  "conversationId": "optional public conversation identifier",
  "message": "natural-language user request"
}
```

Unknown fields, empty messages, non-string values, and messages above the canonical 10,000-character limit are rejected. The standard success/error envelope is unchanged. Successful data is one of the existing deterministic execution/draft responses, `{ "status": "clarification_required", ... }`, or `{ "status": "unsupported", ... }`. Provider availability, timeout, rate-limit, configuration, refusal, and invalid-response failures use safe `ASSISTANT_PROVIDER_*` codes; no prompt, context, raw response, SDK error, request header, vendor request ID, usage detail, or credential is returned.

The endpoint exists even when provider execution is disabled, but returns `ASSISTANT_PROVIDER_UNAVAILABLE` without making an external call. Enablement requires `ASSISTANT_PROVIDER=gemini`, `ASSISTANT_MODEL`, and `GEMINI_API_KEY`; `ASSISTANT_PROVIDER_TIMEOUT_MS` defaults to 15,000 ms. Missing required enabled configuration fails startup. Normal tests and the canonical `/execute` path need no provider key.

The request lifecycle deliberately uses Phase 21.5 option A. The backend establishes or ownership-validates the conversation, calls `prepareProviderExecution` with the still-unpersisted current request, assembles one labelled provider payload, and invokes Gemini outside every Prisma transaction. Only after the structured plan validates does the existing application service persist the USER message and execute the registered intent. Clarification, unsupported, and provider-failure paths also begin exactly one turn and persist that USER content once. The current request therefore appears once in provider context and once in durable history, never twice in either.

The system instruction and capability catalog are deterministic for identical registry state. The catalog is generated from enabled registered tools and exposes only intent, description, safe argument contract, capability category, and whether confirmation may be required. History, tool summaries, draft previews, wallet/category names, descriptions, and current input are labelled untrusted data outside the system rules. Model output must match a strict closed JSON schema; unknown intents/fields, ownership or lifecycle claims, reasoning fields, prototype keys, arrays where objects are required, depth above six, and serialized output above 32 KiB are rejected.

Backend-generated text remains authoritative for known intent results, errors, unsupported behavior, and draft previews. Provider text is used only for one bounded clarification question (500 characters); secret-seeking wording is replaced with a generic safe question. Provider `userMessage` text never replaces a deterministic transaction, balance, or draft result.

For `transaction.create`, the plan can only propose arguments accepted by the existing contract. The existing ownership checks create a 15-minute `PENDING_CONFIRMATION` draft and return the deterministic preview. The initial natural-language request creates no transaction and changes no wallet balance. The model cannot call, select, or simulate confirmation; only the separate authenticated `/drafts/:draftId/confirm` endpoint with an explicit idempotency key may commit.

Provider audit uses the dedicated `AssistantProviderExecution` record rather than overloading tool execution. It stores provider/model identifiers, lifecycle status, correlation/conversation/optional turn references, duration, byte counts, normalized finish class, safe error code, and optional neutral token totals. It has no prompt, context, message, arguments, raw request/response, hidden reasoning, credential, header, or raw SDK error fields. The official `@google/genai` adapter sends one request with SDK retries disabled and applies client cancellation plus the configured HTTP timeout.

## Execute

`POST /execute` accepts `message?`, canonical `intent`, `arguments`, `conversationId?`, and `locale?`. `MAX_ASSISTANT_MESSAGE_LENGTH` is 10,000 characters for every canonical USER or ASSISTANT message, independently of the HTTP body limit. Empty or whitespace-only user messages are absent. Oversized user input returns a safe validation error before any conversation, turn, message, or tool-execution row is created; input is never truncated. When a message is absent, the backend persists a fallback constructed only after arguments validate. Deterministic output and persistence-service writes are checked against the same limit. Successful and post-resolution error responses contain `conversationId`, `turnId`, and the server-generated `correlationId`.

Unknown and cross-user conversation IDs return the same not-found response. Archived or expired conversations cannot be continued.

## List and history

- `GET /conversations?page=1&limit=20`
- `GET /conversations/:conversationId?page=1&limit=20`

Pagination defaults to 20 and caps at 100. Lists contain owned summaries only. History returns stable chronological canonical messages with plain-text `content` and `source`, allowing clients to distinguish original input, canonical fallback, safe request summary, deterministic output, and safe errors. Owner IDs, audit JSON, provider payloads, stack traces, and database internals are omitted.

Unsupported intents and malformed arguments establish a durable rejected turn with constant safe USER and ASSISTANT messages, but never create a tool-execution row or invoke a finance-domain handler. Raw unvalidated arguments are not persisted.

A `RUNNING` turn is durable execution state, not evidence that a process is still active and not a completed response. If a tool succeeds but final persistence does not, the API does not return success and retrieval continues to show the incomplete `RUNNING` lifecycle. Phase 21.3 does not retry, reconcile, or automatically recover stale records. Correlation IDs on structured logs and lifecycle records support investigation; raw financial results are not logged. Mutation retry remains forbidden until Phase 21.4 provides idempotency.

## Archive

`POST /conversations/:conversationId/archive` is ownership-scoped and idempotent. It does not delete messages, execution history, or finance data. Phase 21.3 has no permanent deletion or automatic expiration job.

Assistant records are historical snapshots of what was presented. Finance-domain tables remain authoritative current truth.

## Financial transaction drafts

`POST /execute` also accepts the allow-listed `transaction.create` intent. Its arguments are exactly `type` (`INCOME` or `EXPENSE`), positive decimal `amount` with at most two fraction digits, `walletId`, `categoryId`, `date` (`YYYY-MM-DD`), and optional `description` (maximum 500 characters). Unknown fields, transfers, installments, ownership fields, balances, and lifecycle fields are rejected. The initial request validates owner-scoped wallet/category references and creates only an `AssistantFinancialDraft`; it never creates a transaction or changes a wallet balance.

The success data contains `draftId`, `PENDING_CONFIRMATION` status, `expiresAt`, normalized `preview`, and `confirmationRequired: true`. The persisted plain-text preview is deterministic and states that explicit confirmation is required. Drafts expire after 15 minutes. Expiration is enforced on confirmation/cancellation even though automatic cleanup is deferred.

- `POST /drafts/:draftId/confirm` requires an `Idempotency-Key` header containing 1–128 ASCII letters, digits, `_`, `.`, `:`, or `-`.
- `POST /drafts/:draftId/cancel` is idempotent while the draft is cancelled.

Confirmation locks the draft in PostgreSQL, checks the database-unique `(userId, key)` record, invokes the existing transaction service inside the same Prisma transaction, links the authoritative transaction, and commits the draft plus the confirmation turn/audit summary atomically. Exact key replay and a different key on an already committed draft return the original committed transaction without another financial effect. Reusing a key for another draft returns `ASSISTANT_IDEMPOTENCY_CONFLICT`. Cancellation of a committed draft and confirmation of cancelled, expired, or failed drafts return a conflict. Unknown and cross-user drafts share the same not-found response.

Audit JSON contains only draft/operation/status and, after commit, transaction ID. Raw draft payloads, wallet objects, balances, request bodies, and internal errors are excluded. Authoritative transactions referenced by committed drafts or successful idempotency records are protected by restrictive foreign keys; deleting Assistant history never cascades to a transaction.

If the finance domain rejects confirmation, its transaction is rolled back before any financial mutation or idempotency success can persist. Recording the separate durable rejection history is best-effort: a secondary persistence failure can leave the draft pending, but the API returns no false success and performs no automatic retry. A later explicit retry remains subject to the same lifecycle and idempotency checks. No frontend, external channel, provider failover, tool loop, recovery worker, or stale-draft cleanup worker is part of this phase.
