import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const h = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock('../src/services/category.service', () => ({
  categoryService: { listCategories: h.listCategories },
}));

import { getCategories } from '../src/controllers/category.controller';

beforeEach(() => vi.clearAllMocks());

function app(authenticated = true) {
  const instance = express();
  if (authenticated) {
    instance.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: 'user-1' };
      next();
    });
  }
  instance.get('/categories', getCategories);
  return instance;
}

describe('category controller', () => {
  it('returns only categories resolved for the authenticated user', async () => {
    h.listCategories.mockResolvedValue([{ id: 'cat-1', name: 'Gaji', type: 'INCOME' }]);

    const response = await request(app()).get('/categories');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'cat-1', name: 'Gaji', type: 'INCOME' }]);
    expect(h.listCategories).toHaveBeenCalledWith('user-1');
  });

  it('rejects a missing authenticated identity', async () => {
    const response = await request(app(false)).get('/categories');
    expect(response.status).toBe(401);
    expect(h.listCategories).not.toHaveBeenCalled();
  });

  it('mounts the protected category router', () => {
    const route = readFileSync(join(process.cwd(), 'src', 'routes', 'categoryRoutes.ts'), 'utf8');
    const index = readFileSync(join(process.cwd(), 'src', 'routes', 'index.ts'), 'utf8');
    expect(route).toContain("categoryRouter.get('/', requireUser, getCategories)");
    expect(index).toContain("router.use('/v1/categories', categoryRouter)");
  });
});
