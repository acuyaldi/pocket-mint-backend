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
 * Identity is established in order of trust:
 *   1. A verified Supabase JWT (`Authorization: Bearer <token>`). The user id is
 *      taken from the cryptographically verified `sub` claim — it cannot be
 *      spoofed. Used whenever JWT verification is configured (see supabaseJwt).
 *   2. Legacy fallback: the self-asserted `x-user-id` header (Supabase UID ===
 *      backend User.id via /users/sync), then `x-user-email`. This path trusts
 *      the caller and exists only so the frontend can migrate to Bearer tokens
 *      without a breaking change. Set AUTH_REQUIRE_JWT=true to disable it once
 *      the frontend sends tokens.
 *
 * The resolved id is injected into req.userId / req.body.userId /
 * req.query.userId, overwriting any client-supplied value so downstream
 * controllers can never be handed a spoofed userId.
 *
 * SECURITY: this NEVER falls back to a shared/default user. A request without a
 * valid, known user identity is rejected.
 */
export declare function requireUser(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=apiKeyAuth.d.ts.map