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

test('Customer Checkout & Orders Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-orders');
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

  let customer1;
  let customer1Token;
  let customer2;
  let customer2Token;
  let unverifiedCustomer;
  let unverifiedToken;
  let testVariant;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('TestPass123!');

    // Customer 1 (Verified)
    customer1 = await userRepo.save({
      name: 'Customer Verified',
      email: 'cust1@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true
    });
    const s1 = await createSession(dataSource, customer1);
    customer1Token = s1.token;

    // Customer 2 (Verified)
    customer2 = await userRepo.save({
      name: 'Customer Two',
      email: 'cust2@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true
    });
    const s2 = await createSession(dataSource, customer2);
    customer2Token = s2.token;

    // Unverified Customer
    unverifiedCustomer = await userRepo.save({
      name: 'Customer Unverified',
      email: 'unverified@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: null,
      is_active: true
    });
    const s3 = await createSession(dataSource, unverifiedCustomer);
    unverifiedToken = s3.token;

    // Seed store settings
    await dataSource.getRepository('StoreSetting').save({
      id: 1,
      whatsapp_number: '+201011112222',
      updated_at: now
    });

    // Seed Category & Brand
    const cat = await dataSource.getRepository('Category').save({
      name: 'Smartphones',
      slug: 'smartphones',
      is_active: true
    });
    const brand = await dataSource.getRepository('Brand').save({
      name: 'Google',
      slug: 'google',
      is_active: true
    });

    // Seed Product & Variant (Stock: 10)
    const product = await dataSource.getRepository('Product').save({
      name: 'Google Pixel 8 Pro',
      slug: 'google-pixel-8-pro',
      category_id: cat.id,
      brand_id: brand.id,
      condition: 'new',
      is_published: true
    });

    testVariant = await dataSource.getRepository('ProductVariant').save({
      product_id: product.id,
      sku: 'PIXEL8P-BLK-128',
      variant_label: 'Obsidian, 128GB',
      price: '30000.00',
      stock_quantity: 10,
      condition: 'new',
      is_active: true,
      is_default: true
    });

    // Seed Coupons
    const endsFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await dataSource.getRepository('Coupon').save({
      code: 'PROMO10',
      discount_type: 'percentage',
      discount_value: '10.00',
      minimum_subtotal: '1000.00',
      starts_at: null,
      ends_at: endsFuture,
      is_active: true
    });

    await dataSource.getRepository('Coupon').save({
      code: 'SAVE500',
      discount_type: 'fixed',
      discount_value: '500.00',
      minimum_subtotal: '5000.00',
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

  await t.test('Authentication & Verification checks on checkout and quote', async () => {
    // 1. Unauthenticated checkout fails
    const resNoAuth = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'key-1' },
      body: JSON.stringify({
        address: {
          recipient_name: 'Test Name',
          mobile: '01012345678',
          governorate: 'Cairo',
          area: 'Maadi',
          street: '12 Street',
          building_number: '5'
        },
        terms_accepted: true
      })
    });
    assert.strictEqual(resNoAuth.status, 401);

    // 2. Unverified customer checkout fails (403)
    const resUnverified = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-1',
        Authorization: `Bearer ${unverifiedToken}`
      },
      body: JSON.stringify({
        address: {
          recipient_name: 'Test Name',
          mobile: '01012345678',
          governorate: 'Cairo',
          area: 'Maadi',
          street: '12 Street',
          building_number: '5'
        },
        terms_accepted: true
      })
    });
    assert.strictEqual(resUnverified.status, 403);
    const bodyUnverified = await resUnverified.json();
    assert.strictEqual(bodyUnverified.error.code, 'EMAIL_UNVERIFIED');

    // 3. Checkout with empty cart fails with 409 CART_EMPTY
    const resEmptyCart = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-1',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({
        address: {
          recipient_name: 'Test Name',
          mobile: '01012345678',
          governorate: 'Cairo',
          area: 'Maadi',
          street: '12 Street',
          building_number: '5'
        },
        terms_accepted: true
      })
    });
    assert.strictEqual(resEmptyCart.status, 409);
    const bodyEmpty = await resEmptyCart.json();
    assert.strictEqual(bodyEmpty.error.code, 'CART_EMPTY');
  });

  await t.test(
    'Coupon quote endpoint calculates server-side discount without reservation',
    async () => {
      // Add 1 item to customer1's cart: price 30000.00
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ variantId: testVariant.id, quantity: 1 })
      });

      // 1. Quote percentage coupon (10% of 30,000 = 3,000)
      const resQuotePct = await fetch(`${baseUrl}/api/v1/coupons/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ code: 'PROMO10' })
      });
      assert.strictEqual(resQuotePct.status, 200);
      const quotePctBody = await resQuotePct.json();
      assert.strictEqual(quotePctBody.data.discount_amount, 3000);
      assert.strictEqual(quotePctBody.data.new_subtotal, 27000);

      // 2. Quote fixed coupon (500 EGP off 30,000 = 29,500)
      const resQuoteFixed = await fetch(`${baseUrl}/api/v1/coupons/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ code: 'SAVE500' })
      });
      assert.strictEqual(resQuoteFixed.status, 200);
      const quoteFixedBody = await resQuoteFixed.json();
      assert.strictEqual(quoteFixedBody.data.discount_amount, 500);
      assert.strictEqual(quoteFixedBody.data.new_subtotal, 29500);

      // 3. Quoting coupon must NOT create redemption record in DB
      const redemptionsCount = await dataSource.getRepository('CouponRedemption').count();
      assert.strictEqual(redemptionsCount, 0);

      // 4. Invalid coupon code returns 404
      const resQuoteInvalid = await fetch(`${baseUrl}/api/v1/coupons/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ code: 'NONEXISTENT' })
      });
      assert.strictEqual(resQuoteInvalid.status, 404);
    }
  );

  await t.test(
    'Checkout creates Pending order, snapshots, clears cart, does NOT deduct stock, and generates WhatsApp URL',
    async () => {
      // Add 2 items (unit price 30,000 => subtotal 60,000) to customer1's cart
      await fetch(`${baseUrl}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ variantId: testVariant.id, quantity: 2 })
      });

      const initialStock = (
        await dataSource.getRepository('ProductVariant').findOne({ where: { id: testVariant.id } })
      ).stock_quantity;
      assert.strictEqual(initialStock, 10);

      const idempotencyKey = 'checkout-key-unique-001';
      const checkoutPayload = {
        address: {
          recipient_name: 'Mohamed Ahmed',
          mobile: '01098765432',
          governorate: 'Cairo',
          area: 'Nasr City',
          street: 'Abbas El Akkad',
          building_number: '14',
          floor: '3',
          apartment: '302',
          landmark: 'Near City Stars'
        },
        coupon_code: 'PROMO10',
        terms_accepted: true,
        terms_version: 'v1.0'
      };

      const resCheckout = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify(checkoutPayload)
      });

      assert.strictEqual(resCheckout.status, 201);
      const checkoutBody = await resCheckout.json();
      const order = checkoutBody.data.order;
      const whatsappUrl = checkoutBody.data.whatsappUrl;

      // 1. Verify order details
      assert.ok(order.order_number.startsWith('ORD-'));
      assert.strictEqual(order.status, 'pending');
      assert.strictEqual(Number(order.subtotal), 60000);
      assert.strictEqual(Number(order.discount_amount), 6000); // 10% coupon
      assert.strictEqual(order.shipping_fee, null); // Pending admin determination
      assert.strictEqual(order.final_total, null);
      assert.strictEqual(order.pricing_version, 1);
      assert.strictEqual(order.agreed_pricing_version, null);

      // 2. Verify immutable snapshots
      assert.strictEqual(order.items.length, 1);
      assert.strictEqual(order.items[0].product_name_snapshot, 'Google Pixel 8 Pro');
      assert.strictEqual(order.items[0].sku_snapshot, 'PIXEL8P-BLK-128');
      assert.strictEqual(order.items[0].quantity, 2);
      assert.strictEqual(Number(order.items[0].unit_price), 30000);
      assert.strictEqual(Number(order.items[0].line_total), 60000);

      assert.strictEqual(order.address.recipient_name, 'Mohamed Ahmed');
      assert.strictEqual(order.address.mobile, '01098765432');
      assert.strictEqual(order.address.governorate, 'Cairo');
      assert.strictEqual(order.address.area, 'Nasr City');

      // 3. Invariant: Stock must NOT be deducted on pending order creation!
      const currentStock = (
        await dataSource.getRepository('ProductVariant').findOne({ where: { id: testVariant.id } })
      ).stock_quantity;
      assert.strictEqual(currentStock, 10, 'Stock must remain unchanged for pending order');

      // 4. Cart must be cleared after successful commit
      const cartRes = await fetch(`${baseUrl}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${customer1Token}` }
      });
      const cartBody = await cartRes.json();
      assert.strictEqual(cartBody.data.lines.length, 0, 'Cart must be empty post checkout');

      // 5. WhatsApp URL format verification
      assert.ok(whatsappUrl.startsWith('https://wa.me/201011112222?text='));
      const decodedText = decodeURIComponent(whatsappUrl.split('?text=')[1]);
      assert.ok(decodedText.includes(order.order_number));
      assert.ok(decodedText.includes('Mohamed Ahmed'));
      assert.ok(decodedText.includes('Cairo'));
      assert.ok(decodedText.includes('Subtotal: EGP 60000.00'));
      assert.ok(decodedText.includes('Discount: -EGP 6000.00'));
      assert.ok(decodedText.includes('Shipping: Pending calculation'));
    }
  );

  await t.test('Idempotency-Key guarantees safe retry and blocks conflicts', async () => {
    // Add 1 item to customer1's cart
    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: testVariant.id, quantity: 1 })
    });

    const key = 'idem-retry-key-999';
    const payload = {
      address: {
        recipient_name: 'Sara Nour',
        mobile: '01123456789',
        governorate: 'Giza',
        area: 'Dokki',
        street: 'Mossadak St',
        building_number: '20'
      },
      terms_accepted: true,
      terms_version: 'v1.0'
    };

    // First request: 201 Created
    const res1 = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res1.status, 201);
    const body1 = await res1.json();
    const orderNumber1 = body1.data.order.order_number;

    // Retry request with EXACT same key and payload: 200 Replay
    const res2 = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();
    assert.strictEqual(body2.data.isReplay, true);
    assert.strictEqual(body2.data.order.order_number, orderNumber1);

    // Verify DB count of orders for this user is exactly 1 (no duplicate order created)
    const userOrdersCount = await dataSource
      .getRepository('Order')
      .count({ where: { user_id: customer1.id } });
    assert.strictEqual(userOrdersCount, 1);

    // Same key with DIFFERENT payload -> 409 IDEMPOTENCY_CONFLICT
    const differentPayload = {
      ...payload,
      address: { ...payload.address, recipient_name: 'Different Name' }
    };
    const resConflict = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify(differentPayload)
    });
    assert.strictEqual(resConflict.status, 409);
    const conflictBody = await resConflict.json();
    assert.strictEqual(conflictBody.error.code, 'IDEMPOTENCY_CONFLICT');
  });

  await t.test('Cart is preserved if checkout validation fails', async () => {
    // Add 1 item to customer1's cart
    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: testVariant.id, quantity: 1 })
    });

    // Attempt checkout with an invalid mobile number
    const resBadMobile = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'fail-cart-preserve-key',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({
        address: {
          recipient_name: 'Fail User',
          mobile: '12345', // Invalid Egyptian mobile
          governorate: 'Cairo',
          area: 'Zamalek',
          street: 'Brazil St',
          building_number: '1'
        },
        terms_accepted: true
      })
    });
    assert.strictEqual(resBadMobile.status, 400);

    // Check cart is STILL preserved with item
    const cartRes = await fetch(`${baseUrl}/api/v1/cart`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const cartBody = await cartRes.json();
    assert.strictEqual(cartBody.data.lines.length, 1);
  });

  await t.test('Customer order viewing and self-cancellation of pending order', async () => {
    // Add item and checkout
    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ variantId: testVariant.id, quantity: 1 })
    });

    const res = await fetch(`${baseUrl}/api/v1/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'view-cancel-key-1',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({
        address: {
          recipient_name: 'Customer One',
          mobile: '01011112222',
          governorate: 'Alexandria',
          area: 'Smouha',
          street: 'Victor Emanuel St',
          building_number: '30'
        },
        terms_accepted: true
      })
    });
    const orderData = (await res.json()).data.order;

    // 1. Customer 1 can list their orders
    const resList = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert.strictEqual(resList.status, 200);
    const listBody = await resList.json();
    assert.strictEqual(listBody.data.length, 1);
    assert.strictEqual(listBody.data[0].order_number, orderData.order_number);

    // 2. Customer 2 CANNOT see Customer 1's order list
    const resList2 = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${customer2Token}` }
    });
    assert.strictEqual(resList2.status, 200);
    const listBody2 = await resList2.json();
    assert.strictEqual(listBody2.data.length, 0);

    // 3. Customer 2 CANNOT fetch Customer 1's order by reference (404)
    const resGetOther = await fetch(`${baseUrl}/api/v1/orders/${orderData.order_number}`, {
      headers: { Authorization: `Bearer ${customer2Token}` }
    });
    assert.strictEqual(resGetOther.status, 404);

    // 4. Customer 1 can self-cancel their pending order
    const resCancel = await fetch(`${baseUrl}/api/v1/orders/${orderData.order_number}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`
      },
      body: JSON.stringify({ reason: 'Changed my mind' })
    });
    assert.strictEqual(resCancel.status, 200);
    const cancelBody = await resCancel.json();
    assert.strictEqual(cancelBody.data.order.status, 'cancelled');

    // 5. Attempting to cancel already cancelled order returns 409
    const resCancelAgain = await fetch(
      `${baseUrl}/api/v1/orders/${orderData.order_number}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        }
      }
    );
    assert.strictEqual(resCancelAgain.status, 409);
  });
});
