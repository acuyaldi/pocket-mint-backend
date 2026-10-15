// ============================================================
// Assistant Core — deterministic risk / policy evaluator
// ------------------------------------------------------------
// Implements §12 of the ADR. The evaluator is deterministic —
// it uses only static tool metadata. User preferences (which may
// strengthen but never weaken mandatory policy) are deferred.
//
// Risk tier minimums are enforced at registration time (§registry);
// the evaluator maps the tool's declared confirmation policy to the
// execution action. Risk tier alone does NOT drive the action:
//   LOW           → follows confirmationPolicy
//   MEDIUM / HIGH → follows confirmationPolicy (both require
//                    at least EXPLICIT at registration)
//   VERY_HIGH     → always UNAVAILABLE in Assistant v1
//   disabled      → always UNAVAILABLE
//
// STEP_UP is available as a confirmation policy for tools that
// need stronger confirmation; it is NOT implied by HIGH risk.
// ============================================================

import type { ToolContract, PolicyResult } from './types';

export function evaluatePolicy(tool: ToolContract): PolicyResult {
  if (!tool.enabled) {
    return { action: 'UNAVAILABLE', reason: 'Tool is disabled' };
  }

  if (tool.riskLevel === 'VERY_HIGH') {
    return {
      action: 'UNAVAILABLE',
      reason: 'Very High risk tools are unavailable in Assistant v1',
    };
  }

  switch (tool.confirmationPolicy) {
    case 'NONE':
      return { action: 'EXECUTE_IMMEDIATELY' };
    case 'EXPLICIT':
      return { action: 'DRAFT_AND_CONFIRM' };
    case 'STEP_UP':
      return { action: 'STEP_UP_REQUIRED' };
    case 'DISABLED':
      return { action: 'UNAVAILABLE', reason: 'Tool confirmation policy is DISABLED' };
  }
}
