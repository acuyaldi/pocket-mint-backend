import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { SECRET, ISSUER, mint, validClaims, applyEnv } from './helpers';

// prisma is mocked; create/findUnique behaviour is set per test.
const { create, findUnique, ensureDefaultCategories } = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  ensureDefaultCategories: vi.fn(),
}));
vi.mock('../src/lib/prisma', () => ({ default: { user: { create, findUnique } } }));
vi.mock('../src/services/category.service', () => ({
  categoryService: { ensureDefaultCategories },
}));

/** A row as Prisma returns it under the controller's fixed `userSelect`. */
const SAFE_USER = {
  id: 'u1',
  email: 'u1@example.com',
  name: 'A',
  avatarUrl: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
};

/**
 * Build an app mounting POST /sync exactly as production does: the verified-JWT
 * bootstrap gate (`requireVerifiedJwt`) in front of the sync controller.
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
  const { requireVerifiedJwt } = await import('../src/middleware/apiKeyAuth');
  const { UserController } = await import('../src/controllers/user.controller');
  const app = express();
  app.use(express.json());
  app.post('/sync', requireVerifiedJwt, UserController.sync);
  return app;
}

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  ensureDefaultCategories.mockReset();
  ensureDefaultCategories.mockResolvedValue(undefined);
});

describe('POST /users/sync — verified-JWT bootstrap identity', () => {
  it('creates the local user keyed by the verified sub (201, response shape preserved)', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims); // sub = u1, email = u1@example.com

    const res = await request(app)
      .post('/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: SAFE_USER, message: 'User synced successfully' });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: expect.any(Object) });
    expect(create).toHaveBeenCalledWith({
      data: { id: 'u1', email: 'u1@example.com', name: 'A' },
      select: expect.any(Object),
    });
  });

  it('is idempotent — a known user is returned untouched (200, no create)', async () => {
    findUnique.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims);

    const res = await request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({ name: 'A' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: SAFE_USER, message: 'User already exists' });
    expect(create).not.toHaveBeenCalled();
    expect(findUnique.mock.calls[0][0]).toEqual({ where: { id: 'u1' }, select: expect.any(Object) });
    expect(ensureDefaultCategories).toHaveBeenCalledWith('u1');
  });

  it('creates default categories for a newly synchronized user', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims);

    await request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({ name: 'A' });

    expect(ensureDefaultCategories).toHaveBeenCalledWith('u1');
  });

  it('ignores a body supabaseId — a caller can never sync another user', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims); // verified sub = u1

    await request(app)
      .post('/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ supabaseId: 'someone-else', name: 'A' });

    const createdId = create.mock.calls[0][0].data.id;
    expect(createdId).toBe('u1');
    expect(createdId).not.toBe('someone-else');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: expect.any(Object) });
  });

  it('prefers the verified email claim over a body email', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims); // email claim = u1@example.com

    await request(app)
      .post('/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'attacker@evil.example', name: 'A' });

    expect(create.mock.calls[0][0].data.email).toBe('u1@example.com');
  });

  it('falls back to the body email when the token carries no email claim', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ ...SAFE_USER, email: 'body@example.com' });
    const app = await buildApp();
    const token = await mint({ sub: 'u1', aud: 'authenticated', iss: ISSUER }); // no email claim

    const res = await request(app)
      .post('/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'body@example.com', name: 'A' });

    expect(res.status).toBe(201);
    expect(create.mock.calls[0][0].data.email).toBe('body@example.com');
  });

  it('rejects a missing bearer token with 401 (never writes)', async () => {
    const app = await buildApp();
    const res = await request(app).post('/sync').send({ email: 'a@b.com', name: 'A' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer + shared key + x-user-id with 401 — legacy cannot bootstrap', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/sync')
      .set('Authorization', 'Bearer not.a.jwt')
      .set('x-api-key', 'shared-key')
      .set('x-user-id', 'someone-else')
      .send({ email: 'a@b.com', name: 'A' });
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a sync missing required fields (name)', async () => {
    const app = await buildApp();
    const token = await mint(validClaims);
    const res = await request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

// Preserved from Sprint 1C (S5): credentials are owned by Supabase Auth and must
// never be persisted or serialized, regardless of what the body contains.
describe('POST /users/sync — password handling (S5)', () => {
  it('never persists a password, even if one is supplied', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims);

    const res = await request(app)
      .post('/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ supabaseId: 'u1', email: 'a@b.com', name: 'A', password: 'should-be-ignored' });

    expect(res.status).toBe(201);
    const createArg = create.mock.calls[0][0];
    expect(createArg.data).not.toHaveProperty('password');
    // A fixed select DTO scopes the row so sensitive columns cannot leak.
    expect(createArg.select).toBeDefined();
    expect(createArg.select).not.toHaveProperty('password');
  });

  it('never returns a password field in the response', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims);

    const res = await request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({ name: 'A' });

    expect(res.body.data).not.toHaveProperty('password');
    expect(Object.keys(res.body.data).sort()).toEqual([
      'avatarUrl',
      'createdAt',
      'email',
      'id',
      'name',
      'updatedAt',
    ]);
  });

  it('still works for an existing user and returns only safe fields', async () => {
    findUnique.mockResolvedValue(SAFE_USER);
    const app = await buildApp();
    const token = await mint(validClaims);

    const res = await request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({ name: 'A' });

    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();
    expect(findUnique.mock.calls[0][0].select).toBeDefined();
    expect(res.body.data).not.toHaveProperty('password');
  });
});

// Phase 37.2 — same TOCTOU bug class as the Phase 37.1 wallet-alias-delete
// race: two concurrent first-syncs for the same brand-new user can both pass
// the initial findUnique and race on create's unique `id`. "Idempotent: a
// known user is a no-op" (the function's own doc comment) means the loser
// must see the same 200 "User already exists" outcome, never a raw 500 —
// and a GENUINE email collision with a different existing user must still
// be a real, typed conflict, never silently treated as success.
describe('POST /users/sync — Phase 37.2 concurrent-create races', () => {
  it('two concurrent first-syncs for the same new user: one creates (201), the loser gets the idempotent 200, never a 500', async () => {
    let findUniqueCalls = 0;
    findUnique.mockImplementation(async () => {
      findUniqueCalls += 1;
      // Both requests' initial pre-check (calls 1-2) race before either has
      // created the row; any call after that is the loser's post-P2002
      // recovery re-fetch, which must now see the winner's row.
      return findUniqueCalls <= 2 ? null : SAFE_USER;
    });
    let createCalls = 0;
    create.mockImplementation(async () => {
      createCalls += 1;
      if (createCalls === 1) return SAFE_USER;
      const err: Error & { code?: string } = new Error('Unique constraint failed on the fields: (`id`)');
      err.code = 'P2002';
      throw err;
    });
    const app = await buildApp();
    const token = await mint(validClaims);
    const post = () => request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({ name: 'A' });

    const [resA, resB] = await Promise.all([post(), post()]);
    const statuses = [resA.status, resB.status].sort();

    expect(statuses).toEqual([200, 201]);
    for (const res of [resA, resB]) {
      expect(res.body).toMatchObject({ success: true, data: SAFE_USER });
    }
    expect(create).toHaveBeenCalledTimes(2);
    expect(ensureDefaultCategories).toHaveBeenCalledWith('u1');
  });

  it('a genuine email collision with a different existing user is a typed 409, never silently adopted', async () => {
    findUnique.mockReset();
    findUnique
      .mockResolvedValueOnce(null) // initial pre-check: no row at this id yet
      .mockResolvedValueOnce(null); // post-P2002 recovery re-fetch: still no row at THIS id — the conflict was on email
    create.mockImplementation(async () => {
      const err: Error & { code?: string } = new Error('Unique constraint failed on the fields: (`email`)');
      err.code = 'P2002';
      throw err;
    });
    const app = await buildApp();
    const token = await mint(validClaims);

    const res = await request(app).post('/sync').set('Authorization', `Bearer ${token}`).send({ name: 'A' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'EMAIL_ALREADY_EXISTS', statusCode: 409, message: 'An account with this email already exists' },
    });
    expect(ensureDefaultCategories).not.toHaveBeenCalled();
  });
});
