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

test('Public Catalog API Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-public-catalog');
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

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('AdminPass123!');

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

  await t.test('Public endpoints return active categories, brands, and banners', async () => {
    // 1. Create categories (one active, one inactive)
    const catActiveRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Graphics Cards', slug: 'gpus', is_active: true })
    });
    assert.equal(catActiveRes.status, 201);

    await fetch(`${baseUrl}/api/v1/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Secret Category', slug: 'secret-cat', is_active: false })
    });

    // 2. Create brands (one active, one inactive)
    await fetch(`${baseUrl}/api/v1/admin/brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'NVIDIA', slug: 'nvidia', is_active: true })
    });

    await fetch(`${baseUrl}/api/v1/admin/brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Secret Brand', slug: 'secret-brand', is_active: false })
    });

    // 3. Create banners (one published, one unpublished)
    await fetch(`${baseUrl}/api/v1/admin/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        image_path: '/media/banner-active.jpg',
        link_url: '/products?category=gpus',
        is_published: true,
        sort_order: 1
      })
    });

    await fetch(`${baseUrl}/api/v1/admin/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        image_path: '/media/banner-draft.jpg',
        is_published: false,
        sort_order: 2
      })
    });

    // TEST PUBLIC GET /categories (no auth required)
    const publicCatsRes = await fetch(`${baseUrl}/api/v1/categories`);
    assert.equal(publicCatsRes.status, 200);
    const publicCats = (await publicCatsRes.json()).data;
    assert.equal(publicCats.length, 1);
    assert.equal(publicCats[0].slug, 'gpus');

    // TEST PUBLIC GET /brands
    const publicBrandsRes = await fetch(`${baseUrl}/api/v1/brands`);
    assert.equal(publicBrandsRes.status, 200);
    const publicBrands = (await publicBrandsRes.json()).data;
    assert.equal(publicBrands.length, 1);
    assert.equal(publicBrands[0].slug, 'nvidia');

    // TEST PUBLIC GET /banners
    const publicBannersRes = await fetch(`${baseUrl}/api/v1/banners`);
    assert.equal(publicBannersRes.status, 200);
    const publicBanners = (await publicBannersRes.json()).data;
    assert.equal(publicBanners.length, 1);
    assert.equal(publicBanners[0].image_path, '/media/banner-active.jpg');
  });

  await t.test(
    'Public product visibility, search, filtering, and safe fields (no stock disclosure)',
    async () => {
      // Setup category and brand
      const catRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ name: 'GPUs', slug: 'gpus', is_active: true })
      });
      const cat = (await catRes.json()).data;

      const brandRes = await fetch(`${baseUrl}/api/v1/admin/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ name: 'ASUS', slug: 'asus', is_active: true })
      });
      const brand = (await brandRes.json()).data;

      // 1. Create a published in-stock product
      const p1Res = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: 'ASUS RTX 4070 Dual',
          slug: 'asus-rtx-4070-dual',
          description: 'Enthusiast 12GB graphics card for gaming',
          category_id: cat.id,
          brand_id: brand.id,
          condition: 'new',
          is_published: true,
          default_variant: {
            sku: 'ASUS-4070-01',
            variant_label: 'Standard Edition',
            price: '32000.00',
            stock_quantity: 5
          }
        })
      });
      assert.equal(p1Res.status, 201);
      const p1 = (await p1Res.json()).data;

      // Add specification
      await fetch(`${baseUrl}/api/v1/admin/products/${p1.id}/specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ spec_name: 'VRAM', spec_value: '12GB GDDR6X' })
      });

      // 2. Create an unpublished draft product
      const p2Res = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: 'Secret Prototype GPU',
          slug: 'secret-gpu',
          description: 'Unpublished GPU',
          category_id: cat.id,
          brand_id: brand.id,
          condition: 'new',
          is_published: false,
          default_variant: {
            sku: 'SECRET-01',
            variant_label: 'Prototype',
            price: '99000.00',
            stock_quantity: 10
          }
        })
      });
      assert.equal(p2Res.status, 201);

      // 3. Create a used product with zero stock (unavailable)
      const p3Res = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: 'ASUS GTX 1660 Super Used',
          slug: 'asus-gtx-1660-super-used',
          description: 'Pre-owned GPU in mint condition',
          category_id: cat.id,
          brand_id: brand.id,
          condition: 'used',
          is_published: true,
          default_variant: {
            sku: 'ASUS-1660-USED',
            variant_label: 'Standard Used',
            price: '8500.00',
            stock_quantity: 0,
            duration_of_use: '6 Months'
          }
        })
      });
      assert.equal(p3Res.status, 201);

      // TEST 1: Public list returns only published products (p1 and p3, not p2)
      const listRes = await fetch(`${baseUrl}/api/v1/products`);
      assert.equal(listRes.status, 200);
      const listBody = await listRes.json();
      assert.equal(listBody.data.length, 2);
      assert.equal(listBody.pagination.total, 2);

      // Verify safe fields and NO stock quantity disclosure
      for (const item of listBody.data) {
        assert.equal(typeof item.id, 'string');
        assert.equal(typeof item.name, 'string');
        assert.equal(typeof item.price, 'string');
        assert.equal(typeof item.is_available, 'boolean');
        assert.equal(item.stock_quantity, undefined, 'Must not disclose stock_quantity');
        assert.equal(item.total_stock, undefined, 'Must not disclose total_stock');
      }

      const item1 = listBody.data.find((x) => x.slug === 'asus-rtx-4070-dual');
      assert.equal(item1.is_available, true);
      assert.equal(item1.price, '32000.00');
      assert.equal(item1.condition, 'new');

      const item3 = listBody.data.find((x) => x.slug === 'asus-gtx-1660-super-used');
      assert.equal(item3.is_available, false);
      assert.equal(item3.price, '8500.00');
      assert.equal(item3.condition, 'used');
      assert.equal(item3.duration_of_use, '6 Months');

      // TEST 2: Filter by availability=in_stock
      const inStockRes = await fetch(`${baseUrl}/api/v1/products?availability=in_stock`);
      const inStockBody = await inStockRes.json();
      assert.equal(inStockBody.data.length, 1);
      assert.equal(inStockBody.data[0].slug, 'asus-rtx-4070-dual');

      // TEST 3: Filter by condition=used
      const usedRes = await fetch(`${baseUrl}/api/v1/products?condition=used`);
      const usedBody = await usedRes.json();
      assert.equal(usedBody.data.length, 1);
      assert.equal(usedBody.data[0].slug, 'asus-gtx-1660-super-used');

      // TEST 4: Search query matching name
      const searchRes = await fetch(`${baseUrl}/api/v1/products?q=Dual`);
      const searchBody = await searchRes.json();
      assert.equal(searchBody.data.length, 1);
      assert.equal(searchBody.data[0].slug, 'asus-rtx-4070-dual');

      // TEST 5: Public product details by slug
      const detailRes = await fetch(`${baseUrl}/api/v1/products/asus-rtx-4070-dual`);
      assert.equal(detailRes.status, 200);
      const detail = (await detailRes.json()).data;
      assert.equal(detail.name, 'ASUS RTX 4070 Dual');
      assert.equal(detail.variants.length, 1);
      assert.equal(detail.variants[0].is_available, true);
      assert.equal(
        detail.variants[0].stock_quantity,
        undefined,
        'Must not disclose variant stock_quantity'
      );
      assert.equal(detail.specifications.length, 1);
      assert.equal(detail.specifications[0].spec_name, 'VRAM');

      // TEST 6: Unpublished slug returns 404
      const draftRes = await fetch(`${baseUrl}/api/v1/products/secret-gpu`);
      assert.equal(draftRes.status, 404);

      // TEST 7: Non-existent slug returns 404
      const notFoundRes = await fetch(`${baseUrl}/api/v1/products/non-existent-product`);
      assert.equal(notFoundRes.status, 404);
    }
  );
});
