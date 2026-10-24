const { z } = require('zod');

// Egyptian mobile number format or standard international mobile
const mobileRegex = /^(?:\+?20|0)?1[0125][0-9]{8}$/;

const checkoutAddressSchema = z.object({
  recipient_name: z.string().trim().min(2).max(150),
  mobile: z
    .string()
    .trim()
    .min(10)
    .max(30)
    .refine((val) => mobileRegex.test(val.replace(/[\s-]/g, '')), {
      message: 'Mobile number must be a valid Egyptian mobile number (e.g. 01012345678)'
    }),
  governorate: z.string().trim().min(2).max(100),
  area: z.string().trim().min(2).max(150),
  street: z.string().trim().min(2).max(200),
  building_number: z.string().trim().min(1).max(50),
  floor: z.string().trim().max(30).optional().nullable(),
  apartment: z.string().trim().max(30).optional().nullable(),
  landmark: z.string().trim().max(250).optional().nullable()
});

const checkoutOrderSchema = z.object({
  address: checkoutAddressSchema,
  coupon_code: z.string().trim().max(80).optional().nullable(),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service and order policy' })
  }),
  terms_version: z.string().trim().min(1).default('v1.0')
});

const quoteCouponSchema = z.object({
  code: z.string().trim().min(1).max(80)
});

const adminCreateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Coupon code must be alphanumeric and may contain hyphens or underscores'
      ),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.coerce.number().positive(),
    minimum_subtotal: z.coerce.number().nonnegative().optional().nullable(),
    starts_at: z.coerce.date().optional().nullable(),
    ends_at: z.coerce.date(),
    global_usage_limit: z.coerce.number().int().positive().optional().nullable(),
    per_customer_limit: z.coerce.number().int().positive().optional().nullable(),
    is_active: z.boolean().default(true)
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percentage' && data.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: 'Percentage discount cannot exceed 100%'
      });
    }
    if (data.starts_at && data.ends_at <= data.starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'End date must be after start date'
      });
    }
  });

const adminUpdateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/, 'Coupon code must be alphanumeric')
      .optional(),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: z.coerce.number().positive().optional(),
    minimum_subtotal: z.coerce.number().nonnegative().optional().nullable(),
    starts_at: z.coerce.date().optional().nullable(),
    ends_at: z.coerce.date().optional(),
    global_usage_limit: z.coerce.number().int().positive().optional().nullable(),
    per_customer_limit: z.coerce.number().int().positive().optional().nullable(),
    is_active: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percentage' && data.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: 'Percentage discount cannot exceed 100%'
      });
    }
  });

const setFinalTotalSchema = z.object({
  shipping_fee: z.coerce.number().nonnegative('Shipping fee must be greater than or equal to 0')
});

const customerAgreementSchema = z.object({
  agreed_pricing_version: z.coerce.number().int().positive().optional()
});

const transitionStatusSchema = z.object({
  new_status: z.enum(['processing', 'delivered', 'cancelled']),
  reason: z.string().trim().max(500).optional()
});

const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

const updateWhatsappSettingSchema = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .min(8)
    .max(30)
    .regex(/^\+?[0-9\s-]+$/, 'WhatsApp number must be a valid phone number')
});

module.exports = {
  checkoutAddressSchema,
  checkoutOrderSchema,
  quoteCouponSchema,
  adminCreateCouponSchema,
  adminUpdateCouponSchema,
  setFinalTotalSchema,
  customerAgreementSchema,
  transitionStatusSchema,
  cancelOrderSchema,
  updateWhatsappSettingSchema
};
