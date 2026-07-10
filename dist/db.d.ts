import { PrismaClient } from './generated/prisma';
export declare const prisma: PrismaClient<import("./generated/prisma").Prisma.PrismaClientOptions, never, import("@/generated/prisma/runtime/library").DefaultArgs>;
export declare function ensureDefaultData(): Promise<{
    userId: string;
    walletId: string;
    categoryId: string;
}>;
//# sourceMappingURL=db.d.ts.map