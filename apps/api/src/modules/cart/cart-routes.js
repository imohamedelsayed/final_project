const express = require('express');
const { requireAuth, requireVerifiedEmail } = require('../../middleware/auth');

function createCartRoutes({ cartController }) {
  const router = express.Router();

  // All cart endpoints require verified authenticated customer
  router.use('/cart', requireAuth, requireVerifiedEmail);

  router.get('/cart', cartController.getCart);
  router.post('/cart/items', cartController.addItem);
  router.patch('/cart/items/:itemId', cartController.updateItem);
  router.delete('/cart/items/:itemId', cartController.removeItem);
  router.delete('/cart/items', cartController.clearCart);

  return router;
}

module.exports = { createCartRoutes };
