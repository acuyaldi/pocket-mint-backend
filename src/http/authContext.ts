// ============================================================
// Canonical authenticated request context (HTTP boundary)
// ------------------------------------------------------------
// One authoritative representation of "who is making this request", written by
// `requireUser` after authentication succeeds and read by controllers through
// the small helpers below. This is the ONLY source of authenticated identity:
// controllers never read `x-user-id`, never verify tokens, and never accept a
// user id from the request body or query. See src/types/express.d.ts for the
// `req.auth` declaration-merge that makes this type visible on every Request.
// ============================================================

/**
 * The authenticated caller. Populated only after a verified-JWT auth decision.
 * Deliberately carries NO token and NO raw claims — only the resolved, trusted
 * identity. `email` is the verified `email` claim, populated only where a
 * consumer needs it (the `/users/sync` bootstrap); user-scoped data routes read
 * `userId` alone. There is a single authentication method (verified JWT), so no
 * `method` discriminator is stored.
 */
export interface AuthContext {
  userId: string;
  email?: string;
}

/**
 * The minimal request shape these helpers read: just the canonical `req.auth`
 * (added to every Express `Request` by src/types/express.d.ts). Typed
 * structurally so any `Request<...>` generic variant is accepted without an
 * `any` cast at the call site.
 */
type WithAuth = { auth?: AuthContext };

/**
 * The authenticated user id, or `undefined` when absent. Pure read — never
 * inspects headers, never verifies a token, never sends a response. Each
 * controller decides how to react to `undefined` (its existing status code),
 * so this helper stays free of HTTP-response concerns.
 */
export function getAuthenticatedUserId(req: WithAuth): string | undefined {
  return req.auth?.userId;
}
