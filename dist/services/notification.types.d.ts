import type { PrismaClient, Prisma } from '../generated/prisma/client';
export type NotificationPrismaClient = Pick<PrismaClient, 'recurringReminderEvent'>;
export declare const NOTIFICATION_INCLUDE: {
    readonly template: {
        readonly select: {
            readonly id: true;
            readonly name: true;
        };
    };
};
export type NotificationWithTemplate = Prisma.RecurringReminderEventGetPayload<{
    include: typeof NOTIFICATION_INCLUDE;
}>;
export interface MarkNotificationReadInput {
    userId: string;
    id: string;
}
export interface MarkAllNotificationsReadResult {
    count: number;
}
//# sourceMappingURL=notification.types.d.ts.map