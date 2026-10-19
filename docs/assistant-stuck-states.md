# Assistant state machines — final semantics (Phase 37.3, updated 38.2)

Companion to `docs/audit/assistant-audit-phase-21-37.md` (finding B2 and the
state-machine section) in the top-level `pocket-mint` workspace. This doc is
the authoritative reference for `AssistantFinancialDraft` and
`ClarificationRequest` terminal/stuck-state semantics after Phase 37.3, and
the state/marker list Phase 38 (clarification flow UX) should build against.

## Draft (`AssistantFinancialDraft`)

```
PENDING_CONFIRMATION ──confirm (success)──────────────► COMMITTED
       │
       ├──cancel──────────────────────────────────────► CANCELLED
       │
       ├──confirm/cancel attempted after expiresAt─────► EXPIRED
       │   (lazy — only transitions when something tries to act on it)
       │
       └──confirm fails with a genuine TransactionError─► FAILED
           (e.g. insufficient funds, wallet/category deleted)

COMMITTED, CANCELLED, EXPIRED, FAILED — terminal. Nothing transitions out.
```

| From | To | Trigger | Code reference |
|---|---|---|---|
| `PENDING_CONFIRMATION` | `COMMITTED` | explicit, authenticated `confirm()`, atomic `updateMany` guarded on `status='PENDING_CONFIRMATION', transactionId=null` | `financial-draft.service.ts: confirm()` |
| `PENDING_CONFIRMATION` | `CANCELLED` | explicit, authenticated `cancel()` | `financial-draft.service.ts: cancel()` |
| `PENDING_CONFIRMATION` | `EXPIRED` | lazy, on the next `confirm()`/`cancel()` call after `expiresAt` | `financial-draft.service.ts: confirm()`, `cancel()` |
| `PENDING_CONFIRMATION` | `FAILED` | `confirm()`'s own `transactions.createTransaction()` call throws a `TransactionError` (insufficient funds, wallet/category vanished, etc.) | `financial-draft.service.ts: confirm()` catch block |
| any terminal status | *(rejected)* | any further `confirm()`/`cancel()` call | single allowlist guard: `if (draft.status !== 'PENDING_CONFIRMATION') throw AssistantError.draftConflict(draft.status)` in both functions |

**Illegal-transition rejection**: one allowlist check per function (`confirm()`,
`cancel()`) — "the draft must still be `PENDING_CONFIRMATION`" — not a
blocklist of terminal statuses. This fails closed: a status added to the enum
in the future is rejected by default instead of silently permitted.

**FAILED is explicitly terminal and never auto-replayed.** No code path in
this repository ever writes a `FAILED` draft back to any other status, and no
code path ever re-attempts the transaction a `FAILED` draft represents. The
user's only recovery is sending a new message, which creates a brand-new
draft — `FAILED` drafts are never resurrected or retried on the user's
behalf. (Grep-verifiable: `status: 'FAILED'` is written in exactly one place,
`financial-draft.service.ts`'s `confirm()` catch block, and read only by
guards that reject further action and by the ops visibility script below.)

**Client-visible marker.** A `confirm()`/`cancel()` call rejected by the
allowlist guard throws `AssistantError.draftConflict(status)`, which carries
`statusCode: 409`, `code: 'ASSISTANT_DRAFT_CONFLICT'`, and — as of Phase
37.3 — `detail: status` (one of `FAILED`, `EXPIRED`, `CANCELLED`,
`COMMITTED`, `TERMINAL`). `detail` now flows through `forwardError.ts` →
`sendError()` into the HTTP envelope's `error.detail` field (previously
dropped), so a client can branch on the exact terminal status without
parsing `message`. This is additive: every other domain error leaves
`detail` unset, so their envelopes are byte-for-byte unchanged.

