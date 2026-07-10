import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/** Validate the shared API key. Returns true when it matches the configured key. */
function checkApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'];
  return Boolean(apiKey) && apiKey === process.env.API_KEY;
}

/** Normalize a header value that may arrive as string | string[] | undefined. */
function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
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
 * Identity is taken from the `x-user-id` header (Supabase UID === backend
 * User.id via /users/sync), falling back to `x-user-email` for legacy users
 * whose backend id predates the Supabase-UID sync. The resolved id is injected
 * into req.userId / req.body.userId / req.query.userId for downstream controllers.
 *
 * SECURITY: this NEVER falls back to a shared/default user. A request without a
 * valid, known user identity is rejected. Previously the middleware resolved the
 * oldest user for every request, so all users saw the same Wallets/Transactions.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!checkApiKey(req)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  const headerUserId = headerValue(req.headers['x-user-id']);
  const headerEmail = headerValue(req.headers['x-user-email']);

  if (!headerUserId && !headerEmail) {
    return res.status(401).json({ error: 'Missing user identity (x-user-id header)' });
  }

  try {
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

    // Inject the resolved id for downstream controllers. Overwrites any
    // client-supplied userId so it can never be spoofed via body/query.
    (req as any).userId = user.id;
    if (!req.body) req.body = {};
    req.body.userId = user.id;
    (req.query as any).userId = user.id;

    next();
  } catch (err) {
    console.error('requireUser middleware error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
