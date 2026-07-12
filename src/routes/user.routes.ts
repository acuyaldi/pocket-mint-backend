import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { mutationLimiter } from "../middleware/rateLimit";

const userRouter = Router();

// Protected by API key — used by the frontend server action during signup.
// This route resolves no user, so the mutation limiter falls back to IP keying.
userRouter.post("/sync", apiKeyAuth, mutationLimiter, UserController.sync);

export { userRouter };
