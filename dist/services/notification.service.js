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
    return {
        listNotifications,
        markNotificationRead,
        markAllNotificationsRead,
    };
}
exports.notificationService = createNotificationService(prisma_1.default);
//# sourceMappingURL=notification.service.js.map