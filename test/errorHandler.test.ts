import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { applyEnv } from './helpers';

/** Build an app in the given NODE_ENV with a freshly-imported error handler. */
async function buildApp(
  env: Record<string, string | undefined>,
  addRoutes: (app: Express) => void
): Promise<Express> {
  vi.resetModules();
  applyEnv({ NODE_ENV: 'production', ...env });
  const { errorHandler } = await import('../src/middlewares/error.middleware');
  const app = express();
  app.use(express.json());
  addRoutes(app);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  // Silence the handler's server-side logging during tests.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('errorHandler (production)', () => {
  it('returns a generic JSON 500 for an unexpected error, hiding internals', async () => {
    const app = await buildApp({ NODE_ENV: 'production' }, (a) =>
      a.get('/boom', (_req, _res, next) =>
        next(new Error('DB failed: secret-internal-detail at /srv/app/node_modules'))
      )
    );
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' },
    });
    expect(res.body.error.requestId).toEqual(expect.any(String));
    expect(res.body.error.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('secret-internal-detail');
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });

  it('does not leak Prisma error internals in production', async () => {
    const app = await buildApp({ NODE_ENV: 'production' }, (a) =>
      a.get('/prisma', (_req, _res, next) => {
        const err = Object.assign(
          new Error('Invalid `prisma.user.create()` invocation: Unique constraint failed'),
          { code: 'P2002' }
        );
        next(err);
      })
    );
    const res = await request(app).get('/prisma');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Internal Server Error');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('prisma.user.create');
    expect(body).not.toContain('P2002');
  });

  it('preserves status and safe message for a known operational error', async () => {
    const app = await buildApp({ NODE_ENV: 'production' }, (a) =>
      a.get('/bad', (_req, _res, next) =>
        next(Object.assign(new Error('email and name are required'), { statusCode: 400 }))
      )
    );
    const res = await request(app).get('/bad');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'email and name are required' },
    });
  });
});
