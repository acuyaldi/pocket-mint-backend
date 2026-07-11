import { Prisma } from '../generated/prisma/client';
import type { FinancialTxType } from './transactionBalance';

export interface ReportingTransaction {
  type: FinancialTxType;
  amount: Prisma.Decimal;
  walletId: string;
  toWalletId?: string | null;
  isInstallment?: boolean;
  installment?: { grandTotal: Prisma.Decimal } | null;
}

function persistedWalletAmount(transaction: ReportingTransaction): Prisma.Decimal {
  return transaction.type === 'EXPENSE' && transaction.isInstallment && transaction.installment
    ? transaction.installment.grandTotal
    : transaction.amount;
}

export function getWalletReportingEffect(
  transaction: ReportingTransaction,
  walletId: string
): Prisma.Decimal {
  const amount = persistedWalletAmount(transaction);
  switch (transaction.type) {
    case 'INCOME':
      return transaction.walletId === walletId ? amount : new Prisma.Decimal(0);
    case 'EXPENSE':
      return transaction.walletId === walletId ? amount.negated() : new Prisma.Decimal(0);
    case 'TRANSFER':
      if (transaction.walletId === walletId) return amount.negated();
      if (transaction.toWalletId === walletId) return amount;
      return new Prisma.Decimal(0);
  }
}

export function getAggregateCashFlowEffect(transaction: ReportingTransaction): Prisma.Decimal {
  switch (transaction.type) {
    case 'INCOME': return transaction.amount;
    case 'EXPENSE': return transaction.amount.negated();
    case 'TRANSFER': return new Prisma.Decimal(0);
  }
}
