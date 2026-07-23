import type { AssistantContext } from './context.types';

export function serializeAssistantContext(context: AssistantContext): string {
  return JSON.stringify(context);
}

export function assistantContextByteLength(context: AssistantContext): number {
  return Buffer.byteLength(serializeAssistantContext(context), 'utf8');
}

