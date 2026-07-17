"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const userRouter = (0, express_1.Router)();
exports.userRouter = userRouter;
// Identity bootstrap: requires a verified Supabase JWT but not a pre-existing
// local user (this route creates it). Authenticated first, so the mutation
// limiter keys by the verified user id.
userRouter.post("/sync", apiKeyAuth_1.requireVerifiedJwt, rateLimit_1.mutationLimiter, user_controller_1.UserController.sync);
//# sourceMappingURL=user.routes.js.map