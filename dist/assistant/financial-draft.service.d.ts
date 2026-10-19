import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { type TransactionService } from '../services/transaction.service';
import type { TransactionCreateInput } from './tools';
import type { CaptureEventEmitter } from './capture-events';
/**
 * Interactive-transaction budget for confirm() only — the Prisma default
 * (timeout 5000) is too tight for ~16 round-trips to a far pooler (Jakarta →
 * ap-southeast-2 ≈ 250–350 ms each). Every other transaction keeps the default.
 */
export declare const CONFIRM_TRANSACTION_OPTIONS: {
    readonly maxWait: 5000;
    readonly timeout: 15000;
};
type DraftReadyTransactionInput = TransactionCreateInput & {
    walletId: string;
    categoryId?: string;
    date: string;
};
/** Fields the user may override when confirming a draft. All optional — missing fields use the draft's original values. */
export interface DraftConfirmOverride {
    amount?: number;
    walletId?: string;
    /** Destination wallet override — TRANSFER drafts only. */
    toWalletId?: string;
    categoryId?: string;
    description?: string;
    /** YYYY-MM-DD in the user's reporting timezone. */
    date?: string;
}
/**
 * Row shape needed by `confirm()` to merge overrides — a subset of the full
 * `AssistantFinancialDraft` row.
 */
export interface DraftRowForValidation {
    transactionType: string;
    amount: Prisma.Decimal;
    walletId: string;
    toWalletId: string | null;
    categoryId: string | null;
    transactionDate: Date;
    description: string | null;
}
export declare function createAssistantFinancialDraftService(db: PrismaClient, transactions: TransactionService, deps?: (() => {
    inferCategoryId?: (userId: string, type: 'INCOME' | 'EXPENSE', hint: string | undefined, tx?: Prisma.TransactionClient) => Promise<string | undefined>;
}) | {
    inferCategoryId?: (userId: string, type: 'INCOME' | 'EXPENSE', hint: string | undefined, tx?: Prisma.TransactionClient) => Promise<string | undefined>;
}, clock?: () => Date, captureEvents?: CaptureEventEmitter): {
    prepare: (input: DraftReadyTransactionInput & {
        walletDisplayLabel?: string;
        toWalletDisplayLabel?: string;
        merchantDisplayLabel?: string;
        userId: string;
        conversationId: string;
        turnId: string;
        executionId: string;
        now?: Date;
        transaction?: Prisma.TransactionClient;
    }) => Promise<{
        draftId: string;
        status: import("@/generated/prisma").$Enums.AssistantFinancialDraftStatus;
        expiresAt: Date;
        preview: {
            description?: string | undefined;
            date: string;
            transactionDate: string;
            merchant?: string | undefined;
            toWalletId: string | undefined;
            categoryId?: string | undefined;
            category?: string | undefined;
            walletId: string;
            type: "INCOME" | "EXPENSE" | "TRANSFER";
            amount: string;
        } | {
            description?: string | undefined;
            date: string;
            transactionDate: string;
            merchant?: string | undefined;
            toWallet: string;
            categoryId?: string | undefined;
            category?: string | undefined;
            walletId: string;
            type: "INCOME" | "EXPENSE" | "TRANSFER";
            amount: string;
        } | {
            description?: string | undefined;
            date: string;
            transactionDate: string;
            merchant?: string | undefined;
            categoryId?: string | undefined;
            category?: string | undefined;
            walletId: string;
            type: "INCOME" | "EXPENSE" | "TRANSFER";
            amount: string;
        } | {
            description?: string | undefined;
            date: string;
            transactionDate: string;
            merchant?: string | undefined;
            toWalletId: string | undefined;
            categoryId?: string | undefined;
            category?: string | undefined;
            wallet: string;
            type: "INCOME" | "EXPENSE" | "TRANSFER";
            amount: string;
        } | {
            description?: string | undefined;
            date: string;
            transactionDate: string;
            merchant?: string | undefined;
            toWallet: string;
            categoryId?: string | undefined;
            category?: string | undefined;
            wallet: string;
            type: "INCOME" | "EXPENSE" | "TRANSFER";
            amount: string;
        } | {
            description?: string | undefined;
            date: string;
            transactionDate: string;
            merchant?: string | undefined;
            categoryId?: string | undefined;
            category?: string | undefined;
            wallet: string;
            type: "INCOME" | "EXPENSE" | "TRANSFER";
            amount: string;
        };
        confirmationRequired: boolean;
        renderedText: string;
    }>;
    confirm: (userId: string, draftId: string, keyValue: unknown, correlationId: string, overrides?: DraftConfirmOverride) => Promise<{
        idempotencyOutcome: "replay";
        draftId: string;
        status: "COMMITTED";
        transactionId: string;
        conversationId: string;
        readonly error?: undefined;
        turnId?: undefined;
    } | {
        draftId: string;
        status: "COMMITTED";
        transactionId: string;
        conversationId: string;
        turnId: string;
        idempotencyOutcome: "new";
        readonly error?: undefined;
    }>;
    cancel: (userId: string, draftId: string, correlationId: string) => Promise<{
        turnId?: string | undefined;
        draftId: string;
        status: "CANCELLED";
        conversationId: string;
    } | {
        draftId: string;
        status: "EXPIRED";
        conversationId: string;
    }>;
};
export type AssistantFinancialDraftService = ReturnType<typeof createAssistantFinancialDraftService>;
export {};
