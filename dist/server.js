"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// `./config` loads dotenv (side effect) and parses/validates env before any
// other module reads process.env, so it must be imported first.
const config_1 = require("./config");
const app_1 = __importDefault(require("./app"));
const prisma_1 = require("./lib/prisma");
const logger_1 = require("./utils/logger");
(0, config_1.validateConfig)();
async function start() {
    // Fail fast if the database is unreachable at boot. This surfaces bad
    // credentials / networking immediately instead of on the first request. The
    // connection string is never logged — only a safe error summary.
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
    }
    catch (err) {
        logger_1.logger.error('Database connection failed at startup', {
            error: err.message,
        });
        await (0, prisma_1.closePrisma)();
        process.exit(1);
    }
    const server = app_1.default.listen(config_1.serverConfig.port, () => {
        console.log(`🚀 Server running on http://localhost:${config_1.serverConfig.port}`);
        console.log(`📦 Environment: ${config_1.serverConfig.nodeEnv}`);
    });
    // Graceful shutdown: stop accepting new connections, then release DB
    // resources. Guarded so a second signal can't double-clean.
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        logger_1.logger.info('Shutting down', { signal });
        server.close((err) => {
            if (err)
                logger_1.logger.error('HTTP server close failed', { error: err.message });
            (0, prisma_1.closePrisma)()
                .catch((closeErr) => logger_1.logger.error('Database cleanup failed', {
                error: closeErr.message,
            }))
                .finally(() => process.exit(err ? 1 : 0));
        });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}
void start();
//# sourceMappingURL=server.js.map