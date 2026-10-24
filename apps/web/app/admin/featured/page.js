'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminFeaturedProductsPage() {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Remove Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  // Sort Order Editing State
  const [editingOrderProductId, setEditingOrderProductId] = useState(null);
  const [editingOrderValue, setEditingOrderValue] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  const sortOrderInputId = useId();

  useEffect(() => {
    let ignore = false;
    async function loadFeaturedData() {
      try {
        setLoading(true);
        setError(null);
        const [items, prodsRes] = await Promise.all([
          api.getAdminFeaturedProducts(),
          api.getAdminProducts({ pageSize: 100 })
        ]);

        if (!ignore) {
          setFeaturedItems(items || []);
          setAvailableProducts(prodsRes.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load featured products.');
          setLoading(false);
        }
      }
    }

    loadFeaturedData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Set of already featured product IDs to prevent duplicates
  const featuredProductIds = new Set(featuredItems.map((item) => item.product_id));

  // Available candidate products that are not yet featured
  const candidateProducts = availableProducts.filter((p) => {
    if (featuredProductIds.has(p.id)) return false;
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(term))
    );
  });

  const openAddModal = () => {
    setSelectedProductId('');
    setProductSearch('');
    // Auto-suggest next sort order
    const maxOrder = featuredItems.reduce((max, item) => Math.max(max, item.sort_order || 0), -1);
    setSortOrder(String(maxOrder + 1));
    setModalError(null);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      setModalError('Please select a product to feature.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      await api.addAdminFeaturedProduct({
        product_id: selectedProductId,
        sort_order: parseInt(sortOrder, 10) || 0
      });
      setActionSuccess('Product added to storefront featured showcase.');
      setAddModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setModalError(err.message || 'Failed to add featured product.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const startEditOrder = (item) => {
    setEditingOrderProductId(item.product_id);
    setEditingOrderValue(String(item.sort_order));
  };

  const handleSaveOrder = async (productId) => {
    const num = parseInt(editingOrderValue, 10);
    if (isNaN(num) || num < 0) {
      setError('Sort order must be a non-negative number.');
      setEditingOrderProductId(null);
      return;
    }

    try {
      setOrderSubmitting(true);
      await api.updateAdminFeaturedProduct(productId, { sort_order: num });
      setActionSuccess('Featured product sort order updated.');
      setEditingOrderProductId(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to update sort order.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const openRemoveModal = (item) => {
    setRemovingItem(item);
    setRemoveError(null);
    setRemoveModalOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!removingItem) return;
    try {
      setRemoveSubmitting(true);
      setRemoveError(null);
      await api.removeAdminFeaturedProduct(removingItem.product_id);
      setActionSuccess('Product removed from featured showcase.');
      setRemoveModalOpen(false);
      setRemovingItem(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setRemoveError(err.message || 'Failed to remove featured product.');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  return (
    <div className="featured-management">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-text">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Featured Products</span>
          </nav>
          <h1 className="page-title">Storefront Featured Hardware</h1>
          <p className="page-subtitle">
            Curate top hardware showcases displayed on the homepage. Control display sequence and
            product highlights.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            id="add-featured-product-btn"
            onClick={openAddModal}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Feature Product
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="alert alert-success" role="status">
          <span>{actionSuccess}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setActionSuccess(null)}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setError(null)}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="info-banner">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          Products in this showcase are highlighted on the storefront index page. A lower sort order
          (0, 1, 2...) appears first in the carousel.
        </p>
      </div>

      {/* Featured Products Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading featured hardware...</p>
          </div>
        ) : featuredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <h3>No featured hardware assigned</h3>
            <p>Select products from your catalog to showcase them on the homepage.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Sort Order</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Condition</th>
                  <th>Default Price</th>
                  <th>Visibility</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {featuredItems.map((item) => {
                  const prod = item.product || {};
                  const isEditingOrder = editingOrderProductId === item.product_id;

                  return (
                    <tr key={item.product_id}>
                      <td>
                        {isEditingOrder ? (
                          <div className="order-edit-inline">
                            <input
                              type="number"
                              min="0"
                              className="order-input"
                              value={editingOrderValue}
                              onChange={(e) => setEditingOrderValue(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn-tiny btn-tiny-save"
                              onClick={() => handleSaveOrder(item.product_id)}
                              disabled={orderSubmitting}
                              title="Save Order"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-tiny"
                              onClick={() => setEditingOrderProductId(null)}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="order-badge-btn"
                            title="Click to edit sort order"
                            onClick={() => startEditOrder(item)}
                          >
                            <span>#{item.sort_order}</span>
                            <span className="edit-hint">✎</span>
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="product-cell">
                          {prod.primary_image ? (
                            <img
                              src={prod.primary_image}
                              alt={prod.name || 'Product'}
                              className="product-thumb"
                            />
                          ) : (
                            <div className="thumb-placeholder">PC</div>
                          )}
                          <div className="product-meta">
                            <Link href={`/admin/products`} className="product-name">
                              {prod.name || 'Unnamed Product'}
                            </Link>
                            <span className="product-slug">/{prod.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">
                          {prod.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td>
                        {prod.condition === 'used' ? (
                          <span className="badge badge-warning">Certified Used</span>
                        ) : (
                          <span className="badge badge-info">Brand New</span>
                        )}
                      </td>
                      <td>
                        <strong className="price-tag">
                          {prod.default_price
                            ? `EGP ${Number(prod.default_price).toLocaleString()}`
                            : 'N/A'}
                        </strong>
                      </td>
                      <td>
                        {prod.is_published ? (
                          <span className="badge badge-active">Storefront Visible</span>
                        ) : (
                          <span className="badge badge-inactive">Unpublished Product</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Remove from featured list"
                            onClick={() => openRemoveModal(item)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Featured Product Modal */}
      {addModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Feature Hardware Product</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert alert-danger" role="alert">
                    {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Search & Select Product *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search candidate products by title or category..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="candidate-list">
                    {candidateProducts.length === 0 ? (
                      <p className="no-candidates">
                        {availableProducts.length === 0
                          ? 'No catalog products available.'
                          : 'No unfeatured products matching search.'}
                      </p>
                    ) : (
                      candidateProducts.slice(0, 30).map((prod) => {
                        const isSelected = selectedProductId === prod.id;
                        return (
                          <div
                            key={prod.id}
                            className={`candidate-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedProductId(prod.id)}
                          >
                            <input
                              type="radio"
                              name="selected_product"
                              checked={isSelected}
                              onChange={() => setSelectedProductId(prod.id)}
                            />
                            <div className="candidate-details">
                              <strong>{prod.name}</strong>
                              <span className="candidate-sub">
                                {prod.category?.name || 'Hardware'} •{' '}
                                {prod.condition === 'used' ? 'Used' : 'New'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor={sortOrderInputId} className="form-label">
                    Display Priority / Sort Order
                  </label>
                  <input
                    id={sortOrderInputId}
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                  <small className="form-help">
                    Lower numbers appear first on the storefront homepage.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-featured-product-btn"
                  disabled={modalSubmitting || !selectedProductId}
                >
                  {modalSubmitting ? 'Adding...' : 'Feature Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removeModalOpen && removingItem && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h2>Remove from Featured</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setRemoveModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {removeError ? (
                <div className="alert alert-danger" role="alert">
                  {removeError}
                </div>
              ) : (
                <p>
                  Remove <strong>{removingItem.product?.name || 'this product'}</strong> from the
                  storefront featured showcase?
                </p>
              )}
              <p className="text-muted small" style={{ marginTop: '0.5rem' }}>
                The product will remain active in the catalog and will only be removed from homepage
                highlights.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRemoveModalOpen(false)}
                disabled={removeSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="confirm-remove-featured-btn"
                onClick={handleConfirmRemove}
                disabled={removeSubmitting}
              >
                {removeSubmitting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .featured-management {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
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
          color: #0d9488;
          text-decoration: none;
        }

        .separator {
          color: #cbd5e1;
        }

        .current {
          color: #0f172a;
          font-weight: 500;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .info-banner {
          background: #f0fdfa;
          border: 1px solid #ccfbf1;
          border-radius: 8px;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #0f766e;
          font-size: 0.88rem;
          margin-bottom: 1.5rem;
        }

        .info-banner p {
          margin: 0;
        }

        .table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .data-table th {
          background: #f8fafc;
          padding: 0.85rem 1rem;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .data-table td {
          padding: 0.9rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          color: #1e293b;
        }

        .data-table tr:hover td {
          background: #f8fafc;
        }

        .order-badge-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.85rem;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.15s;
        }

        .order-badge-btn:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }

        .edit-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .order-edit-inline {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .order-input {
          width: 55px;
          padding: 0.25rem 0.4rem;
          border: 1px solid #0d9488;
          border-radius: 4px;
          font-size: 0.85rem;
          text-align: center;
        }

        .btn-tiny {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 0.2rem 0.45rem;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .btn-tiny-save {
          background: #0d9488;
          color: #ffffff;
          border-color: #0d9488;
        }

        .product-cell {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .product-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .thumb-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 700;
        }

        .product-meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .product-name {
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
        }

        .product-name:hover {
          color: #0d9488;
        }

        .product-slug {
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .category-tag {
          font-size: 0.82rem;
          color: #475569;
          background: #f1f5f9;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .badge {
          display: inline-block;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-active {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .badge-warning {
          background: #fef3c7;
          color: #b45309;
        }

        .badge-info {
          background: #e0f2fe;
          color: #0369a1;
        }

        .price-tag {
          color: #0f172a;
          font-weight: 700;
        }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
        }

        .btn-icon {
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.35rem 0.5rem;
          cursor: pointer;
          font-size: 0.95rem;
          color: #475569;
          transition: all 0.15s;
        }

        .btn-icon-danger:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .text-right {
          text-align: right;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 6px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }

        .btn-primary {
          background: #0d9488;
          color: #ffffff;
        }

        .btn-primary:hover {
          background: #0f766e;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn-danger {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }

        .alert {
          padding: 0.85rem 1.25rem;
          border-radius: 6px;
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .alert-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-danger {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.3rem;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
          line-height: 1;
        }

        .loading-state,
        .empty-state {
          padding: 3.5rem 1.5rem;
          text-align: center;
          color: #64748b;
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .empty-state h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #0d9488;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Modal Styles */
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
          z-index: 1000;
          padding: 1.5rem;
        }

        .modal-card {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
        }

        .modal-sm {
          max-width: 440px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.35rem;
        }

        .form-input {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
        }

        .form-input:focus {
          outline: none;
          border-color: #0d9488;
        }

        .candidate-list {
          margin-top: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          max-height: 200px;
          overflow-y: auto;
          background: #ffffff;
        }

        .candidate-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.85rem;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.1s;
        }

        .candidate-item:hover {
          background: #f8fafc;
        }

        .candidate-item.selected {
          background: #f0fdfa;
        }

        .candidate-details {
          display: flex;
          flex-direction: column;
        }

        .candidate-details strong {
          font-size: 0.85rem;
          color: #0f172a;
        }

        .candidate-sub {
          font-size: 0.75rem;
          color: #64748b;
        }

        .no-candidates {
          padding: 1rem;
          text-align: center;
          font-size: 0.85rem;
          color: #94a3b8;
          margin: 0;
        }

        .form-help {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.3rem;
        }

        .small {
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
