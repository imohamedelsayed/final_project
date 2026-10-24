'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);

        // Check login
        let user = null;
        try {
          user = await api.getMe();
        } catch {
          // not logged in
        }

        if (!user) {
          router.replace('/login?redirect=/orders');
          return;
        }

        const res = await api.getMyOrders({ page: 1, pageSize: 20 });
        setOrders(res.orders || []);
      } catch (err) {
        setError(err.message || 'Failed to load your orders.');
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [router]);

  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
    confirmed: { bg: '#dbeafe', text: '#1e40af', label: 'Confirmed' },
    processing: { bg: '#f3e8ff', text: '#6b21a8', label: 'Processing' },
    delivered: { bg: '#dcfce7', text: '#166534', label: 'Delivered' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' },
    expired: { bg: '#f3f4f6', text: '#4b5563', label: 'Expired' }
  };

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p>Review and track your past and current Cash on Delivery orders.</p>
      </div>

      {loading ? (
        <div className="orders-loading">
          <div className="spinner" />
          <p>Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="orders-error">
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
          <p>{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-orders-card">
          <div className="empty-icon">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto', display: 'block', color: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h2>No Orders Yet</h2>
          <p>You haven&apos;t placed any orders with Pixel Store yet.</p>
          <Link href="/products" className="btn-shop">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const statusConfig = statusColors[order.status] || {
              bg: '#f3f4f6',
              text: '#374151',
              label: order.status
            };
            const itemsCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);

            return (
              <div key={order.id} className="order-item-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-number">Order #{order.order_number}</span>
                    <span className="order-date">
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
                  >
                    ● {statusConfig.label}
                  </span>
                </div>

                <div className="order-card-body">
                  <div className="order-details-col">
                    <p className="order-recipient">
                      <strong>Recipient:</strong> {order.address?.recipient_name}
                    </p>
                    <p className="order-address">
                      <strong>Delivery:</strong> {order.address?.governorate}, {order.address?.area}
                    </p>
                    <p className="order-items-summary">
                      <strong>Items:</strong> {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>

                  <div className="order-total-col">
                    <span className="total-label">Total Amount</span>
                    <span className="total-val">
                      EGP{' '}
                      {order.final_total !== null
                        ? Number(order.final_total).toLocaleString('en-EG', {
                            minimumFractionDigits: 2
                          })
                        : Number(order.subtotal - order.discount_amount).toLocaleString('en-EG', {
                            minimumFractionDigits: 2
                          })}
                    </span>
                    {order.final_total === null && (
                      <span className="shipping-notice">+ shipping pending WhatsApp</span>
                    )}
                  </div>
                </div>

                <div className="order-card-footer">
                  <Link
                    href={`/orders/${encodeURIComponent(order.order_number)}`}
                    className="btn-view-order"
                  >
                    View Order & WhatsApp Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .orders-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2.5rem 1rem 4rem;
        }

        .orders-header {
          margin-bottom: 2rem;
        }

        .orders-header h1 {
          font-size: 2rem;
          color: var(--color-primary);
          margin-bottom: 0.25rem;
        }

        .orders-header p {
          color: var(--color-text-muted);
          font-size: 0.95rem;
        }

        .orders-loading {
          min-height: 40vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: var(--color-text-muted);
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(21, 63, 58, 0.2);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .orders-error {
          background: #fdf2f2;
          color: #9b1c1c;
          padding: 1rem;
          border-radius: var(--radius-md);
        }

        .empty-orders-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          padding: 3.5rem 2rem;
          text-align: center;
          border: 1px solid var(--color-border);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.75rem;
        }

        .empty-orders-card h2 {
          color: var(--color-primary);
          margin-bottom: 0.5rem;
        }

        .empty-orders-card p {
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
        }

        .btn-shop {
          display: inline-block;
          background: var(--color-primary);
          color: #fff;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          text-decoration: none;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .order-item-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          overflow: hidden;
          transition:
            transform 0.15s,
            box-shadow 0.15s;
        }

        .order-item-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: #fcfbf9;
          border-bottom: 1px solid var(--color-border);
        }

        .order-number {
          font-weight: 700;
          color: var(--color-primary);
          font-size: 1.05rem;
          margin-right: 0.75rem;
        }

        .order-date {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .status-badge {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
        }

        .order-card-body {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .order-details-col p {
          margin: 0 0 0.35rem;
          font-size: 0.9rem;
          color: var(--color-text-dark);
        }

        .order-details-col strong {
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .order-total-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .total-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .total-val {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .shipping-notice {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        .order-card-footer {
          padding: 0.85rem 1.5rem;
          background: #fafafa;
          border-top: 1px solid var(--color-border);
          text-align: right;
        }

        .btn-view-order {
          color: var(--color-primary);
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
        }

        .btn-view-order:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
