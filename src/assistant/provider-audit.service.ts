import type { PrismaClient } from '../generated/prisma/client';
import { withPrismaErrorSwallowed } from '../utils/prismaErrors';
import { logEvent } from '../utils/logger';
import type { AssistantProviderAudit } from './provider-runtime';

export function createAssistantProviderAuditService(db: PrismaClient): AssistantProviderAudit {
  async function begin(input: Parameters<AssistantProviderAudit['begin']>[0]): Promise<string> {
    const row = await db.assistantProviderExecution.create({
      data: input,
      select: { id: true },
    });
    return row.id;
  }

  async function finalize(
    id: string,
    input: Parameters<AssistantProviderAudit['finalize']>[1],
  ): Promise<void> {
    // Phase 37.4 — AssistantProviderExecution.conversationId cascades from
    // AssistantConversation, so a concurrent deleteOwnedConversation can
    // delete this row between the provider call starting and finishing.
    // Audit bookkeeping must never fail an otherwise-successful request —
    // same no-op-and-log decision as the turn-finalize family in
    // conversation.service.ts (docs/assistant-stuck-states.md).
    await withPrismaErrorSwallowed(
      () => db.assistantProviderExecution.update({
        where: { id },
        data: {
          status: input.status,
          turnId: input.turnId,
          completedAt: new Date(),
          durationMs: input.durationMs,
          outputBytes: input.outputBytes,
          finishClassification: input.finishClassification,
          safeErrorCode: input.safeErrorCode,
          inputTokens: input.usage?.inputTokens,
          outputTokens: input.usage?.outputTokens,
          totalTokens: input.usage?.totalTokens,
          cachedInputTokens: input.usage?.cachedInputTokens,
        },
      }),
      { P2025: () => logEvent('warn', { event: 'assistant.conversation_race_skip', stage: 'providerAudit.finalize', executionId: id, turnId: input.turnId }) },
    );
  }

  return { begin, finalize };
}
