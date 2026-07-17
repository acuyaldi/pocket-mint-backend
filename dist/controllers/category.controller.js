"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = getCategories;
const category_service_1 = require("../services/category.service");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const response_1 = require("../utils/response");
async function getCategories(req, res, next) {
    try {
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const categories = await category_service_1.categoryService.listCategories(userId);
        return (0, response_1.sendSuccess)(res, categories, 'Retrieved categories');
    }
    catch (error) {
        return (0, forwardError_1.forwardError)(error, res, next);
    }
}
//# sourceMappingURL=category.controller.js.map