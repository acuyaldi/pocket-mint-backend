/**
 * How a request's identity was proven.
 *  - `jwt`            : a verified Supabase JWT (`sub` claim).
 *  - `legacy-api-key` : DEPRECATED shared API key + self-asserted `x-user-id`.
 */
export type AuthMethod = 'jwt' | 'legacy-api-key';
/**
 * The authenticated caller. Populated only after a successful auth decision.
 * Deliberately carries NO token and NO API key — only the resolved, trusted
 * identity plus the method used to prove it (for logging/metrics). `email` is
 * optional and populated only when the auth path knows it.
 */
export interface AuthContext {
    userId: string;
    email?: string;
    method: AuthMethod;
}
/**
 * The minimal request shape these helpers read: just the canonical `req.auth`
 * (added to every Express `Request` by src/types/express.d.ts). Typed
 * structurally so any `Request<...>` generic variant is accepted without an
 * `any` cast at the call site.
 */
type WithAuth = {
    auth?: AuthContext;
};
/** The canonical context, or `undefined` when the request was never authenticated. */
export declare function getAuthContext(req: WithAuth): AuthContext | undefined;
/**
 * The authenticated user id, or `undefined` when absent. Pure read — never
 * inspects headers, never verifies a token, never sends a response. Each
 * controller decides how to react to `undefined` (its existing status code),
 * so this helper stays free of HTTP-response concerns.
 */
export declare function getAuthenticatedUserId(req: WithAuth): string | undefined;
export {};
//# sourceMappingURL=authContext.d.ts.map