export type RecurringTransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurringAmountMode = 'FIXED' | 'FLEXIBLE';
export interface CreateRecurringTransactionDto {
    name: string;
    walletId: string;
    categoryId?: string;
    type: RecurringTransactionType;
    amountMode: RecurringAmountMode;
    /** Required when amountMode is FIXED; ignored (stored as null) when FLEXIBLE. */
    amount?: number;
    description?: string;
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
}
export interface UpdateRecurringTransactionDto {
    name?: string;
    walletId?: string;
    categoryId?: string;
    type?: RecurringTransactionType;
    amountMode?: RecurringAmountMode;
    amount?: number;
    description?: string;
    frequency?: RecurrenceFrequency;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
}
//# sourceMappingURL=recurringTransaction.model.d.ts.map