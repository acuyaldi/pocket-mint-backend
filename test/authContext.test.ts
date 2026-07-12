import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { API_KEY, SECRET, ISSUER, mint, validClaims, applyEnv } from './helpers';

// prisma is mocked for the whole file; findUnique behavior is set per test.
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../src/lib/prisma', () => ({ default: { user: { findUnique } } }));

/**
 * Build an app whose /probe route echoes the canonical auth context plus the
 * raw body/query userId, so tests can prove exactly what requireUser published.
 */
async function buildApp(overrides: Record<string, string | undefined> = {}): Promise<Express> {
  vi.resetModules();
  applyEnv({
    NODE_ENV: 'development',
    API_KEY,
    SUPABASE_JWT_SECRET: SECRET,
    SUPABASE_JWT_ISSUER: ISSUER,
    SUPABASE_URL: undefined,
    AUTH_REQUIRE_JWT: undefined,
    ...overrides,
  });
  const { requireUser } = await import('../src/middleware/apiKeyAuth');
  const app = express();
  app.use(express.json());
  app.all('/probe', requireUser, (req, res) =>
    res.json({
      auth: req.auth ?? null,
      authKeys: req.auth ? Object.keys(req.auth).sort() : [],
      bodyUserId: (req.body ?? {}).userId ?? null,
      queryUserId: (req.query ?? {}).userId ?? null,
    })
  );
  return app;
}

beforeEach(() => findUnique.mockReset());

describe('requireUser — canonical auth context', () => {
  it('JWT path publishes req.auth with the verified id and method "jwt"', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/probe').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.auth).toEqual({ userId: 'u1', method: 'jwt' });
  });

  it('legacy path publishes req.auth with method "legacy-api-key"', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const res = await request(app).get('/probe').set('x-api-key', API_KEY).set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body.auth).toEqual({ userId: 'u1', method: 'legacy-api-key' });
  });

  it('the context carries only { userId, method } — never a token or API key', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/probe').set('Authorization', `Bearer ${token}`);

    expect(res.body.authKeys).toEqual(['method', 'userId']);
    expect(res.body.auth).not.toHaveProperty('token');
    expect(res.body.auth).not.toHaveProperty('apiKey');
  });

  it('does not publish a context when authentication fails (route never runs)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/probe').set('x-api-key', 'wrong-key').set('x-user-id', 'u1');

    expect(res.status).toBe(401);
    // A 401 body from requireUser, not the probe echo — so no auth context leaked.
    expect(res.body.auth).toBeUndefined();
    expect(res.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
    });
  });

  it('a body/query userId can never override the authenticated identity', async () => {
    findUnique.mockResolvedValue({ id: 'u1' }); // verified sub = u1
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app)
      .post('/probe')
      .set('Authorization', `Bearer ${token}`)
      .set('x-user-id', 'evil-header')
      .query({ userId: 'evil-query' })
      .send({ userId: 'evil-body' });

    // The canonical identity is the verified token subject, regardless of what
    // the client put in the header, query, or body.
    expect(res.body.auth).toEqual({ userId: 'u1', method: 'jwt' });
  });
});
