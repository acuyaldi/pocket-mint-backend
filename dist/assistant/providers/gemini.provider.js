"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeminiAssistantProvider = createGeminiAssistantProvider;
const genai_1 = require("@google/genai");
const provider_types_1 = require("../provider-types");
function safeCount(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
function usage(response) {
    const metadata = response.usageMetadata;
    if (!metadata)
        return undefined;
    const mapped = {
        inputTokens: safeCount(metadata.promptTokenCount),
        outputTokens: safeCount(metadata.candidatesTokenCount),
        totalTokens: safeCount(metadata.totalTokenCount),
        cachedInputTokens: safeCount(metadata.cachedContentTokenCount),
    };
    return Object.values(mapped).some((value) => value !== undefined) ? mapped : undefined;
}
function finishClassification(response) {
    if (response.promptFeedback?.blockReason)
        return 'SAFETY';
    const reason = response.candidates?.[0]?.finishReason;
    if (reason === 'STOP')
        return 'STOP';
    if (reason === 'SAFETY' || reason === 'BLOCKLIST' || reason === 'PROHIBITED_CONTENT')
        return 'SAFETY';
    return reason ? 'OTHER' : 'UNKNOWN';
}
function statusFrom(error) {
    if (typeof error !== 'object' || error === null)
        return undefined;
    const value = error;
    for (const candidate of [value.status, value.statusCode, value.code]) {
        if (typeof candidate === 'number')
            return candidate;
        if (typeof candidate === 'string' && /^\d{3}$/.test(candidate))
            return Number(candidate);
    }
    return undefined;
}
function mapGeminiError(error) {
    if (error instanceof provider_types_1.AssistantProviderError)
        return error;
    if (typeof error === 'object' && error !== null && error.name === 'AbortError') {
        return provider_types_1.AssistantProviderError.timeout();
    }
    const status = statusFrom(error);
    if (status === 429)
        return provider_types_1.AssistantProviderError.rateLimited();
    if (status === 401 || status === 403)
        return provider_types_1.AssistantProviderError.configuration();
    return provider_types_1.AssistantProviderError.unavailable();
}
function createGeminiAssistantProvider(config, injectedClient) {
    const client = injectedClient ?? new genai_1.GoogleGenAI({ apiKey: config.apiKey });
    return {
        kind: 'gemini',
        model: config.model,
        async generateStructuredResponse(request) {
            let response;
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
                        abortSignal: request.signal,
                        httpOptions: {
                            timeout: config.timeoutMs,
                            retryOptions: { attempts: 1 },
                        },
                    },
                });
            }
            catch (error) {
                throw mapGeminiError(error);
            }
            const finish = finishClassification(response);
            if (finish === 'SAFETY') {
                return { output: null, outputBytes: 0, finishClassification: finish, usage: usage(response) };
            }
            let text;
            try {
                text = response.text?.trim() ?? '';
            }
            catch {
                throw provider_types_1.AssistantProviderError.invalidResponse();
            }
            const outputBytes = Buffer.byteLength(text, 'utf8');
            if (!text || outputBytes > config.maxResponseBytes)
                throw provider_types_1.AssistantProviderError.invalidResponse();
            let output;
            try {
                output = JSON.parse(text);
            }
            catch {
                throw provider_types_1.AssistantProviderError.invalidResponse();
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
//# sourceMappingURL=gemini.provider.js.map