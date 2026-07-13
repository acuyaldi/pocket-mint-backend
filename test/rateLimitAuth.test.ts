import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Router, type Express, type Request } from 'express';
import request from 'supertest';
import { SECRET, ISSUER, mint, validClaims, applyEnv } from './helpers';

// prisma is mocked for the whole file; findUnique behavior is set per test.
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../src/lib/prisma', () => ({ default: { user: { findUnique } } }));

/**
 * Build an app wired like production: the general limiter runs globally on
 * `/api` BEFORE authentication (keyed by IP), and each mutating route runs
 * `requireUser` BEFORE the mutation limiter (keyed by the verified user id).
 * The POST controller echoes the resolved identity and proves no deprecated
 * `req.userId` / `req.authMethod` mirror survives.
 */
async function buildApp(
  overrides: Record<string, string | undefined> = {}
): Promise<{ app: Express; hits: () => number }> {
  vi.resetModules();
  applyEnv({
    NODE_ENV: 'development',
    SUPABASE_JWT_SECRET: SECRET,
    SUPABASE_JWT_ISSUER: ISSUER,
    SUPABASE_URL: undefined,
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_MAX: '100', // general cap high so the mutation cap is what bites
    RATE_LIMIT_MUTATION_MAX: '2',
    RATE_LIMIT_WINDOW_MS: '60000',
    ...overrides,
  });
  const { generalLimiter, mutationLimiter } = await import('../src/middleware/rateLimit');
  const { requireUser } = await import('../src/middleware/apiKeyAuth');

  let hits = 0;
  const app = express();
  // Trust the proxy chain so tests can drive req.ip via X-Forwarded-For.
  app.set('trust proxy', true);
  app.use('/api', generalLimiter);
  app.use(express.json());

  const router = Router();
  router.get('/thing', requireUser, (_req, res) => {
    hits++;
    res.json({ ok: true });
  });
  router.post('/thing', requireUser, mutationLimiter, (req, res) => {
    hits++;
    const r = req as Record<string, unknown>;
    res.json({
      userId: req.auth?.userId ?? null,
      // Prove the deprecated mirrors are gone (own or inherited).
      mirrorUserId: r.userId ?? null,
      mirrorAuthMethod: r.authMethod ?? null,
    });
  });
  app.use('/api', router);

  return { app, hits: () => hits };
}

/** Resolve any looked-up user by echoing the queried id as the row id. */
function resolveAnyUser() {
  findUnique.mockImplementation((args?: { where?: { id?: string } }) =>
    Promise.resolve({ id: args?.where?.id ?? 'unknown' })
  );
}

beforeEach(() => findUnique.mockReset());