**Race-safety of the lazy `EXPIRED` write (Phase 37.3).** `confirm()` and
`cancel()` both open their advisory lock on `hashtextextended(draftId, 0)`
before reading the draft, so two concurrent calls on the *same* draft are
fully serialized — the loser always re-reads a status that is no longer
`PENDING_CONFIRMATION` and takes the generic conflict path. That lock does
**not** cover a concurrent `deleteOwnedConversation`, which cascade-deletes
the draft (`AssistantFinancialDraft.conversationId → Cascade`) from a
different transaction — a real TOCTOU. The `EXPIRED` write (and the `FAILED`
write, fixed for consistency since it has the identical shape) now goes
through `withPrismaErrorTranslation` (`src/utils/prismaErrors.ts`, Phase
37.2), translating a losing `P2025` into `AssistantError.draftNotFound()`
instead of an unhandled 500.

## Clarification (`ClarificationRequest`)

```
PENDING ──select (success)─────────────────────► CONSUMED
   │
   ├──cancel───────────────────────────────────► CANCELLED
   │
   └──select/cancel/consumeGuidedFields
      attempted after expiresAt, or with an
      invalid trustedContext/entityType───────► STALE (terminalCode: 'expired' | 'context_invalid' | 'continuation_invalid' | user-supplied reason)

CONSUMED, CANCELLED, STALE — terminal. Nothing transitions out.
```

Clarifications have no separate `EXPIRED` enum value — `STALE` with
`terminalCode: 'expired'` **is** the expired final state, set by the same
`terminalizeOrReportActual()` helper every other terminal-but-not-literally-
expired case uses (invalid trusted context, invalid entity type, user
cancellation reason). This was already true before Phase 37.3; this doc
makes the equivalence explicit so Phase 38 doesn't look for a nonexistent
`EXPIRED` status on this model.

**Illegal-transition rejection**: `terminalStatusError(status, terminalCode)`
in `clarification.service.ts` is the single place every non-`PENDING` match
is rejected, mapping `CONSUMED`/`CANCELLED`/`STALE` (+ `terminalCode`) to the
specific `AssistantError.clarification*()` factory.

**Race-safety**: already atomic before Phase 37.3 — every transition is a
conditional `updateMany` guarded on `status: 'PENDING'`, count-checked; the
loser of a concurrent race re-reads and reports the actual winning terminal
status (`terminalizeOrReportActual`, `select()`, `cancel()`,
`consumeGuidedFields()`). No change needed here.

## Abandoned `PENDING` (draft and clarification) — TTL and final-state decision

**TTL**: reused existing constants, no new TTL introduced.
- Draft: `ASSISTANT_FINANCIAL_DRAFT_TTL_MS = 15 * 60 * 1000` (`src/assistant/financial-draft.ts`).
- Clarification: `CLARIFICATION_TTL_MS = 15 * 60 * 1000` (`src/assistant/clarification.service.ts`).

**Decision: lazy expiry only, no periodic sweep.** Scope B explicitly allows
choosing one mechanism when it's sufficient. Reasoning:
1. Every mutation path (`confirm()`, `cancel()`, `select()`,
   `cancelClarification()`, `consumeGuidedFields()`) already lazily
   transitions a past-TTL row to its terminal state the next time anyone
   tries to act on it, and does so race-safely (advisory lock for drafts,
   conditional `updateMany` for clarifications).
2. No generic, reusable scheduler exists for Assistant-only (Web-reachable)
   tables. `src/channels/retention.ts` is channel-specific — its cleanup is
   opportunistically triggered from the Telegram inbound/outbound worker
   poll loops, so it does nothing for a Web-only conversation with no
   channel involvement at all. Building a new standalone scheduler just for
   this would be new infrastructure the task explicitly says not to add
   when an existing mechanism (lazy expiry) already suffices.
3. The one real gap lazy-only leaves is **read-path staleness**:
   `getAssistantState()` (clarification.service.ts) was reporting a
   past-TTL-but-not-yet-touched row as the conversation's "active"
   clarification/draft, because its queries filtered on `status` alone.
   Fixed directly: both queries now also filter `expiresAt: { gt: now }`
   (database time, matching every other expiry check in that file), so an
   abandoned row stops being surfaced as actionable immediately, without
   needing its DB status column to have flipped yet.
4. Residual imperfection, accepted: the DB `status` column itself can still
   say `PENDING`/`PENDING_CONFIRMATION` for a row nobody has touched since
   it expired, until the next touch (see "Effective vs recorded status"
   below — read paths report the effective status since Phase 38.1). This is cosmetic/audit-trail only —
   not a correctness or safety issue, since every actionable read/write path
   already treats it as inactionable. Ops visibility (below) surfaces these
   rows directly by `expiresAt`, not by status, so this residual lag is
   still fully visible to operators.

