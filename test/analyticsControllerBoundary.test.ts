import { beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock every service the controller delegates to, so these tests observe only
// the controller boundary (auth gate, query mapping, Decimal serialization,
// error forwarding) — never a real aggregation or database call.
const h = vi.hoisted(() => ({
  overviewService: { getOverview: vi.fn() },
  trendsService: { getTrends: vi.fn() },
  categoriesService: { getCategoryBreakdown: vi.fn() },
  walletsService: { getWalletBreakdown: vi.fn() },
  budgetQueryService: { listActiveBudgetUsage: vi.fn() },
  transactionQueryService: { listTransactions: vi.fn(), countTransactions: vi.fn() },
}));

vi.mock('../src/services/analytics-overview.service', () => ({ analyticsOverviewService: h.overviewService }));
vi.mock('../src/services/analytics-trends.service', () => ({ analyticsTrendsService: h.trendsService }));
vi.mock('../src/services/analytics-categories.service', () => ({ analyticsCategoriesService: h.categoriesService }));
vi.mock('../src/services/analytics-wallets.service', () => ({ analyticsWalletsService: h.walletsService }));
vi.mock('../src/services/budget-query.service', () => ({ budgetQueryService: h.budgetQueryService }));
vi.mock('../src/services/transaction-query.service', () => ({ transactionQueryService: h.transactionQueryService }));

import { AnalyticsController } from '../src/controllers/analytics.controller';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

function buildApp(injectUser = true): Express {
  const app = express();
  if (injectUser) {
    app.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.get('/analytics/overview', AnalyticsController.overview);
  app.get('/analytics/trends', AnalyticsController.trends);
  app.get('/analytics/categories', AnalyticsController.categories);
  app.get('/analytics/wallets', AnalyticsController.wallets);
  app.get('/analytics/budget-performance', AnalyticsController.budgetPerformance);
  app.get('/analytics/transactions', AnalyticsController.transactions);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

const ROUTES: Array<[string, keyof typeof h, string]> = [
  ['/analytics/overview', 'overviewService', 'getOverview'],
  ['/analytics/trends', 'trendsService', 'getTrends'],
  ['/analytics/categories', 'categoriesService', 'getCategoryBreakdown'],
  ['/analytics/wallets', 'walletsService', 'getWalletBreakdown'],
  ['/analytics/budget-performance', 'budgetQueryService', 'listActiveBudgetUsage'],
];

describe('Analytics v2 controller — authentication', () => {
  for (const [path, serviceKey, method] of ROUTES) {
    it(`401 with no authenticated user, service not called: GET ${path}`, async () => {
      const res = await request(buildApp(false)).get(path);
      expect(res.status).toBe(401);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((h[serviceKey] as any)[method]).not.toHaveBeenCalled();
    });
  }

  it('401 GET /analytics/transactions with no authenticated user', async () => {
    const res = await request(buildApp(false)).get('/analytics/transactions');
    expect(res.status).toBe(401);
    expect(h.transactionQueryService.listTransactions).not.toHaveBeenCalled();
    expect(h.transactionQueryService.countTransactions).not.toHaveBeenCalled();
  });
});

describe('Analytics v2 controller — overview', () => {
  it('maps period query, serializes Decimals, envelopes with success/data', async () => {
    h.overviewService.getOverview.mockResolvedValue({
      period: 'current-month',
      periodStart: new Date('2026-06-30T17:00:00.000Z'),
      periodEnd: new Date('2026-07-31T17:00:00.000Z'),
      income: D('1000000'),
      expense: D('400000'),
      netCashFlow: D('600000'),
      transactionCount: 5,
      previous: {
        periodStart: new Date('2026-05-31T17:00:00.000Z'),
        periodEnd: new Date('2026-06-30T17:00:00.000Z'),
        income: D('800000'),
        expense: D('300000'),
        netCashFlow: D('500000'),
      },
      change: { income: D('200000'), expense: D('100000'), netCashFlow: D('100000') },
      percentageChange: {
        income: { value: D('25') },
        expense: { value: D('33.33') },
        netCashFlow: { value: D('20') },
      },
    });

    const res = await request(buildApp()).get('/analytics/overview?period=current-month');

    expect(res.status).toBe(200);
    expect(h.overviewService.getOverview).toHaveBeenCalledWith({ userId: USER, period: 'current-month', startDate: undefined, endDate: undefined });
    expect(res.body.success).toBe(true);
    expect(res.body.data.income).toBe(1000000);
    expect(res.body.data.percentageChange.income).toEqual({ value: 25, reason: null });
  });

  it('serializes a ZERO_BASELINE percentage change as an explicit null + reason (never Infinity/NaN)', async () => {
    h.overviewService.getOverview.mockResolvedValue({
      period: 'current-month',
      periodStart: new Date(),
      periodEnd: new Date(),
      income: D('1000'),
      expense: D('0'),
      netCashFlow: D('1000'),
      transactionCount: 1,
      previous: { periodStart: new Date(), periodEnd: new Date(), income: D('0'), expense: D('0'), netCashFlow: D('0') },
      change: { income: D('1000'), expense: D('0'), netCashFlow: D('1000') },
      percentageChange: {
        income: { value: null, reason: 'ZERO_BASELINE' },
        expense: { value: null, reason: 'ZERO_BASELINE' },
        netCashFlow: { value: null, reason: 'ZERO_BASELINE' },
      },
    });
    const res = await request(buildApp()).get('/analytics/overview');
    expect(res.body.data.percentageChange.income).toEqual({ value: null, reason: 'ZERO_BASELINE' });
    expect(JSON.stringify(res.body)).not.toMatch(/Infinity|NaN/);
  });

  it('forwards a typed AnalyticsError as a 400, not an untyped 500', async () => {
    const { AnalyticsError } = await import('../src/services/analytics.errors');
    h.overviewService.getOverview.mockRejectedValue(new AnalyticsError('Invalid period. Allowed: ...', 400, 'BAD_REQUEST'));
    const res = await request(buildApp()).get('/analytics/overview?period=bogus');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.overviewService.getOverview.mockRejectedValue(new Error('db exploded'));
    const res = await request(buildApp()).get('/analytics/overview');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not a manual send
  });
});

describe('Analytics v2 controller — categories', () => {
  it('defaults type to EXPENSE when omitted', async () => {
    h.categoriesService.getCategoryBreakdown.mockResolvedValue({
      period: 'current-month', periodStart: new Date(), periodEnd: new Date(), type: 'EXPENSE', total: D('0'), categories: [],
    });
    await request(buildApp()).get('/analytics/categories');
    expect(h.categoriesService.getCategoryBreakdown).toHaveBeenCalledWith(expect.objectContaining({ type: 'EXPENSE' }));
  });
});

describe('Analytics v2 controller — budget-performance', () => {
  it('reuses budgetQueryService.listActiveBudgetUsage and serializes limit/spent/remaining/percentUsed/status', async () => {
    h.budgetQueryService.listActiveBudgetUsage.mockResolvedValue([
      {
        budget: { id: 'b1', amount: D('500000'), isArchived: false, category: { id: 'c1', name: 'Makan', type: 'EXPENSE' } },
        spent: D('250000'),
        remaining: D('250000'),
        percentUsed: D('50'),
        status: 'HEALTHY',
        periodStart: new Date('2026-06-30T17:00:00.000Z'),
        periodEnd: new Date('2026-07-31T17:00:00.000Z'),
      },
    ]);
    const res = await request(buildApp()).get('/analytics/budget-performance');
    expect(h.budgetQueryService.listActiveBudgetUsage).toHaveBeenCalledWith({ userId: USER, status: 'active' });
    expect(res.body.data[0]).toMatchObject({ id: 'b1', limit: 500000, spent: 250000, remaining: 250000, percentUsed: 50, status: 'HEALTHY' });
  });
});

describe('Analytics v2 controller — transactions drill-down', () => {
  it('resolves the period, paginates, and reuses the canonical transaction serializer', async () => {
    h.transactionQueryService.listTransactions.mockResolvedValue([
      { id: 't1', amount: D('15000'), type: 'EXPENSE', date: new Date(), wallet: { id: 'w1', name: 'Cash', type: 'CASH' }, category: null },
    ]);
    h.transactionQueryService.countTransactions.mockResolvedValue(1);

    const res = await request(buildApp()).get('/analytics/transactions?period=current-month&page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.data.transactions[0].amount).toBe(15000);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(h.transactionQueryService.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, limit: 20, skip: 0 })
    );
  });

  it('caps limit at 200 and computes skip from page', async () => {
    h.transactionQueryService.listTransactions.mockResolvedValue([]);
    h.transactionQueryService.countTransactions.mockResolvedValue(0);
    await request(buildApp()).get('/analytics/transactions?page=3&limit=500');
    expect(h.transactionQueryService.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ limit: 200, skip: 400 }));
  });

  it('400s on an invalid period before touching the transaction service', async () => {
    const res = await request(buildApp()).get('/analytics/transactions?period=nonsense');
    expect(res.status).toBe(400);
    expect(h.transactionQueryService.listTransactions).not.toHaveBeenCalled();
  });
});
