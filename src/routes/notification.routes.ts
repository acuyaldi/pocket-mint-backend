import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const notificationRouter = Router();

// GET /api/v1/notifications
notificationRouter.get('/', requireUser, NotificationController.getAll);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
notificationRouter.patch('/read-all', requireUser, mutationLimiter, NotificationController.markAllRead);
notificationRouter.patch('/:id/read', requireUser, mutationLimiter, NotificationController.markRead);

export { notificationRouter };
