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
