const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

function parseCookie(setCookieHeaders, cookieName) {
  if (!setCookieHeaders) return null;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of headers) {
    const parts = header.split(';')[0].split('=');
    if (parts[0].trim() === cookieName) {
      return parts.slice(1).join('=');
    }
  }
  return null;
}

test('Customer Authentication & Session Flow Integration Tests', async (t) => {
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

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);
    emailService.clearSentEmails();
  });

  await t.test(
    'POST /api/v1/auth/register creates unverified user and sends verification OTP',
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'JANE@example.com',
          password: 'Password123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.email, 'jane@example.com');
      assert.ok(body.data.message.includes('Please verify your email'));

      // Verify user in DB
      const user = await dataSource
        .getRepository('User')
        .findOne({ where: { email: 'jane@example.com' } });
      assert.ok(user);
      assert.equal(user.role, 'customer');
      assert.equal(user.email_verified_at, null);
      assert.ok(user.password_hash.startsWith('$argon2id$'));

      // Verify OTP dispatched
      const sentEmail = emailService.getLastSentEmail();
      assert.ok(sentEmail);
      assert.equal(sentEmail.to, 'jane@example.com');
      assert.match(sentEmail.code, /^\d{6}$/);

      // Verify challenge in DB
      const challenge = await dataSource
        .getRepository('EmailVerificationChallenge')
        .findOne({ where: { user_id: user.id } });
      assert.ok(challenge);
      assert.equal(challenge.attempt_count, 0);
      assert.equal(challenge.consumed_at, null);
    }
  );

  await t.test(
    'POST /api/v1/auth/register rejects invalid inputs and duplicate emails',
    async () => {
      // Missing fields / weak password
      const weakRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'J',
          email: 'invalid-email',
          password: 'short'
        })
      });
      assert.equal(weakRes.status, 400);

      // Seed existing user
      await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123!'
        })
      });

      // Duplicate email
      const dupRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Clone',
          email: 'JANE@example.com',
          password: 'Password123!'
        })
      });
      const dupBody = await dupRes.json();
      assert.equal(dupRes.status, 409);
      assert.equal(dupBody.error.code, 'EMAIL_UNAVAILABLE');
    }
  );

  await t.test('POST /api/v1/auth/verify-email validates OTP and verifies account', async () => {
    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'Password123!'
      })
    });

    const code = emailService.getLastSentEmail().code;

    // Wrong code
    const wrongRes = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob@example.com',
        code: '000000'
      })
    });
    assert.equal(wrongRes.status, 400);
    const wrongBody = await wrongRes.json();
    assert.equal(wrongBody.error.fields.code, 'VERIFICATION_INVALID');

    // Correct code
    const correctRes = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob@example.com',
        code
      })
    });
    assert.equal(correctRes.status, 200);

    const user = await dataSource
      .getRepository('User')
      .findOne({ where: { email: 'bob@example.com' } });
    assert.ok(user.email_verified_at !== null);

    const challenge = await dataSource
      .getRepository('EmailVerificationChallenge')
      .findOne({ where: { user_id: user.id } });
    assert.ok(challenge.consumed_at !== null);
  });

  await t.test('POST /api/v1/auth/resend-verification safely dispatches a new code', async () => {
    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carol',
        email: 'carol@example.com',
        password: 'Password123!'
      })
    });

    const firstCode = emailService.getLastSentEmail().code;

    const res = await fetch(`${baseUrl}/api/v1/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carol@example.com' })
    });
    assert.equal(res.status, 200);

    const secondCode = emailService.getLastSentEmail().code;
    assert.ok(secondCode);
    assert.notEqual(firstCode, secondCode);

    // Old code no longer works
    const oldAttempt = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carol@example.com', code: firstCode })
    });
    assert.equal(oldAttempt.status, 400);

    // New code works
    const newAttempt = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carol@example.com', code: secondCode })
    });
    assert.equal(newAttempt.status, 200);
  });

  await t.test(
    'POST /api/v1/auth/login checks password and verification before issuing session',
    async () => {
      // 1. Unverified user registration
      await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dave',
          email: 'dave@example.com',
          password: 'Password123!'
        })
      });

      // Unverified login attempt
      const unverifiedRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dave@example.com',
          password: 'Password123!'
        })
      });
      assert.equal(unverifiedRes.status, 403);
      const unverifiedBody = await unverifiedRes.json();
      assert.equal(unverifiedBody.error.code, 'EMAIL_UNVERIFIED');

      // Verify account
      const code = emailService.getLastSentEmail().code;
      const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dave@example.com', code })
      });
      assert.equal(verifyRes.status, 200);

      // Wrong password attempt
      const wrongPassRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dave@example.com',
          password: 'WrongPassword!'
        })
      });
      assert.equal(wrongPassRes.status, 401);
      const wrongPassBody = await wrongPassRes.json();
      assert.equal(wrongPassBody.error.code, 'AUTH_INVALID');

      // Successful login
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dave@example.com',
          password: 'Password123!'
        })
      });
      assert.equal(loginRes.status, 200);
      const loginBody = await loginRes.json();
      assert.equal(loginBody.data.user.email, 'dave@example.com');
      assert.equal(loginBody.data.user.role, 'customer');

      const setCookie = loginRes.headers.getSetCookie();
      const sessionCookie = parseCookie(setCookie, 'pixel_store_session');
      const csrfCookie = parseCookie(setCookie, 'pixel_store_csrf');

      assert.ok(sessionCookie, 'Must set session cookie');
      assert.ok(csrfCookie, 'Must set csrf cookie');

      // Access GET /api/v1/auth/me with session cookie
      const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: {
          Cookie: `pixel_store_session=${sessionCookie}`
        }
      });
      assert.equal(meRes.status, 200);
      const meBody = await meRes.json();
      assert.equal(meBody.data.user.email, 'dave@example.com');

      // Logout
      const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `pixel_store_session=${sessionCookie}; pixel_store_csrf=${csrfCookie}`,
          'x-csrf-token': csrfCookie
        }
      });
      assert.equal(logoutRes.status, 200);

      // After logout, session is invalid
      const meAfterLogout = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: {
          Cookie: `pixel_store_session=${sessionCookie}`
        }
      });
      assert.equal(meAfterLogout.status, 401);
    }
  );

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDataSource();
  });
});
