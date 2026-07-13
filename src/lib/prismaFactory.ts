import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { logger } from '../utils/logger';

/**
 * Prisma 7 uses the `client` engine, which requires a driver adapter to talk to
 * PostgreSQL. This factory owns the composition:
 *
 *   pg.Pool → PrismaPg adapter → PrismaClient({ adapter })
 *
 * The pool is created and OWNED here so its lifecycle is explicit: `close()`
 * disconnects Prisma and ends the pool exactly once. The adapter is told NOT to
 * end the pool itself (`disposeExternalPool` stays false) so cleanup happens in
 * one place and never double-runs.
 *
 * No connection string is ever logged or embedded in an error message.
 */

/** Process-local pool sizing. Undefined fields fall back to `pg` defaults. */
export interface PoolTuning {
  /** Max connections held by this process's pool. */
  max?: number;
  /** Idle connection lifetime before the pool closes it (ms). */
  idleTimeoutMs?: number;
  /** Max time to wait to acquire a connection before failing (ms). */
  connectionTimeoutMs?: number;
}

export interface PrismaResources {
  prisma: PrismaClient;
  pool: Pool;
  /** Idempotent: disconnects Prisma then ends the pool. Safe to call twice. */
  close: () => Promise<void>;
}

/**
 * Build an adapter-backed Prisma client plus its owning pool.
 *
 * @param databaseUrl runtime connection string; required (throws if missing).
 * @param tuning      process-local pool sizing.
 * @param log         Prisma log configuration (preserves existing behavior).
 */
export function createPrismaResources(
  databaseUrl: string | undefined,
  tuning: PoolTuning = {},
  log?: Prisma.PrismaClientOptions['log'],
): PrismaResources {
  if (!databaseUrl) {
    // Fail clearly WITHOUT echoing any (missing) connection string.
    throw new Error(
      'DATABASE_URL is required to construct the Prisma client. Set it in the environment.',
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: tuning.max,
    idleTimeoutMillis: tuning.idleTimeoutMs,
    connectionTimeoutMillis: tuning.connectionTimeoutMs,
  });

  // A pool with no 'error' listener crashes the process on a transient backend
  // disconnect. Route the (URL-free) error summary through the redacting logger.
  pool.on('error', (err: Error) => {
    logger.error('postgres pool error', { error: err.message });
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter, log });

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error('prisma disconnect failed', { error: (err as Error).message });
    }
    try {
      await pool.end();
    } catch (err) {
      logger.error('postgres pool end failed', { error: (err as Error).message });
    }
  };

  return { prisma, pool, close };
}
