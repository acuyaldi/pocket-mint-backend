// ============================================================
// Notification service contracts (Phase 5)
// ------------------------------------------------------------
// The notification center reads/mutates the RecurringReminderEvent rows
// persisted by the reminder engine (Phase 4) — no separate Notification
// table. Mirrors recurringTransaction.types.ts's narrow-Prisma-slice DI
// pattern.
// ============================================================

import type { PrismaClient, Prisma } from '../generated/prisma/client';

export type NotificationPrismaClient = Pick<PrismaClient, 'recurringReminderEvent'>;

export const NOTIFICATION_INCLUDE = {
  template: { select: { id: true, name: true } },
} as const;

export type NotificationWithTemplate = Prisma.RecurringReminderEventGetPayload<{
  include: typeof NOTIFICATION_INCLUDE;
}>;

export interface MarkNotificationReadInput {
  userId: string;
  id: string;
}

export interface MarkAllNotificationsReadResult {
  count: number;
}
