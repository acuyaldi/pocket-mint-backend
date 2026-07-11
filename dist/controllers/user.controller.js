"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const response_1 = require("../utils/response");
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
     * Sync a Supabase Auth user into the Prisma `users` table.
     * If the user (by email) already exists, return the existing record.
     * Protected by apiKeyAuth middleware.
     */
    static async sync(req, res, next) {
        try {
            // `password` (and any other unexpected field) is intentionally ignored:
            // credentials are owned by Supabase Auth and never stored here.
            const { supabaseId, email, name } = req.body;
            if (!email || !name) {
                return (0, response_1.sendError)(res, "email and name are required", 400);
            }
            // Check if user already exists by email
            const existing = await prisma_1.default.user.findUnique({
                where: { email },
                select: userSelect,
            });
            if (existing) {
                return (0, response_1.sendSuccess)(res, existing, "User already exists");
            }
            // Create new user in Prisma. The local row references the verified
            // Supabase identity via `id` (the JWT `sub`); no password is persisted.
            const user = await prisma_1.default.user.create({
                data: {
                    id: supabaseId ?? undefined, // Use Supabase UID if provided
                    email,
                    name,
                },
                select: userSelect,
            });
            (0, response_1.sendSuccess)(res, user, "User synced successfully", 201);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map