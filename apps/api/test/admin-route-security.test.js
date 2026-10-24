const test = require('node:test');
const assert = require('node:assert/strict');
const otplib = require('otplib');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { hashPassword } = require('../src/modules/auth/password-service');
const { createSession } = require('../src/modules/auth/session-service');
const { encryptTotpSecret } = require('../src/modules/auth/totp-service');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Admin Route Security & Non-Default Authentication Enforcement', async (t) => {
  const dataSource = await getTestDataSource();
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: dataSource.options.url,
    CORS_ORIGIN: 'http://localhost:3000',
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long-value',
    TOTP_ENCRYPTION_KEY: 'test-totp-encryption-key-32-bytes!'
  });
  const logger = createLogger('silent');
  const emailService = createEmailService({ config, logger });
  const app = createApp({ config, logger, dataSource, emailService });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let customerToken;
  let totpAdminUser;
  let totpSecretPlain;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const totpRepo = dataSource.getRepository('AdminTotpCredential');
    const now = new Date();
    const pwHash = await hashPassword('ValidPassword123!');

    // Admin user
    await userRepo.save({
      name: 'Operations Admin',
      email: 'admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    // Super Admin user
    await userRepo.save({
      name: 'Root Super Admin',
      email: 'superadmin@pixelstore.com',
      password_hash: pwHash,
      role: 'super_admin',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    // Customer user
    const customerUser = await userRepo.save({
      name: 'Regular Customer',
      email: 'customer@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    const custSession = await createSession(dataSource, {
      userId: customerUser.id,
      role: 'customer'
    });
    customerToken = custSession.token;

    // Unverified admin
    await userRepo.save({
      name: 'Unverified Admin',
      email: 'unverified-admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: null,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    // Inactive admin
    await userRepo.save({
      name: 'Deactivated Admin',
      email: 'inactive-admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: false,
      created_at: now,
      updated_at: now
    });

    // Admin with TOTP enrolled
    totpAdminUser = await userRepo.save({
      name: 'MFA Admin',
      email: 'totp-admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    totpSecretPlain = otplib.generateSecret();
    const encryptedSecret = encryptTotpSecret(totpSecretPlain, config.TOTP_ENCRYPTION_KEY);
    await totpRepo.save({
      user_id: totpAdminUser.id,
      secret_encrypted: encryptedSecret,
      enabled_at: now,
      created_at: now,
      updated_at: now
    });
  });

  t.after(async () => {
    server.close();
    await closeTestDataSource();
  });

  await t.test(
    '1. Unauthenticated direct access to admin APIs returns 401 Unauthorized',
    async () => {
      const endpoints = [
        { method: 'GET', path: '/api/v1/admin/orders' },
        { method: 'GET', path: '/api/v1/admin/catalog/products' },
        { method: 'GET', path: '/api/v1/admin/users' },
        { method: 'POST', path: '/api/v1/admin/orders/confirm-payment' }
      ];

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' }
        });
        assert.strictEqual(res.status, 401, `Expected 401 for ${ep.method} ${ep.path}`);
        const body = await res.json();
        assert.strictEqual(body.error.code, 'UNAUTHORIZED');
      }
    }
  );

  await t.test(
    '2. Customer accounts cannot access admin APIs directly (403 Forbidden)',
    async () => {
      const endpoints = [
        { method: 'GET', path: '/api/v1/admin/orders' },
        { method: 'GET', path: '/api/v1/admin/catalog/products' },
        { method: 'GET', path: '/api/v1/admin/users' }
      ];

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': customerToken
          }
        });
        assert.strictEqual(res.status, 403, `Expected 403 for customer on ${ep.path}`);
        const body = await res.json();
        assert.strictEqual(body.error.code, 'FORBIDDEN');
      }
    }
  );

  await t.test(
    '3. Admin login flow strictly rejects customer credentials with 403 Forbidden',
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@pixelstore.com',
          password: 'ValidPassword123!'
        })
      });

      assert.strictEqual(res.status, 403, 'Customer accounts must be rejected by admin login');
      const body = await res.json();
      assert.strictEqual(body.error.code, 'FORBIDDEN');
      assert.match(body.error.message, /Staff credentials required/i);
    }
  );

  await t.test('4. Admin login rejects invalid credentials with 401 Unauthorized', async () => {
    // Non-existent user
    const res1 = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unknown@pixelstore.com',
        password: 'ValidPassword123!'
      })
    });
    assert.strictEqual(res1.status, 401);
    const body1 = await res1.json();
    assert.strictEqual(body1.error.code, 'AUTH_INVALID');

    // Wrong password for existing admin
    const res2 = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pixelstore.com',
        password: 'WrongPassword999!'
      })
    });
    assert.strictEqual(res2.status, 401);
    const body2 = await res2.json();
    assert.strictEqual(body2.error.code, 'AUTH_INVALID');
  });

  await t.test('5. Admin login rejects inactive or unverified staff accounts', async () => {
    // Inactive admin
    const resInactive = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'inactive-admin@pixelstore.com',
        password: 'ValidPassword123!'
      })
    });
    assert.strictEqual(resInactive.status, 401);

    // Unverified admin
    const resUnverified = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unverified-admin@pixelstore.com',
        password: 'ValidPassword123!'
      })
    });
    assert.strictEqual(resUnverified.status, 403);
    const bodyUnverified = await resUnverified.json();
    assert.strictEqual(bodyUnverified.error.code, 'EMAIL_UNVERIFIED');
  });

  await t.test(
    '6. Admin login succeeds for admin and super_admin with 1-hour session timeout',
    async () => {
      // Admin login
      const resAdmin = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@pixelstore.com',
          password: 'ValidPassword123!'
        })
      });

      assert.strictEqual(resAdmin.status, 200);
      const bodyAdmin = await resAdmin.json();
      assert.strictEqual(bodyAdmin.data.user.role, 'admin');
      assert.strictEqual(bodyAdmin.data.user.email, 'admin@pixelstore.com');

      // Verify session cookies and staff 60-minute timeout (Max-Age=3600)
      const setCookie = resAdmin.headers.get('set-cookie');
      assert.ok(setCookie, 'Set-Cookie header must be present');
      assert.match(setCookie, /pixel_store_session=/);
      assert.match(setCookie, /Max-Age=3600/i, 'Staff session must timeout after 60 minutes');
      assert.match(setCookie, /pixel_store_csrf=/);

      // Super Admin login
      const resSuper = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'superadmin@pixelstore.com',
          password: 'ValidPassword123!'
        })
      });

      assert.strictEqual(resSuper.status, 200);
      const bodySuper = await resSuper.json();
      assert.strictEqual(bodySuper.data.user.role, 'super_admin');
    }
  );

  await t.test('7. Admin login enforces TOTP verification when enrolled', async () => {
    // Missing TOTP code
    const resMissing = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'totp-admin@pixelstore.com',
        password: 'ValidPassword123!'
      })
    });
    assert.strictEqual(resMissing.status, 403);
    const bodyMissing = await resMissing.json();
    assert.strictEqual(bodyMissing.error.code, 'TOTP_REQUIRED');

    // Invalid TOTP code
    const resInvalid = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'totp-admin@pixelstore.com',
        password: 'ValidPassword123!',
        totpCode: '000000'
      })
    });
    assert.strictEqual(resInvalid.status, 401);
    const bodyInvalid = await resInvalid.json();
    assert.strictEqual(bodyInvalid.error.code, 'AUTH_INVALID');

    // Valid TOTP code
    const validCode = otplib.generateSync({ secret: totpSecretPlain });
    const resValid = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'totp-admin@pixelstore.com',
        password: 'ValidPassword123!',
        totpCode: validCode
      })
    });
    assert.strictEqual(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.strictEqual(bodyValid.data.user.email, 'totp-admin@pixelstore.com');
  });

  await t.test('8. Customer login endpoint remains separate and functional', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@pixelstore.com',
        password: 'ValidPassword123!'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.user.role, 'customer');

    // Customer cookie timeout should be 30 days (2592000s)
    const setCookie = res.headers.get('set-cookie');
    assert.match(setCookie, /Max-Age=2592000/i);
  });
});
