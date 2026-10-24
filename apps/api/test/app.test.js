const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');

function setupTestServer(options = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:3000',
    ...options.config
  });
  const logger = createLogger('silent');
  const app = createApp({ config, logger, dataSource: options.dataSource });
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

test('GET /health returns 200 with standard response envelope', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.service, 'pixel-store-api');
    assert.equal(body.data.environment, 'test');
    assert.ok(typeof body.data.uptime === 'number');
    assert.ok(body.meta.requestId);
  } finally {
    await close();
  }
});

test('GET /health/ready returns 200 with dependency status when no DB configured', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const res = await fetch(`${baseUrl}/health/ready`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.status, 'ready');
    assert.equal(body.data.database, 'not_configured');
    assert.ok(body.meta.requestId);
  } finally {
    await close();
  }
});

test('GET /health/ready returns 503 without leaking credentials when DB query fails', async () => {
  const mockFailingDataSource = {
    isInitialized: true,
    query: async () => {
      throw new Error(
        'Connection refused at postgresql://secret_user:secret_password@10.0.0.1:5432/db'
      );
    }
  };

  const { baseUrl, close } = setupTestServer({ dataSource: mockFailingDataSource });
  try {
    const res = await fetch(`${baseUrl}/health/ready`);
    const body = await res.json();

    assert.equal(res.status, 503);
    assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(body.error.message, 'Database readiness check failed.');
    // Assert credentials are never exposed in error envelope
    const serialized = JSON.stringify(body);
    assert.ok(!serialized.includes('secret_password'));
    assert.ok(!serialized.includes('secret_user'));
  } finally {
    await close();
  }
});

test('GET /unknown-route returns 404 standard error envelope', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const res = await fetch(`${baseUrl}/non-existent-endpoint`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('non-existent-endpoint'));
    assert.ok(body.meta.requestId);
  } finally {
    await close();
  }
});

test('propagates existing x-request-id header', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const customRequestId = 'test-request-id-12345';
    const res = await fetch(`${baseUrl}/health`, {
      headers: { 'x-request-id': customRequestId }
    });
    const body = await res.json();

    assert.equal(res.headers.get('x-request-id'), customRequestId);
    assert.equal(body.meta.requestId, customRequestId);
  } finally {
    await close();
  }
});

test('sets security headers via Helmet', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const res = await fetch(`${baseUrl}/health`);

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('x-powered-by'), null);
  } finally {
    await close();
  }
});

test('handles CORS headers correctly for configured origin', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'http://localhost:3000' }
    });

    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    await close();
  }
});

test('handles malformed JSON request body with 400 MALFORMED_JSON', async () => {
  const { baseUrl, close } = setupTestServer();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": json'
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'MALFORMED_JSON');
    assert.ok(body.meta.requestId);
  } finally {
    await close();
  }
});
