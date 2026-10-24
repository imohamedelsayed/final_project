const { EntitySchema } = require('typeorm');

const CouponSchema = new EntitySchema({
  name: 'Coupon',
  tableName: 'coupons',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    code: {
      type: 'varchar',
      length: 80,
      nullable: false,
      unique: true
    },
    discount_type: {
      type: 'varchar',
      length: 12,
      nullable: false
    },
    discount_value: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false
    },
    minimum_subtotal: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: true
    },
    starts_at: {
      type: 'timestamptz',
      nullable: true
    },
    ends_at: {
      type: 'timestamptz',
      nullable: false
    },
    global_usage_limit: {
      type: 'integer',
      nullable: true
    },
    per_customer_limit: {
      type: 'integer',
      nullable: true
    },
    is_active: {
      type: 'boolean',
      nullable: false,
      default: true
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    },
    updated_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    redemptions: {
      target: 'CouponRedemption',
      type: 'one-to-many',
      inverseSide: 'coupon'
    }
  }
});

const CouponRedemptionSchema = new EntitySchema({
  name: 'CouponRedemption',
  tableName: 'coupon_redemptions',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    coupon_id: {
      type: 'uuid',
      nullable: false
    },
    user_id: {
      type: 'uuid',
      nullable: false
    },
    order_id: {
      type: 'uuid',
      nullable: false,
      unique: true
    },
    discount_amount: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false
    },
    redeemed_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    },
    reversed_at: {
      type: 'timestamptz',
      nullable: true
    },
    reversed_by_order_event_id: {
      type: 'uuid',
      nullable: true
    }
  },
  relations: {
    coupon: {
      target: 'Coupon',
      type: 'many-to-one',
      joinColumn: { name: 'coupon_id' },
      onDelete: 'RESTRICT'
    },
    user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'RESTRICT'
    },
    order: {
      target: 'Order',
      type: 'one-to-one',
      joinColumn: { name: 'order_id' },
      onDelete: 'RESTRICT'
    }
  }
});

module.exports = {
  CouponSchema,
  CouponRedemptionSchema
};
