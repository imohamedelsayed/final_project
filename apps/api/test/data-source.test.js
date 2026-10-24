const test = require('node:test');
const assert = require('node:assert/strict');
const { createDataSource } = require('../src/db/data-source');
const { runMigrations } = require('../src/db/migrations-runner');

test('createDataSource requires DATABASE_URL', () => {
  assert.throws(() => createDataSource({}), /DATABASE_URL is required/);
  assert.throws(() => createDataSource(null), /DATABASE_URL is required/);
});

test('createDataSource enforces synchronize: false and postgres type', () => {
  const ds = createDataSource({
    DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/pixel_store_test',
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent'
  });

  assert.equal(ds.options.type, 'postgres');
  assert.equal(ds.options.synchronize, false);
  assert.equal(ds.isInitialized, false);
});

test('migrations runner refuses to run on uninitialized data source', async () => {
  const ds = createDataSource({
    DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/pixel_store_test'
  });

  await assert.rejects(() => runMigrations(ds), /DataSource must be initialized/);
});

test('migrations runner rejects run when synchronize is true', async () => {
  const fakeDs = {
    isInitialized: true,
    options: { synchronize: true }
  };

  await assert.rejects(
    () => runMigrations(fakeDs),
    /automatic schema synchronization must be disabled/
  );
});
