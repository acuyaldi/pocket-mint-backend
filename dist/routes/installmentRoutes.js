"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installmentRouter = void 0;
const express_1 = require("express");
const installment_controller_1 = require("../controllers/installment.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const installmentRouter = (0, express_1.Router)();
exports.installmentRouter = installmentRouter;
// GET /api/v1/installments?status=ACTIVE
installmentRouter.get('/', apiKeyAuth_1.requireUser, installment_controller_1.getInstallments);
// GET /api/v1/installments/rates — static provider rates
installmentRouter.get('/rates', apiKeyAuth_1.requireUser, installment_controller_1.getPaylaterRates);
// POST /api/v1/installments/:id/pay - records one installment repayment
installmentRouter.post('/:id/pay', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, installment_controller_1.payInstallment);
//# sourceMappingURL=installmentRoutes.js.map