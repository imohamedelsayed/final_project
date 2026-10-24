const { z } = require('zod');

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function formatMoney(val) {
  if (typeof val === 'number') {
    return val.toFixed(2);
  }
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) {
    throw new Error('Price must be a valid non-negative number.');
  }
  return num.toFixed(2);
}

const moneySchema = z.union([z.string(), z.number()]).transform((val) => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num < 0) {
    throw new Error('Price must be a valid non-negative number.');
  }
  return num.toFixed(2);
});

// Category Schemas
const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(150)
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  parent_id: z.string().uuid('Invalid parent category UUID').nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0)
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(150)
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional()
});

// Brand Schemas
const createBrandSchema = z.object({
  name: z.string().trim().min(1, 'Brand name is required').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(150)
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  is_active: z.boolean().default(true)
});

const updateBrandSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(150)
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  is_active: z.boolean().optional()
});

// Product Variant Schemas
const createVariantSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(100),
  variant_label: z.string().trim().min(1, 'Variant label is required').max(180),
  price: moneySchema,
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(0),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  options: z.record(z.unknown()).nullable().optional(),
  duration_of_use: z.string().trim().max(100).nullable().optional()
});

const updateVariantSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  variant_label: z.string().trim().min(1).max(180).optional(),
  price: moneySchema.optional(),
  low_stock_threshold: z.coerce.number().int().min(0).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  options: z.record(z.unknown()).nullable().optional(),
  duration_of_use: z.string().trim().max(100).nullable().optional()
});

// Product Specification Schemas
const createSpecificationSchema = z.object({
  spec_name: z.string().trim().min(1, 'Specification name is required').max(120),
  spec_value: z.string().trim().min(1, 'Specification value is required').max(500),
  sort_order: z.coerce.number().int().min(0).default(0)
});

const updateSpecificationSchema = z.object({
  spec_name: z.string().trim().min(1).max(120).optional(),
  spec_value: z.string().trim().min(1).max(500).optional(),
  sort_order: z.coerce.number().int().min(0).optional()
});

// Product Schemas
const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(220)
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().nullable().optional(),
  category_id: z.string().uuid('Valid category UUID is required'),
  brand_id: z.string().uuid('Invalid brand UUID').nullable().optional(),
  condition: z.enum(['new', 'used'], {
    errorMap: () => ({ message: "Condition must be either 'new' or 'used'" })
  }),
  is_published: z.boolean().default(false),
  default_variant: createVariantSchema,
  specifications: z.array(createSpecificationSchema).optional().default([])
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(220)
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().nullable().optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  condition: z.enum(['new', 'used']).optional(),
  is_published: z.boolean().optional()
});

// Product Image Schemas
const createImageSchema = z.object({
  image_path: z.string().trim().min(1, 'Image path is required'),
  alt_text: z.string().trim().max(250).nullable().optional(),
  is_primary: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).default(0)
});

const updateImageSchema = z.object({
  alt_text: z.string().trim().max(250).nullable().optional(),
  is_primary: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional()
});

// Banner Schemas
const createBannerSchema = z.object({
  image_path: z.string().trim().min(1, 'Image path is required'),
  link_url: z.string().trim().max(1000).nullable().optional(),
  is_published: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).default(0)
});

const updateBannerSchema = z.object({
  image_path: z.string().trim().min(1).optional(),
  link_url: z.string().trim().max(1000).nullable().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional()
});

// Featured Product Schemas
const createFeaturedProductSchema = z.object({
  product_id: z.string().uuid('Valid product UUID is required'),
  sort_order: z.coerce.number().int().min(0).default(0)
});

const updateFeaturedProductSchema = z.object({
  sort_order: z.coerce.number().int().min(0)
});

// Inventory Adjustment Schema
const createInventoryAdjustmentSchema = z.object({
  variantId: z.string().uuid('Valid variant UUID is required'),
  quantityDelta: z.coerce
    .number()
    .int()
    .refine((val) => val !== 0, 'Quantity delta cannot be zero'),
  reason: z.string().trim().min(1, 'Reason is required').max(300)
});

module.exports = {
  formatMoney,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createVariantSchema,
  updateVariantSchema,
  createSpecificationSchema,
  updateSpecificationSchema,
  createProductSchema,
  updateProductSchema,
  createImageSchema,
  updateImageSchema,
  createBannerSchema,
  updateBannerSchema,
  createFeaturedProductSchema,
  updateFeaturedProductSchema,
  createInventoryAdjustmentSchema
};
