import { describe, expect, it } from 'vitest';
import { loadAssistantProviderConfig } from '../../src/config/assistant-provider';

describe('Assistant provider configuration', () => {
  it('keeps the provider runtime explicitly disabled by default', () => {
    expect(loadAssistantProviderConfig({})).toEqual({
      enabled: false,
      provider: null,
      model: null,
      apiKey: null,
      timeoutMs: 15_000,
      maxResponseBytes: 32 * 1024,
      maxPlanDepth: 6,
      publicMetadata: {
        enabled: false,
        provider: null,
        model: null,
        timeoutMs: 15_000,
      },
    });
  });

  it('loads Gemini without exposing credentials in the returned public metadata', () => {
    const config = loadAssistantProviderConfig({
      ASSISTANT_PROVIDER: 'gemini',
      ASSISTANT_MODEL: 'gemini-test',
      GEMINI_API_KEY: 'secret-value',
      ASSISTANT_PROVIDER_TIMEOUT_MS: '12000',
    });

    expect(config).toMatchObject({
      enabled: true,
      provider: 'gemini',
      model: 'gemini-test',
      apiKey: 'secret-value',
      timeoutMs: 12_000,
    });
    expect(JSON.stringify(config.publicMetadata)).not.toContain('secret-value');
  });

  it.each([
    [{ ASSISTANT_PROVIDER: 'gemini' }, 'ASSISTANT_MODEL'],
    [{ ASSISTANT_PROVIDER: 'gemini', ASSISTANT_MODEL: '   ', GEMINI_API_KEY: 'key' }, 'ASSISTANT_MODEL'],
    [{ ASSISTANT_PROVIDER: 'gemini', ASSISTANT_MODEL: 'gemini-test' }, 'GEMINI_API_KEY'],
    [{ ASSISTANT_PROVIDER: 'other', ASSISTANT_MODEL: 'model', GEMINI_API_KEY: 'key' }, 'ASSISTANT_PROVIDER'],
    [{ ASSISTANT_PROVIDER: 'gemini', ASSISTANT_MODEL: 'model', GEMINI_API_KEY: 'key', ASSISTANT_PROVIDER_TIMEOUT_MS: '0' }, 'ASSISTANT_PROVIDER_TIMEOUT_MS'],
    [{ ASSISTANT_PROVIDER: 'gemini', ASSISTANT_MODEL: 'model', GEMINI_API_KEY: 'key', ASSISTANT_PROVIDER_TIMEOUT_MS: '120001' }, 'ASSISTANT_PROVIDER_TIMEOUT_MS'],
    [{ ASSISTANT_PROVIDER: 'gemini', ASSISTANT_MODEL: 'model', GEMINI_API_KEY: 'key', ASSISTANT_PROVIDER_TIMEOUT_MS: '1.5' }, 'ASSISTANT_PROVIDER_TIMEOUT_MS'],
    [{ ASSISTANT_PROVIDER: 'gemini', ASSISTANT_MODEL: 'model', GEMINI_API_KEY: 'key', ASSISTANT_PROVIDER_TIMEOUT_MS: 'Infinity' }, 'ASSISTANT_PROVIDER_TIMEOUT_MS'],
  ])('rejects invalid enabled configuration without echoing secrets', (env, field) => {
    expect(() => loadAssistantProviderConfig(env)).toThrow(field);
    try {
      loadAssistantProviderConfig({ ...env, GEMINI_API_KEY: 'do-not-print' });
    } catch (error) {
      expect(String(error)).not.toContain('do-not-print');
    }
  });
});
