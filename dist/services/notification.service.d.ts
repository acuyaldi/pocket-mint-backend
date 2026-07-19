import { type NotificationPrismaClient, type NotificationWithTemplate, type MarkNotificationReadInput, type MarkAllNotificationsReadResult, type ConfirmReminderInput, type ConfirmReminderResult } from './notification.types';
export declare function createNotificationService(db: NotificationPrismaClient): {
    listNotifications: (userId: string) => Promise<NotificationWithTemplate[]>;
    markNotificationRead: (input: MarkNotificationReadInput) => Promise<NotificationWithTemplate>;
    markAllNotificationsRead: (userId: string) => Promise<MarkAllNotificationsReadResult>;
    confirmReminder: (input: ConfirmReminderInput) => Promise<ConfirmReminderResult>;
};
export declare const notificationService: {
    listNotifications: (userId: string) => Promise<NotificationWithTemplate[]>;
    markNotificationRead: (input: MarkNotificationReadInput) => Promise<NotificationWithTemplate>;
    markAllNotificationsRead: (userId: string) => Promise<MarkAllNotificationsReadResult>;
    confirmReminder: (input: ConfirmReminderInput) => Promise<ConfirmReminderResult>;
};
//# sourceMappingURL=notification.service.d.ts.map