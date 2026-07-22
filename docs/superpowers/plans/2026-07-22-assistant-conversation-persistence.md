# Assistant Conversation Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist provider-neutral Assistant conversations, turns, messages, and safe tool execution history while extending the deterministic Assistant APIs.

**Architecture:** An injectable conversation service owns Prisma and safe DTO mapping. An Assistant application service coordinates validation, two short persistence phases, the existing executor, rendering, and terminal recovery. Controllers remain HTTP adapters.

**Tech Stack:** TypeScript 5.9, Express 5, Prisma 7, PostgreSQL, Vitest, Supertest.

## Global Constraints

- Do not integrate providers, drafts, financial writes, frontend UI, queues, streaming, deletion, or automatic cleanup.
- Every persisted USER message has content; execute requests may omit message.
- Empty messages are absent; fallback is generated only from validated arguments.
- Never persist raw invalid arguments, HTML, authentication material, Prisma errors, or financial-domain results as current truth.
- Use disposable PostgreSQL for integration coverage with zero silent skips in CI.

---

### Task 1: Relational persistence schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260722_add_assistant_conversation_persistence/migration.sql`
- Generated: `src/generated/prisma/**`
- Test: `test/assistant/conversation-service.integration.test.ts`

**Interfaces:**
- Produces Prisma delegates for `assistantConversation`, `assistantTurn`, `assistantMessage`, and `assistantToolExecution` with the enums and indexes in the approved design.

- [ ] Write a PostgreSQL integration test that creates the four related records and asserts cascade/ownership relations.
- [ ] Run the focused integration test and confirm it fails because the delegates do not exist.
- [ ] Add the four models, minimal enums, deliberate relations, and indexes to `schema.prisma`.
- [ ] Generate a migration with explicit enum/table/index/foreign-key SQL and regenerate the tracked Prisma client.
- [ ] Run `npx prisma validate` and the focused integration test until green.

### Task 2: Conversation persistence service

**Files:**
- Create: `src/assistant/conversation.types.ts`
- Create: `src/assistant/conversation.service.ts`
- Modify: `src/assistant/errors.ts`
- Modify: `src/assistant/index.ts`
- Test: `test/assistant/conversation-service.test.ts`
- Test: `test/assistant/conversation-service.integration.test.ts`

**Interfaces:**
- Produces `createAssistantConversationService(db)` with `beginTurn`, `markTurnRunning`, `beginToolExecution`, `finalizeSuccess`, `finalizeFailure`, `listOwnedConversations`, `getOwnedConversation`, and `archiveOwnedConversation`.
- Produces safe DTOs and typed indistinguishable not-found/non-continuable errors.

- [ ] Write failing unit tests for pagination, stable ordering arguments, ownership predicates, idempotent archive, and safe DTO omission.
- [ ] Write failing PostgreSQL tests for create/load/cross-user, ordered messages, lifecycle completion, archive, last activity, and ownership-only listing.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement the injectable service and short Prisma transactions without exposing Prisma records.
- [ ] Run focused unit and PostgreSQL tests until green.

### Task 3: Canonical request normalization and safe audit summaries

**Files:**
- Modify: `src/assistant/types.ts`
- Modify: `src/assistant/tools.ts`
- Create: `src/assistant/persistence.ts`
- Test: `test/assistant/persistence.test.ts`
- Modify: `test/assistant/contracts.test.ts`

**Interfaces:**
- Produces `normalizeProvidedMessage`, `canonicalUserMessage`, `safeRejectedUserMessage`, `safeToolInput`, and `summarizeToolOutput`.
- Extends `ToolContract` with provider-neutral persistence-safe projection callbacks.

- [ ] Write failing tests for whitespace-as-absent, 100,000-character cap, rejection of non-string messages, validated fallback, constant rejected summary, no raw argument leakage, and monthly output minimization.
- [ ] Run tests and confirm they fail for missing APIs.
- [ ] Implement the smallest pure helpers and monthly tool projections.
- [ ] Run tests until green and refactor duplicated validation safely.

