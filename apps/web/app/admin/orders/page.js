'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get('status') || '';
  const initialId = searchParams?.get('id') || '';

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Order for Inspection Drawer / Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Shipping Fee Input State
  const [shippingFeeInput, setShippingFeeInput] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getAdminOrders(params);
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load order queue.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Check auth and initial load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const me = await api.getMe();
        if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) {
          router.replace('/login');
          return;
        }
        if (!ignore) {
          setUser(me);
          const params = {};
          if (statusFilter) params.status = statusFilter;
          if (searchQuery.trim()) params.search = searchQuery.trim();
          const res = await api.getAdminOrders(params);
          setOrders(res.orders || []);
          setLoading(false);
          if (initialId) {
            openOrderDetail(initialId);
          }
        }
      } catch (err) {
        if (!ignore) {
          if (
            err.status === 401 ||
            err.code === 'UNAUTHORIZED' ||
            err.status === 403 ||
            err.code === 'FORBIDDEN'
          ) {
            router.replace('/login');
            return;
          }
          setError(err.message || 'Failed to load order queue.');
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [router, statusFilter, searchQuery, initialId]);

  async function openOrderDetail(orderId) {
    try {
      setActionError(null);
      setActionSuccess(null);
      setShowCancelModal(false);
      const order = await api.getAdminOrder(orderId);
      setSelectedOrder(order);
      setShippingFeeInput(order.shipping_fee ? String(order.shipping_fee) : '50');
    } catch (err) {
      setActionError(`Failed to load order details: ${err.message}`);
    }
  }

  // Admin Actions
  async function handleSetFinalTotal(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    const fee = parseFloat(shippingFeeInput);
    if (isNaN(fee) || fee < 0) {
      setActionError('Shipping fee must be a valid number greater than or equal to 0.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const updated = await api.setAdminFinalTotal(selectedOrder.id, fee);
      setSelectedOrder(updated);
      setActionSuccess(
        `Final total updated to EGP ${Number(updated.final_total).toFixed(2)}. 24-hour expiry started.`
      );
      fetchOrders();
    } catch (err) {
      setActionError(err.message || 'Failed to update final total.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecordAgreement() {
    if (!selectedOrder) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const updated = await api.recordCustomerAgreement(
        selectedOrder.id,
        selectedOrder.pricing_version
      );
      setSelectedOrder(updated);
      setActionSuccess(
        `Customer agreement recorded for pricing version ${updated.pricing_version}.`
      );
      fetchOrders();
    } catch (err) {
      setActionError(err.message || 'Failed to record customer agreement.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmOrder() {
    if (!selectedOrder) return;

    const confirmPrompt = window.confirm(
      `Confirm order #${selectedOrder.order_number}? This will transactionally deduct inventory and redeem any applied coupons.`
    );
    if (!confirmPrompt) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const confirmed = await api.confirmAdminOrder(selectedOrder.id);
      setSelectedOrder(confirmed);
      setActionSuccess('Order confirmed successfully! Stock deducted and coupon redeemed.');
      fetchOrders();
    } catch (err) {
      setActionError(err.message || 'Failed to confirm order.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusTransition(newStatus) {
    if (!selectedOrder) return;

    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const updated = await api.transitionAdminOrderStatus(
        selectedOrder.id,
        newStatus,
        cancellationReason.trim() || undefined
      );
      setSelectedOrder(updated);
      setShowCancelModal(false);
      setCancellationReason('');
      setActionSuccess(`Order status transitioned to ${newStatus}.`);
      fetchOrders();
    } catch (err) {
      setActionError(err.message || `Failed to transition order to ${newStatus}.`);
    } finally {
      setActionLoading(false);
    }
  }

  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
    confirmed: { bg: '#dbeafe', text: '#1e40af', label: 'Confirmed' },
    processing: { bg: '#f3e8ff', text: '#6b21a8', label: 'Processing' },
    delivered: { bg: '#dcfce7', text: '#166534', label: 'Delivered' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' },
    expired: { bg: '#f3f4f6', text: '#4b5563', label: 'Expired' }
  };

  if (!user) {
    if (error) {
      return (
        <div className="admin-orders-page" style={{ padding: '2rem' }}>
          <div className="error-banner">
            <span>{error}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="admin-loading">
        <p>Verifying admin permissions...</p>
      </div>
    );
  }

  return (
    <div className="admin-orders-page">
      <div className="admin-header">
        <div>
          <span className="admin-badge">Staff Administration • {user.role.toUpperCase()}</span>
          <h1>Orders & Operations Queue</h1>
          <p>
            Review customer orders, dispatch final totals, record customer agreement, and confirm
            shipments.
          </p>
        </div>

        <Link href="/" className="btn-storefront">
          ← View Storefront
        </Link>
      </div>

      {/* Queue Filter Tabs & Search Bar */}
      <div className="queue-controls-card">
        <div className="status-tabs">
          {[
            { id: '', label: 'All Orders' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'processing', label: 'Processing' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'expired', label: 'Expired' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrders();
          }}
          className="search-row"
        >
          <input
            type="search"
            placeholder="Search by order #, recipient name, or mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-search">
            Search
          </button>
          {(statusFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                setSearchQuery('');
              }}
              className="btn-clear"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="error-banner">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading order queue...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>No orders match the selected filters.</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Date</th>
                <th>Customer / Recipient</th>
                <th>Mobile</th>
                <th>Governorate</th>
                <th>Subtotal</th>
                <th>Final Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const statusStyle = statusColors[ord.status] || {
                  bg: '#f3f4f6',
                  text: '#374151',
                  label: ord.status
                };

                return (
                  <tr key={ord.id} className={ord.needs_final_total ? 'row-highlight' : ''}>
                    <td className="ref-cell">
                      <strong>{ord.order_number}</strong>
                      {ord.needs_final_total && (
                        <span className="mini-pill warn">Needs Final Total</span>
                      )}
                      {ord.is_overdue && <span className="mini-pill danger">Overdue</span>}
                    </td>
                    <td className="date-cell">
                      {new Date(ord.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>{ord.address?.recipient_name || ord.user?.name || 'Customer'}</td>
                    <td>{ord.address?.mobile || 'N/A'}</td>
                    <td>{ord.address?.governorate || 'N/A'}</td>
                    <td>
                      EGP{' '}
                      {Number(ord.subtotal).toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {ord.final_total !== null ? (
                        <strong>
                          EGP{' '}
                          {Number(ord.final_total).toLocaleString('en-EG', {
                            minimumFractionDigits: 2
                          })}
                        </strong>
                      ) : (
                        <span className="pending-text">Pending</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openOrderDetail(ord.id)}
                        className="btn-inspect"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detailed Order Inspection Drawer / Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">Order Inspection</span>
                <h2>Order #{selectedOrder.order_number}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn-close-modal"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="action-error-banner">
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="action-success-banner">
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="modal-body">
              {/* Order Status & Key Metadata */}
              <div className="detail-meta-grid">
                <div className="meta-card">
                  <span className="meta-label">Current Status</span>
                  <span
                    className="status-pill"
                    style={{
                      backgroundColor: statusColors[selectedOrder.status]?.bg || '#eee',
                      color: statusColors[selectedOrder.status]?.text || '#333'
                    }}
                  >
                    ● {statusColors[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>

                <div className="meta-card">
                  <span className="meta-label">Pricing Version</span>
                  <strong>v{selectedOrder.pricing_version}</strong>
                  <span className="meta-sub">
                    {selectedOrder.customer_agreed_at ? (
                      <span style={{ color: '#16a34a' }}>
                        Customer agreed (v{selectedOrder.agreed_pricing_version})
                      </span>
                    ) : (
                      <span style={{ color: '#d97706' }}>Customer agreement pending</span>
                    )}
                  </span>
                </div>

                <div className="meta-card">
                  <span className="meta-label">Final Total Sent</span>
                  <span>
                    {selectedOrder.final_total_sent_at
                      ? new Date(selectedOrder.final_total_sent_at).toLocaleString('en-GB')
                      : 'Not sent yet'}
                  </span>
                </div>

                <div className="meta-card">
                  <span className="meta-label">Expires At (24h Window)</span>
                  <span
                    style={{
                      color:
                        selectedOrder.expires_at && new Date(selectedOrder.expires_at) < new Date()
                          ? '#dc2626'
                          : 'inherit'
                    }}
                  >
                    {selectedOrder.expires_at
                      ? new Date(selectedOrder.expires_at).toLocaleString('en-GB')
                      : 'Clock starts when final total is sent'}
                  </span>
                </div>
              </div>

              {/* Items Snapshot Table */}
              <div className="section-block">
                <h3>Immutable Order Items Snapshot</h3>
                <div className="items-list-box">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="item-detail-row">
                      <div>
                        <strong>{item.product_name_snapshot}</strong>
                        <div className="item-sub">
                          SKU: {item.sku_snapshot} • {item.variant_snapshot} • Condition:{' '}
                          {item.condition_snapshot}
                        </div>
                      </div>
                      <div className="item-calc">
                        {item.quantity} × EGP {Number(item.unit_price).toFixed(2)} ={' '}
                        <strong>EGP {Number(item.line_total).toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="totals-summary-box">
                  <div className="t-row">
                    <span>Subtotal:</span>
                    <span>EGP {Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="t-row discount">
                      <span>
                        Coupon Discount ({selectedOrder.coupon_code_snapshot || 'Promo'}):
                      </span>
                      <span>-EGP {Number(selectedOrder.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="t-row">
                    <span>Shipping Fee:</span>
                    <span>
                      {selectedOrder.shipping_fee !== null
                        ? `EGP ${Number(selectedOrder.shipping_fee).toFixed(2)}`
                        : 'Pending'}
                    </span>
                  </div>
                  <div className="t-row total">
                    <strong>Final Order Total:</strong>
                    <strong>
                      {selectedOrder.final_total !== null
                        ? `EGP ${Number(selectedOrder.final_total).toFixed(2)}`
                        : 'Pending'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Delivery Address Snapshot */}
              <div className="section-block">
                <h3>Delivery Address Snapshot</h3>
                {selectedOrder.address ? (
                  <div className="address-details-box">
                    <p>
                      <strong>Recipient:</strong> {selectedOrder.address.recipient_name}
                    </p>
                    <p>
                      <strong>Mobile:</strong> {selectedOrder.address.mobile}
                    </p>
                    <p>
                      <strong>Address:</strong> {selectedOrder.address.street}, Bldg{' '}
                      {selectedOrder.address.building_number}
                      {selectedOrder.address.floor && `, Floor ${selectedOrder.address.floor}`}
                      {selectedOrder.address.apartment &&
                        `, Apt ${selectedOrder.address.apartment}`}
                    </p>
                    <p>
                      <strong>Area & Governorate:</strong> {selectedOrder.address.area},{' '}
                      {selectedOrder.address.governorate}, Egypt
                    </p>
                    {selectedOrder.address.landmark && (
                      <p>
                        <strong>Landmark:</strong> {selectedOrder.address.landmark}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>No address snapshot available.</p>
                )}
              </div>

              {/* Administrative Workflow Actions */}
              <div className="section-block workflow-actions-box">
                <h3>Administrative Operations</h3>

                {selectedOrder.status === 'pending' && (
                  <div className="workflow-steps">
                    {/* Step 1: Set Shipping Fee & Dispatch Final Total */}
                    <div className="step-card">
                      <h4>1. Dispatch Shipping & Final Total via WhatsApp</h4>
                      <p className="step-desc">
                        Communicate the shipping charge to the customer. Recording this sets the
                        24-hour expiry timer and advances pricing version.
                      </p>
                      <form onSubmit={handleSetFinalTotal} className="shipping-form">
                        <label htmlFor="shipping-fee-input">Shipping Fee (EGP):</label>
                        <input
                          id="shipping-fee-input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={shippingFeeInput}
                          onChange={(e) => setShippingFeeInput(e.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="btn-action primary"
                        >
                          Record Final Total Sent
                        </button>
                      </form>
                    </div>

                    {/* Step 2: Record Customer Agreement */}
                    <div className="step-card">
                      <h4>2. Record Customer Agreement</h4>
                      <p className="step-desc">
                        After the customer confirms approval of the terms and shipping fee on
                        WhatsApp, record their explicit agreement to version{' '}
                        {selectedOrder.pricing_version}.
                      </p>
                      <button
                        type="button"
                        onClick={handleRecordAgreement}
                        disabled={
                          actionLoading ||
                          (selectedOrder.customer_agreed_at &&
                            selectedOrder.agreed_pricing_version === selectedOrder.pricing_version)
                        }
                        className="btn-action secondary"
                      >
                        {selectedOrder.customer_agreed_at &&
                        selectedOrder.agreed_pricing_version === selectedOrder.pricing_version
                          ? '✓ Agreement Recorded'
                          : 'Record Customer Agreement'}
                      </button>
                    </div>

                    {/* Step 3: Transactional Confirmation */}
                    <div className="step-card confirm-step">
                      <h4>3. Confirm Order (Atomic Stock Deduction)</h4>
                      <p className="step-desc">
                        Confirms the order inside one transaction: re-checks current stock,
                        decrements stock atomically, records coupon redemption, and locks state.
                      </p>
                      <button
                        type="button"
                        onClick={handleConfirmOrder}
                        disabled={
                          actionLoading ||
                          !selectedOrder.customer_agreed_at ||
                          selectedOrder.agreed_pricing_version !== selectedOrder.pricing_version ||
                          selectedOrder.final_total === null ||
                          (selectedOrder.expires_at &&
                            new Date(selectedOrder.expires_at) < new Date())
                        }
                        className="btn-action success"
                        id="confirm-order-button"
                      >
                        Confirm Order & Deduct Inventory
                      </button>

                      {(!selectedOrder.customer_agreed_at ||
                        selectedOrder.agreed_pricing_version !== selectedOrder.pricing_version) && (
                        <span className="step-warning">
                          Agreement to version {selectedOrder.pricing_version} required before
                          confirmation.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Transitions for Confirmed/Processing Orders */}
                {selectedOrder.status === 'confirmed' && (
                  <div className="status-transition-actions">
                    <button
                      type="button"
                      onClick={() => handleStatusTransition('processing')}
                      disabled={actionLoading}
                      className="btn-action primary"
                    >
                      Start Processing (Packing)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      className="btn-action danger"
                    >
                      Cancel Order (Restore Stock)
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'processing' && (
                  <div className="status-transition-actions">
                    <button
                      type="button"
                      onClick={() => handleStatusTransition('delivered')}
                      disabled={actionLoading}
                      className="btn-action success"
                    >
                      Mark as Delivered
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      className="btn-action danger"
                    >
                      Cancel Order (Restore Stock)
                    </button>
                  </div>
                )}

                {/* Cancel pending order button */}
                {selectedOrder.status === 'pending' && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      className="btn-action text-danger"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}

                {/* Terminal state label */}
                {['delivered', 'cancelled', 'expired'].includes(selectedOrder.status) && (
                  <p className="terminal-note">
                    This order is in a terminal state ({selectedOrder.status.toUpperCase()}) and
                    cannot be modified further.
                  </p>
                )}

                {/* Cancellation Modal / Reason Prompt */}
                {showCancelModal && (
                  <div className="cancel-sub-box">
                    <h4>Confirm Cancellation</h4>
                    <p>
                      Are you sure you want to cancel this order?{' '}
                      {selectedOrder.stock_deducted_at &&
                        'Deducted inventory will be restored and any coupon redemption will be reversed.'}
                    </p>
                    <textarea
                      placeholder="Enter reason for cancellation..."
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      rows={2}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleStatusTransition('cancelled')}
                        disabled={actionLoading}
                        className="btn-action danger"
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(false)}
                        className="btn-action secondary"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Append-Only Order Events Timeline */}
              <div className="section-block">
                <h3>Order Audit Trail (Events)</h3>
                <div className="events-timeline">
                  {selectedOrder.events?.map((ev) => (
                    <div key={ev.id} className="event-item">
                      <div className="event-dot" />
                      <div className="event-content">
                        <div className="event-header">
                          <strong className="event-type">{ev.event_type.toUpperCase()}</strong>
                          <span className="event-time">
                            {new Date(ev.created_at).toLocaleString('en-GB')}
                          </span>
                        </div>
                        {ev.notes && <p className="event-notes">{ev.notes}</p>}
                        {ev.metadata && (
                          <pre className="event-meta-json">
                            {JSON.stringify(ev.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-orders-page {
          max-width: 1300px;
          margin: 0 auto;
          padding: 2rem 1.5rem 5rem;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .admin-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-primary);
          background: rgba(21, 63, 58, 0.1);
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          letter-spacing: 0.05em;
        }

        .admin-header h1 {
          font-size: 2rem;
          color: var(--color-primary);
          margin: 0 0 0.25rem;
        }

        .admin-header p {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          margin: 0;
        }

        .btn-storefront {
          color: var(--color-primary);
          font-weight: 600;
          text-decoration: none;
          padding: 0.6rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: #fff;
        }

        /* Queue Controls */
        .queue-controls-card {
          background: #fff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        .status-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
        }

        .tab-btn {
          background: none;
          border: 1px solid transparent;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: var(--color-primary);
          background: rgba(21, 63, 58, 0.05);
        }

        .tab-btn.active {
          background: var(--color-primary);
          color: #ffffff;
        }

        .search-row {
          display: flex;
          gap: 0.5rem;
        }

        .search-row input {
          flex: 1;
          padding: 0.65rem 0.9rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }

        .btn-search {
          background: var(--color-primary);
          color: #fff;
          border: none;
          padding: 0.65rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-clear {
          background: #f3f4f6;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          padding: 0.65rem 1rem;
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .error-banner {
          background: #fdf2f2;
          color: #991b1b;
          padding: 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
        }

        /* Table */
        .table-card {
          background: #fff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow-x: auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .orders-table th {
          background: #fcfbf9;
          padding: 1rem 1.25rem;
          font-weight: 600;
          color: var(--color-text-dark);
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }

        .orders-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--color-border);
          vertical-align: middle;
        }

        .row-highlight {
          background: #fffdf5;
        }

        .ref-cell strong {
          color: var(--color-primary);
          display: block;
        }

        .mini-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          margin-top: 0.25rem;
          margin-right: 0.25rem;
        }

        .mini-pill.warn {
          background: #fef3c7;
          color: #b45309;
        }

        .mini-pill.danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .pending-text {
          color: var(--color-text-muted);
          font-style: italic;
        }

        .status-pill {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          white-space: nowrap;
        }

        .btn-inspect {
          background: #f3f4f6;
          border: 1px solid var(--color-border);
          color: var(--color-primary);
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-inspect:hover {
          background: var(--color-primary);
          color: #fff;
        }

        .loading-state,
        .empty-state {
          padding: 3rem;
          text-align: center;
          color: var(--color-text-muted);
        }

        /* Modal Dialog */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .modal-dialog {
          background: #fff;
          border-radius: var(--radius-lg);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          background: #fff;
          z-index: 10;
        }

        .modal-eyebrow {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
          font-weight: 700;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: var(--color-primary);
        }

        .btn-close-modal {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--color-text-muted);
          cursor: pointer;
        }

        .action-error-banner {
          background: #fdf2f2;
          color: #991b1b;
          padding: 0.9rem 2rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .action-success-banner {
          background: #f0fdf4;
          color: #166534;
          padding: 0.9rem 2rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .modal-body {
          padding: 2rem;
        }

        .detail-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .meta-card {
          background: #fcfbf9;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .meta-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .meta-sub {
          font-size: 0.8rem;
        }

        .section-block {
          margin-bottom: 2rem;
        }

        .section-block h3 {
          font-size: 1.15rem;
          color: var(--color-primary);
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.5rem;
        }

        .items-list-box {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
        }

        .item-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.9rem;
        }

        .item-detail-row:last-child {
          border-bottom: none;
        }

        .item-sub {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.2rem;
        }

        .totals-summary-box {
          background: #fcfbf9;
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .t-row {
          display: flex;
          justify-content: space-between;
        }

        .t-row.discount {
          color: #16a34a;
        }

        .t-row.total {
          border-top: 1px solid var(--color-border);
          padding-top: 0.6rem;
          font-size: 1.1rem;
          color: var(--color-primary);
        }

        .address-details-box {
          background: #fcfbf9;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
          font-size: 0.9rem;
        }

        .address-details-box p {
          margin: 0 0 0.4rem;
        }

        /* Workflow Steps */
        .workflow-steps {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .step-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          background: #fafafa;
        }

        .step-card h4 {
          margin: 0 0 0.35rem;
          color: var(--color-primary);
          font-size: 1rem;
        }

        .step-desc {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-bottom: 1rem;
        }

        .shipping-form {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .shipping-form input {
          width: 130px;
          padding: 0.55rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }

        .btn-action {
          padding: 0.65rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          transition: opacity 0.2s;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-action.primary {
          background: var(--color-primary);
          color: #fff;
        }

        .btn-action.secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-action.success {
          background: #16a34a;
          color: #ffffff;
        }

        .btn-action.danger {
          background: var(--color-accent-sale);
          color: #ffffff;
        }

        .btn-action.text-danger {
          background: none;
          color: #991b1b;
          border: 1px solid #fee2e2;
        }

        .step-warning {
          display: block;
          font-size: 0.8rem;
          color: #b45309;
          margin-top: 0.5rem;
        }

        .status-transition-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .cancel-sub-box {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: var(--radius-md);
          padding: 1.25rem;
          margin-top: 1rem;
        }

        .cancel-sub-box h4 {
          margin: 0 0 0.5rem;
          color: #9f1239;
        }

        .cancel-sub-box textarea {
          width: 100%;
          padding: 0.6rem;
          border: 1px solid #fecdd3;
          border-radius: var(--radius-md);
        }

        .terminal-note {
          color: var(--color-text-muted);
          font-style: italic;
        }

        /* Events Timeline */
        .events-timeline {
          border-left: 2px solid var(--color-border);
          margin-left: 0.75rem;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .event-item {
          position: relative;
        }

        .event-dot {
          position: absolute;
          left: -1.7rem;
          top: 0.25rem;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-primary);
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .event-type {
          font-size: 0.85rem;
          color: var(--color-primary);
        }

        .event-time {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .event-notes {
          font-size: 0.85rem;
          color: var(--color-text-dark);
          margin: 0 0 0.25rem;
        }

        .event-meta-json {
          background: #f8fafc;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #475569;
          margin: 0;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-loading" style={{ padding: '3rem', textAlign: 'center' }}>
          <p>Loading order queue...</p>
        </div>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  );
}
