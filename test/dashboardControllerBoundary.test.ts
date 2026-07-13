import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock the QUERY SERVICE so these tests observe only the controller boundary, and
// mock prisma so we can assert the handler never touches the database directly.
const h = vi.hoisted(() => ({
  queryService: { getSummary: vi.fn() },
  prismaMock: { wallet: { findMany: vi.fn() } },
}));

vi.mock('../src/services/dashboard-query.service', () => ({ dashboardQueryService: h.queryService }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { getDashboardSummary } from '../src/controllers/dashboard.controller';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

function buildApp(injectUser = true): Express {
  const app = express();
  if (injectUser) {
    app.use((req, _res, next) => {
      // Simulate requireUser publishing the canonical auth context.
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.get('/dashboard/summary', getDashboardSummary);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboard summary controller — boundary', () => {
  it('maps userId, calls getSummary once, serializes Decimals to the bare snake_case object, 200', async () => {
    h.queryService.getSummary.mockResolvedValue({
      totalAset: D('350.75'), totalUtang: D('1300.5'), netWorth: D('350.75'),
    });

    const res = await request(buildApp()).get('/dashboard/summary');

    expect(res.status).toBe(200);
    expect(h.queryService.getSummary).toHaveBeenCalledTimes(1);
    expect(h.queryService.getSummary).toHaveBeenCalledWith({ userId: USER });
    // Bare object, no success envelope, snake_case field names, numeric values.
    expect(res.body).toEqual({ total_aset: 350.75, total_utang: 1300.5, net_worth: 350.75 });
    expect(res.body.success).toBeUndefined();
    // The handler must never touch the database directly.
    expect(h.prismaMock.wallet.findMany).not.toHaveBeenCalled();
  });

  it('serializes Decimal cents exactly at the boundary (no float drift)', async () => {
    h.queryService.getSummary.mockResolvedValue({
      totalAset: D('100.25'), totalUtang: D('0'), netWorth: D('100.25'),
    });
    const res = await request(buildApp()).get('/dashboard/summary');
    expect(res.body).toEqual({ total_aset: 100.25, total_utang: 0, net_worth: 100.25 });
  });

  it('returns a valid zeroed summary for an empty dashboard', async () => {
    h.queryService.getSummary.mockResolvedValue({
      totalAset: D('0'), totalUtang: D('0'), netWorth: D('0'),
    });
    const res = await request(buildApp()).get('/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total_aset: 0, total_utang: 0, net_worth: 0 });
  });

  it('401 when no authenticated user, service not called', async () => {
    const res = await request(buildApp(false)).get('/dashboard/summary');
    expect(res.status).toBe(401);
    expect(h.queryService.getSummary).not.toHaveBeenCalled();
  });

  it('passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.queryService.getSummary.mockRejectedValue(new Error('db exploded'));

    const res = await request(buildApp()).get('/dashboard/summary');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not a manual send
  });
});
