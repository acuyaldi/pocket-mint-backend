// ============================================================
// Recurring transaction template service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the recurring transaction template service.
// The controller maps HTTP requests into these; the service returns typed
// domain records. Mirrors transaction.types.ts's shape and narrow-Prisma-slice
// DI pattern.
// ============================================================

import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { RecurrenceFrequency, RecurringTransactionType } from '../models/recurringTransaction.model';

export type RecurringTransactionPrismaClient = Pick<
  PrismaClient,
  'recurringTransactionTemplate' | 'wallet' | 'category'
>;

/** Amount accepted from the controller; normalized to Decimal inside the service. */
export type DecimalInput = Prisma.Decimal | number | string;

export interface CreateRecurringTransactionInput {
  userId: string;
  name: string;
  walletId: string;
  categoryId?: string;
  type: RecurringTransactionType;
  amount: DecimalInput;
  description?: string;
  frequency: RecurrenceFrequency;
  /** ISO day (`YYYY-MM-DD`) or offset timestamp; normalized in the service. */
  startDate: string;
  endDate?: string;
}

/** Update fields; `undefined` means "omitted" (keep the persisted value). */
export interface UpdateRecurringTransactionFields {
  name?: string;
  walletId?: string;
  categoryId?: string;
  type?: RecurringTransactionType;
  amount?: DecimalInput;
  description?: string;
  frequency?: RecurrenceFrequency;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpdateRecurringTransactionInput extends UpdateRecurringTransactionFields {
  userId: string;
  id: string;
}

export interface DeleteRecurringTransactionInput {
  userId: string;
  id: string;
}

export const RECURRING_TRANSACTION_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, type: true } },
} as const;

export type RecurringTransactionWithRelations = Prisma.RecurringTransactionTemplateGetPayload<{
  include: typeof RECURRING_TRANSACTION_INCLUDE;
}>;

export interface DeleteRecurringTransactionResult {
  id: string;
}
