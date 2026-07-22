// ============================================================
// Assistant Core — tool executor
// ------------------------------------------------------------
// The single component that resolves, validates, and executes
// one registered tool. For Phase 21.2 this is a consolidated
// execution layer + tool router — there is one read-only tool
// and no multi-tool workflow, so separate classes would be
// pure pass-through.
//
// Responsibilities:
//  1. Resolve the tool from the registry
//  2. Verify the tool is enabled
//  3. Evaluate policy
//  4. Reject anything not immediately executable
//  5. Validate untrusted input against the contract
//  6. Invoke the handler with trusted ExecutionContext
//  7. Enforce the registered timeout
//  8. Validate output against the contract
//  9. Return a structured execution result
// 10. Log safe execution metadata with correlation ID
//
// Does NOT: plan, retry, compensate, draft, write, cancel,
// access Prisma, parse NL, create identity, or know about LLMs.
// ============================================================

import type { ToolContract, ToolId, ExecutionContext, ToolExecutionResult } from './types';
import type { ToolRegistry } from './registry';
import { evaluatePolicy } from './policy';
import { AssistantError } from './errors';
import { logger } from '../utils/logger';

/** The handler signature every tool implementation must satisfy. */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: ExecutionContext,
) => Promise<TOutput>;

/** Map of tool ID → handler (wired at startup). */
export type HandlerRegistry = Map<ToolId, ToolHandler>;

/**
 * Execute one tool: resolve, validate, enforce policy, invoke,
 * validate output. Returns a structured result — never throws
 * for operational failures (they become `FAILED` results).
 */
export async function executeTool(
  toolId: ToolId,
  untrustedArgs: unknown,
  ctx: ExecutionContext,
  toolRegistry: ToolRegistry,
  handlerRegistry: HandlerRegistry,
): Promise<ToolExecutionResult> {
  const startedAt = Date.now();

  // 1. Resolve
  const tool = toolRegistry.get(toolId);
  if (!tool) {
    logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'tool not found');
    throw AssistantError.toolNotFound(toolId);
  }

  // 2. Enabled check
  if (!tool.enabled) {
    logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'tool disabled');
    throw AssistantError.toolDisabled(toolId);
  }

  // 3. Policy evaluation
  const policy = evaluatePolicy(tool);
  if (policy.action === 'UNAVAILABLE') {
    logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, policy.reason);
    throw AssistantError.policyDenied(toolId, policy.reason);
  }
  if (policy.action !== 'EXECUTE_IMMEDIATELY') {
    // Phase 21.2 only supports immediate execution
    logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, `policy requires ${policy.action}`);
    throw AssistantError.policyDenied(
      toolId,
      `This tool requires ${policy.action} which is not yet supported`,
    );
  }

  // 4. Validate input
  let validatedInput: unknown;
  try {
    validatedInput = tool.validateInput(untrustedArgs);
  } catch (err) {
    logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'input validation failed');
    throw err;
  }

  // 5. Resolve handler
  const handler = handlerRegistry.get(toolId);
  if (!handler) {
    logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'no handler registered');
    throw AssistantError.toolNotFound(toolId);
  }

  // 6. Execute with timeout
  let output: unknown;
  try {
    output = await withTimeout(
      handler(validatedInput, ctx),
      tool.timeoutMs,
    );
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    if (err instanceof AssistantError && err.code === 'ASSISTANT_EXECUTION_TIMEOUT') {
      logExecution(ctx, toolId, 'FAILED', durationMs, 'timeout');
      throw err;
    }
    logExecution(ctx, toolId, 'FAILED', durationMs, (err as Error)?.message ?? 'handler error');
    throw err;
  }

  // 7. Validate output
  let validatedOutput: unknown;
  try {
    validatedOutput = tool.validateOutput(output);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    logExecution(ctx, toolId, 'FAILED', durationMs, 'output validation failed');
    throw err;
  }

  const durationMs = Date.now() - startedAt;
  logExecution(ctx, toolId, 'SUCCEEDED', durationMs);

  return {
    toolId,
    status: 'SUCCEEDED',
    output: validatedOutput,
    durationMs,
  };
}

// ---- helpers ----------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return promise;
  }
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(AssistantError.executionTimeout('tool', ms)),
        ms,
      ),
    ),
  ]);
}

function logExecution(
  ctx: ExecutionContext,
  toolId: string,
  status: string,
  durationMs: number,
  error?: string,
): void {
  logger.info('assistant_tool_execution', {
    correlationId: ctx.correlationId,
    userId: ctx.userId,
    toolId,
    status,
    durationMs,
    ...(error ? { error } : {}),
  });
}
