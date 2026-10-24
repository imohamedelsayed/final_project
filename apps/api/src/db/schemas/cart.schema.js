const { EntitySchema } = require('typeorm');

const CartSchema = new EntitySchema({
  name: 'Cart',
  tableName: 'carts',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    user_id: {
      type: 'uuid',
      nullable: false,
      unique: true
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
      type: 'one-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    },
    items: {
      target: 'CartItem',
      type: 'one-to-many',
      inverseSide: 'cart'
    }
  }
});

const CartItemSchema = new EntitySchema({
  name: 'CartItem',
  tableName: 'cart_items',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    cart_id: {
      type: 'uuid',
      nullable: false
    },
    variant_id: {
      type: 'uuid',
      nullable: false
    },
    quantity: {
      type: 'integer',
      nullable: false
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
    cart: {
      target: 'Cart',
      type: 'many-to-one',
      joinColumn: { name: 'cart_id' },
      onDelete: 'CASCADE'
    },
    variant: {
      target: 'ProductVariant',
      type: 'many-to-one',
      joinColumn: { name: 'variant_id' },
      onDelete: 'RESTRICT'
    }
  }
});

module.exports = {
  CartSchema,
  CartItemSchema
};
