// ============================================================
// Notification service contracts (Phase 5; installments added in Phase 7)
// ------------------------------------------------------------
// The notification center reads/mutates the RecurringReminderEvent rows
// persisted by the reminder engine (Phase 4) — no separate Notification
// table. Mirrors recurringTransaction.types.ts's narrow-Prisma-slice DI
// pattern.
// ============================================================

import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { TransactionWithRelations } from './transaction.types';

export type NotificationPrismaClient = Pick<
  PrismaClient,
  'recurringReminderEvent' | 'wallet' | 'category' | 'transaction' | '$transaction'
>;

export const NOTIFICATION_INCLUDE = {
  template: {
    select: { id: true, name: true, type: true, amountMode: true, amount: true, walletId: true, categoryId: true },
  },
  installment: {
    select: {
      id: true,
      description: true,
      monthlyAmount: true,
      nextDueDate: true,
      status: true,
      wallet: { select: { name: true } },
    },
  },
} as const;

export type NotificationWithTemplate = Prisma.RecurringReminderEventGetPayload<{
  include: typeof NOTIFICATION_INCLUDE;
}>;

export interface ListNotificationsInput {
  userId: string;
  page?: number;
  limit?: number;
  filter?: 'all' | 'unread';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ListNotificationsResult {
  items: NotificationWithTemplate[];
  pagination: PaginationMeta;
}

export interface MarkNotificationReadInput {
  userId: string;
  id: string;
}

export interface MarkAllNotificationsReadResult {
  count: number;
}

/** Amount accepted from the controller; required only for FLEXIBLE templates. */
export type DecimalInput = Prisma.Decimal | number | string;

export interface ConfirmReminderInput {
  userId: string;
  id: string;
  amount?: DecimalInput;
}

export interface ConfirmReminderResult {
  notification: NotificationWithTemplate;
  transaction: TransactionWithRelations;
}
