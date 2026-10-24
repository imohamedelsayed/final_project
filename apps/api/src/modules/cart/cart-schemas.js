const { z } = require('zod');

const addItemSchema = z.object({
  variantId: z.string().uuid({ message: 'variantId must be a valid UUID' }),
  quantity: z
    .number()
    .int({ message: 'Quantity must be an integer' })
    .min(1, { message: 'Quantity must be at least 1' })
    .max(100, { message: 'Quantity cannot exceed 100 per line' })
    .default(1)
});

const updateItemSchema = z.object({
  quantity: z
    .number()
    .int({ message: 'Quantity must be an integer' })
    .min(1, { message: 'Quantity must be at least 1' })
    .max(100, { message: 'Quantity cannot exceed 100 per line' })
});

module.exports = {
  addItemSchema,
  updateItemSchema
};
