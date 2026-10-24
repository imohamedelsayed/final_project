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

test('Admin Catalog & Product Management Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-catalog');
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
  let customerUser;
  let adminToken;
  let customerToken;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('TestPass123!');

    adminUser = await userRepo.save({
      name: 'Admin Boss',
      email: 'admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true
    });

    customerUser = await userRepo.save({
      name: 'Customer Jane',
      email: 'jane@example.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true
    });

    const adminSession = await createSession(dataSource, adminUser);
    adminToken = adminSession.token;

    const customerSession = await createSession(dataSource, customerUser);
    customerToken = customerSession.token;
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

  // 1. Authorization checks
  await t.test(
    'Role-based access: unauthenticated and customer requests are rejected',
    async () => {
      const unauthRes = await fetch(`${baseUrl}/api/v1/admin/categories`);
      assert.equal(unauthRes.status, 401);

      const custRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
        headers: { 'x-session-token': customerToken }
      });
      assert.equal(custRes.status, 403);
      const body = await custRes.json();
      assert.equal(body.error.code, 'FORBIDDEN');
    }
  );

  // 2. Categories CRUD & Invariants
  await t.test('Categories: create, list, hierarchy, cycles, and safe deletion', async () => {
    // Create root category with custom slug
    const res1 = await fetch(`${baseUrl}/api/v1/admin/categories`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Smartphones',
        slug: 'smartphones',
        sort_order: 1
      })
    });
    assert.equal(res1.status, 201);
    const cat1 = (await res1.json()).data;
    assert.equal(cat1.name, 'Smartphones');
    assert.equal(cat1.slug, 'smartphones');

    // Duplicate slug is rejected with 409
    const dupRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Smartphones Duplicate',
        slug: 'smartphones'
      })
    });
    assert.equal(dupRes.status, 409);
    assert.equal((await dupRes.json()).error.code, 'SLUG_IN_USE');

    // Create subcategory with auto-generated slug
    const res2 = await fetch(`${baseUrl}/api/v1/admin/categories`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Android Phones',
        parent_id: cat1.id
      })
    });
    assert.equal(res2.status, 201);
    const cat2 = (await res2.json()).data;
    assert.equal(cat2.slug, 'android-phones');
    assert.equal(cat2.parent_id, cat1.id);

    // Self-parenting is rejected
    const selfParentRes = await fetch(`${baseUrl}/api/v1/admin/categories/${cat1.id}`, {
      method: 'PATCH',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ parent_id: cat1.id })
    });
    assert.equal(selfParentRes.status, 400);

    // List categories with search and parent_id filter
    const listRes = await fetch(`${baseUrl}/api/v1/admin/categories?search=smartphones`, {
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.data.length, 1);
    assert.equal(listBody.data[0].children_count, 1);

    // Safe deletion: cannot delete parent category when subcategories exist
    const delParentFail = await fetch(`${baseUrl}/api/v1/admin/categories/${cat1.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(delParentFail.status, 409);
    assert.equal((await delParentFail.json()).error.code, 'CATEGORY_HAS_CHILDREN');

    // Deleting subcategory succeeds
    const delChildSuccess = await fetch(`${baseUrl}/api/v1/admin/categories/${cat2.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(delChildSuccess.status, 200);

    // Now parent can be deleted
    const delParentSuccess = await fetch(`${baseUrl}/api/v1/admin/categories/${cat1.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(delParentSuccess.status, 200);
  });

  // 3. Brands CRUD & Invariants
  await t.test('Brands: create, list, update, and safe deletion', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/brands`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Google Pixel' })
    });
    assert.equal(res.status, 201);
    const brand = (await res.json()).data;
    assert.equal(brand.name, 'Google Pixel');
    assert.equal(brand.slug, 'google-pixel');

    // Update brand
    const patchRes = await fetch(`${baseUrl}/api/v1/admin/brands/${brand.id}`, {
      method: 'PATCH',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_active: false })
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.data.is_active, false);

    // Delete brand succeeds when unreferenced
    const delRes = await fetch(`${baseUrl}/api/v1/admin/brands/${brand.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(delRes.status, 200);
  });

  // 4. Products & Variants & Specifications
  await t.test(
    'Products: atomic creation with default variant, used condition, duration of use, and invariants',
    async () => {
      // Create category & brand first
      const catRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Laptops' })
      });
      const category = (await catRes.json()).data;

      const brandRes = await fetch(`${baseUrl}/api/v1/admin/brands`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple' })
      });
      const brand = (await brandRes.json()).data;

      // Create product with default variant and initial stock
      const prodRes = await fetch(`${baseUrl}/api/v1/admin/products`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'MacBook Pro 16',
          description: 'M3 Max 36GB unified memory',
          category_id: category.id,
          brand_id: brand.id,
          condition: 'used',
          is_published: true,
          default_variant: {
            sku: 'MBP16-M3MAX-36GB',
            variant_label: 'Space Black / 36GB / 1TB',
            price: '95000.00',
            stock_quantity: 3,
            low_stock_threshold: 1,
            options: { color: 'Space Black', memory: '36GB' },
            duration_of_use: '3 months'
          },
          specifications: [
            { spec_name: 'Processor', spec_value: 'Apple M3 Max', sort_order: 1 },
            { spec_name: 'RAM', spec_value: '36GB Unified Memory', sort_order: 2 }
          ]
        })
      });

      assert.equal(prodRes.status, 201);
      const product = (await prodRes.json()).data;
      assert.equal(product.name, 'MacBook Pro 16');
      assert.equal(product.condition, 'used');
      assert.equal(product.is_published, true);
      assert.equal(product.variants.length, 1);

      const defaultVar = product.variants[0];
      assert.equal(defaultVar.sku, 'MBP16-M3MAX-36GB');
      assert.equal(defaultVar.price, '95000.00');
      assert.equal(defaultVar.stock_quantity, 3);
      assert.equal(defaultVar.is_default, true);
      assert.equal(defaultVar.duration_of_use, '3 months');

      assert.equal(product.specifications.length, 2);
      assert.equal(product.specifications[0].spec_name, 'Processor');

      // Verify initial stock created an inventory adjustment audit record
      const adjRes = await fetch(
        `${baseUrl}/api/v1/admin/inventory/adjustments?variant_id=${defaultVar.id}`,
        {
          headers: { 'x-session-token': adminToken }
        }
      );
      assert.equal(adjRes.status, 200);
      const adjs = (await adjRes.json()).data;
      assert.equal(adjs.length, 1);
      assert.equal(adjs[0].quantity_delta, 3);
      assert.equal(adjs[0].reason, 'Initial stock on product creation');
      assert.equal(adjs[0].admin_user.email, 'admin@pixelstore.com');

      // Create a second variant marked as is_default: true
      const var2Res = await fetch(`${baseUrl}/api/v1/admin/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'MBP16-M3MAX-48GB',
          variant_label: 'Silver / 48GB / 1TB',
          price: '110000.00',
          stock_quantity: 2,
          is_default: true,
          options: { color: 'Silver', memory: '48GB' },
          duration_of_use: '1 month'
        })
      });

      assert.equal(var2Res.status, 201);
      const var2 = (await var2Res.json()).data;
      assert.equal(var2.is_default, true);

      // Verify that previous variant default flag was atomically switched to false
      const updatedProduct = await (
        await fetch(`${baseUrl}/api/v1/admin/products/${product.id}`, {
          headers: { 'x-session-token': adminToken }
        })
      ).json();

      const oldVar = updatedProduct.data.variants.find((v) => v.id === defaultVar.id);
      const newVar = updatedProduct.data.variants.find((v) => v.id === var2.id);
      assert.equal(oldVar.is_default, false);
      assert.equal(newVar.is_default, true);

      // Attempting to unset is_default directly on default variant without replacement fails
      const unsetFail = await fetch(
        `${baseUrl}/api/v1/admin/products/${product.id}/variants/${newVar.id}`,
        {
          method: 'PATCH',
          headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_default: false })
        }
      );
      assert.equal(unsetFail.status, 400);

      // Attempting to delete the default variant fails
      const delDefFail = await fetch(
        `${baseUrl}/api/v1/admin/products/${product.id}/variants/${newVar.id}`,
        {
          method: 'DELETE',
          headers: { 'x-session-token': adminToken }
        }
      );
      assert.equal(delDefFail.status, 400);

      // Deleting the non-default variant with inventory audit records safely deactivates it
      const delOldSuccess = await fetch(
        `${baseUrl}/api/v1/admin/products/${product.id}/variants/${oldVar.id}`,
        {
          method: 'DELETE',
          headers: { 'x-session-token': adminToken }
        }
      );
      assert.equal(delOldSuccess.status, 200);
      const delBody = await delOldSuccess.json();
      assert.equal(delBody.data.deactivated, true);

      // Specifications: adding duplicate spec_name fails with 409
      const dupSpec = await fetch(`${baseUrl}/api/v1/admin/products/${product.id}/specifications`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec_name: 'Processor', spec_value: 'Duplicate Value' })
      });
      assert.equal(dupSpec.status, 409);

      // Safe deletion of category is blocked while product exists
      const delCatFail = await fetch(`${baseUrl}/api/v1/admin/categories/${category.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': adminToken }
      });
      assert.equal(delCatFail.status, 409);
      assert.equal((await delCatFail.json()).error.code, 'CATEGORY_IN_USE');

      // Safe deletion of brand is blocked while product exists
      const delBrandFail = await fetch(`${baseUrl}/api/v1/admin/brands/${brand.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': adminToken }
      });
      assert.equal(delBrandFail.status, 409);
      assert.equal((await delBrandFail.json()).error.code, 'BRAND_IN_USE');
    }
  );

  // 5. Inventory Adjustments (atomic, locked, audit-logged)
  await t.test(
    'Inventory Adjustments: atomic delta updates, negative stock prevention, and audit history',
    async () => {
      // Create category, product & variant
      const catRes = await (
        await fetch(`${baseUrl}/api/v1/admin/categories`, {
          method: 'POST',
          headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Audio' })
        })
      ).json();

      const prodRes = await (
        await fetch(`${baseUrl}/api/v1/admin/products`, {
          method: 'POST',
          headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Sony WH-1000XM5',
            category_id: catRes.data.id,
            condition: 'new',
            default_variant: {
              sku: 'SONY-XM5-BLK',
              variant_label: 'Black',
              price: '18500.00',
              stock_quantity: 10
            }
          })
        })
      ).json();

      const variant = prodRes.data.variants[0];

      // Positive adjustment: add 5 units
      const addRes = await fetch(`${baseUrl}/api/v1/admin/inventory/adjustments`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          quantityDelta: 5,
          reason: 'Supplier shipment received'
        })
      });
      assert.equal(addRes.status, 200);
      const addBody = await addRes.json();
      assert.equal(addBody.data.variant.stock_quantity, 15);
      assert.equal(addBody.data.adjustment.quantity_delta, 5);

      // Negative adjustment: remove 3 units (e.g. damaged goods)
      const subRes = await fetch(`${baseUrl}/api/v1/admin/inventory/adjustments`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          quantityDelta: -3,
          reason: 'Water damaged units removed'
        })
      });
      assert.equal(subRes.status, 200);
      assert.equal((await subRes.json()).data.variant.stock_quantity, 12);

      // Rejection: adjustment that would make stock negative is blocked
      const overSubRes = await fetch(`${baseUrl}/api/v1/admin/inventory/adjustments`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          quantityDelta: -20,
          reason: 'Oversell attempt'
        })
      });
      assert.equal(overSubRes.status, 409);
      assert.equal((await overSubRes.json()).error.code, 'INSUFFICIENT_STOCK');

      // Rejection: zero delta is rejected
      const zeroRes = await fetch(`${baseUrl}/api/v1/admin/inventory/adjustments`, {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          quantityDelta: 0,
          reason: 'No change'
        })
      });
      assert.equal(zeroRes.status, 422);

      // Verify audit log pagination and contents
      const auditRes = await fetch(
        `${baseUrl}/api/v1/admin/inventory/adjustments?variant_id=${variant.id}`,
        {
          headers: { 'x-session-token': adminToken }
        }
      );
      assert.equal(auditRes.status, 200);
      const auditData = await auditRes.json();
      // Total 3 adjustments: initial (10), +5, -3
      assert.equal(auditData.data.length, 3);
      assert.equal(auditData.data[0].quantity_delta, -3);
      assert.equal(auditData.data[1].quantity_delta, 5);
      assert.equal(auditData.data[2].quantity_delta, 10);

      // Verify inventory items list
      const invItemsRes = await fetch(`${baseUrl}/api/v1/admin/inventory/items`, {
        headers: { 'x-session-token': adminToken }
      });
      assert.equal(invItemsRes.status, 200);
      const invItemsData = await invItemsRes.json();
      assert.ok(Array.isArray(invItemsData.data));
      assert.equal(invItemsData.data.length, 1);
      assert.equal(invItemsData.data[0].sku, 'SONY-XM5-BLK');
      assert.equal(invItemsData.data[0].stock_quantity, 12);
    }
  );

  // 6. Banners & Featured Products
  await t.test('Banners and Featured Products management', async () => {
    // Create Banner
    const bannerRes = await fetch(`${baseUrl}/api/v1/admin/banners`, {
      method: 'POST',
      headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: 'banners/hero-black-friday.jpg',
        link_url: 'https://pixelstore.eg/promos',
        is_published: true,
        sort_order: 1
      })
    });
    assert.equal(bannerRes.status, 201);
    const banner = (await bannerRes.json()).data;
    assert.equal(banner.image_path, 'banners/hero-black-friday.jpg');
    assert.equal(banner.is_published, true);

    // List Banners
    const bannersList = await (
      await fetch(`${baseUrl}/api/v1/admin/banners`, {
        headers: { 'x-session-token': adminToken }
      })
    ).json();
    assert.equal(bannersList.data.length, 1);

    // Update Banner
    const patchBanner = await (
      await fetch(`${baseUrl}/api/v1/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: false })
      })
    ).json();
    assert.equal(patchBanner.data.is_published, false);

    // Delete Banner
    const delBanner = await fetch(`${baseUrl}/api/v1/admin/banners/${banner.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(delBanner.status, 200);

    // Create Category & Product for Featured testing
    const cat = (
      await (
        await fetch(`${baseUrl}/api/v1/admin/categories`, {
          method: 'POST',
          headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Accessories' })
        })
      ).json()
    ).data;

    const prod = (
      await (
        await fetch(`${baseUrl}/api/v1/admin/products`, {
          method: 'POST',
          headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Pixel Stand 2',
            category_id: cat.id,
            condition: 'new',
            default_variant: {
              sku: 'PIXEL-STAND-2',
              variant_label: 'Default',
              price: '4200.00',
              stock_quantity: 5
            }
          })
        })
      ).json()
    ).data;

    // Add to featured products
    const addFeatRes = await fetch(`${baseUrl}/api/v1/admin/featured-products`, {
      method: 'POST',
      headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: prod.id,
        sort_order: 1
      })
    });
    assert.equal(addFeatRes.status, 201);

    // List featured products
    const listFeat = await (
      await fetch(`${baseUrl}/api/v1/admin/featured-products`, {
        headers: { 'x-session-token': adminToken }
      })
    ).json();
    assert.equal(listFeat.data.length, 1);
    assert.equal(listFeat.data[0].product.name, 'Pixel Stand 2');
    assert.equal(listFeat.data[0].product.default_price, '4200.00');

    // Remove from featured
    const remFeat = await fetch(`${baseUrl}/api/v1/admin/featured-products/${prod.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': adminToken }
    });
    assert.equal(remFeat.status, 200);
  });
});
