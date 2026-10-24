const { loadConfig } = require('../../config/env');
const { createLogger } = require('../../config/logger');
const { createDataSource } = require('../data-source');
const { runMigrations, getMigrationStatus } = require('../migrations-runner');

async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger(config.LOG_LEVEL);

  if (!config.DATABASE_URL) {
    logger.error('DATABASE_URL is not set. Migrations cannot run.');
    process.exit(1);
  }

  logger.info('Initializing DataSource for database migration...');
  const dataSource = createDataSource(config);
  await dataSource.initialize();

  try {
    const status = await getMigrationStatus(dataSource);
    logger.info({ status }, 'Current migration status');

    const executed = await runMigrations(dataSource);
    logger.info(
      { count: executed.length, migrations: executed.map((m) => m.name) },
      'Migrations executed successfully'
    );
  } catch (err) {
    logger.error({ err }, 'Migration execution failed');
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
