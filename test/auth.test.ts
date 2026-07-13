import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { SECRET, ISSUER, mint, validClaims, applyEnv } from './helpers';

// prisma is mocked for the whole file; findUnique behavior is set per test.
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../src/lib/prisma', () => ({ default: { user: { findUnique } } }));

// A shared secret an attacker might present on the retired legacy header.
const LEGACY_API_KEY = 'any-shared-key-attacker-might-try';

/** Build an app whose /protected route is guarded by a freshly-imported requireUser. */
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
  // Echo the canonical auth context so tests can prove what requireUser set.
  app.all('/protected', requireUser, (req, res) => res.json({ userId: req.auth?.userId }));
  return app;
}

const UNIFORM = {
  success: false,
  error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
};

beforeEach(() => findUnique.mockReset());

describe('requireUser — JWT decision tree', () => {
  it('authenticates a valid JWT using the sub claim', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'u1' });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true } });
  });

  it('rejects a missing token with a uniform 401', async () => {
    const app = await buildApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNIFORM);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects an expired JWT with 401', async () => {
    const app = await buildApp();
    const token = await mint(validClaims, '-1h');
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a malformed JWT with 401', async () => {
    const app = await buildApp();
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered (wrong-signature) JWT with 401', async () => {
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token.slice(0, -3)}xyz`);
    expect(res.status).toBe(401);
  });

  it('rejects a wrong-issuer JWT with 401', async () => {
    const app = await buildApp();
    const token = await mint({ sub: 'u1', aud: 'authenticated', iss: 'https://evil.example/auth/v1' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects a wrong-audience JWT with 401', async () => {
    const app = await buildApp();
    const token = await mint({ sub: 'u1', aud: 'anon', iss: ISSUER });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 when a valid JWT resolves to an unknown user', async () => {
    findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('requireUser — no non-JWT identity is ever accepted', () => {
  it('rejects a request with no bearer token even when it carries a shared key + x-user-id', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', LEGACY_API_KEY)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNIFORM);
    // The retired path is gone — no DB lookup is ever attempted for header identity.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a bare x-user-id (no key, no token)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/protected').set('x-user-id', 'u1');
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('never falls back to legacy headers when a bearer token fails', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid')
      .set('x-api-key', LEGACY_API_KEY)
      .set('x-user-id', 'u2');
    expect(res.status).toBe(401);
    // No DB lookup for the header identity — the failure short-circuits.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('cannot authenticate via a body or query userId', async () => {
    const app = await buildApp();
    const res = await request(app).post('/protected').query({ userId: 'u1' }).send({ userId: 'u1' });
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('lets a verified JWT override a conflicting x-user-id header', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims); // sub = u1
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .set('x-api-key', LEGACY_API_KEY)
      .set('x-user-id', 'u2'); // attacker-supplied, must be ignored
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true } });
    expect(findUnique).not.toHaveBeenCalledWith({ where: { id: 'u2' }, select: { id: true } });
  });
});

describe('requireUser — uniform failure response (S11)', () => {
  it('returns the identical body for every failure variant — token and non-token alike', async () => {
    const app = await buildApp();
    const expired = await mint(validClaims, '-1h');
    const wrongAud = await mint({ sub: 'u1', aud: 'anon', iss: ISSUER });
    const tokenBodies = await Promise.all(
      [expired, 'not.a.jwt', `${expired}xyz`, wrongAud].map((t) =>
        request(app).get('/protected').set('Authorization', `Bearer ${t}`).then((r) => r.body)
      )
    );
    // A missing token and a retired legacy-header attempt are indistinguishable.
    const missing = (await request(app).get('/protected')).body;
    const legacyHeaders = (
      await request(app).get('/protected').set('x-api-key', LEGACY_API_KEY).set('x-user-id', 'u1')
    ).body;
    for (const body of [...tokenBodies, missing, legacyHeaders]) expect(body).toEqual(UNIFORM);
  });
});
