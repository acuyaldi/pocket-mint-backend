import type { Prisma, PrismaClient } from '../generated/prisma/client';
import type { Pool } from 'pg';
import { databaseConfig, isProduction } from '../config';
import { createPrismaResources, type PrismaResources } from './prismaFactory';

/**
 * Shared, adapter-backed Prisma singleton.
 *
 * Prisma 7's `client` engine needs a driver adapter; the composition lives in
 * `createPrismaResources` (pg.Pool → PrismaPg → PrismaClient). One pool and one
 * client per process.
 *
 * Construction is LAZY: modules that merely import `prisma`/`transaction.service`
 * etc. (e.g. tests binding their own DI'd client) must not open a connection or
 * require `DATABASE_URL` just from being imported. The pool is created on first
 * actual property access.
 *
 * Development hot-reload caches BOTH the client and its pool on the global so a
 * fresh pool is not opened on every module reload (which would leak
 * connections). Production constructs exactly one instance and never touches the
 * global.
 */

// Preserve the previous logging behavior: verbose queries in development only.
const log: Prisma.PrismaClientOptions['log'] =
  process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'];

const globalForPrisma = globalThis as unknown as {
  prismaResources: PrismaResources | undefined;
};

let localResources: PrismaResources | undefined;

function getResources(): PrismaResources {
  if (globalForPrisma.prismaResources) return globalForPrisma.prismaResources;
  if (localResources) return localResources;

  const resources = createPrismaResources(databaseConfig.url, databaseConfig.pool, log);
  if (!isProduction) {
    globalForPrisma.prismaResources = resources;
  } else {
    localResources = resources;
  }
  return resources;
}

function lazyDelegate<T extends object>(pick: (r: PrismaResources) => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = pick(getResources());
      const value = Reflect.get(real as object, prop);
      return typeof value === 'function' ? value.bind(real) : value;
    },
  });
}

/** Shared Prisma client. Import this everywhere (named or default). Lazily connects on first use. */
export const prisma = lazyDelegate<PrismaClient>((r) => r.prisma);

/** Underlying pg pool — exposed for graceful shutdown, not for query use. */
export const prismaPool = lazyDelegate<Pool>((r) => r.pool);

/** Idempotent shutdown: disconnect Prisma and end the pool. No-op if never connected. */
export const closePrisma = async (): Promise<void> => {
  const resources = globalForPrisma.prismaResources ?? localResources;
  if (resources) await resources.close();
};

export default prisma;
