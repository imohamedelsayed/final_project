'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState(''); // '' | 'new' | 'used'
  const [publishedFilter, setPublishedFilter] = useState(''); // '' | 'true' | 'false'
  const [sortOrder, setSortOrder] = useState('created_at_desc');

  // Accessible filter element IDs
  const searchInputId = useId();
  const categoryFilterId = useId();
  const brandFilterId = useId();
  const conditionFilterId = useId();
  const publishedFilterId = useId();
  const sortFilterId = useId();

  // Create Product Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    description: '',
    category_id: '',
    brand_id: '',
    condition: 'new',
    duration_of_use: '',
    is_published: false,
    // Default variant
    sku: '',
    variant_label: 'Standard',
    price: '',
    stock_quantity: '0',
    low_stock_threshold: '5',
    // Specifications list
    specifications: []
  });

  // Edit / Manage Product Modal
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [manageTab, setManageTab] = useState('details'); // 'details' | 'variants' | 'specifications' | 'images'
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState(null);
  const [manageSubmitting, setManageSubmitting] = useState(false);

  // Edit core form
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    category_id: '',
    brand_id: '',
    condition: 'new',
    is_published: false
  });

  // Variant Add/Edit Sub-Modal
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({
    sku: '',
    variant_label: '',
    price: '',
    low_stock_threshold: '5',
    stock_quantity: '0',
    is_default: false,
    is_active: true,
    duration_of_use: ''
  });

  // Spec Add State
  const [newSpec, setNewSpec] = useState({ spec_name: '', spec_value: '', sort_order: '0' });

  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imageAlt, setImageAlt] = useState('');
  const [imageIsPrimary, setImageIsPrimary] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Fetch Categories & Brands once for dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          api.getAdminCategories({ pageSize: 100 }),
          api.getAdminBrands({ pageSize: 100 })
        ]);
        setCategories(catsRes.items || []);
        setBrands(brandsRes.items || []);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch Products List
  useEffect(() => {
    let ignore = false;
    async function loadProducts() {
      try {
        const params = {
          page,
          pageSize: 20,
          sort: sortOrder
        };
        if (search.trim()) params.search = search.trim();
        if (categoryFilter) params.category_id = categoryFilter;
        if (brandFilter) params.brand_id = brandFilter;
        if (conditionFilter) params.condition = conditionFilter;
        if (publishedFilter) params.is_published = publishedFilter;

        const res = await api.getAdminProducts(params);
        if (!ignore) {
          setProducts(res.items || []);
          setPagination(res.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load products list.');
          setLoading(false);
        }
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, [
    page,
    search,
    categoryFilter,
    brandFilter,
    conditionFilter,
    publishedFilter,
    sortOrder,
    refreshKey
  ]);

  const refreshProducts = () => setRefreshKey((k) => k + 1);

  // Load single product details for Manage Modal
  const loadProductDetails = useCallback(async (productId) => {
    try {
      setManageLoading(true);
      setManageError(null);
      const data = await api.getAdminProduct(productId);
      setSelectedProduct(data);
      setEditForm({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        category_id: data.category_id || '',
        brand_id: data.brand_id || '',
        condition: data.condition || 'new',
        is_published: Boolean(data.is_published)
      });
    } catch (err) {
      setManageError(err.message || 'Failed to load product details.');
    } finally {
      setManageLoading(false);
    }
  }, []);

  const openManageModal = (productId, tab = 'details') => {
    setSelectedProductId(productId);
    setManageTab(tab);
    setManageModalOpen(true);
    loadProductDetails(productId);
  };

  const closeManageModal = () => {
    setManageModalOpen(false);
    setSelectedProductId(null);
    setSelectedProduct(null);
    setManageError(null);
  };

  // Helper: Slug generator
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle Create Product
  const openCreateModal = () => {
    setCreateForm({
      name: '',
      slug: '',
      description: '',
      category_id: categories[0]?.id || '',
      brand_id: '',
      condition: 'new',
      duration_of_use: '',
      is_published: false,
      sku: '',
      variant_label: 'Standard',
      price: '',
      stock_quantity: '0',
      low_stock_threshold: '5',
      specifications: []
    });
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Product name is required.');
      return;
    }
    if (!createForm.category_id) {
      setCreateError('Please select a valid category.');
      return;
    }
    if (!createForm.sku.trim()) {
      setCreateError('Default variant SKU is required.');
      return;
    }
    if (
      !createForm.price ||
      isNaN(parseFloat(createForm.price)) ||
      parseFloat(createForm.price) < 0
    ) {
      setCreateError('Price must be a valid positive number.');
      return;
    }
    if (createForm.condition === 'used' && !createForm.duration_of_use.trim()) {
      setCreateError('Please specify the duration of use for this used product (e.g. "6 months").');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);

      const payload = {
        name: createForm.name.trim(),
        slug: createForm.slug.trim() ? createForm.slug.trim() : undefined,
        description: createForm.description.trim() ? createForm.description.trim() : undefined,
        category_id: createForm.category_id,
        brand_id: createForm.brand_id ? createForm.brand_id : null,
        condition: createForm.condition,
        is_published: Boolean(createForm.is_published),
        default_variant: {
          sku: createForm.sku.trim().toUpperCase(),
          variant_label: createForm.variant_label.trim() || 'Standard',
          price: parseFloat(createForm.price).toFixed(2),
          stock_quantity: parseInt(createForm.stock_quantity, 10) || 0,
          low_stock_threshold: parseInt(createForm.low_stock_threshold, 10) || 0,
          is_default: true,
          is_active: true,
          duration_of_use:
            createForm.condition === 'used' ? createForm.duration_of_use.trim() : null
        },
        specifications: createForm.specifications.filter((s) => s.spec_name && s.spec_value)
      };

      const res = await api.createAdminProduct(payload);
      setActionSuccess(`Product "${res.name}" created successfully.`);
      setCreateModalOpen(false);
      refreshProducts();
    } catch (err) {
      setCreateError(err.message || 'Failed to create product.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Add Spec Row in Create Modal
  const addCreateSpecRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      specifications: [
        ...prev.specifications,
        { spec_name: '', spec_value: '', sort_order: prev.specifications.length }
      ]
    }));
  };

  const removeCreateSpecRow = (idx) => {
    setCreateForm((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== idx)
    }));
  };

  const updateCreateSpecRow = (idx, field, value) => {
    setCreateForm((prev) => {
      const updated = [...prev.specifications];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, specifications: updated };
    });
  };

  // Save Edit Core Details
  const handleEditCoreSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setManageError('Product name is required.');
      return;
    }
    try {
      setManageSubmitting(true);
      setManageError(null);

      const payload = {
        name: editForm.name.trim(),
        slug: editForm.slug.trim() || undefined,
        description: editForm.description.trim() ? editForm.description.trim() : null,
        category_id: editForm.category_id,
        brand_id: editForm.brand_id ? editForm.brand_id : null,
        condition: editForm.condition,
        is_published: Boolean(editForm.is_published)
      };

      await api.updateAdminProduct(selectedProductId, payload);
      setActionSuccess(`Product "${payload.name}" updated successfully.`);
      await loadProductDetails(selectedProductId);
      refreshProducts();
    } catch (err) {
      setManageError(err.message || 'Failed to update product details.');
    } finally {
      setManageSubmitting(false);
    }
  };

  // Quick Toggle Publish
  const handleTogglePublish = async (prod, e) => {
    e.stopPropagation();
    try {
      const newStatus = !prod.is_published;
      await api.updateAdminProduct(prod.id, { is_published: newStatus });
      setActionSuccess(`Product "${prod.name}" ${newStatus ? 'published' : 'unpublished'}.`);
      refreshProducts();
    } catch (err) {
      setError(err.message || 'Failed to update publication status.');
    }
  };

  // Variant Modal Openers
  const openAddVariantModal = () => {
    setEditingVariant(null);
    setVariantForm({
      sku: '',
      variant_label: '',
      price: '',
      low_stock_threshold: '5',
      stock_quantity: '0',
      is_default: false,
      is_active: true,
      duration_of_use: selectedProduct?.condition === 'used' ? '3 months' : ''
    });
    setVariantModalOpen(true);
  };

  const openEditVariantModal = (v) => {
    setEditingVariant(v);
    setVariantForm({
      sku: v.sku || '',
      variant_label: v.variant_label || '',
      price: v.price || '',
      low_stock_threshold: String(v.low_stock_threshold ?? 5),
      stock_quantity: String(v.stock_quantity ?? 0),
      is_default: Boolean(v.is_default),
      is_active: v.is_active ?? true,
      duration_of_use: v.duration_of_use || ''
    });
    setVariantModalOpen(true);
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    if (!variantForm.sku.trim()) {
      alert('SKU is required.');
      return;
    }
    if (!variantForm.variant_label.trim()) {
      alert('Variant label is required.');
      return;
    }
    if (
      !variantForm.price ||
      isNaN(parseFloat(variantForm.price)) ||
      parseFloat(variantForm.price) < 0
    ) {
      alert('Price must be a valid positive number.');
      return;
    }

    try {
      setManageSubmitting(true);
      if (editingVariant) {
        // Update variant (does not accept stock_quantity; stock is adjusted via Inventory)
        await api.updateAdminProductVariant(selectedProductId, editingVariant.id, {
          sku: variantForm.sku.trim().toUpperCase(),
          variant_label: variantForm.variant_label.trim(),
          price: parseFloat(variantForm.price).toFixed(2),
          low_stock_threshold: parseInt(variantForm.low_stock_threshold, 10) || 0,
          is_default: Boolean(variantForm.is_default),
          is_active: Boolean(variantForm.is_active),
          duration_of_use:
            selectedProduct?.condition === 'used' ? variantForm.duration_of_use.trim() : null
        });
        setActionSuccess('Variant updated successfully.');
      } else {
        // Create variant
        await api.createAdminProductVariant(selectedProductId, {
          sku: variantForm.sku.trim().toUpperCase(),
          variant_label: variantForm.variant_label.trim(),
          price: parseFloat(variantForm.price).toFixed(2),
          stock_quantity: parseInt(variantForm.stock_quantity, 10) || 0,
          low_stock_threshold: parseInt(variantForm.low_stock_threshold, 10) || 0,
          is_default: Boolean(variantForm.is_default),
          is_active: Boolean(variantForm.is_active),
          duration_of_use:
            selectedProduct?.condition === 'used' ? variantForm.duration_of_use.trim() : null
        });
        setActionSuccess('Variant created successfully.');
      }
      setVariantModalOpen(false);
      await loadProductDetails(selectedProductId);
      refreshProducts();
    } catch (err) {
      alert(err.message || 'Failed to save variant.');
    } finally {
      setManageSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (selectedProduct.variants?.length <= 1) {
      alert('A product must have at least one variant. You cannot delete the only variant.');
      return;
    }
    if (!confirm('Are you sure you want to delete this variant? This cannot be undone.')) return;
    try {
      await api.deleteAdminProductVariant(selectedProductId, variantId);
      setActionSuccess('Variant deleted.');
      await loadProductDetails(selectedProductId);
      refreshProducts();
    } catch (err) {
      alert(err.message || 'Failed to delete variant.');
    }
  };

  // Specifications Handlers
  const handleAddSpec = async (e) => {
    e.preventDefault();
    if (!newSpec.spec_name.trim() || !newSpec.spec_value.trim()) {
      alert('Specification name and value are both required.');
      return;
    }
    try {
      await api.addAdminProductSpec(selectedProductId, {
        spec_name: newSpec.spec_name.trim(),
        spec_value: newSpec.spec_value.trim(),
        sort_order: parseInt(newSpec.sort_order, 10) || 0
      });
      setNewSpec({ spec_name: '', spec_value: '', sort_order: '0' });
      setActionSuccess('Specification added.');
      await loadProductDetails(selectedProductId);
    } catch (err) {
      alert(err.message || 'Failed to add specification.');
    }
  };

  const handleDeleteSpec = async (specId) => {
    if (!confirm('Delete this specification?')) return;
    try {
      await api.deleteAdminProductSpec(selectedProductId, specId);
      setActionSuccess('Specification deleted.');
      await loadProductDetails(selectedProductId);
    } catch (err) {
      alert(err.message || 'Failed to delete specification.');
    }
  };

  // Images Handlers
  const handleUploadImage = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Please select an image file to upload.');
      return;
    }
    try {
      setImageUploading(true);
      const formData = new FormData();
      formData.append('image', imageFile);
      if (imageAlt.trim()) formData.append('alt_text', imageAlt.trim());
      formData.append('is_primary', imageIsPrimary ? 'true' : 'false');

      await api.addAdminProductImage(selectedProductId, formData);
      setImageFile(null);
      setImageAlt('');
      setImageIsPrimary(false);
      setActionSuccess('Image uploaded successfully.');
      await loadProductDetails(selectedProductId);
      refreshProducts();
    } catch (err) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSetPrimaryImage = async (imageId) => {
    try {
      await api.updateAdminProductImage(selectedProductId, imageId, { is_primary: true });
      setActionSuccess('Primary image updated.');
      await loadProductDetails(selectedProductId);
      refreshProducts();
    } catch (err) {
      alert(err.message || 'Failed to set primary image.');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Delete this product image?')) return;
    try {
      await api.deleteAdminProductImage(selectedProductId, imageId);
      setActionSuccess('Image deleted.');
      await loadProductDetails(selectedProductId);
      refreshProducts();
    } catch (err) {
      alert(err.message || 'Failed to delete image.');
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Products</span>
          </div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">
            Manage your hardware inventory, variants, specifications, and visibility.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Product
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="alert alert-success" role="alert">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{actionSuccess}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setActionSuccess(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setError(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="filters-card">
        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            refreshProducts();
          }}
        >
          <div className="search-box">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id={searchInputId}
              type="text"
              placeholder="Search by title, SKU, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="filter-dropdowns">
            {/* Category Select */}
            <div className="filter-group">
              <label htmlFor={categoryFilterId} className="sr-only">
                Category
              </label>
              <select
                id={categoryFilterId}
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Select */}
            <div className="filter-group">
              <label htmlFor={brandFilterId} className="sr-only">
                Brand
              </label>
              <select
                id={brandFilterId}
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Select */}
            <div className="filter-group">
              <label htmlFor={conditionFilterId} className="sr-only">
                Condition
              </label>
              <select
                id={conditionFilterId}
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Conditions</option>
                <option value="new">Brand New</option>
                <option value="used">Used / Open-Box</option>
              </select>
            </div>

            {/* Published Status Select */}
            <div className="filter-group">
              <label htmlFor={publishedFilterId} className="sr-only">
                Status
              </label>
              <select
                id={publishedFilterId}
                value={publishedFilter}
                onChange={(e) => {
                  setPublishedFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="true">Published</option>
                <option value="false">Draft / Hidden</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="filter-group">
              <label htmlFor={sortFilterId} className="sr-only">
                Sort Order
              </label>
              <select
                id={sortFilterId}
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setPage(1);
                }}
              >
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
            </div>

            <button type="submit" className="btn-search">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Products Table Card */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>Loading catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-table-state">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <h3>No products found</h3>
            <p>
              No products match your current filters. Try resetting filters or add a new product.
            </p>
            <button type="button" className="btn-secondary" onClick={openCreateModal}>
              Create Product
            </button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category & Brand</th>
                    <th>Condition</th>
                    <th>Default Price</th>
                    <th>Stock Level</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const totalStock = p.total_stock ?? 0;
                    const isOutOfStock = totalStock <= 0;
                    const isLowStock = totalStock > 0 && totalStock <= 5;
                    const primaryImg = p.primary_image?.image_path;

                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="product-media-cell">
                            <div className="thumbnail-box">
                              {primaryImg ? (
                                <img src={primaryImg} alt={p.name} />
                              ) : (
                                <div className="no-img-placeholder">
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="product-info-text">
                              <span className="product-name">{p.name}</span>
                              <div className="product-meta-sub">
                                <span className="sku-tag">
                                  {p.default_variant?.sku || 'NO-SKU'}
                                </span>
                                <span className="variants-count-badge">
                                  {p.variants_count}{' '}
                                  {p.variants_count === 1 ? 'variant' : 'variants'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cat-brand-cell">
                            <span className="cat-pill">{p.category?.name || 'Uncategorized'}</span>
                            <span className="brand-text">{p.brand?.name || 'Generic / None'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="condition-cell">
                            <span
                              className={`condition-pill ${p.condition === 'used' ? 'used' : 'new'}`}
                            >
                              {p.condition === 'used' ? 'Used' : 'New'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="price-cell">
                            <strong>
                              {p.default_variant
                                ? `${parseFloat(p.default_variant.price).toLocaleString()} EGP`
                                : '—'}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <div className="stock-cell">
                            {isOutOfStock ? (
                              <span className="stock-pill out-of-stock">Out of Stock (0)</span>
                            ) : isLowStock ? (
                              <span className="stock-pill low-stock">Low Stock ({totalStock})</span>
                            ) : (
                              <span className="stock-pill in-stock">{totalStock} in stock</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`status-pill clickable ${p.is_published ? 'published' : 'draft'}`}
                            onClick={(e) => handleTogglePublish(p, e)}
                            title="Click to toggle publication"
                          >
                            <span className="dot" />
                            {p.is_published ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-action edit"
                              onClick={() => openManageModal(p.id, 'details')}
                              title="Edit & Manage Product"
                            >
                              Manage
                            </button>
                            <Link
                              href={`/admin/inventory?search=${encodeURIComponent(p.default_variant?.sku || p.name)}`}
                              className="btn-action inventory"
                              title="View & Adjust Inventory"
                            >
                              Stock
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-bar">
              <span className="page-summary">
                Showing <strong>{(pagination.page - 1) * pagination.pageSize + 1}</strong> to{' '}
                <strong>{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong>{' '}
                of <strong>{pagination.total}</strong> products
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn-page"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  className="btn-page"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE PRODUCT MODAL */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div
            className="modal-container modal-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2>Create New Product</h2>
                <p className="modal-desc">
                  Add a hardware product, default variant, and initial specifications.
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {createError && (
              <div className="modal-alert-error" role="alert">
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="modal-form-body">
              {/* Section 1: Core Details */}
              <div className="form-section">
                <h3 className="section-title">1. Basic Information</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>
                      Product Title <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ASUS ROG Strix GeForce RTX 4080 Super"
                      value={createForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateForm((prev) => ({
                          ...prev,
                          name: val,
                          slug:
                            !prev.slug || prev.slug === generateSlug(prev.name)
                              ? generateSlug(val)
                              : prev.slug
                        }));
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      URL Slug <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="asus-rog-strix-rtx-4080-super"
                      value={createForm.slug}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Category <span className="req">*</span>
                    </label>
                    <select
                      required
                      value={createForm.category_id}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, category_id: e.target.value }))
                      }
                    >
                      <option value="">Select a Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Brand (Manufacturer)</label>
                    <select
                      value={createForm.brand_id}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, brand_id: e.target.value }))
                      }
                    >
                      <option value="">No Brand / Generic</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Description</label>
                  <textarea
                    rows="3"
                    placeholder="Key highlights, warranty coverage, cooling specifications, etc."
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>

                {/* Condition Selector */}
                <div className="condition-row">
                  <div className="form-group">
                    <label>
                      Condition <span className="req">*</span>
                    </label>
                    <div className="radio-pills">
                      <label
                        className={`radio-pill ${createForm.condition === 'new' ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="condition"
                          value="new"
                          checked={createForm.condition === 'new'}
                          onChange={() =>
                            setCreateForm((prev) => ({
                              ...prev,
                              condition: 'new',
                              duration_of_use: ''
                            }))
                          }
                        />
                        Brand New (Factory Sealed)
                      </label>
                      <label
                        className={`radio-pill ${createForm.condition === 'used' ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="condition"
                          value="used"
                          checked={createForm.condition === 'used'}
                          onChange={() => setCreateForm((prev) => ({ ...prev, condition: 'used' }))}
                        />
                        Used / Open-Box
                      </label>
                    </div>
                  </div>

                  {createForm.condition === 'used' && (
                    <div className="form-group duration-input-box">
                      <label>
                        Duration of Use <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 6 months light gaming, tested & fully working"
                        value={createForm.duration_of_use}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, duration_of_use: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={createForm.is_published}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, is_published: e.target.checked }))
                      }
                    />
                    <span>Publish immediately to storefront catalog</span>
                  </label>
                </div>
              </div>

              {/* Section 2: Default Variant */}
              <div className="form-section">
                <h3 className="section-title">2. Default Variant & Pricing</h3>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>
                      Stock Keeping Unit (SKU) <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RTX4080S-STRIX-16G"
                      value={createForm.sku}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Variant Label <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 16GB / OC Edition"
                      value={createForm.variant_label}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, variant_label: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Price (EGP) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 52000"
                      value={createForm.price}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, price: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Initial Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.stock_quantity}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, stock_quantity: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.low_stock_threshold}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, low_stock_threshold: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Initial Specifications */}
              <div className="form-section">
                <div className="section-header-flex">
                  <h3 className="section-title">3. Specifications (Optional)</h3>
                  <button type="button" className="btn-small-secondary" onClick={addCreateSpecRow}>
                    + Add Specification
                  </button>
                </div>
                {createForm.specifications.length === 0 ? (
                  <p className="subtext-empty">
                    No specifications added yet. You can also add specifications after creating the
                    product.
                  </p>
                ) : (
                  <div className="spec-rows-list">
                    {createForm.specifications.map((s, idx) => (
                      <div key={idx} className="spec-row-input">
                        <input
                          type="text"
                          placeholder="Name (e.g. Memory)"
                          value={s.spec_name}
                          onChange={(e) => updateCreateSpecRow(idx, 'spec_name', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 16GB GDDR6X)"
                          value={s.spec_value}
                          onChange={(e) => updateCreateSpecRow(idx, 'spec_value', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => removeCreateSpecRow(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createSubmitting}>
                  {createSubmitting ? 'Creating Product...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE / EDIT PRODUCT DRAWER MODAL */}
      {manageModalOpen && (
        <div className="modal-backdrop" onClick={closeManageModal}>
          <div
            className="modal-container modal-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2>Manage Product</h2>
                <p className="modal-desc">{selectedProduct?.name || 'Loading product...'}</p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={closeManageModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Sub-Nav Tabs */}
            <div className="manage-tabs">
              <button
                type="button"
                className={`manage-tab ${manageTab === 'details' ? 'active' : ''}`}
                onClick={() => setManageTab('details')}
              >
                Overview & Details
              </button>
              <button
                type="button"
                className={`manage-tab ${manageTab === 'variants' ? 'active' : ''}`}
                onClick={() => setManageTab('variants')}
              >
                Variants & Pricing ({selectedProduct?.variants?.length || 0})
              </button>
              <button
                type="button"
                className={`manage-tab ${manageTab === 'specifications' ? 'active' : ''}`}
                onClick={() => setManageTab('specifications')}
              >
                Specifications ({selectedProduct?.specifications?.length || 0})
              </button>
              <button
                type="button"
                className={`manage-tab ${manageTab === 'images' ? 'active' : ''}`}
                onClick={() => setManageTab('images')}
              >
                Images ({selectedProduct?.images?.length || 0})
              </button>
            </div>

            {manageLoading ? (
              <div className="table-loading" style={{ padding: '3rem' }}>
                <div className="spinner" />
                <p>Loading full product record...</p>
              </div>
            ) : manageError ? (
              <div className="modal-alert-error" role="alert" style={{ margin: '1.5rem' }}>
                <span>{manageError}</span>
              </div>
            ) : (
              <div className="manage-tab-content">
                {/* TAB 1: CORE DETAILS */}
                {manageTab === 'details' && (
                  <form onSubmit={handleEditCoreSubmit} className="tab-pane-form">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>
                          Product Title <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          URL Slug <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.slug}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, slug: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Category <span className="req">*</span>
                        </label>
                        <select
                          required
                          value={editForm.category_id}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, category_id: e.target.value }))
                          }
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Brand (Manufacturer)</label>
                        <select
                          value={editForm.brand_id}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, brand_id: e.target.value }))
                          }
                        >
                          <option value="">No Brand / Generic</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label>Description</label>
                      <textarea
                        rows="4"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </div>

                    <div className="condition-row">
                      <div className="form-group">
                        <label>Hardware Condition</label>
                        <div className="radio-pills">
                          <label
                            className={`radio-pill ${editForm.condition === 'new' ? 'active' : ''}`}
                          >
                            <input
                              type="radio"
                              name="edit_condition"
                              value="new"
                              checked={editForm.condition === 'new'}
                              onChange={() =>
                                setEditForm((prev) => ({ ...prev, condition: 'new' }))
                              }
                            />
                            Brand New
                          </label>
                          <label
                            className={`radio-pill ${editForm.condition === 'used' ? 'active' : ''}`}
                          >
                            <input
                              type="radio"
                              name="edit_condition"
                              value="used"
                              checked={editForm.condition === 'used'}
                              onChange={() =>
                                setEditForm((prev) => ({ ...prev, condition: 'used' }))
                              }
                            />
                            Used / Open-Box
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="checkbox-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editForm.is_published}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, is_published: e.target.checked }))
                          }
                        />
                        <span>Visible in public storefront</span>
                      </label>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                      <button type="submit" className="btn-primary" disabled={manageSubmitting}>
                        {manageSubmitting ? 'Saving Changes...' : 'Save Product Details'}
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: VARIANTS */}
                {manageTab === 'variants' && (
                  <div className="tab-pane-variants">
                    <div className="pane-header-actions">
                      <div>
                        <h3>SKU Variants & Pricing</h3>
                        <p className="subtext">
                          Every product must have at least one variant. Stock quantities are
                          auditable and managed via Inventory.
                        </p>
                      </div>
                      <button type="button" className="btn-primary" onClick={openAddVariantModal}>
                        + Add Variant
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="mini-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Label</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Threshold</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct?.variants?.map((v) => (
                            <tr key={v.id}>
                              <td>
                                <strong>{v.sku}</strong>
                              </td>
                              <td>
                                {v.variant_label}
                                {v.is_default && <span className="default-pill">Default</span>}
                              </td>
                              <td>{parseFloat(v.price).toLocaleString()} EGP</td>
                              <td>
                                <span
                                  className={`stock-pill ${v.stock_quantity <= 0 ? 'out-of-stock' : v.stock_quantity <= v.low_stock_threshold ? 'low-stock' : 'in-stock'}`}
                                >
                                  {v.stock_quantity}
                                </span>
                              </td>
                              <td>{v.low_stock_threshold}</td>
                              <td>
                                <span
                                  className={`status-pill ${v.is_active ? 'published' : 'draft'}`}
                                >
                                  {v.is_active ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    type="button"
                                    className="btn-action edit"
                                    onClick={() => openEditVariantModal(v)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-action danger"
                                    onClick={() => handleDeleteVariant(v.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: SPECIFICATIONS */}
                {manageTab === 'specifications' && (
                  <div className="tab-pane-specs">
                    <div className="pane-header-actions">
                      <div>
                        <h3>Technical Specifications</h3>
                        <p className="subtext">
                          Structured specifications shown on the customer-facing product details
                          page.
                        </p>
                      </div>
                    </div>

                    {/* Add Spec Form */}
                    <form onSubmit={handleAddSpec} className="spec-inline-form">
                      <input
                        type="text"
                        placeholder="Specification Name (e.g. Boost Clock)"
                        value={newSpec.spec_name}
                        onChange={(e) =>
                          setNewSpec((prev) => ({ ...prev, spec_name: e.target.value }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 2610 MHz)"
                        value={newSpec.spec_value}
                        onChange={(e) =>
                          setNewSpec((prev) => ({ ...prev, spec_value: e.target.value }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="Sort"
                        style={{ width: '80px' }}
                        value={newSpec.sort_order}
                        onChange={(e) =>
                          setNewSpec((prev) => ({ ...prev, sort_order: e.target.value }))
                        }
                      />
                      <button type="submit" className="btn-primary">
                        Add Spec
                      </button>
                    </form>

                    {selectedProduct?.specifications?.length === 0 ? (
                      <p className="subtext-empty">
                        No specifications defined for this product yet.
                      </p>
                    ) : (
                      <table className="mini-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Value</th>
                            <th>Sort Order</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct?.specifications?.map((s) => (
                            <tr key={s.id}>
                              <td>
                                <strong>{s.spec_name}</strong>
                              </td>
                              <td>{s.spec_value}</td>
                              <td>{s.sort_order}</td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    type="button"
                                    className="btn-action danger"
                                    onClick={() => handleDeleteSpec(s.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* TAB 4: IMAGES */}
                {manageTab === 'images' && (
                  <div className="tab-pane-images">
                    <div className="pane-header-actions">
                      <div>
                        <h3>Product Photography</h3>
                        <p className="subtext">
                          Upload high-resolution hardware images. Mark one image as the primary hero
                          image.
                        </p>
                      </div>
                    </div>

                    {/* Upload Form */}
                    <form onSubmit={handleUploadImage} className="image-upload-box">
                      <div className="file-input-wrapper">
                        <label>Select Image File (PNG, JPEG, WebP):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files[0] || null)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: '0.75rem 0' }}>
                        <input
                          type="text"
                          placeholder="Alt text (e.g. ASUS RTX 4080 Super front view)"
                          value={imageAlt}
                          onChange={(e) => setImageAlt(e.target.value)}
                        />
                      </div>
                      <div className="checkbox-row" style={{ marginBottom: '0.75rem' }}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={imageIsPrimary}
                            onChange={(e) => setImageIsPrimary(e.target.checked)}
                          />
                          <span>Set as Primary Thumbnail</span>
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={imageUploading || !imageFile}
                      >
                        {imageUploading ? 'Uploading...' : 'Upload Image'}
                      </button>
                    </form>

                    {/* Image Gallery */}
                    <div className="image-gallery-grid">
                      {selectedProduct?.images?.map((img) => (
                        <div
                          key={img.id}
                          className={`gallery-item ${img.is_primary ? 'is-primary' : ''}`}
                        >
                          <div className="gallery-thumb">
                            <img src={img.image_path} alt={img.alt_text || 'Product image'} />
                          </div>
                          <div className="gallery-meta">
                            {img.is_primary ? (
                              <span className="primary-badge">★ Primary</span>
                            ) : (
                              <button
                                type="button"
                                className="btn-set-primary"
                                onClick={() => handleSetPrimaryImage(img.id)}
                              >
                                Set as Primary
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-delete-img"
                              onClick={() => handleDeleteImage(img.id)}
                              aria-label="Delete image"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VARIANT ADD/EDIT SUB-MODAL */}
      {variantModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={() => setVariantModalOpen(false)}
        >
          <div
            className="modal-container modal-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h2>{editingVariant ? 'Edit Variant' : 'Add New Variant'}</h2>
              <button
                type="button"
                className="btn-close"
                onClick={() => setVariantModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleVariantSubmit} className="modal-form-body">
              <div className="form-group">
                <label>
                  SKU (Stock Keeping Unit) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={variantForm.sku}
                  onChange={(e) =>
                    setVariantForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Variant Label <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 16GB OC / White Edition"
                  value={variantForm.variant_label}
                  onChange={(e) =>
                    setVariantForm((prev) => ({ ...prev, variant_label: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Price (EGP) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={variantForm.price}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>

              {!editingVariant && (
                <div className="form-group">
                  <label>Initial Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={variantForm.stock_quantity}
                    onChange={(e) =>
                      setVariantForm((prev) => ({ ...prev, stock_quantity: e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="form-group">
                <label>Low Stock Alert Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={variantForm.low_stock_threshold}
                  onChange={(e) =>
                    setVariantForm((prev) => ({ ...prev, low_stock_threshold: e.target.value }))
                  }
                />
              </div>

              {selectedProduct?.condition === 'used' && (
                <div className="form-group">
                  <label>Duration of Use (for used product)</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 months light gaming"
                    value={variantForm.duration_of_use}
                    onChange={(e) =>
                      setVariantForm((prev) => ({ ...prev, duration_of_use: e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={variantForm.is_default}
                    onChange={(e) =>
                      setVariantForm((prev) => ({ ...prev, is_default: e.target.checked }))
                    }
                  />
                  <span>Set as Default Variant for this product</span>
                </label>
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={variantForm.is_active}
                    onChange={(e) =>
                      setVariantForm((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                  />
                  <span>Active & purchasable</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setVariantModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={manageSubmitting}>
                  {editingVariant ? 'Update Variant' : 'Create Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX Styles */}
      <style jsx>{`
        .admin-page-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .breadcrumb a {
          color: #0284c7;
          text-decoration: none;
        }

        .breadcrumb a:hover {
          text-decoration: underline;
        }

        .breadcrumb .separator {
          color: #94a3b8;
        }

        .breadcrumb .current {
          color: #0f172a;
          font-weight: 500;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 0.25rem 0;
        }

        .page-subtitle {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #0284c7;
          color: #ffffff;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          transition:
            background 0.15s ease,
            transform 0.1s ease;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0369a1;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #ffffff;
          color: #334155;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          border: 1px solid #cbd5e1;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        /* Notifications */
        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .alert-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .alert-danger {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .alert-close {
          margin-left: auto;
          background: transparent;
          border: none;
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          color: inherit;
        }

        /* Filter Card */
        .filters-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
        }

        .search-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .search-box {
          position: relative;
          flex: 1 1 280px;
          display: flex;
          align-items: center;
        }

        .search-box svg {
          position: absolute;
          left: 12px;
          color: #94a3b8;
          pointer-events: none;
        }

        .search-box input {
          width: 100%;
          padding: 0.6rem 2.2rem 0.6rem 2.25rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .search-box input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
        }

        .clear-search {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          font-size: 1.1rem;
          color: #94a3b8;
          cursor: pointer;
        }

        .filter-dropdowns {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .filter-group select {
          padding: 0.6rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #334155;
          background: #ffffff;
          outline: none;
          cursor: pointer;
        }

        .filter-group select:focus {
          border-color: #0284c7;
        }

        .btn-search {
          padding: 0.6rem 1rem;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
        }

        /* Table Card */
        .table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }

        .table-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #64748b;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-table-state {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .empty-table-state h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .empty-table-state p {
          color: #64748b;
          font-size: 0.9rem;
          max-width: 400px;
          margin: 0 0 0.5rem 0;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .products-table th {
          background: #f8fafc;
          padding: 0.85rem 1.25rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }

        .products-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .products-table tr:hover td {
          background: #f8fafc;
        }

        /* Product Media Cell */
        .product-media-cell {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .thumbnail-box {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #f1f5f9;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
        }

        .thumbnail-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-info-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .product-name {
          font-weight: 600;
          color: #0f172a;
          line-height: 1.3;
        }

        .product-meta-sub {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .sku-tag {
          font-family: monospace;
          font-size: 0.75rem;
          background: #f1f5f9;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          color: #475569;
        }

        .variants-count-badge {
          font-size: 0.75rem;
          color: #64748b;
        }

        /* Category Brand Cell */
        .cat-brand-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .cat-pill {
          font-weight: 600;
          color: #0f172a;
        }

        .brand-text {
          font-size: 0.8rem;
          color: #64748b;
        }

        /* Condition Cell */
        .condition-pill {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .condition-pill.new {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .condition-pill.used {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        /* Stock Pill */
        .stock-pill {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        .stock-pill.in-stock {
          background: #e8f3ed;
          color: #1b7a48;
        }

        .stock-pill.low-stock {
          background: #fffbeb;
          color: #b45309;
        }

        .stock-pill.out-of-stock {
          background: #fef2f2;
          color: #b91c1c;
          font-weight: 700;
        }

        /* Status Pill */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          border: none;
        }

        .status-pill.clickable {
          cursor: pointer;
        }

        .status-pill.published {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .status-pill.published .dot {
          width: 6px;
          height: 6px;
          background: #16a34a;
          border-radius: 50%;
        }

        .status-pill.draft {
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .status-pill.draft .dot {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
        }

        /* Actions */
        .action-buttons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
        }

        .btn-action {
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
        }

        .btn-action:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .btn-action.edit {
          color: #0284c7;
          border-color: #bae6fd;
          background: #f0f9ff;
        }

        .btn-action.edit:hover {
          background: #e0f2fe;
        }

        .btn-action.inventory {
          color: #0f172a;
          background: #f8fafc;
        }

        .btn-action.danger {
          color: #dc2626;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .btn-action.danger:hover {
          background: #fee2e2;
        }

        /* Pagination Bar */
        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1.25rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 0.85rem;
          color: #64748b;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-page {
          padding: 0.35rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          color: #334155;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-page:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(18, 30, 27, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 1000;
        }

        .modal-container {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-md {
          max-width: 550px;
        }
        .modal-lg {
          max-width: 800px;
        }
        .modal-xl {
          max-width: 1050px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .modal-desc {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }

        .btn-close {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          color: #94a3b8;
          cursor: pointer;
        }

        .modal-alert-error {
          padding: 0.75rem 1.25rem;
          background: #fef2f2;
          border-bottom: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.875rem;
        }

        .modal-form-body {
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1.25rem;
        }

        .section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.85rem 0;
        }

        .section-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
        }

        .btn-small-secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.3rem 0.65rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0284c7;
          cursor: pointer;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .req {
          color: #dc2626;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.6rem 0.8rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #0284c7;
        }

        .condition-row {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .radio-pills {
          display: flex;
          gap: 0.5rem;
        }

        .radio-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          background: #ffffff;
        }

        .radio-pill.active {
          border-color: #0284c7;
          background: #f0f9ff;
          color: #0284c7;
        }

        .radio-pill input {
          display: none;
        }

        .duration-input-box {
          margin-top: 0.5rem;
        }

        .checkbox-row {
          margin-top: 0.75rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
        }

        .spec-rows-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .spec-row-input {
          display: flex;
          gap: 0.5rem;
        }

        .spec-row-input input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .btn-remove-row {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          width: 32px;
          font-size: 1.2rem;
          cursor: pointer;
        }

        .subtext-empty {
          color: #94a3b8;
          font-size: 0.85rem;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        /* Manage Product Drawer Tabs */
        .manage-tabs {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 1.5rem;
          gap: 0.5rem;
          overflow-x: auto;
        }

        .manage-tab {
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
        }

        .manage-tab.active {
          color: #0284c7;
          border-bottom-color: #0284c7;
          background: #ffffff;
        }

        .manage-tab-content {
          padding: 1.5rem;
          overflow-y: auto;
        }

        .pane-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .pane-header-actions h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .pane-header-actions .subtext {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }

        .mini-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.875rem;
        }

        .mini-table th {
          background: #f8fafc;
          padding: 0.6rem 0.85rem;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .mini-table td {
          padding: 0.75rem 0.85rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .default-pill {
          margin-left: 0.4rem;
          background: #e0f2fe;
          color: #0369a1;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }

        .spec-inline-form {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .spec-inline-form input {
          flex: 1 1 200px;
          padding: 0.55rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .image-upload-box {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .image-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }

        .gallery-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
        }

        .gallery-item.is-primary {
          border: 2px solid #0284c7;
        }

        .gallery-thumb {
          width: 100%;
          height: 140px;
          background: #f1f5f9;
        }

        .gallery-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gallery-meta {
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          align-items: center;
        }

        .primary-badge {
          font-size: 0.75rem;
          font-weight: 700;
          color: #0284c7;
        }

        .btn-set-primary {
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-delete-img {
          background: transparent;
          color: #dc2626;
          border: none;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }

        @media (max-width: 768px) {
          .admin-page-container {
            padding: 1rem;
          }
          .form-grid-2,
          .form-grid-3 {
            grid-template-columns: 1fr;
          }
          .search-row {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-dropdowns {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
