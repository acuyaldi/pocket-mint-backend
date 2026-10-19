# Pocket Mint Assistant — Audit Phase 21–37.1 (Read-Only)

Date: 2026-10-17
Scope: `pocket-mint-backend`, `pocket-mint-frontend`, `pocket-mint-docs` (3 separate git repos under `/Users/aldi/Documents/Dev/pocket-mint/`)
Method: 8 parallel read-only research passes (direct file/grep/git evidence, no doc-trusting) + personal verification of the highest-risk claims (git topology, financial invariants spot-check, test/typecheck/lint runs). No code modified, no commit, no migration run.

---

## Executive Summary

Core Assistant architecture (Web + Telegram converge on one draft/confirm/transfer pipeline) is sound and the five financial invariants asked about — explicit confirm, idempotent confirm, atomic transfer, exact-match wallet resolution, no auto-replay of ambiguous actions — all **VERIFIED** against actual code, not just comments. Backend (1620/1620) and frontend (768/768) tests pass; `tsc --noEmit` is clean on both.

The five most important findings:

1. **The exact race-condition bug class Phase 37.1 just fixed (unguarded delete/update racing a concurrent mutation, Prisma P2025/P2002) recurs in ~25 other places**, including inside the Assistant's own `conversation.service.ts` (`deleteOwnedConversation`, `archiveOwnedConversation`, `beginTurn`, `finalize*`). A concurrent conversation delete can 500 several Assistant endpoints today. **BLOCKER.**
2. **Phase 37.1 is already merged to `origin/dev` (PR #111, commit `7bccdd2`)** — it is not a local, un-PR'd patch as the task brief assumed. It has not reached `main`. Local checkouts of both backend and frontend repos were stale (a few commits behind `origin/dev`); this report verifies against `origin/dev`, not the stale local trees.
3. **A confirmed/failed/abandoned Assistant state has real stuck-state gaps**: `FAILED` drafts have zero recovery path (no code, no ops tool touches them) and disappear from recovery UI; abandoned `PENDING` clarifications/drafts past `expiresAt` are never swept, only lazily reclassified on next read.
4. **Event capture (Phase 35) is Web-only** — Telegram code paths never call the capture-emitting function — and events are stdout-only log lines with no persistence or dashboard. The Phase 39 "Web vs Telegram" metric is not partially available, it is **structurally impossible** today.
5. **Main is 136 commits behind `dev`**; 14 of the pending migrations are essentially the entire Assistant feature (Phase 19 merchant-mapping through Phase 37 wallet-alias). Promoting `dev` → `main` is a first-time production rollout of this whole feature, not an incremental patch.

---

## Phase Verification Table (21–37.1)

| Phase | Claim | Status | Evidence |
|---|---|---|---|
| 21–26 | Assistant core, draft, clarification, entity resolution, Telegram foundation, durable channel processing | **VERIFIED** (existence & operation); doc-text cross-check **not performed** for this bundle — scope of the docs-vs-code pass began at Phase 27 | Module inventory: `src/assistant/*` (application.service.ts, financial-draft.service.ts, clarification.service.ts, entity-resolution/*), `src/channels/*`, `src/telegram/*`; all exercised by 125 passing backend test files incl. `financial-draft.integration.test.ts`, `clarification-http.integration.test.ts`, `entity-resolution-transaction.integration.test.ts`, `telegram-callback.integration.test.ts` |
| 27 | Idempotency request + recovery turn | **VERIFIED** | `conversation.service.ts:298-310,313,334` (`claimIdempotencyKey`/`resolveIdempotencyKey`/`releaseIdempotencyKey`); `prisma/schema.prisma:230-263` (`AssistantIdempotencyRecord`, `@@unique([userId,key])`); `application.service.ts:230-244`; `provider-runtime.ts:176-191` |
| 28 | Operational visibility for failure Assistant/channel | **VERIFIED** | `src/domain/opsVisibility.ts:21-124` (pure projectors, `STALE_RUNNING_TURN_MS` const); `src/scripts/opsVisibility.ts` (read-only CLI, `findMany`/`count` only, no HTTP route) |
| 29 | Safe operator remediation, no auto-replay of ambiguous actions | **VERIFIED** | `src/domain/opsRemediation.ts:32-90` (3 gated update builders, none touch `status`→`PENDING` or any Assistant financial table); `src/scripts/opsRemediate.ts` (dry-run default, `--apply` required, one row id per call) |
| 30 | Web vs Telegram attribution on conversation/turn | **VERIFIED** | `prisma/schema.prisma:79,159` (`AssistantChannel` enum, `@default(WEB)`); `inbound.worker.ts:50` stamps `TELEGRAM` post-hoc; frontend badge `AssistantConversationHistoryList.tsx:198` |
| 31 | Telegram delivery status for Assistant responses | **VERIFIED** | `conversation.service.ts:13,226-247` (`DELIVERY_STATUS_MAP`, computed not stored); `ChannelDeliveryStatus` enum `prisma/schema.prisma:792-798`; frontend `AssistantMessage.tsx:27-54` |
| 32 | Historical delivery status UNKNOWN after retention purge | **VERIFIED** | `conversation.service.ts:31-37` `resolveDeliveryStatus()` → `mappedStatus ?? 'UNKNOWN'`; `UNKNOWN` is **app-level only**, not a DB enum value (`ChannelDeliveryStatus` has 5 members, no `UNKNOWN`); produced purely by the *absence* of a `ChannelOutboundDelivery` row after `src/channels/retention.ts` hard-deletes it |
| 33 | Archive/restore/delete conversation + cascade safety | **VERIFIED** | `conversation.service.ts:255-264` (archive/restore, EXPIRED guard); `EXPIRED` status is declared but **never assigned anywhere in `src/`** — checked-against, not written (flag, see Findings); cascade: `AssistantTurn`/`Message`/`FinancialDraft`/`ToolExecution`/`ProviderExecution`/`ClarificationRequest` all `onDelete: Cascade` from `AssistantConversation` |
| 34 | Draft correction (edit before confirm, full preview, coverage override) | **VERIFIED** | `financial-draft.service.ts:40-65,132-212` (`preview()`/`confirm()` merge overrides atomically, re-validate only overridden wallet/category); frontend `src/features/assistant/utils/draftEdit.ts` reads raw `categoryId`/`transactionDate`, not display strings |
| 35 | Date anchor, "k" nominal parsing, privacy-safe event capture | **VERIFIED** | `provider-instruction.ts:38` (date-anchor sentence); `rupiah-amount-recovery.ts:3,5,36` (`k`/`K` suffix, shared thousands multiplier); all 6 `assistant.capture.*` events traced field-by-field to source — **no raw message/amount/wallet-name field found in any payload** (see Event Capture section) |
| 36A | Policy transfer (explicit confirm, two-wallet preview, Telegram handoff) | **VERIFIED**; no standalone decision doc exists (folded into PD-026) — docs-structure note only | `policy.ts:17,40-41` (`STEP_UP` declared but genuinely unused — confirms transfer never escalates past normal confirm); `interaction.service.ts:164-170` explicit TRANSFER→web-app handoff for Telegram |
| 36B | Natural-language transfer capture — "di dev" | **VERIFIED** (code); **merge status corrected**: merged to `origin/dev` for both backend and frontend (`merge-base --is-ancestor` = YES both repos). Backend local `dev` already had it; **frontend local `dev` was 6 commits stale and did not** — verified directly against `origin/dev` instead | `tools.ts:16,20,27,31,75-151` (`type: TRANSFER`, `toWalletReference`); migration `20261015160518_assistant_transfer_draft_fields`; frontend `origin/dev:src/features/assistant/components/DraftSummaryCard.tsx` (`isTransfer`, `toWalletId`) |
| 37 | Wallet alias management, exact resolution, namespace collision protection — "di dev" | **VERIFIED** (code); same merge-status correction as 36B — merged to `origin/dev` both repos, frontend local checkout stale | `prisma/schema.prisma:429-443` (`WalletAlias`, `@@unique([userId,aliasNormalized])`); `wallet-resolver.ts:35-72` (alias merged into `alias_exact`/`normalized_exact` tiers only, no fuzzy); `walletNamespace.lock.ts` (advisory lock); routes: `POST/DELETE .../aliases` only, no update endpoint |
| 37.1 | Fix race concurrent alias delete (P2025 → 404) — "patch lokal, belum PR" | **MISMATCH on framing, code claim VERIFIED** | Code: commit `2325c2d` wraps `walletAlias.service.ts remove()`'s unguarded `delete()` in try/catch mapping `P2025`→404, mirroring `wallet.service.ts`'s existing convention. **Merge status is wrong in the task brief**: `git merge-base --is-ancestor 2325c2d origin/dev` = **YES** (PR #111, merge commit `7bccdd2`); `...origin/main` = NO. It is pushed and merged to staging (`origin/dev`), not local/unpushed — only this session's local backend checkout (2 commits stale) still showed the vulnerable code on disk. |

---

## Architecture (Summary)

```
 WEB CLIENT                                   TELEGRAM
     | POST /assistant/messages                   | POST /telegram/webhook
     v                                             v
 assistant.controller.ts            telegram.service.ts:handleUpdate
     |                                 (persist ChannelInboundJob, ack, 200)
     |                                             v
     |                                   [async durable worker poll]
     |                                   inbound.worker.ts:processJob
     |                                     /                \
     |                              text message         CALLBACK (button)
     |                       (assistantOperationGuard         |
     |                        idempotency guard)      interaction.service.ts:
     v                               |                 processCallback
 provider-runtime.ts:sendMessage <---+               (re-derive ownership
     |                                                 server-side, claim token)
     v                                                        |
 application.service.ts:execute                                |
     | resolveEntity (wallet/merchant/category, exact-match only)
     |   ambiguous -> clarification.service.ts (PENDING, 15min TTL) <---+
     |   resolved   -> financial-draft.service.ts:prepare (PENDING_CONFIRMATION)
     v
 ================ CONVERGENCE: same AssistantFinancialDraft row ================
     | POST /assistant/drafts/:id/confirm         DRAFT_CONFIRM callback (same fn)
     v
 financial-draft.service.ts:confirm
   advisory lock(draftId) -> status guard -> transactions.createTransaction()
   -> atomic updateMany(PENDING_CONFIRMATION -> COMMITTED)
     v
 Transaction row created (single row; TRANSFER = one row + 2 wallet-balance deltas,
 both inside the same $transaction as the draft claim — no partial-write path found)
```

Telegram and Web share **one** application/draft/confirm pipeline from `application.service.ts` onward; Telegram-specific code (`telegram.service.ts`, `inbound.worker.ts`, `interaction.service.ts`) only handles ingestion, durability, and delivery.

### State machines (key points; full detail in agent transcripts)

- **AssistantFinancialDraft**: `PENDING_CONFIRMATION → {COMMITTED | CANCELLED | EXPIRED | FAILED}`. `EXPIRED` is lazy (only checked on a later confirm/cancel call, no sweep). **`FAILED` has no outbound transition anywhere** — stuck state (Finding B).
- **ClarificationRequest**: `PENDING → {CONSUMED | CANCELLED | STALE}`, all transitions atomic (`updateMany` + count guard). A `PENDING` row past `expiresAt` that nobody re-touches stays `PENDING` in the DB and in `getAssistantState` — no sweep (Finding E).
- **AssistantTurn**: `PENDING → RUNNING → {SUCCEEDED|FAILED|REJECTED|CLARIFICATION_REQUIRED}`. A crash mid-`RUNNING` stays `RUNNING` forever; the only exit is Phase 29's manual `reconcile-turn` CLI, one turn id at a time.
- **AssistantConversation**: `ACTIVE ↔ ARCHIVED`; `EXPIRED` is declared in the enum and **checked against** but never written anywhere in `src/` — dead/reserved value (open question, see below).

---

## Findings

### BLOCKER

**B1 — Same P2025/P2002 race-condition bug class as the just-fixed alias-delete bug recurs in ~25 other sites, including inside Assistant core.**
- Cause: `findFirst`/ownership-check-then-`update`/`delete` without catching the TOCTOU Prisma error, same shape Phase 37.1 just patched for `walletAlias.service.ts`.
- Impact: Any of these endpoints returns a raw, unhandled 500 instead of a clean 404/409 under concurrent access. Worst instances are **inside the Assistant's own conversation lifecycle**: `conversation.service.ts` `deleteOwnedConversation` (direct structural twin of the fixed bug, HTTP-exposed via `DELETE /assistant/conversations/:id`), `archiveOwnedConversation`, `restoreOwnedConversation`, `beginTurn`, `finalize`/`finalizeRejected`/`finalizeWithoutTool`, and the conversation-touching updates inside `financial-draft.service.ts:confirm/cancel` (whose advisory lock is keyed on `draftId`, not `conversationId`, so it does not cover this race). Also present in `budget.service.ts` (3 sites), `savingGoal.service.ts` (3), `recurringTransaction.service.ts` (2, one an exact twin of the fixed bug), `merchantMapping.service.ts` (2), `installment-payment.service.ts`, `notification.service.ts`, `transaction.service.ts` (partial — P2003 mapped, P2025 not), `user.controller.ts:sync` (P2002), `provider-audit.service.ts`.
- Evidence: full table in race-condition agent transcript; reference-pattern commit `2325c2d`.
- Recommendation: extract the 3-line try/catch already duplicated in `wallet.service.ts` and `walletAlias.service.ts` into a shared helper (e.g. `withP2025As(errorFactory, fn)` / `withP2002As(...)`), apply to all AT-RISK sites, prioritizing the ones inside `conversation.service.ts` and `financial-draft.service.ts` since those are reachable from the Assistant's own hot paths.
- Size: **M** (one shared helper + ~25 mechanical call-site updates + tests).

**B2 — `FAILED` draft state has no recovery path (genuine stuck state).**
- Cause: `confirm()` transitions a draft to `FAILED` when `transactions.createTransaction` throws (e.g. insufficient balance), but `confirm()`'s and `cancel()`'s own precondition (`status === 'PENDING_CONFIRMATION'`) permanently locks out a `FAILED` draft from either action. `getAssistantState` only surfaces `PENDING_CONFIRMATION` drafts, so it also vanishes from the recovery UI. Phase 29's ops CLI has no subcommand touching `AssistantFinancialDraft` at all (deliberately, per its own code comment).
- Impact: a user whose transaction legitimately fails (e.g. insufficient balance) has no in-product way to see or dismiss that failed attempt; the conversation/draft is just silently dead from their perspective, and it's invisible to support tooling too.
- Evidence: `financial-draft.service.ts:262` (FAILED assignment), `:147-151`/`:278-281` (guards that block FAILED from any further transition), `clarification.service.ts:439-440` (`getAssistantState` filters to `PENDING_CONFIRMATION` only), `opsRemediate.ts` (no draft subcommand).
- Recommendation: either allow `cancel()` to also accept a `FAILED` status (closing the loop as a no-op cleanup), or surface `FAILED` drafts in `getAssistantState` so the recovery UI can at least show "this failed, start over" instead of nothing.
- Size: **S**.

**B3 — Event capture cannot answer the Phase 39 "Web vs Telegram" question at all, and has no persistence layer.**
- Cause: `logCaptureLifecycle()` (the only place Phase 35's 6 `assistant.capture.*` events fire) is called exclusively from `assistant.controller.ts` (Express HTTP layer). Telegram's `inbound.worker.ts` and `interaction.service.ts` call the underlying provider-runtime functions directly, bypassing the controller entirely. All six events are also pure `console.log` structured lines — no DB table, no sink, no dashboard, no query script exists anywhere in the repo.
- Impact: Phase 39 cannot compute a Web-vs-Telegram breakdown from this data at all (not "partial" — literally 0% of Telegram activity is captured), and any other Phase 39 metric requires building a log-ingestion pipeline or a persisted events table from scratch, since nothing reads these lines today.
- Evidence: `assistant.controller.ts:71-80` (`logCaptureLifecycle`, only call sites at 164/200/356/301/326/310/324/385, all controller-layer); `inbound.worker.ts:257`, `interaction.service.ts:256-272` (direct provider-runtime calls, no capture hook); `src/utils/logger.ts:170` (`logEvent` → stdout only, confirmed no DB/sink).
- Recommendation: decide the Phase 39 data destination (persisted table vs. external log pipeline) before building more events on top; at minimum, add a channel field to the event payload and call the capture path from the Telegram code too.
- Size: **L** (architecture decision + implementation, not a quick patch).

### IMPROVEMENT

**I1 — Abandoned PENDING clarifications/drafts past `expiresAt` are never swept, only lazily reclassified on next read.** A clarification or draft nobody ever acts on again after expiry stays `PENDING`/`PENDING_CONFIRMATION` in the DB and in `getAssistantState` indefinitely. Not blocking, but misleading for ops visibility and for any future metrics based on terminal-state counts. *Recommendation:* a bounded background sweep (same poll-loop pattern already used by `src/channels/retention.ts`). **Size: S.**

**I2 — `AssistantConversation.EXPIRED` is declared but never written anywhere in `src/`.** Either dead code in the enum or a planned-but-unbuilt retention job. *Recommendation:* confirm intent with the team (see open questions); remove or implement. **Size: S.**

**I3 — Frontend has no source/destination wallet disambiguation field for TRANSFER clarifications.** `AssistantClarificationEntityType` has one `"wallet"` value; the static label text ("Select the wallet that should fund this transaction") hard-codes source/funding semantics regardless of which slot is actually being asked about. Multiple agents could not confirm this clarification path is currently reachable for TRANSFER (entity-resolution ambiguity may not trigger mid-capture today) — flagged as a Phase 38 planning input, not a confirmed live bug. **Size: S–M** depending on whether a backend field needs adding.

**I4 — Recovery-after-refresh stale-banner bug.** If a recovered `activeClarification`/`pendingDraft` goes stale (consumed/cancelled/expired elsewhere) *between* the recovery GET and the user's next click, the mutation's `onError` path never invalidates the recovery-state query — the dead card stays rendered, a toast explains the error, but "New Conversation" stays disabled (explicitly excluded while `recoveryState.kind` is `clarificationRecovered`/`draftRecovered`). Only a manual page reload escapes it. *Recommendation:* invalidate the recovery-state query in `onError`, not just `onSuccess`, in `useAssistantMessages.ts` and `useAssistantDraft.ts`. **Size: S.**

**I5 — Double-click/idempotent-confirm UI protection is implemented but untested.** `DraftActionBar.tsx` disables both buttons while a mutation is pending — correct implementation — but no test (unit, Storybook play, or e2e) actually fires two clicks and asserts single submission. The two unit "tests" that claim this are static source-string matches; the e2e test's own comment overclaims ("this also proves a duplicate click... couldn't double-submit") while only clicking once. The backend is independently verified idempotent (advisory lock + atomic `updateMany`), so this is not a safety gap — it is a coverage gap that would miss a UI regression (e.g. button re-enabling on a stale render). Also: clarification select/cancel has a hook-level re-entrancy guard in addition to the UI disable; draft confirm/cancel does not — minor defense-in-depth asymmetry. **Size: S** (add one real double-click test per path).

**I6 — `GuidedClarificationCard.tsx` has no Storybook story**, so it's excluded from the project's a11y CI gate (which only runs on story-covered components). **Size: S.**

**I7 — 7 channel-worker env vars are undocumented in `.env.example`**: `CHANNEL_WORKERS_ENABLED`, `CHANNEL_INBOUND_POLL_MS`, `CHANNEL_OUTBOUND_POLL_MS`, `CHANNEL_BATCH_SIZE`, `CHANNEL_LEASE_MS`, `CHANNEL_MAX_ATTEMPTS_INBOUND`, `CHANNEL_MAX_ATTEMPTS_OUTBOUND`, `CHANNEL_RETENTION_DAYS`. All have safe defaults, but an operator tuning retention/poll cadence (a trade-off Phase 32's own doc explicitly discusses) has nothing in `.env.example` to discover these exist. **Size: S.**

**I8 — Schema drift: several FK-shaped scalar columns have no declared Prisma relation**, so the DB enforces no referential integrity on them: `AssistantFinancialDraft.walletId`/`toWalletId`/`categoryId`, `ClarificationRequest.executionId`, `ChannelInboundJob.assistantTurnId`, `ChannelAssistantOperation.userId`/`turnId`, `ChannelCallbackToken.conversationId`/`clarificationRequestId`/`clarificationOptionId`/`financialDraftId`. Adjacent code comments suggest this is a deliberate cross-domain decoupling choice, not an accident — but it means a row can reference a nonexistent id and nothing cascades/nulls it at the DB layer. **Size: confirm intent first (open question), then S if a fix is wanted.**

**I9 — Event capture metrics 4a/4b are coarse, not field-level.** `clarificationKind` is a 5-value bucket (`wallet/merchant/category/transaction_fields/provider_text`), not per-field; `'transaction_fields'` can mean `date` and/or `category` and the event doesn't say which. `overridesUsed` on draft confirm is a single boolean, not per-field or iteration-counted. Also no `clarification_expired` capture event exists (asymmetric with `draft_expired`). **Size: S** per field added.

### OPTIONAL

- Minor stale doc comment: `walletAlias.service.ts:153` claims `findCollidingWalletName` is "exposed for `wallet.service.ts`'s reverse check," but `wallet.service.ts` doesn't import it — it duplicates the logic inline instead. Same result, just redundant code; low priority.
- `AssistantFinancialDraft` recovery projection still returns both the legacy naive-UTC-slice `date` field and the correct `transactionDate` field — PD-024 already flags `date` for eventual retirement, not yet actioned.
- No standalone Phase 36A decision doc exists (folded into PD-026/"Phase 36B") — docs-structure nit, not a code issue.
- Backend has no ESLint config/script at all (frontend does, and is clean except one pre-existing unused-var warning in `AssistantConversation.tsx:16`). Not urgent given `tsc --noEmit` is clean, but worth deciding if backend should get one.

---

## Event Capture vs. Phase 39 Metrics — Gap Summary

| Metric | Computable today? | Gap |
|---|---|---|
| Clarification count per field | **Partial** | Only per-kind (5 buckets), not per actual field name |
| Draft edit rate | **Partial** | Single boolean at confirm time only; no per-field, no edit-iteration count, no separate edit event |
| Cancel rate — drafts | **Yes** | `draft_confirmed`/`draft_cancelled`/`draft_expired` are distinct, mutually exclusive |
| Cancel rate — clarifications | **Partial** | No `clarification_expired` event; expiry surfaces only via a different (ops) event family |
| Direct-draft vs clarification-needed rate | **Yes** | `draft_created{captureSource:'direct'}` vs `clarification_required` — this is what Phase 35 was explicitly built for |
| Source: Web vs Telegram | **No** | Telegram never calls the capture-emitting function; 0% of Telegram activity is represented |

Privacy-safe claim: **VERIFIED** for all 6 events — every field traced to source; none carries raw message text, raw amount, or raw wallet/merchant name. No query/script/dashboard reads these events anywhere in the repo (stdout-only).

---

## Test Coverage & CI Results

- Backend: `npm test` (vitest) → **1620 passed, 262 skipped** across 148 files (125 passed, 23 skipped), 24.33s. `npx tsc --noEmit` clean. No ESLint config present (no lint script).
- Frontend: `npm run lint` → clean, 1 pre-existing warning. `npm test` (vitest unit project) → **768 passed**, 57 files, 1.69s. `npx tsc --noEmit` clean.
- Concurrency-specific coverage: backend's financial invariants (advisory lock + atomic `updateMany`) are exercised by integration tests per the architecture/invariants passes, but **no test specifically simulates concurrent double-confirm or concurrent alias delete at the HTTP layer** beyond the new Phase 37.1 integration test (`test/walletAlias/walletAlias.integration.test.ts`, added in `2325c2d`, uses a disposable Postgres to force the real TOCTOU ordering — this is the one concurrency-specific test found in the whole sweep). Frontend double-click protection: **implemented, not tested** (see Finding I5).
- Per-area coverage (backend): Assistant core/draft/clarification/entity-resolution — covered (dedicated integration test files per module). Channel/Telegram — covered (`telegram-callback.integration.test.ts` etc.). Alias — covered, including the new race test. Event capture — **not directly tested** (no test asserts the 6 capture events' payload shape).
- Per-area coverage (frontend): clarification/draft components — covered by Storybook stories + `tests/assistant.test.ts`; `GuidedClarificationCard` — **no story** (Finding I6); e2e exists for draft/clarification/history/mobile/empty-state flows.

---

## Release Readiness Assessment

| Item | Ready? | Why |
|---|---|---|
| (a) PR for Phase 37.1 | **Already done** | Not a pending action — `2325c2d` is merged to `origin/dev` via PR #111. No new PR needed; recommend a *follow-up* ticket for the ~25 other sites found in Finding B1 instead. |
| (b) Phase 38 (clarification flow work) | **Belum** | Two concrete inputs block clean planning: (I3) unresolved product decision on TRANSFER source/destination disambiguation, and (I4) the recovery-after-refresh stale-banner bug should be fixed first so Phase 38 isn't built on top of a known-broken recovery path. |
| (c) Phase 39 data observation | **Belum** | Event capture is Web-only and stdout-only (Finding B3) — the single most commonly wanted breakdown (Web vs Telegram) is impossible today, and several other metrics are only coarse-grained (I9). Needs an architecture decision before more events are added. |
| (d) Release dev → main | **Belum** | `main` is 136 commits behind `dev`; 14 pending migrations constitute essentially the entire Assistant feature going to production for the first time. Recommend, before promoting: (1) decide whether to fix at least the Assistant-core race-condition sites from Finding B1 first (they're reachable from day-one production traffic), (2) a full manual smoke test of both Web and Telegram flows (confirm, cancel, transfer, alias create/delete, Telegram `/link`, callback buttons), (3) a rollback plan — given this is an additive-only migration set (confirmed: `git diff main..dev -- prisma/migrations` is 100% insertions, no edits to existing migrations), a straight revert of the merge commit plus `prisma migrate resolve` back to the pre-Assistant migration should be low-risk, but this has not been tested and should be rehearsed, not assumed. |

---

## Open Questions (max 5)

1. Is `AssistantConversation.EXPIRED` intentionally unreachable today (a future retention job not yet built) or dead code that should be removed from the enum? (Finding I2)
2. Should `FAILED` drafts get an explicit recovery/cancel path, or is "the user starts a new conversation" the intended permanent behavior for a failed confirm? (Finding B2)
3. Should the ~25 other P2025/P2002 race-condition sites (Finding B1) — especially the ones inside the Assistant's own conversation/turn lifecycle — be fixed before `dev → main` promotion, or tracked as a separate follow-up ticket?
4. Is TRANSFER source/destination wallet clarification actually a reachable code path today? Multiple research passes could not confirm the backend ever sends a mid-TRANSFER-capture wallet clarification in the current flow — this needs to be confirmed before scoping Phase 38's disambiguation work (Finding I3).
5. What's the intended data destination for Phase 39 metrics — a new persisted events table, or an external log-aggregation pipeline reading the existing stdout lines? This decision gates whether to extend the current `assistant.capture.*` shape or redesign it (Finding B3).
