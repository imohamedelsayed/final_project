const { EntitySchema } = require('typeorm');

const CategorySchema = new EntitySchema({
  name: 'Category',
  tableName: 'categories',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 120,
      nullable: false
    },
    parent_id: {
      type: 'uuid',
      nullable: true
    },
    slug: {
      type: 'varchar',
      length: 150,
      nullable: false,
      unique: true
    },
    is_active: {
      type: 'boolean',
      nullable: false,
      default: true
    },
    sort_order: {
      type: 'integer',
      nullable: false,
      default: 0
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
    parent: {
      target: 'Category',
      type: 'many-to-one',
      joinColumn: { name: 'parent_id' },
      onDelete: 'RESTRICT'
    },
    children: {
      target: 'Category',
      type: 'one-to-many',
      inverseSide: 'parent'
    },
    products: {
      target: 'Product',
      type: 'one-to-many',
      inverseSide: 'category'
    }
  }
});

const BrandSchema = new EntitySchema({
  name: 'Brand',
  tableName: 'brands',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 120,
      nullable: false
    },
    slug: {
      type: 'varchar',
      length: 150,
      nullable: false,
      unique: true
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
    products: {
      target: 'Product',
      type: 'one-to-many',
      inverseSide: 'brand'
    }
  }
});

const ProductSchema = new EntitySchema({
  name: 'Product',
  tableName: 'products',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 200,
      nullable: false
    },
    slug: {
      type: 'varchar',
      length: 220,
      nullable: false,
      unique: true
    },
    description: {
      type: 'text',
      nullable: true
    },
    category_id: {
      type: 'uuid',
      nullable: false
    },
    brand_id: {
      type: 'uuid',
      nullable: true
    },
    condition: {
      type: 'varchar',
      length: 10,
      nullable: false
    },
    is_published: {
      type: 'boolean',
      nullable: false,
      default: false
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
    category: {
      target: 'Category',
      type: 'many-to-one',
      joinColumn: { name: 'category_id' },
      onDelete: 'RESTRICT'
    },
    brand: {
      target: 'Brand',
      type: 'many-to-one',
      joinColumn: { name: 'brand_id' },
      onDelete: 'RESTRICT'
    },
    variants: {
      target: 'ProductVariant',
      type: 'one-to-many',
      inverseSide: 'product'
    },
    images: {
      target: 'ProductImage',
      type: 'one-to-many',
      inverseSide: 'product'
    },
    specifications: {
      target: 'ProductSpecification',
      type: 'one-to-many',
      inverseSide: 'product'
    },
    featured: {
      target: 'FeaturedProduct',
      type: 'one-to-one',
      inverseSide: 'product'
    }
  }
});

const ProductVariantSchema = new EntitySchema({
  name: 'ProductVariant',
  tableName: 'product_variants',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    product_id: {
      type: 'uuid',
      nullable: false
    },
    sku: {
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true
    },
    variant_label: {
      type: 'varchar',
      length: 180,
      nullable: false
    },
    options: {
      type: 'jsonb',
      nullable: true
    },
    price: {
      type: 'numeric',
      precision: 12,
      scale: 2,
      nullable: false
    },
    stock_quantity: {
      type: 'integer',
      nullable: false,
      default: 0
    },
    low_stock_threshold: {
      type: 'integer',
      nullable: false,
      default: 0
    },
    is_default: {
      type: 'boolean',
      nullable: false,
      default: false
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
    product: {
      target: 'Product',
      type: 'many-to-one',
      joinColumn: { name: 'product_id' },
      onDelete: 'RESTRICT'
    },
    inventory_adjustments: {
      target: 'InventoryAdjustment',
      type: 'one-to-many',
      inverseSide: 'variant'
    }
  }
});

const ProductImageSchema = new EntitySchema({
  name: 'ProductImage',
  tableName: 'product_images',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    product_id: {
      type: 'uuid',
      nullable: false
    },
    image_path: {
      type: 'text',
      nullable: false
    },
    alt_text: {
      type: 'varchar',
      length: 250,
      nullable: true
    },
    is_primary: {
      type: 'boolean',
      nullable: false,
      default: false
    },
    sort_order: {
      type: 'integer',
      nullable: false,
      default: 0
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    product: {
      target: 'Product',
      type: 'many-to-one',
      joinColumn: { name: 'product_id' },
      onDelete: 'CASCADE'
    }
  }
});

const ProductSpecificationSchema = new EntitySchema({
  name: 'ProductSpecification',
  tableName: 'product_specifications',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    product_id: {
      type: 'uuid',
      nullable: false
    },
    spec_name: {
      type: 'varchar',
      length: 120,
      nullable: false
    },
    spec_value: {
      type: 'varchar',
      length: 500,
      nullable: false
    },
    sort_order: {
      type: 'integer',
      nullable: false,
      default: 0
    }
  },
  relations: {
    product: {
      target: 'Product',
      type: 'many-to-one',
      joinColumn: { name: 'product_id' },
      onDelete: 'CASCADE'
    }
  }
});

const BannerSchema = new EntitySchema({
  name: 'Banner',
  tableName: 'banners',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    image_path: {
      type: 'text',
      nullable: false
    },
    link_url: {
      type: 'text',
      nullable: true
    },
    is_published: {
      type: 'boolean',
      nullable: false,
      default: false
    },
    sort_order: {
      type: 'integer',
      nullable: false,
      default: 0
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
  }
});

const FeaturedProductSchema = new EntitySchema({
  name: 'FeaturedProduct',
  tableName: 'featured_products',
  columns: {
    product_id: {
      primary: true,
      type: 'uuid'
    },
    sort_order: {
      type: 'integer',
      nullable: false,
      default: 0
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    product: {
      target: 'Product',
      type: 'one-to-one',
      joinColumn: { name: 'product_id' },
      onDelete: 'CASCADE'
    }
  }
});

const InventoryAdjustmentSchema = new EntitySchema({
  name: 'InventoryAdjustment',
  tableName: 'inventory_adjustments',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    variant_id: {
      type: 'uuid',
      nullable: false
    },
    admin_user_id: {
      type: 'uuid',
      nullable: false
    },
    quantity_delta: {
      type: 'integer',
      nullable: false
    },
    reason: {
      type: 'varchar',
      length: 300,
      nullable: false
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    variant: {
      target: 'ProductVariant',
      type: 'many-to-one',
      joinColumn: { name: 'variant_id' },
      onDelete: 'RESTRICT'
    },
    admin_user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'admin_user_id' },
      onDelete: 'RESTRICT'
    }
  }
});

module.exports = {
  CategorySchema,
  BrandSchema,
  ProductSchema,
  ProductVariantSchema,
  ProductImageSchema,
  ProductSpecificationSchema,
  BannerSchema,
  FeaturedProductSchema,
  InventoryAdjustmentSchema
};
