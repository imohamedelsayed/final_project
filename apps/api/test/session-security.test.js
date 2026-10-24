const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createSession, validateSession } = require('../src/modules/auth/session-service');
const { hashPassword } = require('../src/modules/auth/password-service');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

test('Session Security, Inactivity Enforcement & CSRF Protection', async (t) => {
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
  const app = createApp({ config, logger, dataSource });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let customerUser;
  let staffUser;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('SecretPass123!');

    customerUser = await userRepo.save({
      name: 'Customer Chris',
      email: 'customer@test.com',
      password_hash: pwHash,
      role: 'customer',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    staffUser = await userRepo.save({
      name: 'Staff Sam',
      email: 'staff@test.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    });
  });

  await t.test(
    'customer session permits access within 30 days and revokes after 30 days idle',
    async () => {
      const { token, session } = await createSession(dataSource, {
        userId: customerUser.id,
        role: 'customer'
      });

      // 1. Valid right away
      const immediate = await validateSession(dataSource, token);
      assert.ok(immediate);
      assert.equal(immediate.user.id, customerUser.id);

      // 2. Simulate 29 days idle (within 30 days limit)
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      await dataSource
        .getRepository('Session')
        .update({ id: session.id }, { last_activity_at: twentyNineDaysAgo });

      const validAfter29Days = await validateSession(dataSource, token);
      assert.ok(validAfter29Days, 'Session must remain valid within 30 days of activity');

      // 3. Simulate 31 days idle (past 30 days limit)
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await dataSource
        .getRepository('Session')
        .update({ id: session.id }, { last_activity_at: thirtyOneDaysAgo });

      const expiredAfter31Days = await validateSession(dataSource, token);
      assert.equal(expiredAfter31Days, null, 'Session must expire after 30 days of inactivity');

      // Confirm marked revoked in DB
      const dbSession = await dataSource
        .getRepository('Session')
        .findOne({ where: { id: session.id } });
      assert.ok(dbSession.revoked_at !== null);
    }
  );

  await t.test(
    'staff session permits access within 60 minutes and revokes after 60 minutes idle',
    async () => {
      const { token, session } = await createSession(dataSource, {
        userId: staffUser.id,
        role: 'admin'
      });

      // 1. Valid right away
      const immediate = await validateSession(dataSource, token);
      assert.ok(immediate);
      assert.equal(immediate.user.role, 'admin');

      // 2. Simulate 50 minutes idle (within 60 min limit)
      const fiftyMinsAgo = new Date(Date.now() - 50 * 60 * 1000);
      await dataSource
        .getRepository('Session')
        .update({ id: session.id }, { last_activity_at: fiftyMinsAgo });

      const validAfter50Mins = await validateSession(dataSource, token);
      assert.ok(validAfter50Mins, 'Staff session must remain valid within 60 minutes of activity');

      // 3. Simulate 65 minutes idle (past 60 min limit)
      const sixtyFiveMinsAgo = new Date(Date.now() - 65 * 60 * 1000);
      await dataSource
        .getRepository('Session')
        .update({ id: session.id }, { last_activity_at: sixtyFiveMinsAgo });

      const expiredAfter65Mins = await validateSession(dataSource, token);
      assert.equal(
        expiredAfter65Mins,
        null,
        'Staff session must expire after 60 minutes of inactivity'
      );

      // Confirm marked revoked in DB
      const dbSession = await dataSource
        .getRepository('Session')
        .findOne({ where: { id: session.id } });
      assert.ok(dbSession.revoked_at !== null);
    }
  );

  await t.test(
    'CSRF protection blocks mutating requests with session cookie when CSRF token is invalid or missing',
    async () => {
      const { token } = await createSession(dataSource, {
        userId: customerUser.id,
        role: 'customer'
      });

      // Request with session cookie but NO origin or CSRF token -> 403 Forbidden
      const blockedRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `pixel_store_session=${token}`
        }
      });
      assert.equal(blockedRes.status, 403);
      const blockedBody = await blockedRes.json();
      assert.ok(blockedBody.error.message.includes('CSRF'));

      // Request with session cookie and mismatched CSRF token -> 403 Forbidden
      const mismatchRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `pixel_store_session=${token}; pixel_store_csrf=valid-cookie-token`,
          'x-csrf-token': 'attacker-mismatched-token'
        }
      });
      assert.equal(mismatchRes.status, 403);

      // Request with valid double-submit CSRF token -> 200 OK
      const successRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `pixel_store_session=${token}; pixel_store_csrf=matching-secret-token`,
          'x-csrf-token': 'matching-secret-token'
        }
      });
      assert.equal(successRes.status, 200);
    }
  );

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDataSource();
  });
});