## Operational visibility (Phase 28/29, extended — no new tooling)

`src/domain/opsVisibility.ts` + `src/scripts/opsVisibility.ts` (read-only,
`findMany`/`count` only, same contract as before) now also report:
- **FAILED drafts** — count + recent rows (`id`, `userId`, `conversationId`,
  `operation`, `transactionType`, `status`, `createdAt`, `expiresAt`,
  `failedAt`; never `amount`/`walletId`/`categoryId`/`description`). Joins
  the existing exit-code-2 ("actionable") trigger alongside ambiguous
  executions and stale running turns.
- **Abandoned `PENDING_CONFIRMATION` drafts** and **abandoned `PENDING`
  clarifications** — detected directly by `expiresAt < now`, not by status
  (status lags by design, see above). Reported for visibility only; does
  **not** affect the exit code — these are harmless by design, not an
  incident.

No new script, no new CLI, no mutation added anywhere in this file (it
still issues zero `create`/`update`/`delete`).

## State/marker list for Phase 38

What a client (Web or Telegram) can rely on after this phase, when planning
clarification-flow UX work:

| Entity | Terminal states | How a client is told | Actionable? |
|---|---|---|---|
| Draft | `COMMITTED` | `confirm()` 200 response | no — done |
| Draft | `CANCELLED` | `cancel()` 200, or a conflict with `error.detail: 'CANCELLED'` | no |
| Draft | `EXPIRED` | conflict with `error.detail: 'EXPIRED'` | no — start a new message |
| Draft | `FAILED` | conflict with `error.detail: 'FAILED'` | no — start a new message, never auto-retried |
| Clarification | `CONSUMED` | `select()`/`consumeGuidedFields()` success, or `ASSISTANT_CLARIFICATION_ALREADY_CONSUMED` | no |
| Clarification | `CANCELLED` | `cancel()` success, or `ASSISTANT_CLARIFICATION_CANCELLED` | no |
| Clarification | `STALE` (`terminalCode: 'expired'`) | `ASSISTANT_CLARIFICATION_EXPIRED` | no — start a new message |
| Clarification | `STALE` (other `terminalCode`) | `ASSISTANT_CLARIFICATION_STALE` / `*_CONTEXT_INVALID` / `*_CONTINUATION_INVALID` | no |
| Draft | `PENDING_CONFIRMATION` | present in `getAssistantState().pendingDraft` (only while `expiresAt` is still in the future) | **yes** |
| Clarification | `PENDING` | present in `getAssistantState().activeClarification` (only while `expiresAt` is still in the future) | **yes** |

Practical implication for Phase 38: `getAssistantState()`'s *absence* of
`pendingDraft`/`activeClarification` is now a reliable "nothing actionable"
signal on its own (no more false "still active" reads past TTL) — Phase
38's recovery-after-refresh work can trust it directly instead of also
re-validating `expiresAt` client-side.

## Phase 38 — how the client consumes this

- **Transfer wallet role**: an open TRANSFER wallet clarification now carries
  `clarification.transfer = { field: 'SOURCE_WALLET' | 'DESTINATION_WALLET', sourceWalletLabel? }`
  (create response and `recovery-state.activeClarification`), derived from the
  persisted `trustedContext.pendingWalletRole`. Read-only projection — no state
  machine, resolver, or schema change.
