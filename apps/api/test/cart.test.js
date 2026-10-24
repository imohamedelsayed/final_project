const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { hashPassword } = require('../src/modules/auth/password-service');
const { createSession } = require('../src/modules/auth/session-service');
const { LocalStorageAdapter } = require('../src/modules/media/storage-adapter');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Persistent Customer Cart Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-cart');
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: dataSource.options.url,
    CORS_ORIGIN: 'http://localhost:3000',
    UPLOAD_DIR: testUploadDir,
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long-value',
    TOTP_ENCRYPTION_KEY: 'test-totp-encryption-key-32-bytes!'
  });
  const logger = createLogger('silent');
  const emailService = createEmailService({ config, logger });
  const storageAdapter = new LocalStorageAdapter({ baseDir: testUploadDir });
  const app = createApp({ config, logger, dataSource, emailService, storageAdapter });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let adminUser;
  let adminToken;
  let customer1;
  let customer1Token;
  let customer2;
  let customer2Token;
  let inStockVariant;
  let zeroStockVariant;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('TestPass123!');

    adminUser = await userRepo.save({
      name: 'Admin Setup',
      email: 'admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true
    });
    const adminSession = await createSession(dataSource, adminUser);
    adminToken = adminSession.token;

    customer1 = await userRepo.save({
      name: 'Customer One',
      email: 'cust1@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true
    });
    const cust1Session = await createSession(dataSource, customer1);
    customer1Token = cust1Session.token;

    customer2 = await userRepo.save({
      name: 'Customer Two',
      email: 'cust2@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true
    });
    const cust2Session = await createSession(dataSource, customer2);
    customer2Token = cust2Session.token;

    // Create Category and Brand
    const catRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'RAM', slug: 'ram', is_active: true })
    });
    const cat = (await catRes.json()).data;

    // Create Product with In-Stock Variant (Stock: 5, Price: 3500.00)
    const p1Res = await fetch(`${baseUrl}/api/v1/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Corsair Vengeance 32GB DDR5',
        slug: 'corsair-vengeance-32gb',
        description: 'DDR5 6000MHz memory kit',
        category_id: cat.id,
        condition: 'new',
        is_published: true,
        default_variant: {
          sku: 'RAM-DDR5-32G',
          variant_label: '32GB Kit',
          price: '3500.00',
          stock_quantity: 5
        }
      })
    });
    assert.equal(p1Res.status, 201);
    const p1 = (await p1Res.json()).data;
    inStockVariant = p1.variants[0];

    // Create Product with Zero Stock Variant (Stock: 0, Price: 6500.00)
    const p2Res = await fetch(`${baseUrl}/api/v1/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Corsair Dominator 64GB DDR5',
        slug: 'corsair-dominator-64gb',
        description: 'DDR5 64GB kit',
        category_id: cat.id,
        condition: 'new',
        is_published: true,
        default_variant: {
          sku: 'RAM-DDR5-64G',
          variant_label: '64GB Kit',
          price: '6500.00',
          stock_quantity: 0
        }
      })
    });
    assert.equal(p2Res.status, 201);
    const p2 = (await p2Res.json()).data;
    zeroStockVariant = p2.variants[0];
  });

  t.after(async () => {
    server.close();
    await cleanDatabase(dataSource);
    await closeTestDataSource();
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  await t.test('Auth protection on cart endpoints', async () => {
    // Unauthenticated GET /cart
    const unauthRes = await fetch(`${baseUrl}/api/v1/cart`);
    assert.equal(unauthRes.status, 401);

    // Unauthenticated POST /cart/items
    const unauthAdd = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: inStockVariant.id, quantity: 1 })
    });
    assert.equal(unauthAdd.status, 401);
  });

  await t.test('Add to cart, stock enforcement, and subtotal calculation', async () => {
    // 1. Initial cart is empty
    const initRes = await fetch(`${baseUrl}/api/v1/cart`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.equal(initRes.status, 200);
    const initCart = (await initRes.json()).data;
    assert.equal(initCart.lines.length, 0);
    assert.equal(initCart.subtotal, '0.00');
    assert.equal(initCart.items_count, 0);

    // 2. Reject adding unavailable zero-stock variant
    const zeroStockAdd = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: zeroStockVariant.id, quantity: 1 })
    });
    assert.equal(zeroStockAdd.status, 409);
    const zeroBody = await zeroStockAdd.json();
    assert.equal(zeroBody.error.code, 'STOCK_UNAVAILABLE');

    // 3. Reject adding quantity exceeding stock (stock is 5, requested 6)
    const excessAdd = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: inStockVariant.id, quantity: 6 })
    });
    assert.equal(excessAdd.status, 409);
    const excessBody = await excessAdd.json();
    assert.equal(excessBody.error.code, 'INSUFFICIENT_STOCK');

    // 4. Add valid quantity (2 units @ 3500.00)
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: inStockVariant.id, quantity: 2 })
    });
    assert.equal(addRes.status, 200);
    const cartAfterAdd = (await addRes.json()).data;
    assert.equal(cartAfterAdd.lines.length, 1);
    assert.equal(cartAfterAdd.lines[0].quantity, 2);
    assert.equal(cartAfterAdd.lines[0].price, '3500.00');
    assert.equal(cartAfterAdd.lines[0].line_total, '7000.00');
    assert.equal(cartAfterAdd.lines[0].is_available, true);
    assert.equal(cartAfterAdd.subtotal, '7000.00');
    assert.equal(cartAfterAdd.items_count, 2);

    // 5. Add same variant again (+1 unit -> total 3 units)
    const addAgainRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: inStockVariant.id, quantity: 1 })
    });
    assert.equal(addAgainRes.status, 200);
    const cartAfterAgain = (await addAgainRes.json()).data;
    assert.equal(cartAfterAgain.lines.length, 1);
    assert.equal(cartAfterAgain.lines[0].quantity, 3);
    assert.equal(cartAfterAgain.subtotal, '10500.00');
    assert.equal(cartAfterAgain.items_count, 3);

    // 6. Attempting to add 3 more (total would be 6 > stock 5) fails
    const addOverLimit = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: inStockVariant.id, quantity: 3 })
    });
    assert.equal(addOverLimit.status, 409);
    assert.equal((await addOverLimit.json()).error.code, 'INSUFFICIENT_STOCK');
  });

  await t.test(
    'Cart item update, isolation, delete, and authoritative pricing revalidation',
    async () => {
      // 1. Customer 1 adds 2 units
      const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ variantId: inStockVariant.id, quantity: 2 })
      });
      const cart1 = (await addRes.json()).data;
      const itemId = cart1.lines[0].id;

      // 2. Customer 2 cart is completely empty (isolation check)
      const cust2Res = await fetch(`${baseUrl}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${customer2Token}` }
      });
      const cart2 = (await cust2Res.json()).data;
      assert.equal(cart2.lines.length, 0);

      // 3. Customer 2 cannot update Customer 1's cart item (ownership failure)
      const hackUpdate = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ quantity: 1 })
      });
      assert.equal(hackUpdate.status, 404);

      // 4. Customer 2 cannot delete Customer 1's cart item
      const hackDelete = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customer2Token}` }
      });
      assert.equal(hackDelete.status, 404);

      // 5. Customer 1 updates quantity from 2 to 4
      const updateRes = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ quantity: 4 })
      });
      assert.equal(updateRes.status, 200);
      const updatedCart = (await updateRes.json()).data;
      assert.equal(updatedCart.lines[0].quantity, 4);
      assert.equal(updatedCart.subtotal, '14000.00');

      // 6. Update to stock exceeding quantity fails (stock is 5, requested 10)
      const overUpdate = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ quantity: 10 })
      });
      assert.equal(overUpdate.status, 409);

      // 7. Authoritative price recalculation: admin changes variant price from 3500.00 to 4000.00
      await dataSource.query('UPDATE product_variants SET price = 4000.00 WHERE id = $1', [
        inStockVariant.id
      ]);

      // Fetch cart again: unit price should now be 4000.00 and line total 16000.00 (4 * 4000.00)
      const recheckRes = await fetch(`${baseUrl}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${customer1Token}` }
      });
      const recheckCart = (await recheckRes.json()).data;
      assert.equal(recheckCart.lines[0].price, '4000.00');
      assert.equal(recheckCart.lines[0].line_total, '16000.00');
      assert.equal(recheckCart.subtotal, '16000.00');

      // 8. Delete item
      const deleteRes = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customer1Token}` }
      });
      assert.equal(deleteRes.status, 200);
      const afterDelete = (await deleteRes.json()).data;
      assert.equal(afterDelete.lines.length, 0);
      assert.equal(afterDelete.subtotal, '0.00');

      // 9. Clear cart
      // Add item back first
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ variantId: inStockVariant.id, quantity: 1 })
      });

      const clearRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customer1Token}` }
      });
      assert.equal(clearRes.status, 200);
      const clearedCart = (await clearRes.json()).data;
      assert.equal(clearedCart.lines.length, 0);
    }
  );
});
