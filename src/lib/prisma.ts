import type { Prisma } from '../generated/prisma/client';
import { databaseConfig, isProduction } from '../config';
import { createPrismaResources, type PrismaResources } from './prismaFactory';

/**
 * Shared, adapter-backed Prisma singleton.
 *
 * Prisma 7's `client` engine needs a driver adapter; the composition lives in
 * `createPrismaResources` (pg.Pool → PrismaPg → PrismaClient). One pool and one
 * client per process.
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

const resources =
  globalForPrisma.prismaResources ??
  createPrismaResources(databaseConfig.url, databaseConfig.pool, log);

if (!isProduction) {
  globalForPrisma.prismaResources = resources;
}

/** Shared Prisma client. Import this everywhere (named or default). */
export const prisma = resources.prisma;

/** Underlying pg pool — exposed for graceful shutdown, not for query use. */
export const prismaPool = resources.pool;

/** Idempotent shutdown: disconnect Prisma and end the pool. */
export const closePrisma = resources.close;

export default prisma;
