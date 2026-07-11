import { rateLimit, ipKeyGenerator, type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { rateLimitConfig } from '../config';

/**
 * Rate-limit key: a verified user id when one is available (set by
 * `requireUser` after authentication), otherwise the normalized client IP.
 *
 * The self-asserted `x-user-id` header is NEVER used as a key — only the
 * verified `req.userId`. When these limiters are mounted globally (before
 * authentication) the id is not yet resolved, so keying is effectively by IP;
 * the userId branch benefits any point where a limiter runs post-auth.
 */
function keyByUserOrIp(req: Request): string {
  const userId = (req as { userId?: unknown }).userId;
  if (typeof userId === 'string' && userId.length > 0) return `user:${userId}`;
  // ipKeyGenerator normalizes IPv6 into a subnet so a single client cannot
  // trivially rotate addresses to bypass the limit.
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/** 429 in the project's standard JSON error shape. */
function tooManyRequests(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: { statusCode: 429, message: 'Too many requests, please try again later.' },
  });
}

const shared = {
  windowMs: rateLimitConfig.windowMs,
  standardHeaders: true as const, // emit RateLimit-* headers
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: tooManyRequests,
};

/** General limiter for all API traffic. Never limits CORS preflight. */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  limit: rateLimitConfig.max,
  skip: (req: Request) => req.method === 'OPTIONS',
});

/**
 * Stricter limiter for mutating requests. Applied alongside the general
 * limiter; skips preflight and safe (GET/HEAD) methods so only writes are
 * throttled harder.
 */
export const mutationLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  limit: rateLimitConfig.mutationMax,
  skip: (req: Request) =>
    req.method === 'OPTIONS' || req.method === 'GET' || req.method === 'HEAD',
});
