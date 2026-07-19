// ============================================================
// Saving goal service
// ------------------------------------------------------------
// Phase 8: a planning/tracking record only. Owns validation, ownership
// checks, and deterministic status transitions for saving goals. Never
// creates a Transaction, mutates a Wallet balance, or touches net worth —
// see financial-logic.skill.md before adding any such side effect. No
// Express dependency; throws typed SavingGoalErrors instead of writing HTTP
// responses.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { parseBusinessDate } from '../domain/reportingTime';
import { reportingConfig } from '../config';
import { SavingGoalError } from './savingGoal.errors';
import {
  type ArchiveSavingGoalInput,
  type CreateSavingGoalInput,
  type GetSavingGoalInput,
  type SavingGoalPrismaClient,
  type SavingGoalRecord,
  type UpdateSavingGoalInput,
  type UpdateSavingGoalProgressInput,
} from './savingGoal.types';

const MONEY_SCALE = 2;
const MONEY_ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

function toMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

function parseTargetDate(value: string | undefined, field: string): Date {
  try {
    return parseBusinessDate(value, reportingConfig.timezone);
  } catch (error) {
    throw new SavingGoalError(
      error instanceof Error ? `${field}: ${error.message}` : `${field} must be a valid date`,
      400,
      'BAD_REQUEST'
    );
  }
}

function parseTargetAmount(value: unknown): Prisma.Decimal {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    throw new SavingGoalError('targetAmount is required and must be a positive number', 400, 'BAD_REQUEST');
  }
  const amount = toMoney(new Prisma.Decimal(value as Prisma.Decimal.Value));
  if (amount.lessThanOrEqualTo(0)) {
    throw new SavingGoalError('targetAmount is required and must be a positive number', 400, 'BAD_REQUEST');
  }
  return amount;
}

function parseCurrentAmount(value: unknown): Prisma.Decimal {
  const amount = toMoney(new Prisma.Decimal((value ?? 0) as Prisma.Decimal.Value));
  if (amount.lessThan(0)) {
    throw new SavingGoalError('currentAmount must be zero or a positive number', 400, 'BAD_REQUEST');
  }
  return amount;
}

/** Non-archived goals recompute deterministically; ARCHIVED never changes automatically. */
function resolveStatus(currentAmount: Prisma.Decimal, targetAmount: Prisma.Decimal): 'ACTIVE' | 'COMPLETED' {
  return currentAmount.greaterThanOrEqualTo(targetAmount) ? 'COMPLETED' : 'ACTIVE';
}

export function createSavingGoalService(db: SavingGoalPrismaClient) {
  async function findOwned(userId: string, id: string): Promise<SavingGoalRecord> {
    const goal = await db.savingGoal.findFirst({ where: { id, userId } });
    if (!goal) {
      throw new SavingGoalError('Target tabungan tidak ditemukan', 404, 'NOT_FOUND');
    }
    return goal;
  }

  async function listSavingGoals(userId: string): Promise<SavingGoalRecord[]> {
    return db.savingGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async function getSavingGoal(input: GetSavingGoalInput): Promise<SavingGoalRecord> {
    return findOwned(input.userId, input.id);
  }

  async function createSavingGoal(input: CreateSavingGoalInput): Promise<SavingGoalRecord> {
    const { userId, name } = input;

    if (!name || !name.trim()) {
      throw new SavingGoalError('name is required', 400, 'BAD_REQUEST');
    }
    const targetAmount = parseTargetAmount(input.targetAmount);
    const currentAmount = parseCurrentAmount(input.currentAmount);
    const targetDate = input.targetDate !== undefined ? parseTargetDate(input.targetDate, 'targetDate') : undefined;

    return db.savingGoal.create({
      data: {
        userId,
        name: name.trim(),
        targetAmount,
        currentAmount,
        targetDate,
        notes: input.notes,
        status: resolveStatus(currentAmount, targetAmount),
      },
    });
  }

  async function updateSavingGoal(input: UpdateSavingGoalInput): Promise<SavingGoalRecord> {
    const { userId, id } = input;
    const existing = await findOwned(userId, id);

    if (existing.status === 'ARCHIVED') {
      throw new SavingGoalError('Target tabungan yang diarsipkan tidak dapat diubah', 409, 'CONFLICT');
    }
    if (input.name !== undefined && !input.name.trim()) {
      throw new SavingGoalError('name cannot be empty', 400, 'BAD_REQUEST');
    }

    const targetAmount = input.targetAmount !== undefined ? parseTargetAmount(input.targetAmount) : existing.targetAmount;
    const targetDate =
      input.targetDate === undefined ? existing.targetDate : input.targetDate === null ? null : parseTargetDate(input.targetDate, 'targetDate');

    return db.savingGoal.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        targetAmount: input.targetAmount !== undefined ? targetAmount : undefined,
        targetDate,
        notes: input.notes === undefined ? undefined : input.notes,
        status: resolveStatus(existing.currentAmount, targetAmount),
      },
    });
  }

  async function updateSavingGoalProgress(input: UpdateSavingGoalProgressInput): Promise<SavingGoalRecord> {
    const { userId, id } = input;
    const existing = await findOwned(userId, id);

    if (existing.status === 'ARCHIVED') {
      throw new SavingGoalError('Target tabungan yang diarsipkan tidak dapat diperbarui progresnya', 409, 'CONFLICT');
    }

    const currentAmount = parseCurrentAmount(input.currentAmount);

    return db.savingGoal.update({
      where: { id },
      data: {
        currentAmount,
        status: resolveStatus(currentAmount, existing.targetAmount),
      },
    });
  }

  async function archiveSavingGoal(input: ArchiveSavingGoalInput): Promise<SavingGoalRecord> {
    const { userId, id } = input;
    const existing = await findOwned(userId, id);

    if (existing.status === 'ARCHIVED') {
      throw new SavingGoalError('Target tabungan sudah diarsipkan', 409, 'CONFLICT');
    }

    return db.savingGoal.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  return {
    listSavingGoals,
    getSavingGoal,
    createSavingGoal,
    updateSavingGoal,
    updateSavingGoalProgress,
    archiveSavingGoal,
  };
}

export const savingGoalService = createSavingGoalService(prisma);
