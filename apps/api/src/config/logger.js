const pino = require('pino');

const SENSITIVE_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'sessionToken',
  'otp',
  'totpCode',
  'totpSecret',
  'secret',
  'DATABASE_URL',
  'SESSION_SECRET',
  'TOTP_ENCRYPTION_KEY',
  'SCHEDULER_SECRET',
  'EMAIL_API_KEY'
];

function createLogger(level = 'info', options = {}) {
  return pino({
    level,
    redact: {
      paths: SENSITIVE_PATHS,
      censor: '[REDACTED]'
    },
    ...options
  });
}

module.exports = { createLogger, SENSITIVE_PATHS };
