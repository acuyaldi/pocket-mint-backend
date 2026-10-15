// ============================================================
// Analytics v2 — period resolution boundary
// ------------------------------------------------------------
// The ONE place the pure `resolveAnalyticsPeriod` (domain/analyticsPeriod.ts)
// is called from the service layer. Every analytics service and the
// drill-down transactions controller import this instead of calling the
// domain function directly, so a malformed period always produces the same
// typed 400 `AnalyticsError` (never an untyped 500) — a single translation
// point instead of a try/catch repeated in five call sites.
// ============================================================

import { reportingConfig } from '../config';
import { resolveAnalyticsPeriod, type AnalyticsPeriodInput, type ResolvedAnalyticsPeriod } from '../domain/analyticsPeriod';
import { AnalyticsError } from './analytics.errors';

export function resolvePeriodOrThrow(input: AnalyticsPeriodInput, now?: Date): ResolvedAnalyticsPeriod {
  try {
    return resolveAnalyticsPeriod(input, reportingConfig.timezone, now);
  } catch (err) {
    throw new AnalyticsError(err instanceof Error ? err.message : 'Invalid period', 400, 'BAD_REQUEST');
  }
}
