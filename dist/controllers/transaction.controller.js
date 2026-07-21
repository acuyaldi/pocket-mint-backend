"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = exports.serializeTransaction = void 0;
const response_1 = require("../utils/response");
const transaction_service_1 = require("../services/transaction.service");
const transaction_query_service_1 = require("../services/transaction-query.service");
const authContext_1 = require("../http/authContext");
const queryParsers_1 = require("../http/queryParsers");
const forwardError_1 = require("../http/forwardError");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
/** Allowlist create fields from the request body into the service input. */
function mapCreateTransactionRequest(req, userId) {
    const b = req.body;
    return {
        userId,
        type: b.type,
        amount: b.amount,
        walletId: b.walletId,
        toWalletId: b.toWalletId,
        categoryId: b.categoryId,
        description: b.description,
        date: b.date,
        isInstallment: b.isInstallment,
        billingMode: b.billingMode,
        installmentMonths: b.installmentMonths,
        interestRate: b.interestRate,
        firstDueDate: b.firstDueDate,
    };
}
/** Allowlist update fields from the request body into the service input. */
function mapUpdateTransactionRequest(req, userId) {
    const b = req.body;
    return {
        userId,
        id: req.params.id,
        type: b.type,
        amount: b.amount,
        description: b.description,
        date: b.date,
        categoryId: b.categoryId,
        walletId: b.walletId,
        toWalletId: b.toWalletId,
        isInstallment: b.isInstallment,
    };
}
/**
 * Allowlist + parse the supported list filters from the raw HTTP query into
 * service input. Each value is reduced to a safe scalar first (an array/object
 * shape can never reach the service or Prisma). Type validation and
 * month/year/limit normalization happen in the query service; this only extracts
 * and coerces. `userId`/`allTime` are set by the caller so a client can never
 * smuggle them in.
 */
function mapListTransactionQuery(query) {
    return {
        walletId: (0, queryParsers_1.scalarString)(query.walletId),
        // The service validates `type` against the allowed values; here we only
        // guarantee it is a scalar string (not an array/object).
        type: (0, queryParsers_1.scalarString)(query.type),
        month: (0, queryParsers_1.scalarInt)(query.month),
        year: (0, queryParsers_1.scalarInt)(query.year),
        limit: (0, queryParsers_1.scalarInt)(query.limit),
    };
}
// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = (tx) => ({
    ...tx,
    amount: parseFloat(tx.amount.toString()),
});
/** Exported so other controllers generating a Transaction (e.g. notification confirm) reuse the same serializer. */
exports.serializeTransaction = serialize;
/**
 * Parse the summary `month=YYYY-MM` query into service input. A missing,
 * non-scalar, or malformed value yields `{}` so the query service falls back to
 * the current reporting month — exactly as before.
 */
function mapSummaryQuery(query) {
    const match = /^(\d{4})-(\d{2})$/.exec((0, queryParsers_1.scalarString)(query.month) ?? '');
    return match ? { year: parseInt(match[1], 10), month: parseInt(match[2], 10) } : {};
}
/** Serialize the summary's Decimal totals into the existing numeric response. */
function serializeSummary(result) {
    return {
        income: Number(result.income.toString()),
        expenses: Number(result.expenses.toString()),
        netSavings: Number(result.netSavings.toString()),
        month: result.month,
    };
}
const EXPORT_PERIOD_MONTHS = { month: 1, quarter: 3, 'six-months': 6 };
/**
 * The half-open date range for an Analytics-page export: the given number of
 * calendar months (in the reporting timezone), ending at the reporting month
 * containing `anchor`. Mirrors the frontend's `getPeriodMonthKeys`.
 */
