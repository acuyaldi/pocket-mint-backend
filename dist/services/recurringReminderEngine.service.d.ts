import type { RecurringReminderEnginePrismaClient, RecurringReminderEvent } from './recurringReminderEngine.types';
export declare function createRecurringReminderEngineService(db: RecurringReminderEnginePrismaClient): {
    evaluateReminders: (evaluationDate: string) => Promise<RecurringReminderEvent[]>;
};
export declare const recurringReminderEngineService: {
    evaluateReminders: (evaluationDate: string) => Promise<RecurringReminderEvent[]>;
};
//# sourceMappingURL=recurringReminderEngine.service.d.ts.map