describe('rate-limit middleware ordering', () => {
  it('runs the general limiter BEFORE authentication (IP-keyed pre-auth guard)', async () => {
    // General cap of 2: an unauthenticated GET flood is 401 until the general
    // limiter (which sits before requireUser) trips on the 3rd request.
    const { app, hits } = await buildApp({ RATE_LIMIT_MAX: '2' });
    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) statuses.push((await request(app).get('/api/thing')).status);
    expect(statuses).toEqual([401, 401, 429]);
    expect(hits()).toBe(0); // controller never ran
  });

  it('runs the mutation limiter AFTER authentication — invalid auth never reaches it', async () => {
    const { app, hits } = await buildApp();
    const statuses: number[] = [];
    // Five bad-token mutations: each is 401 from requireUser and is never
    // counted by the (post-auth) mutation limiter, so none ever become 429.
    for (let i = 0; i < 5; i++) {
      statuses.push(
        (await request(app).post('/api/thing').set('Authorization', 'Bearer invalid')).status
      );
    }
    expect(statuses.every((s) => s === 401)).toBe(true);
    expect(hits()).toBe(0);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('post-auth mutation limiter — key generation', () => {
  it('keys authenticated JWT mutations by the verified sub — separate buckets per user on one IP', async () => {
    resolveAnyUser();
    const { app } = await buildApp();
    const tokenA = await mint({ sub: 'userA', aud: 'authenticated', iss: ISSUER });
    const tokenB = await mint({ sub: 'userB', aud: 'authenticated', iss: ISSUER });
    const postA = () => request(app).post('/api/thing').set('Authorization', `Bearer ${tokenA}`);
    const postB = () => request(app).post('/api/thing').set('Authorization', `Bearer ${tokenB}`);

    expect((await postA()).status).toBe(200);
    expect((await postA()).status).toBe(200);
    expect((await postA()).status).toBe(429); // userA over the cap of 2
    // Same IP, different verified user → its own bucket, still allowed.
    expect((await postB()).status).toBe(200);
  });

  it('keys the same user identically across different IPs (user key ignores IP)', async () => {
    resolveAnyUser();
    const { app } = await buildApp();
    const token = await mint(validClaims); // sub = u1
    const post = (ip: string) =>
      request(app).post('/api/thing').set('Authorization', `Bearer ${token}`).set('X-Forwarded-For', ip);

    expect((await post('1.1.1.1')).status).toBe(200);
    expect((await post('2.2.2.2')).status).toBe(200);
    // Third request from yet another IP still shares the user:u1 bucket.
    expect((await post('3.3.3.3')).status).toBe(429);
  });

  it('ignores spoofed x-user-id / body / query userId — key stays the verified sub', async () => {
    resolveAnyUser();
    const { app } = await buildApp();
    const token = await mint(validClaims); // sub = u1
    const spoof = (n: number) =>
      request(app)
        .post('/api/thing')
        .set('Authorization', `Bearer ${token}`)
        .set('x-user-id', `evil-${n}`)
        .query({ userId: `evil-q-${n}` })
        .send({ userId: `evil-b-${n}` });

    const r1 = await spoof(1);
    expect(r1.status).toBe(200);
    expect(r1.body.userId).toBe('u1'); // controller saw the verified identity
    expect((await spoof(2)).status).toBe(200);
    // Varying every self-asserted id did not create new buckets → shared user:u1.
    expect((await spoof(3)).status).toBe(429);
  });

  it('does not throttle mutations when RATE_LIMIT_ENABLED=false', async () => {
    resolveAnyUser();
    const { app } = await buildApp({ RATE_LIMIT_ENABLED: 'false' });
    const token = await mint(validClaims);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push(
        (await request(app).post('/api/thing').set('Authorization', `Bearer ${token}`)).status
      );
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
  });
});

describe('rate-limit key generators (unit)', () => {
  it('userOrIpKey uses user:<id> when auth context is present', async () => {
    const { userOrIpKey } = await import('../src/middleware/rateLimit');
    const key = userOrIpKey({ auth: { userId: 'u1' } } as unknown as Request);
    expect(key).toBe('user:u1');
  });

  it('userOrIpKey falls back to ip:<addr> when auth context is absent', async () => {
    const { userOrIpKey } = await import('../src/middleware/rateLimit');
    const key = userOrIpKey({ ip: '203.0.113.7' } as unknown as Request);
    expect(key.startsWith('ip:')).toBe(true);
    expect(key).toContain('203.0.113.7');
  });

  it('ipKey always keys by IP, in a namespace separate from user keys', async () => {
    const { ipKey } = await import('../src/middleware/rateLimit');
    const key = ipKey({ ip: '203.0.113.7' } as unknown as Request);
    expect(key.startsWith('ip:')).toBe(true);
  });

  it('never leaks a token or API key into the key even when headers carry them', async () => {
    const { userOrIpKey } = await import('../src/middleware/rateLimit');
    const key = userOrIpKey({
      auth: { userId: 'u1' },
      headers: { authorization: 'Bearer super-secret-token', 'x-api-key': 'super-secret-key' },
    } as unknown as Request);
    expect(key).toBe('user:u1');
    expect(key).not.toContain('secret');
    expect(key.toLowerCase()).not.toContain('bearer');
  });
});

describe('deprecated identity mirror removal', () => {
  it('sets req.auth and leaves no req.userId / req.authMethod mirror', async () => {
    resolveAnyUser();
    const { app } = await buildApp();
    const token = await mint(validClaims); // sub = u1
    const res = await request(app).post('/api/thing').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
    expect(res.body.mirrorUserId).toBeNull();
    expect(res.body.mirrorAuthMethod).toBeNull();
  });
});
