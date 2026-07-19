import { type NotificationPrismaClient, type NotificationWithTemplate, type MarkNotificationReadInput, type MarkAllNotificationsReadResult } from './notification.types';
export declare function createNotificationService(db: NotificationPrismaClient): {
    listNotifications: (userId: string) => Promise<NotificationWithTemplate[]>;
    markNotificationRead: (input: MarkNotificationReadInput) => Promise<NotificationWithTemplate>;
    markAllNotificationsRead: (userId: string) => Promise<MarkAllNotificationsReadResult>;
};
export declare const notificationService: {
    listNotifications: (userId: string) => Promise<NotificationWithTemplate[]>;
    markNotificationRead: (input: MarkNotificationReadInput) => Promise<NotificationWithTemplate>;
    markAllNotificationsRead: (userId: string) => Promise<MarkAllNotificationsReadResult>;
};
//# sourceMappingURL=notification.service.d.ts.map