import type { PrismaClient, Prisma, Wallet, WalletType, AdminFeeType } from '../generated/prisma/client';
export type { Wallet, WalletType, AdminFeeType };
/**
 * The slice of the Prisma client the wallet command service needs: the `wallet`
 * model (create/findFirst/update/delete), `transaction` (`count`, for the
 * pre-delete transfer- and history-reference checks), `walletAlias` (Phase 37
 * — to detect a rename/create colliding with an existing alias), and
 * `$transaction` (the user-scoped advisory lock boundary opened only when a
 * canonical name is actually being set/changed; every other mutation remains
 * the original single write).
 */
export type WalletPrismaClient = Pick<PrismaClient, 'wallet' | 'transaction' | 'walletAlias' | '$transaction'>;
/** Monetary value accepted from the controller; normalized to Decimal inside the service. */
export type DecimalInput = Prisma.Decimal | number | string;
/**
 * Create input. `userId` is the authenticated caller (never taken from the body).
 * `type` is optional (defaults to CASH, as today) and validated in the service;
 * `balance` seeds both `balance` and `initialBalance` (Sprint 2A). Nullable
 * metadata (`icon`/`color`) distinguishes omitted (`undefined`) from explicit null.
 */
export interface CreateWalletInput {
    userId: string;
    name: string;
    type?: WalletType;
    balance?: DecimalInput;
    principal?: DecimalInput;
    creditLimit?: DecimalInput;
    cutoffDay?: number | null;
    paymentDueDay?: number | null;
    interestRate?: DecimalInput;
    adminFee?: DecimalInput;
    adminFeeType?: AdminFeeType;
    icon?: string | null;
    color?: string | null;
}
/**
 * Update input — metadata only. `balance` is accepted solely so the service can
 * enforce the Sprint 2B ledger boundary (unchanged echo tolerated, any change
 * rejected); it is never written. `initialBalance` and `userId` are intentionally
 * absent: they are not editable through this endpoint. Omitted fields
 * (`undefined`) are kept; explicit `null` is written where the column is nullable.
 */
export interface UpdateWalletInput {
    userId: string;
    walletId: string;
    name?: string;
    type?: WalletType;
    balance?: DecimalInput;
    creditLimit?: DecimalInput | null;
    cutoffDay?: number | null;
    paymentDueDay?: number | null;
    interestRate?: DecimalInput;
    adminFee?: DecimalInput;
    adminFeeType?: AdminFeeType;
    icon?: string | null;
    color?: string | null;
    isArchived?: boolean;
}
export interface DeleteWalletInput {
    userId: string;
    walletId: string;
    /** When false, a wallet with transaction history is refused (409). */
    force?: boolean;
}
export interface DeleteWalletResult {
    id: string;
}
