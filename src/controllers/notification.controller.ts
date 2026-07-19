import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { notificationService } from '../services/notification.service';
import type { NotificationWithTemplate } from '../services/notification.types';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';

const serialize = (notification: NotificationWithTemplate) => ({
  id: notification.id,
  templateId: notification.templateId,
  templateName: notification.template.name,
  occurrenceDate: notification.occurrenceDate,
  offsetDays: notification.offsetDays,
  reminderDate: notification.reminderDate,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

export class NotificationController {
  // GET /api/v1/notifications
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const notifications = await notificationService.listNotifications(userId);
      sendSuccess(res, notifications.map(serialize), 'Retrieved notifications');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/notifications/:id/read
  static async markRead(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const updated = await notificationService.markNotificationRead({ userId, id: req.params.id });
      sendSuccess(res, serialize(updated), 'Notification marked as read');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/notifications/read-all
  static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const result = await notificationService.markAllNotificationsRead(userId);
      sendSuccess(res, result, 'All notifications marked as read');
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
