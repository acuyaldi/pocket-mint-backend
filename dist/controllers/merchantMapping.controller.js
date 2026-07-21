"use strict";
// ============================================================
// Merchant mapping controller (Phase 19)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls
// merchantMapping.service.ts, and maps the result through the single
// `toMerchantMappingDto` serializer. Mirrors budget.controller.ts's shape.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantMappingController = void 0;
const response_1 = require("../utils/response");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const merchantMapping_service_1 = require("../services/merchantMapping.service");
const queryParsers_1 = require("../http/queryParsers");
/** Canonical MerchantMappingDto mapper — the ONLY place a mapping is serialized for HTTP. */
function toMerchantMappingDto(mapping) {
    return {
        id: mapping.id,
        merchantName: mapping.merchantName,
        normalizedMerchant: mapping.normalizedMerchant,
        categoryId: mapping.categoryId,
        createdAt: mapping.createdAt.toISOString(),
        updatedAt: mapping.updatedAt.toISOString(),
    };
}
class MerchantMappingController {
    // GET /api/v1/merchant-mappings?search=
    static async list(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const search = (0, queryParsers_1.scalarString)(req.query.search);
            const mappings = await merchantMapping_service_1.merchantMappingService.list({ userId, search });
            (0, response_1.sendSuccess)(res, mappings.map(toMerchantMappingDto), 'Retrieved merchant mappings');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/merchant-mappings
    static async create(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const created = await merchantMapping_service_1.merchantMappingService.create({
                userId,
                merchantName: req.body.merchantName,
                categoryId: req.body.categoryId,
            });
            (0, response_1.sendSuccess)(res, toMerchantMappingDto(created), 'Merchant mapping berhasil dibuat', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/merchant-mappings/:id
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const updated = await merchantMapping_service_1.merchantMappingService.update({
                userId,
                mappingId: req.params.id,
                merchantName: req.body.merchantName,
                categoryId: req.body.categoryId,
            });
            (0, response_1.sendSuccess)(res, toMerchantMappingDto(updated), 'Merchant mapping berhasil diperbarui');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // DELETE /api/v1/merchant-mappings/:id
    static async remove(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            await merchantMapping_service_1.merchantMappingService.remove({ userId, mappingId: req.params.id });
            (0, response_1.sendSuccess)(res, null, 'Merchant mapping berhasil dihapus');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.MerchantMappingController = MerchantMappingController;
//# sourceMappingURL=merchantMapping.controller.js.map