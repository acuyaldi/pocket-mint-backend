import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { SECRET, ISSUER, mint, validClaims, applyEnv } from './helpers';

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
    SUPABASE_JWT_SECRET: SECRET,
    SUPABASE_JWT_ISSUER: ISSUER,
    SUPABASE_URL: undefined,
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
  it('JWT path publishes req.auth with the verified id (userId only, no method)', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/probe').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.auth).toEqual({ userId: 'u1' });
  });

  it('the context user id comes from the verified sub, not any header', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims); // sub = u1
    const res = await request(app)
      .get('/probe')
      .set('Authorization', `Bearer ${token}`)
      .set('x-user-id', 'evil-header');
    expect(res.body.auth).toEqual({ userId: 'u1' });
  });

  it('carries only { userId } for a data route — no token, api key, email, or method', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/probe').set('Authorization', `Bearer ${token}`);

    expect(res.body.authKeys).toEqual(['userId']);
    expect(res.body.auth).not.toHaveProperty('token');
    expect(res.body.auth).not.toHaveProperty('apiKey');
    expect(res.body.auth).not.toHaveProperty('method');
  });

  it('the retired legacy header path cannot authenticate', async () => {
    const app = await buildApp();
    const res = await request(app).get('/probe').set('x-api-key', 'shared-key').set('x-user-id', 'u1');

    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('does not publish a context when authentication fails (route never runs)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/probe'); // no credentials at all

    expect(res.status).toBe(401);
    // A 401 body from requireUser, not the probe echo — so no auth context leaked.
    expect(res.body.auth).toBeUndefined();
    expect(res.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
    });
  });

  it('a body/query/header userId can never override the authenticated identity', async () => {
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
    expect(res.body.auth).toEqual({ userId: 'u1' });
  });
});
