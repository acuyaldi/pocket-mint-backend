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
const log = process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'];
const globalForPrisma = globalThis;
let localResources;
function getResources() {
    if (globalForPrisma.prismaResources)
        return globalForPrisma.prismaResources;
    if (localResources)
        return localResources;
    const resources = (0, prismaFactory_1.createPrismaResources)(config_1.databaseConfig.url, config_1.databaseConfig.pool, log);
    if (!config_1.isProduction) {
        globalForPrisma.prismaResources = resources;
    }
    else {
        localResources = resources;
    }
    return resources;
}
function lazyDelegate(pick) {
    return new Proxy({}, {
        get(_target, prop) {
            const real = pick(getResources());
            const value = Reflect.get(real, prop);
            return typeof value === 'function' ? value.bind(real) : value;
        },
    });
}
/** Shared Prisma client. Import this everywhere (named or default). Lazily connects on first use. */
exports.prisma = lazyDelegate((r) => r.prisma);
/** Underlying pg pool — exposed for graceful shutdown, not for query use. */
exports.prismaPool = lazyDelegate((r) => r.pool);
/** Idempotent shutdown: disconnect Prisma and end the pool. No-op if never connected. */
const closePrisma = async () => {
    const resources = globalForPrisma.prismaResources ?? localResources;
    if (resources)
        await resources.close();
};
exports.closePrisma = closePrisma;
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map