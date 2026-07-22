import { AssistantError } from './errors';
import type { Prisma } from '../generated/prisma/client';

export const MAX_ASSISTANT_MESSAGE_LENGTH = 10_000;
const SAFE_REJECTED_MESSAGE = 'Permintaan Assistant tidak dapat diproses.';
export const SAFE_REJECTED_INTENT = 'unresolved';

export function assertAssistantMessageLength(content: string): string {
  if (content.length > MAX_ASSISTANT_MESSAGE_LENGTH) {
    throw AssistantError.invalidRequest(`message must not exceed ${MAX_ASSISTANT_MESSAGE_LENGTH} characters`);
  }
  return content;
}

export function normalizeProvidedMessage(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw AssistantError.invalidRequest('message must be a string');
  }
  const content = value.trim();
  if (!content) return undefined;
  return assertAssistantMessageLength(content);
}

export function safeRejectedUserMessage(): string {
  return SAFE_REJECTED_MESSAGE;
}

export function safeRejectedAssistantMessage(code: string): string {
  if (code === 'ASSISTANT_UNSUPPORTED_INTENT') return 'Assistant intent is not supported.';
  if (code === 'ASSISTANT_INVALID_INPUT' || code === 'ASSISTANT_INVALID_REQUEST') return 'Assistant request is invalid.';
  return 'Assistant request could not be processed.';
}

export function monthlySummaryFallback(input: { month: string }): string {
  return `analytics.monthly-spending-summary(month=${input.month})`;
}

export function monthlySummaryInputForAudit(input: { month: string }): Prisma.InputJsonObject {
  return { month: input.month };
}

export function monthlySummaryOutputForAudit(output: {
  month: string;
  transactionCount: number;
  topCategories: unknown[];
}): Prisma.InputJsonObject {
  return {
    month: output.month,
    transactionCount: output.transactionCount,
    categoryCount: output.topCategories.length,
  };
}
