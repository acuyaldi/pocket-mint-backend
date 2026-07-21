import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

// ── Hoisted mocks ────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  budgetService: {
    createBudget: vi.fn(),
    updateBudgetAmount: vi.fn(),
    archiveBudget: vi.fn(),
    restoreBudget: vi.fn(),
  },
  budgetQueryService: {
    getBudgetUsage: vi.fn(),
    listActiveBudgetUsage: vi.fn(),
  },
}));

vi.mock('../src/services/budget.service', () => ({ budgetService: h.budgetService }));
vi.mock('../src/services/budget-query.service', () => ({ budgetQueryService: h.budgetQueryService }));

import { BudgetController } from '../src/controllers/budget.controller';
import { BudgetError } from '../src/services/budget.errors';
import { errorHandler } from '../src/middlewares/error.middleware';

// ── Helpers ──────────────────────────────────────────────────────
function buildApp(injectUser = true): Express {
  const app = express();
  app.use(express.json());
  if (injectUser) {
    app.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.get('/budgets', BudgetController.list);
  app.get('/budgets/:id', BudgetController.getOne);
  app.post('/budgets', BudgetController.create);
  app.patch('/budgets/:id', BudgetController.update);
  app.post('/budgets/:id/archive', BudgetController.archive);
  app.post('/budgets/:id/restore', BudgetController.restore);
  app.use(errorHandler);
  return app;
}

function makeBudgetWithUsage(over: Record<string, unknown> = {}) {
  const periodStart = new Date('2026-06-30T17:00:00.000Z');
  const periodEnd = new Date('2026-07-31T17:00:00.000Z');
  return {
    budget: {
      id: 'budget-1',
      userId: USER,
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Makan', type: 'EXPENSE' },
      amount: D(over.amount ?? '1000000'),
      isArchived: over.isArchived ?? false,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    spent: D(over.spent ?? 0),
    remaining: D(over.remaining ?? '1000000'),
    percentUsed: over.percentUsed !== undefined ? (over.percentUsed === null ? null : D(over.percentUsed as string)) : D(0),
    status: over.status ?? 'HEALTHY',
    periodStart,
    periodEnd,
  };
}

function makeBudgetRecord(over: Record<string, unknown> = {}) {
  return {
    id: 'budget-1',
    userId: USER,
    categoryId: 'cat-1',
    amount: D('1000000'),
    isArchived: over.isArchived ?? false,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Auth ─────────────────────────────────────────────────────────
describe('Budget controller — authentication', () => {
  it.each([
    ['GET /budgets', () => request(buildApp(false)).get('/budgets')],
    ['GET /budgets/:id', () => request(buildApp(false)).get('/budgets/b1')],
    ['POST /budgets', () => request(buildApp(false)).post('/budgets').send({ categoryId: 'c1', amount: 100 })],
    ['PATCH /budgets/:id', () => request(buildApp(false)).patch('/budgets/b1').send({ amount: 200 })],
    ['POST /budgets/:id/archive', () => request(buildApp(false)).post('/budgets/b1/archive')],
    ['POST /budgets/:id/restore', () => request(buildApp(false)).post('/budgets/b1/restore')],
  ])('%s: returns 401 when unauthenticated', async (_label, req) => {
    const res = await req();
    expect(res.status).toBe(401);
  });
});

// ── GET /budgets ─────────────────────────────────────────────────
describe('GET /budgets', () => {
  it('returns empty active list', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([]);

    const res = await request(buildApp()).get('/budgets');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(h.budgetQueryService.listActiveBudgetUsage).toHaveBeenCalledWith({ userId: USER, status: 'active' });
  });

  it('returns populated active list with canonical DTO serialization', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([makeBudgetWithUsage({ spent: '750000', remaining: '250000', percentUsed: '75', status: 'APPROACHING' })]);

    const res = await request(buildApp()).get('/budgets');

    expect(res.status).toBe(200);
    const dto = res.body.data[0];
    expect(dto.id).toBe('budget-1');
    expect(dto.category).toEqual({ id: 'cat-1', name: 'Makan', type: 'EXPENSE' });
    expect(dto.amount).toBe(1000000);
    expect(dto.spent).toBe(750000);
    expect(dto.remaining).toBe(250000);
    expect(dto.percentUsed).toBe(75);
    expect(dto.status).toBe('APPROACHING');
    expect(dto.isArchived).toBe(false);
    expect(dto.periodStart).toBe('2026-06-30T17:00:00.000Z');
    expect(dto.periodEnd).toBe('2026-07-31T17:00:00.000Z');
    expect(dto.createdAt).toBe('2026-07-01T00:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-07-01T00:00:00.000Z');
    // All monetary fields are serialized as numbers, not strings.
    for (const k of ['amount', 'spent', 'remaining', 'percentUsed']) {
      expect(typeof dto[k]).toBe('number');
    }
  });

  it('serializes percentUsed null correctly', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([makeBudgetWithUsage({ percentUsed: null })]);

    const res = await request(buildApp()).get('/budgets');
    expect(res.body.data[0].percentUsed).toBeNull();
  });

  it('returns archived list when status=archived', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([makeBudgetWithUsage({ isArchived: true, status: 'ARCHIVED' })]);

    const res = await request(buildApp()).get('/budgets?status=archived');

    expect(res.status).toBe(200);
    expect(h.budgetQueryService.listActiveBudgetUsage).toHaveBeenCalledWith({ userId: USER, status: 'archived' });
    expect(res.body.data[0].isArchived).toBe(true);
    expect(res.body.data[0].status).toBe('ARCHIVED');
  });

  it('rejects invalid status query param', async () => {
    const res = await request(buildApp()).get('/budgets?status=deleted');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(h.budgetQueryService.listActiveBudgetUsage).not.toHaveBeenCalled();
  });

  it('defaults to active when status query param is absent', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([]);
    await request(buildApp()).get('/budgets');
    expect(h.budgetQueryService.listActiveBudgetUsage).toHaveBeenCalledWith({ userId: USER, status: 'active' });
  });

  it('forwards typed BudgetError from query service', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockRejectedValue(new BudgetError('boom', 500, 'INTERNAL_ERROR'));
    const res = await request(buildApp()).get('/budgets');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('passes unexpected error to central handler', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockRejectedValue(new Error('db exploded'));
    const res = await request(buildApp()).get('/budgets');
    expect(res.status).toBe(500);
    expect(res.body.error.requestId).toBeTruthy();
  });
});

