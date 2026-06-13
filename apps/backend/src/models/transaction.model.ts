export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

// Payload untuk membuat transaksi baru (POST /api/v1/transactions)
// userId & walletId bersifat opsional di body — bisa di-resolve otomatis oleh backend
// (userId dari apiKeyAuth middleware via req.query, walletId dari wallet pertama user)
export interface CreateTransactionDto {
  userId?: string;
  walletId?: string;
  toWalletId?: string; // destination wallet for TRANSFER
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  note?: string;
  date?: string; // ISO date string (YYYY-MM-DD). Default: hari ini.
  isInstallment?: boolean; // true = cicilan (khusus wallet DEBT: CREDIT_CARD / LOAN_PAYLATER)
  installmentMonths?: number; // 3, 6, atau 12
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
  date?: string; // ISO date string (YYYY-MM-DD)
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
