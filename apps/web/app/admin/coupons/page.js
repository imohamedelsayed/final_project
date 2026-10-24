'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'inactive' | 'expired'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [minimumSubtotal, setMinimumSubtotal] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [globalUsageLimit, setGlobalUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Deletion Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Form Field Accessible IDs
  const codeInputId = useId();
  const discountTypeSelectId = useId();
  const discountValueInputId = useId();
  const minSubtotalInputId = useId();
  const startsAtInputId = useId();
  const endsAtInputId = useId();
  const globalLimitInputId = useId();
  const perCustomerLimitInputId = useId();
  const activeCheckboxId = useId();

  useEffect(() => {
    let ignore = false;
    async function loadCoupons() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getAdminCoupons({ page, pageSize: 50 });
        if (!ignore) {
          setCoupons(res.items || []);
          if (res.pagination) {
            setPagination(res.pagination);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load coupons.');
          setLoading(false);
        }
      }
    }

    loadCoupons();
    return () => {
      ignore = true;
    };
  }, [page, refreshKey]);

  // Derived filtered coupons
  const now = new Date();
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      !search.trim() || coupon.code.toLowerCase().includes(search.trim().toLowerCase());
    if (!matchesSearch) return false;

    if (!statusFilter) return true;
    const isExpired = new Date(coupon.ends_at) < now;
    if (statusFilter === 'active') return coupon.is_active && !isExpired;
    if (statusFilter === 'inactive') return !coupon.is_active;
    if (statusFilter === 'expired') return isExpired;
    return true;
  });

  // Stats calculation
  const totalCouponsCount = coupons.length;
  const activeCouponsCount = coupons.filter(
    (c) => c.is_active && new Date(c.ends_at) >= now
  ).length;
  const totalRedemptionsCount = coupons.reduce(
    (acc, c) => acc + (c.active_redemptions_count || 0),
    0
  );

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinimumSubtotal('');
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setStartsAt(today.toISOString().slice(0, 16));
    setEndsAt(nextMonth.toISOString().slice(0, 16));
    setGlobalUsageLimit('');
    setPerCustomerLimit('');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code || '');
    setDiscountType(coupon.discount_type || 'percentage');
    setDiscountValue(coupon.discount_value ? String(coupon.discount_value) : '');
    setMinimumSubtotal(
      coupon.minimum_subtotal !== null && coupon.minimum_subtotal !== undefined
        ? String(coupon.minimum_subtotal)
        : ''
    );
    setStartsAt(formatDateForInput(coupon.starts_at));
    setEndsAt(formatDateForInput(coupon.ends_at));
    setGlobalUsageLimit(coupon.global_usage_limit ? String(coupon.global_usage_limit) : '');
    setPerCustomerLimit(coupon.per_customer_limit ? String(coupon.per_customer_limit) : '');
    setIsActive(coupon.is_active ?? true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Coupon code is required.');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(cleanCode)) {
      setFormError(
        'Coupon code must contain only alphanumeric characters, dashes, or underscores.'
      );
      return;
    }

    const numValue = parseFloat(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      setFormError('Discount value must be a positive number.');
      return;
    }
    if (discountType === 'percentage' && numValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    if (!endsAt) {
      setFormError('Expiration date is required.');
      return;
    }

    if (startsAt && new Date(endsAt) <= new Date(startsAt)) {
      setFormError('End date must be chronologically after the start date.');
      return;
    }

    const payload = {
      code: cleanCode,
      discount_type: discountType,
      discount_value: numValue,
      minimum_subtotal: minimumSubtotal ? parseFloat(minimumSubtotal) : null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: new Date(endsAt).toISOString(),
      global_usage_limit: globalUsageLimit ? parseInt(globalUsageLimit, 10) : null,
      per_customer_limit: perCustomerLimit ? parseInt(perCustomerLimit, 10) : null,
      is_active: Boolean(isActive)
    };

    try {
      setFormSubmitting(true);
      if (editingCoupon) {
        await api.updateAdminCoupon(editingCoupon.id, payload);
        setActionSuccess(`Coupon "${cleanCode}" updated successfully.`);
      } else {
        await api.createAdminCoupon(payload);
        setActionSuccess(`Coupon "${cleanCode}" created successfully.`);
      }
      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err.message || 'Failed to save coupon.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await api.updateAdminCoupon(coupon.id, { is_active: !coupon.is_active });
      setActionSuccess(
        `Coupon "${coupon.code}" ${coupon.is_active ? 'deactivated' : 'activated'} successfully.`
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to update coupon status.');
    }
  };

  const openDeleteModal = (coupon) => {
    setDeletingCoupon(coupon);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCoupon) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await api.deleteAdminCoupon(deletingCoupon.id);
      setActionSuccess(`Coupon "${deletingCoupon.code}" deleted successfully.`);
      setDeleteModalOpen(false);
      setDeletingCoupon(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err.code === 'COUPON_IN_USE' || err.status === 409) {
        setDeleteError(
          'This coupon cannot be deleted because it is linked to orders. You can deactivate it instead.'
        );
      } else {
        setDeleteError(err.message || 'Failed to delete coupon.');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="coupons-management">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-text">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Coupons</span>
          </nav>
          <h1 className="page-title">Discount Coupons</h1>
          <p className="page-subtitle">
            Manage promotional discount codes, validity periods, minimum thresholds, and usage
            limits.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            id="create-coupon-btn"
            onClick={openCreateModal}
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
            Create Coupon
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Coupons</span>
          <span className="kpi-value">{totalCouponsCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active & Valid</span>
          <span className="kpi-value text-success">{activeCouponsCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Redemptions</span>
          <span className="kpi-value text-accent">{totalRedemptionsCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Policy Rule</span>
          <span className="kpi-subtext">Counted at Admin Order Confirmation</span>
        </div>
      </div>

      {/* Action Banner */}
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

      {/* Controls Bar */}
      <div className="controls-card">
        <div className="search-box">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="coupon-search-input"
            placeholder="Search coupon code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="coupon-status-filter" className="filter-label">
            Status:
          </label>
          <select
            id="coupon-status-filter"
            className="select-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Coupons</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading coupons list...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <h3>No coupons found</h3>
            <p>Try adjusting your search criteria or create a new coupon code.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Subtotal</th>
                  <th>Validity Window</th>
                  <th>Usage (Used / Limit)</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const isExpired = new Date(coupon.ends_at) < now;
                  return (
                    <tr key={coupon.id}>
                      <td>
                        <span className="code-badge">{coupon.code}</span>
                      </td>
                      <td>
                        <span className="discount-tag">
                          {coupon.discount_type === 'percentage'
                            ? `${Number(coupon.discount_value)}% OFF`
                            : `EGP ${Number(coupon.discount_value).toFixed(2)} OFF`}
                        </span>
                      </td>
                      <td>
                        {coupon.minimum_subtotal !== null && coupon.minimum_subtotal !== undefined
                          ? `EGP ${Number(coupon.minimum_subtotal).toFixed(2)}`
                          : 'No Minimum'}
                      </td>
                      <td>
                        <div className="date-range">
                          <span className="date-item">
                            From:{' '}
                            {coupon.starts_at
                              ? new Date(coupon.starts_at).toLocaleDateString()
                              : 'Immediate'}
                          </span>
                          <span className="date-item">
                            To: {new Date(coupon.ends_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="usage-stats">
                          <strong>{coupon.active_redemptions_count || 0}</strong>
                          <span className="text-muted">
                            {coupon.global_usage_limit ? ` / ${coupon.global_usage_limit}` : ' / ∞'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {isExpired ? (
                          <span className="badge badge-expired">Expired</span>
                        ) : coupon.is_active ? (
                          <span className="badge badge-active">Active</span>
                        ) : (
                          <span className="badge badge-inactive">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-icon"
                            title={coupon.is_active ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggleActive(coupon)}
                            aria-label={coupon.is_active ? 'Deactivate coupon' : 'Activate coupon'}
                          >
                            {coupon.is_active ? (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                              </svg>
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit Coupon"
                            onClick={() => openEditModal(coupon)}
                            aria-label="Edit coupon"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Delete Coupon"
                            onClick={() => openDeleteModal(coupon)}
                            aria-label="Delete coupon"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
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
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} coupons)
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor={codeInputId} className="form-label">
                    Coupon Code *
                  </label>
                  <input
                    id={codeInputId}
                    type="text"
                    className="form-input text-uppercase"
                    placeholder="e.g. SUMMER2026, RTX10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                  <small className="form-help">
                    Must be alphanumeric (hyphens and underscores allowed).
                  </small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={discountTypeSelectId} className="form-label">
                      Discount Type *
                    </label>
                    <select
                      id={discountTypeSelectId}
                      className="form-input"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (EGP)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor={discountValueInputId} className="form-label">
                      Discount Value *
                    </label>
                    <input
                      id={discountValueInputId}
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={discountType === 'percentage' ? 100 : undefined}
                      className="form-input"
                      placeholder={discountType === 'percentage' ? 'e.g. 15 for 15%' : 'e.g. 500'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor={minSubtotalInputId} className="form-label">
                    Minimum Cart Subtotal (EGP)
                  </label>
                  <input
                    id={minSubtotalInputId}
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 5000 (leave blank for no minimum)"
                    value={minimumSubtotal}
                    onChange={(e) => setMinimumSubtotal(e.target.value)}
                  />
                  <small className="form-help">Applies before shipping fees are calculated.</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={startsAtInputId} className="form-label">
                      Valid From (Optional)
                    </label>
                    <input
                      id={startsAtInputId}
                      type="datetime-local"
                      className="form-input"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={endsAtInputId} className="form-label">
                      Valid Until (Expiration) *
                    </label>
                    <input
                      id={endsAtInputId}
                      type="datetime-local"
                      className="form-input"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={globalLimitInputId} className="form-label">
                      Global Usage Limit
                    </label>
                    <input
                      id={globalLimitInputId}
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      placeholder="e.g. 100 (leave blank for unlimited)"
                      value={globalUsageLimit}
                      onChange={(e) => setGlobalUsageLimit(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={perCustomerLimitInputId} className="form-label">
                      Per Customer Limit
                    </label>
                    <input
                      id={perCustomerLimitInputId}
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      placeholder="e.g. 1 per customer"
                      value={perCustomerLimit}
                      onChange={(e) => setPerCustomerLimit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-checkbox">
                  <input
                    id={activeCheckboxId}
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor={activeCheckboxId}>Active (coupon can currently be applied)</label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-coupon-btn"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingCoupon && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h2>Confirm Deletion</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setDeleteModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {deleteError ? (
                <div className="alert alert-danger" role="alert">
                  {deleteError}
                </div>
              ) : (
                <p>
                  Are you sure you want to permanently delete coupon{' '}
                  <strong>{deletingCoupon.code}</strong>?
                </p>
              )}
              <p className="text-muted small" style={{ marginTop: '0.5rem' }}>
                Coupons that have been used in past customer orders cannot be deleted and should
                instead be deactivated.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="confirm-delete-coupon-btn"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .coupons-management {
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
          flex-direction: column;
          gap: 0.35rem;
        }

        .kpi-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #52605d;
        }

        .kpi-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #121e1b;
        }

        .kpi-subtext {
          font-size: 0.85rem;
          color: #475569;
          font-weight: 500;
        }

        .text-success {
          color: #1b7a48;
        }

        .text-accent {
          color: #153f3a;
        }

        .controls-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
          color: #94a3b8;
        }

        .search-box svg {
          position: absolute;
          left: 0.85rem;
          pointer-events: none;
        }

        .search-box input {
          width: 100%;
          padding: 0.6rem 2.2rem 0.6rem 2.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #f8fafc;
        }

        .search-box input:focus {
          outline: none;
          border-color: #0d9488;
          background: #ffffff;
        }

        .clear-search {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          font-size: 1.2rem;
          color: #94a3b8;
          cursor: pointer;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .filter-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #475569;
        }

        .select-input {
          padding: 0.55rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          font-size: 0.88rem;
          color: #0f172a;
          cursor: pointer;
        }

        .select-input:focus {
          outline: none;
          border-color: #0d9488;
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
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.8rem;
        }

        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          color: #1e293b;
        }

        .data-table tr:hover td {
          background: #f8fafc;
        }

        .code-badge {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.95rem;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          color: #0f172a;
        }

        .discount-tag {
          font-weight: 600;
          color: #153f3a;
        }

        .date-range {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.8rem;
          color: #475569;
        }

        .usage-stats {
          font-size: 0.88rem;
        }

        .text-muted {
          color: #94a3b8;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .badge-active {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .badge-expired {
          background: #fee2e2;
          color: #b91c1c;
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

        .btn-icon:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .btn-icon-danger:hover {
          background: #fee2e2;
          border-color: #fca5a5;
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

        .close-btn:hover {
          opacity: 1;
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
          max-width: 620px;
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

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
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

        .text-uppercase {
          text-transform: uppercase;
        }

        .form-help {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.3rem;
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .form-checkbox input {
          width: 17px;
          height: 17px;
          cursor: pointer;
        }

        .form-checkbox label {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
