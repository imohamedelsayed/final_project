const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');

function createAuthRoutes({ authController }) {
  const router = Router();

  // Public authentication routes
  router.post('/auth/register', authController.register);
  router.post('/auth/verify-email', authController.verifyEmail);
  router.post('/auth/resend-verification', authController.resendVerification);
  router.post('/auth/login', authController.login);
  router.post('/admin/auth/login', authController.adminLogin);

  // Authenticated customer/staff routes
  router.post('/auth/logout', requireAuth, authController.logout);
  router.get('/auth/me', requireAuth, authController.me);

  // Staff TOTP management routes
  router.post(
    '/admin/auth/totp/setup',
    requireAuth,
    requireRole('admin', 'super_admin'),
    authController.setupTotp
  );
  router.post(
    '/admin/auth/totp/verify',
    requireAuth,
    requireRole('admin', 'super_admin'),
    authController.verifyTotpEnrollment
  );
  router.post(
    '/admin/users/:id/reset-totp',
    requireAuth,
    requireRole('super_admin'),
    authController.resetStaffTotp
  );

  // Super Admin Staff Management
  router.get(
    '/admin/users',
    requireAuth,
    requireRole('super_admin'),
    authController.listStaffUsers
  );
  router.post(
    '/admin/users',
    requireAuth,
    requireRole('super_admin'),
    authController.createStaffUser
  );
  router.patch(
    '/admin/users/:id',
    requireAuth,
    requireRole('super_admin'),
    authController.updateStaffUser
  );

  return router;
}

module.exports = { createAuthRoutes };
