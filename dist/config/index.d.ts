import 'dotenv/config';
export declare const isProduction: boolean;
export declare const serverConfig: {
    readonly nodeEnv: string;
    readonly port: number;
};
export declare const reportingConfig: {
    readonly timezone: string;
};
export declare const authConfig: {
    readonly jwt: {
        /** HS256 shared secret (Supabase Project Settings > API > JWT Secret). */
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
export declare const trustProxy: number | boolean;
/**
 * Rate-limiting configuration. NOTE: the default limiter store is in-memory and
 * therefore PER INSTANCE — limits are not shared across horizontally scaled
 * processes. Move to a shared store (e.g. Redis) when running more than one
 * instance.
 */
export declare const rateLimitConfig: {
    readonly enabled: boolean;
    readonly windowMs: number;
    /** Max requests per window for general API traffic. */
    readonly max: number;
    /** Stricter cap per window for mutating requests (POST/PUT/PATCH/DELETE). */
    readonly mutationMax: number;
};
export declare const corsConfig: {
    /** Exact origins allowed for browser requests. */
    readonly allowedOrigins: string[];
    /** True when falling back to dev defaults (no explicit allowlist configured). */
    readonly usingDevDefault: boolean;
};
/**
 * Validate configuration at startup. Fatal problems throw in production so the
 * process fails fast; in development they are surfaced as warnings so local
 * work is not blocked. Never prints secret values.
 */
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map