import 'dotenv/config';
export declare const isProduction: boolean;
export declare const serverConfig: {
    readonly nodeEnv: string;
    readonly port: number;
};
export declare const authConfig: {
    /** True once the frontend migration is complete; disables the legacy path entirely. */
    readonly requireJwt: boolean;
    readonly jwt: {
        /** Legacy HS256 shared secret (Supabase "JWT Secret"). */
        readonly secret: string | undefined;
        /** Base URL used to derive the JWKS endpoint for asymmetric signing keys. */
        readonly supabaseUrl: string | undefined;
        /** Expected `aud` claim; always verified. */
        readonly audience: string;
        /** Expected `iss` claim; verified only when configured/derivable. */
        readonly issuer: string | undefined;
        /** True when at least one verification key source is configured. */
        readonly configured: boolean;
    };
};
/**
 * Constant-time comparison of a candidate API key against the configured key.
 * Length is compared first (an unavoidable, acceptable leak); the byte
 * comparison itself is timing-safe.
 */
export declare function verifyApiKey(candidate: string | undefined): boolean;
/** True when a legacy API key is configured at all. */
export declare const apiKeyConfigured: boolean;
/**
 * Validate configuration at startup. Fatal problems throw in production so the
 * process fails fast; in development they are surfaced as warnings so local
 * work is not blocked. Never prints secret values.
 */
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map