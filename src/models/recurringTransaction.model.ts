export type RecurringTransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// Payload untuk membuat template transaksi rutin (POST /api/v1/recurring-transactions)
export interface CreateRecurringTransactionDto {
  name: string;
  walletId: string;
  categoryId?: string;
  type: RecurringTransactionType;
  amount: number;
  description?: string;
  frequency: RecurrenceFrequency;
  startDate: string; // YYYY-MM-DD in REPORTING_TIMEZONE, or ISO timestamp with Z/offset
  endDate?: string;
}

// Payload untuk memperbarui template transaksi rutin (PUT /api/v1/recurring-transactions/:id)
// Semua field opsional — hanya field yang dikirim yang akan diperbarui
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
