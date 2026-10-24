const { addItemSchema, updateItemSchema } = require('./cart-schemas');

class CartController {
  constructor({ cartService, logger }) {
    this.cartService = cartService;
    this.logger = logger;
  }

  getCart = async (req, res, next) => {
    try {
      const cart = await this.cartService.getCart(req.user.id);
      return res.status(200).json({
        data: cart,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  addItem = async (req, res, next) => {
    try {
      const parsed = addItemSchema.parse(req.body);
      const cart = await this.cartService.addItem(req.user.id, {
        variantId: parsed.variantId,
        quantity: parsed.quantity
      });

      return res.status(200).json({
        data: cart,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateItem = async (req, res, next) => {
    try {
      const parsed = updateItemSchema.parse(req.body);
      const cart = await this.cartService.updateItem(req.user.id, req.params.itemId, {
        quantity: parsed.quantity
      });

      return res.status(200).json({
        data: cart,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  removeItem = async (req, res, next) => {
    try {
      const cart = await this.cartService.removeItem(req.user.id, req.params.itemId);
      return res.status(200).json({
        data: cart,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  clearCart = async (req, res, next) => {
    try {
      const cart = await this.cartService.clearCart(req.user.id);
      return res.status(200).json({
        data: cart,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };
}

function createCartController({ cartService, logger }) {
  return new CartController({ cartService, logger });
}

module.exports = {
  CartController,
  createCartController
};
