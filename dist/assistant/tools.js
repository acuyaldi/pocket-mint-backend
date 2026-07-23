"use strict";
// ============================================================
// Assistant Core — registered tool definitions
// ------------------------------------------------------------
// Each export is a ToolContract that can be registered with the
// ToolRegistry. These are provider-neutral definitions — the
// provider adapter generates vendor-specific schemas from them.
//
// Phase 21.1 defines only the contract shapes; execution handlers
// are wired in Phase 21.2.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionCreate = exports.monthlySpendingSummary = void 0;
const errors_1 = require("./errors");
const TRANSACTION_KEYS = new Set([
    'type',
    'amount',
    'walletId',
    'walletReference',
    'merchantReference',
    'categoryId',
    'categoryReference',
    'date',
    'description',
]);
const MONEY_RE = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function isCalendarDay(value) {
    if (!DAY_RE.test(value))
        return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
function validateTransactionCreateInput(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'Input must be a non-null object');
    }
    const value = input;
    if (Object.keys(value).some((key) => !TRANSACTION_KEYS.has(key))) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'Input contains unsupported properties');
    }
    if (value.type !== 'INCOME' && value.type !== 'EXPENSE') {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'type must be INCOME or EXPENSE');
    }
    const amount = value.amount;
    if (typeof amount !== 'string' || !MONEY_RE.test(amount) || amount === '0' || /^0(?:\.0{1,2})?$/.test(amount)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'amount must be a positive decimal with at most two fraction digits');
    }
    const hasWalletId = value.walletId !== undefined;
    const hasWalletReference = value.walletReference !== undefined;
    if (hasWalletId === hasWalletReference) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'exactly one of walletId or walletReference is required');
    }
    if (hasWalletId
        && (typeof value.walletId !== 'string'
            || !value.walletId.trim()
            || value.walletId.length > 191)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'walletId must be a non-empty bounded string');
    }
    if (hasWalletReference
        && (typeof value.walletReference !== 'string'
            || !value.walletReference.trim()
            || Buffer.byteLength(value.walletReference, 'utf8') > 256)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'walletReference must be a non-empty bounded string');
    }
    if (value.merchantReference !== undefined
        && (typeof value.merchantReference !== 'string'
            || !value.merchantReference.trim()
            || Buffer.byteLength(value.merchantReference, 'utf8') > 256)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'merchantReference must be a non-empty bounded string');
    }
    const hasCategoryId = value.categoryId !== undefined;
    const hasCategoryReference = value.categoryReference !== undefined;
    if (hasCategoryId === hasCategoryReference) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'exactly one of categoryId or categoryReference is required');
    }
    if (hasCategoryId
        && (typeof value.categoryId !== 'string'
            || !value.categoryId.trim()
            || value.categoryId.length > 191)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'categoryId must be a non-empty bounded string');
    }
    if (hasCategoryReference
        && (typeof value.categoryReference !== 'string'
            || !value.categoryReference.trim()
            || Buffer.byteLength(value.categoryReference, 'utf8') > 256)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'categoryReference must be a non-empty bounded string');
    }
    if (typeof value.date !== 'string' || !isCalendarDay(value.date)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'date must be a valid YYYY-MM-DD day');
    }
    if (value.description !== undefined && (typeof value.description !== 'string' || !value.description.trim() || value.description.length > 500)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'description must be at most 500 characters');
    }
    const common = {
        type: value.type,
        amount,
        date: value.date,
        ...(value.description === undefined ? {} : { description: value.description.trim() }),
        ...(value.merchantReference === undefined
            ? {}
            : { merchantReference: value.merchantReference }),
    };
    const wallet = hasWalletId
        ? { walletId: value.walletId }
        : { walletReference: value.walletReference };
    const category = hasCategoryId
        ? { categoryId: value.categoryId }
        : { categoryReference: value.categoryReference };
    return { ...common, ...wallet, ...category };
}
// ---- Validation helpers ----------------------------------------------------
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
function validateMonthInput(input) {
    if (typeof input !== 'object' || input === null) {
        throw errors_1.AssistantError.invalidInput('analytics.monthly-spending-summary', 'Input must be a non-null object');
    }
    const obj = input;
    if (typeof obj.month !== 'string' || !MONTH_RE.test(obj.month)) {
        throw errors_1.AssistantError.invalidInput('analytics.monthly-spending-summary', 'month must be a string in YYYY-MM format (e.g. "2026-01")');
    }
    return { month: obj.month };
}
function validateMonthlySpendingOutput(output) {
    // TypeScript types alone don't validate model-produced input at runtime
    // (§23 of the ADR). This is a minimal structural check; it is compatible
    // with adopting JSON Schema or Zod later without changing the contract.
    if (typeof output !== 'object' || output === null) {
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'Output must be a non-null object');
    }
    const o = output;
    if (typeof o.month !== 'string')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'month must be a string');
    if (typeof o.totalIncome !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalIncome must be a number');
    if (!Number.isFinite(o.totalIncome))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalIncome must be a finite number');
    if (typeof o.totalExpense !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalExpense must be a number');
    if (!Number.isFinite(o.totalExpense))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'totalExpense must be a finite number');
    if (typeof o.netSavings !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'netSavings must be a number');
    if (!Number.isFinite(o.netSavings))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'netSavings must be a finite number');
    if (typeof o.transactionCount !== 'number')
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'transactionCount must be a number');
    if (!Number.isInteger(o.transactionCount) || o.transactionCount < 0)
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'transactionCount must be a non-negative integer');
    if (!Array.isArray(o.topCategories))
        throw errors_1.AssistantError.invalidOutput('analytics.monthly-spending-summary', 'topCategories must be an array');
    return o;
}
// ---- Tool contract ---------------------------------------------------------
/**
 * First read-only vertical-slice tool (§7 of the Phase 21.1 brief):
 *
 * Returns a structured summary of the authenticated user's spending
 * for a requested Jakarta calendar month.
 *
 * - Risk: LOW (read-only analytics)
 * - Confirmation: NONE
 * - Idempotency: NOT_REQUIRED (read is naturally idempotent)
 * - Timeout: 10 seconds
 */
