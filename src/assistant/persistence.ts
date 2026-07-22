import { AssistantError } from './errors';
import type { Prisma } from '../generated/prisma/client';

export const ASSISTANT_MESSAGE_MAX_LENGTH = 100_000;
const SAFE_REJECTED_MESSAGE = 'Permintaan Assistant tidak dapat diproses.';

export function normalizeProvidedMessage(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw AssistantError.invalidRequest('message must be a string');
  }
  const content = value.trim();
  if (!content) return undefined;
  if (content.length > ASSISTANT_MESSAGE_MAX_LENGTH) {
    throw AssistantError.invalidRequest(`message must not exceed ${ASSISTANT_MESSAGE_MAX_LENGTH} characters`);
  }
  return content;
}

export function safeRejectedUserMessage(): string {
  return SAFE_REJECTED_MESSAGE;
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
