// ============================================================
// Tests: Assistant HTTP boundary (controller + route)
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoist mocks so they're available when the controller module loads.
const h = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getCategoryBreakdown: vi.fn(),
}));

vi.mock('../../src/services/transaction-query.service', () => ({
  transactionQueryService: {
    getSummary: h.getSummary,
    listTransactions: vi.fn(),
    countTransactions: vi.fn(),
  },
}));
vi.mock('../../src/services/analytics-categories.service', () => ({
  analyticsCategoriesService: {
    getCategoryBreakdown: h.getCategoryBreakdown,
  },
}));

import { assistantExecute } from '../../src/controllers/assistant.controller';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { correlationMiddleware } from '../../src/http/correlation';
import { Prisma } from '../../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

function buildApp(injectUser = true): express.Express {
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  if (injectUser) {
    app.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.post('/v1/assistant/execute', assistantExecute);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- Auth tests ------------------------------------------------------------

describe('POST /v1/assistant/execute — auth', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const app = buildApp(false); // no auth injection
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({ intent: 'analytics.monthly-spending-summary', arguments: { month: '2026-07' } });
    expect(res.status).toBe(401);
  });

  it('accepts authenticated requests', async () => {
    h.getSummary.mockResolvedValue({
      income: D(5_000_000),
      expenses: D(3_000_000),
      netSavings: D(2_000_000),
      transactionCount: 10,
      month: '2026-07',
    });
    h.getCategoryBreakdown.mockResolvedValue({
      period: 'custom',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-08-01'),
      type: 'EXPENSE',
      total: D(3_000_000),
      categories: [
        {
          categoryId: 'cat-1',
          name: 'Makanan',
          amount: D(1_500_000),
          transactionCount: 10,
          percentage: D(50),
        },
      ],
    });

    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({ intent: 'analytics.monthly-spending-summary', arguments: { month: '2026-07' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('success');
  });
});

// ---- Input validation tests ------------------------------------------------

describe('POST /v1/assistant/execute — input validation', () => {
  it('rejects missing intent field with 400', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({ arguments: { month: '2026-07' } });
    expect(res.status).toBe(400);
  });

  it('rejects non-object body with 400', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send('not an object')
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('rejects unsupported intent with 400', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({ intent: 'transaction.create', arguments: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ASSISTANT_UNSUPPORTED_INTENT');
  });

  it('rejects malformed month (month 13)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({
        intent: 'analytics.monthly-spending-summary',
        arguments: { month: '2026-13' },
      });
    expect(res.status).toBe(400);
  });

  it('rejects ambiguous/missing month', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({
        intent: 'analytics.monthly-spending-summary',
        arguments: {},
      });
    expect(res.status).toBe(400);
  });

  it('does not accept or honor a caller-supplied userId in body', async () => {
    // The controller never reads userId from body — identity comes from req.auth
    // Even if caller sends userId, services receive the authenticated userId
    h.getSummary.mockResolvedValue({
      income: D(1_000_000),
      expenses: D(500_000),
      netSavings: D(500_000),
      transactionCount: 5,
      month: '2026-07',
    });
    h.getCategoryBreakdown.mockResolvedValue({
      period: 'custom',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-08-01'),
      type: 'EXPENSE',
      total: D(500_000),
      categories: [],
    });

    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({
        intent: 'analytics.monthly-spending-summary',
        arguments: { month: '2026-07', userId: 'hacker' },
      });
    // Should succeed (extra fields ignored) but handler receives trusted userId
    expect(res.status).toBe(200);
    // Verify the handler was called with the trusted userId, not the spoofed one
    expect(h.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER }),
    );
  });
});

// ---- Success response tests ------------------------------------------------

describe('POST /v1/assistant/execute — success', () => {
  it('returns rendered text and structured data', async () => {
    h.getSummary.mockResolvedValue({
      income: D(10_000_000),
      expenses: D(4_000_000),
      netSavings: D(6_000_000),
      transactionCount: 15,
      month: '2026-07',
    });
    h.getCategoryBreakdown.mockResolvedValue({
      period: 'custom',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-08-01'),
      type: 'EXPENSE',
      total: D(4_000_000),
      categories: [
        {
          categoryId: 'cat-1',
          name: 'Makanan',
          amount: D(2_000_000),
          transactionCount: 15,
          percentage: D(50),
        },
      ],
    });

    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({
        intent: 'analytics.monthly-spending-summary',
        arguments: { month: '2026-07' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('success');
    expect(res.body.data.renderedText).toBeDefined();
    expect(typeof res.body.data.renderedText).toBe('string');
    expect(res.body.data.data).toBeDefined();
    expect(res.body.data.data.month).toBe('2026-07');
  });

  it('includes correlation ID in response', async () => {
    h.getSummary.mockResolvedValue({
      income: D(1_000),
      expenses: D(500),
      netSavings: D(500),
      transactionCount: 2,
      month: '2026-07',
    });
    h.getCategoryBreakdown.mockResolvedValue({
      period: 'custom',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-08-01'),
      type: 'EXPENSE',
      total: D(500),
      categories: [],
    });

    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({
        intent: 'analytics.monthly-spending-summary',
        arguments: { month: '2026-07' },
      });

    expect(res.body.data.correlationId).toBeDefined();
    expect(typeof res.body.data.correlationId).toBe('string');
  });
});

// ---- Error response tests --------------------------------------------------

describe('POST /v1/assistant/execute — error responses', () => {
  it('service failures return 500 with safe error envelope', async () => {
    h.getSummary.mockRejectedValue(new Error('Database connection failed'));

    const app = buildApp();
    const res = await request(app)
      .post('/v1/assistant/execute')
      .send({
        intent: 'analytics.monthly-spending-summary',
        arguments: { month: '2026-07' },
      });

    expect(res.status).toBe(500);
    // Should return the standard error envelope
    expect(res.body.error).toBeDefined();
    // Stack traces must never leak
    expect(res.body.error.stack).toBeUndefined();
    // Correlation ID must always be present (via requestId in the error handler)
    expect(res.body.error.requestId).toBeDefined();
  });
});