exports.monthlySpendingSummary = {
    id: 'analytics.monthly-spending-summary',
    description: "Return a structured summary of the user's spending for a Jakarta calendar month (YYYY-MM). Includes total income, total expense, net savings, transaction count, and the top expense categories with percentages.",
    capability: 'analytics.read',
    riskLevel: 'LOW',
    confirmationPolicy: 'NONE',
    idempotencyPolicy: 'NOT_REQUIRED',
    timeoutMs: 10000,
    enabled: true,
    providerArguments: {
        required: ['month'],
        optional: [],
        properties: {
            month: { type: 'string', format: 'YYYY-MM', description: 'Jakarta reporting month.' },
        },
    },
    validateInput: validateMonthInput,
    validateOutput: validateMonthlySpendingOutput,
};
exports.transactionCreate = {
    id: 'transaction.create',
    description: 'Prepare a regular income or expense transaction draft. A separate explicit confirmation is required before creation.',
    capability: 'transaction.create',
    riskLevel: 'HIGH',
    confirmationPolicy: 'EXPLICIT',
    idempotencyPolicy: 'REQUIRED',
    timeoutMs: 10000,
    enabled: true,
    providerArguments: {
        required: ['amount', 'categoryReference', 'date', 'merchantReference', 'type', 'walletReference'],
        optional: ['description'],
        properties: {
            amount: { type: 'string', description: 'Positive decimal amount with at most two fraction digits.' },
            categoryReference: { type: 'string', description: 'Textual category name from the user; never invent or supply a category identifier.' },
            date: { type: 'string', format: 'YYYY-MM-DD', description: 'Transaction calendar date.' },
            description: { type: 'string', description: 'Optional short transaction description.' },
            merchantReference: { type: 'string', description: 'Textual merchant name from the user; never supply a merchant or mapping identifier.' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], description: 'Regular transaction type.' },
            walletReference: { type: 'string', description: 'Textual wallet name or alias from the user; never supply a wallet identifier.' },
        },
    },
    validateInput: validateTransactionCreateInput,
    validateOutput: validateTransactionCreateInput,
    auditRedact: ['amount', 'description', 'walletId', 'walletReference', 'merchantReference', 'categoryId', 'categoryReference', 'date'],
};
//# sourceMappingURL=tools.js.map