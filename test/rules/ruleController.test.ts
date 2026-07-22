import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

const USER = 'user-1';

const h = vi.hoisted(() => ({
  ruleService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));

vi.mock('../../src/services/rule.service', () => ({ ruleService: h.ruleService }));

import { RuleController } from '../../src/controllers/rule.controller';
import { RuleError } from '../../src/services/rule.errors';
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
  app.get('/rules', RuleController.list);
  app.post('/rules', RuleController.create);
  app.patch('/rules/reorder', RuleController.reorder);
  app.patch('/rules/:id', RuleController.update);
  app.delete('/rules/:id', RuleController.remove);
  app.use(errorHandler);
  return app;
}

function makeRule(over: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    userId: USER,
    name: 'Gopay → Transport',
    enabled: true,
    priority: 0,
    matchType: 'DESCRIPTION',
    operator: 'CONTAINS',
    value: 'GOPAY',
    categoryId: 'cat-1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Rule controller — authentication', () => {
  it.each([
    ['GET /rules', () => request(buildApp(false)).get('/rules')],
    ['POST /rules', () => request(buildApp(false)).post('/rules').send({ name: 'x', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'x', categoryId: 'c1' })],
    ['PATCH /rules/:id', () => request(buildApp(false)).patch('/rules/r1').send({ enabled: false })],
    ['PATCH /rules/reorder', () => request(buildApp(false)).patch('/rules/reorder').send({ ruleIds: [] })],
    ['DELETE /rules/:id', () => request(buildApp(false)).delete('/rules/r1')],
  ])('%s: returns 401 when unauthenticated', async (_label, req) => {
    const res = await req();
    expect(res.status).toBe(401);
  });
});

describe('GET /rules', () => {
  it('returns the serialized list', async () => {
    h.ruleService.list.mockResolvedValue([makeRule()]);
    const res = await request(buildApp()).get('/rules');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{
      id: 'rule-1',
      name: 'Gopay → Transport',
      enabled: true,
      priority: 0,
      matchType: 'DESCRIPTION',
      operator: 'CONTAINS',
      value: 'GOPAY',
      categoryId: 'cat-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }]);
    expect(h.ruleService.list).toHaveBeenCalledWith({ userId: USER });
  });
});

describe('POST /rules', () => {
  it('creates a rule', async () => {
    h.ruleService.create.mockResolvedValue(makeRule());
    const res = await request(buildApp()).post('/rules').send({ name: 'Gopay → Transport', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-1' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('rule-1');
    expect(h.ruleService.create).toHaveBeenCalledWith({
      userId: USER, name: 'Gopay → Transport', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-1', enabled: undefined,
    });
  });

  it('forwards a typed CATEGORY_NOT_FOUND error', async () => {
    h.ruleService.create.mockRejectedValue(new RuleError('nf', 404, 'CATEGORY_NOT_FOUND'));
    const res = await request(buildApp()).post('/rules').send({ name: 'x', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'x', categoryId: 'cat-x' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });
});

describe('PATCH /rules/:id', () => {
  it('updates a rule', async () => {
    h.ruleService.update.mockResolvedValue(makeRule({ enabled: false }));
    const res = await request(buildApp()).patch('/rules/rule-1').send({ enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    expect(h.ruleService.update).toHaveBeenCalledWith({
      userId: USER, ruleId: 'rule-1', name: undefined, matchType: undefined, operator: undefined, value: undefined, categoryId: undefined, enabled: false,
    });
  });

  it('forwards NOT_FOUND for another user\'s rule', async () => {
    h.ruleService.update.mockRejectedValue(new RuleError('nf', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).patch('/rules/rule-1').send({ enabled: false });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /rules/reorder', () => {
  it('reorders rules', async () => {
    h.ruleService.reorder.mockResolvedValue([makeRule({ id: 'r2', priority: 0 }), makeRule({ id: 'r1', priority: 1 })]);
    const res = await request(buildApp()).patch('/rules/reorder').send({ ruleIds: ['r2', 'r1'] });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(h.ruleService.reorder).toHaveBeenCalledWith({ userId: USER, ruleIds: ['r2', 'r1'] });
  });

  it('forwards INVALID_PRIORITY_ORDER', async () => {
    h.ruleService.reorder.mockRejectedValue(new RuleError('bad', 400, 'INVALID_PRIORITY_ORDER'));
    const res = await request(buildApp()).patch('/rules/reorder').send({ ruleIds: ['r1'] });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /rules/:id', () => {
  it('deletes a rule', async () => {
    h.ruleService.remove.mockResolvedValue(undefined);
    const res = await request(buildApp()).delete('/rules/rule-1');
    expect(res.status).toBe(200);
    expect(h.ruleService.remove).toHaveBeenCalledWith({ userId: USER, ruleId: 'rule-1' });
  });

  it('forwards NOT_FOUND', async () => {
    h.ruleService.remove.mockRejectedValue(new RuleError('nf', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).delete('/rules/rule-1');
    expect(res.status).toBe(404);
  });
});
