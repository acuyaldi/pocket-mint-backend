export type AssistantProviderKind = 'gemini';

export interface AssistantProviderMessage {
  readonly role: 'user';
  readonly content: string;
}

export interface AssistantProviderUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly cachedInputTokens?: number;
}

export interface AssistantModelRequest {
  readonly systemInstruction: string;
  readonly messages: readonly AssistantProviderMessage[];
  readonly responseSchema: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
}

export interface AssistantModelResponse {
  readonly output: unknown;
  readonly outputBytes: number;
  readonly finishClassification: 'STOP' | 'SAFETY' | 'OTHER' | 'UNKNOWN';
  readonly usage?: AssistantProviderUsage;
}

export interface AssistantModelProvider {
  readonly kind: AssistantProviderKind;
  readonly model: string;
  generateStructuredResponse(request: AssistantModelRequest): Promise<AssistantModelResponse>;
}

export type AssistantProviderErrorCode =
  | 'ASSISTANT_PROVIDER_UNAVAILABLE'
  | 'ASSISTANT_PROVIDER_TIMEOUT'
  | 'ASSISTANT_PROVIDER_RATE_LIMITED'
  | 'ASSISTANT_PROVIDER_INVALID_RESPONSE'
  | 'ASSISTANT_PROVIDER_CONFIGURATION_ERROR'
  | 'ASSISTANT_PROVIDER_REFUSED';

export class AssistantProviderError extends Error {
  readonly isOperational = true;

  constructor(
    readonly code: AssistantProviderErrorCode,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AssistantProviderError';
  }

  static invalidResponse(): AssistantProviderError {
    return new AssistantProviderError('ASSISTANT_PROVIDER_INVALID_RESPONSE', 'Assistant provider returned an invalid response.', 502);
  }

  static timeout(): AssistantProviderError {
    return new AssistantProviderError('ASSISTANT_PROVIDER_TIMEOUT', 'Assistant provider request timed out.', 504);
  }

  static unavailable(): AssistantProviderError {
    return new AssistantProviderError('ASSISTANT_PROVIDER_UNAVAILABLE', 'Assistant provider is temporarily unavailable.', 503);
  }

  static rateLimited(): AssistantProviderError {
    return new AssistantProviderError('ASSISTANT_PROVIDER_RATE_LIMITED', 'Assistant provider is temporarily rate limited.', 429);
  }

  static configuration(): AssistantProviderError {
    return new AssistantProviderError('ASSISTANT_PROVIDER_CONFIGURATION_ERROR', 'Assistant provider configuration is invalid.', 503);
  }

  static refused(): AssistantProviderError {
    return new AssistantProviderError('ASSISTANT_PROVIDER_REFUSED', 'Assistant provider could not process the request safely.', 422);
  }
}

export interface ProviderCapability {
  readonly intent: string;
  readonly description: string;
  readonly category: string;
  readonly requiredArguments: readonly string[];
  readonly optionalArguments: readonly string[];
  readonly argumentContract: Readonly<Record<string, {
    readonly type: 'string';
    readonly description: string;
    readonly enum?: readonly string[];
    readonly format?: string;
  }>>;
  readonly confirmationMayBeRequired: boolean;
}

export type AssistantPlan =
  | {
    readonly kind: 'intent';
    readonly intent: string;
    readonly arguments: unknown;
    readonly policy: { readonly action: 'EXECUTE_IMMEDIATELY' | 'DRAFT_AND_CONFIRM' };
  }
  | { readonly kind: 'clarification'; readonly question: string }
  | { readonly kind: 'unsupported'; readonly message: string };

export const ASSISTANT_RESPONSE_JSON_SCHEMA: Readonly<Record<string, unknown>> = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'intent', 'arguments', 'clarification', 'userMessage'],
  properties: {
    kind: { type: 'string', enum: ['intent', 'clarification', 'unsupported'] },
    intent: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    arguments: { type: 'object' },
    clarification: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['question'],
          properties: { question: { type: 'string', maxLength: 500 } },
        },
      ],
    },
    userMessage: { type: 'string', maxLength: 2000 },
  },
});

