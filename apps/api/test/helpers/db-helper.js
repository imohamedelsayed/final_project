const { createDataSource } = require('../../src/db/data-source');
const { runMigrations } = require('../../src/db/migrations-runner');
const { loadConfig } = require('../../src/config/env');

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/pixel_store_test';

let testDataSourceInstance = null;

async function getTestDataSource() {
  if (testDataSourceInstance && testDataSourceInstance.isInitialized) {
    return testDataSourceInstance;
  }

  // Production environment and database safety checks
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Refusing to run test suite when NODE_ENV is set to "production"!');
  }

  if (!TEST_DATABASE_URL.toLowerCase().includes('test')) {
    throw new Error(
      `FATAL SAFETY GUARD: Test database URL must contain "test" in its database name. Got: ${TEST_DATABASE_URL}`
    );
  }

  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: TEST_DATABASE_URL,
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long-value',
    TOTP_ENCRYPTION_KEY: 'test-totp-encryption-key-32-bytes!'
  });

  testDataSourceInstance = createDataSource(config);
  await testDataSourceInstance.initialize();

  // Run migrations to ensure clean, updated schema
  await runMigrations(testDataSourceInstance);

  return testDataSourceInstance;
}

async function closeTestDataSource() {
  if (testDataSourceInstance && testDataSourceInstance.isInitialized) {
    await testDataSourceInstance.destroy();
    testDataSourceInstance = null;
  }
}

async function cleanDatabase(dataSource) {
  if (!dataSource || !dataSource.isInitialized) return;

  if (process.env.NODE_ENV === 'production' || !TEST_DATABASE_URL.toLowerCase().includes('test')) {
    throw new Error('FATAL: Refusing to truncate non-test database!');
  }

  // Truncate tables in safe dependency order
  const tables = [
    'order_events',
    'coupon_redemptions',
    'order_idempotency_keys',
    'order_addresses',
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'coupons',
    'inventory_adjustments',
    'featured_products',
    'banners',
    'product_specifications',
    'product_images',
    'product_variants',
    'products',
    'brands',
    'categories',
    'store_settings',
    'sessions',
    'email_verification_challenges',
    'admin_totp_credentials',
    'users'
  ];

  await dataSource.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);
}

module.exports = {
  TEST_DATABASE_URL,
  getTestDataSource,
  closeTestDataSource,
  cleanDatabase
};
