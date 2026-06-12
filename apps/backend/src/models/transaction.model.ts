import { TransactionType } from '../generated/prisma/enums';

// Payload untuk membuat transaksi baru (POST /api/v1/transactions)
export interface CreateTransactionDto {
  userId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  note?: string;
  date?: string; // ISO date string (YYYY-MM-DD). Default: hari ini.
}

// Filter opsional untuk daftar transaksi (GET /api/v1/transactions)
export interface ListTransactionQuery {
  userId?: string;
  accountId?: string;
  type?: TransactionType;
  limit?: string;
}
