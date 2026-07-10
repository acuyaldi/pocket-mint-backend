export interface Transaction {
  id: string;
  userId: string;
  walletId?: string | null;
  toWalletId?: string | null;
  categoryId?: string | null;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  description?: string | null;
  note?: string | null;
  date: string; // ISO date string
  isInstallment?: boolean;
  installmentMonths?: number | null;
  interestRate?: number;
  currentTerm?: number;
  createdAt: string;
  updatedAt: string;
  // optional relations that the backend may include
  wallet?: {
    id: string;
    name: string;
    type: string;
  } | null;
  toWallet?: {
    id: string;
    name: string;
    type: string;
  } | null;
  category?: {
    id: string;
    name: string;
    type: string;
  } | null;
}
