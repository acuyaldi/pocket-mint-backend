// ============================================================
// Recurring reminder engine service contracts (Phase 4)
// ------------------------------------------------------------
// Mirrors recurringTransaction.types.ts's narrow-Prisma-slice DI pattern.
// ============================================================

import type { PrismaClient } from '../generated/prisma/client';

export type RecurringReminderEnginePrismaClient = Pick<
  PrismaClient,
  'recurringTransactionTemplate' | 'recurringReminderEvent'
>;

export interface RecurringReminderEvent {
  id: string;
  templateId: string;
  userId: string;
  occurrenceDate: Date;
  offsetDays: number;
  reminderDate: Date;
  createdAt: Date;
}
