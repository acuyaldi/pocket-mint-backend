"use strict";
// ============================================================
// Recurring transaction template service
// ------------------------------------------------------------
// Owns validation and ownership checks for recurring transaction templates.
// Phase 1 only: create/read/update/delete the template row. No due-date
// computation, no transaction generation — that's a later phase. No Express
// dependency; throws typed RecurringTransactionErrors instead of writing
// HTTP responses.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recurringTransactionService = void 0;
exports.createRecurringTransactionService = createRecurringTransactionService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const recurringTransaction_errors_1 = require("./recurringTransaction.errors");
const recurringTransaction_types_1 = require("./recurringTransaction.types");
const VALID_TYPES = ['INCOME', 'EXPENSE'];
const VALID_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
function parseDate(value, field) {
    try {
        return (0, reportingTime_1.parseBusinessDate)(value, config_1.reportingConfig.timezone);
    }
    catch (error) {
        throw new recurringTransaction_errors_1.RecurringTransactionError(error instanceof Error ? `${field}: ${error.message}` : `${field} must be a valid date`, 400, 'BAD_REQUEST');
    }
}
function createRecurringTransactionService(db) {
    async function assertWalletOwnership(userId, walletId) {
        const wallet = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
        if (!wallet) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('Wallet tidak ditemukan', 404, 'NOT_FOUND');
        }
    }
    async function assertCategoryOwnership(userId, categoryId) {
        const category = await db.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
        if (!category) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('Kategori tidak ditemukan', 404, 'NOT_FOUND');
        }
    }
    async function listRecurringTransactions(userId) {
        return db.recurringTransactionTemplate.findMany({
            where: { userId },
            include: recurringTransaction_types_1.RECURRING_TRANSACTION_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
    }
    async function createRecurringTransaction(input) {
        const { userId, name, walletId, categoryId, type, description } = input;
        if (!name || !name.trim()) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('name is required', 400, 'BAD_REQUEST');
        }
        if (!type || !VALID_TYPES.includes(type)) {
            throw new recurringTransaction_errors_1.RecurringTransactionError(`type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
        }
        const { amount } = input;
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('amount is required and must be a positive number', 400, 'BAD_REQUEST');
        }
        if (!input.frequency || !VALID_FREQUENCIES.includes(input.frequency)) {
            throw new recurringTransaction_errors_1.RecurringTransactionError(`frequency is required and must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400, 'BAD_REQUEST');
        }
        if (!walletId) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('walletId is required', 400, 'BAD_REQUEST');
        }
        const startDate = parseDate(input.startDate, 'startDate');
        const endDate = input.endDate ? parseDate(input.endDate, 'endDate') : undefined;
        if (endDate && endDate < startDate) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('endDate must be on or after startDate', 400, 'BAD_REQUEST');
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
            include: recurringTransaction_types_1.RECURRING_TRANSACTION_INCLUDE,
        });
    }
    async function updateRecurringTransaction(input) {
        const { userId, id } = input;
        const existing = await db.recurringTransactionTemplate.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('Template transaksi rutin tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (input.name !== undefined && !input.name.trim()) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('name cannot be empty', 400, 'BAD_REQUEST');
        }
        if (input.type !== undefined && !VALID_TYPES.includes(input.type)) {
            throw new recurringTransaction_errors_1.RecurringTransactionError(`type must be one of: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
        }
        if (input.amount !== undefined && (isNaN(Number(input.amount)) || Number(input.amount) <= 0)) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('amount must be a positive number', 400, 'BAD_REQUEST');
        }
        if (input.frequency !== undefined && !VALID_FREQUENCIES.includes(input.frequency)) {
            throw new recurringTransaction_errors_1.RecurringTransactionError(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400, 'BAD_REQUEST');
        }
        const startDate = input.startDate !== undefined ? parseDate(input.startDate, 'startDate') : existing.startDate;
        const endDate = input.endDate !== undefined ? parseDate(input.endDate, 'endDate') : existing.endDate ?? undefined;
        if (endDate && endDate < startDate) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('endDate must be on or after startDate', 400, 'BAD_REQUEST');
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
            include: recurringTransaction_types_1.RECURRING_TRANSACTION_INCLUDE,
        });
    }
    async function deleteRecurringTransaction(input) {
        const { userId, id } = input;
        const existing = await db.recurringTransactionTemplate.findFirst({ where: { id, userId }, select: { id: true } });
        if (!existing) {
            throw new recurringTransaction_errors_1.RecurringTransactionError('Template transaksi rutin tidak ditemukan', 404, 'NOT_FOUND');
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
exports.recurringTransactionService = createRecurringTransactionService(prisma_1.default);
//# sourceMappingURL=recurringTransaction.service.js.map