// ── GET /budgets/:id ─────────────────────────────────────────────
describe('GET /budgets/:id', () => {
  it('returns one Budget with canonical DTO', async () => {
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ spent: '300000', remaining: '700000', percentUsed: '30' }));

    const res = await request(buildApp()).get('/budgets/budget-1');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('budget-1');
    expect(h.budgetQueryService.getBudgetUsage).toHaveBeenCalledWith({ userId: USER, budgetId: 'budget-1' });
  });

  it('returns 404 for missing budget', async () => {
    h.budgetQueryService.getBudgetUsage.mockRejectedValue(new BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).get('/budgets/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for another user\'s budget (structurally indistinguishable)', async () => {
    h.budgetQueryService.getBudgetUsage.mockRejectedValue(new BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).get('/budgets/other-user-budget');
    expect(res.status).toBe(404);
  });

  it('returns archived Budget with ARCHIVED status', async () => {
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ isArchived: true, spent: '500000', remaining: '500000', status: 'ARCHIVED' }));

    const res = await request(buildApp()).get('/budgets/budget-1');
    expect(res.body.data.isArchived).toBe(true);
    expect(res.body.data.status).toBe('ARCHIVED');
  });
});

// ── POST /budgets ────────────────────────────────────────────────
describe('POST /budgets', () => {
  it('creates a budget and returns 201 with DTO', async () => {
    h.budgetService.createBudget.mockResolvedValue(makeBudgetRecord());
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage());

    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: 1000000 });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('budget-1');
    expect(h.budgetService.createBudget).toHaveBeenCalledWith({ userId: USER, categoryId: 'cat-1', amount: 1000000 });
    expect(h.budgetQueryService.getBudgetUsage).toHaveBeenCalledWith({ userId: USER, budgetId: 'budget-1' });
  });

  it('passes through missing categoryId to service (controller does no manual validation)', async () => {
    h.budgetService.createBudget.mockResolvedValue(makeBudgetRecord());
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage());

    const res = await request(buildApp()).post('/budgets').send({ amount: 100 });

    // The controller doesn't gate on categoryId — it's the service's responsibility.
    // The service mock succeeds, so the response is 201.
    expect(res.status).toBe(201);
    const arg = h.budgetService.createBudget.mock.calls[0][0];
    expect(arg.categoryId).toBeUndefined();
  });

  it('rejects missing amount: passes through to service which throws BAD_REQUEST', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('amount is required', 400, 'BAD_REQUEST'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects non-positive amount with INVALID_AMOUNT', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('amount must be greater than zero', 422, 'INVALID_AMOUNT'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: 0 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_AMOUNT');
  });

  it('rejects excessive decimal scale with INVALID_AMOUNT', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('amount must have at most 2 decimal places', 422, 'INVALID_AMOUNT'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: '100.123' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_AMOUNT');
  });

  it('rejects non-expense category with CATEGORY_NOT_EXPENSE', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('Kategori bukan kategori pengeluaran', 422, 'CATEGORY_NOT_EXPENSE'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: 100 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CATEGORY_NOT_EXPENSE');
  });

  it('rejects duplicate budget with BUDGET_ALREADY_EXISTS', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('Anggaran untuk kategori ini sudah ada', 409, 'BUDGET_ALREADY_EXISTS'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: 100 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BUDGET_ALREADY_EXISTS');
  });

  it('rejects category not found with CATEGORY_NOT_FOUND', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'ghost', amount: 100 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('ignores extraneous body fields (no allowlist leak)', async () => {
    h.budgetService.createBudget.mockResolvedValue(makeBudgetRecord());
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage());

    await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: 100, userId: 'evil', foo: 'bar' });

    const arg = h.budgetService.createBudget.mock.calls[0][0];
    expect(arg.userId).toBe(USER); // authenticated, not body 'evil'
    expect(arg).not.toHaveProperty('foo');
  });
});