- **Recovery conditions** the Web client distinguishes, from structured markers only:
  `error.detail` on `ASSISTANT_DRAFT_CONFLICT` (EXPIRED / FAILED / CANCELLED / COMMITTED),
  the `ASSISTANT_CLARIFICATION_*` codes, `ASSISTANT_CONVERSATION_NOT_CONTINUABLE`,
  `session.conversation.status`, and `latestTerminalClarification` (only when the
  conversation's last turn intent is `clarification.*`, since it carries no turn link).
- **Known gaps as of Phase 38** — gaps 1–3 and 6 are closed in Phase 38.1 (below).

## Phase 38.1 — effective status, terminal drafts, archived guard

### Effective vs recorded status

`src/assistant/effective-status.ts` holds the one definition of a row's
status at a given `now`:

| Recorded (column) | Past `expiresAt`? | Effective |
|---|---|---|
| Draft `PENDING_CONFIRMATION` | yes | `EXPIRED` |
| Clarification `PENDING` | yes | `STALE` + `terminalCode: 'expired'` |
| anything else | — | unchanged |

Every lazy-expiry write decides from it (`confirm()`/`cancel()` for drafts;
`select()`/`consumeGuidedFields()`/`cancel()` for clarifications: "write when
effective ≠ recorded"), and `getAssistantState()` reports it. Reads never
write: a past-TTL row keeps its recorded `PENDING*` status until something
acts on it, exactly as before. The read and the next write can no longer
disagree. Drafts compare against the process clock in `confirm()`/`cancel()`
(unchanged, injectable for tests) and against database time in
`getAssistantState()`; clarifications use database time everywhere.

### Recovery-state additions (gaps 1–3)

- `latestTerminalDraft`: the conversation's **most recent** draft when its
  effective status is `EXPIRED`, `FAILED` or `CANCELLED`. A newer draft of
  any status (including `COMMITTED`) supersedes it. Shape:
  `{ draftId, status, recordedStatus, originatingTurnId }`. No preview.
- `latestTerminalClarification` is now the conversation's most recent
  clarification (by `createdAt`, was "most recently updated terminal row")
  when it is effectively terminal, so an untouched past-TTL clarification
  shows up as `STALE`/`expired`, `recordedStatus: 'PENDING'`. It now carries
  `recordedStatus` and `originatingTurnId`.
- Turn link: both use the existing non-null `originatingTurnId` column. No
  migration was needed.
- `activeClarification`/`pendingDraft` behave as before: the newest pending
  row, only while it is effectively still pending. TTLs are constant from
  creation, so the newest pending row is always the last one to expire.

### Archived-conversation guard (gap 6)

`confirm()` and `cancel()` reject a still-`PENDING_CONFIRMATION` draft whose
conversation is not `ACTIVE` with `409 ASSISTANT_CONVERSATION_NOT_CONTINUABLE`,
`detail: 'CONVERSATION_ARCHIVED'` (`AssistantError.conversationArchived()`).
This covers the Web confirm/edit/cancel routes and the Telegram Confirm/Cancel
buttons, which call the same service (Telegram maps it to the `archived`
terminal status).

- Nothing is written on rejection. The draft stays `PENDING_CONFIRMATION`,
  never `FAILED`, and is not lazily `EXPIRED` while archived. No turn, no
  transaction.
- Order inside the confirm transaction: committed replay → recorded terminal
  status (`ASSISTANT_DRAFT_CONFLICT` + its `detail`) → archived guard → lazy
  `EXPIRED` → commit. A terminal draft therefore still reports its own
  status in an archived conversation.
- Race safety: the guard reads the conversation with `SELECT … FOR NO KEY
  UPDATE` inside the confirm/cancel transaction (after the draft advisory
  lock). That conflicts with archive/restore (`UPDATE`) and delete, so the
  status cannot change before the confirm commits. A confirm racing an
  archive either commits first (archive then waits) or sees `ARCHIVED` and
  is rejected. It does not conflict with the FK `KEY SHARE` locks taken when
  inserting turns/messages. Lock order (draft advisory → conversation row →
  wallet rows) matches the other paths, so it adds no deadlock cycle.
- Restore: `restore` → `ACTIVE`, and the same draft confirms normally until
  its TTL. After the TTL the next confirm writes `EXPIRED` as usual.
- Telegram: the callback token is consumed on the press, as for every other
  outcome. After a restore the user confirms from the Web (the old button
  answers "already handled").

### Conversation `EXPIRED` (gap 5)

Still never written by any code path. `archive`/`restore` reject it
defensively and every guard treats any non-`ACTIVE` status the same way, so
it needs no handling of its own. The Web client had no `EXPIRED`-specific
branch; it treats any non-`ACTIVE` status as archived.

### Remaining gaps after Phase 38.1

1. **Capture taxonomy**: still no clarification expired/stale event (needs
   an `ALTER TYPE` migration). The capture report derives "abandoned past
   TTL" instead, and that bucket also absorbs stale/invalid clarifications.
2. ~~**Clarification select on an archived conversation** is not guarded.~~
   Closed in Phase 38.2 (below).
3. **Telegram after restore**: the consumed callback token cannot be pressed
   again. Confirm from the Web.
4. Resending the original message still needs that message on the loaded
   history page (frontend; unchanged).

## Phase 38.2 — global lock order

**Rule.** A transaction that writes more than one Assistant row locks the
**conversation row first**, then clarification / draft / turn / execution
rows. `deleteOwnedConversation` takes the conversation row (`FOR UPDATE`) and
then cascades into every child table, so any path that holds a child row and
then needs the conversation row can deadlock against it (Postgres aborts one
side with `40P01`, which surfaced as a 500).

The lock is `lockConversation(tx, id)` in `conversation.service.ts`:
`SELECT status … FOR NO KEY UPDATE`. It blocks a concurrent
delete/archive/restore until commit, but not the FK `KEY SHARE` locks taken
when inserting turns/messages. It returns the status, or `undefined` when the
conversation is already gone.

| Path | Order | Notes |
|---|---|---|
| Clarification select / guided submit (`application.service.ts`) | conversation → clarification claim → child clarification / draft → finalize | **Fixed in 38.2.** Before: claim first, conversation later through the draft/message FK and the `lastActivityAt` update. An archived conversation is rejected here with `409` + `detail: 'CONVERSATION_ARCHIVED'`, nothing claimed (clarification stays `PENDING`). A deleted one answers `404 ASSISTANT_CONVERSATION_NOT_FOUND`. |
| Turn finalize family (`finalize`, `finalizeWithoutTool`, `finalizeRejected`) in their own transaction | conversation → execution → message → turn → conversation update | **Fixed in 38.2** (deadlock reproduced by test d). A conversation already deleted is a logged no-op (`assistant.conversation_race_skip`), the same decision as the 37.4 P2025 swallow. With a caller-supplied transaction the caller holds the lock (select path). |
| Provider audit finalize (`provider-audit.service.ts`) | conversation → provider execution → turn (FK) | **Fixed in 38.2.** The single `UPDATE` sets `turn_id`, so it locked the execution row and then key-shared the turn, the reverse of the cascade (deadlock reproduced by test c). |
| Draft confirm/cancel (`financial-draft.service.ts`) | draft advisory lock → conversation → wallet rows → draft | Compliant since 38.1. The advisory lock is not a row the delete touches. The lazy `EXPIRED` write on a terminal path is a single-row write with no second lock. |
| `beginTurn` | conversation (turn insert FK) → message → conversation update | Compliant: the first lock is the conversation's `KEY SHARE`. |
| Single-statement inserts (tool execution, draft, clarification, provider execution, message) | FK checks: conversation before turn/execution | Compliant. Postgres fires FK checks in trigger-name order (`RI_ConstraintTrigger_c_<oid>`), and every conversation FK was created before the turn/execution FKs. Recreating those constraints in a different order would break this; re-check with `pg_trigger` if a migration touches them. |
| Clarification cancel, `markTurnRunning`, lazy terminalizations | single row | No second lock, so no cycle. |

**Lost races are typed, never 500.** P2003 (FK violation: the conversation was
deleted between the read and the insert) in `beginTurn`, `beginToolExecution`,
provider audit `begin` and draft `prepare` becomes `404
ASSISTANT_CONVERSATION_NOT_FOUND`. P2025 on re-reading a clarification after a
lost claim becomes `404 ASSISTANT_CLARIFICATION_NOT_FOUND`. Both go through
`withPrismaErrorTranslation`.

**P2028 cause.** Every `isTransactionTimeout(err, stage)` match logs
`assistant.transaction_timeout` with `stage` and `timeoutCause`: `maxWait` (the
transaction never started, so the pool was exhausted) or `timeout` (it ran
past its budget). Only that enum is logged, never the error message.

**Evidence.** `test/assistant/conversation-lock-order.integration.test.ts`
races 100 iterations per case at 0 ms and 200 ms server-side write latency and
checks `pg_stat_database.deadlocks`.
