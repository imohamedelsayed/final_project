class CreateCatalogTables1730000002000 {
  async up(queryRunner) {
    // Categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        parent_id UUID NULL REFERENCES categories(id) ON DELETE RESTRICT,
        slug VARCHAR(150) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_slug ON categories (slug)'
    );

    // Brands table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(150) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_slug ON brands (slug)');

    // Products table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(220) NOT NULL UNIQUE,
        description TEXT NULL,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        brand_id UUID NULL REFERENCES brands(id) ON DELETE RESTRICT,
        condition VARCHAR(10) NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_products_condition CHECK (condition IN ('new', 'used'))
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug ON products (slug)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_products_published_category ON products (is_published, category_id)'
    );
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand_id)');
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_products_created ON products (created_at DESC)'
    );

    // Product variants table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        sku VARCHAR(100) NOT NULL UNIQUE,
        variant_label VARCHAR(180) NOT NULL,
        options JSONB NULL,
        price NUMERIC(12,2) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 0,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_product_variants_price CHECK (price >= 0),
        CONSTRAINT chk_product_variants_stock CHECK (stock_quantity >= 0),
        CONSTRAINT chk_product_variants_low_stock CHECK (low_stock_threshold >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku ON product_variants (sku)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id)'
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_one_default 
      ON product_variants (product_id) 
      WHERE is_default = true
    `);

    // Product images table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_path TEXT NOT NULL,
        alt_text VARCHAR(250) NULL,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id)'
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_one_primary 
      ON product_images (product_id) 
      WHERE is_primary = true
    `);

    // Product specifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_specifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        spec_name VARCHAR(120) NOT NULL,
        spec_value VARCHAR(500) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT uq_product_specifications_name UNIQUE (product_id, spec_name)
      )
    `);

    // Banners table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_path TEXT NOT NULL,
        link_url TEXT NULL,
        is_published BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Featured products table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS featured_products (
        product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory adjustments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        quantity_delta INTEGER NOT NULL,
        reason VARCHAR(300) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_inventory_adjustments_delta CHECK (quantity_delta <> 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_variant ON inventory_adjustments (variant_id, created_at DESC)'
    );
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS inventory_adjustments CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS featured_products CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS banners CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS product_specifications CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS product_images CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS product_variants CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS products CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS brands CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS categories CASCADE');
  }
}

module.exports = { CreateCatalogTables1730000002000 };
