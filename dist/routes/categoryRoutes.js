"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRouter = void 0;
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const categoryRouter = (0, express_1.Router)();
exports.categoryRouter = categoryRouter;
categoryRouter.get('/', apiKeyAuth_1.requireUser, category_controller_1.getCategories);
//# sourceMappingURL=categoryRoutes.js.map