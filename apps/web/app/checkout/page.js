'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

const EGYPT_GOVERNORATES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qaliubiya',
  'Gharbiya',
  'Menofia',
  'Dakahlia',
  'Sharkia',
  'Kafr El Sheikh',
  'Damietta',
  'Port Said',
  'Ismailia',
  'Suez',
  'Beheira',
  'Fayoum',
  'Beni Suef',
  'Minya',
  'Assiut',
  'Sohag',
  'Qena',
  'Luxor',
  'Aswan',
  'Red Sea',
  'Matrouh',
  'New Valley',
  'North Sinai',
  'South Sinai'
];

export default function CheckoutPage() {
  const router = useRouter();

  // Auth & Cart State
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null);

  // Address Form State
  const [address, setAddress] = useState({
    recipient_name: '',
    mobile: '',
    governorate: 'Cairo',
    area: '',
    street: '',
    building_number: '',
    floor: '',
    apartment: '',
    landmark: ''
  });

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  // Terms State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setPageError(null);

        // 1. Check user authentication
        let currentUser = null;
        try {
          currentUser = await api.getMe();
        } catch {
          // not logged in
        }

        if (!currentUser) {
          router.replace('/login?redirect=/checkout');
          return;
        }

        if (!currentUser.email_verified_at) {
          router.replace('/verify-email?redirect=/checkout');
          return;
        }

        setUser(currentUser);
        setAddress((prev) => ({
          ...prev,
          recipient_name: prev.recipient_name || currentUser.name || ''
        }));

        // 2. Load Cart
        const cartData = await api.getCart();
        setCart(cartData);
      } catch (err) {
        setPageError(err.message || 'Failed to load checkout details.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  function handleAddressChange(e) {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  // Quote / Apply Coupon
  async function handleApplyCoupon(e) {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;

    try {
      setCouponLoading(true);
      setCouponError(null);
      const quote = await api.quoteCoupon(couponCodeInput.trim());
      setAppliedCoupon(quote);
    } catch (err) {
      setCouponError(err.message || 'Failed to apply coupon.');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
  }

  // Submit Order
  async function handleSubmitOrder(e) {
    e.preventDefault();
    setPageError(null);
    setFieldErrors({});

    // Client-side quick validations
    const errors = {};
    if (!address.recipient_name.trim()) errors.recipient_name = 'Recipient name is required';
    if (!address.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else {
      const cleanMobile = address.mobile.replace(/[\s-]/g, '');
      if (!/^(?:\+?20|0)?1[0125][0-9]{8}$/.test(cleanMobile)) {
        errors.mobile = 'Please enter a valid Egyptian mobile number (e.g. 01012345678)';
      }
    }
    if (!address.area.trim()) errors.area = 'Area / District is required';
    if (!address.street.trim()) errors.street = 'Street address is required';
    if (!address.building_number.trim()) errors.building_number = 'Building number is required';
    if (!termsAccepted) errors.terms = 'You must accept the terms of service to place your order';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);

      // Generate a client-scoped UUID idempotency key for this submission
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await api.checkoutOrder({
        idempotencyKey,
        address: {
          recipient_name: address.recipient_name.trim(),
          mobile: address.mobile.trim(),
          governorate: address.governorate,
          area: address.area.trim(),
          street: address.street.trim(),
          building_number: address.building_number.trim(),
          floor: address.floor.trim() || null,
          apartment: address.apartment.trim() || null,
          landmark: address.landmark.trim() || null
        },
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        termsAccepted: true,
        termsVersion: 'v1.0'
      });

      const orderNumber = result?.order?.order_number;
      if (orderNumber) {
        router.push(`/orders/${encodeURIComponent(orderNumber)}`);
      } else {
        router.push('/orders');
      }
    } catch (err) {
      if (err.fields) {
        setFieldErrors(err.fields);
      }
      setPageError(
        err.message || 'Failed to place order. Please review your details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="spinner" />
        <p>Loading checkout details...</p>
        <style jsx>{`
          .checkout-loading {
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

  const items = cart?.lines || [];
  const subtotal = Number(cart?.subtotal || 0);
  const discountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount) : 0;
  const estimatedPayable = Math.max(0, subtotal - discountAmount);

  if (items.length === 0) {
    return (
      <div className="checkout-empty-container">
        <div className="empty-card">
          <div className="empty-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto', display: 'block', color: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2>Your cart is empty</h2>
          <p>You need at least one purchasable item in your cart before checking out.</p>
          <Link href="/products" className="btn-shop">
            Browse Products
          </Link>
        </div>
        <style jsx>{`
          .checkout-empty-container {
            max-width: 600px;
            margin: 4rem auto;
            padding: 0 1rem;
          }
          .empty-card {
            background: #fff;
            border-radius: var(--radius-lg);
            padding: 3rem 2rem;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--color-border);
          }
          .empty-icon {
            font-size: 3.5rem;
            margin-bottom: 1rem;
          }
          h2 {
            font-size: 1.5rem;
            color: var(--color-primary);
            margin-bottom: 0.5rem;
          }
          p {
            color: var(--color-text-muted);
            margin-bottom: 1.5rem;
          }
          .btn-shop {
            display: inline-block;
            background: var(--color-primary);
            color: #fff;
            padding: 0.75rem 1.75rem;
            border-radius: var(--radius-md);
            font-weight: 600;
            text-decoration: none;
            transition: opacity 0.2s;
          }
          .btn-shop:hover {
            opacity: 0.9;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link href="/cart" className="back-link">
          Back to Cart
        </Link>
        <h1>Secure Checkout</h1>
        <p className="subtitle">Cash on Delivery in Egypt. Delivery address and order review.</p>
      </div>

      {pageError && (
        <div className="error-banner" role="alert">
          <span className="error-icon">
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
          </span>
          <span>{pageError}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="checkout-layout">
        {/* Left Column: Delivery Address & Details */}
        <div className="checkout-form-column">
          <div className="card form-card">
            <div className="card-header">
              <div>
                <h2>1. Delivery Address</h2>
                {user && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Ordering as {user.name} ({user.email})
                  </span>
                )}
              </div>
              <span className="badge">Cash on Delivery</span>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="recipient_name">
                  Full Name / Recipient <span className="req">*</span>
                </label>
                <input
                  id="recipient_name"
                  name="recipient_name"
                  type="text"
                  placeholder="e.g. Mohamed Ahmed"
                  value={address.recipient_name}
                  onChange={handleAddressChange}
                  className={fieldErrors.recipient_name ? 'input-error' : ''}
                  required
                />
                {fieldErrors.recipient_name && (
                  <span className="error-msg">{fieldErrors.recipient_name}</span>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="mobile">
                  Egyptian Mobile Number <span className="req">*</span>
                </label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="e.g. 01012345678 or 01234567890"
                  value={address.mobile}
                  onChange={handleAddressChange}
                  className={fieldErrors.mobile ? 'input-error' : ''}
                  required
                />
                <span className="field-hint">
                  Used by our courier and store team to coordinate delivery via WhatsApp.
                </span>
                {fieldErrors.mobile && <span className="error-msg">{fieldErrors.mobile}</span>}
              </div>

              <div className="form-group half-width">
                <label htmlFor="governorate">
                  Governorate <span className="req">*</span>
                </label>
                <select
                  id="governorate"
                  name="governorate"
                  value={address.governorate}
                  onChange={handleAddressChange}
                  required
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group half-width">
                <label htmlFor="area">
                  City / Area / District <span className="req">*</span>
                </label>
                <input
                  id="area"
                  name="area"
                  type="text"
                  placeholder="e.g. Nasr City, Maadi, Dokki"
                  value={address.area}
                  onChange={handleAddressChange}
                  className={fieldErrors.area ? 'input-error' : ''}
                  required
                />
                {fieldErrors.area && <span className="error-msg">{fieldErrors.area}</span>}
              </div>

              <div className="form-group two-thirds">
                <label htmlFor="street">
                  Street Address <span className="req">*</span>
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  placeholder="e.g. Abbas El Akkad Street"
                  value={address.street}
                  onChange={handleAddressChange}
                  className={fieldErrors.street ? 'input-error' : ''}
                  required
                />
                {fieldErrors.street && <span className="error-msg">{fieldErrors.street}</span>}
              </div>

              <div className="form-group one-third">
                <label htmlFor="building_number">
                  Building # <span className="req">*</span>
                </label>
                <input
                  id="building_number"
                  name="building_number"
                  type="text"
                  placeholder="e.g. 14"
                  value={address.building_number}
                  onChange={handleAddressChange}
                  className={fieldErrors.building_number ? 'input-error' : ''}
                  required
                />
                {fieldErrors.building_number && (
                  <span className="error-msg">{fieldErrors.building_number}</span>
                )}
              </div>

              <div className="form-group half-width">
                <label htmlFor="floor">Floor (Optional)</label>
                <input
                  id="floor"
                  name="floor"
                  type="text"
                  placeholder="e.g. 3"
                  value={address.floor}
                  onChange={handleAddressChange}
                />
              </div>

              <div className="form-group half-width">
                <label htmlFor="apartment">Apartment # (Optional)</label>
                <input
                  id="apartment"
                  name="apartment"
                  type="text"
                  placeholder="e.g. 302"
                  value={address.apartment}
                  onChange={handleAddressChange}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="landmark">Landmark / Directions (Optional)</label>
                <input
                  id="landmark"
                  name="landmark"
                  type="text"
                  placeholder="e.g. Near City Stars, Behind National Bank"
                  value={address.landmark}
                  onChange={handleAddressChange}
                />
              </div>
            </div>
          </div>

          {/* Payment & Terms Section */}
          <div className="card terms-card">
            <h3>2. Payment Method & Policies</h3>

            <div className="payment-method-box">
              <div className="payment-radio">
                <input type="radio" id="cod" name="payment_method" checked readOnly />
                <label htmlFor="cod">
                  <strong>Cash on Delivery (COD)</strong>
                  <span>
                    Pay in cash directly to the courier when receiving your package in Egypt.
                  </span>
                </label>
              </div>
            </div>

            <div className="terms-checkbox-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (fieldErrors.terms) {
                      setFieldErrors((prev) => ({ ...prev, terms: null }));
                    }
                  }}
                  required
                />
                <span>
                  I agree to Pixel Store&apos;s <strong>Terms of Service</strong>, the{' '}
                  <strong>Cash on Delivery policy</strong>, and agree to coordinate final shipping
                  charges via WhatsApp. (Version v1.0)
                </span>
              </label>
              {fieldErrors.terms && <span className="error-msg">{fieldErrors.terms}</span>}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="checkout-summary-column">
          <div className="card summary-card">
            <h3>
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>

            <div className="items-list">
              {items.map((line) => (
                <div key={line.id} className="summary-item-row">
                  <div className="item-info">
                    <span className="item-title">{line.product_name}</span>
                    <span className="item-meta">
                      {line.variant_label} • Qty: {line.quantity}
                    </span>
                  </div>
                  <div className="item-price">
                    EGP{' '}
                    {Number(line.line_total || line.price * line.quantity).toLocaleString('en-EG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Input */}
            <div className="coupon-section">
              <label htmlFor="coupon_input" className="coupon-label">
                Discount Coupon
              </label>

              {appliedCoupon ? (
                <div className="applied-coupon-box">
                  <div className="coupon-tag">
                    <span className="tag-icon">
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
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </span>
                    <strong>{appliedCoupon.code}</strong>
                    <span className="tag-discount">
                      -{Number(appliedCoupon.discount_amount).toLocaleString('en-EG')} EGP
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="btn-remove-coupon"
                    aria-label="Remove coupon"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="coupon-input-group">
                  <input
                    id="coupon_input"
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCodeInput.trim()}
                    className="btn-apply-coupon"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}

              {couponError && <p className="coupon-error">{couponError}</p>}
            </div>

            {/* Price Calculations */}
            <div className="totals-section">
              <div className="total-row">
                <span>Subtotal</span>
                <span>
                  EGP{' '}
                  {subtotal.toLocaleString('en-EG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>

              {appliedCoupon && (
                <div className="total-row discount-row">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>
                    -EGP{' '}
                    {discountAmount.toLocaleString('en-EG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              )}

              <div className="total-row shipping-row">
                <div className="shipping-label">
                  <span>Shipping Fee</span>
                  <span className="info-badge">Calculated via WhatsApp</span>
                </div>
                <span className="shipping-val">Pending store quote</span>
              </div>

              <div className="total-row final-row">
                <div>
                  <strong>Payable Total</strong>
                  <div className="sub-note">+ shipping fee determined via WhatsApp</div>
                </div>
                <strong className="final-amount">
                  EGP{' '}
                  {estimatedPayable.toLocaleString('en-EG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-place-order"
              id="place-order-button"
            >
              {submitting ? (
                <span className="submitting-spinner">
                  <span className="spinner-dot" /> Submitting Order...
                </span>
              ) : (
                'Place Order (Cash on Delivery)'
              )}
            </button>

            <div className="whatsapp-notice">
              <span className="wa-icon">
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
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <p>
                After submitting, you will receive your order reference and a direct WhatsApp link
                to confirm delivery details with our team.
              </p>
            </div>
          </div>
        </div>
      </form>

      <style jsx>{`
        .checkout-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2rem 1rem 4rem;
        }

        .checkout-header {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-block;
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .checkout-header h1 {
          font-size: 2rem;
          color: var(--color-primary);
          margin-bottom: 0.25rem;
        }

        .subtitle {
          color: var(--color-text-muted);
          font-size: 0.95rem;
        }

        .error-banner {
          background: #fdf2f2;
          border: 1px solid #f8b4b4;
          color: #9b1c1c;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
        }

        .checkout-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (min-width: 900px) {
          .checkout-layout {
            grid-template-columns: 1.4fr 1fr;
          }
        }

        .card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          border: 1px solid var(--color-border);
          margin-bottom: 1.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header h2,
        .terms-card h3,
        .summary-card h3 {
          font-size: 1.25rem;
          color: var(--color-primary);
          margin: 0;
        }

        .badge {
          background: rgba(21, 63, 58, 0.1);
          color: var(--color-primary);
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .full-width {
          grid-column: span 6;
        }

        .half-width {
          grid-column: span 3;
        }

        .two-thirds {
          grid-column: span 4;
        }

        .one-third {
          grid-column: span 2;
        }

        @media (max-width: 600px) {
          .half-width,
          .two-thirds,
          .one-third {
            grid-column: span 6;
          }
        }

        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-dark);
        }

        .req {
          color: var(--color-accent-sale);
        }

        input[type='text'],
        input[type='tel'],
        select {
          padding: 0.75rem 0.9rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          color: var(--color-text-dark);
          background: #fafafa;
          transition: border-color 0.2s;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: var(--color-primary);
          background: #fff;
        }

        .input-error {
          border-color: var(--color-accent-sale) !important;
          background: #fffafa !important;
        }

        .error-msg {
          color: var(--color-accent-sale);
          font-size: 0.8rem;
          font-weight: 500;
        }

        .field-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        /* Payment & Terms */
        .payment-method-box {
          margin: 1rem 0 1.25rem;
          padding: 1rem;
          background: var(--color-bg-warm);
          border-radius: var(--radius-md);
          border: 1px solid rgba(21, 63, 58, 0.15);
        }

        .payment-radio {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .payment-radio input {
          margin-top: 0.25rem;
          accent-color: var(--color-primary);
        }

        .payment-radio label {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-weight: normal;
        }

        .payment-radio strong {
          color: var(--color-primary);
        }

        .payment-radio span {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .terms-checkbox-box {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--color-text-dark);
          font-weight: normal;
          cursor: pointer;
        }

        .checkbox-label input {
          margin-top: 0.2rem;
          accent-color: var(--color-primary);
          min-width: 16px;
          min-height: 16px;
        }

        /* Summary Column */
        .items-list {
          margin: 1.25rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1.25rem;
        }

        .summary-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          font-size: 0.9rem;
        }

        .item-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .item-title {
          font-weight: 600;
          color: var(--color-text-dark);
        }

        .item-meta {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        .item-price {
          font-weight: 600;
          color: var(--color-text-dark);
          white-space: nowrap;
        }

        /* Coupon Section */
        .coupon-section {
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 1.25rem;
        }

        .coupon-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
        }

        .coupon-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .coupon-input-group input {
          flex: 1;
          padding: 0.55rem 0.75rem;
        }

        .btn-apply-coupon {
          background: var(--color-primary);
          color: #fff;
          border: none;
          padding: 0.55rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-apply-coupon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .applied-coupon-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: var(--radius-md);
          padding: 0.5rem 0.75rem;
        }

        .coupon-tag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #166534;
          font-size: 0.9rem;
        }

        .tag-discount {
          font-weight: 700;
          color: #15803d;
        }

        .btn-remove-coupon {
          background: none;
          border: none;
          color: #991b1b;
          font-weight: 700;
          cursor: pointer;
          padding: 0.2rem 0.4rem;
        }

        .coupon-error {
          color: var(--color-accent-sale);
          font-size: 0.8rem;
          margin-top: 0.4rem;
        }

        /* Totals */
        .totals-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .total-row {
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

        .shipping-label {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .info-badge {
          font-size: 0.75rem;
          color: var(--color-primary);
          background: rgba(21, 63, 58, 0.08);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
        }

        .shipping-val {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        .final-row {
          border-top: 1px solid var(--color-border);
          padding-top: 1rem;
          margin-top: 0.25rem;
        }

        .final-row strong {
          font-size: 1.1rem;
          color: var(--color-primary);
        }

        .sub-note {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: normal;
        }

        .final-amount {
          font-size: 1.35rem;
          color: var(--color-primary);
        }

        .btn-place-order {
          width: 100%;
          background: var(--color-primary);
          color: #ffffff;
          padding: 0.95rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            background-color 0.15s,
            opacity 0.2s;
          box-shadow: var(--shadow-sm);
        }

        .btn-place-order:hover:not(:disabled) {
          background: var(--color-primary-dark);
          box-shadow: var(--shadow-md);
        }

        .btn-place-order:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submitting-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .whatsapp-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          background: rgba(21, 63, 58, 0.05);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: var(--color-primary);
        }

        .whatsapp-notice p {
          margin: 0;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
