import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { TransactionWithRelations } from './transaction.types';
export type NotificationPrismaClient = Pick<PrismaClient, 'recurringReminderEvent' | 'wallet' | 'category' | 'transaction' | '$transaction'>;
export declare const NOTIFICATION_INCLUDE: {
    readonly template: {
        readonly select: {
            readonly id: true;
            readonly name: true;
            readonly type: true;
            readonly amountMode: true;
            readonly amount: true;
            readonly walletId: true;
            readonly categoryId: true;
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
/** Amount accepted from the controller; required only for FLEXIBLE templates. */
export type DecimalInput = Prisma.Decimal | number | string;
export interface ConfirmReminderInput {
    userId: string;
    id: string;
    amount?: DecimalInput;
}
export interface ConfirmReminderResult {
    notification: NotificationWithTemplate;
    transaction: TransactionWithRelations;
}
//# sourceMappingURL=notification.types.d.ts.map