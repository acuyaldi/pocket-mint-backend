/** True when at least one verification key source is configured. */
export declare const jwtVerificationConfigured: boolean;
/**
 * Verify a Supabase access token and return the authenticated user's id
 * (the `sub` claim, which equals the backend `User.id`). Returns null for any
 * invalid, expired, or unverifiable token — never throws.
 */
export declare function verifySupabaseJwt(token: string): Promise<string | null>;
//# sourceMappingURL=supabaseJwt.d.ts.map