const {
  UserSchema,
  AdminTotpCredentialSchema,
  EmailVerificationChallengeSchema,
  SessionSchema
} = require('./auth.schema');

const {
  CategorySchema,
  BrandSchema,
  ProductSchema,
  ProductVariantSchema,
  ProductImageSchema,
  ProductSpecificationSchema,
  BannerSchema,
  FeaturedProductSchema,
  InventoryAdjustmentSchema
} = require('./catalog.schema');

const { CartSchema, CartItemSchema } = require('./cart.schema');

const { CouponSchema, CouponRedemptionSchema } = require('./coupon.schema');

const {
  OrderSchema,
  OrderItemSchema,
  OrderAddressSchema,
  OrderIdempotencyKeySchema,
  OrderEventSchema
} = require('./order.schema');

const { StoreSettingSchema } = require('./settings.schema');

const entities = [
  UserSchema,
  AdminTotpCredentialSchema,
  EmailVerificationChallengeSchema,
  SessionSchema,
  CategorySchema,
  BrandSchema,
  ProductSchema,
  ProductVariantSchema,
  ProductImageSchema,
  ProductSpecificationSchema,
  BannerSchema,
  FeaturedProductSchema,
  InventoryAdjustmentSchema,
  CartSchema,
  CartItemSchema,
  CouponSchema,
  CouponRedemptionSchema,
  OrderSchema,
  OrderItemSchema,
  OrderAddressSchema,
  OrderIdempotencyKeySchema,
  OrderEventSchema,
  StoreSettingSchema
];

module.exports = {
  entities,
  UserSchema,
  AdminTotpCredentialSchema,
  EmailVerificationChallengeSchema,
  SessionSchema,
  CategorySchema,
  BrandSchema,
  ProductSchema,
  ProductVariantSchema,
  ProductImageSchema,
  ProductSpecificationSchema,
  BannerSchema,
  FeaturedProductSchema,
  InventoryAdjustmentSchema,
  CartSchema,
  CartItemSchema,
  CouponSchema,
  CouponRedemptionSchema,
  OrderSchema,
  OrderItemSchema,
  OrderAddressSchema,
  OrderIdempotencyKeySchema,
  OrderEventSchema,
  StoreSettingSchema
};
