import type { PrismaClient } from '../../generated/prisma/client';
import { type EntityResolver, type TrustedEntityConstraints } from './types';
export type CategoryTransactionType = 'INCOME' | 'EXPENSE';
interface CategoryTransactionCreateConstraints extends TrustedEntityConstraints {
    readonly eligibleFor: 'transaction.create';
    readonly transactionType: CategoryTransactionType;
}
export declare function createCategoryTransactionCreateConstraints(transactionType: CategoryTransactionType): Readonly<CategoryTransactionCreateConstraints>;
export declare function createCategoryResolver(db: Pick<PrismaClient, 'category'>): EntityResolver;
export {};
//# sourceMappingURL=category-resolver.d.ts.map