"use strict";
// ============================================================
// Budget command service (Phase B1 — budgeting-api-contract.md)
// ------------------------------------------------------------
// Owns Budget mutation business rules: amount validation, category
// eligibility, ownership checks, and the archive/restore state machine. No
// Express dependency; returns the raw persisted Budget (Decimal `amount`
// intact) or throws a typed BudgetError instead of writing HTTP responses.
// Kept separate from budget-query.service.ts (usage calculation stays there)
// and from any controller/route/DTO-serialization concern (Phase B2).
//
// Every mutation is a single write (create / update; cascade delete is not
// exposed in MVP — PD-009), so no `$transaction` boundary is opened here,
// matching wallet.service.ts / savingGoal.service.ts.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetService = void 0;
exports.createBudgetService = createBudgetService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const budget_errors_1 = require("./budget.errors");
const AMOUNT_SCALE = 2;
// Decimal(15,2): 13 integer digits + 2 decimal places.
const AMOUNT_MAX = new client_1.Prisma.Decimal('9999999999999.99');
/**
 * Parse and validate a Budget `amount`. One reusable path so a future
 * controller never has to duplicate this rule. Distinguishes malformed input
 * (400 BAD_REQUEST) from a well-formed but out-of-range value (422
 * INVALID_AMOUNT), per the API contract's error table.
 */
function parseBudgetAmount(value) {
    if (value === undefined || value === null || value === '') {
        throw new budget_errors_1.BudgetError('amount is required', 400, 'BAD_REQUEST');
    }
    let amount;
    try {
        amount = new client_1.Prisma.Decimal(value);
    }
    catch {
        throw new budget_errors_1.BudgetError('amount must be a valid number', 400, 'BAD_REQUEST');
    }
    if (!amount.isFinite()) {
        throw new budget_errors_1.BudgetError('amount must be a valid number', 400, 'BAD_REQUEST');
    }
    if (amount.lessThanOrEqualTo(0)) {
        throw new budget_errors_1.BudgetError('amount must be greater than zero', 422, 'INVALID_AMOUNT');
    }
    if (amount.decimalPlaces() > AMOUNT_SCALE) {
        throw new budget_errors_1.BudgetError('amount must have at most 2 decimal places', 422, 'INVALID_AMOUNT');
    }
    if (amount.greaterThan(AMOUNT_MAX)) {
        throw new budget_errors_1.BudgetError('amount exceeds the maximum supported value', 422, 'INVALID_AMOUNT');
    }
    return amount;
}
function createBudgetService(db) {
    /** Ownership-scoped lookup; a missing or another user's Budget is one indistinguishable 404. */
    async function findOwned(userId, id) {
        const budget = await db.budget.findFirst({ where: { id, userId } });
        if (!budget) {
            throw new budget_errors_1.BudgetError('Anggaran tidak ditemukan', 404, 'NOT_FOUND');
        }
        return budget;
    }
    /**
     * Create a Budget for a user-owned EXPENSE category. Rejects if any Budget
     * — active or archived — already exists for (userId, categoryId): an
     * archived duplicate is never silently restored, the caller must use the
     * explicit restore command. The pre-check is a friendly fast path; the
     * `@@unique([userId, categoryId])` constraint is the real guarantee, so a
     * concurrent create is still translated from the raw P2002 into the same
     * typed BUDGET_ALREADY_EXISTS error.
     */
    async function createBudget(input) {
        const { userId, categoryId } = input;
        const amount = parseBudgetAmount(input.amount);
        const category = await db.category.findFirst({ where: { id: categoryId, userId } });
        if (!category) {
            throw new budget_errors_1.BudgetError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
        }
        if (category.type !== 'EXPENSE') {
            throw new budget_errors_1.BudgetError('Kategori bukan kategori pengeluaran', 422, 'CATEGORY_NOT_EXPENSE');
        }
        const existing = await db.budget.findFirst({ where: { userId, categoryId } });
        if (existing) {
            throw new budget_errors_1.BudgetError('Anggaran untuk kategori ini sudah ada', 409, 'BUDGET_ALREADY_EXISTS');
        }
        try {
            return await db.budget.create({ data: { userId, categoryId, amount } });
        }
        catch (err) {
            if (err instanceof budget_errors_1.BudgetError)
                throw err;
            if (err.code === 'P2002') {
                throw new budget_errors_1.BudgetError('Anggaran untuk kategori ini sudah ada', 409, 'BUDGET_ALREADY_EXISTS');
            }
            throw err;
        }
    }
    /**
     * Update a Budget's amount. `categoryId` is not part of this input at all —
     * category reassignment is not a supported command (PD-009). Permitted on
     * an archived Budget (the row still exists and may be restored later with
     * the new amount already applied) — the API contract explicitly allows
     * this, so no archived-state guard is added here.
     */
    async function updateBudgetAmount(input) {
        const { userId, budgetId } = input;
        await findOwned(userId, budgetId);
        const amount = parseBudgetAmount(input.amount);
        return db.budget.update({ where: { id: budgetId }, data: { amount } });
    }
    /** Active → archived. Repeating the call is an explicit conflict, not a silent no-op. */
    async function archiveBudget(input) {
        const { userId, budgetId } = input;
        const existing = await findOwned(userId, budgetId);
        if (existing.isArchived) {
            throw new budget_errors_1.BudgetError('Anggaran sudah diarsipkan', 409, 'ALREADY_ARCHIVED');
        }
        return db.budget.update({ where: { id: budgetId }, data: { isArchived: true } });
    }
    /**
     * Archived → active. Repeating the call is an explicit conflict. Restores
     * the same row (userId+categoryId is globally unique) — never creates a
     * new Budget.
     */
    async function restoreBudget(input) {
        const { userId, budgetId } = input;
        const existing = await findOwned(userId, budgetId);
        if (!existing.isArchived) {
            throw new budget_errors_1.BudgetError('Anggaran sudah aktif', 409, 'ALREADY_ACTIVE');
        }
        return db.budget.update({ where: { id: budgetId }, data: { isArchived: false } });
    }
    return { createBudget, updateBudgetAmount, archiveBudget, restoreBudget };
}
/** Production instance bound to the shared Prisma singleton. */
exports.budgetService = createBudgetService(prisma_1.default);
//# sourceMappingURL=budget.service.js.map