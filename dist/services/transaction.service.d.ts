import { type Transaction } from '../generated/prisma/client';
import { type CreateTransactionInput, type UpdateTransactionInput, type DeleteTransactionInput, type DeleteTransactionResult, type TransactionPrismaClient, type CreateTransactionOptions, type TransactionWithRelations } from './transaction.types';
export declare const TRANSFER_SOURCE_TYPES: string[];
export declare function createTransactionService(db: TransactionPrismaClient): {
    createTransaction: {
        (input: CreateTransactionInput, options?: CreateTransactionOptions & {
            relations?: undefined;
        }): Promise<TransactionWithRelations>;
        (input: CreateTransactionInput, options: CreateTransactionOptions & {
            relations: false;
        }): Promise<Transaction>;
    };
    updateTransaction: (input: UpdateTransactionInput) => Promise<TransactionWithRelations>;
    deleteTransaction: (input: DeleteTransactionInput) => Promise<DeleteTransactionResult>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const transactionService: {
    createTransaction: {
        (input: CreateTransactionInput, options?: CreateTransactionOptions & {
            relations?: undefined;
        }): Promise<TransactionWithRelations>;
        (input: CreateTransactionInput, options: CreateTransactionOptions & {
            relations: false;
        }): Promise<Transaction>;
    };
    updateTransaction: (input: UpdateTransactionInput) => Promise<TransactionWithRelations>;
    deleteTransaction: (input: DeleteTransactionInput) => Promise<DeleteTransactionResult>;
};
export type TransactionService = ReturnType<typeof createTransactionService>;
