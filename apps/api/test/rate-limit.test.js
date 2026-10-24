const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createRateLimiter } = require('../src/middleware/rate-limit');
const { errorHandler } = require('../src/middleware/errors');

test('rate limiter permits requests below limit and blocks when exceeded', async () => {
  const app = express();
  const limiter = createRateLimiter({
    windowMs: 1000,
    max: 2,
    keyGenerator: () => 'test-ip'
  });

  app.use(limiter);
  app.get('/test-limit', (req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Request 1: allowed
    const res1 = await fetch(`${baseUrl}/test-limit`);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('RateLimit-Remaining'), '1');

    // Request 2: allowed
    const res2 = await fetch(`${baseUrl}/test-limit`);
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('RateLimit-Remaining'), '0');

    // Request 3: blocked with 429
    const res3 = await fetch(`${baseUrl}/test-limit`);
    assert.equal(res3.status, 429);
    assert.ok(res3.headers.get('Retry-After'));
    const body = await res3.json();
    assert.equal(body.error.code, 'RATE_LIMITED');
  } finally {
    server.close();
  }
});
