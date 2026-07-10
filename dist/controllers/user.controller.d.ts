import { Request, Response, NextFunction } from "express";
export declare class UserController {
    /**
     * POST /api/v1/users/sync
     * Sync a Supabase Auth user into the Prisma `users` table.
     * If the user (by email) already exists, return the existing record.
     * Protected by apiKeyAuth middleware.
     */
    static sync(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=user.controller.d.ts.map