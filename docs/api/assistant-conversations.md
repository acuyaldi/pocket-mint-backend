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

Unknown fields, empty messages, non-string values, and messages above the canonical 10,000-character limit are rejected. The standard success/error envelope is unchanged. Successful data is one of the existing deterministic execution/draft responses, `{ "status": "clarification_required", ... }`, or `{ "status": "unsupported", ... }`. Machine-readable clarification responses use an explicit `data.kind` discriminator: `entity_selection`, `guided_fields`, or `provider_text`. Provider availability, timeout, rate-limit, configuration, refusal, and invalid-response failures use safe `ASSISTANT_PROVIDER_*` codes; no prompt, context, raw response, SDK error, request header, vendor request ID, usage detail, or credential is returned.

The endpoint exists even when provider execution is disabled, but returns `ASSISTANT_PROVIDER_UNAVAILABLE` without making an external call. Enablement requires `ASSISTANT_PROVIDER=gemini`, `ASSISTANT_MODEL`, and `GEMINI_API_KEY`; `ASSISTANT_PROVIDER_TIMEOUT_MS` defaults to 15,000 ms. Missing required enabled configuration fails startup. Normal tests and the canonical `/execute` path need no provider key.

The request lifecycle deliberately uses Phase 21.5 option A. The backend establishes or ownership-validates the conversation, calls `prepareProviderExecution` with the still-unpersisted current request, assembles one labelled provider payload, and invokes Gemini outside every Prisma transaction. Only after the structured plan validates does the existing application service persist the USER message and execute the registered intent. Clarification, unsupported, and provider-failure paths also begin exactly one turn and persist that USER content once. The current request therefore appears once in provider context and once in durable history, never twice in either.

The system instruction and capability catalog are deterministic for identical registry state. The catalog is generated from enabled registered tools and exposes only intent, description, safe argument contract, capability category, and whether confirmation may be required. History, tool summaries, draft previews, wallet/category names, descriptions, and current input are labelled untrusted data outside the system rules. Model output must match a strict closed JSON schema; unknown intents/fields, ownership or lifecycle claims, reasoning fields, prototype keys, arrays where objects are required, depth above six, and serialized output above 32 KiB are rejected.

As of Phase 35, the system instruction additionally anchors the current reporting-timezone calendar date (ISO `YYYY-MM-DD`, computed via the existing `formatReportingDate`/`reportingConfig.timezone` helpers — no second timezone implementation), explicitly scoped to relative-date grounding only: resolving phrases like "kemarin"/"tadi"/"hari ini" in the current request into an explicit date. It is never a basis for financial advice, budgeting, or any other reasoning, it does not add a new clarification type, and it does not change the omitted-date default described below.

Backend-generated text remains authoritative for known intent results, errors, unsupported behavior, and draft previews. Provider text is used only for one bounded plain-text clarification question (500 characters). Secret-seeking wording, links, executable markup, control characters, and non-terminal provider responses are replaced or rejected safely. Provider `userMessage` text never replaces a deterministic transaction, balance, or draft result.

For `transaction.create`, the provider plan must supply textual `walletReference`, `merchantReference`, and `categoryReference` values. It cannot supply `walletId`, `categoryId`, category identifier variants, `merchantId`, `merchantMappingId`, ownership/type claims, trusted constraints or aliases, resolution evidence/confidence, authorization/confirmation claims, or lifecycle claims. Unknown and Unicode-confusable prohibited keys are rejected. The Backend resolves the wallet against only the authenticated User's active wallets, the merchant against only that User's Merchant Mapping rows, and the category against only that User's categories of the trusted transaction type. Internal wallet, Category, and Merchant Mapping IDs never enter the provider-visible contract or public ambiguity options.

As of Phase 36B, `type: 'TRANSFER'` additionally requires a textual `toWalletReference` — resolved exactly like `walletReference`, through the same resolver and trust boundary. The provider is never offered a `toWalletId` key, the same closed boundary already applied to the source wallet. `categoryReference`/`categoryId` are rejected outright when `type` is `TRANSFER`.

A unique wallet and category resolution creates a 15-minute `PENDING_CONFIRMATION` draft and returns a deterministic preview with safe display labels. Wallet or Category ambiguity/absence blocks draft creation. Merchant ambiguity also blocks draft creation, but merchant `not_found` does not: because the transaction model has no standalone merchant field or Merchant entity, the validated normalized reference continues as inert free-form merchant text. It becomes `Transaction.description` only when the request did not already include an explicit description; an explicit description remains authoritative and the merchant label is preview-only. An explicit `categoryReference` never falls back to Merchant Mapping category data or Smart Categorization keywords. The initial natural-language request creates no transaction and changes no wallet balance. The model cannot call, select, or simulate confirmation; only the separate authenticated `/drafts/:draftId/confirm` endpoint with an explicit idempotency key may commit.

