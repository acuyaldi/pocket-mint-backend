"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaylaterRates = getPaylaterRates;
exports.getInstallments = getInstallments;
const prisma_1 = __importDefault(require("../lib/prisma"));
const response_1 = require("../utils/response");
const VALID_STATUSES = ['ACTIVE', 'SETTLED', 'CANCELLED'];
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
 * GET /api/v1/installments/rates
 * Static paylater provider rates (bunga %/bulan + biaya admin %).
 */
function getPaylaterRates(_req, res) {
    (0, response_1.sendSuccess)(res, PAYLATER_RATES, 'Retrieved paylater rates');
}
/**
 * GET /api/v1/installments
 * List installments for the authenticated user, optionally filtered by status.
 * Includes wallet name and type via relation.
 */
async function getInstallments(req, res, next) {
    try {
        const userId = req.userId;
        const { status } = req.query;
        if (status && !VALID_STATUSES.includes(status)) {
            return (0, response_1.sendError)(res, `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`, 400);
        }
        const installments = await prisma_1.default.installment.findMany({
            where: {
                userId,
                ...(status && { status: status }),
            },
            include: {
                wallet: { select: { id: true, name: true, type: true } },
            },
            orderBy: { startDate: 'desc' },
        });
        // Serialize Decimal fields to number
        const serialized = installments.map((inst) => ({
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
        }));
        (0, response_1.sendSuccess)(res, serialized, 'Retrieved installments');
    }
    catch (err) {
        console.error('getInstallments error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=installment.controller.js.map