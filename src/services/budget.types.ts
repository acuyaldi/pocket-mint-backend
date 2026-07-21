// ============================================================
// Budget command service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the Budget *mutation* service (Phase B1,
// budgeting-api-contract.md). The controller (Phase B2) maps HTTP requests
// into these; the service returns the raw persisted Budget (Decimal `amount`
// intact) — DTO/usage composition stays with the controller and
// budget-query.service.ts.
//
// Scope: create / updateAmount / archive / restore only. There is no
// categoryId on the update input — category reassignment is not a supported
// command (PD-009 Decision L); rejecting a `categoryId` in the update request
// body is a request-shape concern that belongs to the future controller, not
// this service.
// ============================================================

import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { BudgetRecord } from './budget-query.types';

export type { BudgetRecord };

/**
 * The slice of the Prisma client the command service needs: `budget`
 * (ownership-scoped reads and writes) and `category` (ownership + type
 * eligibility check). No `$transaction`: every mutation here is a single
 * write, matching wallet.service.ts / savingGoal.service.ts.
 */
export type BudgetCommandPrismaClient = Pick<PrismaClient, 'budget' | 'category'>;

/** Monetary value accepted from the controller; normalized to Decimal inside the service. */
export type DecimalInput = Prisma.Decimal | number | string;

/** `userId` is the authenticated caller, never taken from client input. */
export interface CreateBudgetInput {
  userId: string;
  categoryId: string;
  amount: DecimalInput;
}

export interface UpdateBudgetAmountInput {
  userId: string;
  budgetId: string;
  amount: DecimalInput;
}

export interface ArchiveBudgetInput {
  userId: string;
  budgetId: string;
}

export interface RestoreBudgetInput {
  userId: string;
  budgetId: string;
}
