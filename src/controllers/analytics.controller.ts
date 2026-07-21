// ============================================================
// Analytics v2 controller
// ------------------------------------------------------------
// Thin HTTP mapping over the Analytics v2 services: allowlists/parses query
// params via the shared scalar helpers, resolves period errors through
// forwardError (typed `AnalyticsError`/`TransactionError` → safe envelope;
// anything else → central handler), and serializes Decimal → number only at
// this boundary (existing convention — services return Decimal).
// ============================================================

import { Request, Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { scalarInt, scalarString } from '../http/queryParsers';
import { resolvePeriodOrThrow } from '../services/analytics-period';
import { analyticsOverviewService } from '../services/analytics-overview.service';
import { analyticsTrendsService } from '../services/analytics-trends.service';
import { analyticsCategoriesService } from '../services/analytics-categories.service';
import { analyticsWalletsService } from '../services/analytics-wallets.service';
import { budgetQueryService } from '../services/budget-query.service';
import { transactionQueryService } from '../services/transaction-query.service';
import { serializeTransaction } from './transaction.controller';
import type { TransactionType } from '../models/transaction.model';
import type {
  AnalyticsCategoryBreakdownResult,
  AnalyticsOverviewResult,
  AnalyticsTrendsResult,
  AnalyticsWalletBreakdownResult,
  PercentageChange,
} from '../services/analytics-query.types';
import type { BudgetWithUsage } from '../services/budget-query.types';

const DEFAULT_TRANSACTIONS_LIMIT = 20;
const MAX_TRANSACTIONS_LIMIT = 200;

/** Pull `period`/`startDate`/`endDate` from the query string as safe scalars only. */
function mapPeriodQuery(query: ParsedQs): { period?: string; startDate?: string; endDate?: string } {
  return { period: scalarString(query.period), startDate: scalarString(query.startDate), endDate: scalarString(query.endDate) };
}

function num(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function serializePercentageChange(pc: PercentageChange) {
  return pc.value === null ? { value: null, reason: pc.reason } : { value: num(pc.value), reason: null };
}

function serializeOverview(result: AnalyticsOverviewResult) {
  return {
    period: result.period,
    periodStart: result.periodStart.toISOString(),
    periodEnd: result.periodEnd.toISOString(),
    income: num(result.income),
    expense: num(result.expense),
    netCashFlow: num(result.netCashFlow),
    transactionCount: result.transactionCount,
    previousPeriod: {
      periodStart: result.previous.periodStart.toISOString(),
      periodEnd: result.previous.periodEnd.toISOString(),
      income: num(result.previous.income),
      expense: num(result.previous.expense),
      netCashFlow: num(result.previous.netCashFlow),
    },
    change: {
      income: num(result.change.income),
      expense: num(result.change.expense),
      netCashFlow: num(result.change.netCashFlow),
    },
    percentageChange: {
      income: serializePercentageChange(result.percentageChange.income),
      expense: serializePercentageChange(result.percentageChange.expense),
      netCashFlow: serializePercentageChange(result.percentageChange.netCashFlow),
    },
  };
}

function serializeTrends(result: AnalyticsTrendsResult) {
  return {
    period: result.period,
    periodStart: result.periodStart.toISOString(),
    periodEnd: result.periodEnd.toISOString(),
    granularity: result.granularity,
    buckets: result.buckets.map((b) => ({
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      income: num(b.income),
      expense: num(b.expense),
      netCashFlow: num(b.netCashFlow),
    })),
  };
}

function serializeCategories(result: AnalyticsCategoryBreakdownResult) {
  return {
    period: result.period,
    periodStart: result.periodStart.toISOString(),
    periodEnd: result.periodEnd.toISOString(),
    type: result.type,
    total: num(result.total),
    categories: result.categories.map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      amount: num(c.amount),
      transactionCount: c.transactionCount,
      percentage: c.percentage === null ? null : num(c.percentage),
    })),
  };
}

