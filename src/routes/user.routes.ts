import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const userRouter = Router();

// Protected by API key — used by the frontend server action during signup
userRouter.post("/sync", apiKeyAuth, UserController.sync);

export { userRouter };
