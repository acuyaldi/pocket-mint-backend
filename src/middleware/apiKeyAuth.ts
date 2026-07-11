import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { verifySupabaseJwt } from '../utils/supabaseJwt';
import { authConfig, verifyApiKey } from '../config';
import { recordLegacyAuthUsage } from '../utils/logger';

/**
 * Authentication method resolved for a request.
 *  - `jwt`             : identity proven by a verified Supabase JWT (`sub`).
 *  - `legacy-api-key`  : DEPRECATED shared API key + self-asserted `x-user-id`.
 */
export type AuthMethod = 'jwt' | 'legacy-api-key';

/** Normalize a header value that may arrive as string | string[] | undefined. */
function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Extract a Bearer token from an Authorization header, if present. */
function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value.trim() : undefined;
}

/** Uniform 401 in the existing `{ error }` shape (preserves current frontend contract). */
function unauthorized(res: Response, message: string): void {
  res.status(401).json({ error: message });
}

/** Inject the resolved, trusted user id for downstream controllers, then continue. */
function injectUser(req: Request, userId: string, method: AuthMethod, next: NextFunction): void {
  (req as any).userId = userId;
  (req as any).authMethod = method;
  if (!req.body) req.body = {};
  req.body.userId = userId;
  (req.query as any).userId = userId;
  next();
}

/**
 * API-key gate ONLY — does not resolve a user.
 * Used by endpoints that run before the user exists in the backend
 * (e.g. POST /users/sync during signup).
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (!verifyApiKey(headerValue(req.headers['x-api-key']))) {
    return unauthorized(res, 'Invalid or missing API key');
  }
  next();
}

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
 * The resolved id is injected into req.userId / req.body.userId /
 * req.query.userId, overwriting any client-supplied value so downstream
 * controllers can never be handed a spoofed userId.
 *
 * SECURITY: this NEVER falls back to a shared/default user.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = bearerToken(req.headers.authorization);

    // 1. Bearer token present → JWT login attempt, authoritative, no fallback.
    if (token) {
      const verifiedUserId = await verifySupabaseJwt(token);
      if (!verifiedUserId) {
        return unauthorized(res, 'Invalid or expired token');
      }
      const user = await prisma.user.findUnique({
        where: { id: verifiedUserId },
        select: { id: true },
      });
      if (!user) {
        return unauthorized(res, 'Unknown user');
      }
      return injectUser(req, user.id, 'jwt', next);
    }

    // 2. No bearer token and JWT-only mode → reject.
    if (authConfig.requireJwt) {
      return unauthorized(res, 'Missing bearer token');
    }

    // 3. DEPRECATED legacy compatibility path: API key + self-asserted identity.
    if (!verifyApiKey(headerValue(req.headers['x-api-key']))) {
      return unauthorized(res, 'Invalid or missing API key');
    }

    const headerUserId = headerValue(req.headers['x-user-id']);
    const headerEmail = headerValue(req.headers['x-user-email']);
    if (!headerUserId && !headerEmail) {
      return unauthorized(res, 'Missing user identity (x-user-id header)');
    }

    let user: { id: string } | null = null;
    if (headerUserId) {
      user = await prisma.user.findUnique({ where: { id: headerUserId }, select: { id: true } });
    }
    if (!user && headerEmail) {
      user = await prisma.user.findUnique({ where: { email: headerEmail }, select: { id: true } });
    }
    if (!user) {
      return unauthorized(res, 'Unknown user');
    }

    recordLegacyAuthUsage();
    return injectUser(req, user.id, 'legacy-api-key', next);
  } catch (err) {
    console.error('requireUser middleware error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
