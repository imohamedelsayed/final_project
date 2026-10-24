const { EntitySchema } = require('typeorm');

const OrderSchema = new EntitySchema({
  name: 'Order',
  tableName: 'orders',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    order_number: {
      type: 'varchar',
      length: 40,
      nullable: false,
      unique: true
    },
    user_id: {
      type: 'uuid',
      nullable: false
    },
    status: {
      type: 'varchar',
      length: 20,
      nullable: false,
      default: 'pending'
    },
    subtotal: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false
    },
    discount_amount: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false,
      default: 0
    },
    shipping_fee: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: true
    },
    final_total: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: true
    },
    coupon_id: {
      type: 'uuid',
      nullable: true
    },
    coupon_code_snapshot: {
      type: 'varchar',
      length: 80,
      nullable: true
    },
    pricing_version: {
      type: 'integer',
      nullable: false,
      default: 1
    },
    agreed_pricing_version: {
      type: 'integer',
      nullable: true
    },
    final_total_sent_at: {
      type: 'timestamptz',
      nullable: true
    },
    customer_agreed_at: {
      type: 'timestamptz',
      nullable: true
    },
    expires_at: {
      type: 'timestamptz',
      nullable: true
    },
    confirmed_at: {
      type: 'timestamptz',
      nullable: true
    },
    cancelled_at: {
      type: 'timestamptz',
      nullable: true
    },
    expired_at: {
      type: 'timestamptz',
      nullable: true
    },
    stock_deducted_at: {
      type: 'timestamptz',
      nullable: true
    },
    stock_restored_at: {
      type: 'timestamptz',
      nullable: true
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
    user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'RESTRICT'
    },
    coupon: {
      target: 'Coupon',
      type: 'many-to-one',
      joinColumn: { name: 'coupon_id' },
      onDelete: 'SET NULL'
    },
    items: {
      target: 'OrderItem',
      type: 'one-to-many',
      inverseSide: 'order'
    },
    address: {
      target: 'OrderAddress',
      type: 'one-to-one',
      inverseSide: 'order'
    },
    redemption: {
      target: 'CouponRedemption',
      type: 'one-to-one',
      inverseSide: 'order'
    },
    events: {
      target: 'OrderEvent',
      type: 'one-to-many',
      inverseSide: 'order'
    }
  }
});

const OrderItemSchema = new EntitySchema({
  name: 'OrderItem',
  tableName: 'order_items',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    order_id: {
      type: 'uuid',
      nullable: false
    },
    variant_id: {
      type: 'uuid',
      nullable: true
    },
    product_name_snapshot: {
      type: 'varchar',
      length: 200,
      nullable: false
    },
    sku_snapshot: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    variant_snapshot: {
      type: 'varchar',
      length: 180,
      nullable: false
    },
    condition_snapshot: {
      type: 'varchar',
      length: 10,
      nullable: false
    },
    unit_price: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false
    },
    quantity: {
      type: 'integer',
      nullable: false
    },
    line_total: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false
    }
  },
  relations: {
    order: {
      target: 'Order',
      type: 'many-to-one',
      joinColumn: { name: 'order_id' },
      onDelete: 'CASCADE'
    },
    variant: {
      target: 'ProductVariant',
      type: 'many-to-one',
      joinColumn: { name: 'variant_id' },
      onDelete: 'SET NULL'
    }
  }
});

const OrderAddressSchema = new EntitySchema({
  name: 'OrderAddress',
  tableName: 'order_addresses',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    order_id: {
      type: 'uuid',
      nullable: false,
      unique: true
    },
    recipient_name: {
      type: 'varchar',
      length: 150,
      nullable: false
    },
    mobile: {
      type: 'varchar',
      length: 30,
      nullable: false
    },
    governorate: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    area: {
      type: 'varchar',
      length: 150,
      nullable: false
    },
    street: {
      type: 'varchar',
      length: 200,
      nullable: false
    },
    building_number: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    floor: {
      type: 'varchar',
      length: 30,
      nullable: true
    },
    apartment: {
      type: 'varchar',
      length: 30,
      nullable: true
    },
    landmark: {
      type: 'varchar',
      length: 250,
      nullable: true
    }
  },
  relations: {
    order: {
      target: 'Order',
      type: 'one-to-one',
      joinColumn: { name: 'order_id' },
      onDelete: 'CASCADE'
    }
  }
});

const OrderIdempotencyKeySchema = new EntitySchema({
  name: 'OrderIdempotencyKey',
  tableName: 'order_idempotency_keys',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    user_id: {
      type: 'uuid',
      nullable: false
    },
    idempotency_key: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    request_hash: {
      type: 'varchar',
      length: 64,
      nullable: false
    },
    order_id: {
      type: 'uuid',
      nullable: true
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    },
    order: {
      target: 'Order',
      type: 'many-to-one',
      joinColumn: { name: 'order_id' },
      onDelete: 'SET NULL'
    }
  }
});

const OrderEventSchema = new EntitySchema({
  name: 'OrderEvent',
  tableName: 'order_events',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    order_id: {
      type: 'uuid',
      nullable: false
    },
    event_type: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    actor_user_id: {
      type: 'uuid',
      nullable: true
    },
    previous_status: {
      type: 'varchar',
      length: 20,
      nullable: true
    },
    new_status: {
      type: 'varchar',
      length: 20,
      nullable: true
    },
    notes: {
      type: 'text',
      nullable: true
    },
    metadata: {
      type: 'jsonb',
      nullable: true
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    order: {
      target: 'Order',
      type: 'many-to-one',
      joinColumn: { name: 'order_id' },
      onDelete: 'CASCADE'
    },
    actor_user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'actor_user_id' },
      onDelete: 'SET NULL'
    }
  }
});

module.exports = {
  OrderSchema,
  OrderItemSchema,
  OrderAddressSchema,
  OrderIdempotencyKeySchema,
  OrderEventSchema
};
