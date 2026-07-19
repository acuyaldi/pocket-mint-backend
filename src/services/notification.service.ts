// ============================================================
// Notification service (Phase 5)
// ------------------------------------------------------------
// Read/mutate surface over the RecurringReminderEvent rows the reminder
// engine (Phase 4) persists. In-app only: no dispatch, no push/email/SMS.
// No Express dependency; throws typed NotificationError instead of writing
// HTTP responses.
// ============================================================

import prisma from '../lib/prisma';
import { NotificationError } from './notification.errors';
import {
  NOTIFICATION_INCLUDE,
  type NotificationPrismaClient,
  type NotificationWithTemplate,
  type MarkNotificationReadInput,
  type MarkAllNotificationsReadResult,
} from './notification.types';

export function createNotificationService(db: NotificationPrismaClient) {
  async function listNotifications(userId: string): Promise<NotificationWithTemplate[]> {
    return db.recurringReminderEvent.findMany({
      where: { userId },
      include: NOTIFICATION_INCLUDE,
      orderBy: { reminderDate: 'desc' },
    });
  }

  async function markNotificationRead(input: MarkNotificationReadInput): Promise<NotificationWithTemplate> {
    const { userId, id } = input;
    const existing = await db.recurringReminderEvent.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotificationError('Notifikasi tidak ditemukan', 404, 'NOT_FOUND');
    }
    if (existing.readAt) {
      return db.recurringReminderEvent.findUniqueOrThrow({ where: { id }, include: NOTIFICATION_INCLUDE });
    }
    return db.recurringReminderEvent.update({
      where: { id },
      data: { readAt: new Date() },
      include: NOTIFICATION_INCLUDE,
    });
  }

  async function markAllNotificationsRead(userId: string): Promise<MarkAllNotificationsReadResult> {
    const result = await db.recurringReminderEvent.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }

  return {
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  };
}

export const notificationService = createNotificationService(prisma);
