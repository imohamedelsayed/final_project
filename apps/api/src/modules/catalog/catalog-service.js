const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError
} = require('../../shared/errors');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRow(res) {
  if (!res) return null;
  if (
    Array.isArray(res) &&
    res.length === 2 &&
    Array.isArray(res[0]) &&
    typeof res[1] === 'number'
  ) {
    return res[0][0] || null;
  }
  if (Array.isArray(res)) {
    return res[0] || null;
  }
  return res;
}

class CatalogService {
  constructor({ dataSource, mediaService, logger }) {
    this.dataSource = dataSource;
    this.mediaService = mediaService;
    this.logger = logger;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  async listCategories({ page = 1, pageSize = 20, search, is_active, parent_id } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (typeof is_active === 'boolean') {
      conditions.push(`c.is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    if (search && search.trim()) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.slug ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === null) {
        conditions.push('c.parent_id IS NULL');
      } else {
        conditions.push(`c.parent_id = $${paramIndex++}`);
        params.push(parent_id);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM categories c ${whereClause}`;
    const countRes = await this.dataSource.query(countQuery, params);
    const total = parseInt(countRes[0]?.total || '0', 10);

    const dataQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        p.name AS parent_name,
        c.is_active,
        c.sort_order,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM categories child WHERE child.parent_id = c.id)::int AS children_count,
        (SELECT COUNT(*) FROM products prod WHERE prod.category_id = c.id)::int AS products_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ${whereClause}
      ORDER BY c.sort_order ASC, c.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const items = await this.dataSource.query(dataQuery, [...params, limit, offset]);

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createCategory(data) {
    const slug = (data.slug && data.slug.trim()) || slugify(data.name);

    if (data.parent_id) {
      const parent = await this.dataSource.query('SELECT id FROM categories WHERE id = $1', [
        data.parent_id
      ]);
      if (parent.length === 0) {
        throw new NotFoundError('Parent category not found.');
      }
    }

    const existingSlug = await this.dataSource.query('SELECT id FROM categories WHERE slug = $1', [
      slug
    ]);
    if (existingSlug.length > 0) {
      throw new ConflictError(`Category slug "${slug}" is already in use.`, 'SLUG_IN_USE');
    }

    const insertQuery = `
      INSERT INTO categories (name, slug, parent_id, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const rows = await this.dataSource.query(insertQuery, [
      data.name.trim(),
      slug,
      data.parent_id || null,
      data.is_active !== undefined ? data.is_active : true,
      data.sort_order !== undefined ? data.sort_order : 0
    ]);

    return rows[0];
  }

  async getCategory(id) {
    const rows = await this.dataSource.query(
      `SELECT 
        c.*,
        p.name AS parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFoundError('Category not found.');
    }

    const category = rows[0];

    const children = await this.dataSource.query(
      `SELECT id, name, slug, is_active, sort_order 
       FROM categories 
       WHERE parent_id = $1 
       ORDER BY sort_order ASC, name ASC`,
      [id]
    );

    return { ...category, children };
  }

  async updateCategory(id, data) {
    const existing = await this.getCategory(id);

    if (data.parent_id !== undefined && data.parent_id !== null) {
      if (data.parent_id === id) {
        throw new BadRequestError('A category cannot be its own parent.');
      }
      // Cycle check: verify parent is not a descendant of this category
      let checkId = data.parent_id;
      while (checkId) {
        const parentRes = await this.dataSource.query(
          'SELECT parent_id FROM categories WHERE id = $1',
          [checkId]
        );
        if (parentRes.length === 0) break;
        if (parentRes[0].parent_id === id) {
          throw new BadRequestError('Circular parent-child category dependency detected.');
        }
        checkId = parentRes[0].parent_id;
      }
    }

    const newSlug = data.slug !== undefined ? data.slug.trim() : undefined;
    if (newSlug && newSlug !== existing.slug) {
      const conflict = await this.dataSource.query(
        'SELECT id FROM categories WHERE slug = $1 AND id <> $2',
        [newSlug, id]
      );
      if (conflict.length > 0) {
        throw new ConflictError(`Category slug "${newSlug}" is already in use.`, 'SLUG_IN_USE');
      }
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${i++}`);
      params.push(data.name.trim());
    }
    if (newSlug !== undefined) {
      updates.push(`slug = $${i++}`);
      params.push(newSlug);
    }
    if (data.parent_id !== undefined) {
      updates.push(`parent_id = $${i++}`);
      params.push(data.parent_id);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${i++}`);
      params.push(data.is_active);
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${i++}`);
      params.push(data.sort_order);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE categories
      SET ${updates.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `;

    const res = await this.dataSource.query(query, params);
    return normalizeRow(res);
  }

  async deleteCategory(id) {
    const existing = await this.dataSource.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.length === 0) {
      throw new NotFoundError('Category not found.');
    }

    // Safe deletion: prevent deletion if child categories exist
    const childrenCount = await this.dataSource.query(
      'SELECT COUNT(*) AS count FROM categories WHERE parent_id = $1',
      [id]
    );
    if (parseInt(childrenCount[0]?.count || '0', 10) > 0) {
      throw new ConflictError(
        'Cannot delete category with existing subcategories. Reassign or delete subcategories first.',
        'CATEGORY_HAS_CHILDREN'
      );
    }

    // Safe deletion: prevent deletion if products reference this category
    const productsCount = await this.dataSource.query(
      'SELECT COUNT(*) AS count FROM products WHERE category_id = $1',
      [id]
    );
    if (parseInt(productsCount[0]?.count || '0', 10) > 0) {
      throw new ConflictError(
        'Cannot delete category with associated products. Deactivate the category instead.',
        'CATEGORY_IN_USE'
      );
    }

    await this.dataSource.query('DELETE FROM categories WHERE id = $1', [id]);
    return { deleted: true };
  }

  // ==========================================
  // BRANDS
  // ==========================================

  async listBrands({ page = 1, pageSize = 20, search, is_active } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (typeof is_active === 'boolean') {
      conditions.push(`b.is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    if (search && search.trim()) {
      conditions.push(`(b.name ILIKE $${paramIndex} OR b.slug ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM brands b ${whereClause}`,
      params
    );
    const total = parseInt(countRes[0]?.total || '0', 10);

    const items = await this.dataSource.query(
      `SELECT 
        b.*,
        (SELECT COUNT(*) FROM products prod WHERE prod.brand_id = b.id)::int AS products_count
      FROM brands b
      ${whereClause}
      ORDER BY b.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createBrand(data) {
    const slug = (data.slug && data.slug.trim()) || slugify(data.name);

    const existing = await this.dataSource.query('SELECT id FROM brands WHERE slug = $1', [slug]);
    if (existing.length > 0) {
      throw new ConflictError(`Brand slug "${slug}" is already in use.`, 'SLUG_IN_USE');
    }

    const res = await this.dataSource.query(
      `INSERT INTO brands (name, slug, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name.trim(), slug, data.is_active !== undefined ? data.is_active : true]
    );

    return res[0];
  }

  async getBrand(id) {
    const rows = await this.dataSource.query('SELECT * FROM brands WHERE id = $1', [id]);
    if (rows.length === 0) {
      throw new NotFoundError('Brand not found.');
    }
    return rows[0];
  }

  async updateBrand(id, data) {
    const existing = await this.getBrand(id);

    const newSlug = data.slug !== undefined ? data.slug.trim() : undefined;
    if (newSlug && newSlug !== existing.slug) {
      const conflict = await this.dataSource.query(
        'SELECT id FROM brands WHERE slug = $1 AND id <> $2',
        [newSlug, id]
      );
      if (conflict.length > 0) {
        throw new ConflictError(`Brand slug "${newSlug}" is already in use.`, 'SLUG_IN_USE');
      }
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${i++}`);
      params.push(data.name.trim());
    }
    if (newSlug !== undefined) {
      updates.push(`slug = $${i++}`);
      params.push(newSlug);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${i++}`);
      params.push(data.is_active);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const res = await this.dataSource.query(
      `UPDATE brands SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    return normalizeRow(res);
  }

  async deleteBrand(id) {
    const existing = await this.dataSource.query('SELECT id FROM brands WHERE id = $1', [id]);
    if (existing.length === 0) {
      throw new NotFoundError('Brand not found.');
    }

    const productsCount = await this.dataSource.query(
      'SELECT COUNT(*) AS count FROM products WHERE brand_id = $1',
      [id]
    );
    if (parseInt(productsCount[0]?.count || '0', 10) > 0) {
      throw new ConflictError(
        'Cannot delete brand with associated products. Deactivate the brand instead.',
        'BRAND_IN_USE'
      );
    }

    await this.dataSource.query('DELETE FROM brands WHERE id = $1', [id]);
    return { deleted: true };
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  async listProducts({
    page = 1,
    pageSize = 20,
    search,
    category_id,
    brand_id,
    condition,
    is_published,
    sort = 'created_at_desc'
  } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (typeof is_published === 'boolean') {
      conditions.push(`p.is_published = $${paramIndex++}`);
      params.push(is_published);
    }

    if (condition) {
      conditions.push(`p.condition = $${paramIndex++}`);
      params.push(condition);
    }

    if (category_id) {
      conditions.push(`p.category_id = $${paramIndex++}`);
      params.push(category_id);
    }

    if (brand_id) {
      conditions.push(`p.brand_id = $${paramIndex++}`);
      params.push(brand_id);
    }

    if (search && search.trim()) {
      conditions.push(`(
        p.name ILIKE $${paramIndex} OR 
        p.slug ILIKE $${paramIndex} OR 
        EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.sku ILIKE $${paramIndex})
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    if (sort === 'created_at_asc') orderBy = 'p.created_at ASC';
    if (sort === 'name_asc') orderBy = 'p.name ASC';
    if (sort === 'name_desc') orderBy = 'p.name DESC';

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countRes[0]?.total || '0', 10);

    const query = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.condition,
        p.is_published,
        p.created_at,
        p.updated_at,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
        CASE WHEN b.id IS NOT NULL 
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug) 
          ELSE NULL 
        END AS brand,
        (
          SELECT json_build_object(
            'id', pv.id,
            'sku', pv.sku,
            'variant_label', pv.variant_label,
            'price', pv.price::text,
            'stock_quantity', pv.stock_quantity,
            'is_default', pv.is_default
          )
          FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_default = true
          LIMIT 1
        ) AS default_variant,
        (
          SELECT COALESCE(SUM(pv.stock_quantity), 0)::int
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS total_stock,
        (
          SELECT COUNT(*)::int
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS variants_count,
        (
          SELECT json_build_object('id', pi.id, 'image_path', pi.image_path, 'alt_text', pi.alt_text)
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) AS primary_image,
        EXISTS (SELECT 1 FROM featured_products fp WHERE fp.product_id = p.id) AS is_featured
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const items = await this.dataSource.query(query, [...params, limit, offset]);

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProduct(id) {
    const products = await this.dataSource.query(
      `SELECT 
        p.*,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
        CASE WHEN b.id IS NOT NULL 
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug) 
          ELSE NULL 
        END AS brand,
        EXISTS (SELECT 1 FROM featured_products fp WHERE fp.product_id = p.id) AS is_featured
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = $1`,
      [id]
    );

    if (products.length === 0) {
      throw new NotFoundError('Product not found.');
    }

    const product = products[0];

    // Variants (default first)
    const variants = await this.dataSource.query(
      `SELECT 
        id, product_id, sku, variant_label, options,
        price::text AS price,
        stock_quantity, low_stock_threshold, is_default, is_active,
        created_at, updated_at
      FROM product_variants
      WHERE product_id = $1
      ORDER BY is_default DESC, created_at ASC`,
      [id]
    );

    // Unpack duration_of_use from options if present
    const formattedVariants = variants.map((v) => {
      const durationOfUse = v.options?.duration_of_use || null;
      return {
        ...v,
        duration_of_use: durationOfUse
      };
    });

    // Images
    const images = await this.dataSource.query(
      `SELECT id, product_id, image_path, alt_text, is_primary, sort_order, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
      [id]
    );

    // Specifications
    const specifications = await this.dataSource.query(
      `SELECT id, product_id, spec_name, spec_value, sort_order
       FROM product_specifications
       WHERE product_id = $1
       ORDER BY sort_order ASC, spec_name ASC`,
      [id]
    );

    return {
      ...product,
      variants: formattedVariants,
      images,
      specifications
    };
  }

  async createProduct(data, adminUserId) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const slug = (data.slug && data.slug.trim()) || slugify(data.name);

      const existingSlug = await queryRunner.query('SELECT id FROM products WHERE slug = $1', [
        slug
      ]);
      if (existingSlug.length > 0) {
        throw new ConflictError(`Product slug "${slug}" is already in use.`, 'SLUG_IN_USE');
      }

      // Check category exists
      const cat = await queryRunner.query('SELECT id, is_active FROM categories WHERE id = $1', [
        data.category_id
      ]);
      if (cat.length === 0) {
        throw new NotFoundError('Category not found.');
      }

      // Check brand if provided
      if (data.brand_id) {
        const brand = await queryRunner.query('SELECT id FROM brands WHERE id = $1', [
          data.brand_id
        ]);
        if (brand.length === 0) {
          throw new NotFoundError('Brand not found.');
        }
      }

      // Insert product
      const productRes = await queryRunner.query(
        `INSERT INTO products (name, slug, description, category_id, brand_id, condition, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.name.trim(),
          slug,
          data.description ? data.description.trim() : null,
          data.category_id,
          data.brand_id || null,
          data.condition,
          data.is_published !== undefined ? data.is_published : false
        ]
      );

      const product = productRes[0];

      // Default variant check and insertion
      const variantData = data.default_variant;
      if (!variantData) {
        throw new ValidationError('A default variant is required when creating a product.', {
          default_variant: 'default_variant is required'
        });
      }

      // Check SKU uniqueness
      const existingSku = await queryRunner.query(
        'SELECT id FROM product_variants WHERE sku = $1',
        [variantData.sku.trim()]
      );
      if (existingSku.length > 0) {
        throw new ConflictError(
          `Variant SKU "${variantData.sku}" is already in use.`,
          'SKU_IN_USE'
        );
      }

      const options = { ...(variantData.options || {}) };
      if (variantData.duration_of_use) {
        options.duration_of_use = variantData.duration_of_use;
      }

      const variantRes = await queryRunner.query(
        `INSERT INTO product_variants (
           product_id, sku, variant_label, options, price, 
           stock_quantity, low_stock_threshold, is_default, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         RETURNING *`,
        [
          product.id,
          variantData.sku.trim(),
          variantData.variant_label.trim(),
          Object.keys(options).length > 0 ? JSON.stringify(options) : null,
          variantData.price,
          variantData.stock_quantity || 0,
          variantData.low_stock_threshold || 0,
          variantData.is_active !== undefined ? variantData.is_active : true
        ]
      );

      const variant = variantRes[0];

      // If initial stock > 0, log initial inventory adjustment for auditability
      if (variantData.stock_quantity > 0) {
        await queryRunner.query(
          `INSERT INTO inventory_adjustments (variant_id, admin_user_id, quantity_delta, reason)
           VALUES ($1, $2, $3, $4)`,
          [variant.id, adminUserId, variantData.stock_quantity, 'Initial stock on product creation']
        );
      }

      // Insert any initial specifications
      if (Array.isArray(data.specifications) && data.specifications.length > 0) {
        for (const spec of data.specifications) {
          await queryRunner.query(
            `INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [product.id, spec.spec_name.trim(), spec.spec_value.trim(), spec.sort_order || 0]
          );
        }
      }

      await queryRunner.commitTransaction();

      return this.getProduct(product.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProduct(id, data) {
    const existing = await this.dataSource.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.length === 0) {
      throw new NotFoundError('Product not found.');
    }

    const newSlug = data.slug !== undefined ? data.slug.trim() : undefined;
    if (newSlug && newSlug !== existing[0].slug) {
      const conflict = await this.dataSource.query(
        'SELECT id FROM products WHERE slug = $1 AND id <> $2',
        [newSlug, id]
      );
      if (conflict.length > 0) {
        throw new ConflictError(`Product slug "${newSlug}" is already in use.`, 'SLUG_IN_USE');
      }
    }

    if (data.category_id) {
      const cat = await this.dataSource.query('SELECT id FROM categories WHERE id = $1', [
        data.category_id
      ]);
      if (cat.length === 0) {
        throw new NotFoundError('Category not found.');
      }
    }

    if (data.brand_id) {
      const brand = await this.dataSource.query('SELECT id FROM brands WHERE id = $1', [
        data.brand_id
      ]);
      if (brand.length === 0) {
        throw new NotFoundError('Brand not found.');
      }
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${i++}`);
      params.push(data.name.trim());
    }
    if (newSlug !== undefined) {
      updates.push(`slug = $${i++}`);
      params.push(newSlug);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${i++}`);
      params.push(data.description ? data.description.trim() : null);
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = $${i++}`);
      params.push(data.category_id);
    }
    if (data.brand_id !== undefined) {
      updates.push(`brand_id = $${i++}`);
      params.push(data.brand_id);
    }
    if (data.condition !== undefined) {
      updates.push(`condition = $${i++}`);
      params.push(data.condition);
    }
    if (data.is_published !== undefined) {
      updates.push(`is_published = $${i++}`);
      params.push(data.is_published);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await this.dataSource.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $${i}`,
        params
      );
    }

    return this.getProduct(id);
  }

  // ==========================================
  // PRODUCT VARIANTS
  // ==========================================

  async listVariants(productId) {
    const variants = await this.dataSource.query(
      `SELECT 
        id, product_id, sku, variant_label, options,
        price::text AS price,
        stock_quantity, low_stock_threshold, is_default, is_active,
        created_at, updated_at
      FROM product_variants
      WHERE product_id = $1
      ORDER BY is_default DESC, created_at ASC`,
      [productId]
    );

    return variants.map((v) => ({
      ...v,
      duration_of_use: v.options?.duration_of_use || null
    }));
  }

  async createVariant(productId, data, adminUserId) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (product.length === 0) {
        throw new NotFoundError('Product not found.');
      }

      const existingSku = await queryRunner.query(
        'SELECT id FROM product_variants WHERE sku = $1',
        [data.sku.trim()]
      );
      if (existingSku.length > 0) {
        throw new ConflictError(`Variant SKU "${data.sku}" is already in use.`, 'SKU_IN_USE');
      }

      const existingVariants = await queryRunner.query(
        'SELECT id, is_default FROM product_variants WHERE product_id = $1',
        [productId]
      );

      // Invariant: if it's the first variant, force is_default = true
      let makeDefault = data.is_default || false;
      if (existingVariants.length === 0) {
        makeDefault = true;
      }

      if (makeDefault) {
        await queryRunner.query(
          'UPDATE product_variants SET is_default = false WHERE product_id = $1',
          [productId]
        );
      }

      const options = { ...(data.options || {}) };
      if (data.duration_of_use) {
        options.duration_of_use = data.duration_of_use;
      }

      const res = await queryRunner.query(
        `INSERT INTO product_variants (
           product_id, sku, variant_label, options, price,
           stock_quantity, low_stock_threshold, is_default, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          productId,
          data.sku.trim(),
          data.variant_label.trim(),
          Object.keys(options).length > 0 ? JSON.stringify(options) : null,
          data.price,
          data.stock_quantity || 0,
          data.low_stock_threshold || 0,
          makeDefault,
          data.is_active !== undefined ? data.is_active : true
        ]
      );

      const variant = res[0];

      if (data.stock_quantity > 0) {
        await queryRunner.query(
          `INSERT INTO inventory_adjustments (variant_id, admin_user_id, quantity_delta, reason)
           VALUES ($1, $2, $3, $4)`,
          [variant.id, adminUserId, data.stock_quantity, 'Initial variant inventory']
        );
      }

      await queryRunner.commitTransaction();

      return {
        ...variant,
        price: variant.price.toString(),
        duration_of_use: variant.options?.duration_of_use || null
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateVariant(productId, variantId, data) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.query(
        'SELECT * FROM product_variants WHERE id = $1 AND product_id = $2',
        [variantId, productId]
      );
      if (existing.length === 0) {
        throw new NotFoundError('Variant not found.');
      }
      const current = existing[0];

      if (data.sku && data.sku.trim() !== current.sku) {
        const conflict = await queryRunner.query(
          'SELECT id FROM product_variants WHERE sku = $1 AND id <> $2',
          [data.sku.trim(), variantId]
        );
        if (conflict.length > 0) {
          throw new ConflictError(`Variant SKU "${data.sku}" is already in use.`, 'SKU_IN_USE');
        }
      }

      // Handle is_default invariant:
      // Cannot set is_default to false if this is currently the only default variant
      if (data.is_default === false && current.is_default) {
        throw new BadRequestError(
          'A product must have exactly one default variant. Mark another variant as default instead of unsetting this one.',
          { is_default: 'Cannot unset default directly' }
        );
      }

      if (data.is_default === true && !current.is_default) {
        await queryRunner.query(
          'UPDATE product_variants SET is_default = false WHERE product_id = $1',
          [productId]
        );
      }

      const updates = [];
      const params = [];
      let i = 1;

      if (data.sku !== undefined) {
        updates.push(`sku = $${i++}`);
        params.push(data.sku.trim());
      }
      if (data.variant_label !== undefined) {
        updates.push(`variant_label = $${i++}`);
        params.push(data.variant_label.trim());
      }
      if (data.price !== undefined) {
        updates.push(`price = $${i++}`);
        params.push(data.price);
      }
      if (data.low_stock_threshold !== undefined) {
        updates.push(`low_stock_threshold = $${i++}`);
        params.push(data.low_stock_threshold);
      }
      if (data.is_default !== undefined) {
        updates.push(`is_default = $${i++}`);
        params.push(data.is_default);
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${i++}`);
        params.push(data.is_active);
      }

      if (data.options !== undefined || data.duration_of_use !== undefined) {
        const mergedOptions = {
          ...(current.options || {}),
          ...(data.options || {})
        };
        if (data.duration_of_use !== undefined) {
          if (data.duration_of_use === null) {
            delete mergedOptions.duration_of_use;
          } else {
            mergedOptions.duration_of_use = data.duration_of_use;
          }
        }
        updates.push(`options = $${i++}`);
        params.push(Object.keys(mergedOptions).length > 0 ? JSON.stringify(mergedOptions) : null);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(variantId);
        params.push(productId);

        const res = await queryRunner.query(
          `UPDATE product_variants SET ${updates.join(', ')} WHERE id = $${i++} AND product_id = $${i} RETURNING *`,
          params
        );
        await queryRunner.commitTransaction();

        const v = normalizeRow(res);
        return {
          ...v,
          price: v.price.toString(),
          duration_of_use: v.options?.duration_of_use || null
        };
      }

      await queryRunner.commitTransaction();
      return {
        ...current,
        price: current.price.toString(),
        duration_of_use: current.options?.duration_of_use || null
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteVariant(productId, variantId) {
    const existing = await this.dataSource.query(
      'SELECT id, is_default FROM product_variants WHERE id = $1 AND product_id = $2',
      [variantId, productId]
    );

    if (existing.length === 0) {
      throw new NotFoundError('Variant not found.');
    }

    if (existing[0].is_default) {
      throw new BadRequestError(
        'Cannot delete the default variant of a product. Mark another variant as default first.',
        'CANNOT_DELETE_DEFAULT_VARIANT'
      );
    }

    // Check if referenced in inventory_adjustments, cart_items, or order_items
    const adjCount = await this.dataSource.query(
      'SELECT COUNT(*) AS count FROM inventory_adjustments WHERE variant_id = $1',
      [variantId]
    );
    const cartCount = await this.dataSource.query(
      'SELECT COUNT(*) AS count FROM cart_items WHERE variant_id = $1',
      [variantId]
    );
    const orderCount = await this.dataSource.query(
      'SELECT COUNT(*) AS count FROM order_items WHERE variant_id = $1',
      [variantId]
    );

    const hasReferences =
      parseInt(adjCount[0]?.count || '0', 10) > 0 ||
      parseInt(cartCount[0]?.count || '0', 10) > 0 ||
      parseInt(orderCount[0]?.count || '0', 10) > 0;

    if (hasReferences) {
      // Safe deactivation to preserve historical cart/order/inventory integrity
      await this.dataSource.query(
        'UPDATE product_variants SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [variantId]
      );
      return {
        deleted: false,
        deactivated: true,
        message:
          'Variant is referenced by inventory records or orders. Deactivated instead of deleted.'
      };
    }

    await this.dataSource.query('DELETE FROM product_variants WHERE id = $1', [variantId]);
    return { deleted: true };
  }

  // ==========================================
  // PRODUCT SPECIFICATIONS
  // ==========================================

  async listSpecifications(productId) {
    return this.dataSource.query(
      `SELECT id, product_id, spec_name, spec_value, sort_order
       FROM product_specifications
       WHERE product_id = $1
       ORDER BY sort_order ASC, spec_name ASC`,
      [productId]
    );
  }

  async addSpecification(productId, data) {
    const product = await this.dataSource.query('SELECT id FROM products WHERE id = $1', [
      productId
    ]);
    if (product.length === 0) {
      throw new NotFoundError('Product not found.');
    }

    const existing = await this.dataSource.query(
      'SELECT id FROM product_specifications WHERE product_id = $1 AND spec_name = $2',
      [productId, data.spec_name.trim()]
    );
    if (existing.length > 0) {
      throw new ConflictError(
        `Specification "${data.spec_name}" already exists for this product.`,
        'SPECIFICATION_EXISTS'
      );
    }

    const res = await this.dataSource.query(
      `INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [productId, data.spec_name.trim(), data.spec_value.trim(), data.sort_order || 0]
    );

    return res[0];
  }

  async updateSpecification(productId, specId, data) {
    const existing = await this.dataSource.query(
      'SELECT * FROM product_specifications WHERE id = $1 AND product_id = $2',
      [specId, productId]
    );
    if (existing.length === 0) {
      throw new NotFoundError('Specification not found.');
    }

    if (data.spec_name && data.spec_name.trim() !== existing[0].spec_name) {
      const conflict = await this.dataSource.query(
        'SELECT id FROM product_specifications WHERE product_id = $1 AND spec_name = $2 AND id <> $3',
        [productId, data.spec_name.trim(), specId]
      );
      if (conflict.length > 0) {
        throw new ConflictError(
          `Specification "${data.spec_name}" already exists for this product.`,
          'SPECIFICATION_EXISTS'
        );
      }
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (data.spec_name !== undefined) {
      updates.push(`spec_name = $${i++}`);
      params.push(data.spec_name.trim());
    }
    if (data.spec_value !== undefined) {
      updates.push(`spec_value = $${i++}`);
      params.push(data.spec_value.trim());
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${i++}`);
      params.push(data.sort_order);
    }

    if (updates.length === 0) return existing[0];

    params.push(specId);
    params.push(productId);

    const res = await this.dataSource.query(
      `UPDATE product_specifications SET ${updates.join(', ')} WHERE id = $${i++} AND product_id = $${i} RETURNING *`,
      params
    );

    return normalizeRow(res);
  }

  async deleteSpecification(productId, specId) {
    const res = await this.dataSource.query(
      'DELETE FROM product_specifications WHERE id = $1 AND product_id = $2 RETURNING id',
      [specId, productId]
    );
    const deletedRow = normalizeRow(res);
    if (!deletedRow) {
      throw new NotFoundError('Specification not found.');
    }
    return { deleted: true };
  }

  // ==========================================
  // PRODUCT IMAGES
  // ==========================================

  async listImages(productId) {
    return this.dataSource.query(
      `SELECT id, product_id, image_path, alt_text, is_primary, sort_order, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
      [productId]
    );
  }

  async addImage(productId, data) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (product.length === 0) {
        throw new NotFoundError('Product not found.');
      }

      const existingImages = await queryRunner.query(
        'SELECT id, is_primary FROM product_images WHERE product_id = $1',
        [productId]
      );

      // Invariant: first image automatically becomes primary
      let makePrimary = data.is_primary || false;
      if (existingImages.length === 0) {
        makePrimary = true;
      }

      if (makePrimary) {
        await queryRunner.query(
          'UPDATE product_images SET is_primary = false WHERE product_id = $1',
          [productId]
        );
      }

      const res = await queryRunner.query(
        `INSERT INTO product_images (product_id, image_path, alt_text, is_primary, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          productId,
          data.image_path.trim(),
          data.alt_text ? data.alt_text.trim() : null,
          makePrimary,
          data.sort_order || 0
        ]
      );

      await queryRunner.commitTransaction();
      return res[0];
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateImage(productId, imageId, data) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, productId]
      );
      if (existing.length === 0) {
        throw new NotFoundError('Image not found.');
      }
      const current = existing[0];

      if (data.is_primary === true && !current.is_primary) {
        await queryRunner.query(
          'UPDATE product_images SET is_primary = false WHERE product_id = $1',
          [productId]
        );
      }

      const updates = [];
      const params = [];
      let i = 1;

      if (data.alt_text !== undefined) {
        updates.push(`alt_text = $${i++}`);
        params.push(data.alt_text ? data.alt_text.trim() : null);
      }
      if (data.is_primary !== undefined) {
        updates.push(`is_primary = $${i++}`);
        params.push(data.is_primary);
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${i++}`);
        params.push(data.sort_order);
      }

      if (updates.length > 0) {
        params.push(imageId);
        params.push(productId);

        const res = await queryRunner.query(
          `UPDATE product_images SET ${updates.join(', ')} WHERE id = $${i++} AND product_id = $${i} RETURNING *`,
          params
        );
        await queryRunner.commitTransaction();
        return normalizeRow(res);
      }

      await queryRunner.commitTransaction();
      return current;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteImage(productId, imageId) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, productId]
      );
      if (existing.length === 0) {
        throw new NotFoundError('Image not found.');
      }
      const image = existing[0];

      await queryRunner.query('DELETE FROM product_images WHERE id = $1', [imageId]);

      // If deleted image was primary, promote next available image
      if (image.is_primary) {
        await queryRunner.query(
          `UPDATE product_images 
           SET is_primary = true 
           WHERE id = (
             SELECT id FROM product_images 
             WHERE product_id = $1 
             ORDER BY sort_order ASC, created_at ASC 
             LIMIT 1
           )`,
          [productId]
        );
      }

      await queryRunner.commitTransaction();

      // Outside transaction: attempt safe physical file deletion
      if (this.mediaService) {
        await this.mediaService.safeDeleteImageFile(image.image_path);
      }

      return { deleted: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ==========================================
  // BANNERS
  // ==========================================

  async listBanners({ page = 1, pageSize = 20, is_published } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (typeof is_published === 'boolean') {
      conditions.push(`is_published = $${paramIndex++}`);
      params.push(is_published);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM banners ${whereClause}`,
      params
    );
    const total = parseInt(countRes[0]?.total || '0', 10);

    const items = await this.dataSource.query(
      `SELECT * FROM banners
       ${whereClause}
       ORDER BY sort_order ASC, created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createBanner(data) {
    const res = await this.dataSource.query(
      `INSERT INTO banners (image_path, link_url, is_published, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.image_path.trim(),
        data.link_url ? data.link_url.trim() : null,
        data.is_published !== undefined ? data.is_published : false,
        data.sort_order || 0
      ]
    );

    return res[0];
  }

