// ============================================================
// Tests: tool executor (execution layer + tool router)
// ============================================================
import { describe, expect, it, vi } from 'vitest';
import {
  executeTool,
  ToolRegistry,
  AssistantError,
} from '../../src/assistant';
import type {
  ToolContract,
  ExecutionContext,
  HandlerRegistry,
} from '../../src/assistant';

// ---- Helpers ---------------------------------------------------------------

function ctx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    userId: 'user-1',
    correlationId: 'corr-1',
    timestamp: new Date(),
    ...overrides,
  };
}

function makeTool(
  overrides: Partial<ToolContract> = {},
): ToolContract {
  return {
    id: 'test.tool',
    description: 'Test tool',
    capability: 'test.read',
    riskLevel: 'LOW',
    confirmationPolicy: 'NONE',
    idempotencyPolicy: 'NOT_REQUIRED',
    timeoutMs: 5_000,
    enabled: true,
    validateInput: (i: unknown) => i,
    validateOutput: (o: unknown) => o,
    ...overrides,
  };
}

// ---- Tests -----------------------------------------------------------------

describe('executeTool', () => {
  it('resolves, validates, and executes a registered tool', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());

    const handler = vi.fn().mockResolvedValue({ result: 'ok' });
    const handlers: HandlerRegistry = new Map([
      ['test.tool', handler],
    ]);

    const result = await executeTool(
      'test.tool',
      { input: 'value' },
      ctx(),
      registry,
      handlers,
    );

    expect(result.status).toBe('SUCCEEDED');
    expect(result.output).toEqual({ result: 'ok' });
    expect(handler).toHaveBeenCalledTimes(1);
    // Handler receives validated input and context
    expect(handler).toHaveBeenCalledWith(
      { input: 'value' },
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('throws toolNotFound for an unregistered tool ID', async () => {
    const registry = new ToolRegistry();
    const handlers: HandlerRegistry = new Map();

    await expect(
      executeTool('nonexistent', {}, ctx(), registry, handlers),
    ).rejects.toThrow(AssistantError);
  });

  it('throws toolDisabled for a disabled tool', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ enabled: false }));
    const handlers: HandlerRegistry = new Map([
      ['test.tool', vi.fn()],
    ]);

    await expect(
      executeTool('test.tool', {}, ctx(), registry, handlers),
    ).rejects.toThrow(AssistantError);

    try {
      await executeTool('test.tool', {}, ctx(), registry, handlers);
    } catch (err) {
      expect((err as AssistantError).code).toBe('ASSISTANT_TOOL_DISABLED');
    }
  });

  it('throws policyDenied for non-immediate policy actions', async () => {
    const registry = new ToolRegistry();
    // EXPLICIT confirmation → DRAFT_AND_CONFIRM (not immediate)
    registry.register(
      makeTool({ riskLevel: 'MEDIUM', confirmationPolicy: 'EXPLICIT' }),
    );
    const handlers: HandlerRegistry = new Map([
      ['test.tool', vi.fn()],
    ]);

    await expect(
      executeTool('test.tool', {}, ctx(), registry, handlers),
    ).rejects.toThrow(AssistantError);

    try {
      await executeTool('test.tool', {}, ctx(), registry, handlers);
    } catch (err) {
      expect((err as AssistantError).code).toBe('ASSISTANT_POLICY_DENIED');
    }
  });

  it('validates input before invoking handler', async () => {
    const registry = new ToolRegistry();
    registry.register(
      makeTool({
        validateInput: (input: unknown) => {
          if (
            typeof input !== 'object' ||
            !input ||
            !('month' in input)
          ) {
            throw AssistantError.invalidInput('test.tool', 'month required');
          }
          return input;
        },
      }),
    );

    const handler = vi.fn();
    const handlers: HandlerRegistry = new Map([
      ['test.tool', handler],
    ]);

    await expect(
      executeTool('test.tool', {}, ctx(), registry, handlers),
    ).rejects.toThrow(AssistantError);

    // Handler must not have been called
    expect(handler).not.toHaveBeenCalled();
  });

  it('validates output after handler returns', async () => {
    const registry = new ToolRegistry();
    registry.register(
      makeTool({
        validateOutput: () => {
          throw AssistantError.invalidOutput('test.tool', 'bad output');
        },
      }),
    );

    const handler = vi.fn().mockResolvedValue({ bad: 'data' });
    const handlers: HandlerRegistry = new Map([
      ['test.tool', handler],
    ]);

    await expect(
      executeTool('test.tool', {}, ctx(), registry, handlers),
    ).rejects.toThrow(AssistantError);
  });

  it('enforces timeout and rejects with executionTimeout', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ timeoutMs: 50 }));

    const handler = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );
    const handlers: HandlerRegistry = new Map([
      ['test.tool', handler],
    ]);

    await expect(
      executeTool('test.tool', {}, ctx(), registry, handlers),
    ).rejects.toThrow(AssistantError);

    try {
      await executeTool('test.tool', {}, ctx(), registry, handlers);
    } catch (err) {
      expect((err as AssistantError).code).toBe('ASSISTANT_EXECUTION_TIMEOUT');
    }
  });

  it('receives trusted context userId (never from input)', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const handlers: HandlerRegistry = new Map([
      ['test.tool', handler],
    ]);

    // Try to sneak a userId through tool input
    await executeTool(
      'test.tool',
      { month: '2026-07', userId: 'hacker' },
      ctx({ userId: 'trusted-user' }),
      registry,
      handlers,
    );

    // Handler gets the trusted context userId, not the spoofed one
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'trusted-user' }),
    );
  });
});
