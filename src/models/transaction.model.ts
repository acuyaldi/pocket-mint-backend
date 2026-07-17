export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

// Payload untuk membuat transaksi baru (POST /api/v1/transactions)
// userId & walletId bersifat opsional di body — bisa di-resolve otomatis oleh backend
// (userId dari requireUser middleware via req.auth, walletId dari wallet pertama user)
export interface CreateTransactionDto {
  userId?: string;
  walletId?: string;
  toWalletId?: string; // destination wallet for TRANSFER
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  note?: string;
  date?: string; // YYYY-MM-DD in REPORTING_TIMEZONE, or ISO timestamp with Z/offset. Default: now.
  isInstallment?: boolean; // compatibility alias for billingMode=INSTALLMENT
  billingMode?: 'FULL' | 'INSTALLMENT';
  installmentMonths?: number;
  firstDueDate?: string;
  interestRate?: number; // Bunga flat per bulan dalam persen (contoh: 2.95 = 2.95%). Default 0.
  currentTerm?: number; // default 1
}

// Payload untuk memperbarui transaksi (PUT /api/v1/transactions/:id)
// Semua field opsional — hanya field yang dikirim yang akan diperbarui
export interface UpdateTransactionDto {
  walletId?: string;
  toWalletId?: string;
  categoryId?: string;
  type?: TransactionType;
  amount?: number;
  description?: string;
  note?: string;
  date?: string; // YYYY-MM-DD in REPORTING_TIMEZONE, or ISO timestamp with Z/offset
  isInstallment?: boolean;
  installmentMonths?: number;
  currentTerm?: number;
}

// Filter opsional untuk daftar transaksi (GET /api/v1/transactions)
export interface ListTransactionQuery {
  userId?: string;
  walletId?: string;
  type?: TransactionType;
  month?: string; // 1-12, default: current month
  year?: string; // e.g. 2026, default: current year
  limit?: string;
}
