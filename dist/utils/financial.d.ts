import { Prisma } from '../generated/prisma/client';
export declare function classifyWalletForNetWorth(type: string): 'ASSET' | 'DEBT';
export interface WalletInput {
    type: string;
    balance: Prisma.Decimal;
}
/**
 * Menghitung net worth, total aset, dan total utang dari array wallet.
 * Menggunakan Prisma.Decimal untuk presisi finansial.
 */
export declare function calculateNetWorth(wallets: WalletInput[]): {
    totalAset: Prisma.Decimal;
    totalUtang: Prisma.Decimal;
    netWorth: Prisma.Decimal;
};
/**
 * Mengambil data wallet dari database dan menghitung net worth untuk seorang user.
 * Diproteksi dengan filter userId untuk keamanan data.
 */
export declare function getUserNetWorth(userId: string): Promise<{
    totalAset: Prisma.Decimal;
    totalUtang: Prisma.Decimal;
    netWorth: Prisma.Decimal;
}>;
//# sourceMappingURL=financial.d.ts.map