Provider audit uses the dedicated `AssistantProviderExecution` record rather than overloading tool execution. It stores provider/model identifiers, lifecycle status, correlation/conversation/optional turn references, duration, byte counts, normalized finish class, safe error code, and optional neutral token totals. It has no prompt, context, message, arguments, raw request/response, hidden reasoning, credential, header, or raw SDK error fields. The official `@google/genai` adapter sends one request with SDK retries disabled, caps model generation at 4,096 output tokens, and applies client cancellation plus the configured HTTP timeout. The 32 KiB byte check remains a post-SDK validation boundary because the non-streaming SDK materializes its response before returning.

Provider-generated bounded questions and deterministic no-option retry prompts remain typed as provider text:

```json
{ "status": "clarification_required", "message": "...", "data": { "kind": "provider_text" } }
```

Missing transaction `amount` stays in this provider-text path. Wallet/category `not_found` prompts also use this shape because there are no backend-issued options to select. There is no guided amount field in this phase because arbitrary amounts have no backend-authoritative option set.

Before this path is reached, a backend-only deterministic recovery step scans the original message for exactly one unambiguous Indonesian Rupiah amount token when the validated plan omitted `amount` — never overriding a provider-supplied amount. It recognizes `rb`/`ribu`/`jt`/`juta` suffixes and, as of Phase 35, the common casual `k`/`K` suffix (`25k`, `450k`, `1.5k`) using the same thousands multiplier as `rb`/`ribu`. It declines entirely — falling through to the missing-amount `provider_text` clarification above — when the message contains more than one plausible amount-shaped token, an unrecognized suffix, or an unsafe value (negative, zero, or implausibly large); it is a narrow single-token safety net for one provider-miss pattern, never a general numeric-language parser.

The provider-audit row is created before the external call. Its terminal update occurs only after the corresponding deterministic/non-tool result is durable. If that metadata-only update fails, the API returns the already-durable result instead of turning a committed draft into a retry-triggering error; the audit row can remain `STARTED` for manual investigation because this phase has no recovery worker.

`POST /messages` accepts an optional request-level `Idempotency-Key` header (Phase 27; same 1–128 ASCII `[A-Za-z0-9_.:-]` format as draft confirm). See "Request-level idempotency" below for the full contract. Telegram does not use this header — its duplicate-execution protection is a separate channel-layer guard (`assistantOperationGuard`, PD-015) that already binds one inbound job to at most one turn.

## Execute

`POST /execute` accepts `message?`, canonical `intent`, `arguments`, `conversationId?`, `locale?`, and the same optional `Idempotency-Key` header as `/messages` (Phase 27). `MAX_ASSISTANT_MESSAGE_LENGTH` is 10,000 characters for every canonical USER or ASSISTANT message, independently of the HTTP body limit. Empty or whitespace-only user messages are absent. Oversized user input returns a safe validation error before any conversation, turn, message, or tool-execution row is created; input is never truncated. When a message is absent, the backend persists a fallback constructed only after arguments validate. Deterministic output and persistence-service writes are checked against the same limit. Successful and post-resolution error responses contain `conversationId`, `turnId`, and the server-generated `correlationId`.

Unknown and cross-user conversation IDs return the same not-found response. Archived or expired conversations cannot be continued.

### Request-level idempotency (Phase 27)

Draft confirm's idempotency contract (see "Financial transaction drafts" below) is draft-scoped and does not cover the two endpoints that create a turn in the first place. `POST /messages` and `POST /execute` each accept the same optional `Idempotency-Key` header format — 1–128 ASCII letters, digits, `_`, `.`, `:`, or `-` — scoped independently per endpoint operation (a key used on `/execute` cannot be reused on `/messages`, and vice versa; reuse across operations returns `409 ASSISTANT_IDEMPOTENCY_CONFLICT`).

Omitting the header reproduces the exact pre-Phase-27 behavior: no deduplication, a fresh turn (and, for `transaction.create`, a fresh draft) on every call. This keeps every existing caller — including Telegram, which never sends this header — unaffected.

When the header is present, the first request with a given key claims it immediately (an insert-first-wins record, not a database lock held across the request) and proceeds normally. Because `/messages` can hold an outbound provider call open for seconds, no lock is held across that work — a concurrent or retried request with the same key while the first is still in flight returns `409 ASSISTANT_REQUEST_IN_PROGRESS` rather than blocking or starting a second turn. A request received after the first has completed replays the original response verbatim (same HTTP status and body, including `conversationId`/`turnId`) instead of executing anything again. A malformed key is rejected with `400 ASSISTANT_INVALID_IDEMPOTENCY_KEY` before any conversation, turn, or draft row is created.

