const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError
} = require('../src/shared/errors');
const { errorHandler } = require('../src/middleware/errors');

test('AppError instances carry correct default status codes and codes', () => {
  const baseErr = new AppError('Base error message', {
    statusCode: 500,
    code: 'CUSTOM_BASE_ERROR'
  });
  assert.equal(baseErr.statusCode, 500);
  assert.equal(baseErr.code, 'CUSTOM_BASE_ERROR');

  const badReq = new BadRequestError('Bad input', { field: 'invalid' });
  assert.equal(badReq.statusCode, 400);
  assert.equal(badReq.code, 'BAD_REQUEST');
  assert.deepEqual(badReq.fields, { field: 'invalid' });

  const unauth = new UnauthorizedError();
  assert.equal(unauth.statusCode, 401);
  assert.equal(unauth.code, 'UNAUTHORIZED');

  const forbidden = new ForbiddenError();
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.code, 'FORBIDDEN');

  const notFound = new NotFoundError();
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, 'NOT_FOUND');

  const conflict = new ConflictError('Order conflict', 'ORDER_STATUS_CONFLICT');
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.code, 'ORDER_STATUS_CONFLICT');

  const valErr = new ValidationError('Invalid fields', { email: 'Invalid email' });
  assert.equal(valErr.statusCode, 422);
  assert.equal(valErr.code, 'VALIDATION_ERROR');
  assert.equal(valErr.fields.email, 'Invalid email');

  const rateLimit = new RateLimitError();
  assert.equal(rateLimit.statusCode, 429);
  assert.equal(rateLimit.code, 'RATE_LIMITED');

  const serviceUnavail = new ServiceUnavailableError();
  assert.equal(serviceUnavail.statusCode, 503);
  assert.equal(serviceUnavail.code, 'SERVICE_UNAVAILABLE');
});

test('errorHandler formats custom AppError with standard response envelope', async () => {
  const app = express();
  app.use((req, res, next) => {
    req.id = 'error-test-req-id';
    next();
  });
  app.get('/throw-validation', (req, res, next) => {
    next(new ValidationError('Email is required', { email: 'Must not be empty' }));
  });
  app.use(errorHandler);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/throw-validation`);
    const body = await res.json();

    assert.equal(res.status, 422);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.message, 'Email is required');
    assert.deepEqual(body.error.fields, { email: 'Must not be empty' });
    assert.equal(body.meta.requestId, 'error-test-req-id');
  } finally {
    server.close();
  }
});
