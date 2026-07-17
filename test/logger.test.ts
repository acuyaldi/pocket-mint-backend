import { describe, it, expect, vi, afterEach } from 'vitest';
import { redact, logger } from '../src/utils/logger';

describe('redact', () => {
  it('redacts sensitive top-level fields', () => {
    const out = redact({ password: 'p', token: 't', apiKey: 'k', keep: 'visible' });
    expect(out).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      apiKey: '[REDACTED]',
      keep: 'visible',
    });
  });

  it('redacts nested sensitive fields', () => {
    const out = redact({ user: { name: 'a', secret: 's', creds: { refreshToken: 'r' } } });
    expect(out).toEqual({
      user: { name: 'a', secret: '[REDACTED]', creds: { refreshToken: '[REDACTED]' } },
    });
  });

  it('redacts differently cased and delimited sensitive keys', () => {
    const out = redact({
      Authorization: 'x',
      'x-api-key': 'y',
      DATABASE_URL: 'z',
      Access_Token: 'q',
    });
    expect(out).toEqual({
      Authorization: '[REDACTED]',
      'x-api-key': '[REDACTED]',
      DATABASE_URL: '[REDACTED]',
      Access_Token: '[REDACTED]',
    });
  });

  it('handles arrays, including arrays of objects', () => {
    const out = redact({ items: [{ password: 'p', id: 1 }, { id: 2 }], tags: ['a', 'b'] });
    expect(out).toEqual({ items: [{ password: '[REDACTED]', id: 1 }, { id: 2 }], tags: ['a', 'b'] });
  });

  it('does not mutate the original object', () => {
    const input = { password: 'p', nested: { token: 't', keep: 1 } };
    const snapshot = structuredClone(input);
    redact(input);
    expect(input).toEqual(snapshot);
  });

  it('does not crash on circular references', () => {
    const node: Record<string, unknown> = { name: 'a' };
    node.self = node;
    expect(() => redact(node)).not.toThrow();
    const out = redact(node) as Record<string, unknown>;
    expect(out.name).toBe('a');
    expect(out.self).toBe('[Circular]');
  });
});

describe('logger output', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never writes raw credential material to the log line', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('auth event', {
      authorization: 'Bearer super-secret-token-value',
      apiKey: 'raw-key-should-not-appear',
      nested: { password: 'raw-password-should-not-appear' },
    });
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain('super-secret-token-value');
    expect(line).not.toContain('raw-key-should-not-appear');
    expect(line).not.toContain('raw-password-should-not-appear');
    expect(line).toContain('[REDACTED]');
  });
});
