import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

const USER = 'user-1';

const h = vi.hoisted(() => ({
  merchantMappingService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../src/services/merchantMapping.service', () => ({ merchantMappingService: h.merchantMappingService }));

import { MerchantMappingController } from '../../src/controllers/merchantMapping.controller';
import { MerchantMappingError } from '../../src/services/merchantMapping.errors';
import { errorHandler } from '../../src/middlewares/error.middleware';

function buildApp(injectUser = true): Express {
  const app = express();
  app.use(express.json());
  if (injectUser) {
    app.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.get('/merchant-mappings', MerchantMappingController.list);
  app.post('/merchant-mappings', MerchantMappingController.create);
  app.patch('/merchant-mappings/:id', MerchantMappingController.update);
  app.delete('/merchant-mappings/:id', MerchantMappingController.remove);
  app.use(errorHandler);
  return app;
}

function makeMapping(over: Record<string, unknown> = {}) {
  return {
    id: 'mapping-1',
    userId: USER,
    merchantName: 'Warung Bu Siti',
    normalizedMerchant: 'warung bu siti',
    categoryId: 'cat-1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Merchant mapping controller — authentication', () => {
  it.each([
    ['GET /merchant-mappings', () => request(buildApp(false)).get('/merchant-mappings')],
    ['POST /merchant-mappings', () => request(buildApp(false)).post('/merchant-mappings').send({ merchantName: 'X', categoryId: 'c1' })],
    ['PATCH /merchant-mappings/:id', () => request(buildApp(false)).patch('/merchant-mappings/m1').send({ merchantName: 'X' })],
    ['DELETE /merchant-mappings/:id', () => request(buildApp(false)).delete('/merchant-mappings/m1')],
  ])('%s: returns 401 when unauthenticated', async (_label, req) => {
    const res = await req();
    expect(res.status).toBe(401);
  });
});

describe('GET /merchant-mappings', () => {
  it('returns the serialized list', async () => {
    h.merchantMappingService.list.mockResolvedValue([makeMapping()]);
    const res = await request(buildApp()).get('/merchant-mappings');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{
      id: 'mapping-1',
      merchantName: 'Warung Bu Siti',
      normalizedMerchant: 'warung bu siti',
      categoryId: 'cat-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }]);
    expect(h.merchantMappingService.list).toHaveBeenCalledWith({ userId: USER, search: undefined });
  });

  it('passes the search query through', async () => {
    h.merchantMappingService.list.mockResolvedValue([]);
    await request(buildApp()).get('/merchant-mappings?search=warung');
    expect(h.merchantMappingService.list).toHaveBeenCalledWith({ userId: USER, search: 'warung' });
  });
});

describe('POST /merchant-mappings', () => {
  it('creates a mapping', async () => {
    h.merchantMappingService.create.mockResolvedValue(makeMapping());
    const res = await request(buildApp()).post('/merchant-mappings').send({ merchantName: 'Warung Bu Siti', categoryId: 'cat-1' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('mapping-1');
    expect(h.merchantMappingService.create).toHaveBeenCalledWith({ userId: USER, merchantName: 'Warung Bu Siti', categoryId: 'cat-1' });
  });

  it('forwards a typed DUPLICATE_MERCHANT error', async () => {
    h.merchantMappingService.create.mockRejectedValue(new MerchantMappingError('dup', 409, 'DUPLICATE_MERCHANT'));
    const res = await request(buildApp()).post('/merchant-mappings').send({ merchantName: 'X', categoryId: 'cat-1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_MERCHANT');
  });
});

describe('PATCH /merchant-mappings/:id', () => {
  it('updates a mapping', async () => {
    h.merchantMappingService.update.mockResolvedValue(makeMapping({ merchantName: 'Renamed' }));
    const res = await request(buildApp()).patch('/merchant-mappings/mapping-1').send({ merchantName: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.merchantName).toBe('Renamed');
    expect(h.merchantMappingService.update).toHaveBeenCalledWith({ userId: USER, mappingId: 'mapping-1', merchantName: 'Renamed', categoryId: undefined });
  });

  it('forwards NOT_FOUND for another user\'s mapping', async () => {
    h.merchantMappingService.update.mockRejectedValue(new MerchantMappingError('nf', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).patch('/merchant-mappings/mapping-1').send({ merchantName: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /merchant-mappings/:id', () => {
  it('deletes a mapping', async () => {
    h.merchantMappingService.remove.mockResolvedValue(undefined);
    const res = await request(buildApp()).delete('/merchant-mappings/mapping-1');
    expect(res.status).toBe(200);
    expect(h.merchantMappingService.remove).toHaveBeenCalledWith({ userId: USER, mappingId: 'mapping-1' });
  });

  it('forwards NOT_FOUND', async () => {
    h.merchantMappingService.remove.mockRejectedValue(new MerchantMappingError('nf', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).delete('/merchant-mappings/mapping-1');
    expect(res.status).toBe(404);
  });
});
