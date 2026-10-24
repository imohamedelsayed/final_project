const { loadConfig } = require('../config/env');
const { createLogger } = require('../config/logger');
const { createDataSource } = require('../db/data-source');
const { createOrderService } = require('../modules/orders/order-service');

async function runExpiryJob({ dataSource, logger, config }) {
  const orderService = createOrderService({
    dataSource,
    config,
    logger
  });

  logger.info('Starting pending orders expiration reconciliation job...');
  const result = await orderService.reconcileExpiredOrders();
  logger.info(
    { expiredCount: result.expiredCount, expiredOrders: result.expiredOrderNumbers },
    `Expiration reconciliation completed. Expired ${result.expiredCount} order(s).`
  );
  return result;
}

async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger(config.LOG_LEVEL);

  if (!config.DATABASE_URL) {
    logger.error('DATABASE_URL is not set. Expiration job cannot run.');
    process.exit(1);
  }

  const dataSource = createDataSource(config);
  await dataSource.initialize();

  try {
    await runExpiryJob({ dataSource, logger, config });
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Order expiration reconciliation job failed.');
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { runExpiryJob, main };
