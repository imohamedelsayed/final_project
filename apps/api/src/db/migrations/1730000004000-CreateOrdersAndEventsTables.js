class CreateOrdersAndEventsTables1730000004000 {
  async up(queryRunner) {
    // Orders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(40) NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        subtotal NUMERIC(12,2) NOT NULL,
        discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        shipping_fee NUMERIC(12,2) NULL,
        final_total NUMERIC(12,2) NULL,
        coupon_id UUID NULL REFERENCES coupons(id) ON DELETE SET NULL,
        coupon_code_snapshot VARCHAR(80) NULL,
        pricing_version INTEGER NOT NULL DEFAULT 1,
        agreed_pricing_version INTEGER NULL,
        final_total_sent_at TIMESTAMPTZ NULL,
        customer_agreed_at TIMESTAMPTZ NULL,
        expires_at TIMESTAMPTZ NULL,
        confirmed_at TIMESTAMPTZ NULL,
        cancelled_at TIMESTAMPTZ NULL,
        expired_at TIMESTAMPTZ NULL,
        stock_deducted_at TIMESTAMPTZ NULL,
        stock_restored_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_orders_status CHECK (
          status IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'expired')
        ),
        CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
        CONSTRAINT chk_orders_discount CHECK (discount_amount >= 0),
        CONSTRAINT chk_orders_shipping CHECK (shipping_fee IS NULL OR shipping_fee >= 0),
        CONSTRAINT chk_orders_final_total CHECK (final_total IS NULL OR final_total >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number ON orders (order_number)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_orders_status_expires ON orders (status, expires_at)'
    );

    // Order items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        variant_id UUID NULL REFERENCES product_variants(id) ON DELETE SET NULL,
        product_name_snapshot VARCHAR(200) NOT NULL,
        sku_snapshot VARCHAR(100) NOT NULL,
        variant_snapshot VARCHAR(180) NOT NULL,
        condition_snapshot VARCHAR(10) NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        quantity INTEGER NOT NULL,
        line_total NUMERIC(12,2) NOT NULL,
        CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
        CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
        CONSTRAINT chk_order_items_line_total CHECK (line_total >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items (variant_id)'
    );

    // Order addresses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        recipient_name VARCHAR(150) NOT NULL,
        mobile VARCHAR(30) NOT NULL,
        governorate VARCHAR(100) NOT NULL,
        area VARCHAR(150) NOT NULL,
        street VARCHAR(200) NOT NULL,
        building_number VARCHAR(50) NOT NULL,
        floor VARCHAR(30) NULL,
        apartment VARCHAR(30) NULL,
        landmark VARCHAR(250) NULL
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_order_addresses_order_id ON order_addresses (order_id)'
    );

    // Order idempotency keys table (Refinement 1)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        idempotency_key VARCHAR(255) NOT NULL,
        request_hash VARCHAR(64) NOT NULL,
        order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_order_idempotency_user_key UNIQUE (user_id, idempotency_key)
      )
    `);

    // Coupon redemptions table (Refinement 4: reversed_at, reversed_by_order_event_id)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
        discount_amount NUMERIC(12,2) NOT NULL,
        redeemed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reversed_at TIMESTAMPTZ NULL,
        reversed_by_order_event_id UUID NULL,
        CONSTRAINT chk_coupon_redemptions_discount CHECK (discount_amount >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemptions_order_id ON coupon_redemptions (order_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_redeemed ON coupon_redemptions (coupon_id, redeemed_at)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_coupon ON coupon_redemptions (user_id, coupon_id)'
    );

    // Order events table (Refinement 5)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        previous_status VARCHAR(20) NULL,
        new_status VARCHAR(20) NULL,
        notes TEXT NULL,
        metadata JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_order_events_order_created ON order_events (order_id, created_at ASC)'
    );
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS order_events CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS coupon_redemptions CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS order_idempotency_keys CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS order_addresses CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS order_items CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS orders CASCADE');
  }
}

module.exports = { CreateOrdersAndEventsTables1730000004000 };