A claimed key that fails synchronously — a business-level error raised before any turn is created, e.g. an already-archived `conversationId` — releases the claim immediately rather than leaving it in progress, so the caller's next attempt with the same key is evaluated fresh instead of hitting `409 ASSISTANT_REQUEST_IN_PROGRESS` forever. Only an actual interrupted process (a crash between claiming the key and recording its outcome — resolved or released) leaves that key's record showing in-progress indefinitely — the same fail-closed gap `assistantOperationGuard`'s `ambiguous` outcome already accepts at the channel layer. There is no recovery worker or automatic expiry for that case in this phase; see "Conversation state and recovery" for how a client discovers this state without guessing.

## List and history

- `GET /conversations?page=1&limit=20`
- `GET /conversations/:conversationId?page=1&limit=20`

Pagination defaults to 20 and caps at 100. Lists contain owned summaries only. Each summary includes a `title` — the conversation's first USER message, truncated to 160 characters, used for display — distinct from `lastMessage`, the latest message of any role, used for preview text. History returns stable chronological canonical messages with plain-text `content` and `source`, allowing clients to distinguish original input, canonical fallback, safe request summary, deterministic output, and safe errors. Owner IDs, audit JSON, provider payloads, stack traces, and database internals are omitted.

Unsupported intents and malformed arguments establish a durable rejected turn with constant safe USER and ASSISTANT messages, but never create a tool-execution row or invoke a finance-domain handler. Raw unvalidated arguments are not persisted.

Each conversation summary also includes `sourceChannels: ('WEB' | 'TELEGRAM')[]` — the distinct channels that produced at least one of its turns (Phase 30) — and `GET /conversations/:conversationId` returns `channel: 'WEB' | 'TELEGRAM'` per turn. Both default to `WEB`; only these two safe labels ever appear, never a Telegram chat/sender/user id or any other provider identifier.

Each turn also includes `deliveryStatus` (Phase 31, extended Phase 32) — the safe outbound delivery state of that turn's channel-originated Assistant reply, one of `'NOT_APPLICABLE' | 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'UNKNOWN'`, aggregated at read time from the existing `ChannelOutboundDelivery` row and never a provider message id, destination chat id, rendered outbound text beyond the message's own `content`, or reply markup. On a current backend the field is always present (never omitted):

