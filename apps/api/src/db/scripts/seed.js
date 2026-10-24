const { loadConfig } = require('../../config/env');
const { createLogger } = require('../../config/logger');
const { createDataSource } = require('../data-source');

async function seedSettings(dataSource, config, logger) {
  const whatsappNumber = config.WHATSAPP_NUMBER || '+201000000000';

  const repo = dataSource.getRepository('StoreSetting');
  const existing = await repo.findOne({ where: { id: 1 } });

  if (!existing) {
    await repo.save({
      id: 1,
      whatsapp_number: whatsappNumber,
      updated_at: new Date()
    });
    logger.info({ whatsappNumber }, 'Seeded singleton store_settings record.');
  } else {
    logger.info(
      { id: existing.id },
      'store_settings record already exists; keeping existing configuration.'
    );
  }
}

async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger(config.LOG_LEVEL);

  if (!config.DATABASE_URL) {
    logger.error('DATABASE_URL is not set. Seed script cannot run.');
    process.exit(1);
  }

  const dataSource = createDataSource(config);
  await dataSource.initialize();

  try {
    await seedSettings(dataSource, config, logger);
    logger.info('Database seeding completed successfully.');
  } catch (err) {
    logger.error({ err }, 'Database seeding failed.');
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedSettings, main };
