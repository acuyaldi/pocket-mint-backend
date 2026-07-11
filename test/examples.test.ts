import { describe, it, expect, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// The API router imports every controller; stub prisma so nothing connects.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

async function buildApp(): Promise<Express> {
  vi.resetModules();
  const { router } = await import('../src/routes');
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('examples endpoint removal (S7)', () => {
  it('GET /api/examples is no longer registered (404)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/examples');
    expect(res.status).toBe(404);
  });

  it('POST /api/examples no longer accepts or reflects a body (404)', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/examples').send({ injected: 'value' });
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('injected');
  });
});
