import { Prisma } from '../generated/prisma/client';
export declare function lockWalletNamespace(tx: Prisma.TransactionClient, userId: string): Promise<void>;
