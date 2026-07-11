import cors, { type CorsOptions } from 'cors';
import { corsConfig } from '../config';

const allowed = new Set(corsConfig.allowedOrigins);

/**
 * CORS policy: explicit allowlist, no wildcard.
 *
 * - Requests without an `Origin` header (server-to-server, curl, health checks,
 *   same-origin navigation) are allowed.
 * - Browser requests are allowed only when their exact origin is in the
 *   allowlist; unknown origins are rejected by omitting CORS headers (the
 *   browser then blocks the response) rather than throwing a 500.
 * - `credentials` is disabled because the API uses header auth, not cookies —
 *   so a wildcard/credentials conflict can never arise.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, allowed.has(origin.replace(/\/+$/, '')));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Only headers the app actually uses. x-user-id/x-user-email are kept only
  // while the legacy compatibility auth path is supported.
  allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key', 'x-user-id', 'x-user-email'],
  credentials: false,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);
