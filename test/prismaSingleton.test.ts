import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Verifies the shared singleton's development hot-reload caching: exactly one
 * pool/client per process, reused across module reloads in development, and NOT
 * cached on the global in production.
 */

const GLOBAL_KEY = 'prismaResources';

function clearGlobalCache() {
  delete (globalThis as unknown as Record<string, unknown>)[GLOBAL_KEY];
}

async function loadSingleton(opts: {
  isProduction: boolean;
  create: (...args: unknown[]) => unknown;
}) {
  vi.doMock('../src/lib/prismaFactory', () => ({
    createPrismaResources: opts.create,
  }));
  vi.doMock('../src/config', () => ({
    databaseConfig: { url: 'postgresql://sentinel', pool: { max: 5 } },
    isProduction: opts.isProduction,
  }));
  return import('../src/lib/prisma');
}

beforeEach(() => {
  vi.resetModules();
  clearGlobalCache();
});

afterEach(() => {
  vi.doUnmock('../src/lib/prismaFactory');
  vi.doUnmock('../src/config');
  clearGlobalCache();
});

describe('prisma singleton (development)', () => {
  it('constructs resources once and caches them on the global', async () => {
    const res = { prisma: { id: 'A' }, pool: {}, close: vi.fn() };
    const create = vi.fn(() => res);

    const mod = await loadSingleton({ isProduction: false, create });

    expect(create).toHaveBeenCalledTimes(1);
    // Pool tuning + url are forwarded to the factory.
    expect(create).toHaveBeenCalledWith(
      'postgresql://sentinel',
      { max: 5 },
      expect.anything(),
    );
    expect(mod.prisma).toBe(res.prisma);
    expect((globalThis as any)[GLOBAL_KEY]).toBe(res);
  });

  it('reuses the cached resources and does NOT open a second pool', async () => {
    const cached = { prisma: { id: 'CACHED' }, pool: {}, close: vi.fn() };
    (globalThis as any)[GLOBAL_KEY] = cached;
    const create = vi.fn(() => ({ prisma: { id: 'NEW' }, pool: {}, close: vi.fn() }));

    const mod = await loadSingleton({ isProduction: false, create });

    expect(create).not.toHaveBeenCalled();
    expect(mod.prisma).toBe(cached.prisma);
  });
});

describe('prisma singleton (production)', () => {
  it('constructs one instance and does not touch the global cache', async () => {
    const res = { prisma: { id: 'P' }, pool: {}, close: vi.fn() };
    const create = vi.fn(() => res);

    const mod = await loadSingleton({ isProduction: true, create });

    expect(create).toHaveBeenCalledTimes(1);
    expect(mod.prisma).toBe(res.prisma);
    expect((globalThis as any)[GLOBAL_KEY]).toBeUndefined();
  });
});
