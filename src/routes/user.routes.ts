import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireVerifiedJwt } from "../middleware/apiKeyAuth";
import { mutationLimiter } from "../middleware/rateLimit";

const userRouter = Router();

// Identity bootstrap: requires a verified Supabase JWT but not a pre-existing
// local user (this route creates it). Authenticated first, so the mutation
// limiter keys by the verified user id.
userRouter.post("/sync", requireVerifiedJwt, mutationLimiter, UserController.sync);

export { userRouter };
