const { DataSource } = require('typeorm');
const { entities } = require('./schemas');
const { migrations } = require('./migrations');

let defaultDataSource = null;

function createDataSource(config, options = {}) {
  if (!config || !config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required before database initialization.');
  }

  return new DataSource({
    type: 'postgres',
    url: config.DATABASE_URL,
    entities: options.entities || entities,
    migrations: options.migrations || migrations,
    synchronize: false,
    logging: config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'trace',
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    ...options
  });
}

async function initDataSource(config) {
  if (defaultDataSource && defaultDataSource.isInitialized) {
    return defaultDataSource;
  }

  defaultDataSource = createDataSource(config);
  await defaultDataSource.initialize();
  return defaultDataSource;
}

function getDataSource() {
  return defaultDataSource;
}

async function closeDataSource() {
  if (defaultDataSource && defaultDataSource.isInitialized) {
    await defaultDataSource.destroy();
    defaultDataSource = null;
  }
}

module.exports = {
  createDataSource,
  initDataSource,
  getDataSource,
  closeDataSource
};
