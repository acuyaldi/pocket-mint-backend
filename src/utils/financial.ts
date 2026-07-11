import { Prisma } from '../generated/prisma/client';
import prisma from '../lib/prisma';

export function classifyWalletForNetWorth(type: string): 'ASSET' | 'DEBT' {
  switch (type) {
    case 'CASH':
    case 'BANK':
    case 'E_WALLET':
      return 'ASSET';
    case 'CREDIT_CARD':
    case 'LOAN_PAYLATER':
      return 'DEBT';
    default:
      throw new Error(`Unsupported wallet type: ${type}`);
  }
}

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
    if (classifyWalletForNetWorth(w.type) === 'ASSET') {
      totalAset = totalAset.plus(w.balance);
    } else {
      // Outstanding debt = absolute value of the negative balance
      totalUtang = totalUtang.plus(w.balance.abs());
    }
  }

  // Net worth = total aset saja. Utang (paylater/pinjaman) tidak mengurangi
  // net worth — aset baru berkurang saat transaksi pembayaran cicilan terjadi.
  const netWorth = totalAset;

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
