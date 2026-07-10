import { Request, Response, NextFunction } from 'express';
/**
 * API-key gate ONLY — does not resolve a user.
 * Used by endpoints that run before the user exists in the backend
 * (e.g. POST /users/sync during signup).
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * API-key gate + authenticated-user resolution.
 *
 * Identity is taken from the `x-user-id` header (Supabase UID === backend
 * User.id via /users/sync), falling back to `x-user-email` for legacy users
 * whose backend id predates the Supabase-UID sync. The resolved id is injected
 * into req.userId / req.body.userId / req.query.userId for downstream controllers.
 *
 * SECURITY: this NEVER falls back to a shared/default user. A request without a
 * valid, known user identity is rejected. Previously the middleware resolved the
 * oldest user for every request, so all users saw the same Wallets/Transactions.
 */
export declare function requireUser(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=apiKeyAuth.d.ts.map