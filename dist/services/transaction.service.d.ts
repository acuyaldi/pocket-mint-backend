import { type CreateTransactionInput, type UpdateTransactionInput, type DeleteTransactionInput, type DeleteTransactionResult, type TransactionPrismaClient, type TransactionWithRelations } from './transaction.types';
export declare function createTransactionService(db: TransactionPrismaClient): {
    createTransaction: (input: CreateTransactionInput) => Promise<TransactionWithRelations>;
    updateTransaction: (input: UpdateTransactionInput) => Promise<TransactionWithRelations>;
    deleteTransaction: (input: DeleteTransactionInput) => Promise<DeleteTransactionResult>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const transactionService: {
    createTransaction: (input: CreateTransactionInput) => Promise<TransactionWithRelations>;
    updateTransaction: (input: UpdateTransactionInput) => Promise<TransactionWithRelations>;
    deleteTransaction: (input: DeleteTransactionInput) => Promise<DeleteTransactionResult>;
};
//# sourceMappingURL=transaction.service.d.ts.map