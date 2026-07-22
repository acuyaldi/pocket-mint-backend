// ============================================================
// Tests: correlation middleware
// ============================================================
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { correlationMiddleware, CORRELATION_HEADER } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';

function buildApp(useRealErrorHandler = false): express.Express {
  const app = express();
  app.use(correlationMiddleware);
  app.get('/test', (req, res) => {
    res.json({ correlationId: req.correlationId });
  });
  app.get('/error', () => {
    throw new Error('boom');
  });
  app.get('/operational-error', (_req, _res) => {
    const err = new Error('not found') as Error & { statusCode: number };
    (err as Record<string, unknown>).statusCode = 404;
    throw err;
  });
  if (useRealErrorHandler) {
    app.use(errorHandler);
  } else {
    // Minimal error handler that returns correlation ID
    app.use(
      (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(500).json({
          error: err.message,
          // correlationId is on req despite type narrowing in error handler
          correlationId: (_req as express.Request).correlationId ?? 'missing',
        });
      },
    );
  }
  return app;
}

describe('correlationMiddleware', () => {
  it('generates a correlation ID for every request', async () => {
    const app = buildApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.correlationId).toBeDefined();
    expect(typeof res.body.correlationId).toBe('string');
  });

  it('returns the correlation ID in the response header', async () => {
    const app = buildApp();
    const res = await request(app).get('/test');
    const headerKey = CORRELATION_HEADER.toLowerCase();
    expect(res.headers[headerKey]).toBeDefined();
    expect(res.headers[headerKey]).toBe(res.body.correlationId);
  });

  it('generates unique IDs for different requests', async () => {
    const app = buildApp();
    const res1 = await request(app).get('/test');
    const res2 = await request(app).get('/test');
    expect(res1.body.correlationId).not.toBe(res2.body.correlationId);
  });

  it('does not accept a caller-supplied correlation header (always generates new)', async () => {
    const app = buildApp();
    const callerId = 'caller-supplied-id';
    const res = await request(app)
      .get('/test')
      .set(CORRELATION_HEADER, callerId);
    expect(res.body.correlationId).not.toBe(callerId);
  });

  it('same correlation ID is available on error path', async () => {
    const app = buildApp();
    const res = await request(app).get('/error');
    expect(res.status).toBe(500);
    expect(res.body.correlationId).toBeDefined();
    expect(res.body.correlationId).not.toBe('missing');
  });

  it('correlation ID is a valid UUID', async () => {
    const app = buildApp();
    const res = await request(app).get('/test');
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRe.test(res.body.correlationId)).toBe(true);
  });
});

// ---- Real error handler integration -------------------------------------------

describe('correlationMiddleware with central error handler', () => {
  it('central error handler reuses the correlation ID as requestId', async () => {
    const app = buildApp(true);
    const res = await request(app).get('/error');
    expect(res.status).toBe(500);
    // The central error handler returns a requestId that matches the
    // correlation ID set by the middleware
    expect(res.body.error.requestId).toBeDefined();
    const headerKey = CORRELATION_HEADER.toLowerCase();
    expect(res.headers[headerKey]).toBe(res.body.error.requestId);
  });

  it('correlation ID in header matches body requestId on operational error too', async () => {
    const app = buildApp(true);
    const res = await request(app).get('/operational-error');
    expect(res.status).toBe(404);
    expect(res.body.error.requestId).toBeDefined();
    const headerKey = CORRELATION_HEADER.toLowerCase();
    expect(res.headers[headerKey]).toBe(res.body.error.requestId);
  });
});

// ---- Concurrent requests -----------------------------------------------------

describe('correlationMiddleware — concurrency', () => {
  it('concurrent requests receive distinct correlation IDs', async () => {
    const app = buildApp();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request(app).get('/test')),
    );
    const ids = results.map((r) => r.body.correlationId);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });

  it('no correlation state leaks between concurrent requests', async () => {
    const app = buildApp();
    // Interleave requests — second request should not see first request's ID
    const [res1, res2] = await Promise.all([
      request(app).get('/test').query({ user: 'a' }),
      request(app).get('/test').query({ user: 'b' }),
    ]);
    expect(res1.body.correlationId).not.toBe(res2.body.correlationId);
    // Each response body should only contain its own correlation ID
    expect(res1.body).not.toHaveProperty('user');
  });
});
