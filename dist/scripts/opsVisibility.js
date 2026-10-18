"use strict";
// ============================================================
// Read-only operator diagnostic — ambiguous/terminal channel & Assistant
// operational states (Phase 28, PD-018)
// ------------------------------------------------------------
// Reports counts and recent rows for:
//   - ambiguous assistant/callback executions (ChannelInboundJob)
//   - terminal inbound job failures (ChannelInboundJob)
//   - terminal outbound delivery failures (ChannelOutboundDelivery)
//   - stale RUNNING Assistant turns (AssistantTurn)
// DIAGNOSTIC ONLY — only findMany/count are used anywhere in this script;
// it issues no create/update/delete.
//
//   npx ts-node src/scripts/opsVisibility.ts            # human-readable
//   npx ts-node src/scripts/opsVisibility.ts --json     # machine-readable
//   # or, after build: node dist/scripts/opsVisibility.js [--json]
//
// Exit code: 2 when anything actionable was found, 0 when clean, 1 on
// usage/DB error — matches src/scripts/reconcile.ts's existing convention.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const opsVisibility_1 = require("../domain/opsVisibility");
const RECENT_LIMIT = 20;
const INBOUND_JOB_SELECT = {
    id: true,
    provider: true,
    status: true,
    attempt: true,
    errorCategory: true,
    assistantTurnId: true,
    createdAt: true,
    completedAt: true,
};
const OUTBOUND_DELIVERY_SELECT = {
    id: true,
    inboundJobId: true,
    provider: true,
    status: true,
    attempt: true,
    errorCategory: true,
    createdAt: true,
    sentAt: true,
};
const ASSISTANT_TURN_SELECT = {
    id: true,
    conversationId: true,
    correlationId: true,
    intent: true,
    status: true,
    startedAt: true,
};
const FINANCIAL_DRAFT_SELECT = {
    id: true,
    userId: true,
    conversationId: true,
    operation: true,
    transactionType: true,
    status: true,
    createdAt: true,
    expiresAt: true,
    failedAt: true,
};
const CLARIFICATION_REQUEST_SELECT = {
    id: true,
    userId: true,
    conversationId: true,
    entityType: true,
    status: true,
    createdAt: true,
    expiresAt: true,
};
async function buildReport() {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - opsVisibility_1.STALE_RUNNING_TURN_MS);
    const [terminalInboundRows, terminalOutboundRows, staleTurnCount, staleTurnRows, failedDraftCount, failedDraftRows, abandonedDraftCount, abandonedDraftRows, abandonedClarificationCount, abandonedClarificationRows,] = await Promise.all([
        prisma_1.default.channelInboundJob.findMany({
            where: { status: 'FAILED_TERMINAL' },
            orderBy: { completedAt: 'desc' },
            // ponytail: retention already bounds FAILED_TERMINAL rows to ~4x
            // CHANNEL_RETENTION_DAYS (see runbook §1.1); this cap is just a
            // defensive ceiling, not the expected volume.
            take: 5000,
            select: INBOUND_JOB_SELECT,
        }),
        prisma_1.default.channelOutboundDelivery.findMany({
            where: { status: 'FAILED_TERMINAL' },
            orderBy: { createdAt: 'desc' },
            take: 5000,
            select: OUTBOUND_DELIVERY_SELECT,
        }),
        prisma_1.default.assistantTurn.count({ where: { status: 'RUNNING', startedAt: { lt: staleCutoff } } }),
        prisma_1.default.assistantTurn.findMany({
            where: { status: 'RUNNING', startedAt: { lt: staleCutoff } },
            orderBy: { startedAt: 'asc' },
            take: RECENT_LIMIT,
            select: ASSISTANT_TURN_SELECT,
        }),
        // FAILED drafts (Phase 37.3) — terminal, never auto-replayed. Visibility
        // only: this script issues no create/update/delete anywhere (see header).
        prisma_1.default.assistantFinancialDraft.count({ where: { status: 'FAILED' } }),
        prisma_1.default.assistantFinancialDraft.findMany({
            where: { status: 'FAILED' },
            orderBy: { failedAt: 'desc' },
            take: RECENT_LIMIT,
            select: FINANCIAL_DRAFT_SELECT,
        }),
        // Abandoned PENDING drafts (Phase 37.3) — still PENDING_CONFIRMATION in
        // the DB but past `expiresAt`: nobody has touched them since, so the
        // lazy EXPIRED transition hasn't run yet. Detected directly by
        // `expiresAt`, not by status, since status lags reality here by design
        // (see docs/assistant-stuck-states.md — lazy expiry only, no sweep).
        prisma_1.default.assistantFinancialDraft.count({ where: { status: 'PENDING_CONFIRMATION', expiresAt: { lt: now } } }),
        prisma_1.default.assistantFinancialDraft.findMany({
            where: { status: 'PENDING_CONFIRMATION', expiresAt: { lt: now } },
            orderBy: { expiresAt: 'asc' },
            take: RECENT_LIMIT,
            select: FINANCIAL_DRAFT_SELECT,
        }),
        // Abandoned PENDING clarifications — same rationale, PENDING past
        // `expiresAt` with the lazy STALE(expired) transition not yet run.
        prisma_1.default.clarificationRequest.count({ where: { status: 'PENDING', expiresAt: { lt: now } } }),
        prisma_1.default.clarificationRequest.findMany({
            where: { status: 'PENDING', expiresAt: { lt: now } },
            orderBy: { expiresAt: 'asc' },
            take: RECENT_LIMIT,
            select: CLARIFICATION_REQUEST_SELECT,
        }),
    ]);
    const terminalInbound = terminalInboundRows.map(opsVisibility_1.toSafeInboundJobRow);
    const ambiguous = terminalInbound.filter(opsVisibility_1.isAmbiguousExecution);
    const terminalOutbound = terminalOutboundRows.map(opsVisibility_1.toSafeOutboundDeliveryRow);
    const staleTurns = staleTurnRows.map(opsVisibility_1.toSafeAssistantTurnRow);
    return {
        ambiguousExecutions: {
            count: ambiguous.length,
            byErrorCategory: (0, opsVisibility_1.summarizeByErrorCategory)(ambiguous),
            recent: ambiguous.slice(0, RECENT_LIMIT),
        },
        terminalInboundFailures: {
            count: terminalInbound.length,
            byErrorCategory: (0, opsVisibility_1.summarizeByErrorCategory)(terminalInbound),
            recent: terminalInbound.slice(0, RECENT_LIMIT),
        },
        terminalOutboundFailures: {
            count: terminalOutbound.length,
            byErrorCategory: (0, opsVisibility_1.summarizeByErrorCategory)(terminalOutbound),
            recent: terminalOutbound.slice(0, RECENT_LIMIT),
        },
        staleRunningTurns: {
            count: staleTurnCount,
            thresholdMs: opsVisibility_1.STALE_RUNNING_TURN_MS,
            recent: staleTurns,
        },
        failedDrafts: {
            count: failedDraftCount,
            recent: failedDraftRows.map(opsVisibility_1.toSafeFinancialDraftRow),
        },
        abandonedPendingDrafts: {
            count: abandonedDraftCount,
            recent: abandonedDraftRows.map(opsVisibility_1.toSafeFinancialDraftRow),
        },
        abandonedPendingClarifications: {
            count: abandonedClarificationCount,
            recent: abandonedClarificationRows.map(opsVisibility_1.toSafeClarificationRequestRow),
        },
    };
}
function printHuman(report) {
    console.log('Phase 28 operator diagnostics — read-only, nothing was changed.\n');
    console.log(`Ambiguous assistant/callback executions: ${report.ambiguousExecutions.count} ` +
        `(${JSON.stringify(report.ambiguousExecutions.byErrorCategory)})`);
    for (const row of report.ambiguousExecutions.recent) {
        console.log(`  job=${row.id} provider=${row.provider} errorCategory=${row.errorCategory} ` +
            `turnId=${row.assistantTurnId ?? '-'} completedAt=${row.completedAt?.toISOString() ?? '-'}`);
    }
    if (report.ambiguousExecutions.count > 0) {
        console.log('  Never retry blindly — cross-check assistant_turns/assistant_financial_drafts first (see runbook §8).');
    }
    console.log(`\nTerminal inbound job failures: ${report.terminalInboundFailures.count} ` +
        `(${JSON.stringify(report.terminalInboundFailures.byErrorCategory)})`);
    console.log(`\nTerminal outbound delivery failures: ${report.terminalOutboundFailures.count} ` +
        `(${JSON.stringify(report.terminalOutboundFailures.byErrorCategory)})`);
    console.log(`\nStale RUNNING Assistant turns (> ${report.staleRunningTurns.thresholdMs}ms): ${report.staleRunningTurns.count}`);
    for (const row of report.staleRunningTurns.recent) {
        console.log(`  turn=${row.id} conversation=${row.conversationId} correlationId=${row.correlationId} ` +
            `intent=${row.intent} startedAt=${row.startedAt.toISOString()}`);
    }
    console.log(`\nFAILED drafts (terminal, never auto-replayed): ${report.failedDrafts.count}`);
    for (const row of report.failedDrafts.recent) {
        console.log(`  draft=${row.id} user=${row.userId} conversation=${row.conversationId} ` +
            `type=${row.transactionType} failedAt=${row.failedAt?.toISOString() ?? '-'}`);
    }
    if (report.failedDrafts.count > 0) {
        console.log('  Never retryable from here — the user recovers by sending a new message, not by replaying this draft.');
    }
    console.log(`\nAbandoned PENDING_CONFIRMATION drafts (past expiresAt, not yet lazily expired): ${report.abandonedPendingDrafts.count}`);
    for (const row of report.abandonedPendingDrafts.recent) {
        console.log(`  draft=${row.id} user=${row.userId} conversation=${row.conversationId} expiresAt=${row.expiresAt.toISOString()}`);
    }
    console.log(`\nAbandoned PENDING clarifications (past expiresAt, not yet lazily staled): ${report.abandonedPendingClarifications.count}`);
    for (const row of report.abandonedPendingClarifications.recent) {
        console.log(`  clarification=${row.id} user=${row.userId} conversation=${row.conversationId} expiresAt=${row.expiresAt.toISOString()}`);
    }
    if (report.abandonedPendingDrafts.count > 0 || report.abandonedPendingClarifications.count > 0) {
        console.log('  Harmless by design (lazy expiry only, no sweep — see docs/assistant-stuck-states.md): the recovery-state read path already excludes these; this is visibility, not an incident.');
    }
    console.log(report.ambiguousExecutions.count === 0 && report.staleRunningTurns.count === 0 && report.failedDrafts.count === 0
        ? '\nNothing actionable found.'
        : '\nSee above — nothing was changed. Follow runbook §8 before any manual action.');
}
async function main() {
    const asJson = process.argv.slice(2).includes('--json');
    const report = await buildReport();
    if (asJson) {
        console.log(JSON.stringify(report, null, 2));
    }
    else {
        printHuman(report);
    }
    // Abandoned PENDING drafts/clarifications are deliberately NOT actionable
    // (harmless by design, see docs/assistant-stuck-states.md) — they do not
    // affect the exit code, only FAILED drafts (a genuine terminal outcome
    // worth an operator's attention) join the existing triggers.
    return report.ambiguousExecutions.count > 0 || report.staleRunningTurns.count > 0 || report.failedDrafts.count > 0 ? 2 : 0;
}
main()
    .then((code) => prisma_1.default.$disconnect().then(() => process.exit(code)))
    .catch(async (err) => {
    console.error('opsVisibility failed:', err instanceof Error ? err.message : String(err));
    await prisma_1.default.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=opsVisibility.js.map