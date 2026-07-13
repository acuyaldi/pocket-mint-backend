"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePrisma = exports.prismaPool = exports.prisma = void 0;
const config_1 = require("../config");
const prismaFactory_1 = require("./prismaFactory");
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
const log = process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'];
const globalForPrisma = globalThis;
const resources = globalForPrisma.prismaResources ??
    (0, prismaFactory_1.createPrismaResources)(config_1.databaseConfig.url, config_1.databaseConfig.pool, log);
if (!config_1.isProduction) {
    globalForPrisma.prismaResources = resources;
}
/** Shared Prisma client. Import this everywhere (named or default). */
exports.prisma = resources.prisma;
/** Underlying pg pool — exposed for graceful shutdown, not for query use. */
exports.prismaPool = resources.pool;
/** Idempotent shutdown: disconnect Prisma and end the pool. */
exports.closePrisma = resources.close;
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map