- `'NOT_APPLICABLE'` — a `WEB` turn. There is no channel delivery to report.
- `'PENDING'` / `'PROCESSING'` / `'DELIVERED'` / `'FAILED'` — a `TELEGRAM` turn whose `ChannelOutboundDelivery` row is still retained: queued, in flight (or a retry still within its bounded backoff schedule), Telegram accepted it, or retries are exhausted (see the deployment runbook's operator remediation for this last case).
- `'UNKNOWN'` — a `TELEGRAM` turn whose delivery row is no longer retained (retention-purged; see the deployment runbook's retention window) or was never created. This is an explicit "we can no longer tell" value, never a guess at success or failure, and it is distinct from a pre-Phase-31 backend response, where the field is absent from the payload entirely rather than present as `'UNKNOWN'`.

`listOwnedConversations` summaries do not include it — delivery status is a per-turn concept, not a per-conversation one.

A `RUNNING` turn is durable execution state, not evidence that a process is still active and not a completed response. If a tool succeeds but final persistence does not, the API does not return success and retrieval continues to show the incomplete `RUNNING` lifecycle. Phase 21.3 does not retry, reconcile, or automatically recover stale records. Correlation IDs on structured logs and lifecycle records support investigation; raw financial results are not logged. Mutation retry remains forbidden until Phase 21.4 provides idempotency.

## Archive, restore, and delete (Phase 33)

`POST /conversations/:conversationId/archive` is ownership-scoped and idempotent (re-archiving an already-`ARCHIVED` conversation returns its existing `archivedAt` unchanged). It does not delete messages, execution history, channel/delivery metadata, or finance data — every field `GET /conversations/:conversationId` returns for an active conversation is still returned, unchanged, for an archived one; only `status`/`archivedAt` differ and the conversation can no longer start a new turn (`assertContinuable` rejects it with `ASSISTANT_CONVERSATION_NOT_CONTINUABLE`). Archiving a conversation with an already-`RUNNING` turn does not fail or roll back that turn: the in-flight request's own `finalize`/`finalizeWithoutTool` call writes its result directly by `turnId` and does not re-check conversation status, so it completes normally. Only a *new* turn on that conversation is blocked from the moment `archive` commits.

Phase 38.1 — `POST /drafts/:draftId/confirm` (with or without edit overrides) and `POST /drafts/:draftId/cancel`, and the Telegram Confirm/Cancel buttons that call the same service, reject a still-`PENDING_CONFIRMATION` draft whose conversation is not `ACTIVE` with `409 ASSISTANT_CONVERSATION_NOT_CONTINUABLE`, `error.detail: "CONVERSATION_ARCHIVED"`. Nothing is written: the draft stays `PENDING_CONFIRMATION` (never `FAILED`, never lazily `EXPIRED` while archived), no turn is added, and no transaction is created. After `restore`, the same draft can be confirmed again until its TTL. A draft that is already terminal keeps answering with its own `ASSISTANT_DRAFT_CONFLICT` `detail`, and a committed draft still replays. The check row-locks the conversation for the confirm transaction, so a confirm racing an archive either commits first or is rejected.

Phase 38.2 — `POST /conversations/:conversationId/clarifications/:clarificationId/select` (option token or guided fields) gets the same guard: on an `ARCHIVED` conversation it answers `409 ASSISTANT_CONVERSATION_NOT_CONTINUABLE` with `detail: 'CONVERSATION_ARCHIVED'`, and the clarification stays `PENDING` (nothing is claimed). On a conversation deleted mid-request it answers `404 ASSISTANT_CONVERSATION_NOT_FOUND`.

`POST /conversations/:conversationId/restore` is ownership-scoped and idempotent — it reverses `archive`, setting the conversation back to `ACTIVE` and clearing `archivedAt` so it can be continued again. `title` and `sourceChannels` are derived at read time from message/turn history, not stored on the conversation row, so archive/restore never affects them. An `EXPIRED` conversation cannot be restored, mirroring `archive`'s own continuation check — see "`EXPIRED` is reserved, not reachable" below.

`DELETE /conversations/:conversationId` is ownership-scoped and permanently removes the conversation and its own Assistant rows (messages, turns, tool executions, financial drafts, provider executions, idempotency records, clarification requests) via schema-declared cascades — this includes a still-`PENDING_CONFIRMATION` financial draft or a still-`PENDING` clarification request open on the conversation; both are simply cascade-deleted along with everything else, with no special-cased rejection or warning. `ChannelConnection.conversationId` is `onDelete: SetNull`, so a channel link survives pointing at nothing (the link itself, and future messages sent through it, are unaffected — only its association with this specific conversation's history is cleared). `Transaction` has no relation to `AssistantConversation` at all — it is only referenced from `AssistantFinancialDraft`/`AssistantIdempotencyRecord` (`onDelete: Restrict`, which guards the Transaction against deletion while referenced, not the reverse), so deleting a conversation's drafts and idempotency records — including a `COMMITTED` draft's own row — never touches the transactions they reference. Deleting Assistant history can never delete a wallet, category, or transaction. There is no automatic expiration or retention-driven deletion job for conversations; deletion is always explicit and user-initiated.

**Channel operational rows are not part of this cascade.** `ChannelInboundJob.assistantTurnId` and `ChannelAssistantOperation.turnId` are plain string columns with no Prisma `@relation` to `AssistantTurn` — deleting a conversation's turns neither cascades, restricts, nor `SetNull`s them. A job or operation row created for a since-deleted turn keeps that now-dangling id indefinitely; nothing dereferences it back into Assistant history (both rows are read and written by the channel worker pipeline using their own primary/foreign keys, never by joining through `AssistantTurn`), so this is inert rather than a bug, and these rows have their own independent retention window (`src/channels/retention.ts`) that purges them regardless of whether the conversation they originated from still exists.

**`EXPIRED` is reserved, not reachable.** `AssistantConversationStatus` declares three values (`ACTIVE`, `ARCHIVED`, `EXPIRED`), and both `archive` and `restore` explicitly reject an `EXPIRED` conversation. No code path in the current backend ever sets a conversation's status to `EXPIRED` — the value exists in the schema and in these defensive checks for a future producer, not as a reachable state today. (This is a different concept from `AssistantFinancialDraft.status = 'EXPIRED'`, which *is* reachable — a draft past its 15-minute window — and from a `RUNNING` `AssistantTurn`, which has no automatic expiry either; see "Conversation state and recovery" below.)

**Concurrent delete of an actively-`RUNNING` turn.** Deleting a conversation while one of its turns is `RUNNING` (e.g. an in-flight `/messages` call still waiting on the provider) cascades that turn away immediately. Since Phase 37.4 the in-flight request's later bookkeeping writes are a logged no-op; since Phase 38.2 every multi-row Assistant transaction locks the conversation row first (the same order the delete uses), and a lost race answers `404 ASSISTANT_CONVERSATION_NOT_FOUND` instead of a 500 or a deadlock. See `docs/assistant-stuck-states.md` → "Phase 38.2 — global lock order".

Assistant records are historical snapshots of what was presented. Finance-domain tables remain authoritative current truth.

## Financial transaction drafts

`POST /execute` also accepts the allow-listed `transaction.create` intent. Its arguments are `type` (`INCOME`, `EXPENSE`, or — as of Phase 36B — `TRANSFER`), positive decimal `amount` with at most two fraction digits, optional `date` (`YYYY-MM-DD`), optional `description` (maximum 500 characters), optional `merchantReference` for deterministic internal compatibility, exactly one of `walletReference` or `walletId`, and optional `categoryReference` or compatibility `categoryId`. Provider plans require textual `walletReference` and may omit textual `categoryReference` and `date`; those omissions create a persisted guided-fields clarification after wallet/merchant resolution. Provider plans expose neither compatibility ID. `walletId` and `categoryId` are retained only for legitimate deterministic callers. Both category forms, unknown fields, identifier variants, both wallet forms, merchant/mapping identifiers, installments, ownership/type/authorization/confirmation claims, balances, categorization authority/confidence, resolution evidence, trusted constraints, lifecycle fields, and prototype keys are rejected.

**`TRANSFER` (Phase 36B).** `type: 'TRANSFER'` additionally requires `toWalletReference` (a textual destination-wallet reference, resolved exactly like `walletReference`) and rejects `categoryReference`/`categoryId` outright — a transfer never carries a category. There is no `toWalletId` key; the destination wallet can only ever be supplied as a reference, resolved server-side, the same closed boundary already applied to the source wallet. The previous language mapping that treated "transfer untuk membayar" (transfer-to-pay) phrasing as `EXPENSE` has been removed from both the tool description and the deterministic provider-miss type-recovery fallback — transfer-sounding language is never silently classified as `INCOME` or `EXPENSE`.

Wallet resolution applies authenticated owner scope and `isArchived: false` in the database query. Exact canonical names, normalized names, and bounded aliases derived from trusted wallet-name metadata are supported. There is no fuzzy, substring-scored, embedding, semantic, or provider-confidence path. An ambiguous response contains safe display labels, optional wallet-type discriminators, deterministic confidence, and evidence, but no internal option IDs. Unknown, archived, ineligible, and cross-user-only wallets all return the same `not_found` resolution class. These outcomes create no financial draft or mutation.

A resolved wallet continues through the existing owner-scoped wallet/category validation and creates only an `AssistantFinancialDraft`; it never creates a transaction or changes a wallet balance.

Merchant resolution uses `MerchantMapping` because the schema has no standalone `Merchant` model. Its query applies `userId = authenticatedUserId` before candidate materialization and selects only mapping ID, display `merchantName`, and trusted `normalizedMerchant`. The mapping ID remains internal and is not persisted to the draft or transaction. `normalizedMerchant` is the only trusted alias source; arbitrary transaction history and provider output are never aliases. There is no global merchant data, lifecycle state, automatic merchant/mapping creation, alias learning, substring/fuzzy/semantic matching, or resolution write.

Merchant Mapping remains authoritative only for its existing `merchantName → categoryId` purpose. Merchant Resolver uses its trusted name representation but does not copy or override `categoryId`. The existing advisory categorization behavior remains unchanged: Merchant Mapping precedes keyword suggestions, explicit/manual category input remains authoritative, and the reserved Rule Engine stage is not implemented or modified by Phase 22.3.

Category resolution queries only `Category` rows whose `userId` is the authenticated User and whose `type` equals the backend-owned `INCOME` or `EXPENSE` transaction type. It selects only ID, name, and type, takes at most 101 rows, and fails closed when more than 100 eligible candidates exist. `Category.name` is both canonical and safe display text; there are no aliases. Matching uses only the Phase 22.1 NFKC canonical and normalized exact rules. It does not seed default categories, read Merchant Mapping category IDs, read Smart Categorization keywords, scan transaction history or budgets, or perform a write. Consequently, a User whose private lazy defaults have never been seeded can receive `not_found`.

Category `ambiguous` returns bounded safe names and optional type discriminators with no Category IDs. `not_found` covers missing, wrong-type, cross-user-only, and unseeded categories without revealing which case occurred. Both outcomes create no draft, Transaction, or wallet-balance change. Compatibility `categoryId` bypasses textual resolution but is revalidated for authenticated ownership and transaction-type compatibility by draft preparation and again by the existing Transaction Service at confirmation.

The success data contains `draftId`, `PENDING_CONFIRMATION` status, `expiresAt`, normalized `preview`, and `confirmationRequired: true`. During its existing owner/type validation query, draft preparation selects the authoritative Category name. Structured and rendered previews expose that name for display. As of Phase 34, the same owner-scoped `preview` additively includes raw `categoryId` and an unambiguous ISO (`YYYY-MM-DD`, reporting-timezone) `transactionDate` field alongside the existing human-readable `category`/`date` fields — both are safe here because only the authenticated draft owner ever receives this response, and they exist so a client can faithfully preselect category/date controls in an edit-before-confirm UI without a second lookup. The persisted plain-text preview is deterministic and states that explicit confirmation is required. Drafts expire after 15 minutes. Expiration is enforced on confirmation/cancellation even though automatic cleanup is deferred.

- `POST /drafts/:draftId/confirm` requires an `Idempotency-Key` header containing 1–128 ASCII letters, digits, `_`, `.`, `:`, or `-`. It also accepts an optional JSON body of confirm-time overrides — any of `amount` (positive number), `walletId`, `toWalletId` (Phase 36B — `TRANSFER` drafts only), `categoryId`, `description`, `date` (`YYYY-MM-DD`) — all optional, and no other key is accepted. `toWalletId` against a non-`TRANSFER` draft, or `categoryId` against a `TRANSFER` draft, is rejected.
- `POST /drafts/:draftId/cancel` is idempotent while the draft is cancelled.

Confirmation locks the draft in PostgreSQL, checks the database-unique `(userId, key)` record, invokes the existing transaction service inside the same Prisma transaction, links the authoritative transaction, and commits the draft plus the confirmation turn/audit summary atomically. Exact key replay and a different key on an already committed draft return the original committed transaction without another financial effect. Reusing a key for another draft returns `ASSISTANT_IDEMPOTENCY_CONFLICT`. Cancellation of a committed draft and confirmation of cancelled, expired, or failed drafts return a conflict. Unknown and cross-user drafts share the same not-found response.

**Confirm-time overrides (Phase 34).** There is no separate edit endpoint — a draft's amount, wallet, category, description, and date can only be changed by supplying them as overrides on the same `POST /drafts/:draftId/confirm` call that commits the transaction; edit and confirm are one atomic operation, not two. Overrides are merged with the pending draft's own values (override wins, draft is the fallback for every field the caller omits) before the existing Transaction Service is invoked, inside the same Prisma transaction as an ordinary confirm. An overridden `walletId` is revalidated for authenticated ownership; an overridden `categoryId` is revalidated for authenticated ownership and transaction-type compatibility — exactly the same checks draft preparation already applies, just re-run against the caller-supplied value instead of the draft's own. A changed `description` with no explicit `categoryId` override triggers the same deterministic category re-inference `transaction.create` already uses when drafting (Merchant Mapping, then keyword suggestions, then the catch-all category) — an explicit `categoryId` override always wins over re-inference. Overrides are evaluated only after the existing ownership, expiry, status, and idempotency-key checks: they cannot resurrect an expired, cancelled, or already-committed draft, cannot bypass the per-draft advisory lock that serializes concurrent confirm calls into exactly one commit, and cannot change the outcome of an idempotency-key conflict. An invalid or foreign override wallet/category is rejected with the existing `ASSISTANT_DRAFT_NOT_FOUND` response and mutates nothing — the draft is left exactly as it was (still `PENDING_CONFIRMATION`), the same as any other failed confirm attempt before the Transaction Service is reached.

**`TRANSFER` overrides (Phase 36B).** The same mechanism extends to `toWalletId`: an overridden source or destination wallet is revalidated for authenticated ownership, and an overridden source wallet is also revalidated against the existing transfer-source type allowlist (`CASH`/`BANK`/`E_WALLET`); source equal to destination is re-rejected whenever either side changes. A draft's `type` itself is never overridable — there is no `type` key in the override body — so confirm can never turn an `INCOME`/`EXPENSE` draft into a `TRANSFER`, or vice versa.

Audit JSON contains only draft/operation/status and, after commit, transaction ID. Raw draft payloads, wallet objects, balances, request bodies, and internal errors are excluded — this includes override values, which are never written to the audit trail. Authoritative transactions referenced by committed drafts or successful idempotency records are protected by restrictive foreign keys; deleting Assistant history never cascades to a transaction.

If the finance domain rejects confirmation, its transaction is rolled back before any financial mutation or idempotency success can persist. Recording the separate durable rejection history is best-effort: a secondary persistence failure can leave the draft pending, but the API returns no false success and performs no automatic retry. A later explicit retry remains subject to the same lifecycle and idempotency checks. No frontend, external channel, provider failover, tool loop, recovery worker, or stale-draft cleanup worker is part of this phase.

## Clarification selection and cancellation

When wallet, merchant, or category resolution returns `ambiguous` during `transaction.create`, the Backend persists a `ClarificationRequest` with up to five bounded, deterministically ordered options and returns one freshly issued, cryptographically random token per option. Each token is returned exactly once, at creation. Only its SHA-256 digest is stored; the raw token is never persisted, logged, or reconstructable, so a lost token cannot be recovered or reissued — the User must restart from a new ambiguous request.

Entity selection response shape:

```json
{
  "status": "clarification_required",
  "message": "...",
  "data": {
    "kind": "entity_selection",
    "entityType": "wallet",
    "clarification": {
      "clarificationId": "...",
      "entityType": "wallet",
      "prompt": "...",
      "options": [{ "token": "clarify_...", "label": "BCA", "discriminator": "BANK" }],
      "expiresAt": "..."
    }
  }
}
```

Phase 38 — a TRANSFER wallet clarification also carries `clarification.transfer` (absent for every other clarification), in both this response and `GET .../recovery-state`'s `activeClarification`: `{ "field": "SOURCE_WALLET" | "DESTINATION_WALLET", "sourceWalletLabel"?: string }`. `field` uses the same closed values as the capture taxonomy; `sourceWalletLabel` is the user's own already-chosen source wallet, present only on a destination question. The prompt reads `Dari wallet mana? Pilih salah satu: …` (source) or `Dari: <source>. Ke wallet mana? Pilih salah satu: …` (destination), and Telegram buttons are prefixed `Dari: ` / `Ke: `.

When `transaction.create` is otherwise valid but category and/or date is missing, the Backend no longer asks: a missing date becomes today in the reporting timezone, and a missing or unresolvable category is inferred deterministically — the owner-scoped keyword/merchant-mapping suggestion engine first (HIGH/MEDIUM confidence only), then the user's catch-all `Lainnya` category. Both are backend-computed; the client never supplies either. The user corrects an inferred value on the draft before confirming. Only a genuinely ambiguous reference — two or more owned wallets or categories matching the same text — still produces a pre-draft clarification, and it is always a token-based entity selection. If the user owns neither a matching nor a catch-all category, the turn ends with a safe `provider_text` message instead of a draft. Phase 35's reporting-timezone date anchor in the system instruction (above) only helps the model itself resolve a relative date phrase into an explicit one before this point is reached — it does not change this omitted-date default itself, and does not add a new date clarification.

Guided fields are therefore no longer created. The response shape and the guided-submit route below remain supported for clarifications persisted before this behavior changed:

```json
{
  "status": "clarification_required",
  "message": "...",
  "data": {
    "kind": "guided_fields",
    "clarification": {
      "kind": "guided",
      "clarificationId": "...",
      "fields": [
        { "field": "category", "required": true, "input": { "type": "text", "placeholder": "Nama kategori" } },
        { "field": "date", "required": true, "input": { "type": "date" } }
      ],
      "expiresAt": "..."
    }
  }
}
```

- `POST /assistant/conversations/:conversationId/clarifications/:clarificationId/select`
- `POST /assistant/conversations/:conversationId/clarifications/:clarificationId/cancel`

Both routes require an authenticated User and are scoped to that User's own conversation and clarification; an unknown clarification, a clarification owned by another User, and a clarification belonging to a different conversation all return the same `ASSISTANT_CLARIFICATION_NOT_FOUND` response, so ownership and conversation binding are never distinguishable from "not found."

### Select

For entity selection, the request body accepts exactly one key:

```json
{ "optionToken": "clarify_<opaque-example-token>" }
```

Any other shape — a missing key, an additional key, an empty or non-string `optionToken`, an array, or a non-plain-object body — is rejected with `400 BAD_REQUEST` before the token is ever compared against stored digests. Selection is deterministic-only: there is no candidate ID, index, or natural-language selection path.

For guided fields, the same route accepts exactly one `fields` object:

```json
{ "fields": { "categoryReference": "Food", "date": "2026-07-29" } }
```

`fields.date` must be a valid `YYYY-MM-DD` calendar day. `fields.categoryReference` or `fields.category` is treated as untrusted text and resolved through the existing owner-scoped category resolver. Invalid guided field values are rejected before the clarification is consumed, so the User can correct and retry while the request is still pending.

Lifecycle and expiry are resolved from database time before the supplied token is hashed and matched, so an already-terminal or expired clarification never reveals whether the token would otherwise have matched. A non-`PENDING` clarification returns its specific terminal outcome instead of a generic error:

| Condition | HTTP status | Code |
|---|---:|---|
| Clarification not found, not owned, or conversation mismatch | 404 | `ASSISTANT_CLARIFICATION_NOT_FOUND` |
| Token does not match any option on this clarification | 400 | `ASSISTANT_CLARIFICATION_INVALID_OPTION` |
| Already selected | 409 | `ASSISTANT_CLARIFICATION_ALREADY_CONSUMED` |
| Already cancelled | 409 | `ASSISTANT_CLARIFICATION_CANCELLED` |
| Past its 15-minute expiry | 409 | `ASSISTANT_CLARIFICATION_EXPIRED` |
| Terminalized for another reason (e.g. a stored context that no longer parses) | 409 | `ASSISTANT_CLARIFICATION_STALE` |
| Trusted context failed structural validation | 409 | `ASSISTANT_CLARIFICATION_CONTEXT_INVALID` |
| Entity type is no longer one the continuation path recognizes | 409 | `ASSISTANT_CLARIFICATION_CONTINUATION_INVALID` |

A valid, still-pending token atomically claims the clarification (`PENDING → CONSUMED`) and revalidates the selected candidate and any already-resolved prerequisite (wallet, then merchant) under the authenticated User's current ownership before continuing. A successful selection returns one of two safe shapes:

```json
{ "status": "clarification_required", "data": { "kind": "entity_selection", "entityType": "merchant", "clarification": { "clarificationId": "...", "prompt": "...", "options": [{ "token": "...", "label": "..." }], "expiresAt": "..." } } }
```

```json
{ "status": "success", "data": { "draftId": "...", "status": "PENDING_CONFIRMATION", "preview": { "...": "..." } } }
```

The first shape means the wallet → merchant → category sequence has another ambiguity: a new child clarification is created with its own fresh 15-minute expiry and its own tokens (the parent's expiry is never extended), and the original immutable context (amount, type, date, description) carries forward unchanged. The second shape means every entity is now resolved and a `PENDING_CONFIRMATION` draft was prepared; explicit confirmation through `POST /drafts/:draftId/confirm` remains the only path to the Transaction Service — selection itself never creates a Transaction or changes a wallet balance. The provider is never re-invoked during continuation.

The atomic claim, prerequisite/candidate revalidation, child-clarification-or-draft creation, and Assistant lifecycle persistence all run inside the same interactive database transaction. If any downstream step fails, the entire transaction — including the claim — rolls back, so the clarification remains `PENDING` and the same token can be retried safely. No raw token, token digest, internal candidate ID, or trusted-context field appears in any response, error, or log.

### Cancel

The cancel body must be empty (`{}` or no body); any key is rejected with `400 BAD_REQUEST`. Cancellation is idempotent: cancelling an already-cancelled clarification returns the same success response rather than a conflict. Cancelling a clarification that is already `CONSUMED`, `STALE`, or expired returns its existing terminal outcome using the same status/code table as select. A successful cancellation returns:

```json
{ "status": "success", "data": { "clarificationId": "...", "status": "CANCELLED" } }
```

Cancelling creates no child clarification and no draft.

### Conversation state and recovery

The bounded `assistantState` projection returned with conversation reads exposes at most one active clarification (safe labels and optional discriminators only — no tokens, digests, or candidate IDs), one pending draft preview (already including raw `categoryId`; as of Phase 34, also an unambiguous ISO `transactionDate` alongside the existing `date` field — see "Financial transaction drafts" above), the most recent terminal clarification outcome (status and `terminalCode` when applicable), and — since Phase 27 — at most one `activeTurn` (`turnId`, `intent`, `startedAt`) when a turn on this conversation is still `RUNNING`. Phase 38.1 — every status in this projection is the **effective** status, not the raw column: a row past its TTL that lazy expiry has not written yet is reported as expired, without writing (a draft as `EXPIRED`, a clarification as `STALE` + `terminalCode: "expired"`, which is what the lazy write would store). `latestTerminalClarification` is the conversation's most recent clarification when it is effectively terminal, and `latestTerminalDraft` (`{ draftId, status: "EXPIRED" | "FAILED" | "CANCELLED", recordedStatus, originatingTurnId }`) is its most recent draft when that draft is effectively terminal without being committed. Both carry `recordedStatus` (the column; it differs from `status` only for an unwritten expiry) and `originatingTurnId` (the turn that asked the clarification / prepared the draft). If a User loses an issued option token, conversation state cannot recover or reissue it; the only path forward is cancelling (or waiting for expiry) and letting a new request re-resolve the ambiguity from scratch.

`activeTurn` exists so a Web client that lost its connection mid-request (rather than merely retrying) has something authoritative to check before resubmitting: `GET /conversations/:conversationId/recovery-state` surfaces the same `RUNNING` turn independently of whether the original request used an `Idempotency-Key`, so recovery does not depend on the client having kept one. It reflects the same fail-closed limitation as the idempotency claim itself — a crashed process leaves the turn `RUNNING` (and therefore `activeTurn` populated) with no automatic recovery in this phase.
