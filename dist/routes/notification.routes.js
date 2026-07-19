"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const notificationRouter = (0, express_1.Router)();
exports.notificationRouter = notificationRouter;
// GET /api/v1/notifications
notificationRouter.get('/', apiKeyAuth_1.requireUser, notification_controller_1.NotificationController.getAll);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
notificationRouter.patch('/read-all', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, notification_controller_1.NotificationController.markAllRead);
notificationRouter.patch('/:id/read', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, notification_controller_1.NotificationController.markRead);
//# sourceMappingURL=notification.routes.js.map