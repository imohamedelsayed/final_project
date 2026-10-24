const { NotFoundError, ConflictError, BadRequestError } = require('../../shared/errors');

function extractRows(res) {
  if (!res) return [];
  if (Array.isArray(res) && Array.isArray(res[0])) {
    return res[0];
  }
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

class CartService {
  constructor({ dataSource, logger }) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  async getOrCreateCart(userId) {
    const existing = await this.dataSource.query(
      'SELECT id, user_id, created_at, updated_at FROM carts WHERE user_id = $1',
      [userId]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await this.dataSource.query(
      `INSERT INTO carts (user_id) 
       VALUES ($1) 
       ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, created_at, updated_at`,
      [userId]
    );

    return (
      inserted[0] ||
      (await this.dataSource.query('SELECT * FROM carts WHERE user_id = $1', [userId]))[0]
    );
  }

  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    const query = `
      SELECT 
        ci.id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        pv.sku,
        pv.variant_label,
        pv.price::text AS current_price,
        pv.stock_quantity,
        pv.is_active AS variant_is_active,
        pv.options->>'duration_of_use' AS duration_of_use,
        p.id AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p.condition AS product_condition,
        p.is_published AS product_is_published,
        (
          SELECT json_build_object('id', pi.id, 'image_path', pi.image_path, 'alt_text', pi.alt_text)
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) AS primary_image
      FROM cart_items ci
      JOIN product_variants pv ON ci.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `;

    const rawItems = await this.dataSource.query(query, [cart.id]);

    let subtotalCents = 0;
    let totalItems = 0;
    let isCartValid = true;

    const lines = rawItems.map((item) => {
      const unitPrice = parseFloat(item.current_price) || 0;
      const quantity = item.quantity;
      const isAvailable =
        Boolean(item.product_is_published) &&
        Boolean(item.variant_is_active) &&
        item.stock_quantity >= quantity;
      const inStock =
        Boolean(item.product_is_published) &&
        Boolean(item.variant_is_active) &&
        item.stock_quantity > 0;
      const stockExceeded = item.stock_quantity < quantity;

      if (!isAvailable) {
        isCartValid = false;
      }

      const lineTotal = (unitPrice * quantity).toFixed(2);
      if (isAvailable) {
        subtotalCents += Math.round(unitPrice * 100) * quantity;
      }
      totalItems += quantity;

      return {
        id: item.id,
        variant_id: item.variant_id,
        quantity,
        price: unitPrice.toFixed(2),
        line_total: lineTotal,
        is_available: isAvailable,
        in_stock: inStock,
        stock_exceeded: stockExceeded,
        product: {
          id: item.product_id,
          name: item.product_name,
          slug: item.product_slug,
          condition: item.product_condition,
          duration_of_use: item.duration_of_use || null,
          primary_image: item.primary_image
        },
        variant: {
          id: item.variant_id,
          sku: item.sku,
          variant_label: item.variant_label,
          is_active: Boolean(item.variant_is_active)
        },
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });

    const subtotal = (subtotalCents / 100).toFixed(2);

    return {
      id: cart.id,
      user_id: cart.user_id,
      lines,
      subtotal,
      items_count: totalItems,
      is_valid: lines.length > 0 ? isCartValid : true,
      created_at: cart.created_at,
      updated_at: cart.updated_at
    };
  }

  async addItem(userId, { variantId, quantity = 1 }) {
    const cart = await this.getOrCreateCart(userId);

    // Verify variant and parent product availability
    const variants = await this.dataSource.query(
      `SELECT 
        pv.id,
        pv.product_id,
        pv.sku,
        pv.price::text AS price,
        pv.stock_quantity,
        pv.is_active,
        p.name AS product_name,
        p.is_published
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.id = $1`,
      [variantId]
    );

    if (variants.length === 0) {
      throw new NotFoundError('Product variant not found.');
    }

    const variant = variants[0];

    if (!variant.is_active || !variant.is_published) {
      throw new BadRequestError(
        'Product variant is not available for purchase.',
        'VARIANT_UNAVAILABLE'
      );
    }

    if (variant.stock_quantity <= 0) {
      throw new ConflictError(
        'This product variant is currently unavailable.',
        'STOCK_UNAVAILABLE'
      );
    }

    // Check existing quantity in user's cart
    const existing = await this.dataSource.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2',
      [cart.id, variantId]
    );

    const existingQty = existing.length > 0 ? existing[0].quantity : 0;
    const targetQty = existingQty + quantity;

    if (targetQty > variant.stock_quantity) {
      throw new ConflictError('Requested quantity exceeds available stock.', 'INSUFFICIENT_STOCK');
    }

    if (targetQty > 100) {
      throw new BadRequestError(
        'Maximum 100 units of a variant allowed in cart.',
        'MAX_QUANTITY_EXCEEDED'
      );
    }

    // Atomically upsert cart item
    await this.dataSource.query(
      `INSERT INTO cart_items (cart_id, variant_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, variant_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
      [cart.id, variantId, quantity]
    );

    // Update cart timestamp
    await this.dataSource.query('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      cart.id
    ]);

    return this.getCart(userId);
  }

  async updateItem(userId, itemId, { quantity }) {
    const cart = await this.getOrCreateCart(userId);

    // Verify item ownership and variant availability
    const items = await this.dataSource.query(
      `SELECT 
        ci.id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        pv.stock_quantity,
        pv.is_active,
        p.is_published
      FROM cart_items ci
      JOIN product_variants pv ON ci.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE ci.id = $1 AND ci.cart_id = $2`,
      [itemId, cart.id]
    );

    if (items.length === 0) {
      throw new NotFoundError('Cart item not found.');
    }

    const item = items[0];

    if (!item.is_active || !item.is_published) {
      throw new BadRequestError(
        'This product variant is no longer available.',
        'VARIANT_UNAVAILABLE'
      );
    }

    if (quantity > item.stock_quantity) {
      throw new ConflictError('Requested quantity exceeds available stock.', 'INSUFFICIENT_STOCK');
    }

    await this.dataSource.query(
      'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [quantity, itemId]
    );

    await this.dataSource.query('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      cart.id
    ]);

    return this.getCart(userId);
  }

  async removeItem(userId, itemId) {
    const cart = await this.getOrCreateCart(userId);

    const deleted = await this.dataSource.query(
      'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id',
      [itemId, cart.id]
    );

    const rows = extractRows(deleted);
    if (rows.length === 0) {
      throw new NotFoundError('Cart item not found.');
    }

    await this.dataSource.query('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      cart.id
    ]);

    return this.getCart(userId);
  }

  async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    await this.dataSource.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);

    await this.dataSource.query('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      cart.id
    ]);

    return this.getCart(userId);
  }
}

function createCartService({ dataSource, logger }) {
  return new CartService({ dataSource, logger });
}

module.exports = {
  CartService,
  createCartService
};
