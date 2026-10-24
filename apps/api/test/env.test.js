const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config/env');

test('loads safe development defaults', () => {
  const config = loadConfig({});
  assert.equal(config.API_PORT, 4000);
  assert.equal(config.NODE_ENV, 'development');
  assert.equal(config.LOG_LEVEL, 'info');
  assert.equal(config.CORS_ORIGIN, 'http://localhost:3000');
  assert.equal(config.MAX_UPLOAD_SIZE_BYTES, 5 * 1024 * 1024);
  assert.equal(config.RATE_LIMIT_MAX_REQUESTS, 100);
  assert.equal(config.DATABASE_URL, undefined);
  assert.ok(config.UPLOAD_DIR.endsWith('uploads'));
});

test('rejects an invalid API port', () => {
  assert.throws(() => loadConfig({ API_PORT: '0' }));
  assert.throws(() => loadConfig({ API_PORT: '70000' }));
  assert.throws(() => loadConfig({ API_PORT: 'abc' }));
});

test('rejects an invalid log level', () => {
  assert.throws(() => loadConfig({ LOG_LEVEL: 'verbose' }));
});

test('rejects an invalid CORS origin URL', () => {
  assert.throws(() => loadConfig({ CORS_ORIGIN: 'not-a-valid-url' }));
});

test('enforces production environment requirements', () => {
  // Missing all production secrets
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /DATABASE_URL is required/);

  // Missing session secret
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
      }),
    /SESSION_SECRET is required/
  );

  // Short session secret (< 32 chars)
  assert.throws(() =>
    loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      SESSION_SECRET: 'short-secret',
      TOTP_ENCRYPTION_KEY: 'some-totp-encryption-key'
    })
  );

  // Valid production configuration
  const prodConfig = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    SESSION_SECRET: 'this-is-a-secure-random-session-secret-32-chars-long',
    TOTP_ENCRYPTION_KEY: 'some-32-byte-base64-totp-key-string'
  });
  assert.equal(prodConfig.NODE_ENV, 'production');
  assert.equal(prodConfig.DATABASE_URL, 'postgresql://user:pass@localhost:5432/db');
});
