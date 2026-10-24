const test = require('node:test');
const assert = require('node:assert/strict');
const { getTestDataSource, closeTestDataSource } = require('./helpers/db-helper');
const { revertLastMigration, runMigrations } = require('../src/db/migrations-runner');

test('Database migrations and schema safety tests', async (t) => {
  const dataSource = await getTestDataSource();

  await t.test('all expected tables exist in PostgreSQL schema', async () => {
    const expectedTables = [
      'users',
      'admin_totp_credentials',
      'email_verification_challenges',
      'sessions',
      'store_settings',
      'categories',
      'brands',
      'products',
      'product_variants',
      'product_images',
      'product_specifications',
      'banners',
      'featured_products',
      'inventory_adjustments',
      'carts',
      'cart_items',
      'coupons',
      'orders',
      'order_items',
      'order_addresses',
      'order_idempotency_keys',
      'coupon_redemptions',
      'order_events'
    ];

    const result = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const existingTables = result.map((r) => r.table_name);
    for (const table of expectedTables) {
      assert.ok(existingTables.includes(table), `Table ${table} must exist in the schema`);
    }
  });

  await t.test('users table enforces role check and normalized email uniqueness', async () => {
    // Role check
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO users (id, name, email, password_hash, role)
          VALUES (gen_random_uuid(), 'Hacker', 'hacker@test.com', 'hash', 'super_hacker')
        `),
      /chk_users_role/
    );

    // Unique normalized email check
    await dataSource.query(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (gen_random_uuid(), 'Alice', 'alice@test.com', 'hash', 'customer')
    `);

    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO users (id, name, email, password_hash, role)
          VALUES (gen_random_uuid(), 'Alice Upper', 'ALICE@TEST.COM', 'hash', 'customer')
        `),
      /uq_users_normalized_email/
    );
  });

  await t.test('product_variants enforces partial unique index for default variant', async () => {
    // Setup category and product
    const catRes = await dataSource.query(`
      INSERT INTO categories (id, name, slug)
      VALUES (gen_random_uuid(), 'Electronics', 'electronics-test')
      RETURNING id
    `);
    const catId = catRes[0].id;

    const prodRes = await dataSource.query(`
      INSERT INTO products (id, name, slug, category_id, condition)
      VALUES (gen_random_uuid(), 'Phone X', 'phone-x-test', '${catId}', 'new')
      RETURNING id
    `);
    const prodId = prodRes[0].id;

    // Insert first default variant
    await dataSource.query(`
      INSERT INTO product_variants (id, product_id, sku, variant_label, price, stock_quantity, is_default)
      VALUES (gen_random_uuid(), '${prodId}', 'SKU-001', 'Default', 999.00, 10, true)
    `);

    // Second default variant for the same product must fail partial unique index
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO product_variants (id, product_id, sku, variant_label, price, stock_quantity, is_default)
          VALUES (gen_random_uuid(), '${prodId}', 'SKU-002', 'Second Default', 1099.00, 5, true)
        `),
      /uq_product_variants_one_default/
    );

    // Negative stock must fail check constraint
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO product_variants (id, product_id, sku, variant_label, price, stock_quantity, is_default)
          VALUES (gen_random_uuid(), '${prodId}', 'SKU-003', 'Invalid Stock', 999.00, -5, false)
        `),
      /chk_product_variants_stock/
    );
  });

  await t.test('product_images enforces partial unique index for primary image', async () => {
    const prodRes = await dataSource.query(`SELECT id FROM products LIMIT 1`);
    const prodId = prodRes[0].id;

    await dataSource.query(`
      INSERT INTO product_images (id, product_id, image_path, is_primary)
      VALUES (gen_random_uuid(), '${prodId}', '/uploads/primary.png', true)
    `);

    // Second primary image for same product must fail
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO product_images (id, product_id, image_path, is_primary)
          VALUES (gen_random_uuid(), '${prodId}', '/uploads/primary2.png', true)
        `),
      /uq_product_images_one_primary/
    );
  });

  await t.test('store_settings enforces singleton id = 1 check', async () => {
    await dataSource.query(`DELETE FROM store_settings`);

    await dataSource.query(`
      INSERT INTO store_settings (id, whatsapp_number)
      VALUES (1, '+201000000000')
    `);

    // Attempting to insert id = 2 must fail singleton check
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO store_settings (id, whatsapp_number)
          VALUES (2, '+201111111111')
        `),
      /chk_store_settings_singleton/
    );
  });

  await t.test('coupons enforce percentage bounds and date constraints', async () => {
    // Percentage > 100 must fail
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO coupons (id, code, discount_type, discount_value, ends_at)
          VALUES (gen_random_uuid(), 'INVALID120', 'percentage', 120.00, CURRENT_TIMESTAMP + INTERVAL '1 day')
        `),
      /chk_coupons_percentage_bound/
    );

    // ends_at <= starts_at must fail
    await assert.rejects(
      () =>
        dataSource.query(`
          INSERT INTO coupons (id, code, discount_type, discount_value, starts_at, ends_at)
          VALUES (
            gen_random_uuid(),
            'BAD_DATES',
            'fixed',
            50.00,
            CURRENT_TIMESTAMP + INTERVAL '2 days',
            CURRENT_TIMESTAMP + INTERVAL '1 day'
          )
        `),
      /chk_coupons_dates/
    );
  });

  await t.test(
    'order_idempotency_keys enforces user_id and idempotency_key uniqueness',
    async () => {
      let userRes = await dataSource.query(`SELECT id FROM users LIMIT 1`);
      let userId;
      if (userRes.length === 0) {
        const inserted = await dataSource.query(`
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (gen_random_uuid(), 'Idem User', 'idem_user@test.com', 'hash', 'customer')
        RETURNING id
      `);
        userId = inserted[0].id;
      } else {
        userId = userRes[0].id;
      }

      await dataSource.query(`
      INSERT INTO order_idempotency_keys (id, user_id, idempotency_key, request_hash)
      VALUES (gen_random_uuid(), '${userId}', 'idem-key-123', 'hash-abc')
    `);

      await assert.rejects(
        () =>
          dataSource.query(`
          INSERT INTO order_idempotency_keys (id, user_id, idempotency_key, request_hash)
          VALUES (gen_random_uuid(), '${userId}', 'idem-key-123', 'hash-different')
        `),
        /uq_order_idempotency_user_key/
      );
    }
  );

  await t.test('migrations can be cleanly reverted and re-applied', async () => {
    // Revert migration 4 (orders and events)
    await revertLastMigration(dataSource);

    const checkTableResult = await dataSource.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'orders'
    `);
    assert.equal(checkTableResult.length, 0, 'orders table should be dropped after revert');

    // Re-run migration 4
    await runMigrations(dataSource);

    const restoredCheck = await dataSource.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'orders'
    `);
    assert.equal(
      restoredCheck.length,
      1,
      'orders table should be restored after re-running migrations'
    );
  });

  t.after(async () => {
    await closeTestDataSource();
  });
});
