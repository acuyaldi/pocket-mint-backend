import { type CreateTransactionInput, type TransactionPrismaClient, type TransactionWithRelations } from './transaction.types';
export declare function createTransactionService(db: TransactionPrismaClient): {
    createTransaction: (input: CreateTransactionInput) => Promise<TransactionWithRelations>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const transactionService: {
    createTransaction: (input: CreateTransactionInput) => Promise<TransactionWithRelations>;
};
//# sourceMappingURL=transaction.service.d.ts.map