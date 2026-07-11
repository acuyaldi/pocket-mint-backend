import { type RateLimitRequestHandler } from 'express-rate-limit';
/** General limiter for all API traffic. Never limits CORS preflight. */
export declare const generalLimiter: RateLimitRequestHandler;
/**
 * Stricter limiter for mutating requests. Applied alongside the general
 * limiter; skips preflight and safe (GET/HEAD) methods so only writes are
 * throttled harder.
 */
export declare const mutationLimiter: RateLimitRequestHandler;
//# sourceMappingURL=rateLimit.d.ts.map