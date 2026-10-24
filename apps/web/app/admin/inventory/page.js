'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminInventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Active view: 'inventory' table or 'audit' log
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'audit'

  // Pagination & Filtering for Inventory Items
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'out_of_stock' | 'low_stock' | 'in_stock'
  const [conditionFilter, setConditionFilter] = useState(''); // '' | 'new' | 'used'

  // Accessible Filter IDs
  const searchInputId = useId();
  const statusFilterId = useId();
  const conditionFilterId = useId();

  // Stock Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantityDelta, setQuantityDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState(null);

  // Threshold Management Modal State
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdItem, setThresholdItem] = useState(null);
  const [thresholdValue, setThresholdValue] = useState('5');
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false);
  const [thresholdError, setThresholdError] = useState(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  // Fetch Inventory Items
  useEffect(() => {
    let ignore = false;
    async function loadInventory() {
      try {
        const params = {
          page,
          pageSize: 20
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.status = statusFilter;
        if (conditionFilter) params.condition = conditionFilter;

        const res = await api.getAdminInventoryItems(params);
        if (!ignore) {
          setItems(res.items || []);
          setPagination(res.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load inventory items.');
          setLoading(false);
        }
      }
    }

    loadInventory();
    return () => {
      ignore = true;
    };
  }, [page, search, statusFilter, conditionFilter, refreshKey]);

  // Fetch Audit Logs
  useEffect(() => {
    if (activeTab !== 'audit') return;

    let ignore = false;
    async function loadAudit() {
      try {
        const res = await api.getAdminInventoryAdjustments({ page: auditPage, pageSize: 20 });
        if (!ignore) {
          setAuditLogs(res.items || []);
          setAuditPagination(res.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
          setAuditLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load audit logs:', err);
          setAuditLoading(false);
        }
      }
    }

    loadAudit();
    return () => {
      ignore = true;
    };
  }, [activeTab, auditPage, auditRefreshKey]);

  const refreshInventory = () => setRefreshKey((k) => k + 1);
  const refreshAudit = () => setAuditRefreshKey((k) => k + 1);

  // Adjust Modal Open
  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setQuantityDelta('');
    setAdjustReason('');
    setAdjustError(null);
    setAdjustModalOpen(true);
  };

  // Threshold Modal Open
  const openThresholdModal = (item) => {
    setThresholdItem(item);
    setThresholdValue(String(item.low_stock_threshold ?? 5));
    setThresholdError(null);
    setThresholdModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const deltaNum = parseInt(quantityDelta, 10);
    if (isNaN(deltaNum) || deltaNum === 0) {
      setAdjustError('Quantity delta must be a non-zero integer (+ to add stock, - to remove).');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('A reason is mandatory for auditable stock adjustments.');
      return;
    }

    const currentStock = selectedItem.stock_quantity ?? 0;
    if (currentStock + deltaNum < 0) {
      setAdjustError(
        `Cannot reduce stock below zero. Current stock is ${currentStock}, adjustment is ${deltaNum}.`
      );
      return;
    }

    try {
      setAdjustSubmitting(true);
      setAdjustError(null);

      await api.adjustInventory({
        variantId: selectedItem.variant_id,
        quantityDelta: deltaNum,
        reason: adjustReason.trim()
      });

      setActionSuccess(
        `Stock for ${selectedItem.sku} adjusted by ${deltaNum > 0 ? `+${deltaNum}` : deltaNum}.`
      );
      setAdjustModalOpen(false);
      refreshInventory();
      if (activeTab === 'audit') {
        refreshAudit();
      }
    } catch (err) {
      setAdjustError(err.message || 'Failed to adjust inventory.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Submit Threshold Update
  const handleThresholdSubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(thresholdValue, 10);
    if (isNaN(val) || val < 0) {
      setThresholdError('Threshold must be a non-negative number.');
      return;
    }

    try {
      setThresholdSubmitting(true);
      setThresholdError(null);

      await api.updateAdminProductVariant(thresholdItem.product_id, thresholdItem.variant_id, {
        low_stock_threshold: val
      });

      setActionSuccess(`Low stock threshold for ${thresholdItem.sku} updated to ${val}.`);
      setThresholdModalOpen(false);
      refreshInventory();
    } catch (err) {
      setThresholdError(err.message || 'Failed to update threshold.');
    } finally {
      setThresholdSubmitting(false);
    }
  };

  // Calculated Stats from Current Items
  const outOfStockCount = items.filter((i) => (i.stock_quantity ?? 0) <= 0).length;
  const lowStockCount = items.filter(
    (i) => (i.stock_quantity ?? 0) > 0 && (i.stock_quantity ?? 0) <= (i.low_stock_threshold ?? 5)
  ).length;
  const inStockCount = items.filter(
    (i) => (i.stock_quantity ?? 0) > (i.low_stock_threshold ?? 5)
  ).length;

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Inventory</span>
          </div>
          <h1 className="page-title">Inventory & Stock Control</h1>
          <p className="page-subtitle">
            Real-time SKU stock levels, low-stock thresholds, and auditable stock adjustment logs.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="view-switch-tabs">
          <button
            type="button"
            className={`view-tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Stock Levels
          </button>
          <button
            type="button"
            className={`view-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Log
          </button>
        </div>
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

      {/* KPI Overview Cards (Visible when in stock view) */}
      {activeTab === 'inventory' && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon total">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Total SKUs Listed</span>
              <strong className="kpi-value">{pagination.total}</strong>
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setStatusFilter('out_of_stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon danger">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Out of Stock (Depleted)</span>
              <strong className="kpi-value text-danger">{outOfStockCount}</strong>
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setStatusFilter('low_stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon warning">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Low Stock (Needs Reorder)</span>
              <strong className="kpi-value text-warning">{lowStockCount}</strong>
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setStatusFilter('in_stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon success">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Healthy Stock</span>
              <strong className="kpi-value text-success">{inStockCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TABLE VIEW */}
      {activeTab === 'inventory' && (
        <>
          {/* Filters Bar */}
          <div className="filters-card">
            <form
              className="search-row"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                refreshInventory();
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
                  placeholder="Search by SKU, product name, or variant..."
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
                <div className="filter-group">
                  <label htmlFor={statusFilterId} className="sr-only">
                    Stock Health Status
                  </label>
                  <select
                    id={statusFilterId}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Stock Levels</option>
                    <option value="out_of_stock">Out of Stock (0)</option>
                    <option value="low_stock">Low Stock (≤ Threshold)</option>
                    <option value="in_stock">In Stock (&gt; Threshold)</option>
                  </select>
                </div>

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

                <button type="submit" className="btn-search">
                  Filter
                </button>
              </div>
            </form>
          </div>

          {/* Inventory Table Card */}
          <div className="table-card">
            {loading ? (
              <div className="table-loading">
                <div className="spinner" />
                <p>Loading inventory items...</p>
              </div>
            ) : items.length === 0 ? (
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
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <h3>No inventory items match your criteria</h3>
                <p>Try clearing filters or search terms.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('');
                    setConditionFilter('');
                    setPage(1);
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Variant / SKU</th>
                        <th>Product Details</th>
                        <th>Condition</th>
                        <th>Unit Price</th>
                        <th>Stock Health</th>
                        <th>Current Stock</th>
                        <th>Alert Threshold</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const stock = item.stock_quantity ?? 0;
                        const threshold = item.low_stock_threshold ?? 5;
                        const isDepleted = stock <= 0;
                        const isLow = stock > 0 && stock <= threshold;

                        return (
                          <tr key={item.variant_id}>
                            <td>
                              <div className="variant-cell">
                                <code className="sku-tag">{item.sku}</code>
                                <span className="variant-label">{item.variant_label}</span>
                                {item.is_default && <span className="default-pill">Default</span>}
                              </div>
                            </td>
                            <td>
                              <div className="prod-cell">
                                <Link
                                  href={`/admin/products?search=${encodeURIComponent(item.sku)}`}
                                  className="prod-name-link"
                                >
                                  {item.product_name}
                                </Link>
                                <div className="prod-meta">
                                  <span>{item.category_name}</span>
                                  {item.brand_name && (
                                    <span className="brand-dot">• {item.brand_name}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`condition-pill ${item.condition === 'used' ? 'used' : 'new'}`}
                              >
                                {item.condition === 'used' ? 'Used' : 'New'}
                              </span>
                            </td>
                            <td>
                              <strong>{parseFloat(item.price).toLocaleString()} EGP</strong>
                            </td>
                            <td>
                              {isDepleted ? (
                                <span className="stock-badge depleted">Out of Stock</span>
                              ) : isLow ? (
                                <span className="stock-badge low">Low Stock</span>
                              ) : (
                                <span className="stock-badge healthy">In Stock</span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`stock-number ${isDepleted ? 'num-depleted' : isLow ? 'num-low' : 'num-healthy'}`}
                              >
                                {stock}
                              </span>
                            </td>
                            <td>
                              <div className="threshold-cell">
                                <span>{threshold} units</span>
                                <button
                                  type="button"
                                  className="btn-link-sm"
                                  onClick={() => openThresholdModal(item)}
                                  title="Edit low stock alert threshold"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  type="button"
                                  className="btn-action adjust"
                                  onClick={() => openAdjustModal(item)}
                                  title="Adjust Stock Quantity with Audited Reason"
                                >
                                  Adjust Stock
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="pagination-bar">
                  <span className="page-summary">
                    Showing <strong>{(pagination.page - 1) * pagination.pageSize + 1}</strong> to{' '}
                    <strong>
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                    </strong>{' '}
                    of <strong>{pagination.total}</strong> SKUs
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
        </>
      )}

      {/* AUDIT LOG VIEW */}
      {activeTab === 'audit' && (
        <div className="table-card">
          <div
            className="pane-header-actions"
            style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Inventory Audit Trail
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Permanent chronological record of all stock additions, deductions, and recount
                corrections.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={refreshAudit}
              disabled={auditLoading}
            >
              {auditLoading ? 'Refreshing...' : 'Refresh Logs'}
            </button>
          </div>

          {auditLoading ? (
            <div className="table-loading">
              <div className="spinner" />
              <p>Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="empty-table-state">
              <p>No inventory adjustments recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>SKU & Product</th>
                      <th>Staff Member</th>
                      <th>Adjustment Delta</th>
                      <th>Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const delta = log.quantity_delta ?? 0;
                      const isPositive = delta > 0;

                      return (
                        <tr key={log.id}>
                          <td>
                            <div className="timestamp-cell">
                              <strong>{new Date(log.created_at).toLocaleDateString()}</strong>
                              <span className="time-sub">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="prod-cell">
                              <code className="sku-tag">{log.variant?.sku || 'UNKNOWN'}</code>
                              <span className="prod-name-link">
                                {log.variant?.product_name || log.variant?.variant_label}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="user-cell">
                              <strong>{log.admin_user?.name || 'Staff User'}</strong>
                              <span className="email-sub">
                                {log.admin_user?.email || 'admin@pixelstore.com'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`delta-badge ${isPositive ? 'delta-positive' : 'delta-negative'}`}
                            >
                              {isPositive ? `+${delta}` : delta}
                            </span>
                          </td>
                          <td>
                            <span className="reason-text">{log.reason}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Audit Pagination */}
              <div className="pagination-bar">
                <span className="page-summary">
                  Page <strong>{auditPagination.page}</strong> of{' '}
                  <strong>{auditPagination.totalPages || 1}</strong> ({auditPagination.total} total
                  logs)
                </span>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={auditPagination.page <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={auditPagination.page >= auditPagination.totalPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustModalOpen && selectedItem && (
        <div className="modal-backdrop" onClick={() => setAdjustModalOpen(false)}>
          <div
            className="modal-container modal-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2>Adjust Inventory Stock</h2>
                <p className="modal-desc">
                  {selectedItem.product_name} ({selectedItem.sku})
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setAdjustModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {adjustError && (
              <div className="modal-alert-error" role="alert">
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="modal-form-body">
              <div className="item-summary-box">
                <div className="summary-row">
                  <span>Variant:</span>
                  <strong>{selectedItem.variant_label}</strong>
                </div>
                <div className="summary-row">
                  <span>SKU:</span>
                  <code>{selectedItem.sku}</code>
                </div>
                <div className="summary-row">
                  <span>Current Physical Stock:</span>
                  <strong className="stock-highlight">
                    {selectedItem.stock_quantity ?? 0} units
                  </strong>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Quantity Delta (+ or -) <span className="req">*</span>
                </label>
                <div className="quick-delta-row">
                  {[-10, -5, -1, 1, 5, 10, 50].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn-quick-delta ${d > 0 ? 'pos' : 'neg'}`}
                      onClick={() => setQuantityDelta(String(d))}
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  placeholder="e.g. +10 or -3"
                  value={quantityDelta}
                  onChange={(e) => setQuantityDelta(e.target.value)}
                />
                <span className="field-hint">
                  Enter a positive number to add stock (e.g. shipment received), or a negative
                  number to reduce stock (e.g. damaged goods).
                </span>
              </div>

              {/* Live Preview Calculation */}
              {quantityDelta && !isNaN(parseInt(quantityDelta, 10)) && (
                <div
                  className={`preview-calc-box ${selectedItem.stock_quantity + parseInt(quantityDelta, 10) < 0 ? 'invalid' : ''}`}
                >
                  <div className="calc-line">
                    <span>Current ({selectedItem.stock_quantity ?? 0})</span>
                    <span>
                      {parseInt(quantityDelta, 10) >= 0 ? '+' : ''}
                      {parseInt(quantityDelta, 10)}
                    </span>
                    <span>=</span>
                    <strong>
                      Resulting Stock: {selectedItem.stock_quantity + parseInt(quantityDelta, 10)}{' '}
                      units
                    </strong>
                  </div>
                  {selectedItem.stock_quantity + parseInt(quantityDelta, 10) < 0 && (
                    <span className="calc-warning">Stock cannot drop below zero.</span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>
                  Mandatory Reason for Audit Log <span className="req">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. New shipment PO-4091 from El-Bostan distributor, or damage write-off"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  maxLength={300}
                />
                <span className="field-hint">
                  {300 - adjustReason.length} characters remaining. This reason is permanently
                  recorded.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAdjustModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    adjustSubmitting ||
                    !quantityDelta ||
                    parseInt(quantityDelta, 10) === 0 ||
                    (selectedItem.stock_quantity ?? 0) + parseInt(quantityDelta, 10) < 0 ||
                    !adjustReason.trim()
                  }
                >
                  {adjustSubmitting ? 'Recording Adjustment...' : 'Commit Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THRESHOLD MANAGEMENT MODAL */}
      {thresholdModalOpen && thresholdItem && (
        <div className="modal-backdrop" onClick={() => setThresholdModalOpen(false)}>
          <div
            className="modal-container modal-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2>Manage Low Stock Alert Threshold</h2>
                <p className="modal-desc">
                  {thresholdItem.product_name} ({thresholdItem.sku})
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setThresholdModalOpen(false)}
              >
                ×
              </button>
            </div>

            {thresholdError && (
              <div className="modal-alert-error" role="alert">
                <span>{thresholdError}</span>
              </div>
            )}

            <form onSubmit={handleThresholdSubmit} className="modal-form-body">
              <div className="form-group">
                <label>
                  Low Stock Threshold (Units) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                />
                <span className="field-hint">
                  When stock falls at or below this number, the product will be highlighted in the
                  Low Stock queue.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setThresholdModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={thresholdSubmitting}>
                  {thresholdSubmitting ? 'Saving...' : 'Update Threshold'}
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

        .view-switch-tabs {
          display: flex;
          background: #e2e8f0;
          padding: 0.25rem;
          border-radius: 8px;
          gap: 0.25rem;
        }

        .view-tab {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .view-tab.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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

        /* KPI Cards */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          transition:
            transform 0.15s ease,
            border-color 0.15s ease;
        }

        .kpi-card:hover {
          transform: translateY(-1px);
          border-color: #cbd5e1;
        }

        .kpi-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .kpi-icon.total {
          background: #f0f9ff;
          color: #0284c7;
        }
        .kpi-icon.danger {
          background: #fef2f2;
          color: #dc2626;
        }
        .kpi-icon.warning {
          background: #fffbeb;
          color: #d97706;
        }
        .kpi-icon.success {
          background: #e8f3ed;
          color: #1b7a48;
        }

        .kpi-data {
          display: flex;
          flex-direction: column;
        }

        .kpi-label {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        .kpi-value {
          font-size: 1.4rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .text-danger {
          color: #dc2626;
        }
        .text-warning {
          color: #d97706;
        }
        .text-success {
          color: #1b7a48;
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
        }

        .search-box input:focus {
          border-color: #0284c7;
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
          gap: 0.5rem;
          flex-wrap: wrap;
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
          margin: 0 0 0.5rem 0;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .inventory-table th {
          background: #f8fafc;
          padding: 0.85rem 1.25rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }

        .inventory-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .inventory-table tr:hover td {
          background: #f8fafc;
        }

        /* Cells */
        .variant-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .sku-tag {
          font-family: monospace;
          font-size: 0.8rem;
          font-weight: 700;
          background: #f1f5f9;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          color: #0f172a;
          width: fit-content;
        }

        .variant-label {
          font-size: 0.85rem;
          color: #475569;
        }

        .default-pill {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          width: fit-content;
        }

        .prod-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .prod-name-link {
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
        }

        .prod-name-link:hover {
          color: #0284c7;
          text-decoration: underline;
        }

        .prod-meta {
          font-size: 0.8rem;
          color: #64748b;
        }

        .brand-dot {
          margin-left: 0.3rem;
        }

        .condition-pill {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          text-transform: uppercase;
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

        .stock-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        .stock-badge.depleted {
          background: #fef2f2;
          color: #b91c1c;
        }
        .stock-badge.low {
          background: #fffbeb;
          color: #b45309;
        }
        .stock-badge.healthy {
          background: #e8f3ed;
          color: #1b7a48;
        }

        .stock-number {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .num-depleted {
          color: #dc2626;
        }
        .num-low {
          color: #d97706;
        }
        .num-healthy {
          color: #1b7a48;
        }

        .threshold-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-link-sm {
          background: transparent;
          border: none;
          color: #0284c7;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
        }

        .btn-action.adjust {
          padding: 0.45rem 0.85rem;
          background: #0284c7;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-action.adjust:hover {
          background: #0369a1;
        }

        /* Audit Cells */
        .timestamp-cell {
          display: flex;
          flex-direction: column;
          font-size: 0.85rem;
        }

        .time-sub {
          font-size: 0.75rem;
          color: #64748b;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
          font-size: 0.85rem;
        }

        .email-sub {
          font-size: 0.75rem;
          color: #64748b;
        }

        .delta-badge {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 700;
          font-family: monospace;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        .delta-positive {
          background: #e8f3ed;
          color: #1b7a48;
        }

        .delta-negative {
          background: #fef2f2;
          color: #b91c1c;
        }

        .reason-text {
          font-size: 0.85rem;
          color: #334155;
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
          max-width: 520px;
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
          gap: 1.25rem;
        }

        .item-summary-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.875rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          color: #64748b;
        }

        .summary-row strong {
          color: #0f172a;
        }

        .stock-highlight {
          color: #0284c7 !important;
          font-size: 1rem;
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
        .form-group textarea {
          padding: 0.6rem 0.8rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #0284c7;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .quick-delta-row {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
          margin-bottom: 0.35rem;
        }

        .btn-quick-delta {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
        }

        .btn-quick-delta.pos {
          color: #1b7a48;
          border-color: #c2e2d0;
          background: #e8f3ed;
        }

        .btn-quick-delta.neg {
          color: #dc2626;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .preview-calc-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #166534;
        }

        .preview-calc-box.invalid {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .calc-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .calc-warning {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-primary {
          background: #0284c7;
          color: #ffffff;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0369a1;
        }

        .btn-primary:disabled {
          opacity: 0.5;
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

        .btn-secondary:hover:not(:disabled) {
          background: #f8fafc;
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
