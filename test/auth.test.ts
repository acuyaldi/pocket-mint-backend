import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { API_KEY, SECRET, ISSUER, mint, validClaims, applyEnv } from './helpers';

// prisma is mocked for the whole file; findUnique behavior is set per test.
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../src/lib/prisma', () => ({ default: { user: { findUnique } } }));

/** Build an app whose /protected route is guarded by a freshly-imported requireUser. */
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
  app.all('/protected', requireUser, (req, res) =>
    res.json({ userId: (req as { userId?: string }).userId, method: (req as { authMethod?: string }).authMethod })
  );
  return app;
}

beforeEach(() => findUnique.mockReset());

describe('requireUser — JWT path', () => {
  it('authenticates a valid JWT using the sub claim', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'u1', method: 'jwt' });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true } });
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

  it('rejects a tampered JWT with 401', async () => {
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

  it('never falls back to legacy headers when a bearer token fails', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid')
      .set('x-api-key', API_KEY)
      .set('x-user-id', 'u2');
    expect(res.status).toBe(401);
    // No DB lookup for the header identity — the failure short-circuits.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('lets a verified JWT override a conflicting x-user-id header', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const token = await mint(validClaims); // sub = u1
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .set('x-api-key', API_KEY)
      .set('x-user-id', 'u2'); // attacker-supplied, must be ignored
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true } });
    expect(findUnique).not.toHaveBeenCalledWith({ where: { id: 'u2' }, select: { id: true } });
  });

  it('returns 401 when a valid JWT resolves to an unknown user', async () => {
    findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('requireUser — legacy compatibility path', () => {
  it('authenticates a valid API key + x-user-id when compat mode is enabled', async () => {
    findUnique.mockResolvedValue({ id: 'u1' });
    const app = await buildApp();
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', API_KEY)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'u1', method: 'legacy-api-key' });
  });

  it('rejects an invalid API key with 401', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', 'wrong-key')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a missing identity header with 401', async () => {
    const app = await buildApp();
    const res = await request(app).get('/protected').set('x-api-key', API_KEY);
    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('disables the compatibility path when AUTH_REQUIRE_JWT=true', async () => {
    const app = await buildApp({ AUTH_REQUIRE_JWT: 'true' });
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', API_KEY)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(401);
    // Uniform auth failure: never reveals which check failed (S11).
    expect(res.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('requireUser — uniform failure response (S11)', () => {
  const UNIFORM = {
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
  };

  it('returns the identical body for every JWT failure variant', async () => {
    const app = await buildApp();
    const expired = await mint(validClaims, '-1h');
    const wrongAud = await mint({ sub: 'u1', aud: 'anon', iss: ISSUER });
    const bodies = await Promise.all(
      [expired, 'not.a.jwt', `${expired}xyz`, wrongAud].map((t) =>
        request(app).get('/protected').set('Authorization', `Bearer ${t}`).then((r) => r.body)
      )
    );
    for (const body of bodies) expect(body).toEqual(UNIFORM);
  });

  it('returns that same body for an API-key failure — indistinguishable from a JWT failure', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', 'wrong-key')
      .set('x-user-id', 'u1');
    expect(res.body).toEqual(UNIFORM);
  });
});
