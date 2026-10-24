/**
 * Migrations runner helper for Pixel Store.
 *
 * NOTE: Migrations must not be executed automatically on server boot.
 * Schema synchronization (synchronize: true) is strictly prohibited.
 */

async function getMigrationStatus(dataSource) {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('DataSource must be initialized before checking migration status.');
  }

  const executedMigrations = await dataSource.showMigrations();
  return {
    hasPendingMigrations: executedMigrations,
    isSynchronizeDisabled: dataSource.options.synchronize === false
  };
}

async function runMigrations(dataSource, options = { transaction: 'all' }) {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('DataSource must be initialized before running migrations.');
  }

  if (dataSource.options.synchronize === true) {
    throw new Error('Safety check failed: automatic schema synchronization must be disabled.');
  }

  const ranMigrations = await dataSource.runMigrations({
    transaction: options.transaction || 'all'
  });

  return ranMigrations;
}

async function revertLastMigration(dataSource, options = { transaction: 'all' }) {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('DataSource must be initialized before reverting migrations.');
  }

  await dataSource.undoLastMigration({
    transaction: options.transaction || 'all'
  });
}

module.exports = {
  getMigrationStatus,
  runMigrations,
  revertLastMigration
};
