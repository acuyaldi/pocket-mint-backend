import { describe, expect, it, vi } from 'vitest';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';

function p2025(): Error & { code: string } {
  return Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
}

function makeDb() {
  const toolExecutionUpdate = vi.fn().mockResolvedValue({});
  const messageCreate = vi.fn().mockResolvedValue({});
  const turnUpdate = vi.fn().mockResolvedValue({});
  const conversationUpdate = vi.fn().mockRejectedValue(p2025());
  const tx = {
    assistantToolExecution: { update: toolExecutionUpdate },
    assistantMessage: { create: messageCreate },
    assistantTurn: { update: turnUpdate },
    assistantConversation: { update: conversationUpdate },
  };
  return {
    db: {
      $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(tx)),
    },
    tx,
    conversationUpdate,
  };
}

// Phase 37.4 security review: finalize()/finalizeWithoutTool() must only
// swallow a P2025 on the final conversation touch when THIS function opened
// the transaction itself (db.$transaction) — never when the caller supplied
// its own transaction via options.transaction, since swallowing there would
// let this write silently no-op while every other write the caller already
// made in that same ambient transaction still commits (this function has no
// way to tell that caller to roll back). No real caller passes
// options.transaction today, but the behavior must stay correct if one ever
// does.
describe('conversation.service finalize()/finalizeWithoutTool() — options.transaction never swallows', () => {
  it('finalize: with no options.transaction (self-managed), a P2025 on the conversation touch is swallowed', async () => {
    const { db } = makeDb();
    const service = createAssistantConversationService(db as never);

    await expect(service.finalize({
      conversationId: 'c1', turnId: 't1', executionId: 'e1', status: 'SUCCEEDED', turnStatus: 'SUCCEEDED',
      assistantContent: 'ok', assistantSource: 'DETERMINISTIC_RENDERER', durationMs: 1,
    })).resolves.toBeUndefined();
  });

  it('finalize: with a caller-supplied options.transaction, the same P2025 propagates instead of being swallowed', async () => {
    const { tx } = makeDb();
    const service = createAssistantConversationService({ $transaction: vi.fn() } as never);

    await expect(service.finalize({
      conversationId: 'c1', turnId: 't1', executionId: 'e1', status: 'SUCCEEDED', turnStatus: 'SUCCEEDED',
      assistantContent: 'ok', assistantSource: 'DETERMINISTIC_RENDERER', durationMs: 1,
    }, { transaction: tx as never })).rejects.toMatchObject({ code: 'P2025' });
  });

  it('finalizeWithoutTool: with no options.transaction (self-managed), a P2025 on the conversation touch is swallowed', async () => {
    const { db } = makeDb();
    const service = createAssistantConversationService(db as never);

    await expect(service.finalizeWithoutTool({
      conversationId: 'c1', turnId: 't1', turnStatus: 'SUCCEEDED',
      assistantContent: 'ok', assistantSource: 'DETERMINISTIC_RENDERER',
    })).resolves.toBeUndefined();
  });

  it('finalizeWithoutTool: with a caller-supplied options.transaction, the same P2025 propagates', async () => {
    const { tx } = makeDb();
    const service = createAssistantConversationService({ $transaction: vi.fn() } as never);

    await expect(service.finalizeWithoutTool({
      conversationId: 'c1', turnId: 't1', turnStatus: 'SUCCEEDED',
      assistantContent: 'ok', assistantSource: 'DETERMINISTIC_RENDERER',
    }, { transaction: tx as never })).rejects.toMatchObject({ code: 'P2025' });
  });
});
