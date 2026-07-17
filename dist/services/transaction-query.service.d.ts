import { type ListTransactionsInput, type TransactionQueryPrismaClient, type TransactionSummaryInput, type TransactionSummaryResult, type TransactionWithRelations } from './transaction-query.types';
export declare function createTransactionQueryService(db: TransactionQueryPrismaClient): {
    listTransactions: (input: ListTransactionsInput) => Promise<TransactionWithRelations[]>;
    getSummary: (input: TransactionSummaryInput) => Promise<TransactionSummaryResult>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const transactionQueryService: {
    listTransactions: (input: ListTransactionsInput) => Promise<TransactionWithRelations[]>;
    getSummary: (input: TransactionSummaryInput) => Promise<TransactionSummaryResult>;
};
//# sourceMappingURL=transaction-query.service.d.ts.map