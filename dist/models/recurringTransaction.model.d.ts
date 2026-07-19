export type RecurringTransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export interface CreateRecurringTransactionDto {
    name: string;
    walletId: string;
    categoryId?: string;
    type: RecurringTransactionType;
    amount: number;
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
    amount?: number;
    description?: string;
    frequency?: RecurrenceFrequency;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
}
//# sourceMappingURL=recurringTransaction.model.d.ts.map