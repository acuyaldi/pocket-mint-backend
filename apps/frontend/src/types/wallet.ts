export type WalletType = 'CASH' | 'BANK' | 'E_WALLET' | 'CREDIT_CARD' | 'LOAN_PAYLATER';

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  creditLimit: number;
  interestRate: number;
  currency: string;
  icon?: string | null;
  color?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
