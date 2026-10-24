const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { LocalStorageAdapter } = require('../src/modules/media/storage-adapter');
const { createSuperAdmin } = require('../src/db/scripts/create-super-admin');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Comprehensive End-to-End Customer to Admin Lifecycle Integration Test', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-e2e');
  await fs.mkdir(testUploadDir, { recursive: true });

  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: dataSource.options.url,
    CORS_ORIGIN: 'http://localhost:3000',
    UPLOAD_DIR: testUploadDir,
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long-value',
    TOTP_ENCRYPTION_KEY: 'test-totp-encryption-key-32-bytes!',
    WHATSAPP_NUMBER: '+201011112222'
  });
  const logger = createLogger('silent');
  const emailService = createEmailService({ config, logger });
  const storageAdapter = new LocalStorageAdapter({ baseDir: testUploadDir });
  const app = createApp({ config, logger, dataSource, emailService, storageAdapter });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    server.close();
    await cleanDatabase(dataSource);
    await closeTestDataSource();
    await fs.rm(testUploadDir, { recursive: true, force: true }).catch(() => {});
  });

  await cleanDatabase(dataSource);

  // 1. Bootstrap Super Admin
  const superAdmin = await createSuperAdmin(
    dataSource,
    {
      name: 'E2E Super Admin',
      email: 'superadmin@pixelstore.com',
      password: 'AdminPassword123!'
    },
    logger
  );
  assert.ok(superAdmin.id);

  // Log in as Super Admin to get session token
  const superAdminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@pixelstore.com',
      password: 'AdminPassword123!'
    })
  });
  assert.equal(superAdminLoginRes.status, 200);
  const superAdminLoginBody = await superAdminLoginRes.json();
  assert.equal(superAdminLoginBody.data.user.role, 'super_admin');
  const superAdminToken = superAdminLoginRes.headers
    .get('set-cookie')
    .match(/pixel_store_session=([^;]+)/)[1];

  // 2. Customer Registration Flow
  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ahmed E2E Customer',
      email: 'customer.e2e@pixelstore.com',
      password: 'CustomerPass123!'
    })
  });
  assert.equal(regRes.status, 201);

  // Verify OTP was recorded in emailService
  const sentEmails = emailService.getSentEmails();
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'customer.e2e@pixelstore.com');
  const verificationOtp = sentEmails[0].code;
  assert.equal(verificationOtp.length, 6);

  // Verify account with OTP
  const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer.e2e@pixelstore.com',
      code: verificationOtp
    })
  });
  assert.equal(verifyRes.status, 200);

  // Customer Login
  const custLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer.e2e@pixelstore.com',
      password: 'CustomerPass123!'
    })
  });
  assert.equal(custLoginRes.status, 200);
  const customerToken = custLoginRes.headers
    .get('set-cookie')
    .match(/pixel_store_session=([^;]+)/)[1];

  // 3. Admin creates Category, Brand, Product and 10% Coupon
  const catRes = await fetch(`${baseUrl}/api/v1/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({ name: 'Laptops', slug: 'laptops' })
  });
  assert.equal(catRes.status, 201);
  const cat = (await catRes.json()).data;

  const brandRes = await fetch(`${baseUrl}/api/v1/admin/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({ name: 'Apple', slug: 'apple' })
  });
  assert.equal(brandRes.status, 201);
  const brand = (await brandRes.json()).data;

  const prodRes = await fetch(`${baseUrl}/api/v1/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      name: 'MacBook Air M2',
      slug: 'macbook-air-m2',
      category_id: cat.id,
      brand_id: brand.id,
      condition: 'new',
      is_published: true,
      default_variant: {
        sku: 'MBA-M2-256',
        variant_label: '256GB Midnight',
        price: 25000,
        stock_quantity: 5
      }
    })
  });
  assert.equal(prodRes.status, 201);
  const prod = (await prodRes.json()).data;
  const variantId = prod.variants[0].id;

  // Create 10% coupon
  const couponRes = await fetch(`${baseUrl}/api/v1/admin/coupons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      code: 'E2ESAVE10',
      discount_type: 'percentage',
      discount_value: 10,
      ends_at: new Date(Date.now() + 86400000).toISOString(),
      global_usage_limit: 50,
      per_customer_limit: 1
    })
  });
  assert.equal(couponRes.status, 201);

  // 4. Customer Browses Catalog & Adds 2 units to Cart
  const publicProdRes = await fetch(`${baseUrl}/api/v1/products/${prod.slug}`);
  assert.equal(publicProdRes.status, 200);
  const publicProd = (await publicProdRes.json()).data;
  assert.equal(publicProd.variants[0].is_available, true);
  // Zero internal stock disclosure on public product
  assert.equal(publicProd.variants[0].stock_quantity, undefined);

  const addCartRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({ variantId, quantity: 2 })
  });
  assert.equal(addCartRes.status, 200);
  const cartData = (await addCartRes.json()).data;
  assert.equal(cartData.subtotal, '50000.00'); // 2 x 25000
  assert.equal(cartData.lines.length, 1);

  // 5. Quote Coupon (10% of 50,000 = 5,000 discount)
  const quoteRes = await fetch(`${baseUrl}/api/v1/coupons/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({ code: 'E2ESAVE10' })
  });
  assert.equal(quoteRes.status, 200);
  const quoteData = (await quoteRes.json()).data;
  assert.equal(Number(quoteData.discount_amount), 5000);

  // 6. Customer Checkout with Idempotency Key
  const checkoutPayload = {
    address: {
      recipient_name: 'Ahmed Customer',
      mobile: '01012345678',
      governorate: 'Cairo',
      area: 'Nasr City',
      street: 'Abbas El Akkad',
      building_number: '12',
      floor: '3',
      apartment: '301'
    },
    coupon_code: 'E2ESAVE10',
    terms_accepted: true,
    terms_version: 'v1.0'
  };

  const checkoutRes = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
      'Idempotency-Key': 'E2E-IDEM-001'
    },
    body: JSON.stringify(checkoutPayload)
  });
  assert.equal(checkoutRes.status, 201);
  const checkoutData = (await checkoutRes.json()).data;
  const order = checkoutData.order;
  assert.ok(order.order_number);
  assert.equal(order.status, 'pending');
  assert.equal(order.subtotal, '50000.00');
  assert.equal(order.discount_amount, '5000.00');
  assert.equal(checkoutData.isReplay, false);

  // WhatsApp click-to-chat URL is generated using configured store number
  assert.ok(checkoutData.whatsappUrl.includes('https://wa.me/201011112222'));
  assert.ok(checkoutData.whatsappUrl.includes(encodeURIComponent(order.order_number)));

  // Cart is cleared post-commit
  const cartAfterCheckout = await fetch(`${baseUrl}/api/v1/cart`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  const cartAfterData = (await cartAfterCheckout.json()).data;
  assert.equal(cartAfterData.lines.length, 0);

  // Stock is UNTOUCHED on pending creation (remains 5)
  const variantCheck = await dataSource.getRepository('ProductVariant').findOne({
    where: { id: variantId }
  });
  assert.equal(variantCheck.stock_quantity, 5);

  // 7. Safe Idempotency-Key Replay
  const replayRes = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
      'Idempotency-Key': 'E2E-IDEM-001'
    },
    body: JSON.stringify(checkoutPayload)
  });
  assert.equal(replayRes.status, 200);
  const replayData = (await replayRes.json()).data;
  assert.equal(replayData.isReplay, true);
  assert.equal(replayData.order.order_number, order.order_number);

  // 8. Idempotency Conflict Detection on Altered Payload
  const conflictRes = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
      'Idempotency-Key': 'E2E-IDEM-001'
    },
    body: JSON.stringify({
      ...checkoutPayload,
      address: { ...checkoutPayload.address, governorate: 'Giza' }
    })
  });
  assert.equal(conflictRes.status, 409);

  // 9. Admin Inspects Order Queue
  const queueRes = await fetch(`${baseUrl}/api/v1/admin/orders?status=pending`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert.equal(queueRes.status, 200);
  const queueData = (await queueRes.json()).data;
  assert.ok(queueData.some((o) => o.order_number === order.order_number));

  // 10. Attempting Confirmation Prematurely Fails
  const prematureConfirmRes = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert.equal(prematureConfirmRes.status, 409); // agreement & final total required

  // 11. Admin Dispatches Shipping Fee & Final Total (EGP 70 shipping)
  const setTotalRes = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/final-total`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({ shipping_fee: 70 })
  });
  assert.equal(setTotalRes.status, 200);
  const updatedOrder = (await setTotalRes.json()).data;
  assert.equal(updatedOrder.shipping_fee, '70.00');
  assert.equal(updatedOrder.final_total, '45070.00'); // 50000 - 5000 + 70
  assert.equal(updatedOrder.pricing_version, 2);
  assert.ok(updatedOrder.final_total_sent_at);
  assert.ok(updatedOrder.expires_at);

  // 12. Record Customer Agreement to Pricing Version 2
  const agreementRes = await fetch(
    `${baseUrl}/api/v1/admin/orders/${order.id}/customer-agreement`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ agreed_pricing_version: 2 })
    }
  );
  assert.equal(agreementRes.status, 200);

  // 13. Admin Confirms Order -> Atomic Stock Deduction (5 -> 3) & Coupon Redeemed
  const confirmRes = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert.equal(confirmRes.status, 200);
  const confirmedOrder = (await confirmRes.json()).data;
  assert.equal(confirmedOrder.status, 'confirmed');
  assert.ok(confirmedOrder.confirmed_at);
  assert.ok(confirmedOrder.stock_deducted_at);

  // Verify stock atomically reduced in database
  const variantAfterConfirm = await dataSource.getRepository('ProductVariant').findOne({
    where: { id: variantId }
  });
  assert.equal(variantAfterConfirm.stock_quantity, 3); // 5 - 2 = 3

  // Verify coupon redemption recorded
  const redemption = await dataSource.getRepository('CouponRedemption').findOne({
    where: { order_id: order.id }
  });
  assert.ok(redemption);
  assert.equal(redemption.reversed_at, null);

  // Duplicate confirmation fails
  const duplicateConfirmRes = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert.equal(duplicateConfirmRes.status, 409);

  // 14. Status Progression: confirmed -> processing
  const transitionRes = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      new_status: 'processing',
      reason: 'Order packed and assigned to courier'
    })
  });
  assert.equal(transitionRes.status, 200);
  const processingOrder = (await transitionRes.json()).data;
  assert.equal(processingOrder.status, 'processing');

  // 15. Cancellation Reversal: processing -> cancelled
  const cancelRes = await fetch(`${baseUrl}/api/v1/admin/orders/${order.id}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      new_status: 'cancelled',
      reason: 'Customer requested cancellation before courier dispatch'
    })
  });
  assert.equal(cancelRes.status, 200);
  const cancelledOrder = (await cancelRes.json()).data;
  assert.equal(cancelledOrder.status, 'cancelled');
  assert.ok(cancelledOrder.cancelled_at);
  assert.ok(cancelledOrder.stock_restored_at);

  // Verify stock atomically restored back to 5
  const variantAfterCancel = await dataSource.getRepository('ProductVariant').findOne({
    where: { id: variantId }
  });
  assert.equal(variantAfterCancel.stock_quantity, 5);

  // Verify coupon redemption marked reversed
  const redemptionAfterCancel = await dataSource.getRepository('CouponRedemption').findOne({
    where: { order_id: order.id }
  });
  assert.ok(redemptionAfterCancel.reversed_at);

  // 16. Audit Events Immutability
  const orderWithEvents = await dataSource.getRepository('Order').findOne({
    where: { id: order.id },
    relations: ['events']
  });
  const events = orderWithEvents.events.sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const eventTypes = events.map((e) => e.event_type);
  assert.ok(eventTypes.includes('created'));
  assert.ok(eventTypes.includes('final_total_sent'));
  assert.ok(eventTypes.includes('customer_agreed'));
  assert.ok(eventTypes.includes('confirmed'));
  assert.ok(eventTypes.includes('status_changed'));
  assert.ok(eventTypes.includes('cancelled'));
});
