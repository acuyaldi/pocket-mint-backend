import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { sendSuccess, sendError } from "../utils/response";

export class UserController {
  /**
   * POST /api/v1/users/sync
   * Sync a Supabase Auth user into the Prisma `users` table.
   * If the user (by email) already exists, return the existing record.
   * Protected by apiKeyAuth middleware.
   */
  static async sync(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { supabaseId, email, name } = req.body;

      if (!email || !name) {
        return sendError(res, "email and name are required", 400);
      }

      // Check if user already exists by email
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return sendSuccess(res, existing, "User already exists");
      }

      // Create new user in Prisma
      const user = await prisma.user.create({
        data: {
          id: supabaseId ?? undefined, // Use Supabase UID if provided
          email,
          name,
          password: "supabase-auth", // placeholder — actual auth is via Supabase
        },
      });

      sendSuccess(res, user, "User synced successfully", 201);
    } catch (err) {
      next(err);
    }
  }
}
