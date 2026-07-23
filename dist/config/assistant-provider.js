"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAssistantProviderConfig = loadAssistantProviderConfig;
const text = (value) => {
    const trimmed = value?.trim();
    return trimmed || undefined;
};
function loadAssistantProviderConfig(env) {
    const configuredProvider = text(env.ASSISTANT_PROVIDER)?.toLowerCase();
    const timeoutText = text(env.ASSISTANT_PROVIDER_TIMEOUT_MS);
    const timeout = timeoutText === undefined ? 15000 : Number(timeoutText);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120000) {
        throw new Error('ASSISTANT_PROVIDER_TIMEOUT_MS must be an integer from 1 to 120000.');
    }
    if (configuredProvider === undefined || configuredProvider === 'disabled') {
        const base = {
            enabled: false, provider: null, model: null, apiKey: null,
            timeoutMs: timeout, maxResponseBytes: 32 * 1024, maxPlanDepth: 6,
        };
        return { ...base, publicMetadata: { enabled: false, provider: null, model: null, timeoutMs: timeout } };
    }
    if (configuredProvider !== 'gemini') {
        throw new Error('ASSISTANT_PROVIDER must be "gemini" or "disabled".');
    }
    const model = text(env.ASSISTANT_MODEL);
    const apiKey = text(env.GEMINI_API_KEY);
    if (!model)
        throw new Error('ASSISTANT_MODEL is required when ASSISTANT_PROVIDER is enabled.');
    if (!apiKey)
        throw new Error('GEMINI_API_KEY is required when ASSISTANT_PROVIDER=gemini.');
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
//# sourceMappingURL=assistant-provider.js.map