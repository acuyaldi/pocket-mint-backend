// ============================================================
// Analytics v2 — trends service
// ------------------------------------------------------------
// A continuous, zero-filled income/expense/net-cash-flow series for the
// resolved period, bucketed daily (<=62 days) or monthly (longer), per
// `resolveTrendGranularity` (domain/analyticsPeriod.ts). Buckets are
// generated up front by the pure domain helper so gaps are structurally
// impossible; this service fetches the period's INCOME/EXPENSE rows ONCE
// (ordered by date) and folds them into the pre-built buckets in a single
// pass — no per-bucket query, no raw SQL date_trunc.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { generateTrendBuckets, resolveTrendGranularity } from '../domain/analyticsPeriod';
import { reportingConfig } from '../config';
import { resolvePeriodOrThrow } from './analytics-period';
import type { AnalyticsPeriodQueryInput, AnalyticsPrismaClient, AnalyticsTrendsResult } from './analytics-query.types';

const ZERO = new Prisma.Decimal(0);

export function createAnalyticsTrendsService(db: AnalyticsPrismaClient) {
  async function getTrends(input: AnalyticsPeriodQueryInput): Promise<AnalyticsTrendsResult> {
    const resolved = resolvePeriodOrThrow(input);
    const granularity = resolveTrendGranularity(resolved.range);
    const buckets = generateTrendBuckets(resolved.range, granularity, reportingConfig.timezone);

    const result = buckets.map((b) => ({ start: b.start, end: b.end, income: ZERO, expense: ZERO, netCashFlow: ZERO }));
    if (result.length === 0) {
      return { period: resolved.period, periodStart: resolved.range.startInclusive, periodEnd: resolved.range.endExclusive, granularity, buckets: result };
    }

    const rows = await db.transaction.findMany({
      where: {
        userId: input.userId,
        type: { in: ['INCOME', 'EXPENSE'] },
        date: { gte: resolved.range.startInclusive, lt: resolved.range.endExclusive },
      },
      select: { date: true, type: true, amount: true },
      orderBy: { date: 'asc' },
    });

    let bucketIndex = 0;
    for (const row of rows) {
      const t = row.date.getTime();
      while (bucketIndex < result.length - 1 && t >= result[bucketIndex].end.getTime()) bucketIndex++;
      const bucket = result[bucketIndex];
      if (t < bucket.start.getTime() || t >= bucket.end.getTime()) continue; // defensive: should be unreachable given contiguous buckets
      if (row.type === 'INCOME') bucket.income = bucket.income.plus(row.amount);
      else bucket.expense = bucket.expense.plus(row.amount);
    }
    for (const bucket of result) bucket.netCashFlow = bucket.income.minus(bucket.expense);

    return { period: resolved.period, periodStart: resolved.range.startInclusive, periodEnd: resolved.range.endExclusive, granularity, buckets: result };
  }

  return { getTrends };
}

/** Production instance bound to the shared Prisma singleton. */
export const analyticsTrendsService = createAnalyticsTrendsService(prisma);
