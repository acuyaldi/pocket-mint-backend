import type { PrismaClient } from '../generated/prisma/client';
export type RecurringReminderEnginePrismaClient = Pick<PrismaClient, 'recurringTransactionTemplate' | 'recurringReminderEvent'>;
export interface RecurringReminderEvent {
    id: string;
    templateId: string;
    userId: string;
    occurrenceDate: Date;
    offsetDays: number;
    reminderDate: Date;
    createdAt: Date;
}
//# sourceMappingURL=recurringReminderEngine.types.d.ts.map