import { Request, Response, NextFunction } from 'express';
import type { AuthMethod } from '../http/authContext';
export type { AuthMethod };
/**
 * API-key gate ONLY — does not resolve a user.
 * Used by endpoints that run before the user exists in the backend
 * (e.g. POST /users/sync during signup).
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * API-key gate + authenticated-user resolution.
 *
 * Authentication decision tree (strict — the order below is the contract):
 *
 *   1. An `Authorization: Bearer <token>` was supplied → treated as a JWT login.
 *        - verify it → success: identity is the verified `sub` claim.
 *        - failure (invalid/expired/unverifiable) → 401. NEVER falls back to
 *          the legacy header path. A bearer token is authoritative; any
 *          `x-user-id` on the same request is ignored.
 *   2. No bearer token and AUTH_REQUIRE_JWT=true → 401 (legacy path disabled).
 *   3. No bearer token and compatibility mode (AUTH_REQUIRE_JWT=false):
 *        DEPRECATED legacy path — validate the shared API key, then resolve the
 *        self-asserted `x-user-id` / `x-user-email` header. This trusts the
 *        caller and exists only so the frontend can migrate to Bearer tokens
 *        without a breaking change. Remove once migration completes.
 *
 * The resolved id is published as the canonical `req.auth` context; the request
 * body and query are never mutated, so downstream controllers can never be
 * handed a spoofed userId (a client-supplied body/query `userId` is ignored).
 *
 * SECURITY: this NEVER falls back to a shared/default user.
 */
export declare function requireUser(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=apiKeyAuth.d.ts.map