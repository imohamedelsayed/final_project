const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');

function createMediaRoutes({ mediaController }) {
  const router = express.Router();

  // Public safe media serving
  router.get('/media/:filename', mediaController.serveImage);
  router.get('/media/:subDir/:filename', mediaController.serveImage);

  // Protected admin media upload
  router.post(
    '/admin/media/upload',
    requireAuth,
    requireRole('admin', 'super_admin'),
    mediaController.uploadStandalone
  );

  return router;
}

module.exports = { createMediaRoutes };
