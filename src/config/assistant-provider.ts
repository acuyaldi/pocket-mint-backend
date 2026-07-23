export interface AssistantProviderConfig {
  readonly enabled: boolean;
  readonly provider: 'gemini' | null;
  readonly model: string | null;
  readonly apiKey: string | null;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly maxPlanDepth: number;
  readonly publicMetadata: {
    readonly enabled: boolean;
    readonly provider: 'gemini' | null;
    readonly model: string | null;
    readonly timeoutMs: number;
  };
}

type Environment = Readonly<Record<string, string | undefined>>;

const text = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

export function loadAssistantProviderConfig(env: Environment): AssistantProviderConfig {
  const configuredProvider = text(env.ASSISTANT_PROVIDER)?.toLowerCase();
  const timeoutText = text(env.ASSISTANT_PROVIDER_TIMEOUT_MS);
  const timeout = timeoutText === undefined ? 15_000 : Number(timeoutText);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120_000) {
    throw new Error('ASSISTANT_PROVIDER_TIMEOUT_MS must be an integer from 1 to 120000.');
  }
  if (configuredProvider === undefined || configuredProvider === 'disabled') {
    const base = {
      enabled: false, provider: null, model: null, apiKey: null,
      timeoutMs: timeout, maxResponseBytes: 32 * 1024, maxPlanDepth: 6,
    } as const;
    return { ...base, publicMetadata: { enabled: false, provider: null, model: null, timeoutMs: timeout } };
  }
  if (configuredProvider !== 'gemini') {
    throw new Error('ASSISTANT_PROVIDER must be "gemini" or "disabled".');
  }
  const model = text(env.ASSISTANT_MODEL);
  const apiKey = text(env.GEMINI_API_KEY);
  if (!model) throw new Error('ASSISTANT_MODEL is required when ASSISTANT_PROVIDER is enabled.');
  if (!apiKey) throw new Error('GEMINI_API_KEY is required when ASSISTANT_PROVIDER=gemini.');
  return {
    enabled: true,
    provider: 'gemini',
    model,
    apiKey,
    timeoutMs: timeout,
    maxResponseBytes: 32 * 1024,
    maxPlanDepth: 6,
    publicMetadata: { enabled: true, provider: 'gemini', model, timeoutMs: timeout },
  };
}
