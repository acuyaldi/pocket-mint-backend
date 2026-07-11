"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutationLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const config_1 = require("../config");
/**
 * Rate-limit key: a verified user id when one is available (set by
 * `requireUser` after authentication), otherwise the normalized client IP.
 *
 * The self-asserted `x-user-id` header is NEVER used as a key — only the
 * verified `req.userId`. When these limiters are mounted globally (before
 * authentication) the id is not yet resolved, so keying is effectively by IP;
 * the userId branch benefits any point where a limiter runs post-auth.
 */
function keyByUserOrIp(req) {
    const userId = req.userId;
    if (typeof userId === 'string' && userId.length > 0)
        return `user:${userId}`;
    // ipKeyGenerator normalizes IPv6 into a subnet so a single client cannot
    // trivially rotate addresses to bypass the limit.
    return `ip:${(0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? '')}`;
}
/** 429 in the project's standard JSON error shape. */
function tooManyRequests(_req, res) {
    res.status(429).json({
        success: false,
        error: { statusCode: 429, message: 'Too many requests, please try again later.' },
    });
}
const shared = {
    windowMs: config_1.rateLimitConfig.windowMs,
    standardHeaders: true, // emit RateLimit-* headers
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
    handler: tooManyRequests,
};
/** General limiter for all API traffic. Never limits CORS preflight. */
exports.generalLimiter = (0, express_rate_limit_1.rateLimit)({
    ...shared,
    limit: config_1.rateLimitConfig.max,
    skip: (req) => req.method === 'OPTIONS',
});
/**
 * Stricter limiter for mutating requests. Applied alongside the general
 * limiter; skips preflight and safe (GET/HEAD) methods so only writes are
 * throttled harder.
 */
exports.mutationLimiter = (0, express_rate_limit_1.rateLimit)({
    ...shared,
    limit: config_1.rateLimitConfig.mutationMax,
    skip: (req) => req.method === 'OPTIONS' || req.method === 'GET' || req.method === 'HEAD',
});
//# sourceMappingURL=rateLimit.js.map