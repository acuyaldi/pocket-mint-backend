"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const userRouter = (0, express_1.Router)();
exports.userRouter = userRouter;
// Protected by API key — used by the frontend server action during signup.
// This route resolves no user, so the mutation limiter falls back to IP keying.
userRouter.post("/sync", apiKeyAuth_1.apiKeyAuth, rateLimit_1.mutationLimiter, user_controller_1.UserController.sync);
//# sourceMappingURL=user.routes.js.map