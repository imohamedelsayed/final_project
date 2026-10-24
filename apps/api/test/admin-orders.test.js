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
const { createOrderService } = require('../src/modules/orders/order-service');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Admin Orders Management, Confirmation, Concurrency, and Expiry Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-admin-orders');
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: dataSource.options.url,
    CORS_ORIGIN: 'http://localhost:3000',
    UPLOAD_DIR: testUploadDir,
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long-value',
    TOTP_ENCRYPTION_KEY: 'test-totp-encryption-key-32-bytes!',
    WHATSAPP_NUMBER: '+201011112222',
    SCHEDULER_SECRET: 'test-scheduler-secret-32-chars!'
  });
  const logger = createLogger('silent');
  const emailService = createEmailService({ config, logger });
  const storageAdapter = new LocalStorageAdapter({ baseDir: testUploadDir });
  const app = createApp({ config, logger, dataSource, emailService, storageAdapter });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let superAdmin;
  let superAdminToken;
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;
  let testVariant;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('TestPass123!');

    // Super Admin
    superAdmin = await userRepo.save({
      name: 'Super Admin User',
      email: 'superadmin@pixelstore.com',
      password_hash: pwHash,
      role: 'super_admin',
      email_verified_at: now,
      is_active: true
    });
    const sAdmin = await createSession(dataSource, superAdmin);
    superAdminToken = sAdmin.token;

    // Admin
    adminUser = await userRepo.save({
      name: 'Regular Admin User',
      email: 'admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true
    });
    const sAdm = await createSession(dataSource, adminUser);
    adminToken = sAdm.token;

    // Customer
    customerUser = await userRepo.save({
      name: 'Customer Shopper',
      email: 'shopper@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true
    });
    const sCust = await createSession(dataSource, customerUser);
    customerToken = sCust.token;

    // Seed store settings
    await dataSource.getRepository('StoreSetting').save({
      id: 1,
      whatsapp_number: '+201011112222',
      updated_at: now
    });

    // Seed Catalog (Product & Variant with Stock: 5, Price: 20000.00)
    const cat = await dataSource.getRepository('Category').save({
      name: 'Tablets',
      slug: 'tablets',
      is_active: true
    });
    const brand = await dataSource.getRepository('Brand').save({
      name: 'Google',
      slug: 'google',
      is_active: true
    });
    const product = await dataSource.getRepository('Product').save({
      name: 'Google Pixel Tablet',
      slug: 'google-pixel-tablet',
      category_id: cat.id,
      brand_id: brand.id,
      condition: 'new',
      is_published: true
    });
    testVariant = await dataSource.getRepository('ProductVariant').save({
      product_id: product.id,
      sku: 'PIXEL-TAB-128',
      variant_label: 'Hazel, 128GB',
      price: '20000.00',
      stock_quantity: 5,
      condition: 'new',
      is_active: true,
      is_default: true
    });

    // Seed Coupon with global limit of 1
    const endsFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await dataSource.getRepository('Coupon').save({
      code: 'LIMIT1',
      discount_type: 'fixed',
      discount_value: '1000.00',
      minimum_subtotal: '5000.00',
      global_usage_limit: 1,
      per_customer_limit: 1,
      starts_at: null,
      ends_at: endsFuture,
      is_active: true
    });
  });

  t.after(async () => {
    server.close();
    await closeTestDataSource();
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // Helper to create a pending order for customer
  async function createTestPendingOrder(couponCode = null, qty = 1) {
    // 1. Add to customer's cart
    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ variantId: testVariant.id, quantity: qty })
    });

    // 2. Checkout
    const res = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `key-${Date.now()}-${Math.random()}`,
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        address: {
          recipient_name: 'Ahmed Youssef',
          mobile: '01234567890',
          governorate: 'Cairo',
          area: 'New Cairo',
          street: 'South 90th St',
          building_number: '10'
        },
        coupon_code: couponCode,
        terms_accepted: true,
        terms_version: 'v1.0'
      })
    });
    assert.strictEqual(res.status, 201);
    return (await res.json()).data.order;
  }

  await t.test('Admin role protection and Super Admin settings isolation', async () => {
    // 0. Unauthenticated & customer cannot access admin dashboard summary
    const resUnauth = await fetch(`${baseUrl}/api/v1/admin/dashboard/summary`);
    assert.strictEqual(resUnauth.status, 401);

    const resCustSummary = await fetch(`${baseUrl}/api/v1/admin/dashboard/summary`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(resCustSummary.status, 403);

    // Admin can access dashboard summary with accurate structure
    const resAdminSummary = await fetch(`${baseUrl}/api/v1/admin/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdminSummary.status, 200);
    const summaryData = (await resAdminSummary.json()).data;
    assert.ok(summaryData.metrics);
    assert.strictEqual(typeof summaryData.metrics.pendingOrders, 'number');
    assert.strictEqual(typeof summaryData.metrics.lowStockVariants, 'number');
    assert.ok(Array.isArray(summaryData.urgentOrders));
    assert.ok(Array.isArray(summaryData.lowStockAlerts));

    // 1. Customer cannot access admin orders
    const resCust = await fetch(`${baseUrl}/api/v1/admin/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(resCust.status, 403);

    // 2. Admin can access admin orders
    const resAdmin = await fetch(`${baseUrl}/api/v1/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdmin.status, 200);

    // 3. Regular admin CANNOT update WhatsApp settings (Super Admin only)
    const resAdminSettings = await fetch(`${baseUrl}/api/v1/admin/settings/whatsapp`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ whatsapp_number: '+201099998888' })
    });
    assert.strictEqual(resAdminSettings.status, 403);

    // 4. Super Admin CAN update WhatsApp settings
    const resSuperSettings = await fetch(`${baseUrl}/api/v1/admin/settings/whatsapp`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ whatsapp_number: '+201099998888' })
    });
    assert.strictEqual(resSuperSettings.status, 200);
    const updatedSettings = (await resSuperSettings.json()).data;
    assert.strictEqual(updatedSettings.whatsapp_number, '+201099998888');
  });

  await t.test(
    'Admin sets final total, starts 24h countdown, records customer agreement, and enforces agreement before confirm',
    async () => {
      const order = await createTestPendingOrder(null, 1); // Subtotal: 20000

      // 1. Attempting confirmation before setting final total and agreement fails (409)
      const resConfirmPremature = await fetch(
        `${baseUrl}/api/v1/admin/orders/${order.id}/confirm`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      assert.strictEqual(resConfirmPremature.status, 409);

      // 2. Admin sets shipping fee = 100.00 EGP
      const resFinalTotal = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/final-total`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ shipping_fee: 100 })
      });
      assert.strictEqual(resFinalTotal.status, 200);
      const updatedOrder = (await resFinalTotal.json()).data;
      assert.strictEqual(Number(updatedOrder.shipping_fee), 100);
      assert.strictEqual(Number(updatedOrder.final_total), 20100);
      assert.ok(updatedOrder.final_total_sent_at);
      assert.ok(updatedOrder.expires_at);
      assert.strictEqual(updatedOrder.pricing_version, 2);
      assert.strictEqual(updatedOrder.agreed_pricing_version, null);

      // 3. Confirming still fails because customer agreement is not recorded
      const resConfirmNoAgree = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resConfirmNoAgree.status, 409);
      const agreeErr = await resConfirmNoAgree.json();
      assert.strictEqual(agreeErr.error.code, 'CUSTOMER_AGREEMENT_REQUIRED');

      // 4. Admin records customer agreement
      const resAgree = await fetch(
        `${baseUrl}/api/v1/admin/orders/${order.id}/customer-agreement`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      assert.strictEqual(resAgree.status, 200);
      const agreedOrder = (await resAgree.json()).data;
      assert.ok(agreedOrder.customer_agreed_at);
      assert.strictEqual(agreedOrder.agreed_pricing_version, 2);

      // 5. Admin updates shipping fee again -> pricing version increments to 3, agreement invalidated!
      await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/final-total`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ shipping_fee: 150 })
      });
      const resConfirmAfterReprice = await fetch(
        `${baseUrl}/api/v1/admin/orders/${order.id}/confirm`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      assert.strictEqual(resConfirmAfterReprice.status, 409); // Agreement needed for version 3!

      // 6. Record agreement for version 3
      await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/customer-agreement`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // 7. Successful confirmation
      const resConfirmSuccess = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resConfirmSuccess.status, 200);
      const confirmedOrder = (await resConfirmSuccess.json()).data;
      assert.strictEqual(confirmedOrder.status, 'confirmed');
      assert.ok(confirmedOrder.confirmed_at);
      assert.ok(confirmedOrder.stock_deducted_at);

      // Verify stock was decremented from 5 to 4
      const variantAfter = await dataSource
        .getRepository('ProductVariant')
        .findOne({ where: { id: testVariant.id } });
      assert.strictEqual(variantAfter.stock_quantity, 4);

      // Verify duplicate confirmation is blocked
      const resDupConfirm = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resDupConfirm.status, 409);
    }
  );

  await t.test('Coupon limit enforcement during confirmation', async () => {
    // Order 1 with limitedCoupon (global limit = 1)
    const order1 = await createTestPendingOrder('LIMIT1', 1);
    // Order 2 with limitedCoupon
    const order2 = await createTestPendingOrder('LIMIT1', 1);

    // Setup and agree on order 1
    await fetch(`${baseUrl}/api/v1/admin/orders/${order1.id}/final-total`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ shipping_fee: 50 })
    });
    await fetch(`${baseUrl}/api/v1/admin/orders/${order1.id}/customer-agreement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Confirm order 1 -> succeeds and consumes the 1 global redemption
    const resConf1 = await fetch(`${baseUrl}/api/v1/admin/orders/${order1.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resConf1.status, 200);

    // Setup and agree on order 2
    await fetch(`${baseUrl}/api/v1/admin/orders/${order2.id}/final-total`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ shipping_fee: 50 })
    });
    await fetch(`${baseUrl}/api/v1/admin/orders/${order2.id}/customer-agreement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Confirm order 2 -> must be REJECTED because global limit reached
    const resConf2 = await fetch(`${baseUrl}/api/v1/admin/orders/${order2.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resConf2.status, 409);
    const errBody = await resConf2.json();
    assert.strictEqual(errBody.error.code, 'COUPON_LIMIT_REACHED');
  });

  await t.test(
    'Cancellation of Confirmed order restores stock and reverses coupon redemption',
    async () => {
      const order = await createTestPendingOrder('LIMIT1', 2); // Qty: 2

      // Stock before confirm: 5
      const stockBefore = (
        await dataSource.getRepository('ProductVariant').findOne({ where: { id: testVariant.id } })
      ).stock_quantity;
      assert.strictEqual(stockBefore, 5);

      // Prepare and confirm order
      await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/final-total`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ shipping_fee: 50 })
      });
      await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/customer-agreement`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // Stock after confirm: 5 - 2 = 3
      const stockConfirmed = (
        await dataSource.getRepository('ProductVariant').findOne({ where: { id: testVariant.id } })
      ).stock_quantity;
      assert.strictEqual(stockConfirmed, 3);

      // Verify active coupon redemption exists
      const redemptionBefore = await dataSource
        .getRepository('CouponRedemption')
        .findOne({ where: { order_id: order.id } });
      assert.ok(redemptionBefore);
      assert.strictEqual(redemptionBefore.reversed_at, null);

      // Cancel Confirmed Order via Transition API
      const resCancel = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ new_status: 'cancelled', reason: 'Customer requested return' })
      });
      assert.strictEqual(resCancel.status, 200);
      const cancelledOrder = (await resCancel.json()).data;
      assert.strictEqual(cancelledOrder.status, 'cancelled');
      assert.ok(cancelledOrder.stock_restored_at);

      // Verify stock was RESTORED back to 5
      const stockRestored = (
        await dataSource.getRepository('ProductVariant').findOne({ where: { id: testVariant.id } })
      ).stock_quantity;
      assert.strictEqual(stockRestored, 5, 'Stock must be restored to original value');

      // Verify coupon redemption was marked reversed
      const redemptionAfter = await dataSource
        .getRepository('CouponRedemption')
        .findOne({ where: { order_id: order.id } });
      assert.ok(redemptionAfter.reversed_at, 'Coupon redemption reversed_at must be set');
      assert.ok(
        redemptionAfter.reversed_by_order_event_id,
        'Reversed by order event ID must be linked'
      );
    }
  );

  await t.test(
    '24-hour expiration reconciliation job expires overdue pending orders without touching confirmed or cancelled orders',
    async () => {
      const orderService = createOrderService({ dataSource, config, logger });

      // 1. Create Order A: pending with expires_at in the past (-1 hour)
      const orderA = await createTestPendingOrder(null, 1);
      const pastDate = new Date(Date.now() - 3600 * 1000);
      await dataSource.getRepository('Order').update(orderA.id, {
        final_total_sent_at: new Date(Date.now() - 25 * 3600 * 1000),
        expires_at: pastDate,
        shipping_fee: '50.00',
        final_total: '20050.00'
      });

      // 2. Create Order B: pending with expires_at in the future (+23 hours)
      const orderB = await createTestPendingOrder(null, 1);
      const futureDate = new Date(Date.now() + 23 * 3600 * 1000);
      await dataSource.getRepository('Order').update(orderB.id, {
        final_total_sent_at: new Date(),
        expires_at: futureDate,
        shipping_fee: '50.00',
        final_total: '20050.00'
      });

      // 3. Create Order C: pending WITHOUT final total sent (no expires_at)
      const orderC = await createTestPendingOrder(null, 1);

      // 4. Create Order D: Confirmed order with past expires_at
      const orderD = await createTestPendingOrder(null, 1);
      await dataSource.getRepository('Order').update(orderD.id, {
        status: 'confirmed',
        confirmed_at: new Date(),
        expires_at: pastDate
      });

      // Run reconciliation
      const result = await orderService.reconcileExpiredOrders();
      assert.strictEqual(result.expiredCount, 1);
      assert.ok(result.expiredOrderNumbers.includes(orderA.order_number));

      // Check Order A status is expired
      const checkedA = await dataSource
        .getRepository('Order')
        .findOne({ where: { id: orderA.id } });
      assert.strictEqual(checkedA.status, 'expired');
      assert.ok(checkedA.expired_at);

      // Check Order B is still pending
      const checkedB = await dataSource
        .getRepository('Order')
        .findOne({ where: { id: orderB.id } });
      assert.strictEqual(checkedB.status, 'pending');

      // Check Order C is still pending (highlighted for admin, not expired)
      const checkedC = await dataSource
        .getRepository('Order')
        .findOne({ where: { id: orderC.id } });
      assert.strictEqual(checkedC.status, 'pending');

      // Check Order D is STILL confirmed (never expired!)
      const checkedD = await dataSource
        .getRepository('Order')
        .findOne({ where: { id: orderD.id } });
      assert.strictEqual(checkedD.status, 'confirmed');

      // Idempotency: Running reconciliation again expires 0 orders
      const rerun = await orderService.reconcileExpiredOrders();
      assert.strictEqual(rerun.expiredCount, 0);

      // Verify HTTP trigger endpoint: /api/v1/jobs/expire-orders
      // Unauthenticated request fails
      const unauthRes = await fetch(`${baseUrl}/api/v1/jobs/expire-orders`, { method: 'POST' });
      assert.strictEqual(unauthRes.status, 401);

      // Request with valid SCHEDULER_SECRET succeeds
      const schedRes = await fetch(`${baseUrl}/api/v1/jobs/expire-orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer test-scheduler-secret-32-chars!` }
      });
      assert.strictEqual(schedRes.status, 200);
      const schedBody = await schedRes.json();
      assert.strictEqual(schedBody.data.expiredCount, 0);
    }
  );

  await t.test('Order events are immutable audit entries in chronological order', async () => {
    const order = await createTestPendingOrder(null, 1);

    await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/final-total`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ shipping_fee: 50 })
    });
    await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/customer-agreement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const resDetail = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orderDetail = (await resDetail.json()).data;

    // Verify chronological events trail
    const eventTypes = orderDetail.events.map((e) => e.event_type);
    assert.deepStrictEqual(eventTypes, [
      'created',
      'final_total_sent',
      'customer_agreed',
      'confirmed'
    ]);
  });

  await t.test(
    'Concurrent confirmation requests on last stock unit avoid overselling',
    async () => {
      // Set variant stock_quantity = 1
      await dataSource
        .getRepository('ProductVariant')
        .update(testVariant.id, { stock_quantity: 1 });

      // Create 2 pending orders for 1 item each
      const order1 = await createTestPendingOrder(null, 1);
      const order2 = await createTestPendingOrder(null, 1);

      // Prepare both orders: final total + customer agreement
      for (const ord of [order1, order2]) {
        await fetch(`${baseUrl}/api/v1/admin/orders/${ord.id}/final-total`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ shipping_fee: 50 })
        });
        await fetch(`${baseUrl}/api/v1/admin/orders/${ord.id}/customer-agreement`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }

      // Attempt to confirm both concurrently
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/v1/admin/orders/${order1.id}/confirm`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        fetch(`${baseUrl}/api/v1/admin/orders/${order2.id}/confirm`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(
        statuses,
        [200, 409],
        'Exactly one order must confirm and the other must fail with 409'
      );

      // Verify stock is exactly 0, never negative
      const variantAfter = await dataSource
        .getRepository('ProductVariant')
        .findOne({ where: { id: testVariant.id } });
      assert.strictEqual(variantAfter.stock_quantity, 0);
    }
  );
});
