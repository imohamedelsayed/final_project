const test = require('node:test');
const assert = require('node:assert/strict');
const otplib = require('otplib');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { hashPassword } = require('../src/modules/auth/password-service');
const { createSession } = require('../src/modules/auth/session-service');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Staff TOTP enrollment, verification, login, and recovery protection', async (t) => {
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

  let adminUser;
  let superAdminUser;
  let customerUser;
  let adminSessionToken;
  let superAdminSessionToken;
  let customerSessionToken;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('AdminPass123!');

    // Create Admin
    adminUser = await userRepo.save({
      name: 'Admin Joe',
      email: 'admin@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    // Create Super Admin
    superAdminUser = await userRepo.save({
      name: 'Super Admin Sarah',
      email: 'superadmin@pixelstore.com',
      password_hash: pwHash,
      role: 'super_admin',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    // Create Customer
    customerUser = await userRepo.save({
      name: 'Customer Chris',
      email: 'customer@pixelstore.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    // Create sessions
    const adminSess = await createSession(dataSource, { userId: adminUser.id, role: 'admin' });
    adminSessionToken = adminSess.token;

    const superSess = await createSession(dataSource, {
      userId: superAdminUser.id,
      role: 'super_admin'
    });
    superAdminSessionToken = superSess.token;

    const custSess = await createSession(dataSource, { userId: customerUser.id, role: 'customer' });
    customerSessionToken = custSess.token;
  });

  await t.test('customer cannot access staff TOTP setup endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/auth/totp/setup`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pixel_store_session=${customerSessionToken}`
      }
    });
    assert.equal(res.status, 403);
  });

  await t.test('staff can generate TOTP setup secret and enroll with valid code', async () => {
    // 1. Setup TOTP
    const setupRes = await fetch(`${baseUrl}/api/v1/admin/auth/totp/setup`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pixel_store_session=${adminSessionToken}`
      }
    });
    assert.equal(setupRes.status, 200);
    const setupBody = await setupRes.json();
    assert.ok(setupBody.data.secret);
    assert.ok(setupBody.data.otpauthUrl.includes('PixelStore'));

    const rawSecret = setupBody.data.secret;

    // 2. Verify with invalid code
    const invalidVerifyRes = await fetch(`${baseUrl}/api/v1/admin/auth/totp/verify`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${adminSessionToken}`
      },
      body: JSON.stringify({
        code: '000000',
        setupSecret: rawSecret
      })
    });
    assert.equal(invalidVerifyRes.status, 400);

    // 3. Verify with valid generated TOTP code
    const validCode = otplib.generateSync({ secret: rawSecret });
    const validVerifyRes = await fetch(`${baseUrl}/api/v1/admin/auth/totp/verify`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${adminSessionToken}`
      },
      body: JSON.stringify({
        code: validCode,
        setupSecret: rawSecret
      })
    });
    assert.equal(validVerifyRes.status, 200);

    // 4. Inspect DB: verify secret is encrypted and NEVER stored in plaintext
    const credInDb = await dataSource
      .getRepository('AdminTotpCredential')
      .findOne({ where: { user_id: adminUser.id } });
    assert.ok(credInDb);
    assert.ok(
      !credInDb.secret_encrypted.includes(rawSecret),
      'Plaintext secret must never be in DB'
    );
    assert.ok(
      credInDb.secret_encrypted.includes(':'),
      'Encrypted secret must be iv:tag:ciphertext'
    );
  });

  await t.test('enrolled staff requires TOTP code on login', async () => {
    // Enroll admin TOTP
    const setupRes = await fetch(`${baseUrl}/api/v1/admin/auth/totp/setup`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pixel_store_session=${adminSessionToken}`
      }
    });
    const { secret: rawSecret } = (await setupRes.json()).data;
    const code = otplib.generateSync({ secret: rawSecret });

    await fetch(`${baseUrl}/api/v1/admin/auth/totp/verify`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${adminSessionToken}`
      },
      body: JSON.stringify({ code, setupSecret: rawSecret })
    });

    // Login without TOTP code -> 403 TOTP_REQUIRED
    const missingTotpRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@pixelstore.com',
        password: 'AdminPass123!'
      })
    });
    assert.equal(missingTotpRes.status, 403);
    const missingBody = await missingTotpRes.json();
    assert.equal(missingBody.error.code, 'TOTP_REQUIRED');

    // Login with invalid TOTP code -> 401 AUTH_INVALID
    const wrongTotpRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@pixelstore.com',
        password: 'AdminPass123!',
        totpCode: '000000'
      })
    });
    assert.equal(wrongTotpRes.status, 401);
    const wrongBody = await wrongTotpRes.json();
    assert.equal(wrongBody.error.code, 'AUTH_INVALID');

    // Login with valid TOTP code -> 200 OK
    const currentCode = otplib.generateSync({ secret: rawSecret });
    const successRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@pixelstore.com',
        password: 'AdminPass123!',
        totpCode: currentCode
      })
    });
    assert.equal(successRes.status, 200);
    const successBody = await successRes.json();
    assert.equal(successBody.data.user.role, 'admin');
  });

  await t.test('only Super Admin can reset staff TOTP and action revokes sessions', async () => {
    // Enroll admin
    const setupRes = await fetch(`${baseUrl}/api/v1/admin/auth/totp/setup`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pixel_store_session=${adminSessionToken}`
      }
    });
    const { secret: rawSecret } = (await setupRes.json()).data;
    const code = otplib.generateSync({ secret: rawSecret });
    await fetch(`${baseUrl}/api/v1/admin/auth/totp/verify`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${adminSessionToken}`
      },
      body: JSON.stringify({ code, setupSecret: rawSecret })
    });

    // Customer attempt to reset -> 403
    const custAttempt = await fetch(`${baseUrl}/api/v1/admin/users/${adminUser.id}/reset-totp`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${customerSessionToken}`
      },
      body: JSON.stringify({ reason: 'Malicious attempt' })
    });
    assert.equal(custAttempt.status, 403);

    // Regular admin attempt to reset -> 403
    const adminAttempt = await fetch(`${baseUrl}/api/v1/admin/users/${adminUser.id}/reset-totp`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${adminSessionToken}`
      },
      body: JSON.stringify({ reason: 'Admin cannot reset staff TOTP' })
    });
    assert.equal(adminAttempt.status, 403);

    // Super Admin resets admin TOTP -> 200
    const superAdminRes = await fetch(`${baseUrl}/api/v1/admin/users/${adminUser.id}/reset-totp`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pixel_store_session=${superAdminSessionToken}`
      },
      body: JSON.stringify({ reason: 'Lost authenticator phone' })
    });
    assert.equal(superAdminRes.status, 200);

    // Verify credential row deleted in DB
    const credAfterReset = await dataSource
      .getRepository('AdminTotpCredential')
      .findOne({ where: { user_id: adminUser.id } });
    assert.equal(credAfterReset, null);

    // Verify admin sessions were revoked
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pixel_store_session=${adminSessionToken}`
      }
    });
    assert.equal(meRes.status, 401);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDataSource();
  });
});
