// ============================================================
// Assistant Core — registered tool definitions
// ------------------------------------------------------------
// Each export is a ToolContract that can be registered with the
// ToolRegistry. These are provider-neutral definitions — the
// provider adapter generates vendor-specific schemas from them.
//
// Phase 21.1 defines only the contract shapes; execution handlers
// are wired in Phase 21.2.
// ============================================================

import type { ToolContract } from './types';
import { AssistantError } from './errors';

// ---- Validation helpers ----------------------------------------------------

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function validateMonthInput(input: unknown): { month: string } {
  if (typeof input !== 'object' || input === null) {
    throw AssistantError.invalidInput(
      'analytics.monthly-spending-summary',
      'Input must be a non-null object',
    );
  }
  const obj = input as Record<string, unknown>;
  if (typeof obj.month !== 'string' || !MONTH_RE.test(obj.month)) {
    throw AssistantError.invalidInput(
      'analytics.monthly-spending-summary',
      'month must be a string in YYYY-MM format (e.g. "2026-01")',
    );
  }
  return { month: obj.month };
}

// ---- Output shape ----------------------------------------------------------

/**
 * One category row in the monthly spending summary. Mirrors the
 * existing AnalyticsCategoryBreakdownItem shape in terminology but
 * uses `number` (not Decimal) at the tool boundary — the execution
 * layer handles conversion.
 */
interface MonthlyCategoryBreakdown {
  name: string;
  amount: number;
  percentage: number | null;
}

/**
 * Structured result for `analytics.monthly-spending-summary`.
 * Combines the monthly summary (TransactionSummaryResult) and the
 * top expense-category breakdown into one read-only response.
 * All money amounts are numbers — the execution engine converts
 * from Decimal at the tool boundary.
 */
interface MonthlySpendingSummaryOutput {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionCount: number;
  topCategories: MonthlyCategoryBreakdown[];
}

function validateMonthlySpendingOutput(
  output: unknown,
): MonthlySpendingSummaryOutput {
  // TypeScript types alone don't validate model-produced input at runtime
  // (§23 of the ADR). This is a minimal structural check; it is compatible
  // with adopting JSON Schema or Zod later without changing the contract.
  if (typeof output !== 'object' || output === null) {
    throw AssistantError.invalidOutput(
      'analytics.monthly-spending-summary',
      'Output must be a non-null object',
    );
  }
  const o = output as Record<string, unknown>;

  if (typeof o.month !== 'string')
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'month must be a string');
  if (typeof o.totalIncome !== 'number')
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalIncome must be a number');
  if (!Number.isFinite(o.totalIncome))
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalIncome must be a finite number');
  if (typeof o.totalExpense !== 'number')
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalExpense must be a number');
  if (!Number.isFinite(o.totalExpense))
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalExpense must be a finite number');
  if (typeof o.netSavings !== 'number')
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'netSavings must be a number');
  if (!Number.isFinite(o.netSavings))
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'netSavings must be a finite number');
  if (typeof o.transactionCount !== 'number')
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'transactionCount must be a number');
  if (!Number.isInteger(o.transactionCount) || o.transactionCount < 0)
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'transactionCount must be a non-negative integer');
  if (!Array.isArray(o.topCategories))
    throw AssistantError.invalidOutput('analytics.monthly-spending-summary', 'topCategories must be an array');

  return o as unknown as MonthlySpendingSummaryOutput;
}

// ---- Tool contract ---------------------------------------------------------

/**
 * First read-only vertical-slice tool (§7 of the Phase 21.1 brief):
 *
 * Returns a structured summary of the authenticated user's spending
 * for a requested Jakarta calendar month.
 *
 * - Risk: LOW (read-only analytics)
 * - Confirmation: NONE
 * - Idempotency: NOT_REQUIRED (read is naturally idempotent)
 * - Timeout: 10 seconds
 */
export const monthlySpendingSummary: ToolContract<
  { month: string },
  MonthlySpendingSummaryOutput
> = {
  id: 'analytics.monthly-spending-summary',
  description:
    "Return a structured summary of the user's spending for a Jakarta calendar month (YYYY-MM). Includes total income, total expense, net savings, transaction count, and the top expense categories with percentages.",
  capability: 'analytics.read',
  riskLevel: 'LOW',
  confirmationPolicy: 'NONE',
  idempotencyPolicy: 'NOT_REQUIRED',
  timeoutMs: 10_000,
  enabled: true,
  validateInput: validateMonthInput,
  validateOutput: validateMonthlySpendingOutput,
};
