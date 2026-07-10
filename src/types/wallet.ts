export type WalletType = 'CASH' | 'BANK' | 'E_WALLET' | 'CREDIT_CARD' | 'LOAN_PAYLATER';

export type WalletCategory = 'asset' | 'debt';

export type AssetSubType = 'bank_account' | 'e_wallet' | 'cash_on_hand' | 'piutang';

export type DebtSubType = 'credit_card' | 'paylater' | 'utang_personal' | 'line_of_credit';

/** Wallet types that represent debt/credit products — single source of truth. */
export const DEBT_WALLET_TYPES: WalletType[] = ['CREDIT_CARD', 'LOAN_PAYLATER'];

/** True when a wallet's type is a debt/credit product (derived, not a DB column). */
export const isDebtWallet = (type: WalletType): boolean =>
  DEBT_WALLET_TYPES.includes(type);

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  creditLimit: number;
  interestRate: number;
  adminFee?: number;
  adminFeeType?: 'FLAT' | 'PERCENT';
  currency: string;
  icon?: string | null;
  color?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
