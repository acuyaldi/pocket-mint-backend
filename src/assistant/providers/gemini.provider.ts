import { GoogleGenAI } from '@google/genai';
import { AssistantProviderError, type AssistantModelProvider, type AssistantProviderUsage } from '../provider-types';

interface GeminiResponseLike {
  readonly text?: string;
  readonly candidates?: readonly { readonly finishReason?: string }[];
  readonly promptFeedback?: { readonly blockReason?: string };
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
    readonly cachedContentTokenCount?: number;
  };
}

interface GeminiClientLike {
  readonly models: {
    generateContent(input: unknown): Promise<GeminiResponseLike>;
  };
}

export interface GeminiAssistantProviderConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
}

function safeCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function usage(response: GeminiResponseLike): AssistantProviderUsage | undefined {
  const metadata = response.usageMetadata;
  if (!metadata) return undefined;
  const mapped = {
    inputTokens: safeCount(metadata.promptTokenCount),
    outputTokens: safeCount(metadata.candidatesTokenCount),
    totalTokens: safeCount(metadata.totalTokenCount),
    cachedInputTokens: safeCount(metadata.cachedContentTokenCount),
  };
  return Object.values(mapped).some((value) => value !== undefined) ? mapped : undefined;
}

function finishClassification(response: GeminiResponseLike): 'STOP' | 'SAFETY' | 'OTHER' | 'UNKNOWN' {
  if (response.promptFeedback?.blockReason) return 'SAFETY';
  const reason = response.candidates?.[0]?.finishReason;
  if (reason === 'STOP') return 'STOP';
  if (reason === 'SAFETY' || reason === 'BLOCKLIST' || reason === 'PROHIBITED_CONTENT') return 'SAFETY';
  return reason ? 'OTHER' : 'UNKNOWN';
}

function statusFrom(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const candidate of [value.status, value.statusCode, value.code]) {
    if (typeof candidate === 'number') return candidate;
    if (typeof candidate === 'string' && /^\d{3}$/.test(candidate)) return Number(candidate);
  }
  return undefined;
}

function mapGeminiError(error: unknown): AssistantProviderError {
  if (error instanceof AssistantProviderError) return error;
  if (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError') {
    return AssistantProviderError.timeout();
  }
  const status = statusFrom(error);
  if (status === 429) return AssistantProviderError.rateLimited();
  if (status === 401 || status === 403) return AssistantProviderError.configuration();
  return AssistantProviderError.unavailable();
}

function assertNoDuplicateJsonKeys(text: string): void {
  let position = 0;
  const skipWhitespace = () => {
    while (position < text.length && /\s/.test(text[position])) position += 1;
  };
  const parseString = (): string => {
    const start = position;
    if (text[position] !== '"') throw new Error('Expected JSON string');
    position += 1;
    while (position < text.length) {
      if (text[position] === '\\') {
        position += 2;
        continue;
      }
      if (text[position] === '"') {
        position += 1;
        return JSON.parse(text.slice(start, position)) as string;
      }
      position += 1;
    }
    throw new Error('Unterminated JSON string');
  };
  const parseValue = (): void => {
    skipWhitespace();
    const token = text[position];
    if (token === '{') {
      position += 1;
      skipWhitespace();
      const keys = new Set<string>();
      if (text[position] === '}') {
        position += 1;
        return;
      }
      while (position < text.length) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) throw new Error('Duplicate JSON key');
        keys.add(key);
        skipWhitespace();
        if (text[position] !== ':') throw new Error('Expected JSON colon');
        position += 1;
        parseValue();
        skipWhitespace();
        if (text[position] === '}') {
          position += 1;
          return;
        }
        if (text[position] !== ',') throw new Error('Expected JSON comma');
        position += 1;
      }
      throw new Error('Unterminated JSON object');
    }
    if (token === '[') {
      position += 1;
      skipWhitespace();
      if (text[position] === ']') {
        position += 1;
        return;
      }
      while (position < text.length) {
        parseValue();
        skipWhitespace();
        if (text[position] === ']') {
          position += 1;
          return;
        }
        if (text[position] !== ',') throw new Error('Expected JSON comma');
        position += 1;
      }
      throw new Error('Unterminated JSON array');
    }
    if (token === '"') {
      parseString();
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, position)) {
        position += literal.length;
        return;
      }
    }
    const number = text.slice(position).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!number) throw new Error('Invalid JSON value');
    position += number[0].length;
  };

  parseValue();
  skipWhitespace();
  if (position !== text.length) throw new Error('Unexpected trailing JSON content');
}

export function createGeminiAssistantProvider(
  config: GeminiAssistantProviderConfig,
  injectedClient?: GeminiClientLike,
): AssistantModelProvider {
  const client = injectedClient ?? (new GoogleGenAI({ apiKey: config.apiKey }) as unknown as GeminiClientLike);

  return {
    kind: 'gemini',
    model: config.model,
    async generateStructuredResponse(request) {
      let response: GeminiResponseLike;
      try {
        response = await client.models.generateContent({
          model: config.model,
          contents: request.messages.map((message) => ({
            role: message.role,
            parts: [{ text: message.content }],
          })),
          config: {
            systemInstruction: request.systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: request.responseSchema,
            temperature: 0,
            candidateCount: 1,
            maxOutputTokens: 4096,
            abortSignal: request.signal,
            httpOptions: {
              timeout: config.timeoutMs,
              retryOptions: { attempts: 1 },
            },
          },
        });
      } catch (error) {
        throw mapGeminiError(error);
      }

      const finish = finishClassification(response);
      if (finish === 'SAFETY') {
        return { output: null, outputBytes: 0, finishClassification: finish, usage: usage(response) };
      }
      let text: string;
      try {
        text = response.text?.trim() ?? '';
      } catch {
        throw AssistantProviderError.invalidResponse();
      }
      const outputBytes = Buffer.byteLength(text, 'utf8');
      if (!text || outputBytes > config.maxResponseBytes) throw AssistantProviderError.invalidResponse();
      let output: unknown;
      try {
        assertNoDuplicateJsonKeys(text);
        output = JSON.parse(text);
      } catch {
        throw AssistantProviderError.invalidResponse();
      }
      return {
        output,
        outputBytes,
        finishClassification: finish,
        usage: usage(response),
      };
    },
  };
}
