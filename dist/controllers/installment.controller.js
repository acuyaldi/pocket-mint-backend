"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaylaterRates = getPaylaterRates;
exports.getInstallments = getInstallments;
exports.payInstallment = payInstallment;
const response_1 = require("../utils/response");
const installment_query_service_1 = require("../services/installment-query.service");
const installment_payment_service_1 = require("../services/installment-payment.service");
const authContext_1 = require("../http/authContext");
const queryParsers_1 = require("../http/queryParsers");
const forwardError_1 = require("../http/forwardError");
// ponytail: static provider rates, matched against wallet name on the frontend;
// move to a DB table when rates need per-user overrides or admin management.
// rate = bunga flat %/bulan, adminFee = % dari pokok (sekali bayar, belum dipersist).
const PAYLATER_RATES = [
    { match: 'kredivo', name: 'Kredivo', rate: 2.6, adminFee: 0 },
    { match: 'spaylater', name: 'SPayLater', rate: 2.95, adminFee: 1 },
    { match: 'shopee', name: 'SPayLater', rate: 2.95, adminFee: 1 },
    { match: 'akulaku', name: 'Akulaku', rate: 3.5, adminFee: 1 },
    { match: 'gopay', name: 'GoPay Later', rate: 2.25, adminFee: 0 },
];
/**
 * Serialize one installment row into the existing numeric API shape. This is the
 * single response boundary (Decimal → number via parseFloat, exactly as before);
 * the query service never converts. Field names, ordering, and nullability are
 * preserved byte-for-byte for API compatibility. Stored contract values only —
 * no progress/remaining is computed (the schema has no paid-terms field).
 */
function serializeInstallment(inst) {
    return {
        id: inst.id,
        description: inst.description,
        walletId: inst.walletId,
        walletName: inst.wallet.name,
        walletType: inst.wallet.type,
        monthlyAmount: parseFloat(inst.monthlyAmount.toString()),
        currentTerm: inst.currentTerm,
        installmentMonths: inst.installmentMonths,
        totalAmount: parseFloat(inst.totalAmount.toString()),
        grandTotal: parseFloat(inst.grandTotal.toString()),
        totalInterest: parseFloat(inst.totalInterest.toString()),
        interestRate: parseFloat(inst.interestRate.toString()),
        status: inst.status,
        startDate: inst.startDate,
        balanceDeducted: inst.balanceDeducted,
    };
}
function serializePayment(result) {
    return {
        installment: serializeInstallment(result.installment),
        transaction: {
            ...result.transaction,
            amount: parseFloat(result.transaction.amount.toString()),
        },
    };
}
/**
 * GET /api/v1/installments/rates
 * Static paylater provider rates (bunga %/bulan + biaya admin %). No identity and
 * no database access — pure config, so it stays a thin handler in the controller.
 */
function getPaylaterRates(_req, res) {
    (0, response_1.sendSuccess)(res, PAYLATER_RATES, 'Retrieved paylater rates');
}
/**
 * GET /api/v1/installments
 * List installments for the authenticated user, optionally filtered by `status`.
 * Thin HTTP boundary: resolves the canonical `req.auth` identity, structurally
 * parses the `status` query scalar, delegates ownership-scoped reads and status
 * validation to the query service, serializes the Decimal result, and forwards
 * any thrown error (a typed 400 for an invalid status; anything unexpected to the
 * central handler). The service — never this handler — touches Prisma.
 */
async function getInstallments(req, res, next) {
    try {
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const installments = await installment_query_service_1.installmentQueryService.listInstallments({
            userId,
            status: (0, queryParsers_1.scalarString)(req.query.status),
        });
        return (0, response_1.sendSuccess)(res, installments.map(serializeInstallment), 'Retrieved installments');
    }
    catch (err) {
        return (0, forwardError_1.forwardError)(err, res, next);
    }
}
async function payInstallment(req, res, next) {
    try {
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const paid = await installment_payment_service_1.installmentPaymentService.payInstallment({
            userId,
            installmentId: req.params.id,
            sourceWalletId: req.body.sourceWalletId ?? '',
            amount: req.body.amount ?? '',
            date: req.body.date,
        });
        return (0, response_1.sendSuccess)(res, serializePayment(paid), 'Installment payment recorded');
    }
    catch (err) {
        return (0, forwardError_1.forwardError)(err, res, next);
    }
}
//# sourceMappingURL=installment.controller.js.map