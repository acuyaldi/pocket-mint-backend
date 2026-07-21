// ============================================================
// Budget query service (Phase A domain foundation — PD-009, Approved)
// ------------------------------------------------------------
// Read-only calculation/query service for Budget usage. Owns ownership-scoped
// reads and the category-scoped EXPENSE aggregation; delegates the actual
// remaining/percentUsed/status derivation to the pure `computeBudgetUsage`
// (src/domain/budget.ts) so controllers and any future frontend-facing
// response can never reimplement the formulas independently
// (budgeting-calculation-spec.md). It has no Express dependency, writes no
// HTTP responses, performs NO mutations, and opens NO write transactions.
//
// Reporting boundaries come exclusively from `getReportingMonthRange`
// (src/domain/reportingTime.ts), never from server-local Date math — the
// same rule transaction-query.service.ts follows.
//
// Listing multiple budgets uses one grouped `transaction.groupBy` call by
// category (mirrors transaction-query.service.ts's `getSummary`), never one
// aggregation query per budget — avoiding N+1 transaction queries regardless
// of how many active budgets a user has.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { formatReportingDate, getReportingMonthRange, type ReportingRange } from '../domain/reportingTime';
import { computeBudgetUsage } from '../domain/budget';
import { BudgetError } from './budget.errors';
import type {
  BudgetQueryPrismaClient,
  BudgetWithUsage,
  GetBudgetUsageInput,
  ListActiveBudgetUsageInput,
} from './budget-query.types';

/** The current calendar month in the reporting timezone (never server-local). */
function currentReportingMonth(): { month: number; year: number } {
  const [year, month] = formatReportingDate(new Date(), reportingConfig.timezone).split('-').map(Number);
  return { year, month };
}

/**
 * Resolve the half-open reporting month range for the requested (or current)
 * month/year, matching transaction-query.service.ts's lenient clamp: an
 * omitted value falls back to the current reporting month; an out-of-range
 * month is clamped to 1-12.
 */
function resolveBudgetPeriod(month?: number, year?: number): ReportingRange {
  const current = currentReportingMonth();
  const m = month === undefined ? current.month : Math.min(Math.max(month || current.month, 1), 12);
  const y = year === undefined ? current.year : year || current.year;
  return getReportingMonthRange({ month: m, year: y }, reportingConfig.timezone);
}

export function createBudgetQueryService(db: BudgetQueryPrismaClient) {
  /**
   * Usage for one Budget the caller owns, for the given (or current) reporting
   * month. Throws a typed 404 if the Budget does not exist or belongs to
   * another user — ownership and existence are indistinguishable to the
   * caller, matching the codebase's existing `findOwned` pattern.
   */
  async function getBudgetUsage(input: GetBudgetUsageInput): Promise<BudgetWithUsage> {
    const budget = await db.budget.findFirst({
      where: { id: input.budgetId, userId: input.userId },
      include: { category: { select: { id: true, name: true, type: true } } },
    });
    if (!budget) {
      throw new BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND');
    }

    const range = resolveBudgetPeriod(input.month, input.year);
    const aggregate = await db.transaction.aggregate({
      where: {
        userId: input.userId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: { gte: range.startInclusive, lt: range.endExclusive },
      },
      _sum: { amount: true },
    });
    const spent = aggregate._sum.amount ?? new Prisma.Decimal(0);

    return {
      budget,
      periodStart: range.startInclusive,
      periodEnd: range.endExclusive,
      ...computeBudgetUsage(budget.amount, spent, budget.isArchived),
    };
  }

  /**
   * Usage for every Budget the caller owns matching `status` (default
   * `'active'`), for the given (or current) reporting month. Resolves all
   * budgets' spend with a single grouped `transaction.groupBy` by
   * `categoryId`, never one aggregation per budget. Returns an empty array
   * when the user has no matching budgets — no query against `transaction` is
   * issued in that case.
   */
  async function listActiveBudgetUsage(input: ListActiveBudgetUsageInput): Promise<BudgetWithUsage[]> {
    const isArchived = input.status === 'archived';
    const budgets = await db.budget.findMany({
      where: { userId: input.userId, isArchived },
      orderBy: { createdAt: 'asc' },
      include: { category: { select: { id: true, name: true, type: true } } },
    });
    if (budgets.length === 0) return [];

    const range = resolveBudgetPeriod(input.month, input.year);
    const categoryIds = budgets.map((b) => b.categoryId);

    const sums = await db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId: input.userId,
        type: 'EXPENSE',
        categoryId: { in: categoryIds },
        date: { gte: range.startInclusive, lt: range.endExclusive },
      },
      _sum: { amount: true },
    });
    const spentByCategory = new Map(sums.map((s) => [s.categoryId as string, s._sum.amount ?? new Prisma.Decimal(0)]));

    return budgets.map((budget) => ({
      budget,
      periodStart: range.startInclusive,
      periodEnd: range.endExclusive,
      ...computeBudgetUsage(budget.amount, spentByCategory.get(budget.categoryId) ?? new Prisma.Decimal(0), budget.isArchived),
    }));
  }

  return { getBudgetUsage, listActiveBudgetUsage };
}

/** Production instance bound to the shared Prisma singleton. */
export const budgetQueryService = createBudgetQueryService(prisma);
