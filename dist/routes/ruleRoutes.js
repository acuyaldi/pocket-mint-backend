"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleRouter = void 0;
const express_1 = require("express");
const rule_controller_1 = require("../controllers/rule.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const ruleRouter = (0, express_1.Router)();
exports.ruleRouter = ruleRouter;
// GET /api/v1/rules
ruleRouter.get('/', apiKeyAuth_1.requireUser, rule_controller_1.RuleController.list);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
ruleRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, rule_controller_1.RuleController.create);
// Must be registered before '/:id' so 'reorder' isn't captured as an id.
ruleRouter.patch('/reorder', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, rule_controller_1.RuleController.reorder);
ruleRouter.patch('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, rule_controller_1.RuleController.update);
ruleRouter.delete('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, rule_controller_1.RuleController.remove);
//# sourceMappingURL=ruleRoutes.js.map