function serializeWallets(result: AnalyticsWalletBreakdownResult) {
  return {
    period: result.period,
    periodStart: result.periodStart.toISOString(),
    periodEnd: result.periodEnd.toISOString(),
    wallets: result.wallets.map((w) => ({
      id: w.id,
      name: w.name,
      income: num(w.income),
      expense: num(w.expense),
      netCashFlow: num(w.netCashFlow),
      transactionCount: w.transactionCount,
    })),
  };
}

/** Mirrors budget.controller.ts's `toBudgetDto`, renamed for the analytics response shape (limit/spent instead of amount/spent). Must numerically agree with `GET /budgets` — see test/analyticsBudgetPerformance.test.ts. */
function serializeBudgetPerformance(usage: BudgetWithUsage) {
  const { budget } = usage;
  return {
    id: budget.id,
    category: { id: budget.category.id, name: budget.category.name, type: budget.category.type },
    limit: num(budget.amount),
    spent: num(usage.spent),
    remaining: num(usage.remaining),
    percentUsed: usage.percentUsed === null ? null : num(usage.percentUsed),
    status: usage.status,
    isArchived: budget.isArchived,
    periodStart: usage.periodStart.toISOString(),
    periodEnd: usage.periodEnd.toISOString(),
  };
}

export class AnalyticsController {
  // GET /api/v1/analytics/overview
  static async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const result = await analyticsOverviewService.getOverview({ userId, ...mapPeriodQuery(req.query) });
      sendSuccess(res, serializeOverview(result), 'Retrieved analytics overview');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/analytics/trends
  static async trends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const result = await analyticsTrendsService.getTrends({ userId, ...mapPeriodQuery(req.query) });
      sendSuccess(res, serializeTrends(result), 'Retrieved analytics trends');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/analytics/categories?type=EXPENSE|INCOME
  static async categories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const type = (scalarString(req.query.type) ?? 'EXPENSE') as 'EXPENSE' | 'INCOME';
      const result = await analyticsCategoriesService.getCategoryBreakdown({ userId, type, ...mapPeriodQuery(req.query) });
      sendSuccess(res, serializeCategories(result), 'Retrieved category breakdown');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/analytics/wallets
  static async wallets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const result = await analyticsWalletsService.getWalletBreakdown({ userId, ...mapPeriodQuery(req.query) });
      sendSuccess(res, serializeWallets(result), 'Retrieved wallet breakdown');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/analytics/budget-performance
  // No `period` param — Budget is a recurring monthly construct (PD-009); this
  // always reflects the current reporting month, matching `GET /budgets`
  // exactly (verbatim reuse of budget-query.service.ts + domain/budget.ts).
  static async budgetPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const usages = await budgetQueryService.listActiveBudgetUsage({ userId, status: 'active' });
      sendSuccess(res, usages.map(serializeBudgetPerformance), 'Retrieved budget performance');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/analytics/transactions?period=&type=&categoryId=&walletId=&page=&limit=
  // Drill-down: reuses the canonical transaction shape (transaction.controller.ts's
  // `serializeTransaction`) — no second transaction DTO.
  static async transactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const resolved = resolvePeriodOrThrow(mapPeriodQuery(req.query));

      const type = scalarString(req.query.type) as TransactionType | undefined;
      const categoryId = scalarString(req.query.categoryId);
      const walletId = scalarString(req.query.walletId);
      const page = Math.max(scalarInt(req.query.page) ?? 1, 1);
      const limit = Math.min(Math.max(scalarInt(req.query.limit) ?? DEFAULT_TRANSACTIONS_LIMIT, 1), MAX_TRANSACTIONS_LIMIT);
      const skip = (page - 1) * limit;

      const filters = {
        userId,
        type,
        categoryId,
        walletId,
        startDate: resolved.range.startInclusive,
        endDate: resolved.range.endExclusive,
      };

      const [transactions, total] = await Promise.all([
        transactionQueryService.listTransactions({ ...filters, limit, skip }),
        transactionQueryService.countTransactions(filters),
      ]);

      sendSuccess(
        res,
        {
          period: resolved.period,
          periodStart: resolved.range.startInclusive.toISOString(),
          periodEnd: resolved.range.endExclusive.toISOString(),
          transactions: transactions.map(serializeTransaction),
          pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
        },
        'Retrieved transactions'
      );
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
