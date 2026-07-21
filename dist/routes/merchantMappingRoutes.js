"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantMappingRouter = void 0;
const express_1 = require("express");
const merchantMapping_controller_1 = require("../controllers/merchantMapping.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const merchantMappingRouter = (0, express_1.Router)();
exports.merchantMappingRouter = merchantMappingRouter;
// GET /api/v1/merchant-mappings?search=
merchantMappingRouter.get('/', apiKeyAuth_1.requireUser, merchantMapping_controller_1.MerchantMappingController.list);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
merchantMappingRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, merchantMapping_controller_1.MerchantMappingController.create);
merchantMappingRouter.patch('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, merchantMapping_controller_1.MerchantMappingController.update);
merchantMappingRouter.delete('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, merchantMapping_controller_1.MerchantMappingController.remove);
//# sourceMappingURL=merchantMappingRoutes.js.map