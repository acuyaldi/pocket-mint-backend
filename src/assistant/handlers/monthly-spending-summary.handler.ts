// ============================================================
// Assistant Core — monthly-spending-summary tool handler
// ------------------------------------------------------------
// Wires the registered tool to existing Pocket Mint services.
// Internally calls transactionQueryService.getSummary (P&L)
// and analyticsCategoriesService.getCategoryBreakdown (top
// expense categories). These are two existing read-only
// services that together produce one coherent monthly
// spending-summary capability — this is NOT a multi-tool
// workflow.
//
// Money: domain services return Prisma.Decimal. This handler
// serializes via Number(decimal.toString()), matching the
// convention used by AnalyticsController and the transaction
// summary endpoint. No financial arithmetic is performed with
// JS numbers inside Assistant Core.
// ============================================================

import { Prisma } from '../../generated/prisma/client';
import { reportingConfig } from '../../config';
import {
  getReportingMonthRange,
  formatReportingDate,
  type CalendarMonth,
} from '../../domain/reportingTime';
import { transactionQueryService } from '../../services/transaction-query.service';
import { analyticsCategoriesService } from '../../services/analytics-categories.service';
import type { ExecutionContext } from '../types';

// ---- Input / output shapes -------------------------------------------------

export interface MonthlySpendingSummaryInput {
  month: string; // YYYY-MM
}

export interface MonthlyCategoryBreakdown {
  name: string;
  amount: number;
  percentage: number | null;
}

export interface MonthlySpendingSummaryOutput {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionCount: number;
  topCategories: MonthlyCategoryBreakdown[];
}

// ---- Decimal serialization -------------------------------------------------

const ZERO = new Prisma.Decimal(0);

/** Convert a Prisma.Decimal to a JS number safely. */
function num(value: Prisma.Decimal): number {
  return Number(value.toString());
}

// ---- Month parsing ---------------------------------------------------------

function parseMonth(month: string): CalendarMonth {
  const [y, m] = month.split('-').map(Number);
  return { year: y, month: m };
}

// ---- Handler ----------------------------------------------------------------

export async function handleMonthlySpendingSummary(
  input: MonthlySpendingSummaryInput,
  ctx: ExecutionContext,
): Promise<MonthlySpendingSummaryOutput> {
  const calMonth = parseMonth(input.month);
  const range = getReportingMonthRange(calMonth, reportingConfig.timezone);

  // P&L from the existing monthly summary service.
  const summary = await transactionQueryService.getSummary({
    userId: ctx.userId,
    month: calMonth.month,
    year: calMonth.year,
  });

  // Top expense categories for the same period.
  // Must pass period: 'custom' so the resolver uses the provided date range
  // rather than defaulting to the current month.
  const categories = await analyticsCategoriesService.getCategoryBreakdown({
    userId: ctx.userId,
    type: 'EXPENSE',
    period: 'custom',
    startDate: formatReportingDate(range.startInclusive, reportingConfig.timezone),
    endDate: formatReportingDate(range.endExclusive, reportingConfig.timezone),
  });

  const topCategories: MonthlyCategoryBreakdown[] = categories.categories
    .slice(0, 10) // top 10, never unbounded
    .map((c) => ({
      name: c.name,
      amount: num(c.amount),
      percentage: c.percentage === null ? null : num(c.percentage),
    }));

  return {
    month: summary.month,
    totalIncome: num(summary.income),
    totalExpense: num(summary.expenses),
    netSavings: num(summary.netSavings),
    transactionCount: summary.transactionCount,
    topCategories,
  };
}