function resolveExportRange(period, anchor) {
    const tz = config_1.reportingConfig.timezone;
    const [year, month] = (0, reportingTime_1.formatReportingDate)(anchor, tz).split('-').map(Number);
    const endDate = (0, reportingTime_1.getReportingMonthRange)({ year, month }, tz).endExclusive;
    const count = EXPORT_PERIOD_MONTHS[period];
    let startMonth = month - (count - 1);
    let startYear = year;
    while (startMonth < 1) {
        startMonth += 12;
        startYear -= 1;
    }
    const startDate = (0, reportingTime_1.getReportingMonthRange)({ year: startYear, month: startMonth }, tz).startInclusive;
    return { startDate, endDate };
}
/** Quote a CSV field only when it needs it (contains a comma, quote, or newline). */
function csvField(value) {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
/**
 * CSV formula-injection guard (Excel/Google Sheets treat a leading =, +, -,
 * or @ as a formula trigger). Prefixing with an apostrophe forces text
 * interpretation while keeping the visible value unchanged. Applied only to
 * free-text fields the user controls — never to Amount, which must stay
 * numeric.
 */
function csvSanitizeText(value) {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
// UTF-8 BOM: Indonesian wallet/category/description text is typically plain
// ASCII, but the field is free text and Excel on Windows mojibakes non-ASCII
// UTF-8 CSVs without a BOM. Included so exported files open correctly there;
// Google Sheets and modern Excel builds ignore the BOM harmlessly.
const CSV_BOM = '﻿';
function transactionsToCsv(transactions) {
    const header = ['Date', 'Description', 'Wallet', 'Category', 'Type', 'Amount'];
    const rows = transactions.map((tx) => [
        tx.date.toISOString().slice(0, 10),
        csvSanitizeText(tx.description ?? ''),
        csvSanitizeText(tx.wallet.name),
        csvSanitizeText(tx.category?.name ?? ''),
        tx.type,
        tx.amount.toString(),
    ]);
    return CSV_BOM + [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n');
}
/**
 * Deterministic export filename derived from the actual reporting date
 * range — never from user input. `endDate` is the half-open exclusive
 * boundary from `resolveExportRange`; stepping back 1ms lands inside the
 * last reporting day so it formats as that day's calendar date.
 */
function exportFilename(startDate, endDate, zone) {
    const start = (0, reportingTime_1.formatReportingDate)(startDate, zone);
    const end = (0, reportingTime_1.formatReportingDate)(new Date(endDate.getTime() - 1), zone);
    return `financial-report-${start}_to_${end}.csv`;
}
class TransactionController {
    // GET /api/v1/transactions
    // Auto-filters to current month unless month/year explicitly provided.
    static async getAll(req, res, next) {
        try {
            // Identity comes only from the canonical auth context — never the query.
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({
                userId,
                ...mapListTransactionQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved transactions (current month)');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/transactions/summary?month=YYYY-MM
    // Monthly P&L: income, expenses, netSavings for the given calendar month
    // (defaults to current month). Filters on `date`, same as getAll.
    static async summary(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await transaction_query_service_1.transactionQueryService.getSummary({
                userId,
                ...mapSummaryQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, serializeSummary(result), 'Monthly summary');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/transactions/all — no month filter, returns everything
    static async getAllTime(req, res, next) {
        try {
            // Identity comes only from the canonical auth context — never the query.
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({
                userId,
                allTime: true,
                ...mapListTransactionQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved all transactions');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/transactions/export?period=month|quarter|six-months&anchor=YYYY-MM
    // CSV export of the Analytics page's currently selected period. `anchor` is
    // the reporting-calendar month key the Analytics page is already showing
    // (defaults to the current reporting month); date filtering happens in the
    // database, not in memory.
    static async export(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const period = (0, queryParsers_1.scalarString)(req.query.period);
            if (!period || !(period in EXPORT_PERIOD_MONTHS)) {
                return (0, response_1.sendError)(res, 'Invalid period. Allowed: month, quarter, six-months', 400);
            }
            let anchor;
            try {
                anchor = (0, reportingTime_1.parseReportingAnchor)((0, queryParsers_1.scalarString)(req.query.anchor), config_1.reportingConfig.timezone);
            }
            catch {
                return (0, response_1.sendError)(res, 'Invalid anchor date', 400);
            }
            const { startDate, endDate } = resolveExportRange(period, anchor);
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({ userId, startDate, endDate });
            const filename = exportFilename(startDate, endDate, config_1.reportingConfig.timezone);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(transactionsToCsv(transactions));
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/transactions
    // Layer 1: regular transactions (isInstallment: false)
    // Layer 2: installment transactions (isInstallment: true) — Model A architecture
    static async create(req, res, next) {
        try {
            // Identity is the authenticated caller only — never the request body/query.
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'userId is required (provide in body or use API key auth)', 400);
            }
            const created = await transaction_service_1.transactionService.createTransaction(mapCreateTransactionRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(created), 'Transaction created successfully', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PUT /api/v1/transactions/:id
    // Reverses the persisted original effect, then applies the new effect —
    // both sides of a transfer included — atomically (Invariants 1–4).
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const updated = await transaction_service_1.transactionService.updateTransaction(mapUpdateTransactionRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(updated), 'Transaction updated successfully');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // DELETE /api/v1/transactions/:id
    // Reverses the EXACT persisted effect (both transfer sides; an installment's
    // full grandTotal, not just the monthly amount) and removes the row atomically.
    static async delete(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await transaction_service_1.transactionService.deleteTransaction({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, result, `Transaction ${result.id} deleted successfully`);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map