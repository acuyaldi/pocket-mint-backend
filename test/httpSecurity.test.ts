import { describe, it, expect, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { SECRET, applyEnv } from './helpers';

// ---------------- rate limiting ----------------

async function buildRateApp(overrides: Record<string, string | undefined> = {}): Promise<Express> {
  vi.resetModules();
  applyEnv({
    NODE_ENV: 'development',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_MAX: '3',
    RATE_LIMIT_MUTATION_MAX: '2',
    RATE_LIMIT_WINDOW_MS: '60000',
    ...overrides,
  });
  const { generalLimiter, mutationLimiter } = await import('../src/middleware/rateLimit');
  const app = express();
  app.use('/api', generalLimiter);
  app.use('/api', mutationLimiter);
  app.all('/api/ping', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('rate limiting', () => {
  it('allows requests below the limit and 429s above it', async () => {
    const app = await buildRateApp();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await request(app).get('/api/ping')).status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(429);
  });

  it('returns 429 in the standard JSON error shape with RateLimit headers', async () => {
    const app = await buildRateApp();
    for (let i = 0; i < 3; i++) await request(app).get('/api/ping');
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ success: false, error: { statusCode: 429, message: expect.any(String) } });
    expect(res.headers['ratelimit'] ?? res.headers['ratelimit-limit']).toBeDefined();
  });

  it('does not use the unverified x-user-id header as the limit key', async () => {
    const app = await buildRateApp();
    const statuses: number[] = [];
    // Vary x-user-id every request; if it were the key each would get its own
    // bucket and never 429. Sharing the IP bucket proves the header is ignored.
    for (let i = 0; i < 4; i++) {
      statuses.push((await request(app).get('/api/ping').set('x-user-id', `spoof-${i}`)).status);
    }
    expect(statuses[3]).toBe(429);
  });

  it('never rate-limits CORS preflight (OPTIONS)', async () => {
    const app = await buildRateApp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await request(app).options('/api/ping')).status);
    expect(statuses.every((s) => s !== 429)).toBe(true);
  });
});

// ---------------- CORS ----------------

async function buildCorsApp(overrides: Record<string, string | undefined> = {}): Promise<Express> {
  vi.resetModules();
  applyEnv({
    NODE_ENV: 'development',
    CORS_ALLOWED_ORIGINS: 'https://app.example.com, https://www.example.com/',
    ...overrides,
  });
  const { corsMiddleware } = await import('../src/middleware/cors');
  const app = express();
  app.use(corsMiddleware);
  app.all('/api/ping', (_req, res) => res.json({ ok: true }));
  return app;
}

const ACAO = 'access-control-allow-origin';

describe('CORS', () => {
  it('reflects an allowed origin', async () => {
    const app = await buildCorsApp();
    const res = await request(app).get('/api/ping').set('Origin', 'https://app.example.com');
    expect(res.headers[ACAO]).toBe('https://app.example.com');
  });

  it('rejects an unknown browser origin (no CORS header, no 500)', async () => {
    const app = await buildCorsApp();
    const res = await request(app).get('/api/ping').set('Origin', 'https://evil.example');
    expect(res.headers[ACAO]).toBeUndefined();
    expect(res.status).toBe(200);
  });

  it('allows a server-to-server request with no Origin header', async () => {
    const app = await buildCorsApp();
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
  });

  it('handles preflight and allows Authorization + Content-Type, but not retired identity headers', async () => {
    const app = await buildCorsApp();
    const res = await request(app)
      .options('/api/ping')
      .set('Origin', 'https://app.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(res.status).toBe(204);
    const allowHeaders = (res.headers['access-control-allow-headers'] || '').toLowerCase();
    for (const h of ['authorization', 'content-type']) {
      expect(allowHeaders).toContain(h);
    }
    // The retired legacy identity headers must no longer be advertised as allowed.
    for (const h of ['x-user-id', 'x-user-email', 'x-api-key']) {
      expect(allowHeaders).not.toContain(h);
    }
    const allowMethods = (res.headers['access-control-allow-methods'] || '').toUpperCase();
    for (const m of ['GET', 'POST', 'PUT', 'DELETE']) expect(allowMethods).toContain(m);
  });

  it('does not enable wildcard origin in production configuration', async () => {
    const app = await buildCorsApp({ NODE_ENV: 'production' });
    const res = await request(app).get('/api/ping').set('Origin', 'https://app.example.com');
    expect(res.headers[ACAO]).toBe('https://app.example.com');
    expect(res.headers[ACAO]).not.toBe('*');
  });
});

// ---------------- config validation ----------------

async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  applyEnv({
    NODE_ENV: 'production',
    SUPABASE_JWT_SECRET: SECRET,
    SUPABASE_URL: undefined,
    // Set explicitly: CI has no .env, so nothing else provides a value there.
    DATABASE_URL: 'postgresql://user:password@localhost:5432/pocket_mint_test',
    CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    ...env,
  });
  return import('../src/config');
}

describe('validateConfig (production)', () => {
  it('passes with a complete production configuration', async () => {
    const { validateConfig } = await loadConfig({});
    expect(() => validateConfig()).not.toThrow();
  });

  it('throws when DATABASE_URL is missing in production', async () => {
    const { validateConfig } = await loadConfig({ DATABASE_URL: undefined });
    expect(() => validateConfig()).toThrow(/DATABASE_URL/);
  });

  it('throws when the CORS allowlist is empty in production', async () => {
    const { validateConfig } = await loadConfig({ CORS_ALLOWED_ORIGINS: undefined });
    expect(() => validateConfig()).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it('throws when no JWT verification is configured (auth would be permanently unusable)', async () => {
    const { validateConfig } = await loadConfig({
      SUPABASE_JWT_SECRET: undefined,
      SUPABASE_URL: undefined,
    });
    expect(() => validateConfig()).toThrow(/JWT verification/);
  });

  it('accepts SUPABASE_URL (JWKS) as the sole JWT verification source', async () => {
    const { validateConfig } = await loadConfig({
      SUPABASE_JWT_SECRET: undefined,
      SUPABASE_URL: 'https://proj.supabase.co',
    });
    expect(() => validateConfig()).not.toThrow();
  });
});