### Task 4: Durable execution orchestration

**Files:**
- Create: `src/assistant/application.service.ts`
- Modify: `src/assistant/executor.ts`
- Modify: `src/assistant/bootstrap.ts`
- Modify: `src/assistant/types.ts`
- Test: `test/assistant/application.service.test.ts`
- Modify: `test/assistant/executor.test.ts`

**Interfaces:**
- Produces `createAssistantApplicationService(dependencies).execute(userId, correlationId, request)`.
- Executor accepts an optional observer whose transitions contain canonical safe metadata only.

- [ ] Write failing orchestration tests for new/continued conversations, success, unsupported intent, malformed args, timeout/tool failure, initial persistence failure, finalization failure, and archived/cross-user prevention.
- [ ] Run tests and verify the handler is not called on initial failures.
- [ ] Implement prevalidation, safe message selection, lifecycle transitions, execution outside transactions, safe terminal messages, and finalization recovery.
- [ ] Extend executor observability without adding Prisma dependencies.
- [ ] Run application and executor tests until green.

### Task 5: Execute and conversation HTTP APIs

**Files:**
- Modify: `src/controllers/assistant.controller.ts`
- Modify: `src/routes/assistantRoutes.ts`
- Modify: `test/assistant/assistant-api.test.ts`
- Create: `test/assistant/conversation-api.test.ts`

**Interfaces:**
- Routes: execute, bounded list, bounded detail, and idempotent archive under `/api/v1/assistant`.
- Responses expose canonical IDs, content/source, safe status, pagination, and no persistence internals.

- [ ] Write failing Supertest cases for message validation, response IDs, ownership behavior, pagination parsing, detail omission, archive idempotence, and continuation rejection.
- [ ] Run focused tests and verify route/controller failures.
- [ ] Replace controller orchestration with application-service calls and add thin retrieval/archive handlers.
- [ ] Register authenticated routes, applying the existing post-auth mutation limiter consistently.
- [ ] Run HTTP tests until green.

### Task 6: End-to-end PostgreSQL lifecycle and smoke coverage

**Files:**
- Create: `test/assistant/conversation-lifecycle.integration.test.ts`
- Modify: `scripts/run-integration-tests.mjs` only if discovery does not already include the new suite.

**Interfaces:**
- Verifies the production services and HTTP boundary against disposable PostgreSQL.

- [ ] Write failing integration tests for create, continue, persisted messages/execution, rejection, service failure, unauthenticated no-record behavior, cross-user denial, archive, and post-archive rejection.
- [ ] Run `npm run test:integration` and verify the new tests execute rather than skip.
- [ ] Implement any missing wiring exposed by the tests.
- [ ] Re-run until all integration tests pass with zero silent skips.

### Task 7: Documentation and final verification

**Files:**
- Modify: `../pocket-mint-docs/docs/architecture/assistant-core-architecture.md`
- Modify: `../pocket-mint-docs/docs/development/implementation-roadmap.md`
- Create: `docs/api/assistant-conversations.md`

**Interfaces:**
- Documents only implemented Phase 21.3 behavior and explicitly preserves deferred Phase 21.4 scope.

- [ ] Update the ADR with the implemented schema, ownership, lifecycle, redaction, crash window, archive retention, and provider-neutral format.
- [ ] Add execute/list/detail/archive API examples and state that no LLM exists.
- [ ] Mark 21.3 complete only after verification passes; identify 21.4 as next.
- [ ] Run `npx tsc --noEmit`, `npm run build`, `npx vitest run`, `npx prisma validate`, and disposable PostgreSQL integration tests.
- [ ] Perform disposable HTTP smoke tests for create, continue, list, retrieve, archive, post-archive rejection, and cross-user denial.
- [ ] Run `git diff --check`, inspect both repository statuses/diffs, verify no secrets/frontend/provider SDK/unrelated changes, and only then create logical commits without pushing.

