"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaResources = createPrismaResources;
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/prisma/client");
const logger_1 = require("../utils/logger");
/**
 * Build an adapter-backed Prisma client plus its owning pool.
 *
 * @param databaseUrl runtime connection string; required (throws if missing).
 * @param tuning      process-local pool sizing.
 * @param log         Prisma log configuration (preserves existing behavior).
 */
function createPrismaResources(databaseUrl, tuning = {}, log) {
    if (!databaseUrl) {
        // Fail clearly WITHOUT echoing any (missing) connection string.
        throw new Error('DATABASE_URL is required to construct the Prisma client. Set it in the environment.');
    }
    const pool = new pg_1.Pool({
        connectionString: databaseUrl,
        max: tuning.max,
        idleTimeoutMillis: tuning.idleTimeoutMs,
        connectionTimeoutMillis: tuning.connectionTimeoutMs,
    });
    // A pool with no 'error' listener crashes the process on a transient backend
    // disconnect. Route the (URL-free) error summary through the redacting logger.
    pool.on('error', (err) => {
        logger_1.logger.error('postgres pool error', { error: err.message });
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter, log });
    let closed = false;
    const close = async () => {
        if (closed)
            return;
        closed = true;
        try {
            await prisma.$disconnect();
        }
        catch (err) {
            logger_1.logger.error('prisma disconnect failed', { error: err.message });
        }
        try {
            await pool.end();
        }
        catch (err) {
            logger_1.logger.error('postgres pool end failed', { error: err.message });
        }
    };
    return { prisma, pool, close };
}
//# sourceMappingURL=prismaFactory.js.map