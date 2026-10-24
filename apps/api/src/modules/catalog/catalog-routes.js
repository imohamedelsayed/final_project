const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');

function createCatalogRoutes({ catalogController }) {
  const router = express.Router();

  // Public Catalog Endpoints (No auth required)
  router.get('/banners', catalogController.getPublicBanners);
  router.get('/featured-products', catalogController.getPublicFeaturedProducts);
  router.get('/categories', catalogController.getPublicCategories);
  router.get('/brands', catalogController.getPublicBrands);
  router.get('/products', catalogController.getPublicProducts);
  router.get('/products/:slug', catalogController.getPublicProductBySlug);

  // All catalog admin operations require authentication and admin/super_admin role
  router.use('/admin', requireAuth, requireRole('admin', 'super_admin'));

  // Categories
  router.get('/admin/categories', catalogController.listCategories);
  router.post('/admin/categories', catalogController.createCategory);
  router.get('/admin/categories/:id', catalogController.getCategory);
  router.patch('/admin/categories/:id', catalogController.updateCategory);
  router.delete('/admin/categories/:id', catalogController.deleteCategory);

  // Brands
  router.get('/admin/brands', catalogController.listBrands);
  router.post('/admin/brands', catalogController.createBrand);
  router.get('/admin/brands/:id', catalogController.getBrand);
  router.patch('/admin/brands/:id', catalogController.updateBrand);
  router.delete('/admin/brands/:id', catalogController.deleteBrand);

  // Products
  router.get('/admin/products', catalogController.listProducts);
  router.post('/admin/products', catalogController.createProduct);
  router.get('/admin/products/:id', catalogController.getProduct);
  router.patch('/admin/products/:id', catalogController.updateProduct);

  // Product Variants
  router.get('/admin/products/:productId/variants', catalogController.listVariants);
  router.post('/admin/products/:productId/variants', catalogController.createVariant);
  router.patch('/admin/products/:productId/variants/:variantId', catalogController.updateVariant);
  router.delete('/admin/products/:productId/variants/:variantId', catalogController.deleteVariant);

  // Product Specifications
  router.get('/admin/products/:productId/specifications', catalogController.listSpecifications);
  router.post('/admin/products/:productId/specifications', catalogController.addSpecification);
  router.patch(
    '/admin/products/:productId/specifications/:specId',
    catalogController.updateSpecification
  );
  router.delete(
    '/admin/products/:productId/specifications/:specId',
    catalogController.deleteSpecification
  );

  // Product Images
  router.get('/admin/products/:productId/images', catalogController.listImages);
  router.post('/admin/products/:productId/images', catalogController.addImage);
  router.patch('/admin/products/:productId/images/:imageId', catalogController.updateImage);
  router.delete('/admin/products/:productId/images/:imageId', catalogController.deleteImage);

  // Banners
  router.get('/admin/banners', catalogController.listBanners);
  router.post('/admin/banners', catalogController.createBanner);
  router.patch('/admin/banners/:id', catalogController.updateBanner);
  router.delete('/admin/banners/:id', catalogController.deleteBanner);

  // Featured Products
  router.get('/admin/featured-products', catalogController.listFeaturedProducts);
  router.post('/admin/featured-products', catalogController.addFeaturedProduct);
  router.patch('/admin/featured-products/:productId', catalogController.updateFeaturedProduct);
  router.delete('/admin/featured-products/:productId', catalogController.removeFeaturedProduct);

  // Inventory & Stock
  router.get('/admin/inventory/items', catalogController.listInventoryItems);
  router.post('/admin/inventory/adjustments', catalogController.adjustInventory);
  router.get('/admin/inventory/adjustments', catalogController.listInventoryAdjustments);

  return router;
}

module.exports = { createCatalogRoutes };
