// ============================================================
// Notification service (Phase 5)
// ------------------------------------------------------------
// Read/mutate surface over the RecurringReminderEvent rows the reminder
// engine (Phase 4) persists. In-app only: no dispatch, no push/email/SMS.
// No Express dependency; throws typed NotificationError instead of writing
// HTTP responses.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { applyBalanceDeltas, computeBalanceEffect, type FinancialTxType } from '../domain/transactionBalance';
import { TRANSACTION_INCLUDE } from './transaction.types';
import { NotificationError } from './notification.errors';
import { recurringReminderEngineService } from './recurringReminderEngine.service';
import { reportingConfig } from '../config';
import { formatReportingDate } from '../domain/reportingTime';
import {
  NOTIFICATION_INCLUDE,
  type NotificationPrismaClient,
  type NotificationWithTemplate,
  type MarkNotificationReadInput,
  type MarkAllNotificationsReadResult,
  type ConfirmReminderInput,
  type ConfirmReminderResult,
  type ListNotificationsInput,
  type ListNotificationsResult,
} from './notification.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/** Validated positive integers only; anything else (absent, 0, negative, non-integer) falls back to the default. */
function resolvePagination(page?: number, limit?: number): { page: number; limit: number; skip: number; take: number } {
  const p = Number.isInteger(page) && page! > 0 ? page! : DEFAULT_PAGE;
  const l = Number.isInteger(limit) && limit! > 0 ? Math.min(limit!, MAX_LIMIT) : DEFAULT_LIMIT;
  return { page: p, limit: l, skip: (p - 1) * l, take: l };
}

export function createNotificationService(db: NotificationPrismaClient) {
  /**
   * Database-level pagination — never a silent truncation. `total` (a
   * user-scoped, filter-scoped count) lets every notification remain
   * reachable through page/limit, however large the history grows.
   */
  async function listNotifications(input: ListNotificationsInput): Promise<ListNotificationsResult> {
    const { userId, filter } = input;
    const { page, limit, skip, take } = resolvePagination(input.page, input.limit);
    const where = { userId, ...(filter === 'unread' && { readAt: null }) };

    const [items, total] = await Promise.all([
      db.recurringReminderEvent.findMany({
        where,
        include: NOTIFICATION_INCLUDE,
        orderBy: [{ reminderDate: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      db.recurringReminderEvent.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { items, pagination: { page, limit, total, totalPages, hasMore: page < totalPages } };
  }

  /**
   * Explicit, on-demand materialization for the calling user only: runs the
   * reminder engine scoped to userId for "today" (reportingConfig timezone),
   * then returns the up-to-date first page. GET /notifications never calls
   * this — it stays purely read-only (see notification.controller.ts getAll).
   */
  async function refreshNotifications(userId: string): Promise<ListNotificationsResult> {
    const today = formatReportingDate(new Date(), reportingConfig.timezone);
    await recurringReminderEngineService.evaluateReminders(today, userId);
    return listNotifications({ userId });
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

  /**
   * Confirm a reminder into a real transaction: ownership + completion +
   * template/wallet/category existence are checked before the atomic write.
   * Transaction creation and balance effect reuse the same domain functions
   * transaction.service.ts uses (Single source of truth — financial-logic
   * skill §3). The reminder is only marked completed by a conditional
   * `updateMany` guarded on `completedAt: null`, inside the same $transaction
   * as the write — a concurrent duplicate confirm affects zero rows and
   * rolls the whole write back, so at most one transaction is ever created.
   */
  async function confirmReminder(input: ConfirmReminderInput): Promise<ConfirmReminderResult> {
    const { userId, id, amount } = input;

    const existing = await db.recurringReminderEvent.findFirst({ where: { id, userId }, include: NOTIFICATION_INCLUDE });
    if (!existing) {
      throw new NotificationError('Notifikasi tidak ditemukan', 404, 'NOT_FOUND');
    }
    if (existing.completedAt) {
      throw new NotificationError('Pengingat ini sudah diproses', 409, 'ALREADY_PROCESSED');
    }
    if (existing.installmentId) {
      // Installment payments are TRANSFERs handled by installment-payment.service.ts
      // (POST /bills/:id/pay) — never a generic Transaction create like below.
      throw new NotificationError('Gunakan pembayaran cicilan di halaman Tagihan', 400, 'USE_INSTALLMENT_PAYMENT');
    }
    const template = existing.template;
    if (!template) {
      throw new NotificationError('Transaksi rutin tidak ditemukan', 404, 'TEMPLATE_NOT_FOUND');
    }

    let amountDecimal: Prisma.Decimal;
    if (template.amountMode === 'FIXED') {
      amountDecimal = new Prisma.Decimal(template.amount ?? 0);
    } else {
      if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new NotificationError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
      }
      amountDecimal = new Prisma.Decimal(Number(amount));
    }

    const wallet = await db.wallet.findFirst({ where: { id: template.walletId, userId } });
    if (!wallet) {
      throw new NotificationError('Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
    }
    if (template.categoryId) {
      const category = await db.category.findFirst({ where: { id: template.categoryId, userId } });
      if (!category) {
        throw new NotificationError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
      }
    } else {
      throw new NotificationError('Kategori wajib diisi untuk transaksi ini', 400, 'CATEGORY_REQUIRED');
    }

    return db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          walletId: template.walletId,
          categoryId: template.categoryId,
          type: template.type,
          amount: amountDecimal,
          description: template.name,
          date: new Date(),
        },
        include: TRANSACTION_INCLUDE,
      });
      await applyBalanceDeltas(
        tx,
        computeBalanceEffect({
          type: template.type as FinancialTxType,
          amount: amountDecimal,
          walletId: template.walletId,
        })
      );
      // Guarded on completedAt: null so a concurrent duplicate confirm affects
      // zero rows here and the whole write above rolls back with it.
      const { count } = await tx.recurringReminderEvent.updateMany({
        where: { id, userId, completedAt: null },
        data: { completedAt: new Date(), generatedTransactionId: transaction.id },
      });
      if (count === 0) {
        throw new NotificationError('Pengingat ini sudah diproses', 409, 'ALREADY_PROCESSED');
      }
      const notification = await tx.recurringReminderEvent.findUniqueOrThrow({ where: { id }, include: NOTIFICATION_INCLUDE });
      return { notification, transaction };
    });
  }

  return {
    listNotifications,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    confirmReminder,
  };
}

export const notificationService = createNotificationService(prisma);
