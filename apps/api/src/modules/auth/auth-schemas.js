const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(150),
  email: z.string().trim().email('Invalid email address.').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(100, 'Password is too long.')
});

const verifyEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address.'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits.')
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address.')
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits.')
    .optional()
});

const totpSetupVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits.'),
  setupSecret: z.string().min(16, 'Setup secret is required.')
});

const resetTotpSchema = z.object({
  reason: z.string().trim().min(3, 'A valid reason of at least 3 characters is required.').max(300)
});

const createStaffUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(150),
  email: z.string().trim().email('Invalid email address.').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(100, 'Password is too long.'),
  role: z.enum(['admin', 'super_admin'], {
    errorMap: () => ({ message: "Role must be 'admin' or 'super_admin'" })
  })
});

const updateStaffUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(150).optional(),
  role: z.enum(['admin', 'super_admin']).optional(),
  is_active: z.boolean().optional()
});

module.exports = {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  totpSetupVerifySchema,
  resetTotpSchema,
  createStaffUserSchema,
  updateStaffUserSchema
};
