class CreateCartsAndCouponsTables1730000003000 {
  async up(queryRunner) {
    // Carts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_user_id ON carts (user_id)'
    );

    // Cart items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_cart_items_quantity CHECK (quantity > 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_variant ON cart_items (cart_id, variant_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON cart_items (variant_id)'
    );

    // Coupons table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(80) NOT NULL,
        discount_type VARCHAR(12) NOT NULL,
        discount_value NUMERIC(12,2) NOT NULL,
        minimum_subtotal NUMERIC(12,2) NULL,
        starts_at TIMESTAMPTZ NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        global_usage_limit INTEGER NULL,
        per_customer_limit INTEGER NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_coupons_type CHECK (discount_type IN ('percentage', 'fixed')),
        CONSTRAINT chk_coupons_value CHECK (discount_value > 0),
        CONSTRAINT chk_coupons_percentage_bound CHECK (discount_type != 'percentage' OR discount_value <= 100),
        CONSTRAINT chk_coupons_dates CHECK (starts_at IS NULL OR ends_at > starts_at),
        CONSTRAINT chk_coupons_min_subtotal CHECK (minimum_subtotal IS NULL OR minimum_subtotal >= 0),
        CONSTRAINT chk_coupons_global_limit CHECK (global_usage_limit IS NULL OR global_usage_limit > 0),
        CONSTRAINT chk_coupons_customer_limit CHECK (per_customer_limit IS NULL OR per_customer_limit > 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_normalized_code ON coupons (LOWER(TRIM(code)))'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_coupons_active_ends ON coupons (is_active, ends_at)'
    );
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS coupons CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS cart_items CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS carts CASCADE');
  }
}

module.exports = { CreateCartsAndCouponsTables1730000003000 };
