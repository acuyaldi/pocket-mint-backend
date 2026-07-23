import type { AssistantContext } from './context.types';
import { buildAssistantSystemInstruction } from './provider-instruction';
import { ASSISTANT_RESPONSE_JSON_SCHEMA, type AssistantModelRequest, type ProviderCapability } from './provider-types';

export function assembleAssistantModelRequest(
  context: AssistantContext,
  catalog: readonly ProviderCapability[],
  signal: AbortSignal = new AbortController().signal,
): AssistantModelRequest {
  const untrustedContent = {
    historicalConversation: context.turns,
    priorToolSummaries: context.toolExecutions,
    ...(context.pendingDraft ? { pendingDraftContext: context.pendingDraft } : {}),
    currentRequest: context.currentRequest,
  };
  return {
    systemInstruction: buildAssistantSystemInstruction(catalog),
    messages: [{ role: 'user', content: JSON.stringify(untrustedContent) }],
    responseSchema: ASSISTANT_RESPONSE_JSON_SCHEMA,
    signal,
  };
}

