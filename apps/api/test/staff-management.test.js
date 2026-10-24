const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { hashPassword } = require('../src/modules/auth/password-service');
const { createSession } = require('../src/modules/auth/session-service');
const { LocalStorageAdapter } = require('../src/modules/media/storage-adapter');
const { getTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Staff Management & Coupon Deletion API Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-staff');
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

  let superAdminUser;
  let regularAdminUser;
  let customerUser;
  let superAdminToken;
  let regularAdminToken;
  let customerToken;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('AdminPass123!');

    superAdminUser = await userRepo.save({
      name: 'Super Boss',
      email: 'super@pixelstore.com',
      password_hash: pwHash,
      role: 'super_admin',
      email_verified_at: now,
      is_active: true
    });

    regularAdminUser = await userRepo.save({
      name: 'Regular Staff',
      email: 'staff@pixelstore.com',
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

    const superSession = await createSession(dataSource, superAdminUser);
    superAdminToken = superSession.token;

    const staffSession = await createSession(dataSource, regularAdminUser);
    regularAdminToken = staffSession.token;

    const custSession = await createSession(dataSource, customerUser);
    customerToken = custSession.token;
  });

  t.after(async () => {
    server.close();
  });

  await t.test('GET /api/v1/admin/users - Authorization & Listing', async () => {
    // 1. Customer is rejected with 403
    const custRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { 'x-session-token': customerToken }
    });
    assert.equal(custRes.status, 403);

    // 2. Regular admin is rejected with 403 (Super Admin only)
    const adminRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { 'x-session-token': regularAdminToken }
    });
    assert.equal(adminRes.status, 403);

    // 3. Super Admin can view staff list
    const superRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { 'x-session-token': superAdminToken }
    });
    assert.equal(superRes.status, 200);
    const body = await superRes.json();
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 2); // superAdmin and regularAdmin
    // Ensure sensitive data is not leaked
    body.data.forEach((u) => {
      assert.equal(u.password_hash, undefined);
      assert.equal(u.password, undefined);
      assert.equal(u.totp_credential, undefined);
      assert.equal(typeof u.totp_enabled, 'boolean');
    });
  });

  await t.test('POST /api/v1/admin/users - Create Staff Member', async () => {
    // 1. Regular admin cannot create staff
    const deniedRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': regularAdminToken
      },
      body: JSON.stringify({
        name: 'New Officer',
        email: 'officer@pixelstore.com',
        password: 'ValidPassword123!',
        role: 'admin'
      })
    });
    assert.equal(deniedRes.status, 403);

    // 2. Super Admin successfully creates staff member
    const successRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': superAdminToken
      },
      body: JSON.stringify({
        name: 'New Officer',
        email: 'officer@pixelstore.com',
        password: 'ValidPassword123!',
        role: 'admin'
      })
    });
    assert.equal(successRes.status, 201);
    const body = await successRes.json();
    assert.equal(body.data.email, 'officer@pixelstore.com');
    assert.equal(body.data.role, 'admin');
    assert.equal(body.data.password_hash, undefined);

    // 3. Duplicate email conflict
    const dupRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': superAdminToken
      },
      body: JSON.stringify({
        name: 'Duplicate Officer',
        email: 'officer@pixelstore.com',
        password: 'ValidPassword123!',
        role: 'admin'
      })
    });
    assert.equal(dupRes.status, 409);
  });

  await t.test(
    'PATCH /api/v1/admin/users/:id - Update Staff & Self-Lockout Prevention',
    async () => {
      // 1. Super Admin updates regular admin name and role
      const updateRes = await fetch(`${baseUrl}/api/v1/admin/users/${regularAdminUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': superAdminToken
        },
        body: JSON.stringify({
          name: 'Promoted Staff',
          role: 'super_admin'
        })
      });
      assert.equal(updateRes.status, 200);
      const body = await updateRes.json();
      assert.equal(body.data.name, 'Promoted Staff');
      assert.equal(body.data.role, 'super_admin');

      // 2. Self-deactivation prevention
      const selfDeactivateRes = await fetch(`${baseUrl}/api/v1/admin/users/${superAdminUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': superAdminToken
        },
        body: JSON.stringify({
          is_active: false
        })
      });
      assert.equal(selfDeactivateRes.status, 400);

      // 3. Self-demotion prevention
      const selfDemoteRes = await fetch(`${baseUrl}/api/v1/admin/users/${superAdminUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': superAdminToken
        },
        body: JSON.stringify({
          role: 'admin'
        })
      });
      assert.equal(selfDemoteRes.status, 400);
    }
  );

  await t.test('DELETE /api/v1/admin/coupons/:id - Unused vs Used Coupon Deletion', async () => {
    const couponRepo = dataSource.getRepository('Coupon');

    // Create an unused coupon
    const unusedCoupon = await couponRepo.save({
      code: 'PROMO10',
      discount_type: 'percentage',
      discount_value: '10.00',
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: true
    });

    // 1. Customer cannot delete coupon
    const custDelRes = await fetch(`${baseUrl}/api/v1/admin/coupons/${unusedCoupon.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': customerToken }
    });
    assert.equal(custDelRes.status, 403);

    // 2. Admin can delete unused coupon
    const adminDelRes = await fetch(`${baseUrl}/api/v1/admin/coupons/${unusedCoupon.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': regularAdminToken }
    });
    assert.equal(adminDelRes.status, 200);

    // Verify it is gone
    const checkDeleted = await couponRepo.findOne({ where: { id: unusedCoupon.id } });
    assert.equal(checkDeleted, null);

    // 3. Create a coupon and simulate order linkage
    const usedCoupon = await couponRepo.save({
      code: 'USED50',
      discount_type: 'fixed',
      discount_value: '50.00',
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: true
    });

    const orderRepo = dataSource.getRepository('Order');
    await orderRepo.save({
      order_number: 'ORD-TEST11',
      user_id: customerUser.id,
      coupon_id: usedCoupon.id,
      status: 'pending',
      subtotal: '1000.00',
      discount_amount: '50.00',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // Attempting to delete a used coupon returns 409 Conflict
    const conflictRes = await fetch(`${baseUrl}/api/v1/admin/coupons/${usedCoupon.id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': superAdminToken }
    });
    assert.equal(conflictRes.status, 409);
    const conflictBody = await conflictRes.json();
    assert.equal(conflictBody.error.code, 'COUPON_IN_USE');
  });
});
