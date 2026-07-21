// ============================================================
// Analytics v2 — overview service
// ------------------------------------------------------------
// Current-period totals (income/expense/net cash flow/transaction count)
// plus a comparison against the immediately preceding period of equal
// duration. TRANSFER rows are excluded (`type IN (INCOME, EXPENSE)`), same
// rule as transaction-query.service.ts's monthly summary. A zero previous-
// period baseline never produces `Infinity`/`NaN`: `percentageChange` is an
// explicit `{ value: null, reason: 'ZERO_BASELINE' }` instead.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { resolvePeriodOrThrow } from './analytics-period';
import type { AnalyticsOverviewResult, AnalyticsPeriodQueryInput, AnalyticsPrismaClient, PercentageChange } from './analytics-query.types';
import type { ReportingRange } from '../domain/reportingTime';

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

interface TypeSums {
  type: string;
  _sum: { amount: Prisma.Decimal | null };
  _count: { _all: number };
}

function sumFor(sums: TypeSums[], type: string): Prisma.Decimal {
  return sums.find((s) => s.type === type)?._sum.amount ?? ZERO;
}

function countFor(sums: TypeSums[], type: string): number {
  return sums.find((s) => s.type === type)?._count._all ?? 0;
}

function computeChange(current: Prisma.Decimal, previous: Prisma.Decimal): { absolute: Prisma.Decimal; percentage: PercentageChange } {
  const absolute = current.minus(previous);
  if (previous.equals(ZERO)) {
    return { absolute, percentage: { value: null, reason: 'ZERO_BASELINE' } };
  }
  return { absolute, percentage: { value: absolute.dividedBy(previous).times(HUNDRED) } };
}

export function createAnalyticsOverviewService(db: AnalyticsPrismaClient) {
  async function sumsFor(userId: string, range: ReportingRange) {
    return db.transaction.groupBy({
      by: ['type'],
      where: { userId, type: { in: ['INCOME', 'EXPENSE'] }, date: { gte: range.startInclusive, lt: range.endExclusive } },
      _sum: { amount: true },
      _count: { _all: true },
    });
  }

  async function getOverview(input: AnalyticsPeriodQueryInput): Promise<AnalyticsOverviewResult> {
    const resolved = resolvePeriodOrThrow(input);

    const [currentSums, previousSums] = await Promise.all([
      sumsFor(input.userId, resolved.range),
      sumsFor(input.userId, resolved.previousRange),
    ]);

    const income = sumFor(currentSums, 'INCOME');
    const expense = sumFor(currentSums, 'EXPENSE');
    const netCashFlow = income.minus(expense);
    const transactionCount = countFor(currentSums, 'INCOME') + countFor(currentSums, 'EXPENSE');

    const prevIncome = sumFor(previousSums, 'INCOME');
    const prevExpense = sumFor(previousSums, 'EXPENSE');
    const prevNet = prevIncome.minus(prevExpense);

    const incomeChange = computeChange(income, prevIncome);
    const expenseChange = computeChange(expense, prevExpense);
    const netChange = computeChange(netCashFlow, prevNet);

    return {
      period: resolved.period,
      periodStart: resolved.range.startInclusive,
      periodEnd: resolved.range.endExclusive,
      income,
      expense,
      netCashFlow,
      transactionCount,
      previous: {
        periodStart: resolved.previousRange.startInclusive,
        periodEnd: resolved.previousRange.endExclusive,
        income: prevIncome,
        expense: prevExpense,
        netCashFlow: prevNet,
      },
      change: { income: incomeChange.absolute, expense: expenseChange.absolute, netCashFlow: netChange.absolute },
      percentageChange: { income: incomeChange.percentage, expense: expenseChange.percentage, netCashFlow: netChange.percentage },
    };
  }

  return { getOverview };
}

/** Production instance bound to the shared Prisma singleton. */
export const analyticsOverviewService = createAnalyticsOverviewService(prisma);
