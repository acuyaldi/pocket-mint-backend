// ============================================================
// Assistant Core — domain errors
// ------------------------------------------------------------
// Follows the existing structural convention expected by
// forwardError.ts / error.middleware.ts: isOperational, statusCode,
// code. Compatible with the central error handler without importing
// Express types or HTTP helpers.
//
// All Assistant errors use the 4xx range so the central handler
// treats them as operational (safe message shown to client).
// ============================================================

export class AssistantError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  private constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AssistantError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AssistantError.prototype);
  }

  // -- Factory methods -------------------------------------------------------

  static toolNotFound(toolId: string): AssistantError {
    return new AssistantError(
      `Tool not found: ${toolId}`,
      404,
      'ASSISTANT_TOOL_NOT_FOUND',
    );
  }

  static toolDisabled(toolId: string): AssistantError {
    return new AssistantError(
      `Tool is disabled: ${toolId}`,
      403,
      'ASSISTANT_TOOL_DISABLED',
    );
  }

  static invalidInput(toolId: string, detail: string): AssistantError {
    return new AssistantError(
      `Invalid input for tool "${toolId}": ${detail}`,
      400,
      'ASSISTANT_INVALID_INPUT',
    );
  }

  static invalidOutput(toolId: string, detail: string): AssistantError {
    return new AssistantError(
      `Invalid output from tool "${toolId}": ${detail}`,
      500,
      'ASSISTANT_INVALID_OUTPUT',
    );
  }

  static duplicateRegistration(toolId: string): AssistantError {
    return new AssistantError(
      `Duplicate tool registration: "${toolId}" is already registered`,
      409,
      'ASSISTANT_DUPLICATE_TOOL',
    );
  }

  static policyDenied(toolId: string, reason: string): AssistantError {
    return new AssistantError(
      `Policy denied tool "${toolId}": ${reason}`,
      403,
      'ASSISTANT_POLICY_DENIED',
    );
  }

  static executionTimeout(toolId: string, timeoutMs: number): AssistantError {
    return new AssistantError(
      `The Assistant stopped waiting for the tool result (${toolId}) after ${timeoutMs}ms. The underlying operation may still complete.`,
      504,
      'ASSISTANT_EXECUTION_TIMEOUT',
    );
  }

  static invalidTimeout(toolId: string, timeoutMs: number): AssistantError {
    return new AssistantError(
      `Tool "${toolId}" has invalid timeout: ${timeoutMs}ms (must be > 0)`,
      500,
      'ASSISTANT_INVALID_TIMEOUT',
    );
  }

  static policyMismatch(toolId: string, detail: string): AssistantError {
    return new AssistantError(
      `Policy inconsistency in tool "${toolId}": ${detail}`,
      500,
      'ASSISTANT_POLICY_MISMATCH',
    );
  }

  static unsupportedIntent(intent: string): AssistantError {
    return new AssistantError(
      `Unsupported intent: "${intent}"`,
      400,
      'ASSISTANT_UNSUPPORTED_INTENT',
    );
  }
}
