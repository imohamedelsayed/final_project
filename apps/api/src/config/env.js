const path = require('node:path');
const fs = require('node:fs');
const { z } = require('zod');

function tryLoadEnv() {
  if (typeof process.loadEnvFile === 'function') {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../.env')
    ];
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        try {
          process.loadEnvFile(envPath);
          break;
        } catch {
          // Ignore if already loaded or parsing error
        }
      }
    }
  }
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
    DATABASE_URL: z.string().url().optional(),
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_UPLOAD_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 1024 * 1024),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
    SESSION_SECRET: z.string().min(32).optional(),
    TOTP_ENCRYPTION_KEY: z.string().min(16).optional(),
    SCHEDULER_SECRET: z.string().min(16).optional(),
    EMAIL_PROVIDER: z.enum(['brevo', 'resend', 'in_memory']).optional(),
    EMAIL_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    WHATSAPP_NUMBER: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL is required in production environment'
        });
      }
      if (!data.SESSION_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'SESSION_SECRET is required and must be at least 32 characters in production'
        });
      }
      if (!data.TOTP_ENCRYPTION_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['TOTP_ENCRYPTION_KEY'],
          message: 'TOTP_ENCRYPTION_KEY is required in production'
        });
      }
    }
  });

function loadConfig(source = process.env) {
  if (source === process.env) {
    tryLoadEnv();
  }
  const parsed = envSchema.parse(source);

  return Object.freeze({
    ...parsed,
    SESSION_SECRET:
      parsed.SESSION_SECRET ||
      (parsed.NODE_ENV === 'production' ? undefined : 'dev-session-secret-at-least-32-chars-long!'),
    TOTP_ENCRYPTION_KEY:
      parsed.TOTP_ENCRYPTION_KEY ||
      (parsed.NODE_ENV === 'production' ? undefined : 'dev-insecure-totp-key-32-bytes!'),
    UPLOAD_DIR: path.resolve(parsed.UPLOAD_DIR)
  });
}

module.exports = { loadConfig, envSchema };
