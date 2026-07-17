"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const response_1 = require("../utils/response");
const authContext_1 = require("../http/authContext");
const category_service_1 = require("../services/category.service");
/**
 * Explicit response projection for a user. Using a fixed `select` (never
 * `include` / bare model) guarantees only these fields are ever serialized to
 * the client, so a future sensitive column cannot leak by accident.
 */
const userSelect = {
    id: true,
    email: true,
    name: true,
    avatarUrl: true,
    createdAt: true,
    updatedAt: true,
};
class UserController {
    /**
     * POST /api/v1/users/sync
     * Provision (or return) the local `users` row for the AUTHENTICATED caller.
     *
     * Identity is the verified JWT `sub` (published as `req.auth.userId` by
     * `requireVerifiedJwt`) — it is the sole authority for the local row's `id`.
     * A `supabaseId` in the body is ignored, so a caller can only ever sync
     * THEMSELVES. Email prefers the verified `email` claim, falling back to the
     * body only when the token carries none. Idempotent: a known user is a no-op
     * (200); an unknown one is created (201). `password` and any other unexpected
     * field are ignored — credentials are owned by Supabase Auth, never stored.
     */
    static async sync(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                // Defensive: requireVerifiedJwt guarantees this, but never trust a
                // missing identity to fall through to a write.
                return (0, response_1.sendError)(res, "Invalid or missing authentication credentials", 401);
            }
            const { email: bodyEmail, name } = req.body ?? {};
            const email = req.auth?.email ?? bodyEmail;
            if (!email || !name) {
                return (0, response_1.sendError)(res, "email and name are required", 400);
            }
            // Look up by the verified identity (the JWT `sub` == local User.id), never
            // by a client-supplied id or email — so one user can never adopt another's
            // row.
            const existing = await prisma_1.default.user.findUnique({
                where: { id: userId },
                select: userSelect,
            });
            if (existing) {
                await category_service_1.categoryService.ensureDefaultCategories(userId);
                return (0, response_1.sendSuccess)(res, existing, "User already exists");
            }
            // Create the local row keyed to the verified Supabase identity.
            const user = await prisma_1.default.user.create({
                data: { id: userId, email, name },
                select: userSelect,
            });
            await category_service_1.categoryService.ensureDefaultCategories(userId);
            (0, response_1.sendSuccess)(res, user, "User synced successfully", 201);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map