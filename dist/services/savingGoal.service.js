"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savingGoalService = void 0;
exports.createSavingGoalService = createSavingGoalService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const reportingTime_1 = require("../domain/reportingTime");
const config_1 = require("../config");
const savingGoal_errors_1 = require("./savingGoal.errors");
const MONEY_SCALE = 2;
const MONEY_ROUNDING = client_1.Prisma.Decimal.ROUND_HALF_UP;
function toMoney(value) {
    return value.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}
function parseTargetDate(value, field) {
    try {
        return (0, reportingTime_1.parseBusinessDate)(value, config_1.reportingConfig.timezone);
    }
    catch (error) {
        throw new savingGoal_errors_1.SavingGoalError(error instanceof Error ? `${field}: ${error.message}` : `${field} must be a valid date`, 400, 'BAD_REQUEST');
    }
}
function parseTargetAmount(value) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
        throw new savingGoal_errors_1.SavingGoalError('targetAmount is required and must be a positive number', 400, 'BAD_REQUEST');
    }
    const amount = toMoney(new client_1.Prisma.Decimal(value));
    if (amount.lessThanOrEqualTo(0)) {
        throw new savingGoal_errors_1.SavingGoalError('targetAmount is required and must be a positive number', 400, 'BAD_REQUEST');
    }
    return amount;
}
function parseCurrentAmount(value) {
    const amount = toMoney(new client_1.Prisma.Decimal((value ?? 0)));
    if (amount.lessThan(0)) {
        throw new savingGoal_errors_1.SavingGoalError('currentAmount must be zero or a positive number', 400, 'BAD_REQUEST');
    }
    return amount;
}
/** Non-archived goals recompute deterministically; ARCHIVED never changes automatically. */
function resolveStatus(currentAmount, targetAmount) {
    return currentAmount.greaterThanOrEqualTo(targetAmount) ? 'COMPLETED' : 'ACTIVE';
}
function createSavingGoalService(db) {
    async function findOwned(userId, id) {
        const goal = await db.savingGoal.findFirst({ where: { id, userId } });
        if (!goal) {
            throw new savingGoal_errors_1.SavingGoalError('Target tabungan tidak ditemukan', 404, 'NOT_FOUND');
        }
        return goal;
    }
    async function listSavingGoals(userId) {
        return db.savingGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    }
    async function getSavingGoal(input) {
        return findOwned(input.userId, input.id);
    }
    async function createSavingGoal(input) {
        const { userId, name } = input;
        if (!name || !name.trim()) {
            throw new savingGoal_errors_1.SavingGoalError('name is required', 400, 'BAD_REQUEST');
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
    async function updateSavingGoal(input) {
        const { userId, id } = input;
        const existing = await findOwned(userId, id);
        if (existing.status === 'ARCHIVED') {
            throw new savingGoal_errors_1.SavingGoalError('Target tabungan yang diarsipkan tidak dapat diubah', 409, 'CONFLICT');
        }
        if (input.name !== undefined && !input.name.trim()) {
            throw new savingGoal_errors_1.SavingGoalError('name cannot be empty', 400, 'BAD_REQUEST');
        }
        const targetAmount = input.targetAmount !== undefined ? parseTargetAmount(input.targetAmount) : existing.targetAmount;
        const targetDate = input.targetDate === undefined ? existing.targetDate : input.targetDate === null ? null : parseTargetDate(input.targetDate, 'targetDate');
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
    async function updateSavingGoalProgress(input) {
        const { userId, id } = input;
        const existing = await findOwned(userId, id);
        if (existing.status === 'ARCHIVED') {
            throw new savingGoal_errors_1.SavingGoalError('Target tabungan yang diarsipkan tidak dapat diperbarui progresnya', 409, 'CONFLICT');
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
    async function archiveSavingGoal(input) {
        const { userId, id } = input;
        const existing = await findOwned(userId, id);
        if (existing.status === 'ARCHIVED') {
            throw new savingGoal_errors_1.SavingGoalError('Target tabungan sudah diarsipkan', 409, 'CONFLICT');
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
exports.savingGoalService = createSavingGoalService(prisma_1.default);
//# sourceMappingURL=savingGoal.service.js.map