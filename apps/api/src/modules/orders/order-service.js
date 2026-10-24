const crypto = require('node:crypto');
const { AppError } = require('../../shared/errors');

function appError(statusCode, code, message, fields = {}) {
  return new AppError(message, { statusCode, code, fields });
}

function createOrderService({ dataSource, config }) {
  if (!dataSource) {
    throw new Error('createOrderService requires an initialized dataSource');
  }

  const orderRepo = dataSource.getRepository('Order');
  const idempotencyRepo = dataSource.getRepository('OrderIdempotencyKey');
  const couponRepo = dataSource.getRepository('Coupon');
  const couponRedemptionRepo = dataSource.getRepository('CouponRedemption');
  const storeSettingRepo = dataSource.getRepository('StoreSetting');
  const cartRepo = dataSource.getRepository('Cart');
  const cartItemRepo = dataSource.getRepository('CartItem');

  // Helper to extract rows array from TypeORM raw query results
  function extractRows(result) {
    if (!result) return [];
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0];
    }
    if (Array.isArray(result)) {
      return result;
    }
    return [result];
  }

  // Retrieve current store WhatsApp number
  async function getStoreWhatsappNumber(manager = null) {
    const repo = manager ? manager.getRepository('StoreSetting') : storeSettingRepo;
    const setting = await repo.findOne({ where: { id: 1 } });
    if (setting && setting.whatsapp_number) {
      return setting.whatsapp_number;
    }
    return config.WHATSAPP_NUMBER || '+201000000000';
  }

  // Format WhatsApp click-to-chat URL with prefilled message
  function buildWhatsappUrl({ order, address, items, whatsappNumber }) {
    const cleanPhone = (whatsappNumber || '+201000000000').replace(/[^0-9]/g, '');
    const lines = [];

    lines.push(`Hello Pixel Store! I placed an order.`);
    lines.push(`Order Reference: ${order.order_number}`);
    lines.push(`Recipient: ${address.recipient_name}`);
    lines.push(`Mobile: ${address.mobile}`);
    lines.push(
      `Delivery: ${address.governorate}, ${address.area}, ${address.street}, Bldg ${address.building_number}`
    );
    lines.push(`Items:`);

    for (const item of items) {
      lines.push(
        `- ${item.quantity}x ${item.product_name_snapshot} (${item.variant_snapshot}) @ EGP ${Number(item.unit_price).toFixed(2)}`
      );
    }

    lines.push(`Subtotal: EGP ${Number(order.subtotal).toFixed(2)}`);
    if (Number(order.discount_amount) > 0) {
      lines.push(`Discount: -EGP ${Number(order.discount_amount).toFixed(2)}`);
    }
    lines.push(`Shipping: Pending calculation`);
    lines.push(`Final Total: Pending confirmation`);
    lines.push(``);
    lines.push(`Please confirm my order details and shipping fee.`);

    const text = lines.join('\n');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }

  // Validate coupon eligibility and calculate non-binding discount
  async function validateAndCalculateCoupon({ coupon, subtotal, userId, manager = null }) {
    if (!coupon.is_active) {
      throw appError(422, 'COUPON_INACTIVE', 'This coupon is no longer active.');
    }

    const now = new Date();
    if (coupon.starts_at && now < new Date(coupon.starts_at)) {
      throw appError(422, 'COUPON_NOT_STARTED', 'This coupon is not active yet.');
    }
    if (now > new Date(coupon.ends_at)) {
      throw appError(422, 'COUPON_EXPIRED', 'This coupon has expired.');
    }

    const numericSubtotal = Number(subtotal);
    if (coupon.minimum_subtotal && numericSubtotal < Number(coupon.minimum_subtotal)) {
      throw appError(
        422,
        'COUPON_MINIMUM_SUBTOTAL_NOT_MET',
        `This coupon requires a minimum subtotal of EGP ${Number(coupon.minimum_subtotal).toFixed(2)}.`
      );
    }

    // Global usage limit check (active redemptions where reversed_at IS NULL)
    if (coupon.global_usage_limit !== null && coupon.global_usage_limit !== undefined) {
      const redemptionRepo = manager
        ? manager.getRepository('CouponRedemption')
        : couponRedemptionRepo;
      const count = await redemptionRepo
        .createQueryBuilder('cr')
        .where('cr.coupon_id = :couponId AND cr.reversed_at IS NULL', { couponId: coupon.id })
        .getCount();

      if (count >= coupon.global_usage_limit) {
        throw appError(
          422,
          'COUPON_GLOBAL_LIMIT_REACHED',
          'This coupon has reached its total usage limit.'
        );
      }
    }

    // Per-customer usage limit check
    if (userId && coupon.per_customer_limit !== null && coupon.per_customer_limit !== undefined) {
      const redemptionRepo = manager
        ? manager.getRepository('CouponRedemption')
        : couponRedemptionRepo;
      const userCount = await redemptionRepo
        .createQueryBuilder('cr')
        .where('cr.coupon_id = :couponId AND cr.user_id = :userId AND cr.reversed_at IS NULL', {
          couponId: coupon.id,
          userId
        })
        .getCount();

      if (userCount >= coupon.per_customer_limit) {
        throw appError(
          422,
          'COUPON_CUSTOMER_LIMIT_REACHED',
          'You have already reached the maximum usage limit for this coupon.'
        );
      }
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = numericSubtotal * (Number(coupon.discount_value) / 100);
    } else {
      discount = Number(coupon.discount_value);
    }

    discount = Math.min(numericSubtotal, Math.max(0, discount));
    const roundedDiscount = Number(discount.toFixed(2));

    return {
      coupon,
      discountAmount: roundedDiscount
    };
  }

  // Public/Customer Coupon Quote (Non-binding)
  async function quoteCoupon({ userId, code }) {
    if (!code) {
      throw appError(400, 'VALIDATION_ERROR', 'Coupon code is required.');
    }

    // Get customer's cart
    const cart = await cartRepo.findOne({
      where: { user_id: userId },
      relations: ['items', 'items.variant', 'items.variant.product']
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw appError(409, 'CART_EMPTY', 'Your cart is empty.');
    }

    // Calculate current cart subtotal from database variant prices
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.variant && item.variant.is_active && item.variant.product?.is_published) {
        subtotal += Number(item.variant.price) * item.quantity;
      }
    }

    if (subtotal <= 0) {
      throw appError(409, 'CART_EMPTY', 'No purchasable items currently in cart to apply coupon.');
    }

    const normalizedCode = code.trim().toLowerCase();
    const coupon = await couponRepo
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.code)) = :code', { code: normalizedCode })
      .getOne();

    if (!coupon) {
      throw appError(404, 'COUPON_NOT_FOUND', 'Coupon code not found.');
    }

    const { discountAmount } = await validateAndCalculateCoupon({
      coupon,
      subtotal,
      userId
    });

    return {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discount_amount: discountAmount,
      subtotal: Number(subtotal.toFixed(2)),
      new_subtotal: Number((subtotal - discountAmount).toFixed(2)),
      eligible: true
    };
  }

  // Customer Checkout: Idempotent Pending Order Creation
  async function checkoutOrder({
    userId,
    idempotencyKey,
    addressData,
    couponCode,
    termsAccepted,
    termsVersion
  }) {
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      throw appError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required for checkout.'
      );
    }

    const cleanIdempotencyKey = idempotencyKey.trim();

    // Canonical request hash to verify request payload matches on retries
    const canonicalPayload = JSON.stringify({
      userId,
      address: {
        recipient_name: addressData.recipient_name,
        mobile: addressData.mobile,
        governorate: addressData.governorate,
        area: addressData.area,
        street: addressData.street,
        building_number: addressData.building_number,
        floor: addressData.floor || null,
        apartment: addressData.apartment || null,
        landmark: addressData.landmark || null
      },
      couponCode: (couponCode || '').trim().toLowerCase(),
      termsAccepted: Boolean(termsAccepted),
      termsVersion: termsVersion || 'v1.0'
    });
    const requestHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    // Check if idempotency key was previously registered for this user
    const existingKey = await idempotencyRepo.findOne({
      where: { user_id: userId, idempotency_key: cleanIdempotencyKey }
    });

    if (existingKey) {
      if (existingKey.request_hash !== requestHash) {
        throw appError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key was previously used with a different request payload.'
        );
      }

      if (existingKey.order_id) {
        // Return original order and generated WhatsApp URL
        const existingOrder = await orderRepo.findOne({
          where: { id: existingKey.order_id },
          relations: ['items', 'address', 'events']
        });

        if (existingOrder) {
          const storeWhatsapp = await getStoreWhatsappNumber();
          const whatsappUrl = buildWhatsappUrl({
            order: existingOrder,
            address: existingOrder.address,
            items: existingOrder.items,
            whatsappNumber: storeWhatsapp
          });

          return {
            order: existingOrder,
            whatsappUrl,
            isReplay: true
          };
        }
      }
    }

    // Execute checkout inside a database transaction
    let createdOrder = null;
    let createdAddress = null;
    let createdItems = [];
    let activeCartId = null;

    await dataSource.transaction(async (manager) => {
      // 1. Fetch user's cart and lock cart items
      const cart = await manager.findOne('Cart', {
        where: { user_id: userId },
        relations: ['items', 'items.variant', 'items.variant.product']
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw appError(409, 'CART_EMPTY', 'Your cart is empty. Please add items to checkout.');
      }

      activeCartId = cart.id;

      // 2. Revalidate all cart items: published product & active variant
      let subtotal = 0;
      const orderLines = [];

      for (const item of cart.items) {
        const variant = item.variant;
        const product = variant ? variant.product : null;

        if (!variant || !product || !variant.is_active || !product.is_published) {
          throw appError(
            409,
            'CART_STALE',
            `Item "${product ? product.name : 'Unknown'}" is no longer available. Please update your cart.`
          );
        }

        const unitPrice = Number(variant.price);
        const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
        subtotal += lineTotal;

        orderLines.push({
          variant_id: variant.id,
          product_name_snapshot: product.name,
          sku_snapshot: variant.sku,
          variant_snapshot: variant.variant_label || 'Default',
          condition_snapshot: variant.condition || 'new',
          unit_price: unitPrice.toFixed(2),
          quantity: item.quantity,
          line_total: lineTotal.toFixed(2)
        });
      }

      subtotal = Number(subtotal.toFixed(2));

      // 3. Optional coupon validation
      let couponId = null;
      let couponCodeSnapshot = null;
      let discountAmount = 0;

      if (couponCode && couponCode.trim()) {
        const normalized = couponCode.trim().toLowerCase();
        const coupon = await manager
          .getRepository('Coupon')
          .createQueryBuilder('c')
          .where('LOWER(TRIM(c.code)) = :code', { code: normalized })
          .getOne();

        if (!coupon) {
          throw appError(404, 'COUPON_NOT_FOUND', 'Coupon code not found.');
        }

        const calculated = await validateAndCalculateCoupon({
          coupon,
          subtotal,
          userId,
          manager
        });

        couponId = coupon.id;
        couponCodeSnapshot = coupon.code;
        discountAmount = calculated.discountAmount;
      }

      // 4. Generate unique order reference
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

      // 5. Create Order record (Pending, no stock deduction)
      const orderToCreate = {
        order_number: orderNumber,
        user_id: userId,
        status: 'pending',
        subtotal: subtotal.toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        shipping_fee: null,
        final_total: null,
        coupon_id: couponId,
        coupon_code_snapshot: couponCodeSnapshot,
        pricing_version: 1,
        agreed_pricing_version: null,
        final_total_sent_at: null,
        customer_agreed_at: null,
        expires_at: null,
        confirmed_at: null,
        cancelled_at: null,
        expired_at: null,
        stock_deducted_at: null,
        stock_restored_at: null
      };

      const insertOrderRes = await manager
        .createQueryBuilder()
        .insert()
        .into('Order')
        .values(orderToCreate)
        .returning('*')
        .execute();

      const orderRows = extractRows(insertOrderRes.raw || insertOrderRes.generatedMaps);
      createdOrder = orderRows[0];

      // 6. Create Order Item snapshots
      for (const line of orderLines) {
        const itemToCreate = {
          order_id: createdOrder.id,
          ...line
        };
        const insertItemRes = await manager
          .createQueryBuilder()
          .insert()
          .into('OrderItem')
          .values(itemToCreate)
          .returning('*')
          .execute();
        const itemRows = extractRows(insertItemRes.raw || insertItemRes.generatedMaps);
        createdItems.push(itemRows[0]);
      }

      // 7. Create Order Address snapshot
      const addressToCreate = {
        order_id: createdOrder.id,
        recipient_name: addressData.recipient_name,
        mobile: addressData.mobile,
        governorate: addressData.governorate,
        area: addressData.area,
        street: addressData.street,
        building_number: addressData.building_number,
        floor: addressData.floor || null,
        apartment: addressData.apartment || null,
        landmark: addressData.landmark || null
      };

      const insertAddrRes = await manager
        .createQueryBuilder()
        .insert()
        .into('OrderAddress')
        .values(addressToCreate)
        .returning('*')
        .execute();
      const addrRows = extractRows(insertAddrRes.raw || insertAddrRes.generatedMaps);
      createdAddress = addrRows[0];

      // 8. Record Idempotency Key
      await manager
        .createQueryBuilder()
        .insert()
        .into('OrderIdempotencyKey')
        .values({
          user_id: userId,
          idempotency_key: cleanIdempotencyKey,
          request_hash: requestHash,
          order_id: createdOrder.id
        })
        .execute();

      // 9. Append Order Event audit log
      await manager
        .createQueryBuilder()
        .insert()
        .into('OrderEvent')
        .values({
          order_id: createdOrder.id,
          event_type: 'created',
          actor_user_id: userId,
          previous_status: null,
          new_status: 'pending',
          notes: 'Customer submitted checkout; Cash-on-Delivery pending order created.',
          metadata: {
            terms_version: termsVersion || 'v1.0',
            terms_accepted_at: new Date().toISOString()
          }
        })
        .execute();
    });

    // 10. Only clear cart lines AFTER successful transaction commit
    if (activeCartId) {
      await cartItemRepo.delete({ cart_id: activeCartId });
    }

    // 11. Build WhatsApp URL
    const storeWhatsapp = await getStoreWhatsappNumber();
    const whatsappUrl = buildWhatsappUrl({
      order: createdOrder,
      address: createdAddress,
      items: createdItems,
      whatsappNumber: storeWhatsapp
    });

    createdOrder.address = createdAddress;
    createdOrder.items = createdItems;

    return {
      order: createdOrder,
      whatsappUrl,
      isReplay: false
    };
  }

  // Get Orders for Authenticated Customer
  async function getCustomerOrders({ userId, page = 1, pageSize = 20 }) {
    const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, pageSize));
    const take = Math.min(50, Math.max(1, pageSize));

    const [orders, total] = await orderRepo.findAndCount({
      where: { user_id: userId },
      relations: ['items', 'address'],
      order: { created_at: 'DESC' },
      skip,
      take
    });

    return {
      orders,
      pagination: {
        total,
        page: Math.max(1, page),
        pageSize: take,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  // Get Customer Order By Number
  async function getCustomerOrderByNumber({ userId, orderNumber }) {
    const order = await orderRepo.findOne({
      where: { order_number: orderNumber, user_id: userId },
      relations: ['items', 'address', 'events']
    });

    if (!order) {
      throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    const storeWhatsapp = await getStoreWhatsappNumber();
    const whatsappUrl = buildWhatsappUrl({
      order,
      address: order.address,
      items: order.items,
      whatsappNumber: storeWhatsapp
    });

    return {
      order,
      whatsappUrl
    };
  }

  // Customer Cancel Order (Pending status only)
  async function customerCancelOrder({ userId, orderNumber, reason }) {
    const order = await orderRepo.findOne({
      where: { order_number: orderNumber, user_id: userId }
    });

    if (!order) {
      throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    if (order.status !== 'pending') {
      throw appError(
        409,
        'ORDER_NOT_CANCELLABLE_DIRECTLY',
        'Only pending orders can be cancelled directly. For confirmed or processing orders, please contact our team via WhatsApp.'
      );
    }

    await dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update('Order')
        .set({
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date()
        })
        .where('id = :id', { id: order.id })
        .execute();

      await manager
        .createQueryBuilder()
        .insert()
        .into('OrderEvent')
        .values({
          order_id: order.id,
          event_type: 'cancelled',
          actor_user_id: userId,
          previous_status: 'pending',
          new_status: 'cancelled',
          notes: reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer'
        })
        .execute();
    });

    return getCustomerOrderByNumber({ userId, orderNumber });
  }

  // Admin: List Orders Queue with Filtering and Search
  async function listAdminOrders({ status, search, dateFrom, dateTo, page = 1, pageSize = 20 }) {
    const take = Math.min(100, Math.max(1, pageSize));
    const skip = (Math.max(1, page) - 1) * take;

    const query = orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.address', 'addr')
      .leftJoinAndSelect('o.items', 'item')
      .leftJoinAndSelect('o.user', 'u');

    if (status) {
      query.andWhere('o.status = :status', { status });
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query.andWhere(
        '(o.order_number ILIKE :term OR addr.recipient_name ILIKE :term OR addr.mobile ILIKE :term)',
        { term }
      );
    }

    if (dateFrom) {
      query.andWhere('o.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      query.andWhere('o.created_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    query.orderBy('o.created_at', 'DESC').skip(skip).take(take);

    const [orders, total] = await query.getManyAndCount();

    // Augment with operational indicator flags
    const now = new Date();
    const enriched = orders.map((o) => ({
      ...o,
      needs_final_total: o.status === 'pending' && !o.final_total_sent_at,
      is_overdue: o.status === 'pending' && o.expires_at && new Date(o.expires_at) < now
    }));

    return {
      orders: enriched,
      pagination: {
        total,
        page: Math.max(1, page),
        pageSize: take,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  // Admin: Get Detailed Order
  async function getAdminOrderById(orderId) {
    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'address', 'coupon', 'events', 'user']
    });

    if (!order) {
      throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    if (order.events) {
      order.events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return order;
  }

  // Admin: Set Final Total & Dispatch via WhatsApp (starts 24h countdown)
  async function setAdminFinalTotal(orderId, { shippingFee, adminUserId }) {
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    if (order.status !== 'pending') {
      throw appError(
        409,
        'ORDER_STATUS_INVALID',
        'Final total and shipping fee can only be set for pending orders.'
      );
    }

    const numericShipping = Number(shippingFee);
    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount_amount);
    const calculatedFinalTotal = Math.max(0, subtotal - discount + numericShipping);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from sent timestamp
    const nextPricingVersion = order.pricing_version + 1;

    await dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update('Order')
        .set({
          shipping_fee: numericShipping.toFixed(2),
          final_total: calculatedFinalTotal.toFixed(2),
          final_total_sent_at: now,
          expires_at: expiresAt,
          pricing_version: nextPricingVersion,
          agreed_pricing_version: null, // Reset agreement when terms/totals change
          customer_agreed_at: null,
          updated_at: now
        })
        .where('id = :id', { id: orderId })
        .execute();

      await manager
        .createQueryBuilder()
        .insert()
        .into('OrderEvent')
        .values({
          order_id: orderId,
          event_type: 'final_total_sent',
          actor_user_id: adminUserId,
          previous_status: 'pending',
          new_status: 'pending',
          notes: `Admin recorded dispatch of final total (Shipping: EGP ${numericShipping.toFixed(2)}, Final: EGP ${calculatedFinalTotal.toFixed(2)}). 24-hour expiry countdown started.`,
          metadata: {
            shipping_fee: numericShipping.toFixed(2),
            final_total: calculatedFinalTotal.toFixed(2),
            pricing_version: nextPricingVersion,
            expires_at: expiresAt.toISOString()
          }
        })
        .execute();
    });

    return getAdminOrderById(orderId);
  }

  // Admin: Record Customer Agreement to Current Pricing Version
  async function recordCustomerAgreement(orderId, { adminUserId, agreedPricingVersion }) {
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    if (order.status !== 'pending') {
      throw appError(
        409,
        'ORDER_STATUS_INVALID',
        'Customer agreement can only be recorded for pending orders.'
      );
    }

    const versionToAgree = agreedPricingVersion || order.pricing_version;
    if (versionToAgree !== order.pricing_version) {
      throw appError(
        409,
        'PRICING_VERSION_MISMATCH',
        `Cannot record agreement: order has advanced to pricing version ${order.pricing_version}.`
      );
    }

    const now = new Date();

    await dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update('Order')
        .set({
          customer_agreed_at: now,
          agreed_pricing_version: versionToAgree,
          updated_at: now
        })
        .where('id = :id', { id: orderId })
        .execute();

      await manager
        .createQueryBuilder()
        .insert()
        .into('OrderEvent')
        .values({
          order_id: orderId,
          event_type: 'customer_agreed',
          actor_user_id: adminUserId,
          previous_status: 'pending',
          new_status: 'pending',
          notes: `Customer agreement recorded for pricing version ${versionToAgree}.`,
          metadata: { agreed_pricing_version: versionToAgree, agreed_at: now.toISOString() }
        })
        .execute();
    });

    return getAdminOrderById(orderId);
  }

  // Admin: Confirm Order with Atomic Inventory Deduction & Coupon Redemption
  async function confirmAdminOrder(orderId, { adminUserId }) {
    await dataSource.transaction(async (manager) => {
      // 1. Lock and validate order
      const order = await manager
        .getRepository('Order')
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: orderId })
        .getOne();

      if (!order) {
        throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      }

      if (order.status !== 'pending') {
        throw appError(
          409,
          'ORDER_STATUS_INVALID',
          `Order is in "${order.status}" status and cannot be confirmed.`
        );
      }

      // 2. Check 24h expiration
      const now = new Date();
      if (order.expires_at && now > new Date(order.expires_at)) {
        throw appError(
          409,
          'ORDER_EXPIRED',
          'This order has exceeded its 24-hour pending expiry deadline and cannot be confirmed.'
        );
      }

      // 3. Check customer agreement
      if (!order.customer_agreed_at || order.agreed_pricing_version !== order.pricing_version) {
        throw appError(
          409,
          'CUSTOMER_AGREEMENT_REQUIRED',
          'Customer agreement is required for the current pricing version before confirming.'
        );
      }

      // 4. Check final total has been set
      if (order.final_total === null || order.shipping_fee === null) {
        throw appError(
          409,
          'FINAL_TOTAL_NOT_SET',
          'Final total and shipping fee must be recorded before confirmation.'
        );
      }

      // 5. Fetch order items and lock variant rows
      const items = await manager.getRepository('OrderItem').find({
        where: { order_id: orderId }
      });

      if (!items || items.length === 0) {
        throw appError(409, 'ORDER_EMPTY', 'Order contains no items.');
      }

      const variantIds = items.map((i) => i.variant_id).filter(Boolean);
      const variants = await manager
        .getRepository('ProductVariant')
        .createQueryBuilder('pv')
        .setLock('pessimistic_write')
        .where('pv.id IN (:...variantIds)', { variantIds })
        .getMany();

      const variantMap = new Map(variants.map((v) => [v.id, v]));

      // Check current stock for every line
      for (const item of items) {
        const variant = variantMap.get(item.variant_id);
        if (!variant) {
          throw appError(
            409,
            'INSUFFICIENT_STOCK',
            `Variant for "${item.product_name_snapshot}" no longer exists.`
          );
        }

        if (variant.stock_quantity < item.quantity) {
          throw appError(
            409,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for SKU ${item.sku_snapshot} (${item.product_name_snapshot}). Requested: ${item.quantity}, Available: ${variant.stock_quantity}.`
          );
        }
      }

      // 6. If coupon was applied, validate limits and record redemption
      if (order.coupon_id) {
        const coupon = await manager
          .getRepository('Coupon')
          .createQueryBuilder('c')
          .setLock('pessimistic_write')
          .where('c.id = :id', { id: order.coupon_id })
          .getOne();

        if (coupon) {
          if (!coupon.is_active || now > new Date(coupon.ends_at)) {
            throw appError(
              409,
              'COUPON_INVALID',
              'Coupon attached to this order is no longer valid.'
            );
          }

          // Check global limit
          if (coupon.global_usage_limit !== null && coupon.global_usage_limit !== undefined) {
            const currentGlobalCount = await manager
              .getRepository('CouponRedemption')
              .createQueryBuilder('cr')
              .where('cr.coupon_id = :couponId AND cr.reversed_at IS NULL', {
                couponId: coupon.id
              })
              .getCount();

            if (currentGlobalCount >= coupon.global_usage_limit) {
              throw appError(
                409,
                'COUPON_LIMIT_REACHED',
                'Coupon global usage limit has been exceeded.'
              );
            }
          }

          // Check customer limit
          if (coupon.per_customer_limit !== null && coupon.per_customer_limit !== undefined) {
            const currentCustomerCount = await manager
              .getRepository('CouponRedemption')
              .createQueryBuilder('cr')
              .where(
                'cr.coupon_id = :couponId AND cr.user_id = :userId AND cr.reversed_at IS NULL',
                { couponId: coupon.id, userId: order.user_id }
              )
              .getCount();

            if (currentCustomerCount >= coupon.per_customer_limit) {
              throw appError(
                409,
                'COUPON_LIMIT_REACHED',
                'Customer has exceeded the per-customer usage limit for this coupon.'
              );
            }
          }

          // Insert redemption record
          await manager
            .createQueryBuilder()
            .insert()
            .into('CouponRedemption')
            .values({
              coupon_id: coupon.id,
              user_id: order.user_id,
              order_id: order.id,
              discount_amount: order.discount_amount,
              redeemed_at: now
            })
            .execute();
        }
      }

      // 7. Atomically deduct stock for each order line
      for (const item of items) {
        await manager
          .createQueryBuilder()
          .update('ProductVariant')
          .set({
            stock_quantity: () => `stock_quantity - ${item.quantity}`,
            updated_at: now
          })
          .where('id = :id', { id: item.variant_id })
          .execute();
      }

      // 8. Update Order status to confirmed
      await manager
        .createQueryBuilder()
        .update('Order')
        .set({
          status: 'confirmed',
          confirmed_at: now,
          stock_deducted_at: now,
          updated_at: now
        })
        .where('id = :id', { id: orderId })
        .execute();

      // 9. Append Order Event audit entry
      await manager
        .createQueryBuilder()
        .insert()
        .into('OrderEvent')
        .values({
          order_id: orderId,
          event_type: 'confirmed',
          actor_user_id: adminUserId,
          previous_status: 'pending',
          new_status: 'confirmed',
          notes:
            'Order confirmed by administrator. Inventory deducted and coupon redeemed atomically.'
        })
        .execute();
    });

    return getAdminOrderById(orderId);
  }

  // Admin: Transition Status (Processing, Delivered, or Cancelled)
  async function transitionAdminOrderStatus(orderId, { newStatus, adminUserId, reason }) {
    await dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository('Order')
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: orderId })
        .getOne();

      if (!order) {
        throw appError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      }

      // Permitted transitions
      const validTransitions = {
        pending: ['cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['delivered', 'cancelled'],
        delivered: [],
        cancelled: [],
        expired: []
      };

      const allowedNext = validTransitions[order.status] || [];
      if (!allowedNext.includes(newStatus)) {
        throw appError(
          409,
          'INVALID_STATUS_TRANSITION',
          `Cannot transition order from "${order.status}" to "${newStatus}".`
        );
      }

      const now = new Date();

      // Handle cancellation logic (stock restoration & coupon release)
      if (newStatus === 'cancelled') {
        let cancelEventId = null;

        // Insert cancellation event first so its ID can reference the coupon redemption reversal
        const insertEventRes = await manager
          .createQueryBuilder()
          .insert()
          .into('OrderEvent')
          .values({
            order_id: orderId,
            event_type: 'cancelled',
            actor_user_id: adminUserId,
            previous_status: order.status,
            new_status: 'cancelled',
            notes: reason ? `Order cancelled: ${reason}` : 'Order cancelled by administrator.'
          })
          .returning('*')
          .execute();

        const eventRows = extractRows(insertEventRes.raw || insertEventRes.generatedMaps);
        cancelEventId = eventRows[0] ? eventRows[0].id : null;

        // If stock was previously deducted, restore stock exactly once
        if (order.stock_deducted_at && !order.stock_restored_at) {
          const items = await manager.getRepository('OrderItem').find({
            where: { order_id: orderId }
          });

          for (const item of items) {
            if (item.variant_id) {
              await manager
                .createQueryBuilder()
                .update('ProductVariant')
                .set({
                  stock_quantity: () => `stock_quantity + ${item.quantity}`,
                  updated_at: now
                })
                .where('id = :id', { id: item.variant_id })
                .execute();
            }
          }

          // Mark coupon redemption as reversed
          await manager
            .createQueryBuilder()
            .update('CouponRedemption')
            .set({
              reversed_at: now,
              reversed_by_order_event_id: cancelEventId
            })
            .where('order_id = :orderId AND reversed_at IS NULL', { orderId })
            .execute();

          await manager
            .createQueryBuilder()
            .update('Order')
            .set({
              status: 'cancelled',
              cancelled_at: now,
              stock_restored_at: now,
              updated_at: now
            })
            .where('id = :id', { id: orderId })
            .execute();
        } else {
          // Stock was never deducted (e.g. pending order cancelled)
          await manager
            .createQueryBuilder()
            .update('Order')
            .set({
              status: 'cancelled',
              cancelled_at: now,
              updated_at: now
            })
            .where('id = :id', { id: orderId })
            .execute();
        }
      } else {
        // Processing or Delivered status transition
        await manager
          .createQueryBuilder()
          .update('Order')
          .set({
            status: newStatus,
            updated_at: now
          })
          .where('id = :id', { id: orderId })
          .execute();

        await manager
          .createQueryBuilder()
          .insert()
          .into('OrderEvent')
          .values({
            order_id: orderId,
            event_type: 'status_changed',
            actor_user_id: adminUserId,
            previous_status: order.status,
            new_status: newStatus,
            notes: reason
              ? `Status changed to ${newStatus}: ${reason}`
              : `Status changed to ${newStatus}.`
          })
          .execute();
      }
    });

    return getAdminOrderById(orderId);
  }

  // Reconciliation Job: Expire Pending Orders 24h after final total sent
  async function reconcileExpiredOrders() {
    const now = new Date();
    const expiredOrders = [];

    await dataSource.transaction(async (manager) => {
      const eligibleOrders = await manager
        .getRepository('Order')
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.status = :status AND o.expires_at IS NOT NULL AND o.expires_at < :now', {
          status: 'pending',
          now
        })
        .getMany();

      for (const order of eligibleOrders) {
        await manager
          .createQueryBuilder()
          .update('Order')
          .set({
            status: 'expired',
            expired_at: now,
            updated_at: now
          })
          .where('id = :id', { id: order.id })
          .execute();

        await manager
          .createQueryBuilder()
          .insert()
          .into('OrderEvent')
          .values({
            order_id: order.id,
            event_type: 'expired',
            actor_user_id: null,
            previous_status: 'pending',
            new_status: 'expired',
            notes:
              'Pending order automatically expired after exceeding 24-hour final total confirmation deadline.'
          })
          .execute();

        expiredOrders.push(order.order_number);
      }
    });

    return {
      expiredCount: expiredOrders.length,
      expiredOrderNumbers: expiredOrders
    };
  }

  // Admin Coupon Management
  async function createCoupon(data) {
    const normalizedCode = data.code.trim().toUpperCase();

    const existing = await couponRepo
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.code)) = :code', { code: normalizedCode.toLowerCase() })
      .getOne();

    if (existing) {
      throw appError(409, 'COUPON_CODE_EXISTS', 'A coupon with this code already exists.');
    }

    const couponToCreate = {
      code: normalizedCode,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value).toFixed(2),
      minimum_subtotal:
        data.minimum_subtotal !== undefined && data.minimum_subtotal !== null
          ? Number(data.minimum_subtotal).toFixed(2)
          : null,
      starts_at: data.starts_at ? new Date(data.starts_at) : null,
      ends_at: new Date(data.ends_at),
      global_usage_limit: data.global_usage_limit || null,
      per_customer_limit: data.per_customer_limit || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    };

    const insertRes = await couponRepo
      .createQueryBuilder()
      .insert()
      .into('Coupon')
      .values(couponToCreate)
      .returning('*')
      .execute();

    const rows = extractRows(insertRes.raw || insertRes.generatedMaps);
    return rows[0];
  }

  async function listCoupons({ page = 1, pageSize = 50 }) {
    const take = Math.min(100, Math.max(1, pageSize));
    const skip = (Math.max(1, page) - 1) * take;

    const [coupons, total] = await couponRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip,
      take
    });

    // Attach active redemption counts
    const enriched = await Promise.all(
      coupons.map(async (c) => {
        const redemptionCount = await couponRedemptionRepo
          .createQueryBuilder('cr')
          .where('cr.coupon_id = :couponId AND cr.reversed_at IS NULL', { couponId: c.id })
          .getCount();
        return {
          ...c,
          active_redemptions_count: redemptionCount
        };
      })
    );

    return {
      coupons: enriched,
      pagination: {
        total,
        page: Math.max(1, page),
        pageSize: take,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  async function getCoupon(id) {
    const coupon = await couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw appError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
    }
    const redemptionCount = await couponRedemptionRepo
      .createQueryBuilder('cr')
      .where('cr.coupon_id = :couponId AND cr.reversed_at IS NULL', { couponId: id })
      .getCount();

    return {
      ...coupon,
      active_redemptions_count: redemptionCount
    };
  }

  async function updateCoupon(id, data) {
    const coupon = await couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw appError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
    }

    const updates = { updated_at: new Date() };

    if (data.code) {
      const normalizedCode = data.code.trim().toUpperCase();
      const existing = await couponRepo
        .createQueryBuilder('c')
        .where('LOWER(TRIM(c.code)) = :code AND c.id != :id', {
          code: normalizedCode.toLowerCase(),
          id
        })
        .getOne();
      if (existing) {
        throw appError(409, 'COUPON_CODE_EXISTS', 'A coupon with this code already exists.');
      }
      updates.code = normalizedCode;
    }

    if (data.discount_type) updates.discount_type = data.discount_type;
    if (data.discount_value !== undefined) {
      updates.discount_value = Number(data.discount_value).toFixed(2);
    }
    if (data.minimum_subtotal !== undefined) {
      updates.minimum_subtotal =
        data.minimum_subtotal === null ? null : Number(data.minimum_subtotal).toFixed(2);
    }
    if (data.starts_at !== undefined) {
      updates.starts_at = data.starts_at ? new Date(data.starts_at) : null;
    }
    if (data.ends_at !== undefined) updates.ends_at = new Date(data.ends_at);
    if (data.global_usage_limit !== undefined) {
      updates.global_usage_limit = data.global_usage_limit;
    }
    if (data.per_customer_limit !== undefined) {
      updates.per_customer_limit = data.per_customer_limit;
    }
    if (data.is_active !== undefined) updates.is_active = Boolean(data.is_active);

    const updateRes = await couponRepo
      .createQueryBuilder()
      .update('Coupon')
      .set(updates)
      .where('id = :id', { id })
      .returning('*')
      .execute();

    const rows = extractRows(updateRes.raw || updateRes.generatedMaps);
    return rows[0];
  }

  async function deleteCoupon(id) {
    const coupon = await couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw appError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
    }

    const redemptionsCount = await couponRedemptionRepo
      .createQueryBuilder('cr')
      .where('cr.coupon_id = :id', { id })
      .getCount();

    const ordersCount = await orderRepo
      .createQueryBuilder('o')
      .where('o.coupon_id = :id', { id })
      .getCount();

    if (redemptionsCount > 0 || ordersCount > 0) {
      throw appError(
        409,
        'COUPON_IN_USE',
        'Cannot delete coupon because it has been used in existing orders. Consider deactivating it instead.'
      );
    }

    await couponRepo.delete({ id });
    return { success: true, message: 'Coupon deleted successfully.' };
  }

  // Admin WhatsApp Setting
  async function getWhatsappSetting() {
    let setting = await storeSettingRepo.findOne({ where: { id: 1 } });
    if (!setting) {
      setting = await storeSettingRepo.save({
        id: 1,
        whatsapp_number: config.WHATSAPP_NUMBER || '+201000000000',
        updated_at: new Date()
      });
    }
    return setting;
  }

  async function updateWhatsappSetting(whatsappNumber) {
    const cleanNumber = whatsappNumber.trim();
    let setting = await storeSettingRepo.findOne({ where: { id: 1 } });

    if (!setting) {
      setting = await storeSettingRepo.save({
        id: 1,
        whatsapp_number: cleanNumber,
        updated_at: new Date()
      });
    } else {
      await storeSettingRepo
        .createQueryBuilder()
        .update('StoreSetting')
        .set({
          whatsapp_number: cleanNumber,
          updated_at: new Date()
        })
        .where('id = :id', { id: 1 })
        .execute();
      setting.whatsapp_number = cleanNumber;
      setting.updated_at = new Date();
    }

    return setting;
  }

  // Admin: Dashboard Metrics & Summary
  async function getAdminDashboardSummary() {
    const now = new Date();

    // 1. Order Status Metrics (single aggregated query)
    const orderMetricsRaw = await dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'pending' AND final_total_sent_at IS NULL)::int AS awaiting_final_total,
        COUNT(*) FILTER (WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at > NOW() AND expires_at <= NOW() + INTERVAL '24 hours')::int AS approaching_expiry,
        COUNT(*) FILTER (WHERE status = 'expired' OR (status = 'pending' AND expires_at IS NOT NULL AND expires_at <= NOW()))::int AS expired_orders,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_orders,
        COUNT(*) FILTER (WHERE status = 'processing')::int AS processing_orders,
        COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders,
        COUNT(*)::int AS total_orders
      FROM orders
    `);

    const orderMetrics = orderMetricsRaw[0] || {
      pending_orders: 0,
      awaiting_final_total: 0,
      approaching_expiry: 0,
      expired_orders: 0,
      confirmed_orders: 0,
      processing_orders: 0,
      delivered_orders: 0,
      cancelled_orders: 0,
      total_orders: 0
    };

    // 2. Urgent / Action-Required Pending Orders (up to 8)
    const urgentOrdersRaw = await dataSource.query(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.created_at,
        o.subtotal::text AS subtotal,
        o.final_total::text AS final_total,
        o.shipping_fee::text AS shipping_fee,
        o.final_total_sent_at,
        o.customer_agreed_at,
        o.expires_at,
        a.recipient_name,
        a.mobile,
        a.governorate,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      LEFT JOIN order_addresses a ON o.id = a.order_id
      WHERE o.status = 'pending'
      ORDER BY 
        CASE WHEN o.final_total_sent_at IS NULL THEN 0 ELSE 1 END,
        o.created_at ASC
      LIMIT 8
    `);

    const urgentOrders = urgentOrdersRaw.map((ord) => {
      let hoursLeft = null;
      let isExpired = false;
      if (ord.expires_at) {
        const diffMs = new Date(ord.expires_at).getTime() - now.getTime();
        hoursLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
        isExpired = diffMs <= 0;
      }
      return {
        ...ord,
        needs_final_total: !ord.final_total_sent_at,
        hours_left: hoursLeft,
        is_expired: isExpired
      };
    });

    // 3. Inventory & Low Stock Metrics
    const inventoryMetricsRaw = await dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE pv.is_active = true AND p.is_published = true AND pv.stock_quantity <= pv.low_stock_threshold)::int AS low_stock_variants,
        COUNT(*) FILTER (WHERE pv.is_active = true AND p.is_published = true AND pv.stock_quantity = 0)::int AS out_of_stock_variants,
        COUNT(*) FILTER (WHERE pv.is_active = true AND p.is_published = true)::int AS total_active_variants,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_published = true)::int AS total_published_products
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
    `);

    const inventoryMetrics = inventoryMetricsRaw[0] || {
      low_stock_variants: 0,
      out_of_stock_variants: 0,
      total_active_variants: 0,
      total_published_products: 0
    };

    // 4. Low-stock variants list (up to 10)
    const lowStockAlerts = await dataSource.query(`
      SELECT 
        pv.id AS variant_id,
        pv.sku,
        pv.variant_label,
        pv.stock_quantity,
        pv.low_stock_threshold,
        pv.price::text AS price,
        p.id AS product_id,
        p.name AS product_name,
        p.name AS product_title,
        p.slug AS product_slug,
        p.condition,
        c.name AS category_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE pv.is_active = true 
        AND p.is_published = true
        AND pv.stock_quantity <= pv.low_stock_threshold
      ORDER BY pv.stock_quantity ASC, pv.updated_at DESC
      LIMIT 10
    `);

    // 5. Store Counters
    const categoriesCountRaw = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM categories WHERE is_active = true`
    );
    const couponsCountRaw = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM coupons WHERE is_active = true`
    );

    return {
      metrics: {
        pendingOrders: orderMetrics.pending_orders,
        awaitingFinalTotal: orderMetrics.awaiting_final_total,
        approachingExpiry: orderMetrics.approaching_expiry,
        expiredOrders: orderMetrics.expired_orders,
        confirmedOrders: orderMetrics.confirmed_orders,
        processingOrders: orderMetrics.processing_orders,
        deliveredOrders: orderMetrics.delivered_orders,
        cancelledOrders: orderMetrics.cancelled_orders,
        totalOrders: orderMetrics.total_orders,
        lowStockVariants: inventoryMetrics.low_stock_variants,
        outOfStockVariants: inventoryMetrics.out_of_stock_variants,
        totalVariants: inventoryMetrics.total_active_variants,
        totalProducts: inventoryMetrics.total_published_products,
        totalCategories: categoriesCountRaw[0]?.count || 0,
        activeCoupons: couponsCountRaw[0]?.count || 0
      },
      urgentOrders,
      lowStockAlerts
    };
  }

  return {
    quoteCoupon,
    checkoutOrder,
    getCustomerOrders,
    getCustomerOrderByNumber,
    customerCancelOrder,
    listAdminOrders,
    getAdminOrderById,
    setAdminFinalTotal,
    recordCustomerAgreement,
    confirmAdminOrder,
    transitionAdminOrderStatus,
    reconcileExpiredOrders,
    getAdminDashboardSummary,
    createCoupon,
    listCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    getWhatsappSetting,
    updateWhatsappSetting,
    buildWhatsappUrl
  };
}

module.exports = { createOrderService };
