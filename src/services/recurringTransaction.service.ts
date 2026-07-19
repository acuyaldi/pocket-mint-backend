// ============================================================
// Recurring transaction template service
// ------------------------------------------------------------
// Owns validation and ownership checks for recurring transaction templates.
// Phase 1 only: create/read/update/delete the template row. No due-date
// computation, no transaction generation — that's a later phase. No Express
// dependency; throws typed RecurringTransactionErrors instead of writing
// HTTP responses.
// ============================================================

import prisma from '../lib/prisma';
import { reportingConfig } from '../config';
import { parseBusinessDate } from '../domain/reportingTime';
import { RecurringTransactionError } from './recurringTransaction.errors';
import {
  RECURRING_TRANSACTION_INCLUDE,
  type CreateRecurringTransactionInput,
  type UpdateRecurringTransactionInput,
  type DeleteRecurringTransactionInput,
  type DeleteRecurringTransactionResult,
  type RecurringTransactionPrismaClient,
  type RecurringTransactionWithRelations,
} from './recurringTransaction.types';

const VALID_TYPES = ['INCOME', 'EXPENSE'];
const VALID_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

function parseDate(value: string | undefined, field: string): Date {
  try {
    return parseBusinessDate(value, reportingConfig.timezone);
  } catch (error) {
    throw new RecurringTransactionError(
      error instanceof Error ? `${field}: ${error.message}` : `${field} must be a valid date`,
      400,
      'BAD_REQUEST'
    );
  }
}

export function createRecurringTransactionService(db: RecurringTransactionPrismaClient) {
  async function assertWalletOwnership(userId: string, walletId: string): Promise<void> {
    const wallet = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
    if (!wallet) {
      throw new RecurringTransactionError('Wallet tidak ditemukan', 404, 'NOT_FOUND');
    }
  }

  async function assertCategoryOwnership(userId: string, categoryId: string): Promise<void> {
    const category = await db.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    if (!category) {
      throw new RecurringTransactionError('Kategori tidak ditemukan', 404, 'NOT_FOUND');
    }
  }

  async function listRecurringTransactions(userId: string): Promise<RecurringTransactionWithRelations[]> {
    return db.recurringTransactionTemplate.findMany({
      where: { userId },
      include: RECURRING_TRANSACTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async function createRecurringTransaction(
    input: CreateRecurringTransactionInput
  ): Promise<RecurringTransactionWithRelations> {
    const { userId, name, walletId, categoryId, type, description } = input;

    if (!name || !name.trim()) {
      throw new RecurringTransactionError('name is required', 400, 'BAD_REQUEST');
    }
    if (!type || !VALID_TYPES.includes(type)) {
      throw new RecurringTransactionError(`type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    const { amount } = input;
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new RecurringTransactionError('amount is required and must be a positive number', 400, 'BAD_REQUEST');
    }
    if (!input.frequency || !VALID_FREQUENCIES.includes(input.frequency)) {
      throw new RecurringTransactionError(`frequency is required and must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    if (!walletId) {
      throw new RecurringTransactionError('walletId is required', 400, 'BAD_REQUEST');
    }

    const startDate = parseDate(input.startDate, 'startDate');
    const endDate = input.endDate ? parseDate(input.endDate, 'endDate') : undefined;
    if (endDate && endDate < startDate) {
      throw new RecurringTransactionError('endDate must be on or after startDate', 400, 'BAD_REQUEST');
    }

    await assertWalletOwnership(userId, walletId);
    if (categoryId) {
      await assertCategoryOwnership(userId, categoryId);
    }

    return db.recurringTransactionTemplate.create({
      data: {
        userId,
        name: name.trim(),
        walletId,
        categoryId: categoryId ?? null,
        type,
        amount: Number(amount),
        description,
        frequency: input.frequency,
        startDate,
        endDate,
      },
      include: RECURRING_TRANSACTION_INCLUDE,
    });
  }

  async function updateRecurringTransaction(
    input: UpdateRecurringTransactionInput
  ): Promise<RecurringTransactionWithRelations> {
    const { userId, id } = input;

    const existing = await db.recurringTransactionTemplate.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new RecurringTransactionError('Template transaksi rutin tidak ditemukan', 404, 'NOT_FOUND');
    }

    if (input.name !== undefined && !input.name.trim()) {
      throw new RecurringTransactionError('name cannot be empty', 400, 'BAD_REQUEST');
    }
    if (input.type !== undefined && !VALID_TYPES.includes(input.type)) {
      throw new RecurringTransactionError(`type must be one of: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    if (input.amount !== undefined && (isNaN(Number(input.amount)) || Number(input.amount) <= 0)) {
      throw new RecurringTransactionError('amount must be a positive number', 400, 'BAD_REQUEST');
    }
    if (input.frequency !== undefined && !VALID_FREQUENCIES.includes(input.frequency)) {
      throw new RecurringTransactionError(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400, 'BAD_REQUEST');
    }

    const startDate = input.startDate !== undefined ? parseDate(input.startDate, 'startDate') : existing.startDate;
    const endDate = input.endDate !== undefined ? parseDate(input.endDate, 'endDate') : existing.endDate ?? undefined;
    if (endDate && endDate < startDate) {
      throw new RecurringTransactionError('endDate must be on or after startDate', 400, 'BAD_REQUEST');
    }

    if (input.walletId !== undefined) {
      await assertWalletOwnership(userId, input.walletId);
    }
    if (input.categoryId !== undefined) {
      await assertCategoryOwnership(userId, input.categoryId);
    }

    return db.recurringTransactionTemplate.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        walletId: input.walletId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount !== undefined ? Number(input.amount) : undefined,
        description: input.description,
        frequency: input.frequency,
        startDate: input.startDate !== undefined ? startDate : undefined,
        endDate: input.endDate !== undefined ? endDate : undefined,
        isActive: input.isActive,
      },
      include: RECURRING_TRANSACTION_INCLUDE,
    });
  }

  async function deleteRecurringTransaction(
    input: DeleteRecurringTransactionInput
  ): Promise<DeleteRecurringTransactionResult> {
    const { userId, id } = input;
    const existing = await db.recurringTransactionTemplate.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) {
      throw new RecurringTransactionError('Template transaksi rutin tidak ditemukan', 404, 'NOT_FOUND');
    }
    await db.recurringTransactionTemplate.delete({ where: { id } });
    return { id };
  }

  return {
    listRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
  };
}

export const recurringTransactionService = createRecurringTransactionService(prisma);
