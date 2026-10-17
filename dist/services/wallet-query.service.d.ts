import type { GetNetWorthInput, GetWalletSparklineInput, ListWalletsInput, WalletQueryPrismaClient, WalletSparklinePoint, WalletTotals, WalletWithAliases } from './wallet-query.types';
export declare function createWalletQueryService(db: WalletQueryPrismaClient): {
    listWallets: (input: ListWalletsInput) => Promise<WalletWithAliases[]>;
    getNetWorth: (input: GetNetWorthInput) => Promise<WalletTotals>;
    getWalletSparkline: (input: GetWalletSparklineInput) => Promise<WalletSparklinePoint[]>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const walletQueryService: {
    listWallets: (input: ListWalletsInput) => Promise<WalletWithAliases[]>;
    getNetWorth: (input: GetNetWorthInput) => Promise<WalletTotals>;
    getWalletSparkline: (input: GetWalletSparklineInput) => Promise<WalletSparklinePoint[]>;
};