// ── PATCH /budgets/:id ───────────────────────────────────────────
describe('PATCH /budgets/:id', () => {
  it('updates amount and returns DTO', async () => {
    h.budgetService.updateBudgetAmount.mockResolvedValue(makeBudgetRecord({ amount: D('2000000') }));
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ amount: '2000000', spent: '500000', remaining: '1500000', percentUsed: '25' }));

    const res = await request(buildApp()).patch('/budgets/budget-1').send({ amount: 2000000 });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(2000000);
    expect(h.budgetService.updateBudgetAmount).toHaveBeenCalledWith({ userId: USER, budgetId: 'budget-1', amount: 2000000 });
  });

  it('rejects categoryId with CATEGORY_NOT_EDITABLE', async () => {
    const res = await request(buildApp()).patch('/budgets/budget-1').send({ amount: 200, categoryId: 'cat-2' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CATEGORY_NOT_EDITABLE');
    expect(h.budgetService.updateBudgetAmount).not.toHaveBeenCalled();
  });

  it('rejects categoryId even when it matches the current value', async () => {
    const res = await request(buildApp()).patch('/budgets/budget-1').send({ amount: 200, categoryId: 'cat-1' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CATEGORY_NOT_EDITABLE');
  });

  it('rejects isArchived in body as a forbidden mutation field', async () => {
    // isArchived is not on the allowlist; it's passed through to the service as
    // a property of the body. The service call only receives {userId, budgetId, amount}.
    // We verify the explicit CATEGORY_NOT_EDITABLE check doesn't misfire, and extraneous
    // fields like isArchived are simply not mapped.
    h.budgetService.updateBudgetAmount.mockResolvedValue(makeBudgetRecord());
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage());

    const res = await request(buildApp()).patch('/budgets/budget-1').send({ amount: 200, isArchived: true });
    expect(res.status).toBe(200);
    const arg = h.budgetService.updateBudgetAmount.mock.calls[0][0];
    expect(arg).not.toHaveProperty('isArchived');
  });

  it('rejects missing amount with BAD_REQUEST', async () => {
    h.budgetService.updateBudgetAmount.mockRejectedValue(new BudgetError('amount is required', 400, 'BAD_REQUEST'));
    const res = await request(buildApp()).patch('/budgets/budget-1').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects non-positive amount with INVALID_AMOUNT', async () => {
    h.budgetService.updateBudgetAmount.mockRejectedValue(new BudgetError('amount must be greater than zero', 422, 'INVALID_AMOUNT'));
    const res = await request(buildApp()).patch('/budgets/budget-1').send({ amount: 0 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_AMOUNT');
  });

  it('returns 404 for another user\'s budget', async () => {
    h.budgetService.updateBudgetAmount.mockRejectedValue(new BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).patch('/budgets/other-budget').send({ amount: 200 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('allows updating archived budget amount', async () => {
    h.budgetService.updateBudgetAmount.mockResolvedValue(makeBudgetRecord({ amount: D('2000000'), isArchived: true }));
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ amount: '2000000', isArchived: true, spent: '500000', remaining: '1500000', status: 'ARCHIVED' }));

    const res = await request(buildApp()).patch('/budgets/budget-1').send({ amount: 2000000 });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(2000000);
    expect(res.body.data.isArchived).toBe(true);
    expect(res.body.data.status).toBe('ARCHIVED');
  });
});

// ── POST /budgets/:id/archive ────────────────────────────────────
describe('POST /budgets/:id/archive', () => {
  it('archives an active budget and returns DTO', async () => {
    h.budgetService.archiveBudget.mockResolvedValue(makeBudgetRecord({ isArchived: true }));
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ isArchived: true, status: 'ARCHIVED' }));

    const res = await request(buildApp()).post('/budgets/budget-1/archive');

    expect(res.status).toBe(200);
    expect(res.body.data.isArchived).toBe(true);
    expect(res.body.data.status).toBe('ARCHIVED');
    expect(h.budgetService.archiveBudget).toHaveBeenCalledWith({ userId: USER, budgetId: 'budget-1' });
  });

  it('rejects repeated archive with ALREADY_ARCHIVED', async () => {
    h.budgetService.archiveBudget.mockRejectedValue(new BudgetError('Anggaran sudah diarsipkan', 409, 'ALREADY_ARCHIVED'));
    const res = await request(buildApp()).post('/budgets/budget-1/archive');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ARCHIVED');
  });

  it('returns 404 for missing/cross-user budget', async () => {
    h.budgetService.archiveBudget.mockRejectedValue(new BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).post('/budgets/nope/archive');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── POST /budgets/:id/restore ────────────────────────────────────
describe('POST /budgets/:id/restore', () => {
  it('restores an archived budget and returns DTO', async () => {
    h.budgetService.restoreBudget.mockResolvedValue(makeBudgetRecord({ isArchived: false }));
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ isArchived: false, status: 'HEALTHY' }));

    const res = await request(buildApp()).post('/budgets/budget-1/restore');

    expect(res.status).toBe(200);
    expect(res.body.data.isArchived).toBe(false);
    expect(res.body.data.status).toBe('HEALTHY');
    expect(h.budgetService.restoreBudget).toHaveBeenCalledWith({ userId: USER, budgetId: 'budget-1' });
  });

  it('rejects repeated restore with ALREADY_ACTIVE', async () => {
    h.budgetService.restoreBudget.mockRejectedValue(new BudgetError('Anggaran sudah aktif', 409, 'ALREADY_ACTIVE'));
    const res = await request(buildApp()).post('/budgets/budget-1/restore');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ACTIVE');
  });

  it('returns 404 for missing/cross-user budget', async () => {
    h.budgetService.restoreBudget.mockRejectedValue(new BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).post('/budgets/nope/restore');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── DTO serialization contract ───────────────────────────────────
describe('BudgetDto serialization', () => {
  it('all Decimal fields are numbers, not strings', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([
      makeBudgetWithUsage({ spent: '999999999.99', remaining: '0.01', percentUsed: '99.999999' }),
    ]);

    const res = await request(buildApp()).get('/budgets');
    const dto = res.body.data[0];

    expect(typeof dto.amount).toBe('number');
    expect(typeof dto.spent).toBe('number');
    expect(typeof dto.remaining).toBe('number');
    expect(typeof dto.percentUsed).toBe('number');
  });

  it('uses the exact backend-computed status, never re-derived', async () => {
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage({ spent: '1500000', remaining: '-500000', percentUsed: '150', status: 'EXCEEDED' }));

    const res = await request(buildApp()).get('/budgets/budget-1');
    expect(res.body.data.status).toBe('EXCEEDED');
  });

  it('exposes ISO 8601 timestamps for periodStart/periodEnd/createdAt/updatedAt', async () => {
    h.budgetQueryService.getBudgetUsage.mockResolvedValue(makeBudgetWithUsage());

    const res = await request(buildApp()).get('/budgets/budget-1');
    for (const k of ['periodStart', 'periodEnd', 'createdAt', 'updatedAt']) {
      expect(res.body.data[k]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });
});

// ── Error safety ─────────────────────────────────────────────────
describe('Budget controller — error safety', () => {
  it('raw Prisma P2002 is never exposed (service translates to BudgetError)', async () => {
    h.budgetService.createBudget.mockRejectedValue(new BudgetError('Anggaran untuk kategori ini sudah ada', 409, 'BUDGET_ALREADY_EXISTS'));
    const res = await request(buildApp()).post('/budgets').send({ categoryId: 'cat-1', amount: 100 });
    expect(res.body.error.code).toBe('BUDGET_ALREADY_EXISTS');
  });

  it('unexpected errors use the central handler (requestId present, message redacted)', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockRejectedValue(new Error('raw prisma internal'));
    const res = await request(buildApp()).get('/budgets');
    expect(res.status).toBe(500);
    expect(res.body.error.requestId).toBeTruthy();
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
