const {
  checkoutOrderSchema,
  quoteCouponSchema,
  adminCreateCouponSchema,
  adminUpdateCouponSchema,
  setFinalTotalSchema,
  customerAgreementSchema,
  transitionStatusSchema,
  cancelOrderSchema,
  updateWhatsappSettingSchema
} = require('./order-schemas');

function createOrderController({ orderService, config }) {
  if (!orderService) {
    throw new Error('createOrderController requires orderService');
  }

  // POST /api/v1/coupons/quote (verified customer)
  async function quoteCoupon(req, res, next) {
    try {
      const parsed = quoteCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coupon quote request',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const quote = await orderService.quoteCoupon({
        userId: req.user.id,
        code: parsed.data.code
      });

      return res.status(200).json({
        data: quote,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/checkout/orders (verified customer)
  async function checkout(req, res, next) {
    try {
      const idempotencyKey = req.header('Idempotency-Key') || req.headers['idempotency-key'];

      const parsed = checkoutOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid checkout information',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const result = await orderService.checkoutOrder({
        userId: req.user.id,
        idempotencyKey,
        addressData: parsed.data.address,
        couponCode: parsed.data.coupon_code,
        termsAccepted: parsed.data.terms_accepted,
        termsVersion: parsed.data.terms_version
      });

      const statusCode = result.isReplay ? 200 : 201;

      return res.status(statusCode).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/orders (verified customer)
  async function getCustomerOrders(req, res, next) {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;

      const result = await orderService.getCustomerOrders({
        userId: req.user.id,
        page,
        pageSize
      });

      return res.status(200).json({
        data: result.orders,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/orders/:orderNumber (verified customer)
  async function getCustomerOrderByNumber(req, res, next) {
    try {
      const result = await orderService.getCustomerOrderByNumber({
        userId: req.user.id,
        orderNumber: req.params.orderNumber
      });

      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/orders/:orderNumber/cancel (verified customer)
  async function customerCancelOrder(req, res, next) {
    try {
      const parsed = cancelOrderSchema.safeParse(req.body || {});
      const reason = parsed.success ? parsed.data.reason : undefined;

      const result = await orderService.customerCancelOrder({
        userId: req.user.id,
        orderNumber: req.params.orderNumber,
        reason
      });

      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/orders (admin+)
  async function listAdminOrders(req, res, next) {
    try {
      const { status, search, dateFrom, dateTo } = req.query;
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;

      const result = await orderService.listAdminOrders({
        status,
        search,
        dateFrom,
        dateTo,
        page,
        pageSize
      });

      return res.status(200).json({
        data: result.orders,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/orders/:id (admin+)
  async function getAdminOrder(req, res, next) {
    try {
      const order = await orderService.getAdminOrderById(req.params.id);

      return res.status(200).json({
        data: order,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/admin/orders/:id/final-total (admin+)
  async function setAdminFinalTotal(req, res, next) {
    try {
      const parsed = setFinalTotalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid final total / shipping fee input',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const updated = await orderService.setAdminFinalTotal(req.params.id, {
        shippingFee: parsed.data.shipping_fee,
        adminUserId: req.user.id
      });

      return res.status(200).json({
        data: updated,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/admin/orders/:id/customer-agreement (admin+)
  async function recordCustomerAgreement(req, res, next) {
    try {
      const parsed = customerAgreementSchema.safeParse(req.body || {});
      const agreedPricingVersion = parsed.success ? parsed.data.agreed_pricing_version : undefined;

      const updated = await orderService.recordCustomerAgreement(req.params.id, {
        adminUserId: req.user.id,
        agreedPricingVersion
      });

      return res.status(200).json({
        data: updated,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/admin/orders/:id/confirm (admin+)
  async function confirmAdminOrder(req, res, next) {
    try {
      const confirmed = await orderService.confirmAdminOrder(req.params.id, {
        adminUserId: req.user.id
      });

      return res.status(200).json({
        data: confirmed,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/admin/orders/:id/transition (admin+)
  async function transitionAdminOrderStatus(req, res, next) {
    try {
      const parsed = transitionStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status transition input',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const updated = await orderService.transitionAdminOrderStatus(req.params.id, {
        newStatus: parsed.data.new_status,
        adminUserId: req.user.id,
        reason: parsed.data.reason
      });

      return res.status(200).json({
        data: updated,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Admin Coupons: POST /api/v1/admin/coupons
  async function createCoupon(req, res, next) {
    try {
      const parsed = adminCreateCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coupon data',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const coupon = await orderService.createCoupon(parsed.data);

      return res.status(201).json({
        data: coupon,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Admin Coupons: GET /api/v1/admin/coupons
  async function listCoupons(req, res, next) {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 50;

      const result = await orderService.listCoupons({ page, pageSize });

      return res.status(200).json({
        data: result.coupons,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Admin Coupons: GET /api/v1/admin/coupons/:id
  async function getCoupon(req, res, next) {
    try {
      const coupon = await orderService.getCoupon(req.params.id);

      return res.status(200).json({
        data: coupon,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Admin Coupons: PATCH /api/v1/admin/coupons/:id
  async function updateCoupon(req, res, next) {
    try {
      const parsed = adminUpdateCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coupon update data',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const updated = await orderService.updateCoupon(req.params.id, parsed.data);

      return res.status(200).json({
        data: updated,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Admin Coupons: DELETE /api/v1/admin/coupons/:id
  async function deleteCoupon(req, res, next) {
    try {
      const result = await orderService.deleteCoupon(req.params.id);
      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Super Admin WhatsApp: GET /api/v1/admin/settings/whatsapp
  async function getWhatsappSetting(req, res, next) {
    try {
      const setting = await orderService.getWhatsappSetting();

      return res.status(200).json({
        data: setting,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // Super Admin WhatsApp: PATCH /api/v1/admin/settings/whatsapp
  async function updateWhatsappSetting(req, res, next) {
    try {
      const parsed = updateWhatsappSettingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid WhatsApp setting',
            fields: parsed.error.flatten().fieldErrors
          },
          meta: { requestId: req.id }
        });
      }

      const updated = await orderService.updateWhatsappSetting(parsed.data.whatsapp_number);

      return res.status(200).json({
        data: updated,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/jobs/expire-orders (guarded by SCHEDULER_SECRET or super_admin)
  async function triggerExpireOrders(req, res, next) {
    try {
      const authHeader = req.header('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const isSuperAdmin = req.user && req.user.role === 'super_admin';
      const isSchedulerSecretMatch =
        config && config.SCHEDULER_SECRET && token && token === config.SCHEDULER_SECRET;

      if (!isSuperAdmin && !isSchedulerSecretMatch) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Valid Authorization: Bearer <SCHEDULER_SECRET> or super_admin required.'
          },
          meta: { requestId: req.id }
        });
      }

      const result = await orderService.reconcileExpiredOrders();
      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/dashboard/summary (admin+)
  async function getAdminDashboardSummary(req, res, next) {
    try {
      const summary = await orderService.getAdminDashboardSummary();
      return res.status(200).json({
        data: summary,
        meta: { requestId: req.id }
      });
    } catch (err) {
      next(err);
    }
  }

  return {
    quoteCoupon,
    checkout,
    getCustomerOrders,
    getCustomerOrderByNumber,
    customerCancelOrder,
    listAdminOrders,
    getAdminOrder,
    setAdminFinalTotal,
    recordCustomerAgreement,
    confirmAdminOrder,
    transitionAdminOrderStatus,
    getAdminDashboardSummary,
    createCoupon,
    listCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    getWhatsappSetting,
    updateWhatsappSetting,
    triggerExpireOrders
  };
}

module.exports = { createOrderController };
