# Assistant Conversations API

All endpoints are authenticated under `/api/v1/assistant`. Identity always comes from verified request context; clients cannot provide an owner ID. The API remains deterministic and intent-first. No LLM provider or natural-language tool selection is integrated.

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

Audit JSON contains only draft/operation/status and, after commit, transaction ID. Raw draft payloads, wallet objects, balances, request bodies, and internal errors are excluded. Deleting Assistant history never cascades to the authoritative transaction because the transaction link uses `SET NULL`; no provider, frontend, external channel, or stale-draft cleanup worker is part of this phase.
