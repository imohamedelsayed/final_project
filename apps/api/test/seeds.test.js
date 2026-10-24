const test = require('node:test');
const assert = require('node:assert/strict');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');
const { seedSettings } = require('../src/db/scripts/seed');
const { createSuperAdmin } = require('../src/db/scripts/create-super-admin');
const { createLogger } = require('../src/config/logger');

test('Database seed scripts and Super Admin creation', async (t) => {
  const dataSource = await getTestDataSource();
  const logger = createLogger('silent');

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  await t.test('seedSettings inserts singleton store_settings and is idempotent', async () => {
    const config = { WHATSAPP_NUMBER: '+201099998888' };

    // Initial seed
    await seedSettings(dataSource, config, logger);

    const setting = await dataSource.getRepository('StoreSetting').findOne({ where: { id: 1 } });
    assert.ok(setting);
    assert.equal(setting.id, 1);
    assert.equal(setting.whatsapp_number, '+201099998888');

    // Second seed with different number must not overwrite existing data
    await seedSettings(dataSource, { WHATSAPP_NUMBER: '+201011112222' }, logger);
    const afterSecondSeed = await dataSource
      .getRepository('StoreSetting')
      .findOne({ where: { id: 1 } });
    assert.equal(afterSecondSeed.whatsapp_number, '+201099998888');
  });

  await t.test(
    'createSuperAdmin enforces password rules and creates verified super_admin',
    async () => {
      // Missing password
      await assert.rejects(
        () =>
          createSuperAdmin(
            dataSource,
            { name: 'Admin', email: 'admin@pixelstore.com', password: '' },
            logger
          ),
        /Email and password are required/
      );

      // Short password (< 8 chars)
      await assert.rejects(
        () =>
          createSuperAdmin(
            dataSource,
            { name: 'Admin', email: 'admin@pixelstore.com', password: 'short' },
            logger
          ),
        /Super admin password must be at least 8 characters/
      );

      // Valid super admin creation
      const created = await createSuperAdmin(
        dataSource,
        {
          name: 'The Boss',
          email: 'BOSS@pixelstore.com',
          password: 'SuperSecret123!'
        },
        logger
      );

      assert.equal(created.email, 'boss@pixelstore.com');
      assert.equal(created.role, 'super_admin');
      assert.ok(created.email_verified_at !== null);
      assert.ok(created.password_hash.startsWith('$argon2id$'));

      // Second run with same email is idempotent
      const secondCall = await createSuperAdmin(
        dataSource,
        {
          name: 'The Boss',
          email: 'boss@pixelstore.com',
          password: 'SuperSecret123!'
        },
        logger
      );
      assert.equal(secondCall.id, created.id);
    }
  );

  t.after(async () => {
    await closeTestDataSource();
  });
});
