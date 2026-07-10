import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { verifySupabaseJwt, jwtVerificationConfigured } from '../utils/supabaseJwt';

/**
 * When 'true', a verified Supabase JWT is mandatory and the legacy
 * self-asserted header identity path is disabled. Defaults to off so the
 * frontend can migrate to Bearer tokens without a breaking change.
 */
const requireJwt = process.env.AUTH_REQUIRE_JWT === 'true';

/** Validate the shared API key. Returns true when it matches the configured key. */
function checkApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'];
  return Boolean(apiKey) && apiKey === process.env.API_KEY;
}

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

/** Inject the resolved, trusted user id for downstream controllers, then continue. */
function injectUser(req: Request, userId: string, next: NextFunction): void {
  (req as any).userId = userId;
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
  if (!checkApiKey(req)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

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
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!checkApiKey(req)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  try {
    // 1. Preferred: cryptographically verified Supabase JWT.
    const token = bearerToken(req.headers.authorization);
    if (token && jwtVerificationConfigured) {
      const verifiedUserId = await verifySupabaseJwt(token);
      if (verifiedUserId) {
        const user = await prisma.user.findUnique({ where: { id: verifiedUserId }, select: { id: true } });
        if (!user) {
          return res.status(401).json({ error: 'Unknown user' });
        }
        return injectUser(req, user.id, next);
      }
      // Token supplied but invalid/expired.
      if (requireJwt) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    } else if (requireJwt) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    // 2. Legacy fallback: self-asserted header identity (temporary; see docblock).
    const headerUserId = headerValue(req.headers['x-user-id']);
    const headerEmail = headerValue(req.headers['x-user-email']);

    if (!headerUserId && !headerEmail) {
      return res.status(401).json({ error: 'Missing user identity (x-user-id header)' });
    }

    let user: { id: string } | null = null;
    if (headerUserId) {
      user = await prisma.user.findUnique({ where: { id: headerUserId }, select: { id: true } });
    }
    if (!user && headerEmail) {
      user = await prisma.user.findUnique({ where: { email: headerEmail }, select: { id: true } });
    }

    if (!user) {
      return res.status(401).json({ error: 'Unknown user' });
    }

    return injectUser(req, user.id, next);
  } catch (err) {
    console.error('requireUser middleware error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
