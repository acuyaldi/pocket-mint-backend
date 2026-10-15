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

import prisma from '../lib/prisma';
import {
  isAmbiguousExecution,
  summarizeByErrorCategory,
  toSafeAssistantTurnRow,
  toSafeInboundJobRow,
  toSafeOutboundDeliveryRow,
  STALE_RUNNING_TURN_MS,
  type SafeAssistantTurnRow,
  type SafeInboundJobRow,
  type SafeOutboundDeliveryRow,
} from '../domain/opsVisibility';

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
} as const;

const OUTBOUND_DELIVERY_SELECT = {
  id: true,
  inboundJobId: true,
  provider: true,
  status: true,
  attempt: true,
  errorCategory: true,
  createdAt: true,
  sentAt: true,
} as const;

const ASSISTANT_TURN_SELECT = {
  id: true,
  conversationId: true,
  correlationId: true,
  intent: true,
  status: true,
  startedAt: true,
} as const;

interface Report {
  ambiguousExecutions: { count: number; byErrorCategory: Record<string, number>; recent: SafeInboundJobRow[] };
  terminalInboundFailures: { count: number; byErrorCategory: Record<string, number>; recent: SafeInboundJobRow[] };
  terminalOutboundFailures: { count: number; byErrorCategory: Record<string, number>; recent: SafeOutboundDeliveryRow[] };
  staleRunningTurns: { count: number; thresholdMs: number; recent: SafeAssistantTurnRow[] };
}

async function buildReport(): Promise<Report> {
  const staleCutoff = new Date(Date.now() - STALE_RUNNING_TURN_MS);

  const [terminalInboundRows, terminalOutboundRows, staleTurnCount, staleTurnRows] = await Promise.all([
    prisma.channelInboundJob.findMany({
      where: { status: 'FAILED_TERMINAL' },
      orderBy: { completedAt: 'desc' },
      // ponytail: retention already bounds FAILED_TERMINAL rows to ~4x
      // CHANNEL_RETENTION_DAYS (see runbook §1.1); this cap is just a
      // defensive ceiling, not the expected volume.
      take: 5000,
      select: INBOUND_JOB_SELECT,
    }),
    prisma.channelOutboundDelivery.findMany({
      where: { status: 'FAILED_TERMINAL' },
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: OUTBOUND_DELIVERY_SELECT,
    }),
    prisma.assistantTurn.count({ where: { status: 'RUNNING', startedAt: { lt: staleCutoff } } }),
    prisma.assistantTurn.findMany({
      where: { status: 'RUNNING', startedAt: { lt: staleCutoff } },
      orderBy: { startedAt: 'asc' },
      take: RECENT_LIMIT,
      select: ASSISTANT_TURN_SELECT,
    }),
  ]);

  const terminalInbound = terminalInboundRows.map(toSafeInboundJobRow);
  const ambiguous = terminalInbound.filter(isAmbiguousExecution);
  const terminalOutbound = terminalOutboundRows.map(toSafeOutboundDeliveryRow);
  const staleTurns = staleTurnRows.map(toSafeAssistantTurnRow);

  return {
    ambiguousExecutions: {
      count: ambiguous.length,
      byErrorCategory: summarizeByErrorCategory(ambiguous),
      recent: ambiguous.slice(0, RECENT_LIMIT),
    },
    terminalInboundFailures: {
      count: terminalInbound.length,
      byErrorCategory: summarizeByErrorCategory(terminalInbound),
      recent: terminalInbound.slice(0, RECENT_LIMIT),
    },
    terminalOutboundFailures: {
      count: terminalOutbound.length,
      byErrorCategory: summarizeByErrorCategory(terminalOutbound),
      recent: terminalOutbound.slice(0, RECENT_LIMIT),
    },
    staleRunningTurns: {
      count: staleTurnCount,
      thresholdMs: STALE_RUNNING_TURN_MS,
      recent: staleTurns,
    },
  };
}

function printHuman(report: Report): void {
  console.log('Phase 28 operator diagnostics — read-only, nothing was changed.\n');

  console.log(
    `Ambiguous assistant/callback executions: ${report.ambiguousExecutions.count} ` +
      `(${JSON.stringify(report.ambiguousExecutions.byErrorCategory)})`
  );
  for (const row of report.ambiguousExecutions.recent) {
    console.log(
      `  job=${row.id} provider=${row.provider} errorCategory=${row.errorCategory} ` +
        `turnId=${row.assistantTurnId ?? '-'} completedAt=${row.completedAt?.toISOString() ?? '-'}`
    );
  }
  if (report.ambiguousExecutions.count > 0) {
    console.log('  Never retry blindly — cross-check assistant_turns/assistant_financial_drafts first (see runbook §8).');
  }

  console.log(
    `\nTerminal inbound job failures: ${report.terminalInboundFailures.count} ` +
      `(${JSON.stringify(report.terminalInboundFailures.byErrorCategory)})`
  );
  console.log(
    `\nTerminal outbound delivery failures: ${report.terminalOutboundFailures.count} ` +
      `(${JSON.stringify(report.terminalOutboundFailures.byErrorCategory)})`
  );

  console.log(
    `\nStale RUNNING Assistant turns (> ${report.staleRunningTurns.thresholdMs}ms): ${report.staleRunningTurns.count}`
  );
  for (const row of report.staleRunningTurns.recent) {
    console.log(
      `  turn=${row.id} conversation=${row.conversationId} correlationId=${row.correlationId} ` +
        `intent=${row.intent} startedAt=${row.startedAt.toISOString()}`
    );
  }

  console.log(
    report.ambiguousExecutions.count === 0 && report.staleRunningTurns.count === 0
      ? '\nNothing actionable found.'
      : '\nSee above — nothing was changed. Follow runbook §8 before any manual action.'
  );
}

async function main(): Promise<number> {
  const asJson = process.argv.slice(2).includes('--json');
  const report = await buildReport();

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }

  return report.ambiguousExecutions.count > 0 || report.staleRunningTurns.count > 0 ? 2 : 0;
}

main()
  .then((code) => prisma.$disconnect().then(() => process.exit(code)))
  .catch(async (err) => {
    console.error('opsVisibility failed:', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect();
    process.exit(1);
  });
