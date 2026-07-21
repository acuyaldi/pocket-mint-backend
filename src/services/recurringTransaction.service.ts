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
const VALID_AMOUNT_MODES = ['FIXED', 'FLEXIBLE'];
const VALID_REMINDER_OFFSET_DAYS = [0, 1, 3, 7];

/** Disabled requires a null offset; enabled requires one of VALID_REMINDER_OFFSET_DAYS. */
function resolveReminder(
  reminderEnabled: boolean,
  reminderOffsetDays: unknown
): { reminderEnabled: boolean; reminderOffsetDays: number | null } {
  if (!reminderEnabled) {
    if (reminderOffsetDays !== undefined && reminderOffsetDays !== null) {
      throw new RecurringTransactionError('reminderOffsetDays must be null when reminderEnabled is false', 400, 'BAD_REQUEST');
    }
    return { reminderEnabled: false, reminderOffsetDays: null };
  }
  if (typeof reminderOffsetDays !== 'number' || !VALID_REMINDER_OFFSET_DAYS.includes(reminderOffsetDays)) {
    throw new RecurringTransactionError(
      `reminderOffsetDays is required and must be one of: ${VALID_REMINDER_OFFSET_DAYS.join(', ')}`,
      400,
      'BAD_REQUEST'
    );
  }
  return { reminderEnabled: true, reminderOffsetDays };
}

/** FIXED requires a positive amount; FLEXIBLE always persists a null amount. */
function resolveAmount(amountMode: string, amount: unknown): number | null {
  if (amountMode === 'FLEXIBLE') {
    return null;
  }
  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new RecurringTransactionError('amount is required and must be a positive number when amountMode is FIXED', 400, 'BAD_REQUEST');
  }
  return Number(amount);
}

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
    if (!input.amountMode || !VALID_AMOUNT_MODES.includes(input.amountMode)) {
      throw new RecurringTransactionError(`amountMode is required and must be one of: ${VALID_AMOUNT_MODES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    const amount = resolveAmount(input.amountMode, input.amount);
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

    const reminder = resolveReminder(input.reminderEnabled ?? false, input.reminderOffsetDays);

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
        amountMode: input.amountMode,
        amount,
        description,
        frequency: input.frequency,
        startDate,
        endDate,
        reminderEnabled: reminder.reminderEnabled,
        reminderOffsetDays: reminder.reminderOffsetDays,
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
    if (input.amountMode !== undefined && !VALID_AMOUNT_MODES.includes(input.amountMode)) {
      throw new RecurringTransactionError(`amountMode must be one of: ${VALID_AMOUNT_MODES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    if (input.frequency !== undefined && !VALID_FREQUENCIES.includes(input.frequency)) {
      throw new RecurringTransactionError(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    // Validate the final merged state, not just the fields present in this request —
    // a partial update (e.g. amountMode alone) must still leave amount consistent.
    const finalAmountMode = input.amountMode ?? existing.amountMode;
    const amountSource = input.amount !== undefined ? input.amount : existing.amount;
    const amount = resolveAmount(finalAmountMode, amountSource);

    const startDate = input.startDate !== undefined ? parseDate(input.startDate, 'startDate') : existing.startDate;
    const endDate = input.endDate !== undefined ? parseDate(input.endDate, 'endDate') : existing.endDate ?? undefined;
    if (endDate && endDate < startDate) {
      throw new RecurringTransactionError('endDate must be on or after startDate', 400, 'BAD_REQUEST');
    }

    const finalReminderEnabled = input.reminderEnabled ?? existing.reminderEnabled;
    const reminderOffsetSource = input.reminderOffsetDays !== undefined ? input.reminderOffsetDays : existing.reminderOffsetDays;
    const reminder = resolveReminder(finalReminderEnabled, reminderOffsetSource);

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
        amountMode: finalAmountMode,
        amount,
        description: input.description,
        frequency: input.frequency,
        startDate: input.startDate !== undefined ? startDate : undefined,
        endDate: input.endDate !== undefined ? endDate : undefined,
        isActive: input.isActive,
        reminderEnabled: reminder.reminderEnabled,
        reminderOffsetDays: reminder.reminderOffsetDays,
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
