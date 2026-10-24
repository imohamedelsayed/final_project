const express = require('express');
const { requireAuth, requireVerifiedEmail, requireRole } = require('../../middleware/auth');

function createOrderRoutes({ orderController }) {
  const router = express.Router();

  // Customer routes (require verified authenticated customer)
  router.post('/coupons/quote', requireAuth, requireVerifiedEmail, orderController.quoteCoupon);
  router.post('/checkout/orders', requireAuth, requireVerifiedEmail, orderController.checkout);
  router.get('/orders', requireAuth, requireVerifiedEmail, orderController.getCustomerOrders);
  router.get(
    '/orders/:orderNumber',
    requireAuth,
    requireVerifiedEmail,
    orderController.getCustomerOrderByNumber
  );
  router.post(
    '/orders/:orderNumber/cancel',
    requireAuth,
    requireVerifiedEmail,
    orderController.customerCancelOrder
  );

  // Admin order & coupon routes (require admin or super_admin)
  router.get(
    '/admin/dashboard/summary',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.getAdminDashboardSummary
  );
  router.get(
    '/admin/orders',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.listAdminOrders
  );
  router.get(
    '/admin/orders/:id',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.getAdminOrder
  );
  router.patch(
    '/admin/orders/:id/final-total',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.setAdminFinalTotal
  );
  router.post(
    '/admin/orders/:id/customer-agreement',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.recordCustomerAgreement
  );
  router.post(
    '/admin/orders/:id/confirm',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.confirmAdminOrder
  );
  router.post(
    '/admin/orders/:id/transition',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.transitionAdminOrderStatus
  );

  router.get(
    '/admin/coupons',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.listCoupons
  );
  router.post(
    '/admin/coupons',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.createCoupon
  );
  router.get(
    '/admin/coupons/:id',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.getCoupon
  );
  router.patch(
    '/admin/coupons/:id',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.updateCoupon
  );
  router.delete(
    '/admin/coupons/:id',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.deleteCoupon
  );

  // Store Settings (WhatsApp setting)
  router.get(
    '/admin/settings/whatsapp',
    requireAuth,
    requireRole('admin', 'super_admin'),
    orderController.getWhatsappSetting
  );
  router.patch(
    '/admin/settings/whatsapp',
    requireAuth,
    requireRole('super_admin'),
    orderController.updateWhatsappSetting
  );

  // Expiration Reconciliation Job (HTTP endpoint for free web-cron schedulers)
  router.post('/jobs/expire-orders', orderController.triggerExpireOrders);

  return router;
}

module.exports = { createOrderRoutes };
