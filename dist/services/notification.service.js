"use strict";
// ============================================================
// Notification service (Phase 5)
// ------------------------------------------------------------
// Read/mutate surface over the RecurringReminderEvent rows the reminder
// engine (Phase 4) persists. In-app only: no dispatch, no push/email/SMS.
// No Express dependency; throws typed NotificationError instead of writing
// HTTP responses.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
exports.createNotificationService = createNotificationService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const transactionBalance_1 = require("../domain/transactionBalance");
const transaction_types_1 = require("./transaction.types");
const notification_errors_1 = require("./notification.errors");
const notification_types_1 = require("./notification.types");
function createNotificationService(db) {
    async function listNotifications(userId) {
        return db.recurringReminderEvent.findMany({
            where: { userId },
            include: notification_types_1.NOTIFICATION_INCLUDE,
            orderBy: { reminderDate: 'desc' },
        });
    }
    async function markNotificationRead(input) {
        const { userId, id } = input;
        const existing = await db.recurringReminderEvent.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new notification_errors_1.NotificationError('Notifikasi tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (existing.readAt) {
            return db.recurringReminderEvent.findUniqueOrThrow({ where: { id }, include: notification_types_1.NOTIFICATION_INCLUDE });
        }
        return db.recurringReminderEvent.update({
            where: { id },
            data: { readAt: new Date() },
            include: notification_types_1.NOTIFICATION_INCLUDE,
        });
    }
    async function markAllNotificationsRead(userId) {
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
    async function confirmReminder(input) {
        const { userId, id, amount } = input;
        const existing = await db.recurringReminderEvent.findFirst({ where: { id, userId }, include: notification_types_1.NOTIFICATION_INCLUDE });
        if (!existing) {
            throw new notification_errors_1.NotificationError('Notifikasi tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (existing.completedAt) {
            throw new notification_errors_1.NotificationError('Pengingat ini sudah diproses', 409, 'ALREADY_PROCESSED');
        }
        if (existing.installmentId) {
            // Installment payments are TRANSFERs handled by installment-payment.service.ts
            // (POST /bills/:id/pay) — never a generic Transaction create like below.
            throw new notification_errors_1.NotificationError('Gunakan pembayaran cicilan di halaman Tagihan', 400, 'USE_INSTALLMENT_PAYMENT');
        }
        const template = existing.template;
        if (!template) {
            throw new notification_errors_1.NotificationError('Transaksi rutin tidak ditemukan', 404, 'TEMPLATE_NOT_FOUND');
        }
        let amountDecimal;
        if (template.amountMode === 'FIXED') {
            amountDecimal = new client_1.Prisma.Decimal(template.amount ?? 0);
        }
        else {
            if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
                throw new notification_errors_1.NotificationError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
            }
            amountDecimal = new client_1.Prisma.Decimal(Number(amount));
        }
        const wallet = await db.wallet.findFirst({ where: { id: template.walletId, userId } });
        if (!wallet) {
            throw new notification_errors_1.NotificationError('Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
        }
        if (template.categoryId) {
            const category = await db.category.findFirst({ where: { id: template.categoryId, userId } });
            if (!category) {
                throw new notification_errors_1.NotificationError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
            }
        }
        else {
            throw new notification_errors_1.NotificationError('Kategori wajib diisi untuk transaksi ini', 400, 'CATEGORY_REQUIRED');
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
                include: transaction_types_1.TRANSACTION_INCLUDE,
            });
            await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.computeBalanceEffect)({
                type: template.type,
                amount: amountDecimal,
                walletId: template.walletId,
            }));
            // Guarded on completedAt: null so a concurrent duplicate confirm affects
            // zero rows here and the whole write above rolls back with it.
            const { count } = await tx.recurringReminderEvent.updateMany({
                where: { id, userId, completedAt: null },
                data: { completedAt: new Date(), generatedTransactionId: transaction.id },
            });
            if (count === 0) {
                throw new notification_errors_1.NotificationError('Pengingat ini sudah diproses', 409, 'ALREADY_PROCESSED');
            }
            const notification = await tx.recurringReminderEvent.findUniqueOrThrow({ where: { id }, include: notification_types_1.NOTIFICATION_INCLUDE });
            return { notification, transaction };
        });
    }
    return {
        listNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        confirmReminder,
    };
}
exports.notificationService = createNotificationService(prisma_1.default);
//# sourceMappingURL=notification.service.js.map