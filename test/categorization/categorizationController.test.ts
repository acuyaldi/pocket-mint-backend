// ============================================================
// Categorization controller tests
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const h = vi.hoisted(() => ({ getSuggestions: vi.fn() }));
vi.mock('../../src/services/categorization.service', () => ({
  categorizationService: { getSuggestions: h.getSuggestions },
}));

import { getSuggestions } from '../../src/controllers/categorization.controller';

beforeEach(() => vi.clearAllMocks());

function app(authenticated = true) {
  const instance = express();
  if (authenticated) {
    instance.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: 'user-1' };
      next();
    });
  }
  instance.get('/categories/suggestions', getSuggestions);
  return instance;
}

describe('categorization controller', () => {
  describe('GET /categories/suggestions', () => {
    it('returns suggestions for a valid description', async () => {
      h.getSuggestions.mockResolvedValue([
        {
          categoryId: 'cat-1',
          categoryName: 'Belanja',
          confidence: 'HIGH',
          reason: 'Exact match: "indomaret"',
          matchedKeyword: 'indomaret',
          normalizedMerchant: 'indomaret',
        },
      ]);

      const response = await request(app())
        .get('/categories/suggestions?description=INDOMARET+%23123&type=EXPENSE');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].categoryName).toBe('Belanja');
      expect(h.getSuggestions).toHaveBeenCalledWith('user-1', 'INDOMARET #123', 'EXPENSE');
    });

    it('defaults type to EXPENSE when not provided', async () => {
      h.getSuggestions.mockResolvedValue([]);

      await request(app()).get('/categories/suggestions?description=test');

      expect(h.getSuggestions).toHaveBeenCalledWith('user-1', 'test', 'EXPENSE');
    });

    it('rejects invalid type values', async () => {
      const response = await request(app())
        .get('/categories/suggestions?description=test&type=TRANSFER');

      expect(response.status).toBe(400);
      expect(h.getSuggestions).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app(false))
        .get('/categories/suggestions?description=test');

      expect(response.status).toBe(401);
      expect(h.getSuggestions).not.toHaveBeenCalled();
    });

    it('returns empty array for empty description', async () => {
      h.getSuggestions.mockResolvedValue([]);

      const response = await request(app())
        .get('/categories/suggestions?description=');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('handles missing description query param gracefully', async () => {
      h.getSuggestions.mockResolvedValue([]);

      const response = await request(app())
        .get('/categories/suggestions');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('route registration', () => {
    it('mounts /suggestions route on the category router', () => {
      const route = readFileSync(join(process.cwd(), 'src', 'routes', 'categoryRoutes.ts'), 'utf8');
      expect(route).toContain("getSuggestions");
      expect(route).toContain("/suggestions");
      expect(route).toContain("requireUser");
    });
  });
});
