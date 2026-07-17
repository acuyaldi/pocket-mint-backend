// ============================================================
// Transaction service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the transaction service. The controller maps
// HTTP requests into these; the service returns typed domain records. No `any`,
// no raw request objects, and a narrow Prisma dependency so tests can inject a
// fake without a DI framework or a repository layer.
// ============================================================

import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { TransactionType } from '../models/transaction.model';

/**
 * The slice of the Prisma client the transaction service needs. Injecting this
 * (rather than importing the singleton everywhere) lets tests substitute a fake
 * and keeps the service from constructing its own client.
 */
export type TransactionPrismaClient = Pick<
  PrismaClient,
  'transaction' | 'wallet' | 'installment' | 'category' | '$transaction'
>;

/** Amount accepted from the controller; normalized to Decimal inside the service. */
export type DecimalInput = Prisma.Decimal | number | string;

export interface CreateTransactionInput {
  userId: string;
  type: TransactionType;
  amount: DecimalInput;
  /** Optional — defaults to the user's first wallet, as today. */
  walletId?: string;
  toWalletId?: string;
  categoryId?: string;
  description?: string;
  /** ISO day (`YYYY-MM-DD`) or offset timestamp; normalized in the service. */
  date?: string;
  isInstallment?: boolean;
  billingMode?: 'FULL' | 'INSTALLMENT';
  installmentMonths?: number;
  interestRate?: number;
  firstDueDate?: string;
}

/** Update fields; `undefined` means "omitted" (keep the persisted value). */
export interface UpdateTransactionFields {
  type?: TransactionType;
  amount?: DecimalInput;
  description?: string;
  date?: string;
  categoryId?: string;
  walletId?: string;
  toWalletId?: string;
  /** Only used to reject a regular→installment conversion. */
  isInstallment?: boolean;
}

export interface UpdateTransactionInput extends UpdateTransactionFields {
  userId: string;
  id: string;
}

export interface DeleteTransactionInput {
  userId: string;
  id: string;
}

/**
 * Relations every mutation returns — the shape the controller's existing
 * serializer already expects. Kept here so the service and its result type
 * stay in sync.
 */
export const TRANSACTION_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, type: true } },
} as const;

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof TRANSACTION_INCLUDE;
}>;

export interface DeleteTransactionResult {
  id: string;
}
