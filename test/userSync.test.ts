import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// prisma is mocked; create/findUnique behaviour is set per test.
const { create, findUnique } = vi.hoisted(() => ({ create: vi.fn(), findUnique: vi.fn() }));
vi.mock('../src/lib/prisma', () => ({ default: { user: { create, findUnique } } }));

const SAFE_USER = {
  id: 'u1',
  email: 'a@b.com',
  name: 'A',
  avatarUrl: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
};

async function buildApp(): Promise<Express> {
  vi.resetModules();
  const { UserController } = await import('../src/controllers/user.controller');
  const app = express();
  app.use(express.json());
  app.post('/sync', UserController.sync);
  return app;
}

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
});

describe('POST /users/sync — password handling (S5)', () => {
  it('never persists a password, even if one is supplied', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(SAFE_USER);
    const app = await buildApp();

    const res = await request(app)
      .post('/sync')
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

    const res = await request(app).post('/sync').send({ email: 'a@b.com', name: 'A' });

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

    const res = await request(app).post('/sync').send({ email: 'a@b.com', name: 'A' });

    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();
    expect(findUnique.mock.calls[0][0].select).toBeDefined();
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('rejects a sync missing required fields', async () => {
    const app = await buildApp();
    const res = await request(app).post('/sync').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
