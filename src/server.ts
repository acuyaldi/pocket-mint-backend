// `./config` loads dotenv (side effect) and parses/validates env before any
// other module reads process.env, so it must be imported first.
import { serverConfig, validateConfig } from './config';
import app from './app';
import { prisma, closePrisma } from './lib/prisma';
import { logger } from './utils/logger';

validateConfig();

async function start(): Promise<void> {
  // Fail fast if the database is unreachable at boot. This surfaces bad
  // credentials / networking immediately instead of on the first request. The
  // connection string is never logged — only a safe error summary.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error('Database connection failed at startup', {
      error: (err as Error).message,
    });
    await closePrisma();
    process.exit(1);
  }

  const server = app.listen(serverConfig.port, () => {
    console.log(`🚀 Server running on http://localhost:${serverConfig.port}`);
    console.log(`📦 Environment: ${serverConfig.nodeEnv}`);
  });

  // Graceful shutdown: stop accepting new connections, then release DB
  // resources. Guarded so a second signal can't double-clean.
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Shutting down', { signal });

    server.close((err) => {
      if (err) logger.error('HTTP server close failed', { error: err.message });
      closePrisma()
        .catch((closeErr) =>
          logger.error('Database cleanup failed', {
            error: (closeErr as Error).message,
          }),
        )
        .finally(() => process.exit(err ? 1 : 0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void start();
