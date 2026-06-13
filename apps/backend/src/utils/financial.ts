import { Prisma } from '../generated/prisma/client';
import prisma from '../lib/prisma';

const ASSET_TYPES = ['CASH', 'BANK', 'E_WALLET'];
const DEBT_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];

export interface WalletInput {
  type: string;
  balance: Prisma.Decimal;
}

/**
 * Menghitung net worth, total aset, dan total utang dari array wallet.
 * Menggunakan Prisma.Decimal untuk presisi finansial.
 */
export function calculateNetWorth(wallets: WalletInput[]) {
  let totalAset = new Prisma.Decimal(0);
  let totalUtang = new Prisma.Decimal(0);

  for (const w of wallets) {
    if (ASSET_TYPES.includes(w.type)) {
      totalAset = totalAset.plus(w.balance);
    } else if (DEBT_TYPES.includes(w.type)) {
      // Outstanding debt = absolute value of the negative balance
      totalUtang = totalUtang.plus(w.balance.abs());
    }
  }

  const netWorth = totalAset.minus(totalUtang);

  return {
    totalAset,
    totalUtang,
    netWorth,
  };
}

/**
 * Mengambil data wallet dari database dan menghitung net worth untuk seorang user.
 * Diproteksi dengan filter userId untuk keamanan data.
 */
export async function getUserNetWorth(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: {
      type: true,
      balance: true,
    },
  });

  return calculateNetWorth(wallets);
}
