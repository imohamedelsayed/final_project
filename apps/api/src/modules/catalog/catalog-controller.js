const { parseMultipartFormData } = require('../media/media-controller');
const {
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  createSpecificationSchema,
  updateSpecificationSchema,
  createImageSchema,
  updateImageSchema,
  createBannerSchema,
  updateBannerSchema,
  createFeaturedProductSchema,
  updateFeaturedProductSchema,
  createInventoryAdjustmentSchema
} = require('./catalog-schemas');

class CatalogController {
  constructor({ catalogService, mediaService, logger }) {
    this.catalogService = catalogService;
    this.mediaService = mediaService;
    this.logger = logger;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  listCategories = async (req, res, next) => {
    try {
      const { page, pageSize, search, is_active, parent_id } = req.query;
      let parsedIsActive;
      if (is_active === 'true') parsedIsActive = true;
      if (is_active === 'false') parsedIsActive = false;

      const result = await this.catalogService.listCategories({
        page,
        pageSize,
        search,
        is_active: parsedIsActive,
        parent_id
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  createCategory = async (req, res, next) => {
    try {
      const parsed = createCategorySchema.parse(req.body);
      const category = await this.catalogService.createCategory(parsed);

      return res.status(201).json({
        data: category,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getCategory = async (req, res, next) => {
    try {
      const category = await this.catalogService.getCategory(req.params.id);
      return res.status(200).json({
        data: category,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateCategory = async (req, res, next) => {
    try {
      const parsed = updateCategorySchema.parse(req.body);
      const category = await this.catalogService.updateCategory(req.params.id, parsed);

      return res.status(200).json({
        data: category,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  deleteCategory = async (req, res, next) => {
    try {
      const result = await this.catalogService.deleteCategory(req.params.id);
      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // BRANDS
  // ==========================================

  listBrands = async (req, res, next) => {
    try {
      const { page, pageSize, search, is_active } = req.query;
      let parsedIsActive;
      if (is_active === 'true') parsedIsActive = true;
      if (is_active === 'false') parsedIsActive = false;

      const result = await this.catalogService.listBrands({
        page,
        pageSize,
        search,
        is_active: parsedIsActive
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  createBrand = async (req, res, next) => {
    try {
      const parsed = createBrandSchema.parse(req.body);
      const brand = await this.catalogService.createBrand(parsed);

      return res.status(201).json({
        data: brand,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getBrand = async (req, res, next) => {
    try {
      const brand = await this.catalogService.getBrand(req.params.id);
      return res.status(200).json({
        data: brand,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateBrand = async (req, res, next) => {
    try {
      const parsed = updateBrandSchema.parse(req.body);
      const brand = await this.catalogService.updateBrand(req.params.id, parsed);

      return res.status(200).json({
        data: brand,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  deleteBrand = async (req, res, next) => {
    try {
      const result = await this.catalogService.deleteBrand(req.params.id);
      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // PRODUCTS
  // ==========================================

  listProducts = async (req, res, next) => {
    try {
      const { page, pageSize, search, category_id, brand_id, condition, is_published, sort } =
        req.query;

      let parsedPublished;
      if (is_published === 'true') parsedPublished = true;
      if (is_published === 'false') parsedPublished = false;

      const result = await this.catalogService.listProducts({
        page,
        pageSize,
        search,
        category_id,
        brand_id,
        condition,
        is_published: parsedPublished,
        sort
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  createProduct = async (req, res, next) => {
    try {
      const parsed = createProductSchema.parse(req.body);
      const product = await this.catalogService.createProduct(parsed, req.user.id);

      return res.status(201).json({
        data: product,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getProduct = async (req, res, next) => {
    try {
      const product = await this.catalogService.getProduct(req.params.id);
      return res.status(200).json({
        data: product,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateProduct = async (req, res, next) => {
    try {
      const parsed = updateProductSchema.parse(req.body);
      const product = await this.catalogService.updateProduct(req.params.id, parsed);

      return res.status(200).json({
        data: product,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // PRODUCT VARIANTS
  // ==========================================

  listVariants = async (req, res, next) => {
    try {
      const variants = await this.catalogService.listVariants(req.params.productId);
      return res.status(200).json({
        data: variants,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  createVariant = async (req, res, next) => {
    try {
      const parsed = createVariantSchema.parse(req.body);
      const variant = await this.catalogService.createVariant(
        req.params.productId,
        parsed,
        req.user.id
      );

      return res.status(201).json({
        data: variant,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateVariant = async (req, res, next) => {
    try {
      const parsed = updateVariantSchema.parse(req.body);
      const variant = await this.catalogService.updateVariant(
        req.params.productId,
        req.params.variantId,
        parsed
      );

      return res.status(200).json({
        data: variant,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  deleteVariant = async (req, res, next) => {
    try {
      const result = await this.catalogService.deleteVariant(
        req.params.productId,
        req.params.variantId
      );

      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // PRODUCT SPECIFICATIONS
  // ==========================================

  listSpecifications = async (req, res, next) => {
    try {
      const specs = await this.catalogService.listSpecifications(req.params.productId);
      return res.status(200).json({
        data: specs,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  addSpecification = async (req, res, next) => {
    try {
      const parsed = createSpecificationSchema.parse(req.body);
      const spec = await this.catalogService.addSpecification(req.params.productId, parsed);

      return res.status(201).json({
        data: spec,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateSpecification = async (req, res, next) => {
    try {
      const parsed = updateSpecificationSchema.parse(req.body);
      const spec = await this.catalogService.updateSpecification(
        req.params.productId,
        req.params.specId,
        parsed
      );

      return res.status(200).json({
        data: spec,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  deleteSpecification = async (req, res, next) => {
    try {
      const result = await this.catalogService.deleteSpecification(
        req.params.productId,
        req.params.specId
      );

      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // PRODUCT IMAGES
  // ==========================================

  listImages = async (req, res, next) => {
    try {
      const images = await this.catalogService.listImages(req.params.productId);
      return res.status(200).json({
        data: images,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  addImage = async (req, res, next) => {
    try {
      const contentType = req.headers['content-type'] || '';
      let imagePath;
      let altText;
      let isPrimary = false;
      let sortOrder = 0;

      if (contentType.includes('multipart/form-data')) {
        const { fields, file } = await parseMultipartFormData(req);
        if (!file) {
          throw new Error('Image file is required in multipart upload.');
        }

        const saved = await this.mediaService.saveImage({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          subDir: 'products'
        });

        imagePath = saved.imagePath;
        altText = fields.alt_text;
        isPrimary = fields.is_primary === 'true' || fields.is_primary === true;
        sortOrder = parseInt(fields.sort_order, 10) || 0;
      } else {
        const parsed = createImageSchema.parse(req.body);
        imagePath = parsed.image_path;
        altText = parsed.alt_text;
        isPrimary = parsed.is_primary || false;
        sortOrder = parsed.sort_order || 0;
      }

      const image = await this.catalogService.addImage(req.params.productId, {
        image_path: imagePath,
        alt_text: altText,
        is_primary: isPrimary,
        sort_order: sortOrder
      });

      return res.status(201).json({
        data: image,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateImage = async (req, res, next) => {
    try {
      const parsed = updateImageSchema.parse(req.body);
      const image = await this.catalogService.updateImage(
        req.params.productId,
        req.params.imageId,
        parsed
      );

      return res.status(200).json({
        data: image,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  deleteImage = async (req, res, next) => {
    try {
      const result = await this.catalogService.deleteImage(
        req.params.productId,
        req.params.imageId
      );

      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // BANNERS
  // ==========================================

  listBanners = async (req, res, next) => {
    try {
      const { page, pageSize, is_published } = req.query;
      let parsedPublished;
      if (is_published === 'true') parsedPublished = true;
      if (is_published === 'false') parsedPublished = false;

      const result = await this.catalogService.listBanners({
        page,
        pageSize,
        is_published: parsedPublished
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  createBanner = async (req, res, next) => {
    try {
      const contentType = req.headers['content-type'] || '';
      let imagePath;
      let linkUrl;
      let isPublished = false;
      let sortOrder = 0;

      if (contentType.includes('multipart/form-data')) {
        const { fields, file } = await parseMultipartFormData(req);
        if (!file) {
          throw new Error('Banner image file is required.');
        }

        const saved = await this.mediaService.saveImage({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          subDir: 'banners'
        });

        imagePath = saved.imagePath;
        linkUrl = fields.link_url;
        isPublished = fields.is_published === 'true' || fields.is_published === true;
        sortOrder = parseInt(fields.sort_order, 10) || 0;
      } else {
        const parsed = createBannerSchema.parse(req.body);
        imagePath = parsed.image_path;
        linkUrl = parsed.link_url;
        isPublished = parsed.is_published || false;
        sortOrder = parsed.sort_order || 0;
      }

      const banner = await this.catalogService.createBanner({
        image_path: imagePath,
        link_url: linkUrl,
        is_published: isPublished,
        sort_order: sortOrder
      });

      return res.status(201).json({
        data: banner,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateBanner = async (req, res, next) => {
    try {
      const parsed = updateBannerSchema.parse(req.body);
      const banner = await this.catalogService.updateBanner(req.params.id, parsed);

      return res.status(200).json({
        data: banner,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  deleteBanner = async (req, res, next) => {
    try {
      const result = await this.catalogService.deleteBanner(req.params.id);
      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // FEATURED PRODUCTS
  // ==========================================

  listFeaturedProducts = async (req, res, next) => {
    try {
      const items = await this.catalogService.listFeaturedProducts();
      return res.status(200).json({
        data: items,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  addFeaturedProduct = async (req, res, next) => {
    try {
      const parsed = createFeaturedProductSchema.parse(req.body);
      const featured = await this.catalogService.addFeaturedProduct(parsed);

      return res.status(201).json({
        data: featured,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  updateFeaturedProduct = async (req, res, next) => {
    try {
      const parsed = updateFeaturedProductSchema.parse(req.body);
      const featured = await this.catalogService.updateFeaturedProduct(
        req.params.productId,
        parsed
      );

      return res.status(200).json({
        data: featured,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  removeFeaturedProduct = async (req, res, next) => {
    try {
      const result = await this.catalogService.removeFeaturedProduct(req.params.productId);
      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // INVENTORY ADJUSTMENTS
  // ==========================================

  adjustInventory = async (req, res, next) => {
    try {
      const parsed = createInventoryAdjustmentSchema.parse(req.body);
      const result = await this.catalogService.adjustInventory({
        variantId: parsed.variantId,
        quantityDelta: parsed.quantityDelta,
        reason: parsed.reason,
        adminUserId: req.user.id
      });

      return res.status(200).json({
        data: result,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  listInventoryAdjustments = async (req, res, next) => {
    try {
      const { variant_id, page, pageSize } = req.query;
      const result = await this.catalogService.listInventoryAdjustments({
        variant_id,
        page,
        pageSize
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  listInventoryItems = async (req, res, next) => {
    try {
      const { search, status, condition, page, pageSize } = req.query;
      const result = await this.catalogService.listInventoryItems({
        search,
        status,
        condition,
        page,
        pageSize
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  // ==========================================
  // PUBLIC STOREFRONT HANDLERS
  // ==========================================

  getPublicBanners = async (req, res, next) => {
    try {
      const banners = await this.catalogService.getPublicBanners();
      return res.status(200).json({
        data: banners,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getPublicFeaturedProducts = async (req, res, next) => {
    try {
      const products = await this.catalogService.getPublicFeaturedProducts();
      return res.status(200).json({
        data: products,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getPublicCategories = async (req, res, next) => {
    try {
      const categories = await this.catalogService.getPublicCategories();
      return res.status(200).json({
        data: categories,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getPublicBrands = async (req, res, next) => {
    try {
      const brands = await this.catalogService.getPublicBrands();
      return res.status(200).json({
        data: brands,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getPublicProducts = async (req, res, next) => {
    try {
      const {
        page,
        pageSize,
        q,
        category,
        brand,
        condition,
        minPrice,
        maxPrice,
        availability,
        sort
      } = req.query;

      const result = await this.catalogService.getPublicProducts({
        page,
        pageSize,
        q,
        category,
        brand,
        condition,
        minPrice,
        maxPrice,
        availability,
        sort
      });

      return res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  getPublicProductBySlug = async (req, res, next) => {
    try {
      const product = await this.catalogService.getPublicProductBySlug(req.params.slug);
      return res.status(200).json({
        data: product,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };
}

function createCatalogController({ catalogService, mediaService, logger }) {
  return new CatalogController({ catalogService, mediaService, logger });
}

module.exports = {
  CatalogController,
  createCatalogController
};
