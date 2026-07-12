import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { router as apiRouter } from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { trustProxy, rateLimitConfig } from './config';
import { generalLimiter } from './middleware/rateLimit';
import { corsMiddleware } from './middleware/cors';

const app = express();

// Trust proxy governs how req.ip is derived (and thus rate-limit keying).
// Defaults to false; set TRUST_PROXY to the reverse-proxy hop count in prod.
app.set('trust proxy', trustProxy);

// --------------- Middleware ---------------
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('dev'));

// --------------- Rate limiting ---------------
// PRE-AUTH layer: the general limiter runs before body parsing and before
// authentication, keying by IP to protect the auth machinery (token / API-key
// verification). The stricter POST-AUTH mutation limiter is applied per-route
// AFTER `requireUser` (see the route modules) so it can key by the verified
// user id; it is not mounted globally here.
if (rateLimitConfig.enabled) {
  app.use('/api', generalLimiter);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
app.use('/api', apiRouter);

// --------------- Health Check ---------------
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Error Handler (must be last) ---------------
app.use(errorHandler);

export default app;
