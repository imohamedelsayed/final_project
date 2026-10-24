const { createApp } = require('./app');
const { loadConfig } = require('./config/env');
const { createLogger } = require('./config/logger');
const { initDataSource, closeDataSource } = require('./db/data-source');

async function startServer() {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL);

  let dataSource = null;
  if (config.DATABASE_URL) {
    try {
      dataSource = await initDataSource(config);
      logger.info('Database connection initialized successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize database connection');
    }
  } else {
    logger.warn('DATABASE_URL is not configured; running without database connection');
  }

  const app = createApp({ config, logger, dataSource });

  const server = app.listen(config.API_PORT, () => {
    logger.info({ port: config.API_PORT }, 'Pixel Store API listening');
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'Shutting down API');
    server.close(async () => {
      try {
        await closeDataSource();
      } catch (err) {
        logger.error({ err }, 'Error closing database connection');
      }
      process.exit(0);
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return { app, server, dataSource };
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  });
}

module.exports = { startServer };
