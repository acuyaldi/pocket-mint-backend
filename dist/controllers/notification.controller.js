"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const response_1 = require("../utils/response");
const notification_service_1 = require("../services/notification.service");
const transaction_controller_1 = require("./transaction.controller");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const serialize = (notification) => ({
    id: notification.id,
    templateId: notification.templateId,
    templateName: notification.template.name,
    templateType: notification.template.type,
    templateAmountMode: notification.template.amountMode,
    templateAmount: notification.template.amount ? parseFloat(notification.template.amount.toString()) : null,
    occurrenceDate: notification.occurrenceDate,
    offsetDays: notification.offsetDays,
    reminderDate: notification.reminderDate,
    readAt: notification.readAt,
    completedAt: notification.completedAt,
    generatedTransactionId: notification.generatedTransactionId,
    createdAt: notification.createdAt,
});
class NotificationController {
    // GET /api/v1/notifications
    static async getAll(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const notifications = await notification_service_1.notificationService.listNotifications(userId);
            (0, response_1.sendSuccess)(res, notifications.map(serialize), 'Retrieved notifications');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/notifications/:id/read
    static async markRead(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const updated = await notification_service_1.notificationService.markNotificationRead({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, serialize(updated), 'Notification marked as read');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/notifications/read-all
    static async markAllRead(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await notification_service_1.notificationService.markAllNotificationsRead(userId);
            (0, response_1.sendSuccess)(res, result, 'All notifications marked as read');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/notifications/:id/confirm
    static async confirm(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await notification_service_1.notificationService.confirmReminder({ userId, id: req.params.id, amount: req.body?.amount });
            (0, response_1.sendSuccess)(res, { notification: serialize(result.notification), transaction: (0, transaction_controller_1.serializeTransaction)(result.transaction) }, 'Transaksi berhasil dibuat dari pengingat', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map