  async updateBanner(id, data) {
    const existing = await this.dataSource.query('SELECT * FROM banners WHERE id = $1', [id]);
    if (existing.length === 0) {
      throw new NotFoundError('Banner not found.');
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (data.image_path !== undefined) {
      updates.push(`image_path = $${i++}`);
      params.push(data.image_path.trim());
    }
    if (data.link_url !== undefined) {
      updates.push(`link_url = $${i++}`);
      params.push(data.link_url ? data.link_url.trim() : null);
    }
    if (data.is_published !== undefined) {
      updates.push(`is_published = $${i++}`);
      params.push(data.is_published);
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${i++}`);
      params.push(data.sort_order);
    }

    if (updates.length === 0) return existing[0];

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const res = await this.dataSource.query(
      `UPDATE banners SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    return normalizeRow(res);
  }

  async deleteBanner(id) {
    const existing = await this.dataSource.query('SELECT * FROM banners WHERE id = $1', [id]);
    if (existing.length === 0) {
      throw new NotFoundError('Banner not found.');
    }
    const banner = existing[0];

    await this.dataSource.query('DELETE FROM banners WHERE id = $1', [id]);

    if (this.mediaService) {
      await this.mediaService.safeDeleteImageFile(banner.image_path);
    }

    return { deleted: true };
  }

  // ==========================================
  // FEATURED PRODUCTS
  // ==========================================

  async listFeaturedProducts() {
    return this.dataSource.query(
      `SELECT 
        fp.product_id,
        fp.sort_order,
        fp.created_at,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'slug', p.slug,
          'condition', p.condition,
          'is_published', p.is_published,
          'category', json_build_object('id', c.id, 'name', c.name),
          'primary_image', (
            SELECT pi.image_path FROM product_images pi 
            WHERE pi.product_id = p.id AND pi.is_primary = true 
            LIMIT 1
          ),
          'default_price', (
            SELECT pv.price::text FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_default = true
            LIMIT 1
          )
        ) AS product
      FROM featured_products fp
      JOIN products p ON fp.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      ORDER BY fp.sort_order ASC, fp.created_at ASC`
    );
  }

  async addFeaturedProduct({ product_id, sort_order = 0 }) {
    const product = await this.dataSource.query('SELECT id FROM products WHERE id = $1', [
      product_id
    ]);
    if (product.length === 0) {
      throw new NotFoundError('Product not found.');
    }

    const res = await this.dataSource.query(
      `INSERT INTO featured_products (product_id, sort_order)
       VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
       RETURNING *`,
      [product_id, sort_order]
    );

    return normalizeRow(res);
  }

  async updateFeaturedProduct(productId, { sort_order }) {
    const res = await this.dataSource.query(
      `UPDATE featured_products SET sort_order = $1 WHERE product_id = $2 RETURNING *`,
      [sort_order, productId]
    );
    const row = normalizeRow(res);
    if (!row) {
      throw new NotFoundError('Featured product entry not found.');
    }
    return row;
  }

  async removeFeaturedProduct(productId) {
    const res = await this.dataSource.query(
      'DELETE FROM featured_products WHERE product_id = $1 RETURNING product_id',
      [productId]
    );
    const row = normalizeRow(res);
    if (!row) {
      throw new NotFoundError('Featured product entry not found.');
    }
    return { removed: true };
  }

  // ==========================================
  // INVENTORY ADJUSTMENTS
  // ==========================================

  async adjustInventory({ variantId, quantityDelta, reason, adminUserId }) {
    if (quantityDelta === 0) {
      throw new BadRequestError('Quantity delta cannot be zero.', {
        quantityDelta: 'Delta must be positive or negative non-zero integer'
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Row lock to prevent race conditions during concurrent inventory adjustments
      const rows = await queryRunner.query(
        'SELECT id, sku, stock_quantity, variant_label FROM product_variants WHERE id = $1 FOR UPDATE',
        [variantId]
      );

      if (rows.length === 0) {
        throw new NotFoundError('Product variant not found.');
      }

      const variant = rows[0];
      const newStock = variant.stock_quantity + quantityDelta;

      if (newStock < 0) {
        throw new ConflictError(
          `Cannot reduce stock below zero. Current stock is ${variant.stock_quantity}, requested reduction is ${Math.abs(quantityDelta)}.`,
          'INSUFFICIENT_STOCK'
        );
      }

      await queryRunner.query(
        'UPDATE product_variants SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, variantId]
      );

      const adjRes = await queryRunner.query(
        `INSERT INTO inventory_adjustments (variant_id, admin_user_id, quantity_delta, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [variantId, adminUserId, quantityDelta, reason.trim()]
      );

      await queryRunner.commitTransaction();

      return {
        adjustment: adjRes[0],
        variant: {
          id: variant.id,
          sku: variant.sku,
          variant_label: variant.variant_label,
          stock_quantity: newStock
        }
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async listInventoryAdjustments({ variant_id, page = 1, pageSize = 20 } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (variant_id) {
      conditions.push(`ia.variant_id = $${paramIndex++}`);
      params.push(variant_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM inventory_adjustments ia ${whereClause}`,
      params
    );
    const total = parseInt(countRes[0]?.total || '0', 10);

    const items = await this.dataSource.query(
      `SELECT 
        ia.id,
        ia.variant_id,
        ia.admin_user_id,
        ia.quantity_delta,
        ia.reason,
        ia.created_at,
        json_build_object(
          'id', pv.id,
          'sku', pv.sku,
          'variant_label', pv.variant_label,
          'product_id', p.id,
          'product_name', p.name
        ) AS variant,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email
        ) AS admin_user
      FROM inventory_adjustments ia
      JOIN product_variants pv ON ia.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN users u ON ia.admin_user_id = u.id
      ${whereClause}
      ORDER BY ia.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async listInventoryItems({ search, status, condition, page = 1, pageSize = 20 } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      conditions.push(
        `(p.name ILIKE $${paramIndex} OR pv.sku ILIKE $${paramIndex} OR pv.variant_label ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (condition) {
      conditions.push(`p.condition = $${paramIndex++}`);
      params.push(condition);
    }

    if (status === 'out_of_stock') {
      conditions.push('pv.stock_quantity = 0');
    } else if (status === 'low_stock') {
      conditions.push('pv.stock_quantity <= pv.low_stock_threshold AND pv.stock_quantity > 0');
    } else if (status === 'in_stock') {
      conditions.push('pv.stock_quantity > pv.low_stock_threshold');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total 
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes[0]?.total || '0', 10);

    const items = await this.dataSource.query(
      `SELECT 
        pv.id AS variant_id,
        pv.sku,
        pv.variant_label,
        pv.price::text AS price,
        pv.stock_quantity,
        pv.low_stock_threshold,
        pv.is_default,
        pv.is_active AS variant_active,
        pv.updated_at AS variant_updated_at,
        p.id AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p.condition,
        p.is_published,
        c.name AS category_name,
        b.name AS brand_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY 
        CASE WHEN pv.stock_quantity = 0 THEN 0 
             WHEN pv.stock_quantity <= pv.low_stock_threshold THEN 1 
             ELSE 2 END,
        pv.stock_quantity ASC,
        p.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // ==========================================
  // PUBLIC STOREFRONT ENDPOINTS
  // ==========================================

  async getPublicBanners() {
    return this.dataSource.query(
      `SELECT 
        b.id,
        b.image_path,
        b.link_url,
        b.sort_order
      FROM banners b
      WHERE b.is_published = true
      ORDER BY b.sort_order ASC, b.created_at ASC`
    );
  }

  async getPublicFeaturedProducts() {
    const raw = await this.dataSource.query(
      `SELECT 
        p.id,
        p.name,
        p.slug,
        p.condition,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
        CASE WHEN b.id IS NOT NULL 
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug) 
          ELSE NULL 
        END AS brand,
        (
          SELECT json_build_object(
            'id', pv.id,
            'sku', pv.sku,
            'variant_label', pv.variant_label,
            'price', pv.price::text,
            'options', pv.options
          )
          FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_default = true AND pv.is_active = true
          LIMIT 1
        ) AS default_variant,
        (
          SELECT json_build_object('id', pi.id, 'image_path', pi.image_path, 'alt_text', pi.alt_text)
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) AS primary_image,
        EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_active = true AND pv.stock_quantity > 0
        ) AS is_available,
        fp.sort_order
      FROM featured_products fp
      JOIN products p ON fp.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_published = true
      ORDER BY fp.sort_order ASC, p.created_at DESC`
    );

    return raw.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      condition: item.condition,
      duration_of_use: item.default_variant?.options?.duration_of_use || null,
      price: item.default_variant?.price || '0.00',
      category: item.category,
      brand: item.brand,
      primary_image: item.primary_image,
      is_available: Boolean(item.is_available),
      sort_order: item.sort_order
    }));
  }

  async getPublicCategories() {
    return this.dataSource.query(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.sort_order
      FROM categories c
      WHERE c.is_active = true
      ORDER BY c.sort_order ASC, c.name ASC`
    );
  }

  async getPublicBrands() {
    return this.dataSource.query(
      `SELECT 
        b.id,
        b.name,
        b.slug
      FROM brands b
      WHERE b.is_active = true
      ORDER BY b.name ASC`
    );
  }

  async getPublicProducts({
    page = 1,
    pageSize = 20,
    q,
    category,
    brand,
    condition,
    minPrice,
    maxPrice,
    availability,
    sort = 'created_at_desc'
  } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * limit;

    const conditions = ['p.is_published = true'];
    const params = [];
    let paramIndex = 1;

    if (q && q.trim()) {
      conditions.push(`(
        p.name ILIKE $${paramIndex} OR 
        p.description ILIKE $${paramIndex} OR 
        c.name ILIKE $${paramIndex} OR 
        (b.name IS NOT NULL AND b.name ILIKE $${paramIndex}) OR 
        EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.sku ILIKE $${paramIndex})
      )`);
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }

    if (category && category.trim()) {
      const catVal = category.trim();
      conditions.push(`(
        c.slug = $${paramIndex} OR 
        c.id::text = $${paramIndex} OR 
        c.parent_id IN (SELECT id FROM categories WHERE slug = $${paramIndex} OR id::text = $${paramIndex})
      )`);
      params.push(catVal);
      paramIndex++;
    }

    if (brand && brand.trim()) {
      const brandVal = brand.trim();
      conditions.push(`(b.slug = $${paramIndex} OR b.id::text = $${paramIndex})`);
      params.push(brandVal);
      paramIndex++;
    }

    if (condition && (condition === 'new' || condition === 'used')) {
      conditions.push(`p.condition = $${paramIndex++}`);
      params.push(condition);
    }

    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      const minNum = parseFloat(minPrice);
      if (!isNaN(minNum) && minNum >= 0) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_default = true AND pv.price >= $${paramIndex++}
        )`);
        params.push(minNum);
      }
    }

    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      const maxNum = parseFloat(maxPrice);
      if (!isNaN(maxNum) && maxNum >= 0) {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_default = true AND pv.price <= $${paramIndex++}
        )`);
        params.push(maxNum);
      }
    }

    if (availability === 'in_stock') {
      conditions.push(`EXISTS (
        SELECT 1 FROM product_variants pv 
        WHERE pv.product_id = p.id AND pv.is_active = true AND pv.stock_quantity > 0
      )`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    let orderBy = 'p.created_at DESC';
    if (sort === 'created_at_asc') orderBy = 'p.created_at ASC';
    if (sort === 'name_asc') orderBy = 'p.name ASC';
    if (sort === 'name_desc') orderBy = 'p.name DESC';
    if (sort === 'price_asc') {
      orderBy =
        '(SELECT pv.price FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_default = true LIMIT 1) ASC, p.created_at DESC';
    }
    if (sort === 'price_desc') {
      orderBy =
        '(SELECT pv.price FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_default = true LIMIT 1) DESC, p.created_at DESC';
    }

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total 
       FROM products p 
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes[0]?.total || '0', 10);

    const query = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.condition,
        p.created_at,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
        CASE WHEN b.id IS NOT NULL 
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug) 
          ELSE NULL 
        END AS brand,
        (
          SELECT json_build_object(
            'id', pv.id,
            'sku', pv.sku,
            'variant_label', pv.variant_label,
            'price', pv.price::text,
            'options', pv.options
          )
          FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_default = true AND pv.is_active = true
          LIMIT 1
        ) AS default_variant,
        (
          SELECT json_build_object('id', pi.id, 'image_path', pi.image_path, 'alt_text', pi.alt_text)
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) AS primary_image,
        EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.is_active = true AND pv.stock_quantity > 0
        ) AS is_available
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const rawItems = await this.dataSource.query(query, [...params, limit, offset]);

    const items = rawItems.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      condition: item.condition,
      duration_of_use: item.default_variant?.options?.duration_of_use || null,
      price: item.default_variant?.price || '0.00',
      category: item.category,
      brand: item.brand,
      primary_image: item.primary_image,
      is_available: Boolean(item.is_available),
      created_at: item.created_at
    }));

    return {
      items,
      pagination: {
        page: p,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPublicProductBySlug(slug) {
    const products = await this.dataSource.query(
      `SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.condition,
        p.created_at,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
        CASE WHEN b.id IS NOT NULL 
          THEN json_build_object('id', b.id, 'name', b.name, 'slug', b.slug) 
          ELSE NULL 
        END AS brand
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.slug = $1 AND p.is_published = true`,
      [slug]
    );

    if (products.length === 0) {
      throw new NotFoundError('Product not found.');
    }

    const product = products[0];

    // Only active variants for public details
    const variants = await this.dataSource.query(
      `SELECT 
        id, sku, variant_label, options,
        price::text AS price,
        is_default,
        (stock_quantity > 0) AS is_available,
        created_at
      FROM product_variants
      WHERE product_id = $1 AND is_active = true
      ORDER BY is_default DESC, created_at ASC`,
      [product.id]
    );

    const formattedVariants = variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      variant_label: v.variant_label,
      options: v.options,
      price: v.price,
      is_default: v.is_default,
      is_available: Boolean(v.is_available),
      duration_of_use: v.options?.duration_of_use || null
    }));

    // Public images
    const images = await this.dataSource.query(
      `SELECT id, image_path, alt_text, is_primary, sort_order
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
      [product.id]
    );

    // Specifications
    const specifications = await this.dataSource.query(
      `SELECT id, spec_name, spec_value, sort_order
       FROM product_specifications
       WHERE product_id = $1
       ORDER BY sort_order ASC, spec_name ASC`,
      [product.id]
    );

    return {
      ...product,
      variants: formattedVariants,
      images,
      specifications
    };
  }
}

function createCatalogService({ dataSource, mediaService, logger }) {
  return new CatalogService({ dataSource, mediaService, logger });
}

module.exports = {
  slugify,
  CatalogService,
  createCatalogService
};
