'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { useAdmin } from './layout';

export default function AdminDashboardPage() {
  const adminContext = useAdmin();
  const user = adminContext?.user;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setError(null);
        const res = await api.getAdminDashboardSummary();
        if (!ignore) {
          setData(res);
          setLastUpdated(new Date().toLocaleTimeString());
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load dashboard data.');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await api.getAdminDashboardSummary();
      setData(res);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to refresh dashboard data.');
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = data?.metrics || {
    pendingOrders: 0,
    awaitingFinalTotal: 0,
    approachingExpiry: 0,
    expiredOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalOrders: 0,
    lowStockVariants: 0,
    outOfStockVariants: 0,
    totalVariants: 0,
    totalProducts: 0,
    totalCategories: 0,
    activeCoupons: 0
  };

  const urgentOrders = data?.urgentOrders || [];
  const lowStockAlerts = data?.lowStockAlerts || [];

  return (
    <div className="admin-dashboard-page">
      {/* Header Banner */}
      <div className="dashboard-header">
        <div className="header-titles">
          <h1>Dashboard</h1>
          <p>
            {user ? `Welcome back, ${user.name.split(' ')[0]}. ` : ''}
            Overview of store activity, pending actions, and inventory health.
          </p>
        </div>

        <div className="header-actions">
          {lastUpdated && (
            <span className="last-updated-text">
              Updated: <strong>{lastUpdated}</strong>
            </span>
          )}

          <button
            type="button"
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh Live Metrics"
          >
            <svg
              className={refreshing ? 'rotating' : ''}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link href="/admin/orders" className="btn-primary-action">
            <span>View Orders</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

      {error && (
        <div className="error-alert">
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
          <div className="error-alert-content">
            <strong>Unable to load dashboard data:</strong> {error}
          </div>
          <button type="button" onClick={handleRefresh} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>Loading real-time store metrics...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="metrics-grid">
            {/* Metric 1: Pending Orders */}
            <div className={`metric-card ${metrics.pendingOrders > 0 ? 'highlight-amber' : ''}`}>
              <div className="card-top">
                <span className="card-label">Pending Orders</span>
                <span
                  className={`card-badge ${metrics.pendingOrders > 0 ? 'badge-amber' : 'badge-green'}`}
                >
                  {metrics.pendingOrders > 0 ? `${metrics.pendingOrders} Active` : 'Queue Clear'}
                </span>
              </div>
              <div className="card-value">{metrics.pendingOrders}</div>
              <p className="card-subtext">
                {metrics.awaitingFinalTotal > 0
                  ? `${metrics.awaitingFinalTotal} order(s) awaiting final total calculation`
                  : 'All pending orders have shipping totals assigned'}
              </p>
              <Link href="/admin/orders?status=pending" className="card-link">
                <span>View Pending Queue</span>
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {/* Metric 2: Awaiting Final Total Dispatch */}
            <div className={`metric-card ${metrics.awaitingFinalTotal > 0 ? 'highlight-red' : ''}`}>
              <div className="card-top">
                <span className="card-label">Awaiting Final Total</span>
                <span
                  className={`card-badge ${metrics.awaitingFinalTotal > 0 ? 'badge-red' : 'badge-green'}`}
                >
                  {metrics.awaitingFinalTotal > 0 ? 'Action Required' : 'Up to Date'}
                </span>
              </div>
              <div className="card-value">{metrics.awaitingFinalTotal}</div>
              <p className="card-subtext">
                Customer waiting for shipping fee calculation and WhatsApp message
              </p>
              <Link href="/admin/orders?status=pending" className="card-link">
                <span>Dispatch Totals</span>
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {/* Metric 3: Approaching Expiration */}
            <div className={`metric-card ${metrics.approachingExpiry > 0 ? 'highlight-red' : ''}`}>
              <div className="card-top">
                <span className="card-label">Approaching Expiration</span>
                <span
                  className={`card-badge ${metrics.approachingExpiry > 0 ? 'badge-red' : 'badge-slate'}`}
                >
                  {metrics.approachingExpiry > 0 ? '24h Expiry Active' : 'No Expiring Orders'}
                </span>
              </div>
              <div className="card-value">{metrics.approachingExpiry}</div>
              <p className="card-subtext">
                {metrics.expiredOrders > 0
                  ? `${metrics.expiredOrders} order(s) have expired and require reconciliation`
                  : 'Pending orders with active 24-hour expiration clocks'}
              </p>
              <Link href="/admin/orders?status=pending" className="card-link">
                <span>Review Expiring Orders</span>
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {/* Metric 4: Low Stock Alerts */}
            <div className={`metric-card ${metrics.lowStockVariants > 0 ? 'highlight-amber' : ''}`}>
              <div className="card-top">
                <span className="card-label">Low Stock Alerts</span>
                <span
                  className={`card-badge ${metrics.outOfStockVariants > 0 ? 'badge-red' : metrics.lowStockVariants > 0 ? 'badge-amber' : 'badge-green'}`}
                >
                  {metrics.outOfStockVariants > 0
                    ? `${metrics.outOfStockVariants} Out of Stock`
                    : metrics.lowStockVariants > 0
                      ? `${metrics.lowStockVariants} Low`
                      : 'Stock Healthy'}
                </span>
              </div>
              <div className="card-value">{metrics.lowStockVariants}</div>
              <p className="card-subtext">
                {metrics.outOfStockVariants > 0
                  ? `${metrics.outOfStockVariants} variant(s) at 0 stock. Restock needed immediately.`
                  : 'Variants at or below their configured stock threshold'}
              </p>
              <Link href="/admin/inventory" className="card-link">
                <span>Manage Inventory</span>
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Operations Section */}
          <div className="section-title-bar">
            <h2>Needs Attention</h2>
            <p>Orders and stock alerts requiring immediate follow-up.</p>
          </div>

          {/* Two-Column Operations Section */}
          <div className="operations-split">
            {/* Left: Orders to Review */}
            <div className="split-panel">
              <div className="panel-header">
                <div>
                  <h3>Orders to Review</h3>
                  <p>Pending customer orders sorted by follow-up priority.</p>
                </div>
                <Link href="/admin/orders?status=pending" className="panel-header-link">
                  View All ({metrics.pendingOrders})
                </Link>
              </div>

              {urgentOrders.length === 0 ? (
                <div className="empty-panel-state">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1b7a48"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="16 12 12 8 8 12" />
                    <line x1="12" y1="16" x2="12" y2="8" />
                  </svg>
                  <h3>Pending Queue is Clear</h3>
                  <p>All customer orders have been confirmed or dispatched.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Order Ref</th>
                        <th>Customer / Contact</th>
                        <th>Subtotal</th>
                        <th>Action Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {urgentOrders.map((ord) => (
                        <tr key={ord.id}>
                          <td>
                            <strong className="order-number-text">{ord.order_number}</strong>
                            <span className="order-date-text">
                              {new Date(ord.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <div className="customer-info-cell">
                              <span className="customer-name">
                                {ord.recipient_name || 'Customer'}
                              </span>
                              <span className="customer-contact">
                                {ord.mobile} • {ord.governorate}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="amount-text">
                              EGP{' '}
                              {Number(ord.subtotal).toLocaleString('en-US', {
                                minimumFractionDigits: 2
                              })}
                            </span>
                            <span className="items-count-text">{ord.item_count} item(s)</span>
                          </td>
                          <td>
                            {ord.needs_final_total ? (
                              <span className="status-chip chip-amber">Needs Final Total</span>
                            ) : ord.hours_left !== null ? (
                              <span
                                className={`status-chip ${ord.is_expired ? 'chip-red' : 'chip-blue'}`}
                              >
                                {ord.is_expired ? 'Expired' : `${ord.hours_left}h countdown`}
                              </span>
                            ) : (
                              <span className="status-chip chip-blue">Pending</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link href={`/admin/orders?id=${ord.id}`} className="btn-table-action">
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Low Stock Alerts */}
            <div className="split-panel">
              <div className="panel-header">
                <div>
                  <h3>Low Stock Alerts</h3>
                  <p>Active items approaching or at zero inventory.</p>
                </div>
                <Link href="/admin/inventory" className="panel-header-link">
                  View All ({metrics.lowStockVariants})
                </Link>
              </div>

              {lowStockAlerts.length === 0 ? (
                <div className="empty-panel-state">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1b7a48"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3>All Stock Levels Healthy</h3>
                  <p>No active variants are at or below their low-stock thresholds.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Product / Variant</th>
                        <th>SKU</th>
                        <th>Condition</th>
                        <th>Stock Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockAlerts.map((item) => {
                        const isOut = item.stock_quantity === 0;
                        return (
                          <tr key={item.variant_id}>
                            <td>
                              <div className="product-title-cell">
                                <span className="product-title-text">
                                  {item.product_name || item.product_title}
                                </span>
                                <span className="variant-label-text">{item.variant_label}</span>
                              </div>
                            </td>
                            <td>
                              <code className="sku-tag">{item.sku}</code>
                            </td>
                            <td>
                              <span
                                className={`condition-tag ${item.condition === 'used' ? 'condition-used' : 'condition-new'}`}
                              >
                                {item.condition === 'used' ? 'Used' : 'New'}
                              </span>
                            </td>
                            <td>
                              <div className="stock-level-cell">
                                <span
                                  className={`stock-number ${isOut ? 'stock-zero' : 'stock-low'}`}
                                >
                                  {item.stock_quantity} unit(s)
                                </span>
                                <span className="threshold-sub">
                                  Threshold: {item.low_stock_threshold}
                                </span>
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
          </div>

          {/* Bottom Row: Order Status Pipeline & Catalog Summary */}
          <div className="bottom-grid">
            {/* Order Lifecycle Pipeline */}
            <div className="pipeline-card">
              <h3>Order Status Pipeline</h3>
              <p>Quick breakdown of orders across their fulfillment lifecycle.</p>

              <div className="pipeline-chips">
                <Link
                  href="/admin/orders?status=pending"
                  className="pipeline-chip chip-state-pending"
                >
                  <span className="pipeline-count">{metrics.pendingOrders}</span>
                  <span className="pipeline-name">Pending</span>
                </Link>

                <Link
                  href="/admin/orders?status=confirmed"
                  className="pipeline-chip chip-state-confirmed"
                >
                  <span className="pipeline-count">{metrics.confirmedOrders}</span>
                  <span className="pipeline-name">Confirmed</span>
                </Link>

                <Link
                  href="/admin/orders?status=processing"
                  className="pipeline-chip chip-state-processing"
                >
                  <span className="pipeline-count">{metrics.processingOrders}</span>
                  <span className="pipeline-name">Processing</span>
                </Link>

                <Link
                  href="/admin/orders?status=delivered"
                  className="pipeline-chip chip-state-delivered"
                >
                  <span className="pipeline-count">{metrics.deliveredOrders}</span>
                  <span className="pipeline-name">Delivered</span>
                </Link>

                <Link
                  href="/admin/orders?status=cancelled"
                  className="pipeline-chip chip-state-cancelled"
                >
                  <span className="pipeline-count">{metrics.cancelledOrders}</span>
                  <span className="pipeline-name">Cancelled</span>
                </Link>
              </div>
            </div>

            {/* Catalog Summary */}
            <div className="catalog-summary-card">
              <h3>Catalog & Store Overview</h3>
              <p>Active entities currently live in the database.</p>

              <div className="catalog-counters">
                <div className="counter-item">
                  <span className="counter-num">{metrics.totalProducts}</span>
                  <span className="counter-desc">Published Products</span>
                </div>
                <div className="counter-item">
                  <span className="counter-num">{metrics.totalVariants}</span>
                  <span className="counter-desc">Active SKUs</span>
                </div>
                <div className="counter-item">
                  <span className="counter-num">{metrics.totalCategories}</span>
                  <span className="counter-desc">Categories</span>
                </div>
                <div className="counter-item">
                  <span className="counter-num">{metrics.activeCoupons}</span>
                  <span className="counter-desc">Active Coupons</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .admin-dashboard-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          width: 100%;
        }

        /* Header */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .section-title-bar {
          margin-bottom: 1rem;
        }

        .section-title-bar h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #153f3a;
          margin: 0 0 0.2rem;
        }

        .section-title-bar p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        .dashboard-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #153f3a;
          margin: 0 0 0.4rem;
          letter-spacing: -0.02em;
        }

        .dashboard-header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
          max-width: 650px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .last-updated-text {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .btn-refresh {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .btn-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .rotating {
          animation: spin 0.8s linear infinite;
        }

        .btn-primary-action {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #153f3a;
          color: #ffffff;
          padding: 0.45rem 0.95rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .btn-primary-action:hover {
          background: #1c524c;
        }

        /* Error Alert */
        .error-alert {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          color: #9f1239;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .error-alert-content {
          flex: 1;
          font-size: 0.9rem;
        }

        .btn-retry {
          background: #9f1239;
          color: #ffffff;
          border: none;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Loading State */
        .dashboard-loading {
          padding: 4rem 2rem;
          text-align: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #153f3a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        .dashboard-loading p {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        /* Metric Cards Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: #ffffff;
          border: 1px solid #e2ddd7;
          border-radius: 8px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
        }

        .metric-card:hover {
          box-shadow: 0 4px 12px rgba(21, 63, 58, 0.06);
          border-color: #cbd5e1;
        }

        .metric-card.highlight-amber {
          border-color: #fde68a;
          background: #fffdf5;
        }

        .metric-card.highlight-red {
          border-color: #fecaca;
          background: #fffafa;
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .card-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
        }

        .card-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }

        .badge-green {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-amber {
          background: #fef3c7;
          color: #b45309;
        }

        .badge-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        .badge-slate {
          background: #f1f5f9;
          color: #64748b;
        }

        .card-value {
          font-size: 2.25rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.5rem;
          letter-spacing: -0.03em;
        }

        .card-subtext {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0 0 1rem;
          line-height: 1.4;
          flex: 1;
        }

        .card-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #153f3a;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .card-link:hover {
          color: #2a635c;
          text-decoration: underline;
        }

        /* Operations Split (2 Columns) */
        .operations-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 1024px) {
          .operations-split {
            grid-template-columns: 1fr 1fr;
          }
        }

        .split-panel {
          background: #ffffff;
          border: 1px solid #e2ddd7;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .panel-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .panel-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.2rem;
        }

        .panel-header p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .panel-header-link {
          font-size: 0.8rem;
          font-weight: 600;
          color: #153f3a;
          text-decoration: none;
          white-space: nowrap;
        }

        .panel-header-link:hover {
          text-decoration: underline;
        }

        .empty-panel-state {
          padding: 3.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .empty-panel-state h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0.75rem 0 0.25rem;
        }

        .empty-panel-state p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        /* Tables */
        .table-responsive {
          overflow-x: auto;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .dashboard-table th {
          text-align: left;
          padding: 0.75rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .dashboard-table td {
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .dashboard-table tr:last-child td {
          border-bottom: none;
        }

        .dashboard-table tr:hover td {
          background: #fbfcfe;
        }

        .order-number-text {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e293b;
        }

        .order-date-text {
          display: block;
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .customer-info-cell {
          display: flex;
          flex-direction: column;
        }

        .customer-name {
          font-weight: 600;
          color: #1e293b;
        }

        .customer-contact {
          font-size: 0.75rem;
          color: #64748b;
        }

        .amount-text {
          display: block;
          font-weight: 700;
          color: #153f3a;
        }

        .items-count-text {
          display: block;
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .status-chip {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .chip-amber {
          background: #fef3c7;
          color: #b45309;
        }

        .chip-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        .chip-blue {
          background: #e0f2fe;
          color: #0369a1;
        }

        .btn-table-action {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #153f3a;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 0.25rem 0.55rem;
          border-radius: 4px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .btn-table-action:hover {
          background: #dcfce7;
        }

        .product-title-cell {
          display: flex;
          flex-direction: column;
        }

        .product-title-text {
          font-weight: 600;
          color: #1e293b;
        }

        .variant-label-text {
          font-size: 0.75rem;
          color: #64748b;
        }

        .sku-tag {
          font-family: monospace;
          font-size: 0.75rem;
          background: #f1f5f9;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          color: #475569;
        }

        .condition-tag {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .condition-new {
          background: #e1f5ea;
          color: #1b7a48;
        }

        .condition-used {
          background: #fef3c7;
          color: #b45309;
        }

        .stock-level-cell {
          display: flex;
          flex-direction: column;
        }

        .stock-number {
          font-weight: 700;
          font-size: 0.85rem;
        }

        .stock-low {
          color: #d97706;
        }

        .stock-zero {
          color: #dc2626;
        }

        .threshold-sub {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        /* Bottom Row */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .bottom-grid {
            grid-template-columns: 1.3fr 1fr;
          }
        }

        .pipeline-card,
        .catalog-summary-card {
          background: #ffffff;
          border: 1px solid #e2ddd7;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .pipeline-card h3,
        .catalog-summary-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem;
        }

        .pipeline-card p,
        .catalog-summary-card p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0 0 1.25rem;
        }

        .pipeline-chips {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 0.75rem;
        }

        .pipeline-chip {
          display: flex;
          flex-direction: column;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.15s ease;
          border: 1px solid #e2ddd7;
          background: #ffffff;
        }

        .pipeline-chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .pipeline-chip:focus-visible {
          outline: 2px solid #153f3a;
          outline-offset: 2px;
        }

        .pipeline-count {
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.35rem;
        }

        .pipeline-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #52605d;
          text-transform: none;
          letter-spacing: normal;
        }

        .chip-state-pending {
          background: #fffdf5;
          border-color: #fde68a;
        }
        .chip-state-pending .pipeline-count {
          color: #b45309;
        }

        .chip-state-confirmed {
          background: #f8fbff;
          border-color: #bfdbfe;
        }
        .chip-state-confirmed .pipeline-count {
          color: #1e40af;
        }

        .chip-state-processing {
          background: #fcfaff;
          border-color: #e9d5ff;
        }
        .chip-state-processing .pipeline-count {
          color: #6b21a8;
        }

        .chip-state-delivered {
          background: #f6fcf8;
          border-color: #bbf7d0;
        }
        .chip-state-delivered .pipeline-count {
          color: #1b7a48;
        }

        .chip-state-cancelled {
          background: #fef8f8;
          border-color: #fecdd3;
        }
        .chip-state-cancelled .pipeline-count {
          color: #991b1b;
        }

        .catalog-counters {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .counter-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
        }

        .counter-num {
          font-size: 1.5rem;
          font-weight: 800;
          color: #153f3a;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .counter-desc {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
