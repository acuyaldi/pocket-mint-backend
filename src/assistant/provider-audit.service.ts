import type { PrismaClient } from '../generated/prisma/client';
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
    await db.assistantProviderExecution.update({
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
    });
  }

  return { begin, finalize };
}
