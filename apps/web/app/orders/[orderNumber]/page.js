'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function OrderDetailPage({ params }) {
  const unwrappedParams = use(params);
  const orderNumber = unwrappedParams.orderNumber;

  const [orderData, setOrderData] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getOrderByNumber(orderNumber);
        setOrderData(res.order);
        setWhatsappUrl(res.whatsappUrl);
      } catch (err) {
        setError(err.message || 'Failed to load order.');
      } finally {
        setLoading(false);
      }
    }

    if (orderNumber) {
      loadOrder();
    }
  }, [orderNumber]);

  async function handleCancelOrder() {
    const confirm = window.confirm(
      'Are you sure you want to cancel this pending order? This action cannot be undone.'
    );
    if (!confirm) return;

    try {
      setCancelling(true);
      setCancelFeedback(null);
      const res = await api.cancelMyOrder(
        orderNumber,
        'Cancelled by customer on confirmation screen'
      );
      setOrderData(res.order);
      setCancelFeedback('Order has been cancelled successfully.');
    } catch (err) {
      setCancelFeedback(`Failed to cancel order: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="order-loading">
        <div className="spinner" />
        <p>Loading order details...</p>
        <style jsx>{`
          .order-loading {
            min-height: 50vh;
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
        `}</style>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="order-error-container">
        <div className="error-card">
          <div className="error-icon">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto', display: 'block', color: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Order Not Found</h2>
          <p>{error || 'We could not locate this order in your account.'}</p>
          <Link href="/products" className="btn-back">
            Return to Shop
          </Link>
        </div>
        <style jsx>{`
          .order-error-container {
            max-width: 500px;
            margin: 4rem auto;
            padding: 0 1rem;
          }
          .error-card {
            background: #fff;
            border-radius: var(--radius-lg);
            padding: 2.5rem;
            text-align: center;
            border: 1px solid var(--color-border);
          }
          .error-icon {
            font-size: 3rem;
            margin-bottom: 0.75rem;
          }
          h2 {
            color: var(--color-primary);
            margin-bottom: 0.5rem;
          }
          p {
            color: var(--color-text-muted);
            margin-bottom: 1.5rem;
          }
          .btn-back {
            display: inline-block;
            background: var(--color-primary);
            color: #fff;
            padding: 0.7rem 1.5rem;
            border-radius: var(--radius-md);
            text-decoration: none;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  const items = orderData.items || [];
  const address = orderData.address;
  const isPending = orderData.status === 'pending';

  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending WhatsApp Confirmation' },
    confirmed: { bg: '#dbeafe', text: '#1e40af', label: 'Confirmed' },
    processing: { bg: '#f3e8ff', text: '#6b21a8', label: 'Processing' },
    delivered: { bg: '#dcfce7', text: '#166534', label: 'Delivered' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' },
    expired: { bg: '#f3f4f6', text: '#4b5563', label: 'Expired' }
  };

  const currentStatus = statusColors[orderData.status] || {
    bg: '#f3f4f6',
    text: '#374151',
    label: orderData.status
  };

  return (
    <div className="order-detail-page">
      <div className="order-header-banner">
        <div className="order-header-content">
          <div className="order-ref-box">
            <span className="order-eyebrow">Cash on Delivery Order</span>
            <h1>Order #{orderData.order_number}</h1>
            <span
              className="status-pill"
              style={{ backgroundColor: currentStatus.bg, color: currentStatus.text }}
            >
              ● {currentStatus.label}
            </span>
          </div>

          <div className="order-date">
            Placed on{' '}
            {new Date(orderData.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      {cancelFeedback && (
        <div className="feedback-banner" role="alert">
          {cancelFeedback}
        </div>
      )}

      {/* Primary WhatsApp Handoff Action Card (Shown prominently for pending orders) */}
      {isPending && (
        <div className="whatsapp-action-card">
          <div className="wa-icon-large">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <div className="wa-content">
            <h2>Complete Your Order via WhatsApp</h2>
            <p>
              Your order is securely saved as <strong>Pending</strong>. To confirm delivery,
              calculate shipping to your address, and dispatch your order, please click below to
              send your prefilled order summary to our store team.
            </p>
            <div className="wa-disclaimer">
              <strong>Notice:</strong> Opening this link prepares your WhatsApp message. You must
              click <strong>Send</strong> inside WhatsApp to reach our team. Clicking this button
              does not automatically confirm the order.
            </div>

            <div className="wa-buttons-row">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                  id="whatsapp-handoff-button"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Open WhatsApp & Send Order Message
                </a>
              )}

              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="btn-cancel-pending"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details & Summary Grid */}
      <div className="order-grid">
        {/* Left Column: Items Snapshot */}
        <div className="order-items-column">
          <div className="card">
            <h3>Items in this Order ({items.length})</h3>

            <div className="items-table">
              {items.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="item-details">
                    <span className="product-title">{item.product_name_snapshot}</span>
                    <span className="product-variant">
                      Variant: {item.variant_snapshot} • Condition: {item.condition_snapshot} • SKU:{' '}
                      {item.sku_snapshot}
                    </span>
                    <span className="product-qty-price">
                      Qty: {item.quantity} × EGP{' '}
                      {Number(item.unit_price).toLocaleString('en-EG', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  <div className="item-line-total">
                    EGP{' '}
                    {Number(item.line_total).toLocaleString('en-EG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Snapshot Breakdown */}
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>
                  EGP{' '}
                  {Number(orderData.subtotal).toLocaleString('en-EG', {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>

              {Number(orderData.discount_amount) > 0 && (
                <div className="price-row discount-row">
                  <span>
                    Coupon Discount{' '}
                    {orderData.coupon_code_snapshot && `(${orderData.coupon_code_snapshot})`}
                  </span>
                  <span>
                    -EGP{' '}
                    {Number(orderData.discount_amount).toLocaleString('en-EG', {
                      minimumFractionDigits: 2
                    })}
                  </span>
                </div>
              )}

              <div className="price-row">
                <span>Shipping Charges</span>
                <span className="shipping-state">
                  {orderData.shipping_fee !== null
                    ? `EGP ${Number(orderData.shipping_fee).toLocaleString('en-EG', { minimumFractionDigits: 2 })}`
                    : 'Pending store calculation via WhatsApp'}
                </span>
              </div>

              <div className="price-row total-highlight">
                <div>
                  <strong>Final Payable Total</strong>
                  {orderData.final_total === null && (
                    <div className="pending-note">Determined upon WhatsApp confirmation</div>
                  )}
                </div>
                <strong className="total-amount">
                  EGP{' '}
                  {orderData.final_total !== null
                    ? Number(orderData.final_total).toLocaleString('en-EG', {
                        minimumFractionDigits: 2
                      })
                    : (
                        Number(orderData.subtotal) - Number(orderData.discount_amount)
                      ).toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Delivery Address & Order Info */}
        <div className="order-sidebar-column">
          <div className="card">
            <h3>Delivery Address</h3>
            {address ? (
              <div className="address-box">
                <p className="addr-name">
                  <strong>{address.recipient_name}</strong>
                </p>
                <p className="addr-phone">Mobile: {address.mobile}</p>
                <p className="addr-line">
                  {address.street}, Bldg {address.building_number}
                  {address.floor && `, Floor ${address.floor}`}
                  {address.apartment && `, Apt ${address.apartment}`}
                </p>
                <p className="addr-city">
                  {address.area}, {address.governorate}, Egypt
                </p>
                {address.landmark && (
                  <p className="addr-landmark">
                    <em>Landmark: {address.landmark}</em>
                  </p>
                )}
              </div>
            ) : (
              <p className="no-address">No address on record.</p>
            )}
          </div>

          <div className="card info-card">
            <h3>How COD Works</h3>
            <ol className="cod-steps">
              <li>
                <strong>WhatsApp Handoff</strong>: Send the prepared message to our store.
              </li>
              <li>
                <strong>Shipping Confirmation</strong>: Our team determines the exact delivery fee
                for your area.
              </li>
              <li>
                <strong>Agreement & Dispatch</strong>: Once you approve the final total, we confirm
                and ship.
              </li>
              <li>
                <strong>Cash Payment</strong>: Inspect your order and pay the courier in cash upon
                arrival.
              </li>
            </ol>
          </div>
        </div>
      </div>

      <style jsx>{`
        .order-detail-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2rem 1rem 4rem;
        }

        .order-header-banner {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          padding: 1.75rem 2rem;
          margin-bottom: 1.75rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        }

        .order-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .order-eyebrow {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 0.25rem;
        }

        .order-ref-box h1 {
          font-size: 1.75rem;
          color: var(--color-primary);
          margin: 0 0 0.5rem;
        }

        .status-pill {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
        }

        .order-date {
          font-size: 0.9rem;
          color: var(--color-text-muted);
        }

        .feedback-banner {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        /* WhatsApp Action Card */
        .whatsapp-action-card {
          background: linear-gradient(135deg, #153f3a 0%, #0d2825 100%);
          color: #ffffff;
          border-radius: var(--radius-lg);
          padding: 2rem;
          margin-bottom: 2rem;
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          box-shadow: 0 8px 24px rgba(21, 63, 58, 0.25);
        }

        @media (max-width: 650px) {
          .whatsapp-action-card {
            flex-direction: column;
            padding: 1.5rem;
          }
        }

        .wa-icon-large {
          font-size: 3rem;
          line-height: 1;
        }

        .wa-content {
          flex: 1;
        }

        .wa-content h2 {
          font-size: 1.4rem;
          margin: 0 0 0.5rem;
          color: #ffffff;
        }

        .wa-content p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }

        .wa-disclaimer {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 0.65rem 0.95rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 1.25rem;
        }

        .wa-buttons-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
        }

        .btn-whatsapp {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          background: #25d366;
          color: #ffffff;
          font-weight: 700;
          font-size: 1rem;
          padding: 0.85rem 1.5rem;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition:
            background-color 0.15s,
            opacity 0.2s;
          box-shadow: var(--shadow-sm);
        }

        .btn-whatsapp:hover {
          background: #20ba5a;
          box-shadow: var(--shadow-md);
        }

        .btn-cancel-pending {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.85rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel-pending:hover:not(:disabled) {
          color: #ffffff;
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Order Details Grid */
        .order-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.75rem;
        }

        @media (min-width: 900px) {
          .order-grid {
            grid-template-columns: 1.4fr 1fr;
          }
        }

        .card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          margin-bottom: 1.5rem;
        }

        .card h3 {
          font-size: 1.15rem;
          color: var(--color-primary);
          margin: 0 0 1.25rem;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.75rem;
        }

        .items-table {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px dashed var(--color-border);
        }

        .item-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .product-title {
          font-weight: 600;
          color: var(--color-text-dark);
          font-size: 0.95rem;
        }

        .product-variant {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        .product-qty-price {
          font-size: 0.85rem;
          color: var(--color-text-dark);
        }

        .item-line-total {
          font-weight: 700;
          color: var(--color-text-dark);
          font-size: 0.95rem;
          white-space: nowrap;
        }

        /* Price Breakdown */
        .price-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding-top: 0.5rem;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: var(--color-text-dark);
        }

        .discount-row {
          color: #16a34a;
          font-weight: 500;
        }

        .shipping-state {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        .total-highlight {
          border-top: 2px solid var(--color-border);
          padding-top: 1rem;
          margin-top: 0.5rem;
        }

        .total-highlight strong {
          font-size: 1.15rem;
          color: var(--color-primary);
        }

        .pending-note {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: normal;
        }

        .total-amount {
          font-size: 1.35rem;
          color: var(--color-primary);
        }

        /* Sidebar Address */
        .address-box p {
          margin: 0 0 0.4rem;
          font-size: 0.9rem;
          color: var(--color-text-dark);
          line-height: 1.4;
        }

        .addr-name strong {
          font-size: 1rem;
          color: var(--color-primary);
        }

        .addr-phone {
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        .addr-landmark {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .no-address {
          color: var(--color-text-muted);
          font-style: italic;
        }

        /* COD Steps */
        .cod-steps {
          margin: 0;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          font-size: 0.85rem;
          color: var(--color-text-dark);
          line-height: 1.4;
        }

        .cod-steps strong {
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
