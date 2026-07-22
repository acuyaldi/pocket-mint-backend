"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTool = executeTool;
const policy_1 = require("./policy");
const errors_1 = require("./errors");
const logger_1 = require("../utils/logger");
/**
 * Execute one tool: resolve, validate, enforce policy, invoke,
 * validate output. Returns a structured result — never throws
 * for operational failures (they become `FAILED` results).
 */
async function executeTool(toolId, untrustedArgs, ctx, toolRegistry, handlerRegistry) {
    const startedAt = Date.now();
    // 1. Resolve
    const tool = toolRegistry.get(toolId);
    if (!tool) {
        logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'tool not found');
        throw errors_1.AssistantError.toolNotFound(toolId);
    }
    // 2. Enabled check
    if (!tool.enabled) {
        logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'tool disabled');
        throw errors_1.AssistantError.toolDisabled(toolId);
    }
    // 3. Policy evaluation
    const policy = (0, policy_1.evaluatePolicy)(tool);
    if (policy.action === 'UNAVAILABLE') {
        logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, policy.reason);
        throw errors_1.AssistantError.policyDenied(toolId, policy.reason);
    }
    if (policy.action !== 'EXECUTE_IMMEDIATELY') {
        // Phase 21.2 only supports immediate execution
        logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, `policy requires ${policy.action}`);
        throw errors_1.AssistantError.policyDenied(toolId, `This tool requires ${policy.action} which is not yet supported`);
    }
    // 4. Validate input
    let validatedInput;
    try {
        validatedInput = tool.validateInput(untrustedArgs);
    }
    catch (err) {
        logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'input validation failed');
        throw err;
    }
    // 5. Resolve handler
    const handler = handlerRegistry.get(toolId);
    if (!handler) {
        logExecution(ctx, toolId, 'FAILED', Date.now() - startedAt, 'no handler registered');
        throw errors_1.AssistantError.toolNotFound(toolId);
    }
    // 6. Execute with timeout
    let output;
    try {
        output = await withTimeout(handler(validatedInput, ctx), tool.timeoutMs);
    }
    catch (err) {
        const durationMs = Date.now() - startedAt;
        if (err instanceof errors_1.AssistantError && err.code === 'ASSISTANT_EXECUTION_TIMEOUT') {
            logExecution(ctx, toolId, 'FAILED', durationMs, 'timeout');
            throw err;
        }
        logExecution(ctx, toolId, 'FAILED', durationMs, err?.message ?? 'handler error');
        throw err;
    }
    // 7. Validate output
    let validatedOutput;
    try {
        validatedOutput = tool.validateOutput(output);
    }
    catch (err) {
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
function withTimeout(promise, ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
        return promise;
    }
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(errors_1.AssistantError.executionTimeout('tool', ms)), ms)),
    ]);
}
function logExecution(ctx, toolId, status, durationMs, error) {
    logger_1.logger.info('assistant_tool_execution', {
        correlationId: ctx.correlationId,
        userId: ctx.userId,
        toolId,
        status,
        durationMs,
        ...(error ? { error } : {}),
    });
}
//# sourceMappingURL=executor.js.map